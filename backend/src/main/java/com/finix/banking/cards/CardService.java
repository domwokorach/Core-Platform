package com.finix.banking.cards;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finix.banking.accounts.AccountRepository;
import com.finix.banking.cards.CardModels.*;
import com.finix.banking.events.CardChanged;
import com.finix.banking.ledger.Currencies;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sandbox card lifecycle. Every command runs in one transaction that locks the card row, validates the state
 * machine, persists, appends an immutable activity record and publishes an after-commit event. Nothing here posts to
 * the ledger. Ownership is enforced in every query by customer id; another customer's card is reported as 404.
 */
@Service
public class CardService {
    public static final long MIN_LIMIT = 100, MAX_DAILY = 500_000, MAX_MONTHLY = 2_000_000, MAX_SINGLE = 250_000;
    static final long DEFAULT_DAILY = 50_000, DEFAULT_MONTHLY = 300_000, DEFAULT_SINGLE = 25_000;
    static final int MAX_OPEN_CARDS = 5;
    private static final Set<String> TYPES = Set.of("EVERYDAY", "SAVINGS");
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    /** Authenticated caller. {@code authTime} is the OIDC {@code auth_time} claim, when present. */
    public record Actor(String subject, Instant authTime) {}
    record Locked(UUID id, UUID customerId, String status) {}

    private final JdbcClient db;
    private final AccountRepository accounts;
    private final ApplicationEventPublisher events;
    private final CardRateLimiter limiter;
    private final ObjectMapper json;
    private final long stepUpMaxAgeSeconds;

    public CardService(JdbcClient db, AccountRepository accounts, ApplicationEventPublisher events, CardRateLimiter limiter,
                       ObjectMapper json, @Value("${app.cards.step-up-max-age-seconds:0}") long stepUpMaxAgeSeconds) {
        this.db = db; this.accounts = accounts; this.events = events; this.limiter = limiter; this.json = json;
        this.stepUpMaxAgeSeconds = stepUpMaxAgeSeconds;
    }

    // ---- reads ----

    @Transactional(readOnly = true)
    public List<CardView> list(String subject) {
        return query(accounts.requireCustomer(subject, false), null);
    }

    @Transactional(readOnly = true)
    public CardView get(String subject, UUID cardId) {
        var customer = accounts.requireCustomer(subject, false);
        return query(customer, cardId).stream().findFirst().orElseThrow(CardService::notFound);
    }

    @Transactional(readOnly = true)
    public List<CardTransaction> transactions(String subject, UUID cardId) {
        var customer = accounts.requireCustomer(subject, false);
        requireOwned(customer.id(), cardId);
        return db.sql("""
            SELECT id, card_id, merchant_name, amount_minor, currency, channel, outcome, decline_reason, created_at
            FROM card_authorizations WHERE card_id = :card AND customer_id = :customer
            ORDER BY created_at DESC, id DESC LIMIT 50
            """).param("card", cardId).param("customer", customer.id())
            .query((rs, i) -> new CardTransaction(rs.getObject("id", UUID.class), rs.getObject("card_id", UUID.class),
                rs.getString("merchant_name"), rs.getLong("amount_minor"), rs.getString("currency"), rs.getString("channel"),
                rs.getString("outcome"), rs.getString("decline_reason"), rs.getObject("created_at", OffsetDateTime.class).toInstant())).list();
    }

    @Transactional(readOnly = true)
    public List<CardActivity> activity(String subject, UUID cardId) {
        var customer = accounts.requireCustomer(subject, false);
        requireOwned(customer.id(), cardId);
        return db.sql("""
            SELECT id, card_id, event_type, created_at FROM card_activity_events
            WHERE card_id = :card AND customer_id = :customer ORDER BY created_at DESC, id DESC LIMIT 50
            """).param("card", cardId).param("customer", customer.id())
            .query((rs, i) -> new CardActivity(rs.getObject("id", UUID.class), rs.getObject("card_id", UUID.class),
                rs.getString("event_type"), rs.getObject("created_at", OffsetDateTime.class).toInstant())).list();
    }

    // ---- commands ----

    /** Idempotent on (customer, Idempotency-Key): a replay with the same details returns the original card. */
    @Transactional
    public CardView issue(Actor actor, String idempotencyKey, CreateCardRequest req) {
        if (idempotencyKey == null || !idempotencyKey.matches("^[a-zA-Z0-9_-]{8,100}$"))
            throw new CardApiException(HttpStatus.BAD_REQUEST, "IDEMPOTENCY_KEY_REQUIRED", "A valid Idempotency-Key is required (8–100 URL-safe characters)");
        String type = req.cardType().trim().toUpperCase(Locale.ROOT);
        if (!TYPES.contains(type)) throw new CardApiException(HttpStatus.BAD_REQUEST, "UNSUPPORTED_CARD_TYPE", "Card type must be EVERYDAY or SAVINGS");

        var customer = accounts.requireCustomer(actor.subject(), true); // serializes this customer's issuance
        limiter.checkIssuance(customer.id());
        var prior = db.sql("""
            SELECT c.id, c.card_type, l.account_id FROM cards c JOIN card_account_links l ON l.card_id = c.id AND l.unlinked_at IS NULL
            WHERE c.customer_id = :customer AND c.idempotency_key = :key
            """).param("customer", customer.id()).param("key", idempotencyKey)
            .query((rs, i) -> new Object[] {rs.getObject(1, UUID.class), rs.getString(2), rs.getObject(3, UUID.class)}).optional();
        if (prior.isPresent()) {
            var p = prior.get();
            if (!p[1].equals(type) || !p[2].equals(req.accountId()))
                throw new CardApiException(HttpStatus.CONFLICT, "IDEMPOTENCY_KEY_REUSED", "Idempotency key already used for different card details");
            return query(customer, (UUID) p[0]).get(0);
        }

        var account = accounts.requireAccount(req.accountId(), customer.id());
        if (!"ACTIVE".equals(account.status()))
            throw new CardApiException(HttpStatus.CONFLICT, "ACCOUNT_NOT_ELIGIBLE", "Cards can only be linked to active accounts");
        if (!Currencies.isSupported(account.currency()))
            throw new CardApiException(HttpStatus.BAD_REQUEST, "ACCOUNT_NOT_ELIGIBLE", "Only GBP accounts are eligible for cards");
        long open = db.sql("SELECT COUNT(*) FROM cards WHERE customer_id = :c AND status NOT IN ('CLOSED')").param("c", customer.id()).query(Long.class).single();
        if (open >= MAX_OPEN_CARDS)
            throw new CardApiException(HttpStatus.CONFLICT, "CARD_LIMIT_REACHED", "You can hold at most " + MAX_OPEN_CARDS + " sandbox cards");

        UUID id = UUID.randomUUID();
        StringBuilder suffix = new StringBuilder();
        for (int i = 0; i < 4; i++) suffix.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        db.sql("""
            INSERT INTO cards (id, customer_id, card_type, status, masked_reference, idempotency_key)
            VALUES (:id, :customer, :type, 'PENDING_ACTIVATION', :ref, :key)
            """).param("id", id).param("customer", customer.id()).param("type", type)
            .param("ref", "FVC •••• " + suffix).param("key", idempotencyKey).update();
        db.sql("INSERT INTO card_account_links (id, card_id, account_id) VALUES (:id, :card, :account)")
            .param("id", UUID.randomUUID()).param("card", id).param("account", account.id()).update();
        db.sql("INSERT INTO card_spending_limits (card_id, daily_limit_minor, monthly_limit_minor, single_limit_minor, online_enabled) VALUES (:id, :d, :m, :s, true)")
            .param("id", id).param("d", DEFAULT_DAILY).param("m", DEFAULT_MONTHLY).param("s", DEFAULT_SINGLE).update();
        record(id, customer.id(), "CARD_CREATED", actor.subject(), Map.of("cardType", type, "accountId", account.id().toString()));
        events.publishEvent(new CardChanged(customer.id(), id, "card.created"));
        return query(customer, id).get(0);
    }

    @Transactional
    public CardView activate(Actor actor, UUID cardId) {
        var customer = accounts.requireCustomer(actor.subject(), false);
        limiter.checkCommand(customer.id());
        var card = lock(customer.id(), cardId);
        switch (card.status()) {
            case "ACTIVE" -> { return query(customer, cardId).get(0); } // idempotent
            case "PENDING_ACTIVATION" -> {
                transition(card, "ACTIVE", "activated_at = now(),");
                record(cardId, customer.id(), "CARD_ACTIVATED", actor.subject(), Map.of());
                events.publishEvent(new CardChanged(customer.id(), cardId, "card.activated"));
            }
            default -> throw invalid(card.status(), "activated");
        }
        return query(customer, cardId).get(0);
    }

    @Transactional
    public CardView freeze(Actor actor, UUID cardId) {
        var customer = accounts.requireCustomer(actor.subject(), false);
        limiter.checkCommand(customer.id());
        var card = lock(customer.id(), cardId);
        switch (card.status()) {
            case "FROZEN" -> { return query(customer, cardId).get(0); }
            case "ACTIVE" -> {
                transition(card, "FROZEN", "");
                record(cardId, customer.id(), "CARD_FROZEN", actor.subject(), Map.of());
                events.publishEvent(new CardChanged(customer.id(), cardId, "card.frozen"));
            }
            default -> throw invalid(card.status(), "frozen");
        }
        return query(customer, cardId).get(0);
    }

    @Transactional
    public CardView unfreeze(Actor actor, UUID cardId) {
        var customer = accounts.requireCustomer(actor.subject(), false);
        limiter.checkCommand(customer.id());
        var card = lock(customer.id(), cardId);
        switch (card.status()) {
            case "ACTIVE" -> { return query(customer, cardId).get(0); }
            case "FROZEN" -> {
                requireRecentAuthentication(actor);
                transition(card, "ACTIVE", "");
                record(cardId, customer.id(), "CARD_UNFROZEN", actor.subject(), Map.of());
                events.publishEvent(new CardChanged(customer.id(), cardId, "card.unfrozen"));
            }
            default -> throw invalid(card.status(), "unfrozen");
        }
        return query(customer, cardId).get(0);
    }

    @Transactional
    public CardView updateLimits(Actor actor, UUID cardId, LimitsRequest req) {
        if (req == null || (req.dailyLimitMinor() == null && req.monthlyLimitMinor() == null
            && req.singleTransactionLimitMinor() == null && req.onlineEnabled() == null))
            throw new CardApiException(HttpStatus.BAD_REQUEST, "NO_CHANGES", "Provide at least one limit to change");
        var customer = accounts.requireCustomer(actor.subject(), false);
        limiter.checkCommand(customer.id());
        var card = lock(customer.id(), cardId);
        if (Set.of("BLOCKED", "CLOSED").contains(card.status())) throw invalid(card.status(), "changed");

        var old = query(customer, cardId).get(0).limits();
        long daily = req.dailyLimitMinor() != null ? req.dailyLimitMinor() : old.dailyLimitMinor();
        long monthly = req.monthlyLimitMinor() != null ? req.monthlyLimitMinor() : old.monthlyLimitMinor();
        long single = req.singleTransactionLimitMinor() != null ? req.singleTransactionLimitMinor() : old.singleTransactionLimitMinor();
        boolean online = req.onlineEnabled() != null ? req.onlineEnabled() : old.onlineEnabled();
        range("Daily", daily, MAX_DAILY); range("Monthly", monthly, MAX_MONTHLY); range("Single-transaction", single, MAX_SINGLE);
        if (single > daily) throw limitError("The single-transaction limit cannot exceed the daily limit");
        if (daily > monthly) throw limitError("The daily limit cannot exceed the monthly limit");
        var updated = new Limits(daily, monthly, single, online);
        if (updated.equals(old)) return query(customer, cardId).get(0); // idempotent

        if (daily > old.dailyLimitMinor() || monthly > old.monthlyLimitMinor() || single > old.singleTransactionLimitMinor() || (online && !old.onlineEnabled()))
            requireRecentAuthentication(actor); // loosening controls is the sensitive direction
        db.sql("UPDATE card_spending_limits SET daily_limit_minor=:d, monthly_limit_minor=:m, single_limit_minor=:s, online_enabled=:o, updated_at=now() WHERE card_id=:id")
            .param("d", daily).param("m", monthly).param("s", single).param("o", online).param("id", cardId).update();
        db.sql("UPDATE cards SET updated_at = now() WHERE id = :id").param("id", cardId).update();
        record(cardId, customer.id(), "LIMITS_UPDATED", actor.subject(), Map.of("from", old, "to", updated));
        events.publishEvent(new CardChanged(customer.id(), cardId, "card.limits.updated"));
        return query(customer, cardId).get(0);
    }

    // ---- shared with CardAuthorizationService ----

    /** Row-locks the caller's card; concurrent commands and authorizations on one card are serialized here. */
    Locked lock(UUID customerId, UUID cardId) {
        return db.sql("SELECT id, customer_id, status FROM cards WHERE id = :id AND customer_id = :customer FOR UPDATE")
            .param("id", cardId).param("customer", customerId)
            .query((rs, i) -> new Locked(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class), rs.getString(3))).optional()
            .orElseThrow(CardService::notFound);
    }

    void record(UUID cardId, UUID customerId, String type, String actor, Object metadata) {
        String meta;
        try { meta = json.writeValueAsString(metadata); } catch (JsonProcessingException e) { throw new IllegalStateException(e); }
        db.sql("""
            INSERT INTO card_activity_events (id, card_id, customer_id, event_type, actor_subject, metadata)
            VALUES (:id, :card, :customer, :type, :actor, CAST(:meta AS jsonb))
            """).param("id", UUID.randomUUID()).param("card", cardId).param("customer", customerId)
            .param("type", type).param("actor", actor).param("meta", meta).update();
    }

    List<CardView> query(AccountRepository.Customer customer, UUID cardId) {
        return db.sql("""
            SELECT c.id, c.card_type, c.status, c.masked_reference, c.created_at, c.activated_at, c.updated_at,
                   a.id AS account_id, a.display_name, a.account_number, a.currency,
                   s.daily_limit_minor, s.monthly_limit_minor, s.single_limit_minor, s.online_enabled,
                   (SELECT COALESCE(SUM(x.amount_minor), 0) FROM card_authorizations x WHERE x.card_id = c.id AND x.outcome = 'APPROVED'
                      AND x.created_at >= date_trunc('day', now())) AS daily_spent,
                   (SELECT COALESCE(SUM(x.amount_minor), 0) FROM card_authorizations x WHERE x.card_id = c.id AND x.outcome = 'APPROVED'
                      AND x.created_at >= date_trunc('month', now())) AS monthly_spent
            FROM cards c
            JOIN card_account_links l ON l.card_id = c.id AND l.unlinked_at IS NULL
            JOIN accounts a ON a.id = l.account_id
            JOIN card_spending_limits s ON s.card_id = c.id
            WHERE c.customer_id = :customer AND (CAST(:card AS uuid) IS NULL OR c.id = CAST(:card AS uuid))
            ORDER BY c.created_at, c.id
            """).param("customer", customer.id()).param("card", cardId)
            .query((rs, i) -> new CardView(rs.getObject("id", UUID.class), rs.getString("card_type"), rs.getString("status"),
                rs.getString("masked_reference"), rs.getString("currency").trim(), customer.name(),
                new LinkedAccount(rs.getObject("account_id", UUID.class), rs.getString("display_name"), "•••• " + rs.getString("account_number").substring(8)),
                new Limits(rs.getLong("daily_limit_minor"), rs.getLong("monthly_limit_minor"), rs.getLong("single_limit_minor"), rs.getBoolean("online_enabled")),
                new Spending(rs.getLong("daily_spent"), rs.getLong("monthly_spent")),
                rs.getObject("created_at", OffsetDateTime.class).toInstant(),
                rs.getObject("activated_at", OffsetDateTime.class) == null ? null : rs.getObject("activated_at", OffsetDateTime.class).toInstant(),
                rs.getObject("updated_at", OffsetDateTime.class).toInstant())).list();
    }

    // ---- helpers ----

    private void transition(Locked card, String status, String extraSet) {
        db.sql("UPDATE cards SET " + extraSet + " status = :status, updated_at = now() WHERE id = :id")
            .param("status", status).param("id", card.id()).update();
    }

    private void requireOwned(UUID customerId, UUID cardId) {
        if (db.sql("SELECT COUNT(*) FROM cards WHERE id = :id AND customer_id = :c").param("id", cardId).param("c", customerId).query(Long.class).single() == 0)
            throw notFound();
    }

    /** Step-up: when configured, sensitive changes need an authentication newer than the configured age. */
    private void requireRecentAuthentication(Actor actor) {
        if (stepUpMaxAgeSeconds <= 0) return;
        if (actor.authTime() == null || Duration.between(actor.authTime(), Instant.now()).getSeconds() > stepUpMaxAgeSeconds)
            throw new CardApiException(HttpStatus.FORBIDDEN, "STEP_UP_REQUIRED", "Confirm it’s you by signing in again to make this change");
    }

    private static void range(String name, long value, long max) {
        if (value < MIN_LIMIT || value > max)
            throw limitError(name + " limit must be between " + gbp(MIN_LIMIT) + " and " + gbp(max));
    }
    private static CardApiException limitError(String message) { return new CardApiException(HttpStatus.UNPROCESSABLE_ENTITY, "LIMIT_OUT_OF_RANGE", message); }
    static String gbp(long minor) { return String.format(Locale.UK, "£%,.2f", minor / 100.0); }
    static CardApiException notFound() { return new CardApiException(HttpStatus.NOT_FOUND, "CARD_NOT_FOUND", "Card not found"); }
    private static CardApiException invalid(String status, String action) {
        boolean terminal = status.equals("BLOCKED") || status.equals("CLOSED");
        return new CardApiException(HttpStatus.CONFLICT, terminal ? "CARD_TERMINAL" : "INVALID_CARD_STATE",
            terminal ? "A " + status.toLowerCase(Locale.ROOT) + " card cannot be " + action
                     : "A card in status " + status + " cannot be " + action);
    }
}

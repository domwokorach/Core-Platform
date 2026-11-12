package com.finix.banking.cards;

import com.finix.banking.accounts.AccountRepository;
import com.finix.banking.cards.CardModels.*;
import com.finix.banking.events.CardChanged;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sandbox card-authorization decisions. This is where card status, the online setting and the spending limits are
 * actually enforced (the UI only displays them). An authorization is a decision record, not a ledger posting:
 * approving or declining one never changes any account balance. A decline is a successful decision (HTTP 201 with
 * outcome DECLINED), so it commits and is audited.
 */
@Service
public class CardAuthorizationService {
    private static final long MAX_AMOUNT = 100_000_000;
    private final JdbcClient db;
    private final AccountRepository accounts;
    private final CardService cards;
    private final CardRateLimiter limiter;
    private final ApplicationEventPublisher events;

    public CardAuthorizationService(JdbcClient db, AccountRepository accounts, CardService cards, CardRateLimiter limiter, ApplicationEventPublisher events) {
        this.db = db; this.accounts = accounts; this.cards = cards; this.limiter = limiter; this.events = events;
    }

    @Transactional
    public CardTransaction authorize(String subject, UUID cardId, AuthorizationRequest req) {
        String channel = req.channel().trim().toUpperCase(Locale.ROOT);
        if (!channel.equals("ONLINE") && !channel.equals("IN_STORE"))
            throw new CardApiException(HttpStatus.BAD_REQUEST, "INVALID_CHANNEL", "Channel must be ONLINE or IN_STORE");
        if (req.amountMinor() <= 0 || req.amountMinor() > MAX_AMOUNT)
            throw new CardApiException(HttpStatus.BAD_REQUEST, "INVALID_AMOUNT", "Amount must be greater than zero");
        var customer = accounts.requireCustomer(subject, false);
        limiter.checkCommand(customer.id());
        var card = cards.lock(customer.id(), cardId); // serializes with freezes, limit changes and other authorizations

        var view = cards.query(customer, cardId).get(0);
        var limits = view.limits();
        String decline = null;
        if (!card.status().equals("ACTIVE")) decline = card.status().equals("FROZEN") ? "CARD_FROZEN" : "CARD_NOT_ACTIVE";
        else if (!accounts.requireAccount(view.linkedAccount().id(), customer.id()).status().equals("ACTIVE")) decline = "ACCOUNT_INACTIVE";
        else if (channel.equals("ONLINE") && !limits.onlineEnabled()) decline = "ONLINE_DISABLED";
        else if (req.amountMinor() > limits.singleTransactionLimitMinor()) decline = "SINGLE_LIMIT_EXCEEDED";
        else if (view.spending().dailySpentMinor() + req.amountMinor() > limits.dailyLimitMinor()) decline = "DAILY_LIMIT_EXCEEDED";
        else if (view.spending().monthlySpentMinor() + req.amountMinor() > limits.monthlyLimitMinor()) decline = "MONTHLY_LIMIT_EXCEEDED";

        final String reason = decline;
        UUID id = UUID.randomUUID();
        String outcome = decline == null ? "APPROVED" : "DECLINED";
        String merchant = req.merchantName().trim();
        db.sql("""
            INSERT INTO card_authorizations (id, card_id, customer_id, merchant_name, amount_minor, currency, channel, outcome, decline_reason)
            VALUES (:id, :card, :customer, :merchant, :amount, 'GBP', :channel, :outcome, :reason)
            """).param("id", id).param("card", cardId).param("customer", customer.id()).param("merchant", merchant)
            .param("amount", req.amountMinor()).param("channel", channel).param("outcome", outcome).param("reason", decline).update();
        if (decline != null) {
            cards.record(cardId, customer.id(), "AUTHORIZATION_DECLINED", subject, Map.of("reason", decline, "authorizationId", id.toString()));
            events.publishEvent(new CardChanged(customer.id(), cardId, "card.authorization.declined"));
        }
        return db.sql("SELECT created_at FROM card_authorizations WHERE id = :id").param("id", id)
            .query((rs, i) -> new CardTransaction(id, cardId, merchant, req.amountMinor(), "GBP", channel, outcome, reason,
                rs.getObject(1, OffsetDateTime.class).toInstant())).single();
    }
}

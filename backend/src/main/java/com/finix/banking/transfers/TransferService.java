package com.finix.banking.transfers;

import com.finix.banking.accounts.AccountRepository;
import com.finix.banking.events.DashboardChanged;
import com.finix.banking.ledger.Currencies;
import com.finix.banking.ledger.LedgerService;
import java.util.List;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TransferService {
    private final JdbcClient db;
    private final AccountRepository accounts;
    private final LedgerService ledger;
    private final ApplicationEventPublisher events;
    public TransferService(JdbcClient db, AccountRepository accounts, LedgerService ledger, ApplicationEventPublisher events) {
        this.db = db; this.accounts = accounts; this.ledger = ledger; this.events = events;
    }

    public record Request(@NotNull UUID sourceAccountId, @NotNull UUID destinationAccountId,
                          @Min(1) @Max(100_000_000) long amountMinor,
                          @NotBlank @Size(max=120) String description) {}
    public record Receipt(UUID id, UUID sourceAccountId, UUID destinationAccountId,
                          long amountMinor, String currency, String reference, Instant createdAt) {}

    /** Entire transfer posts in one PostgreSQL transaction. The customer row serializes concurrent debits. */
    @Transactional
    public Receipt transfer(String subject, String idempotencyKey, Request req) {
        if (idempotencyKey == null || !idempotencyKey.matches("^[a-zA-Z0-9_-]{8,100}$"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid Idempotency-Key is required (8–100 URL-safe characters)");
        if (req.sourceAccountId().equals(req.destinationAccountId()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Source and destination must be different");
        if (req.amountMinor() <= 0 || req.amountMinor() > 100_000_000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be between 1 and 100000000 minor units");

        // Lock BEFORE looking up the idempotency key: concurrent identical requests cannot post twice.
        var customer = accounts.requireCustomer(subject, true);
        var prior = db.sql("""
            SELECT id, source_account_id, destination_account_id, amount_minor, currency, description, reference, created_at
            FROM transfers WHERE customer_id = :customer AND idempotency_key = :key
            """).param("customer", customer.id()).param("key", idempotencyKey)
            .query((rs, i) -> new ExistingTransfer(
                rs.getObject("id", UUID.class), rs.getObject("source_account_id", UUID.class),
                rs.getObject("destination_account_id", UUID.class), rs.getLong("amount_minor"),
                rs.getString("currency"), rs.getString("description"), rs.getString("reference"),
                rs.getObject("created_at", OffsetDateTime.class).toInstant())).optional();
        if (prior.isPresent()) {
            var t = prior.get();
            if (!t.source().equals(req.sourceAccountId()) || !t.destination().equals(req.destinationAccountId())
                || t.amountMinor() != req.amountMinor() || !t.description().equals(req.description().trim()))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Idempotency key already used for different transfer details");
            return new Receipt(t.id(), t.source(), t.destination(), t.amountMinor(), t.currency(), t.reference(), t.createdAt());
        }
        var source = accounts.requireAccount(req.sourceAccountId(), customer.id());
        var destination = accounts.requireAccount(req.destinationAccountId(), customer.id());
        if (!"ACTIVE".equals(source.status()) || !"ACTIVE".equals(destination.status()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Both accounts must be active");
        if (!Currencies.isSupported(source.currency()) || !Currencies.isSupported(destination.currency()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported currency: only GBP accounts can transfer");
        if (!source.currency().equals(destination.currency()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cross-currency transfers are not supported");
        if (accounts.balance(source.id()) < req.amountMinor())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Insufficient available funds");

        UUID transferId = UUID.randomUUID();
        String reference = "TRF-" + transferId.toString().toUpperCase();
        String description = req.description().trim();
        UUID journalId = ledger.post(reference, description, "TRANSFER", List.of(
            new LedgerService.Entry(source.id(), -req.amountMinor(), source.currency()),
            new LedgerService.Entry(destination.id(), req.amountMinor(), source.currency())));
        db.sql("""
            INSERT INTO transfers (id, customer_id, idempotency_key, source_account_id, destination_account_id,
                                   amount_minor, currency, description, reference, journal_id)
            VALUES (:id,:customer,:key,:source,:destination,:amount,:currency,:description,:reference,:journal)
            """).param("id", transferId).param("customer", customer.id()).param("key", idempotencyKey)
            .param("source", source.id()).param("destination", destination.id()).param("amount", req.amountMinor())
            .param("currency", source.currency()).param("description", description)
            .param("reference", reference).param("journal", journalId).update();
        db.sql("""
            INSERT INTO audit_events (id, event_type, actor_subject, aggregate_id, metadata)
            VALUES (:id, 'TRANSFER_POSTED', :actor, :aggregate, jsonb_build_object('journalId', CAST(:journal AS text), 'reference', :reference))
            """).param("id", UUID.randomUUID()).param("actor", subject).param("aggregate", transferId)
            .param("journal", journalId).param("reference", reference).update();
        db.sql("""
            INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload)
            VALUES (:id, 'TRANSFER', :aggregate, 'TransferPosted',
                    jsonb_build_object('transferId', CAST(:transferId AS text),
                                       'journalId', CAST(:journal AS text), 'reference', :reference))
            """).param("id", UUID.randomUUID()).param("aggregate", transferId)
            .param("transferId", transferId).param("journal", journalId).param("reference", reference).update();
        // Delivered to SSE subscribers only if this transaction commits. Idempotent replays return earlier and never notify.
        events.publishEvent(new DashboardChanged(customer.id(), "transfer.posted"));
        return db.sql("SELECT created_at FROM transfers WHERE id = :id").param("id", transferId)
            .query((rs, row) -> new Receipt(transferId, source.id(), destination.id(), req.amountMinor(),
                                            source.currency(), reference, rs.getObject(1, OffsetDateTime.class).toInstant())).single();
    }

    private record ExistingTransfer(UUID id, UUID source, UUID destination, long amountMinor, String currency,
                                    String description, String reference, Instant createdAt) {}
}

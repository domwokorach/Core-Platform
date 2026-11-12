package com.finix.banking.ledger;

import java.math.BigInteger;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Single entry point for financial posting. Never directly UPDATE an account balance. */
@Service
public class LedgerService {
    private final JdbcClient db;
    public LedgerService(JdbcClient db) { this.db = db; }

    public record Entry(UUID accountId, long amountMinor, String currency) {}

    @Transactional(propagation = Propagation.MANDATORY)
    public UUID post(String reference, String description, String kind, List<Entry> entries) {
        if (entries.size() < 2 || entries.stream().map(Entry::currency).distinct().count() != 1)
            throw new IllegalArgumentException("A journal needs at least two entries in a single currency");
        if (!entries.stream().allMatch(e -> Currencies.isSupported(e.currency())))
            throw new IllegalArgumentException("Unsupported currency: only " + Currencies.SUPPORTED + " can be posted");
        BigInteger sum = entries.stream().map(e -> BigInteger.valueOf(e.amountMinor())).reduce(BigInteger.ZERO, BigInteger::add);
        if (sum.signum() != 0 || entries.stream().anyMatch(e -> e.amountMinor() == 0))
            throw new IllegalArgumentException("Journal entries must be nonzero and sum to zero");
        UUID journalId = UUID.randomUUID();
        db.sql("INSERT INTO ledger_journals (id, reference, description, kind) VALUES (:id,:reference,:description,:kind)")
            .param("id", journalId).param("reference", reference).param("description", description).param("kind", kind).update();
        for (Entry entry : entries) {
            db.sql("INSERT INTO ledger_entries (id, journal_id, account_id, amount_minor, currency) VALUES (:id,:journal,:account,:amount,:currency)")
                .param("id", UUID.randomUUID()).param("journal", journalId).param("account", entry.accountId())
                .param("amount", entry.amountMinor()).param("currency", entry.currency()).update();
        }
        return journalId;
    }
}

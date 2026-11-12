package com.finix.banking;

import com.finix.banking.accounts.AccountRepository;
import com.finix.banking.transfers.TransferService;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

@ActiveProfiles("dev")
@SpringBootTest
class TransferIntegrationTest {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry props) { TestDatabase.register(props); }

    @Autowired TransferService service;
    @Autowired AccountRepository accounts;
    @Autowired JdbcClient db;
    @Autowired TransactionTemplate transactions;
    private static final String SUBJECT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    private static final UUID FROM = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final UUID TO = UUID.fromString("22222222-2222-4222-8222-222222222222");

    @Test
    void postsBalancedTransferOnceEvenOnRetry() {
        long beforeFrom = accounts.balance(FROM);
        long beforeTo = accounts.balance(TO);
        String key = UUID.randomUUID().toString();
        var request = new TransferService.Request(FROM, TO, 12345, "Integration test transfer");
        var first = service.transfer(SUBJECT, key, request);
        var repeated = service.transfer(SUBJECT, key, request);
        assertEquals(first.id(), repeated.id());
        assertEquals(beforeFrom - 12345, accounts.balance(FROM));
        assertEquals(beforeTo + 12345, accounts.balance(TO));
        assertEquals(0L, db.sql("SELECT SUM(amount_minor) FROM ledger_entries WHERE journal_id = (SELECT journal_id FROM transfers WHERE id=:id)")
            .param("id", first.id()).query(Long.class).single());
        assertEquals(1L, db.sql("SELECT COUNT(*) FROM outbox_events WHERE aggregate_id=:id")
            .param("id", first.id()).query(Long.class).single());
    }

    @Test
    void rejectsInsufficientFundsAndAccountOutsideCustomer() {
        var excessive = new TransferService.Request(FROM, TO, 100_000_000, "Too large");
        assertThrows(ResponseStatusException.class, () -> service.transfer(SUBJECT, UUID.randomUUID().toString(), excessive));
        var external = new TransferService.Request(FROM, UUID.fromString("99999999-9999-4999-8999-999999999999"), 100, "Invalid destination");
        assertThrows(ResponseStatusException.class, () -> service.transfer(SUBJECT, UUID.randomUUID().toString(), external));
    }

    @Test
    void rejectsIdempotencyKeyReuseWithDifferentPayload() {
        String key = UUID.randomUUID().toString();
        service.transfer(SUBJECT, key, new TransferService.Request(FROM, TO, 100, "First"));
        assertThrows(ResponseStatusException.class,
            () -> service.transfer(SUBJECT, key, new TransferService.Request(FROM, TO, 200, "First")));
    }


    @Test
    void databaseRejectsAJournalThatDoesNotBalance() {
        UUID journal = UUID.randomUUID();
        RuntimeException error = assertThrows(RuntimeException.class, () -> transactions.execute(status -> {
            db.sql("INSERT INTO ledger_journals(id, reference, description, kind) VALUES (:id,:reference,'Unbalanced test','TRANSFER')")
                .param("id", journal).param("reference", "TEST-" + journal).update();
            db.sql("INSERT INTO ledger_entries(id, journal_id, account_id, amount_minor, currency) VALUES (:id,:journal,:account,100,'GBP')")
                .param("id", UUID.randomUUID()).param("journal", journal).param("account", FROM).update();
            return null; // the commit-time deferred constraint must fail
        }));
        boolean matched = false;
        for (Throwable t = error; t != null; t = t.getCause()) {
            if (t.getMessage() != null && t.getMessage().contains("Unbalanced ledger journal")) {
                matched = true;
                break;
            }
        }
        assertTrue(matched, "Deferred ledger balancing trigger should reject a one-sided posting");
    }

    @Test
    void simultaneousSameKeyPostsOnlyOnce() throws Exception {
        String key = UUID.randomUUID().toString();
        var payload = new TransferService.Request(FROM, TO, 200, "Concurrent transfer");
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            CompletableFuture<UUID> one = CompletableFuture.supplyAsync(() -> service.transfer(SUBJECT, key, payload).id(), executor);
            CompletableFuture<UUID> two = CompletableFuture.supplyAsync(() -> service.transfer(SUBJECT, key, payload).id(), executor);
            assertEquals(one.get(15, TimeUnit.SECONDS), two.get(15, TimeUnit.SECONDS));
            assertEquals(1L, db.sql("SELECT COUNT(*) FROM transfers WHERE customer_id=:customer AND idempotency_key=:key")
                .param("customer", UUID.fromString(SUBJECT)).param("key", key).query(Long.class).single());
        }
    }

    @Test
    void penceArithmeticIsExactAndStaysInGbp() {
        long before = accounts.balance(FROM);
        var receipt = service.transfer(SUBJECT, UUID.randomUUID().toString(), new TransferService.Request(FROM, TO, 10 + 20, "Pence arithmetic"));
        assertEquals("GBP", receipt.currency());
        assertEquals(30, receipt.amountMinor());
        assertEquals(before - 30, accounts.balance(FROM));
    }

    @Test
    void databaseRefusesNewNonGbpAccounts() {
        assertThrows(RuntimeException.class, () -> db.sql("INSERT INTO accounts(id, customer_id, account_number, display_name, currency) VALUES (:id,:c,'000000000777','USD test','USD')")
            .param("id", UUID.randomUUID()).param("c", UUID.fromString(SUBJECT)).update());
    }

    @Test
    void demoAccountsAreGbpAndLedgerRejectsOtherCurrencies() {
        assertEquals(0L, db.sql("SELECT COUNT(*) FROM accounts WHERE currency <> 'GBP'").query(Long.class).single());
        var ledger = new com.finix.banking.ledger.LedgerService(db);
        assertThrows(IllegalArgumentException.class, () -> ledger.post("X", "X", "TRANSFER", java.util.List.of(
            new com.finix.banking.ledger.LedgerService.Entry(FROM, -100, "USD"), new com.finix.banking.ledger.LedgerService.Entry(TO, 100, "USD"))));
    }
}

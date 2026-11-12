package com.finix.banking.api;

import com.finix.banking.accounts.AccountRepository;
import com.finix.banking.merchants.MerchantDirectory;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class DashboardController {
    private final AccountRepository accounts;
    private final JdbcClient db;
    public DashboardController(AccountRepository accounts, JdbcClient db) { this.accounts = accounts; this.db = db; }

    public record TransactionDto(UUID id, UUID accountId, String description, long amountMinor, String currency, Instant occurredAt, String reference,
                                 MerchantDirectory.Merchant merchant, String status) {}
    public record DashboardDto(String customerName, String currency, long totalBalanceMinor,
                               long monthlyIncomeMinor, long monthlySpendingMinor,
                               List<AccountRepository.Account> accounts, List<TransactionDto> transactions) {}

    @GetMapping("/accounts")
    public List<AccountRepository.Account> accountList(@AuthenticationPrincipal Jwt jwt) {
        var customer = accounts.requireCustomer(jwt.getSubject(), false);
        return accounts.accountsForCustomer(customer.id());
    }

    @GetMapping("/transactions")
    public List<TransactionDto> transactionList(@AuthenticationPrincipal Jwt jwt) {
        var customer = accounts.requireCustomer(jwt.getSubject(), false);
        return transactionsForCustomer(customer.id());
    }

    @GetMapping("/dashboard")
    public DashboardDto dashboard(@AuthenticationPrincipal Jwt jwt) {
        var customer = accounts.requireCustomer(jwt.getSubject(), false);
        var accountList = accounts.accountsForCustomer(customer.id());
        // All customer accounts in this starter are USD. Cross-currency aggregation is intentionally prohibited.
        if (accountList.stream().map(AccountRepository.Account::currency).distinct().count() > 1)
            throw new IllegalStateException("Mixed currencies require separate balances and FX conversion");
        long balance = accountList.stream().mapToLong(AccountRepository.Account::balanceMinor).sum();
        var txs = transactionsForCustomer(customer.id());
        var metric = db.sql("""
            SELECT
              COALESCE(SUM(CASE WHEN j.kind = 'INCOME' AND e.amount_minor > 0 THEN e.amount_minor ELSE 0 END), 0) AS income,
              COALESCE(SUM(CASE WHEN j.kind = 'EXPENSE' AND e.amount_minor < 0 THEN -e.amount_minor ELSE 0 END), 0) AS spending
            FROM ledger_entries e JOIN ledger_journals j ON j.id = e.journal_id
            JOIN accounts a ON a.id = e.account_id
            WHERE a.customer_id = :customer AND j.created_at >= date_trunc('month', now())
              AND j.created_at < date_trunc('month', now()) + interval '1 month'
            """).param("customer", customer.id()).query((rs, row) -> new long[]{rs.getLong("income"), rs.getLong("spending")}).single();
        return new DashboardDto(customer.name(), accountList.isEmpty() ? "USD" : accountList.getFirst().currency(), balance,
                                metric[0], metric[1], accountList, txs);
    }
    private List<TransactionDto> transactionsForCustomer(UUID customerId) {
        return db.sql("""
            SELECT e.id, e.account_id, j.description, e.amount_minor, e.currency, j.created_at, j.reference
            FROM ledger_entries e JOIN ledger_journals j ON j.id = e.journal_id
            JOIN accounts a ON a.id = e.account_id
            WHERE a.customer_id = :customer
            ORDER BY j.created_at DESC, e.id DESC LIMIT 50
            """).param("customer", customerId).query((rs, row) -> new TransactionDto(
                rs.getObject("id", UUID.class), rs.getObject("account_id", UUID.class),
                rs.getString("description"), rs.getLong("amount_minor"), rs.getString("currency"),
                rs.getObject("created_at", OffsetDateTime.class).toInstant(), rs.getString("reference"),
                // Verified merchant metadata (exact alias match) so the UI can show a logo from the domain alone.
                MerchantDirectory.match(rs.getString("description")).orElse(null),
                "COMPLETED" /* the ledger only contains committed entries */)).list();
    }
}

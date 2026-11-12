package com.finix.banking.accounts;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

@Repository
public class AccountRepository {
    private final JdbcClient db;
    public AccountRepository(JdbcClient db) { this.db = db; }

    public record Customer(UUID id, String name) {}
    public record Account(UUID id, String displayName, String maskedNumber, String currency, long balanceMinor, String brand) {}
    public record InternalAccount(UUID id, UUID customerId, String currency, String status) {}

    public Customer requireCustomer(String subject, boolean lock) {
        var query = "SELECT id, full_name FROM customers WHERE oidc_subject = :subject" + (lock ? " FOR UPDATE" : "");
        return db.sql(query).param("subject", subject)
            .query((rs, row) -> new Customer(rs.getObject("id", UUID.class), rs.getString("full_name")))
            .optional().orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "No banking profile is linked to this identity"));
    }

    public List<Account> accountsForCustomer(UUID customerId) {
        return db.sql("""
            SELECT a.id, a.display_name, a.account_number, a.currency, a.card_brand,
                   COALESCE(SUM(e.amount_minor), 0) AS balance_minor
            FROM accounts a LEFT JOIN ledger_entries e ON e.account_id = a.id
            WHERE a.customer_id = :customerId AND a.status = 'ACTIVE'
            GROUP BY a.id, a.display_name, a.account_number, a.currency, a.card_brand
            ORDER BY a.created_at, a.id
            """).param("customerId", customerId).query((rs, row) -> new Account(
                rs.getObject("id", UUID.class), rs.getString("display_name"),
                "•••• " + rs.getString("account_number").substring(8),
                rs.getString("currency"), rs.getLong("balance_minor"), rs.getString("card_brand"))).list();
    }

    public InternalAccount requireAccount(UUID accountId, UUID customerId) {
        return db.sql("SELECT id, customer_id, currency, status FROM accounts WHERE id = :id AND customer_id = :customer")
            .param("id", accountId).param("customer", customerId)
            .query((rs, row) -> new InternalAccount(rs.getObject("id", UUID.class), rs.getObject("customer_id", UUID.class), rs.getString("currency"), rs.getString("status")))
            .optional().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    public long balance(UUID accountId) {
        return db.sql("SELECT COALESCE(SUM(amount_minor), 0) FROM ledger_entries WHERE account_id = :id")
            .param("id", accountId).query(Long.class).single();
    }
}

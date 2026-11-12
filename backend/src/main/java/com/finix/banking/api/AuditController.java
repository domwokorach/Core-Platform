package com.finix.banking.api;

import com.finix.banking.accounts.AccountRepository;
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
@RequestMapping("/api/audit")
public class AuditController {
    private final JdbcClient db;
    private final AccountRepository accounts;
    public AuditController(JdbcClient db, AccountRepository accounts) { this.db = db; this.accounts = accounts; }
    public record Event(UUID id, String eventType, UUID aggregateId, Instant createdAt, String reference) {}

    @GetMapping
    public List<Event> ownAuditEvents(@AuthenticationPrincipal Jwt jwt) {
        var customer = accounts.requireCustomer(jwt.getSubject(), false);
        return db.sql("""
            SELECT ae.id, ae.event_type, ae.aggregate_id, ae.created_at, t.reference
            FROM audit_events ae JOIN transfers t ON t.id = ae.aggregate_id
            WHERE t.customer_id = :customer AND ae.actor_subject = :subject
            ORDER BY ae.created_at DESC LIMIT 100
            """).param("customer", customer.id()).param("subject", jwt.getSubject())
            .query((rs, row) -> new Event(rs.getObject("id", UUID.class), rs.getString("event_type"),
                rs.getObject("aggregate_id", UUID.class), rs.getObject("created_at", OffsetDateTime.class).toInstant(),
                rs.getString("reference"))).list();
    }
}

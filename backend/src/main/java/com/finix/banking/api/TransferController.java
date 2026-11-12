package com.finix.banking.api;

import com.finix.banking.accounts.AccountRepository;
import com.finix.banking.transfers.TransferService;
import jakarta.validation.Valid;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/transfers")
public class TransferController {
    private final TransferService transfers;
    private final AccountRepository accounts;
    private final JdbcClient db;
    public TransferController(TransferService transfers, AccountRepository accounts, JdbcClient db) {
        this.transfers = transfers; this.accounts = accounts; this.db = db;
    }

    /** Customer's latest committed transfers, newest first. Same shape as the POST receipt. */
    @GetMapping
    public List<TransferService.Receipt> list(@AuthenticationPrincipal Jwt jwt) {
        var customer = accounts.requireCustomer(jwt.getSubject(), false);
        return db.sql("""
            SELECT id, source_account_id, destination_account_id, amount_minor, currency, reference, created_at
            FROM transfers WHERE customer_id = :customer ORDER BY created_at DESC, id DESC LIMIT 50
            """).param("customer", customer.id()).query((rs, row) -> new TransferService.Receipt(
                rs.getObject("id", UUID.class), rs.getObject("source_account_id", UUID.class),
                rs.getObject("destination_account_id", UUID.class), rs.getLong("amount_minor"),
                rs.getString("currency"), rs.getString("reference"),
                rs.getObject("created_at", OffsetDateTime.class).toInstant())).list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TransferService.Receipt post(@AuthenticationPrincipal Jwt jwt,
                                         @RequestHeader("Idempotency-Key") String idempotencyKey,
                                         @Valid @RequestBody TransferService.Request request) {
        return transfers.transfer(jwt.getSubject(), idempotencyKey, request);
    }
}

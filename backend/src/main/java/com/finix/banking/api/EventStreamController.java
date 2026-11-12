package com.finix.banking.api;

import com.finix.banking.accounts.AccountRepository;
import com.finix.banking.events.DashboardEventBroker;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/events")
public class EventStreamController {
    private final AccountRepository accounts;
    private final DashboardEventBroker broker;
    public EventStreamController(AccountRepository accounts, DashboardEventBroker broker) { this.accounts = accounts; this.broker = broker; }

    @Operation(summary = "Subscribe to dashboard invalidation events (Server-Sent Events)",
        description = """
            Authenticate with `Authorization: Bearer <access token>` (use fetch streaming; the browser EventSource API cannot \
            send headers, and tokens must never be placed in the URL). The stream is scoped to the token's customer and is \
            closed no later than the token's expiry.

            Events: `stream.ready` (connection established), `dashboard.updated` (a committed change; no balances are included), \
            and `: keepalive` comment heartbeats. Notifications are non-durable: after every (re)connect and every \
            `dashboard.updated`, re-read `GET /api/dashboard`.""")
    @ApiResponse(responseCode = "200", description = "text/event-stream")
    @ApiResponse(responseCode = "401", description = "Missing, invalid or expired token")
    @ApiResponse(responseCode = "403", description = "No banking profile linked to this identity")
    @ApiResponse(responseCode = "429", description = "Too many live connections for this customer")
    @GetMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@AuthenticationPrincipal Jwt jwt, HttpServletResponse response) {
        var customer = accounts.requireCustomer(jwt.getSubject(), false); // connection released before streaming starts
        response.setHeader("Cache-Control", "no-cache, no-transform");
        response.setHeader("X-Accel-Buffering", "no");
        return broker.subscribe(customer.id(), jwt.getExpiresAt());
    }
}

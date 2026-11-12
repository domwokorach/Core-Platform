package com.finix.banking.cards;

import com.finix.banking.accounts.AccountRepository;
import com.finix.banking.cards.CardModels.*;
import com.finix.banking.events.DashboardEventBroker;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/cards")
public class CardController {
    private final CardService cards;
    private final CardAuthorizationService authorizations;
    private final AccountRepository accounts;
    private final DashboardEventBroker broker;
    private final boolean sandboxAuthorizations;

    public CardController(CardService cards, CardAuthorizationService authorizations, AccountRepository accounts, DashboardEventBroker broker,
                          @Value("${app.cards.sandbox-authorizations-enabled:true}") boolean sandboxAuthorizations) {
        this.cards = cards; this.authorizations = authorizations; this.accounts = accounts; this.broker = broker;
        this.sandboxAuthorizations = sandboxAuthorizations;
    }

    private static CardService.Actor actor(Jwt jwt) { return new CardService.Actor(jwt.getSubject(), jwt.getClaimAsInstant("auth_time")); }

    @GetMapping public List<CardView> list(@AuthenticationPrincipal Jwt jwt) { return cards.list(jwt.getSubject()); }

    @GetMapping("/{cardId}") public CardView get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID cardId) { return cards.get(jwt.getSubject(), cardId); }

    @Operation(summary = "Issue a sandbox virtual card", description = "Requires an Idempotency-Key header. The card starts in PENDING_ACTIVATION with default limits. Not a real payment card.")
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public CardView create(@AuthenticationPrincipal Jwt jwt, @RequestHeader(value = "Idempotency-Key", required = false) String key,
                           @Valid @RequestBody CreateCardRequest request) {
        return cards.issue(actor(jwt), key, request);
    }

    @PostMapping("/{cardId}/activate") public CardView activate(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID cardId) { return cards.activate(actor(jwt), cardId); }
    @PostMapping("/{cardId}/freeze") public CardView freeze(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID cardId) { return cards.freeze(actor(jwt), cardId); }
    @PostMapping("/{cardId}/unfreeze") public CardView unfreeze(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID cardId) { return cards.unfreeze(actor(jwt), cardId); }

    @PatchMapping("/{cardId}/limits")
    public CardView limits(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID cardId, @RequestBody LimitsRequest request) {
        return cards.updateLimits(actor(jwt), cardId, request);
    }

    @GetMapping("/{cardId}/transactions") public List<CardTransaction> transactions(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID cardId) { return cards.transactions(jwt.getSubject(), cardId); }
    @GetMapping("/{cardId}/activity") public List<CardActivity> activity(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID cardId) { return cards.activity(jwt.getSubject(), cardId); }

    @Operation(summary = "Sandbox only: simulate a card authorization",
        description = "Runs the same authorization rules a card processor would use (status, online setting, limits). Records a decision; never posts to the ledger.")
    @PostMapping("/{cardId}/sandbox-authorizations") @ResponseStatus(HttpStatus.CREATED)
    public CardTransaction simulate(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID cardId, @Valid @RequestBody AuthorizationRequest request) {
        if (!sandboxAuthorizations) throw new CardApiException(HttpStatus.NOT_FOUND, "NOT_AVAILABLE", "Not available");
        return authorizations.authorize(jwt.getSubject(), cardId, request);
    }

    @Operation(summary = "Subscribe to card events (Server-Sent Events)",
        description = """
            Same authentication and delivery rules as `/api/events/stream`. Events: `stream.ready`, `card.created`, `card.activated`, \
            `card.frozen`, `card.unfrozen`, `card.limits.updated`, `card.authorization.declined` (data: eventId, cardId, occurredAt only). \
            Notifications are non-durable: re-read `GET /api/cards` after every (re)connect and every event.""")
    @GetMapping(path = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter events(@AuthenticationPrincipal Jwt jwt, HttpServletResponse response) {
        var customer = accounts.requireCustomer(jwt.getSubject(), false);
        response.setHeader("Cache-Control", "no-cache, no-transform");
        response.setHeader("X-Accel-Buffering", "no");
        return broker.subscribe(DashboardEventBroker.CARDS, customer.id(), jwt.getExpiresAt());
    }
}

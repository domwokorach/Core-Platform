package com.finix.banking.market;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * SSE fan-out of "market data changed" hints. Events carry NO prices, only a nudge to re-read the REST endpoints, so the
 * authenticated REST layer stays the single source of truth. Single-instance, non-durable (like the dashboard broker).
 */
@Component
public class MarketEventBroker {
    private record Sub(SseEmitter emitter, String subject) {}
    private static final int MAX_PER_SUBJECT = 3, MAX_TOTAL = 1000;
    private final List<Sub> subs = new CopyOnWriteArrayList<>();

    public synchronized SseEmitter subscribe(String subject, Instant tokenExpiry) {
        long remaining = Duration.between(Instant.now(), tokenExpiry).toMillis();
        if (remaining <= 0) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Access token expired");
        if (subs.size() >= MAX_TOTAL || subs.stream().filter(s -> s.subject().equals(subject)).count() >= MAX_PER_SUBJECT)
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many live connections");
        SseEmitter emitter = new SseEmitter(remaining);
        Sub sub = new Sub(emitter, subject);
        subs.add(sub);
        emitter.onCompletion(() -> subs.remove(sub));
        emitter.onTimeout(emitter::complete);
        emitter.onError(e -> subs.remove(sub));
        try { emitter.send(SseEmitter.event().name("stream.ready").data(Map.of("heartbeatSeconds", 20, "expiresAt", tokenExpiry.toString()), MediaType.APPLICATION_JSON)); }
        catch (IOException | IllegalStateException e) { subs.remove(sub); throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Could not open stream"); }
        return emitter;
    }

    public int subscribers() { return subs.size(); }

    public void publishUpdated() {
        Map<String, String> data = Map.of("eventId", UUID.randomUUID().toString(), "occurredAt", Instant.now().toString());
        for (Sub s : subs) {
            try { s.emitter().send(SseEmitter.event().name("market.updated").data(data, MediaType.APPLICATION_JSON)); }
            catch (IOException | IllegalStateException e) { drop(s, e); }
        }
    }

    /** A client that already went away can reject completion; that is expected and must not surface as a scheduler error. */
    private void drop(Sub s, Exception cause) {
        subs.remove(s);
        try { s.emitter().completeWithError(cause); } catch (IllegalStateException ignored) { /* already completed by the container */ }
    }

    void heartbeat() {
        for (Sub s : subs) {
            try { s.emitter().send(SseEmitter.event().comment("keepalive")); }
            catch (IOException | IllegalStateException e) { drop(s, e); }
        }
    }
}

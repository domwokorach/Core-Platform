package com.finix.banking.events;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * In-process Server-Sent Events fan-out, keyed by customer id.
 *
 * <p>Notifications are invalidation hints only: they never carry balances or payment data, and delivery is
 * best-effort and non-durable. Clients must re-read GET /api/dashboard on every (re)connect and on every event.
 * This broker is single-instance; a multi-instance deployment needs an outbox relay plus a shared bus
 * (see README "Real-time updates").
 */
@Component
public class DashboardEventBroker {
    private static final Logger log = LoggerFactory.getLogger(DashboardEventBroker.class);

    private record Subscription(SseEmitter emitter, Instant expiresAt) {}

    private final Map<UUID, List<Subscription>> subscriptions = new ConcurrentHashMap<>();
    private final AtomicInteger total = new AtomicInteger();
    private final ExecutorService sender = Executors.newFixedThreadPool(2, runnable -> {
        Thread thread = new Thread(runnable, "sse-sender");
        thread.setDaemon(true);
        return thread;
    });
    private final int heartbeatSeconds;
    private final int maxPerCustomer;
    private final int maxTotal;
    private final Counter sent;
    private final Counter failed;

    public DashboardEventBroker(@Value("${app.events.heartbeat-seconds:20}") int heartbeatSeconds,
                                @Value("${app.events.max-connections-per-customer:5}") int maxPerCustomer,
                                @Value("${app.events.max-connections-total:2000}") int maxTotal,
                                MeterRegistry metrics) {
        this.heartbeatSeconds = heartbeatSeconds;
        this.maxPerCustomer = maxPerCustomer;
        this.maxTotal = maxTotal;
        metrics.gauge("finix.sse.connections", total);
        this.sent = metrics.counter("finix.sse.events.sent");
        this.failed = metrics.counter("finix.sse.events.failed");
    }

    /** Opens a stream that is closed no later than {@code tokenExpiry}. Sends {@code stream.ready} immediately. */
    public SseEmitter subscribe(UUID customerId, Instant tokenExpiry) {
        long remainingMs = Duration.between(Instant.now(), tokenExpiry).toMillis();
        if (remainingMs <= 0) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Access token expired");
        SseEmitter emitter = new SseEmitter(remainingMs);
        Subscription subscription = new Subscription(emitter, tokenExpiry);
        synchronized (this) {
            List<Subscription> mine = subscriptions.computeIfAbsent(customerId, id -> new CopyOnWriteArrayList<>());
            if (total.get() >= maxTotal || mine.size() >= maxPerCustomer)
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many live connections");
            mine.add(subscription);
            total.incrementAndGet();
        }
        Runnable cleanup = () -> remove(customerId, subscription);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(emitter::complete);
        emitter.onError(error -> cleanup.run());
        try {
            emitter.send(SseEmitter.event().name("stream.ready").data(
                Map.of("heartbeatSeconds", heartbeatSeconds, "expiresAt", tokenExpiry.toString()), MediaType.APPLICATION_JSON));
        } catch (IOException | IllegalStateException e) {
            remove(customerId, subscription);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Could not open stream");
        }
        return emitter;
    }

    /** Runs only after the publishing transaction commits; rolled-back work never notifies. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onDashboardChanged(DashboardChanged changed) {
        List<Subscription> targets = subscriptions.get(changed.customerId());
        if (targets == null || targets.isEmpty()) return;
        Map<String, String> data = Map.of("eventId", UUID.randomUUID().toString(), "reason", changed.reason(),
                                          "occurredAt", Instant.now().toString());
        sender.execute(() -> {
            for (Subscription subscription : new ArrayList<>(targets)) {
                try {
                    subscription.emitter().send(SseEmitter.event().id(data.get("eventId"))
                        .name("dashboard.updated").data(data, MediaType.APPLICATION_JSON));
                    sent.increment();
                } catch (IOException | IllegalStateException e) {
                    failed.increment();
                    remove(changed.customerId(), subscription);
                    subscription.emitter().completeWithError(e);
                }
            }
        });
    }

    @Scheduled(fixedDelayString = "#{${app.events.heartbeat-seconds:20} * 1000}")
    void heartbeat() {
        Instant now = Instant.now();
        subscriptions.forEach((customerId, list) -> {
            for (Subscription subscription : list) {
                if (!subscription.expiresAt().isAfter(now)) { subscription.emitter().complete(); continue; }
                try {
                    subscription.emitter().send(SseEmitter.event().comment("keepalive"));
                } catch (IOException | IllegalStateException e) {
                    remove(customerId, subscription);
                    subscription.emitter().completeWithError(e);
                }
            }
        });
    }

    int connections() { return total.get(); }

    private synchronized void remove(UUID customerId, Subscription subscription) {
        List<Subscription> mine = subscriptions.get(customerId);
        if (mine != null && mine.remove(subscription)) {
            total.decrementAndGet();
            if (mine.isEmpty()) subscriptions.remove(customerId, mine);
        }
    }

    /**
     * Streams count as in-flight requests, so graceful web-server shutdown would wait out its full timeout for them.
     * ContextClosedEvent fires before lifecycle beans (the web server) stop; clients simply reconnect elsewhere.
     */
    @EventListener(ContextClosedEvent.class)
    void closeStreamsOnShutdown() {
        subscriptions.values().forEach(list -> list.forEach(s -> s.emitter().complete()));
    }

    @PreDestroy
    void shutdown() { sender.shutdownNow(); }
}

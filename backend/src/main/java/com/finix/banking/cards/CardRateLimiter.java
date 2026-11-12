package com.finix.banking.cards;

import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Per-customer sliding-window limiter for sensitive card commands. In-process (single instance), like the SSE broker;
 * a scaled deployment needs a shared store.
 */
@Component
public class CardRateLimiter {
    private record Bucket(UUID customerId, String name) {}

    private final Map<Bucket, ArrayDeque<Long>> hits = new ConcurrentHashMap<>();
    private final int commandsPerMinute;
    private final int issuancesPerMinute;

    public CardRateLimiter(@Value("${app.cards.rate-limit.commands-per-minute:20}") int commandsPerMinute,
                           @Value("${app.cards.rate-limit.issuances-per-minute:5}") int issuancesPerMinute) {
        this.commandsPerMinute = commandsPerMinute;
        this.issuancesPerMinute = issuancesPerMinute;
    }

    public void checkIssuance(UUID customerId) { check(customerId, "issue", issuancesPerMinute); }
    public void checkCommand(UUID customerId) { check(customerId, "command", commandsPerMinute); }

    private void check(UUID customerId, String name, int max) {
        long now = System.nanoTime();
        long window = Duration.ofMinutes(1).toNanos();
        ArrayDeque<Long> queue = hits.computeIfAbsent(new Bucket(customerId, name), b -> new ArrayDeque<>());
        synchronized (queue) {
            while (!queue.isEmpty() && now - queue.peekFirst() >= window) queue.pollFirst();
            if (queue.size() >= max) {
                long retry = Math.max(1, Duration.ofNanos(window - (now - queue.peekFirst())).toSeconds() + 1);
                throw new CardApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED",
                    "Too many card requests. Try again shortly.", retry);
            }
            queue.addLast(now);
        }
    }
}

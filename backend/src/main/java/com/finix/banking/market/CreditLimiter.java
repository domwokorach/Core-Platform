package com.finix.banking.market;

import java.time.Clock;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;

/** Sliding one-minute credit budget (Twelve Data bills 1 credit per symbol per request). Fails fast instead of queueing. */
public class CreditLimiter {
    private record Spend(long at, int credits) {}
    private final int perMinute;
    private final Clock clock;
    private final Deque<Spend> spends = new ArrayDeque<>();
    private long blockedUntil;

    public CreditLimiter(int perMinute, Clock clock) { this.perMinute = perMinute; this.clock = clock; }

    private void expire(long now) { while (!spends.isEmpty() && now - spends.peekFirst().at() >= 60_000) spends.pollFirst(); }

    public synchronized boolean tryAcquire(int credits) {
        long now = clock.millis();
        expire(now);
        if (now < blockedUntil || used() + credits > perMinute) return false;
        spends.addLast(new Spend(now, credits));
        return true;
    }
    private int used() { return spends.stream().mapToInt(Spend::credits).sum(); }
    public synchronized int remaining() {
        long now = clock.millis(); expire(now);
        return now < blockedUntil ? 0 : Math.max(0, perMinute - used());
    }
    /** Seconds until at least one credit is likely available again. */
    public synchronized int retryAfterSeconds() {
        long now = clock.millis(); expire(now);
        long until = Math.max(blockedUntil, spends.isEmpty() || used() < perMinute ? now : spends.peekFirst().at() + 60_000);
        return (int) Math.max(1, Duration.ofMillis(until - now).toSeconds() + 1);
    }
    /** The provider said we're over its limit: stop calling for the rest of this minute window. */
    public synchronized void penalize() { blockedUntil = clock.millis() + 60_000; }
}

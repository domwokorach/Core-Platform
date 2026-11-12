package com.finix.banking.market;

import java.net.URI;
import java.time.Duration;
import java.util.Set;

/** Market-data settings. The API key is never serialised, logged or returned (see toString). */
public record MarketConfig(String apiKey, String baseUrl, int creditsPerMinute, Duration quoteTtl, Duration closedTtl,
                           Duration historyTtl, Duration intradayHistoryTtl, Duration fxTtl, boolean realtimeEntitled,
                           Duration liveMaxAge, Duration timeout, int maxAttempts, Duration backoff) {
    private static final Set<String> LOOPBACK = Set.of("localhost", "127.0.0.1", "::1", "[::1]");

    public MarketConfig {
        URI uri = URI.create(baseUrl);
        // Secrets only ever travel over HTTPS; plain HTTP is accepted solely for loopback (local mock servers in tests).
        if (!"https".equals(uri.getScheme()) && !LOOPBACK.contains(uri.getHost()))
            throw new IllegalArgumentException("Market data base URL must use https");
    }

    public boolean configured() { return apiKey != null && !apiKey.isBlank(); }

    @Override public String toString() { return "MarketConfig[baseUrl=" + baseUrl + ", apiKey=" + (configured() ? "***" : "<unset>") + "]"; }
}

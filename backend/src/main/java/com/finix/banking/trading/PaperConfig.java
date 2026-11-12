package com.finix.banking.trading;

import java.net.URI;
import java.time.Duration;
import java.util.Set;

/**
 * Alpaca PAPER trading settings. Live brokerage is impossible by construction: the constructor rejects any host other than
 * the paper endpoint (loopback is allowed only so tests can run against a local mock), and the live host is refused by name.
 */
public record PaperConfig(String keyId, String secretKey, String baseUrl, Duration timeout) {
    public static final String PAPER_BASE_URL = "https://paper-api.alpaca.markets";
    private static final Set<String> LOOPBACK = Set.of("localhost", "127.0.0.1", "::1", "[::1]");

    public PaperConfig {
        URI uri = URI.create(baseUrl);
        String host = uri.getHost();
        boolean paper = "paper-api.alpaca.markets".equals(host) && "https".equals(uri.getScheme());
        if ("api.alpaca.markets".equals(host)) throw new IllegalArgumentException("Live trading endpoint is forbidden: FINIX supports Alpaca PAPER trading only");
        if (!paper && !LOOPBACK.contains(host)) throw new IllegalArgumentException("Only the Alpaca paper endpoint may be configured");
    }

    public boolean enabled() { return keyId != null && !keyId.isBlank() && secretKey != null && !secretKey.isBlank(); }
    @Override public String toString() { return "PaperConfig[baseUrl=" + baseUrl + ", credentials=" + (enabled() ? "***" : "<unset>") + "]"; }
}

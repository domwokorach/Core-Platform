package com.finix.banking.market;

/** Structured market-data failure. {@code code} is a stable machine-readable value; messages never contain secrets. */
public class MarketException extends RuntimeException {
    public final String code;
    public final int httpStatus;
    public final Integer retryAfterSeconds;

    public MarketException(String code, int httpStatus, String message, Integer retryAfterSeconds) {
        super(message);
        this.code = code; this.httpStatus = httpStatus; this.retryAfterSeconds = retryAfterSeconds;
    }
    public MarketException(String code, int httpStatus, String message) { this(code, httpStatus, message, null); }

    /** Maps a Twelve Data error code (body `code` or HTTP status) onto a FINIX error. Provider text is deliberately not forwarded. */
    public static MarketException fromProvider(int code, Integer retryAfter) {
        return switch (code) {
            case 401 -> new MarketException("PROVIDER_AUTH", 502, "The market data provider rejected FINIX's credentials.");
            case 403 -> new MarketException("PLAN_RESTRICTED", 502, "This data is not included in FINIX's market data plan.");
            case 400, 404 -> new MarketException("UNKNOWN_INSTRUMENT", 404, "The provider has no data for this instrument.");
            case 414 -> new MarketException("BAD_REQUEST", 502, "The provider rejected the request.");
            case 429 -> new MarketException("RATE_LIMITED", 429, "Market data rate limit reached. Showing the latest saved data until it resets.", retryAfter);
            default -> new MarketException("PROVIDER_UNAVAILABLE", 503, "The market data provider is currently unavailable.");
        };
    }
}

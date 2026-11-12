package com.finix.banking.market;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Provider-neutral and API-facing records. Prices travel as decimal strings so no precision is lost. */
public final class MarketModels {
    private MarketModels() {}

    public record Quote(String symbol, String name, String exchange, String currency, BigDecimal price, BigDecimal previousClose,
                        BigDecimal change, BigDecimal percentChange, BigDecimal open, BigDecimal high, BigDecimal low,
                        Long volume, Instant quotedAt, boolean marketOpen) {}

    public record FxRate(String pair, BigDecimal rate, Instant rateTimestamp, Instant fetchedAt, String source) {}

    /** Indicative GBP equivalent of a native quote. Never an executable price. */
    public record GbpEstimate(String pair, String rate, Instant rateTimestamp, String source, String price, String change, boolean indicative) {}

    public enum DataClass { LIVE, DELAYED, END_OF_DAY, STALE }

    public record QuoteView(String symbol, String name, String exchange, String currency, String price, String previousClose,
                            String change, String percentChange, String open, String high, String low, Long volume,
                            Instant quotedAt, Instant fetchedAt, boolean marketOpen, DataClass dataClass, boolean stale,
                            String externalUrl, String source, GbpEstimate gbp) {}

    public record SymbolError(String symbol, String code, String message, Integer retryAfterSeconds) {}

    public record QuotesResponse(List<QuoteView> quotes, List<SymbolError> errors, FxInfo fx, Instant generatedAt) {}
    /** FX availability for the GBP estimate; `error` is set when no real rate could be fetched. */
    public record FxInfo(String pair, String rate, Instant rateTimestamp, String source, String error) {}

    public record HistoryPoint(long t, String datetime, double open, double high, double low, double close, Long volume) {}
    public record History(String symbol, String range, String interval, String currency, String timezone,
                          List<HistoryPoint> points, Instant fetchedAt, boolean stale) {}

    public record MarketStatus(boolean configured, String provider, boolean realtimeEntitled, int creditsPerMinute, int creditsRemaining,
                               Instant lastSuccessAt, String lastErrorCode, Instant lastErrorAt, int streamSubscribers, List<String> symbols) {}
}

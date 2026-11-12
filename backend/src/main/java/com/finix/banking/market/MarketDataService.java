package com.finix.banking.market;

import com.finix.banking.market.MarketModels.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Supplier;

/**
 * Caching, request-coalescing facade over the provider. Guarantees:
 * <ul>
 *   <li>concurrent callers for the same key share ONE provider call (no thundering herd, no wasted credits);</li>
 *   <li>on provider failure the last good value is served flagged {@code stale} (never silently presented as fresh);</li>
 *   <li>a symbol with no good value yields an explicit error entry, never an invented price.</li>
 * </ul>
 */
public class MarketDataService {
    private record Entry<T>(T value, Instant fetchedAt, boolean lastRefreshFailed) {}
    public enum Range {
        D1("1D", "5min", 78), W1("1W", "30min", 65), M1("1M", "1day", 22), M3("3M", "1day", 66), Y1("1Y", "1day", 252);
        public final String label, interval; public final int points;
        Range(String label, String interval, int points) { this.label = label; this.interval = interval; this.points = points; }
        public static Range parse(String s) {
            for (Range r : values()) if (r.label.equalsIgnoreCase(s)) return r;
            throw new MarketException("BAD_RANGE", 400, "Unsupported range. Use 1D, 1W, 1M, 3M or 1Y.");
        }
    }

    private final MarketConfig config;
    private final TwelveDataClient client;
    private final CreditLimiter limiter;
    private final Clock clock;
    private final Map<String, Entry<?>> cache = new ConcurrentHashMap<>();
    private final Map<String, CompletableFuture<?>> inflight = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
    private volatile Instant lastSuccessAt, lastErrorAt;
    private volatile String lastErrorCode;

    public MarketDataService(MarketConfig config, TwelveDataClient client, CreditLimiter limiter, Clock clock) {
        this.config = config; this.client = client; this.limiter = limiter; this.clock = clock;
    }

    // ---- freshness (pure, unit-tested) ----

    /**
     * LIVE is claimed only when ALL hold: the operator confirmed real-time entitlement for the plan, the provider says the
     * market is open, the quote is not a stale fallback, and the quote's own timestamp is recent. The provider response
     * carries no entitlement flag, so without confirmation an open-market quote is labelled DELAYED, not LIVE.
     */
    public static DataClass classify(Quote q, boolean stale, boolean realtimeEntitled, Duration liveMaxAge, Instant now) {
        if (stale) return DataClass.STALE;
        if (!q.marketOpen()) return DataClass.END_OF_DAY;
        boolean fresh = q.quotedAt() != null && !q.quotedAt().isAfter(now.plusSeconds(60)) && Duration.between(q.quotedAt(), now).compareTo(liveMaxAge) <= 0;
        return realtimeEntitled && fresh ? DataClass.LIVE : DataClass.DELAYED;
    }

    // ---- quotes ----

    public QuotesResponse quotes(List<String> symbols) {
        Instant now = clock.instant();
        List<CompletableFuture<Object>> futures = symbols.stream().map(s -> CompletableFuture.supplyAsync(() -> quoteOrError(s), executor)).toList();
        List<QuoteView> quotes = new ArrayList<>();
        List<SymbolError> errors = new ArrayList<>();
        List<Object> results = futures.stream().map(CompletableFuture::join).toList();
        FxInfo fx = null; FxRate rate = null;
        boolean needsFx = results.stream().anyMatch(r -> r instanceof Resolved res && !"GBP".equals(res.quote.currency()));
        if (needsFx) {
            String fxErr = null;
            try { rate = fxRate("USD/GBP"); } catch (MarketException e) { fxErr = e.code; }
            fx = rate != null ? new FxInfo(rate.pair(), rate.rate().toPlainString(), rate.rateTimestamp(), rate.source(), null)
                              : new FxInfo("USD/GBP", null, null, null, fxErr == null ? "FX_UNAVAILABLE" : fxErr);
        }
        for (Object r : results) {
            if (r instanceof SymbolError e) { errors.add(e); continue; }
            Resolved res = (Resolved) r;
            quotes.add(view(res.quote, res.fetchedAt, res.stale, "USD".equals(res.quote.currency()) ? rate : null, now));
        }
        return new QuotesResponse(quotes, errors, fx, now);
    }

    public QuoteView quote(String symbol) {
        Instruments.require(symbol);
        Object r = quoteOrError(symbol.toUpperCase());
        if (r instanceof SymbolError e) throw new MarketException(e.code(), statusFor(e.code()), e.message(), e.retryAfterSeconds());
        Resolved res = (Resolved) r;
        FxRate rate = null;
        if ("USD".equals(res.quote.currency())) { try { rate = fxRate("USD/GBP"); } catch (MarketException ignored) { /* estimate simply omitted */ } }
        return view(res.quote, res.fetchedAt, res.stale, rate, clock.instant());
    }

    private record Resolved(Quote quote, Instant fetchedAt, boolean stale) {}

    private Object quoteOrError(String symbol) {
        String key = "q:" + symbol;
        @SuppressWarnings("unchecked") Entry<Quote> cached = (Entry<Quote>) cache.get(key);
        Instant now = clock.instant();
        if (cached != null && !cached.lastRefreshFailed() && Duration.between(cached.fetchedAt(), now).compareTo(cached.value().marketOpen() ? config.quoteTtl() : config.closedTtl()) < 0)
            return new Resolved(cached.value(), cached.fetchedAt(), false);
        try {
            Quote q = coalesced(key, () -> client.quote(symbol));
            Instant at = clock.instant();
            cache.put(key, new Entry<>(q, at, false));
            markSuccess();
            return new Resolved(q, at, false);
        } catch (MarketException e) {
            markError(e);
            if (cached != null) { // serve the last good quote, flagged stale
                cache.put(key, new Entry<>(cached.value(), cached.fetchedAt(), true));
                return new Resolved(cached.value(), cached.fetchedAt(), true);
            }
            return new SymbolError(symbol, e.code, e.getMessage(), e.retryAfterSeconds);
        }
    }

    // ---- FX ----

    private FxRate fxRate(String pair) {
        String key = "fx:" + pair;
        @SuppressWarnings("unchecked") Entry<FxRate> cached = (Entry<FxRate>) cache.get(key);
        Instant now = clock.instant();
        if (cached != null && Duration.between(cached.fetchedAt(), now).compareTo(config.fxTtl()) < 0) return cached.value();
        try {
            FxRate r = coalesced(key, () -> client.exchangeRate(pair));
            cache.put(key, new Entry<>(r, clock.instant(), false));
            markSuccess();
            return r;
        } catch (MarketException e) {
            markError(e);
            // An old real rate is still a real rate; it is shown with its own timestamp so its age is visible.
            if (cached != null && Duration.between(cached.fetchedAt(), now).compareTo(config.fxTtl().multipliedBy(6)) < 0) return cached.value();
            throw e;
        }
    }

    // ---- history ----

    public History history(String symbol, String rangeLabel) {
        Instruments.require(symbol);
        Range range = Range.parse(rangeLabel);
        String sym = symbol.toUpperCase(), key = "h:" + sym + ":" + range.label;
        @SuppressWarnings("unchecked") Entry<History> cached = (Entry<History>) cache.get(key);
        Instant now = clock.instant();
        Duration ttl = range == Range.D1 ? config.intradayHistoryTtl() : config.historyTtl();
        if (cached != null && !cached.lastRefreshFailed() && Duration.between(cached.fetchedAt(), now).compareTo(ttl) < 0) return cached.value();
        try {
            History h = coalesced(key, () -> client.timeSeries(sym, range.label, range.interval, range.points));
            cache.put(key, new Entry<>(h, clock.instant(), false));
            markSuccess();
            return h;
        } catch (MarketException e) {
            markError(e);
            if (cached != null) {
                History h = cached.value();
                cache.put(key, new Entry<>(h, cached.fetchedAt(), true));
                return new History(h.symbol(), h.range(), h.interval(), h.currency(), h.timezone(), h.points(), h.fetchedAt(), true);
            }
            throw e;
        }
    }

    // ---- status / helpers ----

    public MarketStatus status(int subscribers) {
        return new MarketStatus(config.configured(), "Twelve Data", config.realtimeEntitled(), config.creditsPerMinute(), limiter.remaining(),
            lastSuccessAt, lastErrorCode, lastErrorAt, subscribers, Instruments.WATCHLIST.stream().map(Instruments.Instrument::symbol).toList());
    }

    /** Refreshes quotes that are due (used by the SSE poller). Returns a fingerprint to detect real changes. */
    public String refreshFingerprint() {
        QuotesResponse r = quotes(Instruments.WATCHLIST.stream().map(Instruments.Instrument::symbol).toList());
        StringBuilder sb = new StringBuilder();
        r.quotes().forEach(q -> sb.append(q.symbol()).append(q.price()).append(q.quotedAt()).append(q.stale()).append(';'));
        r.errors().forEach(e -> sb.append(e.symbol()).append(e.code()).append(';'));
        return sb.toString();
    }

    private QuoteView view(Quote q, Instant fetchedAt, boolean stale, FxRate rate, Instant now) {
        Instruments.Instrument inst = Instruments.find(q.symbol()).orElse(null);
        GbpEstimate gbp = null;
        if (rate != null && "USD".equals(q.currency()))
            gbp = new GbpEstimate(rate.pair(), rate.rate().toPlainString(), rate.rateTimestamp(), rate.source(),
                gbpAmount(q.price(), rate.rate()), q.change() == null ? null : gbpAmount(q.change(), rate.rate()), true);
        return new QuoteView(q.symbol(), inst != null ? inst.name() : q.name(), inst != null ? inst.exchange() : q.exchange(), q.currency(),
            q.price().toPlainString(), str(q.previousClose()), str(q.change()), str(q.percentChange()), str(q.open()), str(q.high()), str(q.low()),
            q.volume(), q.quotedAt(), fetchedAt, q.marketOpen(), classify(q, stale, config.realtimeEntitled(), config.liveMaxAge(), now), stale,
            inst != null ? inst.externalUrl() : null, "Twelve Data", gbp);
    }
    private static String gbpAmount(BigDecimal usd, BigDecimal rate) { return usd.multiply(rate).setScale(2, RoundingMode.HALF_EVEN).toPlainString(); }
    private static String str(BigDecimal d) { return d == null ? null : d.toPlainString(); }
    private static int statusFor(String code) { return switch (code) { case "RATE_LIMITED" -> 429; case "UNKNOWN_INSTRUMENT" -> 404; case "NOT_CONFIGURED", "PROVIDER_UNAVAILABLE" -> 503; default -> 502; }; }
    private void markSuccess() { lastSuccessAt = clock.instant(); }
    private void markError(MarketException e) { lastErrorAt = clock.instant(); lastErrorCode = e.code; }

    @SuppressWarnings("unchecked")
    private <T> T coalesced(String key, Supplier<T> call) {
        CompletableFuture<T> mine = new CompletableFuture<>();
        CompletableFuture<T> existing = (CompletableFuture<T>) inflight.putIfAbsent(key, mine);
        if (existing != null) return await(existing);
        try { mine.complete(call.get()); }
        catch (RuntimeException e) { mine.completeExceptionally(e); }
        finally { inflight.remove(key, mine); }
        return await(mine);
    }
    private static <T> T await(CompletableFuture<T> f) {
        try { return f.join(); }
        catch (CompletionException e) { if (e.getCause() instanceof RuntimeException r) throw r; throw e; }
    }

    /** Test hook. */
    int cachedEntries() { return cache.size(); }
}

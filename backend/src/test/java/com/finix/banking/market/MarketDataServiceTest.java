package com.finix.banking.market;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finix.banking.market.MarketModels.*;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MarketDataServiceTest {
    static final String KEY = "test-secret-key-123";
    static final ObjectMapper JSON = new ObjectMapper().findAndRegisterModules();

    /** Mutable clock so tests can move time (cache TTLs, rate-limit windows). */
    static class TestClock extends Clock {
        final AtomicLong ms = new AtomicLong(Instant.parse("2025-06-10T15:00:00Z").toEpochMilli());
        public java.time.ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(java.time.ZoneId z) { return this; }
        public Instant instant() { return Instant.ofEpochMilli(ms.get()); }
        void advance(Duration d) { ms.addAndGet(d.toMillis()); }
    }

    MockServer provider; TestClock clock; MarketDataService service; CreditLimiter limiter;

    // Field set copied from the documented /quote example (twelvedata.com/docs/market-data/quote).
    static String quoteJson(String symbol, String close, boolean open, long lastQuote, String currency) {
        return """
            {"symbol":"%s","name":"%s Inc","exchange":"NASDAQ","mic_code":"XNGS","currency":"%s","datetime":"2025-06-10","timestamp":%d,
             "last_quote_at":%d,"open":"190.00","high":"192.50","low":"189.10","close":"%s","volume":"48123000","previous_close":"188.00",
             "change":"2.00","percent_change":"1.06383","average_volume":"50000000","is_market_open":%s}""".formatted(symbol, symbol, currency, lastQuote - 60, lastQuote, close, open);
    }

    @BeforeEach void setUp() throws Exception {
        provider = new MockServer();
        clock = new TestClock();
        service = build(true);
    }
    MarketDataService build(boolean realtime) {
        MarketConfig cfg = new MarketConfig(KEY, provider.url(), 8, Duration.ofSeconds(60), Duration.ofMinutes(15), Duration.ofMinutes(15), Duration.ofMinutes(2),
            Duration.ofMinutes(10), realtime, Duration.ofSeconds(120), Duration.ofSeconds(2), 3, Duration.ofMillis(1));
        limiter = new CreditLimiter(8, clock);
        return new MarketDataService(cfg, new TwelveDataClient(cfg, TwelveDataClient.newHttpClient(cfg), JSON, limiter, clock), limiter, clock);
    }
    @AfterEach void tearDown() { provider.close(); }

    long now() { return clock.instant().getEpochSecond(); }

    void respondQuotes(boolean marketOpen) {
        provider.handler = h -> {
            if (h.uri().startsWith("/exchange_rate")) return new MockServer.Reply(200, "{\"symbol\":\"USD/GBP\",\"rate\":0.7500,\"timestamp\":" + now() + "}");
            String sym = h.uri().replaceAll(".*symbol=([A-Z]+).*", "$1");
            return new MockServer.Reply(200, quoteJson(sym, "200.00", marketOpen, now() - 5, "USD"));
        };
    }

    @Test void mapsAllFourWatchlistQuotesWithNativeCurrencyAndIndicativeGbp() {
        respondQuotes(true);
        QuotesResponse r = service.quotes(List.of("AAPL", "MSFT", "NVDA", "NFLX"));
        assertEquals(4, r.quotes().size());
        assertTrue(r.errors().isEmpty());
        for (QuoteView q : r.quotes()) {
            assertEquals("USD", q.currency(), "native currency is preserved");
            assertEquals("200.00", q.price());
            assertEquals("Twelve Data", q.source());
            assertTrue(q.externalUrl().startsWith("https://www.nasdaq.com/market-activity/stocks/"));
            assertNotNull(q.gbp());
            assertTrue(q.gbp().indicative());
            assertEquals("150.00", q.gbp().price(), "200 USD × 0.75 = 150.00 GBP (indicative)");
            assertEquals("USD/GBP", q.gbp().pair());
            assertNotNull(q.gbp().rateTimestamp());
        }
        assertEquals("0.75", r.fx().rate());
        assertNull(r.fx().error());
    }

    @Test void apiKeyGoesInAuthorizationHeaderNeverInUrlOrResponses() throws Exception {
        respondQuotes(true);
        QuotesResponse r = service.quotes(List.of("AAPL"));
        assertFalse(provider.hits.isEmpty());
        for (MockServer.Hit h : provider.hits) {
            assertEquals("apikey " + KEY, h.authorization());
            assertFalse(h.uri().contains(KEY), "key must not be in the URL");
            assertFalse(h.uri().toLowerCase().contains("apikey"));
        }
        assertFalse(JSON.writeValueAsString(r).contains(KEY));
        assertFalse(JSON.writeValueAsString(service.status(0)).contains(KEY));
    }

    @Test void configToStringMasksKey() {
        MarketConfig cfg = new MarketConfig(KEY, provider.url(), 8, Duration.ofSeconds(1), Duration.ofSeconds(1), Duration.ofSeconds(1), Duration.ofSeconds(1), Duration.ofSeconds(1), false, Duration.ofSeconds(1), Duration.ofSeconds(1), 1, Duration.ofMillis(1));
        assertFalse(cfg.toString().contains(KEY));
    }

    @Test void refusesNonHttpsRemoteBaseUrl() {
        assertThrows(IllegalArgumentException.class, () -> new MarketConfig(KEY, "http://api.twelvedata.com", 8, Duration.ZERO, Duration.ZERO, Duration.ZERO, Duration.ZERO, Duration.ZERO, false, Duration.ZERO, Duration.ZERO, 1, Duration.ZERO));
    }

    @Test void freshnessLabelsAreHonest() {
        Instant now = clock.instant();
        Duration max = Duration.ofSeconds(120);
        Quote open = quote(true, now.minusSeconds(10)), closed = quote(false, now.minusSeconds(3 * 3600)), old = quote(true, now.minusSeconds(900));
        assertEquals(DataClass.LIVE, MarketDataService.classify(open, false, true, max, now));
        assertEquals(DataClass.DELAYED, MarketDataService.classify(open, false, false, max, now), "no entitlement confirmed → never LIVE");
        assertEquals(DataClass.DELAYED, MarketDataService.classify(old, false, true, max, now), "old quote while open → delayed");
        assertEquals(DataClass.END_OF_DAY, MarketDataService.classify(closed, false, true, max, now));
        assertEquals(DataClass.STALE, MarketDataService.classify(open, true, true, max, now), "fallback after provider failure → stale");
        assertEquals(DataClass.DELAYED, MarketDataService.classify(quote(true, now.plusSeconds(3600)), false, true, max, now), "future timestamps are not trusted");
    }
    static Quote quote(boolean open, Instant at) {
        return new Quote("AAPL", "Apple", "NASDAQ", "USD", new java.math.BigDecimal("1"), null, null, null, null, null, null, null, at, open);
    }

    @Test void marketClosedQuoteIsEndOfDayAndCachedLonger() {
        respondQuotes(false);
        QuoteView q = service.quotes(List.of("AAPL")).quotes().get(0);
        assertEquals(DataClass.END_OF_DAY, q.dataClass());
        assertFalse(q.marketOpen());
        int before = provider.hits.size();
        clock.advance(Duration.ofMinutes(5)); // within the 15-minute closed-market TTL
        service.quotes(List.of("AAPL"));
        assertEquals(before, provider.hits.size(), "closed market must not spend credits every minute");
    }

    @Test void liveRequiresConfirmedEntitlement() {
        respondQuotes(true);
        assertEquals(DataClass.LIVE, service.quotes(List.of("AAPL")).quotes().get(0).dataClass());
        provider.hits.clear();
        MarketDataService noEntitlement = build(false);
        assertEquals(DataClass.DELAYED, noEntitlement.quotes(List.of("AAPL")).quotes().get(0).dataClass());
    }

    @Test void cachesWithinTtlAndRefreshesAfter() {
        respondQuotes(true);
        service.quotes(List.of("AAPL"));
        long quoteCalls = provider.hits.stream().filter(h -> h.uri().startsWith("/quote")).count();
        service.quotes(List.of("AAPL"));
        assertEquals(quoteCalls, provider.hits.stream().filter(h -> h.uri().startsWith("/quote")).count());
        clock.advance(Duration.ofSeconds(61));
        service.quotes(List.of("AAPL"));
        assertEquals(quoteCalls + 1, provider.hits.stream().filter(h -> h.uri().startsWith("/quote")).count());
    }

    @Test void concurrentCallersShareOneProviderRequest() throws Exception {
        provider.handler = h -> h.uri().startsWith("/exchange_rate")
            ? new MockServer.Reply(200, "{\"rate\":0.75,\"timestamp\":" + now() + "}")
            : new MockServer.Reply(200, quoteJson("AAPL", "200.00", true, now() - 5, "USD"), 300);
        List<CompletableFuture<QuoteView>> calls = java.util.stream.IntStream.range(0, 12).mapToObj(i -> CompletableFuture.supplyAsync(() -> service.quote("AAPL"))).toList();
        for (var c : calls) assertEquals("200.00", c.get().price());
        assertEquals(1, provider.hits.stream().filter(h -> h.uri().startsWith("/quote")).count(), "request coalescing: one upstream call for 12 callers");
    }

    @Test void errorBodyWithHttp200IsRecognised() {
        provider.handler = h -> new MockServer.Reply(200, "{\"code\":401,\"message\":\"**apikey** parameter is incorrect or not specified.\",\"status\":\"error\"}");
        QuotesResponse r = service.quotes(List.of("AAPL"));
        assertTrue(r.quotes().isEmpty());
        assertEquals("PROVIDER_AUTH", r.errors().get(0).code());
        assertFalse(r.errors().get(0).message().contains("apikey"), "provider text is not forwarded");
    }

    @Test void rateLimitReturnsStructuredErrorNotCrash() {
        provider.handler = h -> new MockServer.Reply(429, "{\"code\":429,\"message\":\"You have run out of API credits for the current minute.\",\"status\":\"error\"}");
        QuotesResponse r = service.quotes(List.of("AAPL", "MSFT"));
        assertEquals(2, r.errors().size());
        assertTrue(r.errors().stream().allMatch(e -> e.code().equals("RATE_LIMITED") && e.retryAfterSeconds() != null && e.retryAfterSeconds() > 0));
        int hits = provider.hits.size();
        service.quotes(List.of("NVDA")); // limiter is penalised: no further upstream calls this minute
        assertEquals(hits, provider.hits.size());
        MarketException e = assertThrows(MarketException.class, () -> service.quote("AAPL"));
        assertEquals(429, e.httpStatus);
    }

    @Test void providerFailureServesLastGoodQuoteMarkedStale() {
        respondQuotes(true);
        assertFalse(service.quotes(List.of("AAPL")).quotes().get(0).stale());
        clock.advance(Duration.ofSeconds(90));
        provider.handler = h -> new MockServer.Reply(500, "boom");
        QuoteView q = service.quotes(List.of("AAPL")).quotes().get(0);
        assertTrue(q.stale());
        assertEquals(DataClass.STALE, q.dataClass(), "must never be presented as live");
        assertEquals("200.00", q.price(), "last real value, not an invented one");
    }

    @Test void transientFailuresAreRetriedWithBackoff() {
        java.util.concurrent.atomic.AtomicInteger n = new java.util.concurrent.atomic.AtomicInteger();
        provider.handler = h -> {
            if (h.uri().startsWith("/exchange_rate")) return new MockServer.Reply(200, "{\"rate\":0.75,\"timestamp\":" + now() + "}");
            return n.incrementAndGet() < 3 ? new MockServer.Reply(503, "{}") : new MockServer.Reply(200, quoteJson("AAPL", "200.00", true, now(), "USD"));
        };
        assertEquals("200.00", service.quote("AAPL").price());
        assertEquals(3, n.get());
    }

    @Test void timeoutBecomesUnavailableError() {
        provider.handler = h -> new MockServer.Reply(200, quoteJson("AAPL", "1", true, now(), "USD"), 3000);
        QuotesResponse r = service.quotes(List.of("AAPL"));
        assertEquals("PROVIDER_UNAVAILABLE", r.errors().get(0).code());
    }

    @Test void malformedQuoteIsRejectedNotDisplayed() {
        provider.handler = h -> new MockServer.Reply(200, "{\"symbol\":\"AAPL\",\"currency\":\"USD\",\"close\":\"not-a-number\"}");
        assertEquals("PROVIDER_MALFORMED", service.quotes(List.of("AAPL")).errors().get(0).code());
    }

    @Test void missingFxRateOmitsGbpEstimateInsteadOfInventingOne() {
        provider.handler = h -> h.uri().startsWith("/exchange_rate") ? new MockServer.Reply(200, "{\"code\":404,\"message\":\"x\",\"status\":\"error\"}")
            : new MockServer.Reply(200, quoteJson("AAPL", "200.00", true, now(), "USD"));
        QuotesResponse r = service.quotes(List.of("AAPL"));
        assertNull(r.quotes().get(0).gbp());
        assertNotNull(r.fx().error());
        assertEquals("USD", r.quotes().get(0).currency());
    }

    @Test void symbolsAreValidatedAgainstAllowListServerSide() {
        assertThrows(MarketException.class, () -> service.quote("TSLA"));
        assertThrows(MarketException.class, () -> service.history("../etc/passwd", "1M"));
        assertThrows(MarketException.class, () -> service.history("AAPL", "5Y"));
        assertTrue(provider.hits.isEmpty(), "nothing outside the watchlist reaches the provider");
    }

    @Test void historyIsOrderedWithValidTimestampsAndDropsBadRows() {
        provider.handler = h -> new MockServer.Reply(200, """
            {"meta":{"symbol":"AAPL","interval":"1day","currency":"USD","exchange_timezone":"America/New_York","exchange":"NASDAQ","mic_code":"XNGS","type":"Common Stock"},
             "values":[{"datetime":"2025-06-10","open":"1","high":"3","low":"1","close":"3","volume":"10"},
                       {"datetime":"2025-06-09","open":"1","high":"2","low":"1","close":"2","volume":"10"},
                       {"datetime":"garbage","close":"9"},
                       {"datetime":"2025-06-06","close":"nope"},
                       {"datetime":"2025-06-05","open":"1","high":"2","low":"1","close":"1","volume":"10"}],"status":"ok"}""");
        History hst = service.history("AAPL", "1M");
        assertEquals(3, hst.points().size());
        assertEquals(List.of(1.0, 2.0, 3.0), hst.points().stream().map(HistoryPoint::close).toList(), "oldest → newest");
        assertTrue(hst.points().get(0).t() < hst.points().get(2).t());
        assertEquals("USD", hst.currency());
        assertEquals("America/New_York", hst.timezone());
        assertTrue(provider.hits.get(0).uri().contains("interval=1day"));
        assertTrue(provider.hits.get(0).uri().contains("outputsize=22"));
    }

    @Test void intradayTimestampsUseExchangeTimezone() {
        provider.handler = h -> new MockServer.Reply(200, """
            {"meta":{"symbol":"AAPL","interval":"5min","currency":"USD","exchange_timezone":"America/New_York"},
             "values":[{"datetime":"2025-06-10 09:30:00","close":"1"}],"status":"ok"}""");
        long t = service.history("AAPL", "1D").points().get(0).t();
        assertEquals(Instant.parse("2025-06-10T13:30:00Z").toEpochMilli(), t, "09:30 New York (EDT) = 13:30 UTC");
    }

    @Test void notConfiguredIsReportedWithoutCallingProvider() {
        MarketConfig cfg = new MarketConfig("", provider.url(), 8, Duration.ofSeconds(1), Duration.ofSeconds(1), Duration.ofSeconds(1), Duration.ofSeconds(1), Duration.ofSeconds(1), false, Duration.ofSeconds(1), Duration.ofSeconds(1), 1, Duration.ofMillis(1));
        MarketDataService s = new MarketDataService(cfg, new TwelveDataClient(cfg, TwelveDataClient.newHttpClient(cfg), JSON, new CreditLimiter(8, clock), clock), new CreditLimiter(8, clock), clock);
        assertEquals("NOT_CONFIGURED", s.quotes(List.of("AAPL")).errors().get(0).code());
        assertFalse(s.status(0).configured());
        assertTrue(provider.hits.isEmpty());
    }

    @Test void limiterEnforcesCreditBudgetPerMinute() {
        CreditLimiter l = new CreditLimiter(8, clock);
        for (int i = 0; i < 8; i++) assertTrue(l.tryAcquire(1));
        assertFalse(l.tryAcquire(1));
        assertEquals(0, l.remaining());
        clock.advance(Duration.ofSeconds(61));
        assertTrue(l.tryAcquire(1));
    }
}

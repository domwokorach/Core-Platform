package com.finix.banking.market;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Twelve Data REST client (https://twelvedata.com/docs). The API key is sent in the `Authorization: apikey …` header
 * (documented as the recommended form), never in the URL, so it cannot leak into logs or referrers.
 *
 * <p>Errors are detected from BOTH the HTTP status and the documented `{code, message, status:"error"}` body, because the
 * docs do not state which HTTP status accompanies an error body. Every call spends credits from {@link CreditLimiter}
 * first; transient failures (I/O, timeouts, 5xx) are retried with exponential backoff, provider 4xx/429 never are.
 */
public class TwelveDataClient {
    private final MarketConfig config;
    private final HttpClient http;
    private final ObjectMapper json;
    private final CreditLimiter limiter;
    private final Clock clock;

    public TwelveDataClient(MarketConfig config, HttpClient http, ObjectMapper json, CreditLimiter limiter, Clock clock) {
        this.config = config; this.http = http; this.json = json; this.limiter = limiter; this.clock = clock;
    }

    public static HttpClient newHttpClient(MarketConfig config) {
        return HttpClient.newBuilder().connectTimeout(config.timeout()).followRedirects(HttpClient.Redirect.NEVER).build();
    }

    JsonNode get(String path, Map<String, String> params) {
        if (!config.configured()) throw new MarketException("NOT_CONFIGURED", 503, "Market data is not configured. Set TWELVE_DATA_API_KEY on the backend.");
        String query = params.entrySet().stream()
            .map(e -> URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8) + "=" + URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8))
            .collect(Collectors.joining("&"));
        URI uri = URI.create(config.baseUrl() + path + "?" + query);
        MarketException last = null;
        for (int attempt = 0; attempt < config.maxAttempts(); attempt++) {
            if (!limiter.tryAcquire(1))
                throw new MarketException("RATE_LIMITED", 429, "Market data rate limit reached. Showing the latest saved data until it resets.", limiter.retryAfterSeconds());
            try {
                HttpRequest request = HttpRequest.newBuilder(uri).timeout(config.timeout()).GET()
                    .header("Authorization", "apikey " + config.apiKey()).header("Accept", "application/json").build();
                HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() >= 500) { last = MarketException.fromProvider(503, null); }
                else return parseOrThrow(response);
            } catch (IOException e) {
                last = MarketException.fromProvider(503, null);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw MarketException.fromProvider(503, null);
            }
            sleepBackoff(attempt);
        }
        throw last != null ? last : MarketException.fromProvider(503, null);
    }

    private JsonNode parseOrThrow(HttpResponse<String> response) {
        JsonNode body;
        try { body = json.readTree(response.body()); } catch (IOException e) { body = null; }
        boolean errorBody = body != null && "error".equalsIgnoreCase(body.path("status").asText(""));
        if (response.statusCode() >= 400 || errorBody) {
            int code = body != null && body.has("code") ? body.path("code").asInt(response.statusCode()) : response.statusCode();
            if (code == 429) limiter.penalize();
            throw MarketException.fromProvider(code, code == 429 ? limiter.retryAfterSeconds() : null);
        }
        if (body == null || !body.isObject()) throw MarketException.fromProvider(503, null);
        return body;
    }

    private void sleepBackoff(int attempt) {
        try { Thread.sleep(config.backoff().toMillis() * (1L << attempt)); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    // ---- endpoints ----

    /** GET /quote for one symbol (one credit). Multi-symbol responses are undocumented, so FINIX never batches. */
    public MarketModels.Quote quote(String symbol) {
        JsonNode n = get("/quote", Map.of("symbol", symbol));
        String returned = n.path("symbol").asText("");
        BigDecimal close = decimal(n, "close");
        if (!symbol.equalsIgnoreCase(returned) || close == null || n.path("currency").asText("").isBlank())
            throw new MarketException("PROVIDER_MALFORMED", 502, "The provider returned an unexpected quote.");
        long lastQuote = n.path("last_quote_at").asLong(0), ts = n.path("timestamp").asLong(0);
        long epoch = lastQuote > 0 ? lastQuote : ts;
        return new MarketModels.Quote(returned, n.path("name").asText(symbol), n.path("exchange").asText(""), n.path("currency").asText(),
            close, decimal(n, "previous_close"), decimal(n, "change"), decimal(n, "percent_change"), decimal(n, "open"),
            decimal(n, "high"), decimal(n, "low"), n.hasNonNull("volume") ? n.path("volume").asLong() : null,
            epoch > 0 ? Instant.ofEpochSecond(epoch) : null, n.path("is_market_open").asBoolean(false));
    }

    /** GET /exchange_rate for `FROM/TO` (one credit). */
    public MarketModels.FxRate exchangeRate(String pair) {
        JsonNode n = get("/exchange_rate", Map.of("symbol", pair));
        BigDecimal rate = n.has("rate") ? decimal(n, "rate") : null;
        if (rate == null || rate.signum() <= 0 || n.path("timestamp").asLong(0) <= 0)
            throw new MarketException("PROVIDER_MALFORMED", 502, "The provider returned an unexpected exchange rate.");
        // The docs' example shows a different pair in `symbol` than requested, so the requested pair is authoritative.
        return new MarketModels.FxRate(pair, rate, Instant.ofEpochSecond(n.path("timestamp").asLong()), clock.instant(), "Twelve Data");
    }

    /** GET /time_series, returned oldest → newest. */
    public MarketModels.History timeSeries(String symbol, String range, String interval, int outputSize) {
        Map<String, String> p = new LinkedHashMap<>();
        p.put("symbol", symbol); p.put("interval", interval); p.put("outputsize", String.valueOf(outputSize));
        JsonNode n = get("/time_series", p);
        JsonNode meta = n.path("meta"), values = n.path("values");
        if (!values.isArray()) throw new MarketException("PROVIDER_MALFORMED", 502, "The provider returned unexpected history.");
        String tzName = meta.path("exchange_timezone").asText("America/New_York");
        ZoneId zone;
        try { zone = ZoneId.of(tzName); } catch (RuntimeException e) { zone = ZoneId.of("America/New_York"); }
        List<MarketModels.HistoryPoint> points = new ArrayList<>();
        for (JsonNode v : values) {
            BigDecimal close = decimal(v, "close");
            Instant t = parseInstant(v.path("datetime").asText(""), zone);
            if (close == null || t == null) continue; // drop malformed rows rather than invent values
            points.add(new MarketModels.HistoryPoint(t.toEpochMilli(), v.path("datetime").asText(),
                orClose(v, "open", close), orClose(v, "high", close), orClose(v, "low", close), close.doubleValue(),
                v.hasNonNull("volume") ? parseLong(v.path("volume").asText()) : null));
        }
        points.sort(Comparator.comparingLong(MarketModels.HistoryPoint::t));
        return new MarketModels.History(symbol, range, interval, meta.path("currency").asText(""), tzName, List.copyOf(points), clock.instant(), false);
    }

    private static double orClose(JsonNode v, String f, BigDecimal close) { BigDecimal d = decimal(v, f); return (d == null ? close : d).doubleValue(); }
    private static Long parseLong(String s) { try { return Long.parseLong(s.trim()); } catch (NumberFormatException e) { return null; } }
    private static BigDecimal decimal(JsonNode n, String f) {
        if (!n.hasNonNull(f)) return null;
        try { return new BigDecimal(n.path(f).asText().trim()); } catch (NumberFormatException e) { return null; }
    }
    static Instant parseInstant(String s, ZoneId zone) {
        try {
            if (s.length() == 10) return LocalDate.parse(s).atStartOfDay(zone).toInstant();
            return LocalDateTime.parse(s.replace(' ', 'T')).atZone(zone).toInstant();
        } catch (RuntimeException e) { return null; }
    }
}

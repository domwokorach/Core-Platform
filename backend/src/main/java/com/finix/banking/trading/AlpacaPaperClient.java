package com.finix.banking.trading;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finix.banking.market.MarketException;
import com.finix.banking.trading.PaperModels.*;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Alpaca Trading API v2 (paper). Auth headers per the docs: APCA-API-KEY-ID / APCA-API-SECRET-KEY. Only market/day orders for
 * whole shares are ever submitted. Alpaca documents the 403 (insufficient buying power / shares) and 422 (unrecognised input)
 * errors but not a general error-body schema, so `message` is read defensively and otherwise a generic text is used.
 */
public class AlpacaPaperClient {
    private final PaperConfig config;
    private final HttpClient http;
    private final ObjectMapper json;

    public AlpacaPaperClient(PaperConfig config, HttpClient http, ObjectMapper json) { this.config = config; this.http = http; this.json = json; }

    public static HttpClient newHttpClient(PaperConfig c) { return HttpClient.newBuilder().connectTimeout(c.timeout()).followRedirects(HttpClient.Redirect.NEVER).build(); }

    private JsonNode call(String method, String path, String body) {
        if (!config.enabled()) throw new MarketException("PAPER_NOT_CONFIGURED", 503, "Paper trading is not configured. Set ALPACA_API_KEY_ID and ALPACA_API_SECRET_KEY on the backend.");
        try {
            HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(config.baseUrl() + path)).timeout(config.timeout())
                .header("APCA-API-KEY-ID", config.keyId()).header("APCA-API-SECRET-KEY", config.secretKey()).header("Accept", "application/json");
            if (body != null) b.header("Content-Type", "application/json").method(method, HttpRequest.BodyPublishers.ofString(body)); else b.method(method, HttpRequest.BodyPublishers.noBody());
            HttpResponse<String> r = http.send(b.build(), HttpResponse.BodyHandlers.ofString());
            JsonNode node = r.body() == null || r.body().isBlank() ? json.createObjectNode() : json.readTree(r.body());
            if (r.statusCode() >= 400) throw mapError(r.statusCode(), node);
            return node;
        } catch (IOException e) {
            throw new MarketException("PAPER_UNAVAILABLE", 503, "The paper trading service is currently unavailable.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new MarketException("PAPER_UNAVAILABLE", 503, "The paper trading service is currently unavailable.");
        }
    }

    private static MarketException mapError(int status, JsonNode body) {
        String provider = body.path("message").asText("");
        return switch (status) {
            case 401 -> new MarketException("PAPER_AUTH", 502, "The paper trading credentials were rejected.");
            case 403 -> new MarketException("ORDER_REJECTED", 422, provider.isBlank() ? "Order rejected: insufficient buying power or shares." : "Order rejected: " + provider);
            case 422 -> new MarketException(provider.toLowerCase().contains("client_order_id") ? "DUPLICATE_ORDER" : "ORDER_INVALID",
                provider.toLowerCase().contains("client_order_id") ? 409 : 422, provider.toLowerCase().contains("client_order_id") ? "This order was already submitted." : "The order was not accepted.");
            case 429 -> new MarketException("RATE_LIMITED", 429, "Paper trading rate limit reached. Try again shortly.", 30);
            default -> new MarketException("PAPER_UNAVAILABLE", 503, "The paper trading service is currently unavailable.");
        };
    }

    public Account account() {
        JsonNode n = call("GET", "/v2/account", null);
        return new Account(n.path("status").asText(), n.path("cash").asText(), n.path("equity").asText(), n.path("buying_power").asText(),
            n.path("currency").asText("USD"), n.path("trading_blocked").asBoolean(false));
    }

    public List<Position> positions() {
        List<Position> out = new ArrayList<>();
        for (JsonNode n : call("GET", "/v2/positions", null))
            out.add(new Position(n.path("symbol").asText(), n.path("qty").asText(), n.path("side").asText(), n.path("avg_entry_price").asText(),
                n.path("market_value").asText(), n.path("current_price").asText(), n.path("unrealized_pl").asText(), n.path("unrealized_plpc").asText()));
        return out;
    }

    public List<Order> orders(int limit) {
        List<Order> out = new ArrayList<>();
        for (JsonNode n : call("GET", "/v2/orders?status=all&direction=desc&limit=" + Math.min(Math.max(limit, 1), 50), null)) out.add(order(n));
        return out;
    }

    /** Always type=market, time_in_force=day, whole shares. */
    public Order submit(String symbol, String side, int qty, String clientOrderId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("symbol", symbol); body.put("qty", String.valueOf(qty)); body.put("side", side);
        body.put("type", "market"); body.put("time_in_force", "day"); body.put("client_order_id", clientOrderId);
        try { return order(call("POST", "/v2/orders", json.writeValueAsString(body))); }
        catch (com.fasterxml.jackson.core.JsonProcessingException e) { throw new IllegalStateException(e); }
    }

    private static Order order(JsonNode n) {
        return new Order(n.path("id").asText(), n.path("client_order_id").asText(), n.path("symbol").asText(), n.path("side").asText(), n.path("type").asText(),
            n.path("qty").asText(null), n.path("filled_qty").asText("0"), n.path("filled_avg_price").isNull() ? null : n.path("filled_avg_price").asText(null),
            n.path("status").asText(), n.path("submitted_at").asText(null));
    }
}

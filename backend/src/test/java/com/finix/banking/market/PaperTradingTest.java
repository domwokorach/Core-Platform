package com.finix.banking.market;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finix.banking.trading.*;
import com.finix.banking.trading.PaperModels.*;
import java.time.Duration;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PaperTradingTest {
    MockServer alpaca; PaperTradingController controller; PaperConfig cfg;

    @BeforeEach void setUp() throws Exception {
        alpaca = new MockServer();
        cfg = new PaperConfig("PK_TEST", "SECRET_TEST", alpaca.url(), Duration.ofSeconds(2));
        controller = new PaperTradingController(new AlpacaPaperClient(cfg, AlpacaPaperClient.newHttpClient(cfg), new ObjectMapper()), cfg);
    }
    @AfterEach void tearDown() { alpaca.close(); }

    @Test void liveBrokerageEndpointIsRefusedByConstruction() {
        assertThrows(IllegalArgumentException.class, () -> new PaperConfig("k", "s", "https://api.alpaca.markets", Duration.ofSeconds(1)));
        assertThrows(IllegalArgumentException.class, () -> new PaperConfig("k", "s", "https://evil.example.com", Duration.ofSeconds(1)));
        assertThrows(IllegalArgumentException.class, () -> new PaperConfig("k", "s", "http://paper-api.alpaca.markets", Duration.ofSeconds(1)), "paper must be https");
        assertDoesNotThrow(() -> new PaperConfig("k", "s", PaperConfig.PAPER_BASE_URL, Duration.ofSeconds(1)));
        assertEquals("https://paper-api.alpaca.markets", PaperConfig.PAPER_BASE_URL);
    }

    @Test void submitsOnlyMarketDayWholeShareOrdersWithPaperHeaders() {
        alpaca.handler = h -> new MockServer.Reply(200, "{\"id\":\"o1\",\"client_order_id\":\"finix-paper-abcdefgh\",\"symbol\":\"AAPL\",\"side\":\"buy\",\"type\":\"market\",\"qty\":\"2\",\"filled_qty\":\"0\",\"filled_avg_price\":null,\"status\":\"accepted\",\"submitted_at\":\"2025-06-10T15:00:00Z\"}");
        var env = controller.submit("abcdefgh", new OrderRequest("aapl", "buy", 2));
        assertEquals("PAPER", env.mode());
        assertEquals("accepted", env.data().status());
        MockServer.Hit hit = alpaca.hits.get(0);
        assertEquals("POST", hit.method());
        assertEquals("/v2/orders", hit.uri());
        assertEquals("PK_TEST", hit.alpacaKey());
        assertEquals("SECRET_TEST", hit.alpacaSecret());
        assertTrue(hit.body().contains("\"type\":\"market\"") && hit.body().contains("\"time_in_force\":\"day\"") && hit.body().contains("\"qty\":\"2\""));
        assertTrue(hit.body().contains("finix-paper-abcdefgh"));
    }

    @Test void rejectsInvalidOrdersBeforeAnyNetworkCall() {
        assertThrows(MarketException.class, () -> controller.submit("abcdefgh", new OrderRequest("TSLA", "buy", 1)));
        assertThrows(MarketException.class, () -> controller.submit("abcdefgh", new OrderRequest("AAPL", "short", 1)));
        assertThrows(MarketException.class, () -> controller.submit("abcdefgh", new OrderRequest("AAPL", "buy", 0)));
        assertThrows(MarketException.class, () -> controller.submit("abcdefgh", new OrderRequest("AAPL", "buy", 101)));
        assertThrows(MarketException.class, () -> controller.submit("x", new OrderRequest("AAPL", "buy", 1)));
        assertTrue(alpaca.hits.isEmpty());
    }

    @Test void insufficientBuyingPowerIsMappedNotCrashing() {
        alpaca.handler = h -> new MockServer.Reply(403, "{\"code\":40310000,\"message\":\"insufficient buying power\"}");
        MarketException e = assertThrows(MarketException.class, () -> controller.submit("abcdefgh", new OrderRequest("AAPL", "buy", 100)));
        assertEquals("ORDER_REJECTED", e.code);
    }

    @Test void readsAccountPositionsAndOrders() {
        alpaca.handler = h -> switch (h.uri().split("\\?")[0]) {
            case "/v2/account" -> new MockServer.Reply(200, "{\"status\":\"ACTIVE\",\"cash\":\"100000\",\"equity\":\"100500.5\",\"buying_power\":\"200000\",\"currency\":\"USD\",\"trading_blocked\":false}");
            case "/v2/positions" -> new MockServer.Reply(200, "[{\"symbol\":\"AAPL\",\"qty\":\"2\",\"side\":\"long\",\"avg_entry_price\":\"190\",\"market_value\":\"400\",\"current_price\":\"200\",\"unrealized_pl\":\"20\",\"unrealized_plpc\":\"0.0526\"}]");
            default -> new MockServer.Reply(200, "[{\"id\":\"o1\",\"client_order_id\":\"c\",\"symbol\":\"AAPL\",\"side\":\"buy\",\"type\":\"market\",\"qty\":\"2\",\"filled_qty\":\"2\",\"filled_avg_price\":\"190.1\",\"status\":\"filled\",\"submitted_at\":\"t\"}]");
        };
        assertEquals("USD", controller.account().data().currency());
        assertEquals("long", controller.positions().data().get(0).side());
        assertEquals("filled", controller.orders().data().get(0).status());
        assertTrue(alpaca.hits.stream().allMatch(h -> h.uri().startsWith("/v2/")));
    }

    @Test void disabledWithoutCredentials() {
        PaperConfig off = new PaperConfig("", "", alpaca.url(), Duration.ofSeconds(1));
        var c = new PaperTradingController(new AlpacaPaperClient(off, AlpacaPaperClient.newHttpClient(off), new ObjectMapper()), off);
        assertFalse(c.status().enabled());
        assertEquals("PAPER_NOT_CONFIGURED", assertThrows(MarketException.class, c::account).code);
        assertTrue(alpaca.hits.isEmpty());
        assertFalse(off.toString().contains("SECRET"));
    }
}

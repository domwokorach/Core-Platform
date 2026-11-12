package com.finix.banking.trading;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finix.banking.market.Instruments;
import com.finix.banking.market.MarketException;
import com.finix.banking.trading.PaperModels.*;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * Development-only paper trading. Strictly separated from banking: no ledger access, no customer funds, watchlist symbols
 * only, market orders for 1–100 whole shares. The paper account is one shared development sandbox, not per customer.
 */
@RestController
@RequestMapping("/api/paper")
public class PaperTradingController {
    private final AlpacaPaperClient client;
    private final PaperConfig config;
    public PaperTradingController(AlpacaPaperClient client, PaperConfig config) { this.client = client; this.config = config; }

    @GetMapping("/status")
    public Status status() { return new Status(config.enabled(), "PAPER", "Alpaca"); }

    @GetMapping("/account") public Envelope<Account> account() { return Envelope.of(client.account()); }
    @GetMapping("/positions") public Envelope<java.util.List<Position>> positions() { return Envelope.of(client.positions()); }
    @GetMapping("/orders") public Envelope<java.util.List<Order>> orders() { return Envelope.of(client.orders(25)); }

    @PostMapping("/orders")
    @ResponseStatus(HttpStatus.CREATED)
    public Envelope<Order> submit(@RequestHeader("Idempotency-Key") String key, @RequestBody OrderRequest req) {
        if (key == null || !key.matches("^[a-zA-Z0-9_-]{8,100}$")) throw new MarketException("BAD_IDEMPOTENCY_KEY", 400, "Idempotency-Key must be 8–100 letters, digits, '-' or '_'.");
        String symbol = Instruments.require(req.symbol()).symbol();
        if (!"buy".equals(req.side()) && !"sell".equals(req.side())) throw new MarketException("BAD_SIDE", 400, "Side must be buy or sell.");
        if (req.qty() == null || req.qty() < 1 || req.qty() > 100) throw new MarketException("BAD_QTY", 400, "Quantity must be a whole number between 1 and 100.");
        return Envelope.of(client.submit(symbol, req.side(), req.qty(), "finix-paper-" + key));
    }

    @Configuration
    static class Beans {
        @Bean PaperConfig paperConfig(@Value("${app.paper.key-id:}") String id, @Value("${app.paper.secret-key:}") String secret,
                                      @Value("${app.paper.base-url:" + PaperConfig.PAPER_BASE_URL + "}") String base) {
            return new PaperConfig(id.trim(), secret.trim(), base, Duration.ofSeconds(8));
        }
        @Bean AlpacaPaperClient alpacaPaperClient(PaperConfig c, ObjectMapper om) { return new AlpacaPaperClient(c, AlpacaPaperClient.newHttpClient(c), om); }
    }
}

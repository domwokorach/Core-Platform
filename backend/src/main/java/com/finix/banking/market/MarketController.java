package com.finix.banking.market;

import com.finix.banking.market.MarketModels.*;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** Authenticated market-data API. The provider key never leaves the server; clients only ever talk to these endpoints. */
@RestController
@RequestMapping("/api/market")
public class MarketController {
    private final MarketDataService service;
    private final MarketEventBroker broker;
    public MarketController(MarketDataService service, MarketEventBroker broker) { this.service = service; this.broker = broker; }

    @GetMapping("/quotes")
    public ResponseEntity<QuotesResponse> quotes(@RequestParam(defaultValue = "AAPL,MSFT,NVDA,NFLX") String symbols) {
        List<String> list = new LinkedHashSet<>(Arrays.stream(symbols.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList()).stream().toList();
        if (list.isEmpty() || list.size() > 10) throw new MarketException("BAD_SYMBOLS", 400, "Provide between 1 and 10 symbols.");
        list.forEach(Instruments::require); // server-side allow-list; nothing else reaches the provider
        return noStore(service.quotes(list.stream().map(String::toUpperCase).toList()));
    }

    @GetMapping("/quotes/{symbol}")
    public ResponseEntity<QuoteView> quote(@PathVariable String symbol) { return noStore(service.quote(symbol)); }

    @GetMapping("/history/{symbol}")
    public ResponseEntity<History> history(@PathVariable String symbol, @RequestParam(defaultValue = "1M") String range) {
        return noStore(service.history(symbol, range));
    }

    @GetMapping("/status")
    public ResponseEntity<MarketStatus> status() { return noStore(service.status(broker.subscribers())); }

    @GetMapping(path = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter events(@AuthenticationPrincipal Jwt jwt, jakarta.servlet.http.HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-cache, no-transform");
        response.setHeader("X-Accel-Buffering", "no");
        return broker.subscribe(jwt.getSubject(), jwt.getExpiresAt());
    }

    private static <T> ResponseEntity<T> noStore(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
}

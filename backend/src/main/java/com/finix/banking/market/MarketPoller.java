package com.finix.banking.market;

import java.util.Objects;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Controlled polling (REST only: Twelve Data WebSocket needs a paid plan and is not used). Runs ONLY while at least one
 * client is subscribed, honours the service cache TTLs (so a closed market costs almost no credits) and the credit limiter.
 */
@Component
public class MarketPoller {
    private final MarketDataService service;
    private final MarketEventBroker broker;
    private String last = "";

    public MarketPoller(MarketDataService service, MarketEventBroker broker) { this.service = service; this.broker = broker; }

    @Scheduled(fixedDelayString = "#{${app.market.poll-seconds:30} * 1000}")
    void poll() {
        if (broker.subscribers() == 0) return;
        String fp = service.refreshFingerprint();
        if (!Objects.equals(fp, last)) { last = fp; broker.publishUpdated(); }
    }

    @Scheduled(fixedDelay = 20_000)
    void heartbeat() { broker.heartbeat(); }
}

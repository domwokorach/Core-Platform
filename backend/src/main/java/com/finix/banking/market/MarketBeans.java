package com.finix.banking.market;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MarketBeans {
    @Bean Clock marketClock() { return Clock.systemUTC(); }

    @Bean MarketConfig marketConfig(@Value("${app.market.api-key:}") String apiKey,
                                    @Value("${app.market.base-url:https://api.twelvedata.com}") String baseUrl,
                                    @Value("${app.market.credits-per-minute:8}") int credits,
                                    @Value("${app.market.quote-ttl-seconds:60}") int quoteTtl,
                                    @Value("${app.market.closed-ttl-seconds:900}") int closedTtl,
                                    @Value("${app.market.history-ttl-seconds:900}") int historyTtl,
                                    @Value("${app.market.intraday-history-ttl-seconds:120}") int intradayTtl,
                                    @Value("${app.market.fx-ttl-seconds:600}") int fxTtl,
                                    @Value("${app.market.realtime-entitled:false}") boolean realtime,
                                    @Value("${app.market.live-max-age-seconds:120}") int liveMaxAge,
                                    @Value("${app.market.timeout-seconds:5}") int timeout,
                                    @Value("${app.market.max-attempts:3}") int attempts,
                                    @Value("${app.market.backoff-millis:250}") int backoff) {
        return new MarketConfig(apiKey == null ? "" : apiKey.trim(), baseUrl, credits, Duration.ofSeconds(quoteTtl), Duration.ofSeconds(closedTtl),
            Duration.ofSeconds(historyTtl), Duration.ofSeconds(intradayTtl), Duration.ofSeconds(fxTtl), realtime, Duration.ofSeconds(liveMaxAge),
            Duration.ofSeconds(timeout), attempts, Duration.ofMillis(backoff));
    }

    @Bean CreditLimiter creditLimiter(MarketConfig config, Clock clock) { return new CreditLimiter(config.creditsPerMinute(), clock); }

    @Bean MarketDataService marketDataService(MarketConfig config, CreditLimiter limiter, Clock clock, ObjectMapper json) {
        return new MarketDataService(config, new TwelveDataClient(config, TwelveDataClient.newHttpClient(config), json, limiter, clock), limiter, clock);
    }
}

package com.finix.banking;

import static com.finix.banking.CardTestSupport.*;
import static org.junit.jupiter.api.Assertions.*;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** Step-up authentication for the sensitive direction of card changes (unfreezing, loosening limits). */
@ActiveProfiles("dev")
@Import(CardTestSupport.TestJwt.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "app.cards.step-up-max-age-seconds=300")
class CardStepUpTest {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry props) { TestDatabase.register(props); }

    @LocalServerPort int port;
    @Autowired JdbcClient db;

    @Test
    void unfreezingAndLooseningLimitsNeedARecentAuthentication() {
        var api = new CardTestSupport(port, db);
        var c = api.newCustomer();
        String fresh = token(c.subject(), Instant.now().minusSeconds(30));
        String stale = token(c.subject(), Instant.now().minus(Duration.ofHours(2)));
        String missing = token(c.subject());
        String id = api.issued(fresh, c.accountId()); String base = "/api/cards/" + id;
        api.call("POST", base + "/activate", stale, null, null); // not sensitive
        assertEquals(200, api.call("POST", base + "/freeze", stale, null, null).statusCode(), "freezing is always allowed");
        assertEquals(200, api.call("PATCH", base + "/limits", stale, null, "{\"dailyLimitMinor\":30000}").statusCode(), "tightening is allowed");

        for (String t : new String[] {stale, missing}) {
            var unfreeze = api.call("POST", base + "/unfreeze", t, null, null);
            assertEquals(403, unfreeze.statusCode());
            assertEquals("STEP_UP_REQUIRED", field(unfreeze.body(), "code"));
            assertEquals(403, api.call("PATCH", base + "/limits", t, null, "{\"dailyLimitMinor\":40000}").statusCode());
        }
        assertEquals("FROZEN", field(api.call("GET", base, fresh, null, null).body(), "status"));
        assertEquals(200, api.call("PATCH", base + "/limits", fresh, null, "{\"dailyLimitMinor\":40000}").statusCode());
        assertEquals("ACTIVE", field(api.call("POST", base + "/unfreeze", fresh, null, null).body(), "status"));
    }
}

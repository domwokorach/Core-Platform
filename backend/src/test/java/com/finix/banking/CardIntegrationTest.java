package com.finix.banking;

import static com.finix.banking.CardTestSupport.*;
import static org.junit.jupiter.api.Assertions.*;

import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** Sandbox cards end to end over HTTP against real PostgreSQL. */
@ActiveProfiles("dev")
@Import(CardTestSupport.TestJwt.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "app.events.heartbeat-seconds=1", "app.cards.rate-limit.commands-per-minute=40", "app.cards.rate-limit.issuances-per-minute=5"})
class CardIntegrationTest {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry props) { TestDatabase.register(props); }

    @LocalServerPort int port;
    @Autowired JdbcClient db;
    private CardTestSupport api;
    private final List<EventStreamIntegrationTest.Stream> streams = new ArrayList<>();

    @BeforeEach void setUp() { api = new CardTestSupport(port, db); }
    @AfterEach void closeStreams() { streams.forEach(EventStreamIntegrationTest.Stream::close); streams.clear(); }

    @Test
    void issuesSandboxCardWithSafeDefaultsAndIsIdempotent() {
        var c = api.newCustomer(); String t = token(c.subject());
        long ledgerBefore = ledgerEntries();
        String key = UUID.randomUUID().toString();
        var created = api.issue(t, c.accountId(), "everyday", key);
        assertEquals(201, created.statusCode(), created.body());
        String body = created.body();
        assertEquals("PENDING_ACTIVATION", field(body, "status"));
        assertEquals("EVERYDAY", field(body, "cardType"));
        assertEquals("50000", field(body, "dailyLimitMinor"));
        assertEquals("300000", field(body, "monthlyLimitMinor"));
        assertEquals("25000", field(body, "singleTransactionLimitMinor"));
        assertTrue(field(body, "maskedReference").matches("FVC •••• [A-Z2-9]{4}"), body);
        assertFalse(body.toLowerCase().contains("balance"), "cards never expose balances: " + body);
        assertFalse(body.matches("(?s).*\\d{13,19}.*"), "no PAN-like digit run: " + body);

        var replay = api.issue(t, c.accountId(), "EVERYDAY", key);
        assertEquals(201, replay.statusCode());
        assertEquals(field(body, "id"), field(replay.body(), "id"));
        assertEquals(1L, count("SELECT COUNT(*) FROM cards WHERE customer_id = CAST(:c AS uuid)", c.subject()));
        assertEquals(409, api.issue(t, c.accountId(), "SAVINGS", key).statusCode(), "same key, other details");
        assertEquals(400, api.call("POST", "/api/cards", t, null, "{\"accountId\":\"%s\",\"cardType\":\"EVERYDAY\"}".formatted(c.accountId())).statusCode());
        assertEquals(400, api.issue(t, c.accountId(), "PLATINUM", UUID.randomUUID().toString()).statusCode());
        assertEquals(ledgerBefore, ledgerEntries(), "issuing a card must not touch the ledger");
    }

    @Test
    void cannotIssueAgainstIneligibleAccountsOrExceedTheCardCap() {
        var mine = api.newCustomer(); var other = api.newCustomer();
        String t = token(mine.subject());
        assertEquals(404, api.issue(t, other.accountId(), "EVERYDAY", UUID.randomUUID().toString()).statusCode());
        db.sql("UPDATE accounts SET status = 'FROZEN' WHERE id = :a").param("a", mine.accountId()).update();
        assertEquals(409, api.issue(t, mine.accountId(), "EVERYDAY", UUID.randomUUID().toString()).statusCode());
        db.sql("UPDATE accounts SET status = 'ACTIVE' WHERE id = :a").param("a", mine.accountId()).update();
        for (int i = 0; i < 4; i++) db.sql("INSERT INTO cards(id, customer_id, card_type, status, masked_reference) VALUES (gen_random_uuid(), CAST(:c AS uuid), 'EVERYDAY', 'PENDING_ACTIVATION', 'FVC •••• AAAA')").param("c", mine.subject()).update();
        assertEquals(201, api.issue(t, mine.accountId(), "EVERYDAY", UUID.randomUUID().toString()).statusCode());
        var capped = api.issue(t, mine.accountId(), "EVERYDAY", UUID.randomUUID().toString());
        assertEquals(409, capped.statusCode());
        assertEquals("CARD_LIMIT_REACHED", field(capped.body(), "code"));
    }

    @Test
    void issuanceIsRateLimited() {
        var c = api.newCustomer(); String t = token(c.subject());
        for (int i = 0; i < 5; i++) assertEquals(201, api.issue(t, c.accountId(), "EVERYDAY", UUID.randomUUID().toString()).statusCode());
        var sixth = api.issue(t, c.accountId(), "EVERYDAY", UUID.randomUUID().toString());
        assertEquals(429, sixth.statusCode(), sixth.body());
        assertNotNull(sixth.headers().firstValue("Retry-After").orElse(null));
    }

    @Test
    void lifecycleActivateFreezeUnfreezeWithStateMachineAndAudit() {
        var c = api.newCustomer(); String t = token(c.subject());
        String id = api.issued(t, c.accountId()); String base = "/api/cards/" + id;

        assertEquals(409, api.call("POST", base + "/freeze", t, null, null).statusCode(), "a pending card cannot be frozen");
        assertEquals(409, api.call("POST", base + "/unfreeze", t, null, null).statusCode());
        var activated = api.call("POST", base + "/activate", t, null, null);
        assertEquals("ACTIVE", field(activated.body(), "status"));
        assertNotEquals("null", field(activated.body(), "activatedAt"));
        assertEquals("ACTIVE", field(api.call("POST", base + "/activate", t, null, null).body(), "status"), "activate is idempotent");

        assertEquals("FROZEN", field(api.call("POST", base + "/freeze", t, null, null).body(), "status"));
        assertEquals("FROZEN", field(api.call("POST", base + "/freeze", t, null, null).body(), "status"), "freeze is idempotent");
        assertEquals(409, api.call("POST", base + "/activate", t, null, null).statusCode(), "frozen cards are unfrozen, not activated");
        assertEquals("FROZEN", field(api.call("GET", base, t, null, null).body(), "status"), "persisted");
        assertEquals("ACTIVE", field(api.call("POST", base + "/unfreeze", t, null, null).body(), "status"));

        var activity = api.call("GET", base + "/activity", t, null, null).body();
        for (String type : List.of("CARD_CREATED", "CARD_ACTIVATED", "CARD_FROZEN", "CARD_UNFROZEN")) assertTrue(activity.contains(type), activity);
        assertEquals(4L, count("SELECT COUNT(*) FROM card_activity_events WHERE card_id = CAST(:c AS uuid)", id), "idempotent repeats are not audited twice");
    }

    @Test
    void blockedAndClosedCardsCannotBeUnfrozenOrChanged() {
        var c = api.newCustomer(); String t = token(c.subject());
        String id = api.issued(t, c.accountId()); String base = "/api/cards/" + id;
        api.call("POST", base + "/activate", t, null, null);
        for (String terminal : List.of("BLOCKED", "CLOSED")) {
            db.sql("UPDATE cards SET status = :s WHERE id = CAST(:id AS uuid)").param("s", terminal).param("id", id).update();
            for (String action : List.of("/activate", "/freeze", "/unfreeze")) {
                var r = api.call("POST", base + action, t, null, null);
                assertEquals(409, r.statusCode(), terminal + action);
                assertEquals("CARD_TERMINAL", field(r.body(), "code"));
            }
            assertEquals(409, api.call("PATCH", base + "/limits", t, null, "{\"dailyLimitMinor\":10000}").statusCode());
            assertEquals(terminal, field(api.call("GET", base, t, null, null).body(), "status"));
        }
    }

    @Test
    void limitsAreValidatedServerSideAndPersisted() {
        var c = api.newCustomer(); String t = token(c.subject());
        String id = api.issued(t, c.accountId()); String path = "/api/cards/" + id + "/limits";
        var ok = api.call("PATCH", path, t, null, "{\"dailyLimitMinor\":40000,\"monthlyLimitMinor\":200000,\"singleTransactionLimitMinor\":15000,\"onlineEnabled\":false}");
        assertEquals(200, ok.statusCode(), ok.body());
        assertEquals("40000", field(ok.body(), "dailyLimitMinor"));
        assertEquals("false", field(ok.body(), "onlineEnabled"));
        assertEquals("200000", field(api.call("GET", "/api/cards/" + id, t, null, null).body(), "monthlyLimitMinor"));

        for (String bad : List.of("{\"dailyLimitMinor\":500001}", "{\"monthlyLimitMinor\":2000001}", "{\"singleTransactionLimitMinor\":250001}",
                "{\"dailyLimitMinor\":99}", "{\"dailyLimitMinor\":-5}", "{\"singleTransactionLimitMinor\":50000}" /* > daily 40000 */,
                "{\"monthlyLimitMinor\":30000}" /* < daily */)) {
            var r = api.call("PATCH", path, t, null, bad);
            assertEquals(422, r.statusCode(), bad + " -> " + r.body());
            assertEquals("LIMIT_OUT_OF_RANGE", field(r.body(), "code"));
        }
        assertEquals(400, api.call("PATCH", path, t, null, "{}").statusCode());
        assertEquals(400, api.call("PATCH", path, t, null, "{\"dailyLimitMinor\":\"lots\"}").statusCode());
        assertEquals("40000", field(api.call("GET", "/api/cards/" + id, t, null, null).body(), "dailyLimitMinor"), "rejected changes leave limits untouched");
        assertEquals(1L, count("SELECT COUNT(*) FROM card_activity_events WHERE card_id = CAST(:c AS uuid) AND event_type = 'LIMITS_UPDATED'", id));
    }

    @Test
    void authorizationsEnforceStatusOnlineSettingAndLimitsWithoutTouchingTheLedger() {
        var c = api.newCustomer(); String t = token(c.subject());
        String id = api.issued(t, c.accountId()); String base = "/api/cards/" + id;
        long ledgerBefore = ledgerEntries();
        assertEquals("CARD_NOT_ACTIVE", decline(t, id, 1000, "IN_STORE"), "pending card");
        api.call("POST", base + "/activate", t, null, null);
        api.call("PATCH", base + "/limits", t, null, "{\"dailyLimitMinor\":10000,\"monthlyLimitMinor\":15000,\"singleTransactionLimitMinor\":6000}");

        assertEquals("APPROVED", outcome(t, id, 6000, "IN_STORE"));
        assertEquals("SINGLE_LIMIT_EXCEEDED", decline(t, id, 6001, "IN_STORE"));
        assertEquals("DAILY_LIMIT_EXCEEDED", decline(t, id, 5000, "ONLINE"), "6000 + 5000 > 10000");
        assertEquals("APPROVED", outcome(t, id, 4000, "ONLINE"));
        assertEquals("DAILY_LIMIT_EXCEEDED", decline(t, id, 100, "IN_STORE"), "daily total now exactly at the limit");
        assertEquals("10000", field(api.call("GET", base, t, null, null).body(), "dailySpentMinor"));

        api.call("PATCH", base + "/limits", t, null, "{\"dailyLimitMinor\":50000,\"monthlyLimitMinor\":15000,\"onlineEnabled\":false}");
        assertEquals(422, api.call("PATCH", base + "/limits", t, null, "{\"dailyLimitMinor\":50000}").statusCode(), "daily may not exceed monthly");
        api.call("PATCH", base + "/limits", t, null, "{\"monthlyLimitMinor\":20000,\"dailyLimitMinor\":20000,\"singleTransactionLimitMinor\":6000,\"onlineEnabled\":false}");
        assertEquals("ONLINE_DISABLED", decline(t, id, 100, "ONLINE"));
        assertEquals("APPROVED", outcome(t, id, 100, "IN_STORE"), "in-store still allowed");

        api.call("POST", base + "/freeze", t, null, null);
        assertEquals("CARD_FROZEN", decline(t, id, 100, "IN_STORE"), "frozen cards authorize nothing");
        api.call("POST", base + "/unfreeze", t, null, null);
        assertEquals("APPROVED", outcome(t, id, 100, "IN_STORE"));

        var history = api.call("GET", base + "/transactions", t, null, null).body();
        assertTrue(history.contains("SINGLE_LIMIT_EXCEEDED") && history.contains("CARD_FROZEN"), history);
        assertTrue(api.call("GET", base + "/activity", t, null, null).body().contains("AUTHORIZATION_DECLINED"));
        assertEquals(ledgerBefore, ledgerEntries(), "authorizations, freezes and limit changes post nothing to the ledger");
        assertEquals(0L, count("SELECT COALESCE(SUM(e.amount_minor),0) FROM ledger_entries e WHERE e.account_id = CAST(:c AS uuid)", c.accountId().toString()));
        assertEquals(400, api.call("POST", base + "/sandbox-authorizations", t, null, "{\"merchantName\":\"X\",\"amountMinor\":0,\"channel\":\"ONLINE\"}").statusCode());
        assertEquals(400, api.call("POST", base + "/sandbox-authorizations", t, null, "{\"merchantName\":\"X\",\"amountMinor\":100,\"channel\":\"MOON\"}").statusCode());
    }

    @Test
    void concurrentAuthorizationsNeverExceedTheDailyLimit() throws Exception {
        var c = api.newCustomer(); String t = token(c.subject());
        String id = api.issued(t, c.accountId()); String base = "/api/cards/" + id;
        api.call("POST", base + "/activate", t, null, null);
        api.call("PATCH", base + "/limits", t, null, "{\"dailyLimitMinor\":10000,\"monthlyLimitMinor\":10000,\"singleTransactionLimitMinor\":5000}");
        var pool = Executors.newFixedThreadPool(10);
        try {
            List<Callable<String>> jobs = IntStream.range(0, 10).<Callable<String>>mapToObj(i -> () -> outcome(t, id, 2000, "IN_STORE")).toList();
            var results = new ArrayList<String>();
            for (var f : pool.invokeAll(jobs)) results.add(f.get());
            assertEquals(5, results.stream().filter("APPROVED"::equals).count(), results.toString());
            assertEquals("10000", field(api.call("GET", base, t, null, null).body(), "dailySpentMinor"));
        } finally { pool.shutdownNow(); }
    }

    @Test
    void concurrentDuplicateIssuanceCreatesOneCardAndConcurrentFreezesAreConsistent() throws Exception {
        var c = api.newCustomer(); String t = token(c.subject());
        String key = UUID.randomUUID().toString();
        var pool = Executors.newFixedThreadPool(4);
        try {
            List<Callable<HttpResponse<String>>> issue = IntStream.range(0, 4).<Callable<HttpResponse<String>>>mapToObj(i -> () -> api.issue(t, c.accountId(), "EVERYDAY", key)).toList();
            var ids = new java.util.HashSet<String>();
            for (var f : pool.invokeAll(issue)) { assertEquals(201, f.get().statusCode()); ids.add(field(f.get().body(), "id")); }
            assertEquals(1, ids.size());
            assertEquals(1L, count("SELECT COUNT(*) FROM cards WHERE customer_id = CAST(:c AS uuid)", c.subject()));

            String id = ids.iterator().next();
            api.call("POST", "/api/cards/" + id + "/activate", t, null, null);
            List<Callable<Integer>> freezes = IntStream.range(0, 4).<Callable<Integer>>mapToObj(i -> () -> api.call("POST", "/api/cards/" + id + "/freeze", t, null, null).statusCode()).toList();
            for (var f : pool.invokeAll(freezes)) assertEquals(200, f.get());
            assertEquals(1L, count("SELECT COUNT(*) FROM card_activity_events WHERE card_id = CAST(:c AS uuid) AND event_type = 'CARD_FROZEN'", id), "one transition, one audit row");
        } finally { pool.shutdownNow(); }
    }

    @Test
    void otherCustomersCardsAreInvisibleAndAnonymousCallersAreRefused() {
        var owner = api.newCustomer(); var intruder = api.newCustomer();
        String id = api.issued(token(owner.subject()), owner.accountId()); String base = "/api/cards/" + id; String bad = token(intruder.subject());
        assertEquals(404, api.call("GET", base, bad, null, null).statusCode());
        for (String path : List.of("/activate", "/freeze", "/unfreeze")) assertEquals(404, api.call("POST", base + path, bad, null, null).statusCode(), path);
        assertEquals(404, api.call("PATCH", base + "/limits", bad, null, "{\"dailyLimitMinor\":10000}").statusCode());
        assertEquals(404, api.call("GET", base + "/transactions", bad, null, null).statusCode());
        assertEquals(404, api.call("GET", base + "/activity", bad, null, null).statusCode());
        assertEquals(404, api.call("POST", base + "/sandbox-authorizations", bad, null, "{\"merchantName\":\"X\",\"amountMinor\":100,\"channel\":\"ONLINE\"}").statusCode());
        assertEquals("[]", api.call("GET", "/api/cards", bad, null, null).body());
        assertEquals("PENDING_ACTIVATION", field(api.call("GET", base, token(owner.subject()), null, null).body(), "status"), "intruder changed nothing");

        assertEquals(401, api.call("GET", "/api/cards", null, null, null).statusCode());
        assertEquals(401, api.call("POST", base + "/freeze", null, null, null).statusCode());
        assertEquals(401, api.call("GET", "/api/cards/events", null, null, null).statusCode());
        assertEquals(403, api.call("GET", "/api/cards", token("no-profile-subject"), null, null).statusCode());
        assertEquals(400, api.call("GET", "/api/cards/not-a-uuid", token(owner.subject()), null, null).statusCode());
    }

    @Test
    void commandsAreRateLimited() {
        var c = api.newCustomer(); String t = token(c.subject());
        String id = api.issued(t, c.accountId());
        api.call("POST", "/api/cards/" + id + "/activate", t, null, null);
        HttpResponse<String> last = null;
        for (int i = 0; i < 45; i++) { last = api.call("POST", "/api/cards/" + id + "/" + (i % 2 == 0 ? "freeze" : "unfreeze"), t, null, null); if (last.statusCode() == 429) break; }
        assertEquals(429, last.statusCode());
        assertEquals("RATE_LIMITED", field(last.body(), "code"));
        assertTrue(last.headers().firstValue("Retry-After").isPresent());
    }

    @Test
    void auditAndAuthorizationRecordsAreImmutable() {
        var c = api.newCustomer(); String t = token(c.subject());
        String id = api.issued(t, c.accountId());
        api.call("POST", "/api/cards/" + id + "/activate", t, null, null);
        api.call("POST", "/api/cards/" + id + "/sandbox-authorizations", t, null, "{\"merchantName\":\"Cafe\",\"amountMinor\":100,\"channel\":\"IN_STORE\"}");
        for (String sql : List.of("UPDATE card_activity_events SET event_type = 'X' WHERE card_id = CAST(:c AS uuid)", "DELETE FROM card_activity_events WHERE card_id = CAST(:c AS uuid)",
                "UPDATE card_authorizations SET amount_minor = 1 WHERE card_id = CAST(:c AS uuid)", "DELETE FROM card_authorizations WHERE card_id = CAST(:c AS uuid)"))
            assertThrows(DataAccessException.class, () -> db.sql(sql).param("c", id).update(), sql);
        assertThrows(DataAccessException.class, () -> db.sql("UPDATE card_spending_limits SET daily_limit_minor = 999999999 WHERE card_id = CAST(:c AS uuid)").param("c", id).update(), "database ceiling");
    }

    @Test
    void cardEventsReachOnlyTheOwnersCardStreamAndCarryNoDetails() throws Exception {
        var c = api.newCustomer(); var stranger = api.newCustomer(); String t = token(c.subject());
        var mine = open("/api/cards/events", t); var theirs = open("/api/cards/events", token(stranger.subject()));
        var dashboard = open("/api/events/stream", t);
        for (var s : List.of(mine, theirs, dashboard)) assertEquals("stream.ready", s.next(5).name());

        String id = api.issued(t, c.accountId()); String base = "/api/cards/" + id;
        api.call("POST", base + "/activate", t, null, null);
        api.call("POST", base + "/freeze", t, null, null);
        api.call("POST", base + "/unfreeze", t, null, null);
        api.call("PATCH", base + "/limits", t, null, "{\"singleTransactionLimitMinor\":10000}");
        api.call("POST", base + "/sandbox-authorizations", t, null, "{\"merchantName\":\"Big spender\",\"amountMinor\":20000,\"channel\":\"IN_STORE\"}");
        for (String expected : List.of("card.created", "card.activated", "card.frozen", "card.unfrozen", "card.limits.updated", "card.authorization.declined")) {
            var event = mine.next(5);
            assertNotNull(event, "missing " + expected);
            assertEquals(expected, event.name());
            assertTrue(event.data().contains(id), event.data());
            assertFalse(event.data().matches("(?is).*(limit|amount|20000|balance|merchant|spender|account|FVC).*"), "no card details in events: " + event.data());
        }
        assertNull(theirs.next(1.0), "another customer's card stream stays silent");
        assertNull(dashboard.next(0.5), "card events do not leak onto the dashboard stream");

        api.call("POST", base + "/freeze", token(stranger.subject()), null, null); // 404: no event
        assertNull(mine.next(1.0), "failed commands are silent");
        db.sql("UPDATE cards SET status = 'FROZEN' WHERE id = CAST(:id AS uuid)").param("id", id).update();
    }

    // ---- helpers --------------------------------------------------------------------------------------------

    private String outcome(String t, String id, long amount, String channel) {
        var r = api.call("POST", "/api/cards/" + id + "/sandbox-authorizations", t, null,
            "{\"merchantName\":\"Test merchant\",\"amountMinor\":%d,\"channel\":\"%s\"}".formatted(amount, channel));
        assertEquals(201, r.statusCode(), r.body());
        return field(r.body(), "outcome");
    }

    private String decline(String t, String id, long amount, String channel) {
        var r = api.call("POST", "/api/cards/" + id + "/sandbox-authorizations", t, null,
            "{\"merchantName\":\"Test merchant\",\"amountMinor\":%d,\"channel\":\"%s\"}".formatted(amount, channel));
        assertEquals(201, r.statusCode(), r.body());
        assertEquals("DECLINED", field(r.body(), "outcome"));
        return field(r.body(), "declineReason");
    }

    private long ledgerEntries() { return db.sql("SELECT COUNT(*) FROM ledger_entries").query(Long.class).single(); }
    private long count(String sql, String param) { return db.sql(sql).param("c", param).query(Long.class).single(); }

    private EventStreamIntegrationTest.Stream open(String path, String token) throws Exception {
        HttpResponse<java.util.stream.Stream<String>> response = java.net.http.HttpClient.newHttpClient().send(
            HttpRequest.newBuilder(api.uri(path)).header("Authorization", "Bearer " + token).header("Accept", "text/event-stream").GET().build(),
            HttpResponse.BodyHandlers.ofLines());
        assertEquals(200, response.statusCode());
        var stream = new EventStreamIntegrationTest.Stream(response.body());
        streams.add(stream);
        return stream;
    }
}

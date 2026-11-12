package com.finix.banking;

import static org.junit.jupiter.api.Assertions.*;

import com.finix.banking.accounts.AccountRepository;
import com.finix.banking.config.SecurityConfig;
import com.finix.banking.events.DashboardChanged;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * End-to-end over real HTTP against real PostgreSQL: signed JWTs go through the production issuer / audience / azp /
 * expiry validators (only the signing key differs from Keycloak).
 */
@ActiveProfiles("dev")
@Import(EventStreamIntegrationTest.TestJwt.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "app.events.heartbeat-seconds=1", "app.events.max-connections-per-customer=3"})
class EventStreamIntegrationTest {
    private static final String ISSUER = "http://localhost:8081/realms/finix";
    private static final KeyPair KEYS = generateKeys();
    private static final String ALEX = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    private static final UUID EVERYDAY = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final UUID SAVINGS = UUID.fromString("22222222-2222-4222-8222-222222222222");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry props) { TestDatabase.register(props); }

    @TestConfiguration
    static class TestJwt {
        @Bean @Primary
        JwtDecoder testJwtDecoder() {
            NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey((RSAPublicKey) KEYS.getPublic()).build();
            decoder.setJwtValidator(SecurityConfig.tokenValidator(ISSUER, "finix-web", "finix-api"));
            return decoder;
        }
    }

    @LocalServerPort int port;
    @Autowired AccountRepository accounts;
    @Autowired JdbcClient db;
    @Autowired TransactionTemplate transactions;
    @Autowired ApplicationEventPublisher publisher;
    private final HttpClient http = HttpClient.newHttpClient();
    private final List<Stream> streams = new ArrayList<>();

    @AfterEach
    void closeStreams() { streams.forEach(Stream::close); streams.clear(); }

    // 1 + 2 + 3 + 4 + 5: two tabs get exactly one notification; another customer gets none; retry is silent.
    @Test
    void committedTransferNotifiesEveryStreamOfThatCustomerExactlyOnce() throws Exception {
        String other = newCustomer();
        String alex = token(ALEX, Duration.ofMinutes(5));
        Stream tabOne = open(alex), tabTwo = open(alex), stranger = open(token(other, Duration.ofMinutes(5)));
        for (Stream s : List.of(tabOne, tabTwo, stranger)) assertEquals("stream.ready", s.next(5).name());

        long combinedBefore = accounts.balance(EVERYDAY) + accounts.balance(SAVINGS);
        String key = UUID.randomUUID().toString();
        HttpResponse<String> created = transfer(alex, key, EVERYDAY, SAVINGS, 2500, "Move $25");
        assertEquals(201, created.statusCode(), created.body());

        for (Stream tab : List.of(tabOne, tabTwo)) {
            Event event = tab.next(5);
            assertEquals("dashboard.updated", event.name());
            assertTrue(event.data().contains("\"reason\":\"transfer.posted\""), event.data());
            assertFalse(event.data().matches("(?is).*(balance|amount|account|2500).*"),
                "notification must not carry financial data: " + event.data());
        }
        assertNull(stranger.next(1.5), "another customer must not receive the notification");
        assertEquals(combinedBefore, accounts.balance(EVERYDAY) + accounts.balance(SAVINGS));

        UUID transferId = UUID.fromString(created.body().replaceAll("(?s).*\"id\":\"([^\"]+)\".*", "$1"));
        assertEquals(0L, db.sql("SELECT SUM(amount_minor) FROM ledger_entries WHERE journal_id = (SELECT journal_id FROM transfers WHERE id=:id)")
            .param("id", transferId).query(Long.class).single());
        assertEquals(1L, db.sql("SELECT COUNT(*) FROM audit_events WHERE aggregate_id=:id").param("id", transferId).query(Long.class).single());
        assertEquals(1L, db.sql("SELECT COUNT(*) FROM outbox_events WHERE aggregate_id=:id").param("id", transferId).query(Long.class).single());

        HttpResponse<String> retried = transfer(alex, key, EVERYDAY, SAVINGS, 2500, "Move $25");
        assertEquals(201, retried.statusCode());
        assertEquals(created.body(), retried.body());
        assertNull(tabOne.next(1.5), "idempotent retry must not notify again");
        assertEquals(1L, db.sql("SELECT COUNT(*) FROM transfers WHERE idempotency_key=:k").param("k", key).query(Long.class).single());
    }

    // 6: rejected and rolled-back work is silent.
    @Test
    void rejectedAndRolledBackWorkDoesNotNotify() throws Exception {
        String alex = token(ALEX, Duration.ofMinutes(5));
        Stream tab = open(alex);
        assertEquals("stream.ready", tab.next(5).name());

        assertEquals(409, transfer(alex, UUID.randomUUID().toString(), EVERYDAY, SAVINGS, 100_000_000, "Too large").statusCode());
        assertEquals(404, transfer(alex, UUID.randomUUID().toString(), EVERYDAY,
            UUID.fromString("99999999-9999-4999-8999-999999999999"), 100, "Not mine").statusCode());
        assertEquals(400, transfer(alex, UUID.randomUUID().toString(), EVERYDAY, EVERYDAY, 100, "Same account").statusCode());
        String key = UUID.randomUUID().toString();
        assertEquals(201, transfer(alex, key, EVERYDAY, SAVINGS, 100, "First").statusCode());
        assertEquals("dashboard.updated", tab.next(5).name());
        assertEquals(409, transfer(alex, key, EVERYDAY, SAVINGS, 200, "First").statusCode()); // key reuse, other payload

        transactions.execute(status -> {
            publisher.publishEvent(new DashboardChanged(UUID.fromString(ALEX), "test.rolled-back"));
            status.setRollbackOnly();
            return null;
        });
        assertNull(tab.next(1.5), "no notification for rejected, conflicting or rolled-back work");
    }

    // 7: anonymous, bad tokens, and tokens in URLs are refused.
    @Test
    void anonymousAndQueryStringTokensAreRefused() throws Exception {
        assertEquals(401, status(HttpRequest.newBuilder(uri("/api/events/stream")).GET().build()));
        String valid = token(ALEX, Duration.ofMinutes(5));
        assertEquals(401, status(HttpRequest.newBuilder(uri("/api/events/stream?access_token=" + valid)).GET().build()));
        assertEquals(401, status(bearer("/api/events/stream", "not-a-jwt")));
        assertEquals(401, status(bearer("/api/events/stream", token("someone", Duration.ofMinutes(5), "other-client", "finix-api"))));
        assertEquals(401, status(bearer("/api/events/stream", token("someone", Duration.ofMinutes(5), "finix-web", "other-api"))));
        assertEquals(403, status(bearer("/api/events/stream", token("no-profile-subject", Duration.ofMinutes(5)))));
    }

    // Stream never outlives its token; heartbeats keep it alive meanwhile.
    @Test
    void streamSendsKeepalivesAndClosesWhenTokenExpires() throws Exception {
        Stream stream = open(token(newCustomer(), Duration.ofSeconds(4)));
        assertEquals("stream.ready", stream.next(5).name());
        assertTrue(stream.awaitComment(3), "heartbeat comment expected");
        assertTrue(stream.awaitClosed(8), "stream must end by token expiry");
    }

    // Connection limits per customer.
    @Test
    void limitsConcurrentStreamsPerCustomer() throws Exception {
        String token = token(newCustomer(), Duration.ofMinutes(5));
        for (int i = 0; i < 3; i++) assertEquals("stream.ready", open(token).next(5).name());
        assertEquals(429, status(bearer("/api/events/stream", token)));
    }

    // ---- helpers --------------------------------------------------------------------------------------------

    private String newCustomer() {
        UUID id = UUID.randomUUID();
        db.sql("INSERT INTO customers(id, oidc_subject, full_name) VALUES (:id, :subject, 'Test Customer')")
            .param("id", id).param("subject", id.toString()).update();
        return id.toString();
    }

    private static KeyPair generateKeys() {
        try { KeyPairGenerator g = KeyPairGenerator.getInstance("RSA"); g.initialize(2048); return g.generateKeyPair(); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }

    private static String token(String subject, Duration lifetime) { return token(subject, lifetime, "finix-web", "finix-api"); }

    private static String token(String subject, Duration lifetime, String azp, String audience) {
        try {
            Instant now = Instant.now();
            JWTClaimsSet claims = new JWTClaimsSet.Builder().issuer(ISSUER).subject(subject).audience(audience)
                .claim("azp", azp).issueTime(Date.from(now)).expirationTime(Date.from(now.plus(lifetime))).build();
            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), claims);
            jwt.sign(new RSASSASigner(KEYS.getPrivate()));
            return jwt.serialize();
        } catch (Exception e) { throw new IllegalStateException(e); }
    }

    private URI uri(String path) { return URI.create("http://localhost:" + port + path); }
    private HttpRequest bearer(String path, String token) {
        return HttpRequest.newBuilder(uri(path)).header("Authorization", "Bearer " + token).header("Accept", "text/event-stream").GET().build();
    }
    private int status(HttpRequest request) throws Exception {
        return http.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
    }

    private HttpResponse<String> transfer(String token, String key, UUID from, UUID to, long amountMinor, String description) throws Exception {
        String body = "{\"sourceAccountId\":\"%s\",\"destinationAccountId\":\"%s\",\"amountMinor\":%d,\"description\":\"%s\"}"
            .formatted(from, to, amountMinor, description);
        return http.send(HttpRequest.newBuilder(uri("/api/transfers")).header("Authorization", "Bearer " + token)
            .header("Content-Type", "application/json").header("Idempotency-Key", key)
            .POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
    }

    private Stream open(String token) throws Exception {
        HttpResponse<java.util.stream.Stream<String>> response = http.send(bearer("/api/events/stream", token), HttpResponse.BodyHandlers.ofLines());
        assertEquals(200, response.statusCode());
        assertTrue(response.headers().firstValue("Content-Type").orElse("").startsWith("text/event-stream"));
        Stream stream = new Stream(response.body());
        streams.add(stream);
        return stream;
    }

    record Event(String name, String data) {}

    /** Reads one SSE response on a background thread. */
    static final class Stream {
        private final java.util.stream.Stream<String> lines;
        private final LinkedBlockingQueue<Event> events = new LinkedBlockingQueue<>();
        private final CountDownLatch closed = new CountDownLatch(1);
        private final CountDownLatch comment = new CountDownLatch(1);

        Stream(java.util.stream.Stream<String> lines) {
            this.lines = lines;
            Thread reader = new Thread(() -> {
                String name = null; StringBuilder data = new StringBuilder();
                try {
                    for (var it = lines.iterator(); it.hasNext(); ) {
                        String line = it.next();
                        if (line.isEmpty()) { if (name != null) events.add(new Event(name, data.toString())); name = null; data.setLength(0); }
                        else if (line.startsWith(":")) comment.countDown();
                        else if (line.startsWith("event:")) name = line.substring(6).trim();
                        else if (line.startsWith("data:")) data.append(line.substring(5).trim());
                    }
                } catch (RuntimeException ignored) { /* connection cancelled by the test */ }
                finally { closed.countDown(); }
            }, "sse-test-reader");
            reader.setDaemon(true);
            reader.start();
        }
        Event next(double seconds) throws InterruptedException { return events.poll((long) (seconds * 1000), TimeUnit.MILLISECONDS); }
        boolean awaitComment(double seconds) throws InterruptedException { return comment.await((long) (seconds * 1000), TimeUnit.MILLISECONDS); }
        boolean awaitClosed(double seconds) throws InterruptedException { return closed.await((long) (seconds * 1000), TimeUnit.MILLISECONDS); }
        void close() { try { lines.close(); } catch (RuntimeException ignored) {} }
    }
}

package com.finix.banking;

import static org.junit.jupiter.api.Assertions.*;

import com.finix.banking.config.SecurityConfig;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

/** Shared HTTP + JWT plumbing for the card integration tests (real validators, test signing key). */
final class CardTestSupport {
    static final String ISSUER = "http://localhost:8081/realms/finix";
    static final KeyPair KEYS = generateKeys();
    static final String ALEX = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

    @TestConfiguration
    static class TestJwt {
        @Bean @Primary
        JwtDecoder testJwtDecoder() {
            NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey((RSAPublicKey) KEYS.getPublic()).build();
            decoder.setJwtValidator(SecurityConfig.tokenValidator(ISSUER, "finix-web", "finix-api"));
            return decoder;
        }
    }

    /** A customer with one active GBP account; the account is not funded (cards never touch balances). */
    record Customer(String subject, UUID accountId) {}

    private final int port;
    private final JdbcClient db;
    private final HttpClient http = HttpClient.newHttpClient();

    CardTestSupport(int port, JdbcClient db) { this.port = port; this.db = db; }

    Customer newCustomer() {
        UUID id = UUID.randomUUID(), account = UUID.randomUUID();
        db.sql("INSERT INTO customers(id, oidc_subject, full_name) VALUES (:id, :s, 'Test Customer')").param("id", id).param("s", id.toString()).update();
        db.sql("INSERT INTO accounts(id, customer_id, account_number, display_name, currency) VALUES (:a, :c, :n, 'Test account', 'GBP')")
            .param("a", account).param("c", id).param("n", String.format("%012d", Math.abs(id.getMostSignificantBits() % 1_000_000_000_000L))).update();
        return new Customer(id.toString(), account);
    }

    static String token(String subject) { return token(subject, null); }

    static String token(String subject, Instant authTime) {
        try {
            Instant now = Instant.now();
            JWTClaimsSet.Builder claims = new JWTClaimsSet.Builder().issuer(ISSUER).subject(subject).audience("finix-api")
                .claim("azp", "finix-web").issueTime(Date.from(now)).expirationTime(Date.from(now.plus(Duration.ofMinutes(5))));
            if (authTime != null) claims.claim("auth_time", authTime.getEpochSecond());
            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), claims.build());
            jwt.sign(new RSASSASigner(KEYS.getPrivate()));
            return jwt.serialize();
        } catch (Exception e) { throw new IllegalStateException(e); }
    }

    URI uri(String path) { return URI.create("http://localhost:" + port + path); }

    HttpResponse<String> call(String method, String path, String token, String key, String body) {
        try {
            var builder = HttpRequest.newBuilder(uri(path)).method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
            if (token != null) builder.header("Authorization", "Bearer " + token);
            if (body != null) builder.header("Content-Type", "application/json");
            if (key != null) builder.header("Idempotency-Key", key);
            return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        } catch (Exception e) { throw new IllegalStateException(e); }
    }

    HttpResponse<String> issue(String token, UUID account, String type, String key) {
        return call("POST", "/api/cards", token, key, "{\"accountId\":\"%s\",\"cardType\":\"%s\"}".formatted(account, type));
    }

    /** Issues and returns the new card's id. */
    String issued(String token, UUID account) {
        var r = issue(token, account, "EVERYDAY", UUID.randomUUID().toString());
        assertEquals(201, r.statusCode(), r.body());
        return field(r.body(), "id");
    }

    static String field(String json, String name) {
        var m = java.util.regex.Pattern.compile("\"" + name + "\":\"?([^\",}]*)").matcher(json);
        assertTrue(m.find(), name + " missing in " + json);
        return m.group(1);
    }

    private static KeyPair generateKeys() {
        try { KeyPairGenerator g = KeyPairGenerator.getInstance("RSA"); g.initialize(2048); return g.generateKeyPair(); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }
}

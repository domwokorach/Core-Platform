package com.finix.banking;

import static com.finix.banking.CardTestSupport.*;
import static org.junit.jupiter.api.Assertions.*;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** Self-registered identities become exactly one customer, see no one else's data, and only once their e-mail is verified. */
@ActiveProfiles("dev")
@Import(CardTestSupport.TestJwt.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CustomerProvisioningTest {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry props) { TestDatabase.register(props); }

    @LocalServerPort int port;
    @Autowired JdbcClient db;

    static String registered(String sub, boolean verified) throws Exception {
        Instant now = Instant.now();
        var claims = new JWTClaimsSet.Builder().issuer(ISSUER).subject(sub).audience("finix-api").claim("azp", "finix-web")
            .claim("email_verified", verified).claim("given_name", "Nia").claim("family_name", "Okafor")
            .issueTime(Date.from(now)).expirationTime(Date.from(now.plus(Duration.ofMinutes(5)))).build();
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), claims);
        jwt.sign(new RSASSASigner(KEYS.getPrivate()));
        return jwt.serialize();
    }

    int customers(String sub) { return db.sql("SELECT count(*) FROM customers WHERE oidc_subject = :s").param("s", sub).query(Integer.class).single(); }

    @Test
    void verifiedNewIdentityGetsOneEmptyProfileAndNoOneElsesAccounts() throws Exception {
        var api = new CardTestSupport(port, db);
        var existing = api.newCustomer();                       // someone else, with an account
        String sub = UUID.randomUUID().toString();
        String token = registered(sub, true);
        assertEquals(0, customers(sub));
        var first = api.call("GET", "/api/accounts", token, null, null);
        assertEquals(200, first.statusCode(), first.body());
        assertEquals("[]", first.body().trim(), "a new customer owns no accounts");
        assertEquals(1, customers(sub));
        for (int i = 0; i < 5; i++) assertEquals(200, api.call("GET", "/api/accounts", token, null, null).statusCode());
        assertEquals(1, customers(sub), "repeat requests never create duplicates");
        assertEquals("Nia Okafor", db.sql("SELECT full_name FROM customers WHERE oidc_subject = :s").param("s", sub).query(String.class).single());
        // cannot reach another customer's account or cards
        assertTrue(api.call("GET", "/api/cards", token, null, null).body().trim().equals("[]"));
        var foreign = api.call("POST", "/api/cards", token, UUID.randomUUID().toString(), "{\"accountId\":\"%s\",\"cardType\":\"EVERYDAY\"}".formatted(existing.accountId()));
        assertTrue(foreign.statusCode() == 403 || foreign.statusCode() == 404, "foreign account refused, got " + foreign.statusCode());
    }

    @Test
    void unverifiedEmailGetsNoProfile() throws Exception {
        var api = new CardTestSupport(port, db);
        String sub = UUID.randomUUID().toString();
        assertEquals(403, api.call("GET", "/api/accounts", registered(sub, false), null, null).statusCode());
        assertEquals(0, customers(sub));
    }

    @Test
    void concurrentFirstRequestsCreateOneCustomer() throws Exception {
        var api = new CardTestSupport(port, db);
        String sub = UUID.randomUUID().toString(); String token = registered(sub, true);
        var pool = java.util.concurrent.Executors.newFixedThreadPool(8);
        var futures = new java.util.ArrayList<java.util.concurrent.Future<Integer>>();
        for (int i = 0; i < 8; i++) futures.add(pool.submit(() -> api.call("GET", "/api/accounts", token, null, null).statusCode()));
        for (var f : futures) assertEquals(200, f.get());
        pool.shutdown();
        assertEquals(1, customers(sub));
    }
}

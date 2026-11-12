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
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** The market-data and paper-trading endpoints over real HTTP: authentication is mandatory and no secret is ever returned. */
@ActiveProfiles("dev")
@Import(MarketHttpSecurityTest.TestJwt.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "app.market.api-key=", "app.paper.key-id=", "app.paper.secret-key="})
class MarketHttpSecurityTest {
    private static final String ISSUER = "http://localhost:8081/realms/finix";
    private static final KeyPair KEYS = keys();

    @DynamicPropertySource static void database(DynamicPropertyRegistry props) { TestDatabase.register(props); }

    @TestConfiguration
    static class TestJwt {
        @Bean @Primary JwtDecoder testJwtDecoder() {
            NimbusJwtDecoder d = NimbusJwtDecoder.withPublicKey((RSAPublicKey) KEYS.getPublic()).build();
            d.setJwtValidator(SecurityConfig.tokenValidator(ISSUER, "finix-web", "finix-api"));
            return d;
        }
    }

    @LocalServerPort int port;
    private final HttpClient http = HttpClient.newHttpClient();

    private HttpResponse<String> call(String method, String path, String token) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path));
        if (token != null) b.header("Authorization", "Bearer " + token);
        if (method.equals("POST")) b.header("Content-Type", "application/json").header("Idempotency-Key", "abcdefgh-1234").POST(HttpRequest.BodyPublishers.ofString("{\"symbol\":\"AAPL\",\"side\":\"buy\",\"qty\":1}"));
        else b.GET();
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test void everyMarketAndPaperEndpointRequiresAuthentication() throws Exception {
        for (String p : List.of("/api/market/quotes", "/api/market/quotes/AAPL", "/api/market/history/AAPL?range=1M", "/api/market/status", "/api/market/events",
                                "/api/paper/status", "/api/paper/account", "/api/paper/positions", "/api/paper/orders"))
            assertEquals(401, call("GET", p, null).statusCode(), p);
        assertEquals(401, call("POST", "/api/paper/orders", null).statusCode());
        assertEquals(401, call("GET", "/api/market/quotes", "not-a-real-token").statusCode());
    }

    @Test void unconfiguredBackendReportsHonestlyAndLeaksNothing() throws Exception {
        String token = token();
        var status = call("GET", "/api/market/status", token);
        assertEquals(200, status.statusCode());
        assertTrue(status.body().contains("\"configured\":false"), status.body());
        var quotes = call("GET", "/api/market/quotes", token);
        assertEquals(200, quotes.statusCode());
        assertTrue(quotes.body().contains("NOT_CONFIGURED"), quotes.body());
        assertTrue(quotes.body().contains("\"quotes\":[]"), "no prices without a provider: " + quotes.body());
        assertTrue(quotes.headers().firstValue("Cache-Control").orElse("").contains("no-store"));
        assertFalse(quotes.body().toLowerCase().contains("apikey"));
        var single = call("GET", "/api/market/quotes/AAPL", token);
        assertEquals(503, single.statusCode());
        assertTrue(single.body().contains("\"code\":\"NOT_CONFIGURED\""));
    }

    @Test void serverSideValidationRejectsUnknownSymbolsAndRanges() throws Exception {
        String token = token();
        var bad = call("GET", "/api/market/quotes?symbols=AAPL,TSLA", token);
        assertEquals(400, bad.statusCode());
        assertTrue(bad.body().contains("UNKNOWN_SYMBOL"));
        assertEquals(400, call("GET", "/api/market/quotes/TSLA", token).statusCode());
        assertEquals(400, call("GET", "/api/market/history/AAPL?range=10Y", token).statusCode());
    }

    @Test void paperTradingDisabledWithoutCredentialsAndNeverReachesLive() throws Exception {
        String token = token();
        var status = call("GET", "/api/paper/status", token);
        assertEquals(200, status.statusCode());
        assertTrue(status.body().contains("\"enabled\":false") && status.body().contains("\"mode\":\"PAPER\""));
        var order = call("POST", "/api/paper/orders", token);
        assertEquals(503, order.statusCode());
        assertTrue(order.body().contains("PAPER_NOT_CONFIGURED"));
    }

    @Test void transactionsCarryVerifiedMerchantMetadataInGbp() throws Exception {
        var res = call("GET", "/api/transactions", token());
        assertEquals(200, res.statusCode(), res.body());
        var items = new com.fasterxml.jackson.databind.ObjectMapper().readTree(res.body());
        java.util.Map<String, com.fasterxml.jackson.databind.JsonNode> byDesc = new java.util.HashMap<>();
        for (var n : items) byDesc.putIfAbsent(n.path("description").asText(), n);
        var netflix = byDesc.get("Netflix");
        assertEquals("netflix.com", netflix.path("merchant").path("domain").asText());
        assertEquals("Entertainment", netflix.path("merchant").path("category").asText());
        assertEquals("COMPLETED", netflix.path("status").asText());
        assertEquals("GBP", netflix.path("currency").asText());
        assertTrue(netflix.path("amountMinor").asLong() < 0);
        assertEquals("dkny.com", byDesc.get("DKNY").path("merchant").path("domain").asText());
        assertEquals("starbucks.com", byDesc.get("Starbucks Coffee").path("merchant").path("domain").asText());
        assertEquals("kfc.com", byDesc.get("KFC").path("merchant").path("domain").asText());
        assertTrue(byDesc.get("Payroll").path("merchant").isNull(), "non-merchant entries carry no merchant");
        assertFalse(res.body().contains("logo.dev"), "the API never involves the logo provider");
    }

    private static KeyPair keys() { try { KeyPairGenerator g = KeyPairGenerator.getInstance("RSA"); g.initialize(2048); return g.generateKeyPair(); } catch (Exception e) { throw new IllegalStateException(e); } }

    private static String token() {
        try {
            Instant now = Instant.now();
            JWTClaimsSet c = new JWTClaimsSet.Builder().issuer(ISSUER).subject("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa").audience("finix-api").claim("azp", "finix-web")
                .issueTime(Date.from(now)).expirationTime(Date.from(now.plus(Duration.ofMinutes(5)))).build();
            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), c);
            jwt.sign(new RSASSASigner(KEYS.getPrivate()));
            return jwt.serialize();
        } catch (Exception e) { throw new IllegalStateException(e); }
    }
}

package com.finix.banking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.finix.banking.config.SecurityConfig;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.PlainJWT;
import com.nimbusds.jwt.SignedJWT;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

/** The real production token rules (SecurityConfig.tokenValidator) against locally signed tokens shaped like Keycloak's. */
class JwtValidationTest {
    static final String ISSUER = "http://localhost:8081/realms/finix";
    static KeyPair trusted;
    static KeyPair attacker;
    static NimbusJwtDecoder decoder;

    @BeforeAll
    static void keys() throws Exception {
        KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
        gen.initialize(2048);
        trusted = gen.generateKeyPair();
        attacker = gen.generateKeyPair();
        decoder = NimbusJwtDecoder.withPublicKey((RSAPublicKey) trusted.getPublic()).build();
        decoder.setJwtValidator(SecurityConfig.tokenValidator(ISSUER, "finix-web", "finix-api"));
    }

    static JWTClaimsSet.Builder claims() {
        Instant now = Instant.now();
        return new JWTClaimsSet.Builder().subject("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa").issuer(ISSUER).audience(List.of("finix-api", "account"))
            .claim("azp", "finix-web").issueTime(Date.from(now)).notBeforeTime(Date.from(now.minusSeconds(5))).expirationTime(Date.from(now.plusSeconds(300)));
    }

    static String sign(JWTClaimsSet set, KeyPair key) throws Exception {
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), set);
        jwt.sign(new RSASSASigner((RSAPrivateKey) key.getPrivate()));
        return jwt.serialize();
    }

    @Test void acceptsAValidKeycloakShapedToken() throws Exception {
        Jwt jwt = decoder.decode(sign(claims().build(), trusted));
        assertThat(jwt.getSubject()).isEqualTo("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    }

    @Test void rejectsWrongIssuer() throws Exception {
        assertRejected(sign(claims().issuer("http://evil.example/realms/finix").build(), trusted));
    }

    @Test void rejectsMissingApiAudience() throws Exception {
        assertRejected(sign(claims().audience(List.of("account")).build(), trusted));
    }

    @Test void rejectsTokenIssuedToAnotherClient() throws Exception {
        assertRejected(sign(claims().claim("azp", "some-other-client").build(), trusted));
    }

    @Test void rejectsExpiredToken() throws Exception {
        assertRejected(sign(claims().expirationTime(Date.from(Instant.now().minusSeconds(600))).build(), trusted));
    }

    @Test void rejectsNotYetValidToken() throws Exception {
        assertRejected(sign(claims().notBeforeTime(Date.from(Instant.now().plusSeconds(600))).build(), trusted));
    }

    @Test void rejectsTokenSignedWithAnotherKey() throws Exception {
        assertRejected(sign(claims().build(), attacker));
    }

    @Test void rejectsUnsignedAlgNoneToken() {
        assertRejected(new PlainJWT(claims().build()).serialize());
    }

    @Test void rejectsMalformedTokens() {
        assertRejected("not-a-jwt");
        assertRejected("a.b.c");
        assertRejected("");
    }

    private static void assertRejected(String token) {
        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtException.class);
    }
}

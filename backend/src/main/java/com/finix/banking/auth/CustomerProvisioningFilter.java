package com.finix.banking.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * First sign-in after self-registration: links the verified Keycloak identity (the stable `sub`) to exactly one FINIX customer.
 * The new customer starts with NO accounts, so no other customer's data is reachable; ownership checks stay keyed on `sub`.
 * Runs only after the JWT has been fully validated, only for verified e-mail addresses, and is idempotent
 * (UNIQUE oidc_subject + ON CONFLICT DO NOTHING), so concurrent first requests cannot create duplicates.
 */
@Component
public class CustomerProvisioningFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(CustomerProvisioningFilter.class);
    private static final int MAX_REMEMBERED = 50_000;
    private final JdbcClient db;
    private final Set<String> known = ConcurrentHashMap.newKeySet();

    public CustomerProvisioningFilter(JdbcClient db) { this.db = db; }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) { return !request.getRequestURI().startsWith("/api/"); }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken token) ensureCustomer(token.getToken());
        chain.doFilter(request, response);
    }

    private void ensureCustomer(Jwt jwt) {
        String subject = jwt.getSubject();
        if (subject == null || subject.length() > 160 || known.contains(subject)) return;
        try {
            boolean exists = db.sql("SELECT 1 FROM customers WHERE oidc_subject = :s").param("s", subject).query().listOfRows().size() > 0;
            if (!exists && Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified"))) {
                db.sql("INSERT INTO customers(id, oidc_subject, full_name) VALUES (:id, :s, :name) ON CONFLICT (oidc_subject) DO NOTHING")
                    .param("id", UUID.randomUUID()).param("s", subject).param("name", displayName(jwt)).update();
                log.info("Linked a new verified identity to a FINIX customer profile");
            }
            if (exists || Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified"))) {
                if (known.size() >= MAX_REMEMBERED) known.clear();
                known.add(subject);
            }
        } catch (DataAccessException e) {
            log.warn("Customer provisioning check failed; request continues without a profile");
        }
    }

    private static String displayName(Jwt jwt) {
        String name = jwt.getClaimAsString("name");
        if (name == null || name.isBlank()) {
            name = ((jwt.getClaimAsString("given_name") == null ? "" : jwt.getClaimAsString("given_name")) + " "
                + (jwt.getClaimAsString("family_name") == null ? "" : jwt.getClaimAsString("family_name"))).trim();
        }
        if (name.isBlank()) name = "FINIX customer";
        return name.length() > 160 ? name.substring(0, 160) : name;
    }
}

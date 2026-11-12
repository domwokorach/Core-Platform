# FINIX Security Policy

> **Purpose:** how to report vulnerabilities, what security controls FINIX implements today, how secrets are handled, and what is still missing before any production use.
> **Canonical file:** this is the only security policy. (A misspelt `SECUIRTY.md` does not exist; if one is ever added it must only link here.)
> **Related:** [Risk Register](RISK.md) · [Development Rules](RULE.md) · [README](README.md) · [Licensing](LICENSE.md)

**FINIX is a development sandbox, not a production financial service.** It holds fictional data only and has not been independently security-tested. Do not use it to store or move real money or real customer data.

## 1. Supported versions

| Version / environment | Status | Security fixes |
| --- | --- | --- |
| `0.1.0` (current `master`) | Development sandbox | Best effort by the project owner; **no service-level commitment** |
| Any production deployment | **Not supported** (none exists) | n/a |
| Maintenance windows, backport policy, disclosure timelines | `[Pending: owner to define]` | |

## 2. Reporting a vulnerability

* **Private reporting channel:** `[Pending: the project owner must designate a security contact (e.g. a monitored mailbox or private advisory feature) and replace this line]`. No contact address has been established, so none is listed here.
* Until a channel exists, contact the repository owner **directly and privately**. *Proposed for the owner:* enable GitHub **Private vulnerability reporting** (repository Settings > Code security) so researchers get a private "Report a vulnerability" button; then replace the pending line above with that channel.
* **Please do not** open public issues, pull requests or discussions containing exploit details, credentials or personal data, and do not test against systems you do not own.
* Useful report content: affected component and version, steps to reproduce, impact, suggested fix, and whether you saw real data (there should be none).
* Intended handling *(to be confirmed by the owner)*: acknowledge, triage, fix or mitigate, coordinate disclosure, credit the reporter if desired. Target response times are `[Pending]`.
* Good-faith research that avoids privacy violations, data destruction and service disruption is welcome; there is currently **no bug-bounty programme**.

## 3. Authentication and sessions

| Topic | Implementation |
| --- | --- |
| Identity provider | **Keycloak 26**, realm `finix`, public client `finix-web`. FINIX stores no passwords. |
| Protocol | OAuth 2.0 / OpenID Connect **Authorization Code with PKCE (S256)**; fresh `state`, `nonce` and code verifier per attempt; callback validates state, nonce, issuer and audience (`oidc-client-ts`). |
| Redirect safety | `returnTo` is limited to known application sections; external, protocol-relative and unknown paths fall back to `/`. Registered redirect URI: `http://localhost:3000/auth/callback` (dev). |
| Credential entry | Only on the Keycloak-hosted FINIX theme. No password grant, no custom credential API. |
| JWT validation (API) | Spring Security resource server: signature against Keycloak's JWKS, **issuer**, expiry/not-before, authorised client (`azp` must be `finix-web`) and API audience (`finix-api`). Unsigned (`alg=none`), foreign-key, wrong-issuer, wrong-audience, expired and malformed tokens are rejected (`JwtValidationTest`). ID tokens are not accepted as API credentials. |
| Token handling | Access tokens live in browser `sessionStorage` (public client), are renewed with the refresh token, and are never placed in URLs or logs. A 401 ends the session with a visible expiry message and does **not** auto-restart sign-in (prevents redirect loops). |
| Logout | Ends the Keycloak SSO session and clears the local session; protected routes redirect back to sign-in. |
| Registration | Self-registration with required e-mail verification, password policy (`length(10)`, not username, not e-mail), server-enforced terms acceptance, brute-force protection. A verified identity gets an empty customer profile and **no accounts**. |
| Role-based authorisation | FINIX currently has **no application roles**. Authorisation is **ownership-based** (every query scoped to the token `sub`) plus client/audience checks. Keycloak's own admin roles protect the identity provider. |
| Step-up | Sensitive card changes (unfreezing, loosening limits) can require a recent authentication (`auth_time`, configurable). |
| Development-only access | The `FINIX_DEMO_AUTH` demo sign-in (development server only, issues **no** token, fixtures only, `404` in production builds) and the `finix-dev` Keycloak theme credentials card (localhost only). Neither may be enabled in staging or production. |

## 4. Financial security

* **Ledger integrity:** balances are derived from immutable, balanced double-entry journals. Database triggers enforce zero-sum single-currency journals and reject UPDATE/DELETE of journals, entries, transfers and audit events.
* **Atomic transfers:** journal, entries, transfer, audit event and outbox event commit in one PostgreSQL transaction.
* **Concurrency:** the owning customer row is locked while funds are checked and posted; card authorisation rows are locked so concurrent spends cannot exceed limits.
* **Idempotency:** `Idempotency-Key` is unique per customer and bound to the payload; replays return the original receipt, mismatches are rejected.
* **Account ownership:** all reads and writes are keyed on the authenticated `sub`; another customer's accounts or cards are not reachable (404/403).
* **Audit trail:** append-only `audit_events` for transfers and card activity records. There is no tamper-evident external log or retention policy yet.
* **Limits:** transfer amounts are bounded (1–100,000,000 pence); card limits have server-side ceilings. There are **no** velocity, fraud, sanctions or AML controls.

## 5. Secret management

| Secret | Where it lives | Rules |
| --- | --- | --- |
| PostgreSQL password, Keycloak administrator password, session secret | Root `.env` (git-ignored, mode 600), generated by `scripts/setup-env.sh` (`openssl rand -hex 32`), never printed | Independent values; never rotated implicitly |
| Third-party API keys (Twelve Data, Alpaca paper) | Root `.env` → API container/process only | **Backend only**; never in the browser or any `NEXT_PUBLIC_` variable |
| Logo.dev key | `NEXT_PUBLIC_LOGO_DEV_TOKEN` / `LOGO_DEV_TOKEN` | **Publishable (`pk_…`) keys only**; `sk_…` keys are refused at runtime and fail the image build |
| Browser-public configuration | `frontend/.env.local` | Public values only |
| `FINIX_SESSION_SECRET` | Root `.env` | Reserved for a future server-side session; unused today |
| Examples | `.env.example`, `frontend/.env.example` | Names and safe placeholders only |

* **Never** commit `.env*` files with real values or paste secrets into issues, logs or screenshots.
* **Rotation:** `bash scripts/rotate-secret.sh postgres | keycloak-admin | session` (explicit, atomic, tested for old-rejected/new-accepted). A database volume keeps the password it was created with; `scripts/setup-env.sh --apply-db-password` applies a new one with `ALTER USER`.
* **If a secret is exposed:** rotate it first, then remove it from history (e.g. `git filter-repo`), and treat the old value as compromised.
* **Production:** use a secret manager and short-lived credentials, not `.env` files.

## 6. Data protection

| Area | Today | Required for production |
| --- | --- | --- |
| Transport | Plain HTTP on `localhost` | **HTTPS everywhere** (TLS 1.2+), HSTS, `KC_HOSTNAME` with `https`, Keycloak `sslRequired=all` |
| Cookies | Keycloak's own cookies; the dev demo cookie is HttpOnly, SameSite=Strict, **not** `Secure` (HTTP dev). FINIX does not use cookies for API authentication | `Secure`, `HttpOnly`, `SameSite` on every cookie |
| Minimisation | DTOs expose only what the screen needs; SSE carries ids, no balances; logo requests carry only a verified merchant domain | Formal data inventory and retention schedule |
| Encryption at rest | Not configured (container volumes) | Database, backup and volume encryption with managed keys |
| Database access | Bound to `127.0.0.1` in dev; app credentials generated | Private network, least-privilege roles, access auditing |
| Logging | Secrets/tokens must not be logged (rule); no automated redaction tests | Central logging with redaction, access control and retention |
| Backups / recovery | **None** | Encrypted backups, PITR, restore drills |

## 7. API security

| Control | Status |
| --- | --- |
| Authentication | Every `/api/**` route requires a valid JWT (`anyRequest().authenticated()`); only `/actuator/health` (and, in dev, metrics/OpenAPI) are public |
| Authorisation | Ownership predicate in each query; unknown identity gets 403 |
| Input validation | Jakarta Bean Validation on request records, plus service checks and database constraints; market symbols validated against a server-side allow-list |
| CORS | Single allowed origin (`APP_ALLOWED_ORIGIN`), methods `GET, POST, PATCH, OPTIONS`, headers `Authorization, Content-Type, Idempotency-Key` |
| CSRF | Disabled by design: the API is stateless and accepts **only** the `Authorization` header (no cookie authentication). Re-evaluate if cookies are ever used for API authentication |
| Rate limiting | Per-customer limits on card commands/issuance, SSE connection caps, market-provider credit limiter. **No API-wide, login or IP-based rate limiting and no WAF** |
| Error handling | Responses use generic messages (`server.error.include-message: never`); no stack traces or SQL to clients |
| Audit logging | Transfers and card changes (append-only). No general access log policy |
| Browser headers | **No CSP, frame-ancestors, referrer or permissions policy configured yet** |
| Actuator / Swagger | Prometheus and Swagger are enabled in the `dev` profile only and must be network-restricted elsewhere |

## 8. Dependency and supply-chain security

Required practices (**most are not automated yet**):

* Dependency scanning for npm and Maven, and automated update PRs *(not configured)*.
* Container image scanning for the base images and built images *(not configured; ECR scan-on-push is declared in Terraform only)*.
* Secret scanning in CI and pre-commit *(not configured)*.
* Static analysis for Java and TypeScript *(not configured)*.
* **Known dependency findings (Trivy image scan, HIGH/CRITICAL with a published fix):** the backend previously carried 14 (Tomcat embed 10.1.55, Jackson 2.21.4, PostgreSQL JDBC 42.7.11); these were fixed by overriding patch versions in `backend/pom.xml` (`tomcat.version`, `jackson-bom.version`, `postgresql.version`) and the 76 backend tests were re-run. **Two CRITICAL Spring Framework 6.2.19 advisories remain unresolved** (CVE-2026-47884, XSLT-view path handling; CVE-2026-47890, SSE with views): the fix exists only in Spring Framework 7, and Spring Framework 6.2.19 / Spring Boot 3.5.16 are the final releases of their lines, so closing them means migrating to Spring Boot 4. FINIX uses no views, XSLT or template engines (REST/JSON only; SSE emits plain JSON events), so exposure appears limited, but that has **not** been confirmed against the full advisories. Treat this as an open risk ([RISK.md](RISK.md), INFRA-07).
* CI today (`.github/workflows/ci.yml`) runs typecheck, build, UI tests, `mvn test` and image builds; scanning runs in `.github/workflows/security.yml`. **No workflow has ever executed on GitHub** (the account was billing-locked) so none of this has been validated in Actions. Add the controls above as required checks, pin and review new dependencies, and keep licences in view ([LICENSE.md](LICENSE.md)).

## 9. Incident response

**Status: no operational incident-response capability exists** (no on-call, alerting, runbooks or tabletop exercises). The framework to adopt:

1. **Identify:** detect and confirm an incident (monitoring alerts, reports, anomalous audit data).
2. **Contain:** revoke sessions/refresh tokens, rotate affected secrets (`scripts/rotate-secret.sh`), disable the affected feature or route, isolate hosts.
3. **Investigate:** preserve logs and database state, use the immutable ledger/audit history to scope impact, find root cause.
4. **Recover:** fix, redeploy, restore from backup if needed, post corrective ledger journals (never edit history), verify with the test suites.
5. **Notification assessment:** with qualified advisers, decide whether regulators (for example the ICO under UK GDPR), affected customers or partners must be told, and within what time limits. This is **not** assessed automatically.
6. **Review:** blameless post-incident review, update [RISK.md](RISK.md), tests and runbooks.

## 10. Production readiness

FINIX **must not be treated as production-ready**. Known blocking gaps:

* No regulatory authorisation, compliance evidence or legal review ([RISK.md §3.6](RISK.md#36-compliance-uk)).
* No HTTPS/TLS termination, secure-cookie review, HSTS, CSP or other browser security headers.
* No MFA, step-up for transfers, account recovery hardening or fraud/AML/sanctions controls; Keycloak realm is a development realm with a demo user.
* No backups, PITR, disaster recovery, encryption at rest, HA or monitoring/alerting.
* No secret manager; secrets are local `.env` files.
* No dependency, image, secret or static-analysis scanning in CI; no penetration test or independent code review.
* No API-wide rate limiting, WAF or bot protection.
* Outbox dispatcher and multi-instance event delivery are not implemented.
* Terraform provisions only ECR repositories and a log group; networking, database, load balancer, IAM and logging are not defined.
* Data-protection process (privacy notice approval, retention, DSAR, breach handling) is not in place.

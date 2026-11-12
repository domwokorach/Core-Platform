# FINIX Risk Register

> **Purpose:** a candid register of the financial, security, operational and compliance risks of FINIX, what mitigates them **today**, and what is still missing.
> **Status:** an engineering self-assessment by the development team. It is **not** a formal risk assessment, audit or legal opinion, and nothing here is evidence of regulatory compliance.
> **Related:** [Security Policy](SECURITY.md) · [Development Rules](RULE.md) · [README](README.md#project-limitations)

## 1. Development sandbox versus production financial platform

| | FINIX today (development sandbox) | A production financial platform |
| --- | --- | --- |
| Money | Fictional; no external payments, no real funds | Real customer funds, safeguarding, settlement and reconciliation with banks/schemes |
| Customers | Seeded and self-registered test identities | Verified customers (KYC/AML), onboarding, vulnerability and complaints handling |
| Authorisation | None; **FINIX is not a licensed bank or payment institution** | Appropriate regulatory permissions for the activities carried out |
| Operations | Single developer environment, no SLAs | Resilient hosting, monitoring, on-call, incident and change management, tested DR |
| Security assurance | Self-tested controls, no independent review | Penetration tests, code review, certifications as required, continuous monitoring |
| Data | Fictional data | Personal and financial data under UK GDPR with retention, access and breach processes |

Everything below should be read with that gap in mind. Moving beyond the sandbox requires qualified legal, compliance, security and operations professionals.

## 2. Method

* **Likelihood** and **Impact**: Low / Medium / High. **Severity** = the combination (High+High = Critical; High+Medium = High; Medium+Medium or High+Low = Medium; otherwise Low).
* Ratings describe the risk **if FINIX were run as a real service** unless stated; "Residual" is the rating after the mitigations that exist in the repository **today**.
* **Responsible role** is a role, not a named person. Roles are placeholders until the owner assigns them.
* **Review status:** `Open` = not yet reviewed by the responsible role; `Gap` = mitigation not implemented. No risk has been formally accepted.
* Evidence references point at code or tests in this repository; they are what was verified, not a guarantee.

## 3. Risk register

### 3.1 Financial

| ID | Risk | Likelihood | Impact | Severity | Mitigation in place / needed | Responsible | Residual | Review |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FIN-01 | Incorrect ledger balances | Medium | High | High | Balances derived from entries; constraint triggers force zero-sum, single-currency journals; immutability triggers; transfer integration tests. *Needed:* independent reconciliation job | Engineering lead | Medium | Open |
| FIN-02 | Double spending (concurrent debits) | Medium | High | High | Customer row lock serialises transfers in one transaction; funds checked inside the lock; concurrency tests. *Needed:* multi-account/ordered-locking design before cross-customer transfers | Engineering lead | Low–Medium | Open |
| FIN-03 | Duplicate transfers (retries, double clicks) | High | Medium | High | `Idempotency-Key` unique per customer and bound to payload; replay returns the original receipt; UI guards double submits | Engineering lead | Low | Open |
| FIN-04 | Transaction inconsistency between ledger, audit, outbox, events | Low | High | Medium | Ledger, transfer, audit and outbox written in one transaction; SSE sent after commit only. *Gap:* outbox dispatcher does not exist | Engineering lead | Medium | Gap |
| FIN-05 | Failed or absent reconciliation (no external system yet) | Medium | High | High | None beyond internal ledger invariants. *Needed:* daily reconciliation against settlement/bank statements before any real money | Finance / Operations | High | Gap |
| FIN-06 | Currency mismatch or mislabelled amounts | Low | High | Medium | GBP-only policy in service and database (`V3`); amounts in integer pence; foreign-currency market quotes never relabelled as £; unit tests | Engineering lead | Low | Open |
| FIN-07 | Financial data loss | Low | High | Medium | PostgreSQL durability and volumes only. *Gap:* no backups, point-in-time recovery or restore drills | DevOps lead | High | Gap |

### 3.2 Authentication and authorisation

| ID | Risk | Likelihood | Impact | Severity | Mitigation in place / needed | Responsible | Residual | Review |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-01 | Account takeover (credential stuffing, phishing) | Medium | High | High | Keycloak brute-force protection enabled (dev realm), generic error messages. *Needed:* MFA/passkeys, risk-based step-up, breach-password checks | Security lead | High | Gap |
| AUTH-02 | Weak passwords | Medium | Medium | Medium | Realm policy `length(10)`, not username, not e-mail. *Needed:* review against current NCSC/NIST guidance, denylist | Security lead | Medium | Open |
| AUTH-03 | Stolen or replayed JWT | Medium | High | High | Short access tokens, signature/issuer/audience/`azp`/expiry checks, PKCE, tokens never in URLs or logs, tokens kept in `sessionStorage` (readable by script). *Needed:* CSP, BFF with HttpOnly cookies, token binding/rotation policy | Security lead | Medium | Open |
| AUTH-04 | Misconfigured Keycloak (dev realm in production, open registration, demo user) | Medium | High | High | Dev realm file contains a demo user and relaxed settings; docs forbid reuse. *Needed:* separate hardened production realm, SMTP, admin lock-down, config-as-code review | Security lead / DevOps | High | Gap |
| AUTH-05 | Session expiry failures or redirect loops | Medium | Low | Low | Expiry recovery, no auto-restart after errors, tests for expired attempts and sessions | Engineering lead | Low | Open |
| AUTH-06 | Authorisation bypass (reading another customer's data) | Low | High | Medium | Ownership predicate in every query keyed on `sub`; tests that new customers see no foreign data; unknown identity gets 403. *Needed:* automated cross-tenant test suite for every endpoint | Engineering lead | Low–Medium | Open |
| AUTH-07 | Development shortcuts reaching production (demo sign-in, credentials card) | Low | High | Medium | Demo sign-in requires `NODE_ENV=development` and a server flag, returns 404 otherwise; credentials card lives only in the separate dev theme; tests check production builds. *Needed:* CI check that production images contain neither | Security lead | Low | Open |

### 3.3 Data security

| ID | Risk | Likelihood | Impact | Severity | Mitigation in place / needed | Responsible | Residual | Review |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DATA-01 | Customer data exposure through API or UI | Low | High | Medium | Ownership scoping, minimal DTOs, no balances in events or card payloads, error messages sanitised | Engineering lead | Medium | Open |
| DATA-02 | Database compromise | Low | High | Medium | Credentials generated and kept out of Git; DB bound to localhost in dev. *Gap:* encryption at rest, network isolation, least-privilege DB roles, audit of DB access | DevOps lead | High | Gap |
| DATA-03 | Leaked API keys (Twelve Data, Alpaca, Logo.dev) | Medium | Medium | Medium | Backend-only keys, `.env` git-ignored, only publishable Logo.dev key in browser (secret `sk_` keys refused). *Needed:* secret scanning, rotation runbook | Security lead | Medium | Open |
| DATA-04 | Excessive logging of sensitive data | Medium | Medium | Medium | Rules forbid logging tokens/secrets; provisioning logs contain no claims. *Gap:* no log-redaction tests or central log policy | Engineering lead | Medium | Open |
| DATA-05 | Insecure or missing backups | Medium | High | High | None implemented | DevOps lead | High | Gap |
| DATA-06 | Secrets committed to Git | Medium | High | High | `.gitignore` for `.env*`, generated secrets, `.env.example` names only. *Gap:* no secret scanning in CI or pre-commit; history not audited | Security lead | Medium | Gap |

### 3.4 Infrastructure and operations

| ID | Risk | Likelihood | Impact | Severity | Mitigation in place / needed | Responsible | Residual | Review |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| INFRA-01 | Docker / Compose misconfiguration (exposed ports, root volumes, wrong env) | Medium | Medium | Medium | Ports bound to 127.0.0.1, health checks, required variables fail fast. Known sharp edges documented (volume ownership, duplicate `.env` keys) | DevOps lead | Medium | Open |
| INFRA-02 | Database outage | Medium | High | High | Single PostgreSQL container. *Gap:* HA, failover, monitoring | DevOps lead | High | Gap |
| INFRA-03 | Services unavailable (Keycloak, API) | Medium | Medium | Medium | Health checks, user-facing "unavailable" states, safe retry. *Gap:* alerting, redundancy | DevOps lead | Medium | Open |
| INFRA-04 | Inadequate backups | Medium | High | High | See DATA-05 | DevOps lead | High | Gap |
| INFRA-05 | No disaster-recovery plan or RPO/RTO | Medium | High | High | None | DevOps lead | High | Gap |
| INFRA-06 | Cloud misconfiguration | Low | High | Medium | Terraform creates only ECR repositories (scan-on-push, encryption) and a log group; **no production workload is defined**. *Needed:* full reviewed IaC, remote state, least-privilege IAM | DevOps lead | Medium | Gap |
| INFRA-07 | Vulnerable dependencies or images | Medium | High | High | Scanning workflows are defined (`security.yml`: Gitleaks, npm audit, Trivy, dependency review) but have never run on GitHub. A local Trivy scan found 14 fixable HIGH/CRITICAL backend findings, 12 fixed by patch-level overrides; **2 CRITICAL Spring Framework 6.2.19 advisories remain** (fix only in Spring Framework 7 / Spring Boot 4). *Gap:* no SAST | Security lead | High | Open |

### 3.5 API and integrations

| ID | Risk | Likelihood | Impact | Severity | Mitigation in place / needed | Responsible | Residual | Review |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | Missing authorisation on a new endpoint | Medium | High | High | `anyRequest().authenticated()` by default; rules require ownership checks; tests for JWT rules. *Needed:* review checklist and per-endpoint negative tests | Engineering lead | Medium | Open |
| API-02 | Rate-limit exhaustion / abuse | Medium | Medium | Medium | Per-customer limits on card commands and issuance, SSE connection caps, market credit limiter. *Gap:* no API-wide or login rate limiting, no WAF | Engineering lead | Medium | Gap |
| API-03 | Third-party API failure (market data, paper trading, logos) | High | Low | Medium | Fail-safe design: structured errors, never invented values, logos purely cosmetic | Engineering lead | Low | Open |
| API-04 | Stale market data presented as live | Medium | Medium | Medium | Freshness labels; "Live" only if entitlement confirmed, market open and quote recent; USD never relabelled as £ | Engineering lead | Low | Open |
| API-05 | Duplicate requests on money-moving calls | High | Medium | High | See FIN-03 | Engineering lead | Low | Open |
| API-06 | Unreliable event delivery | Medium | Low | Low | SSE is a non-durable hint; clients re-read REST on reconnect. *Gap:* no multi-instance fan-out or outbox relay | Engineering lead | Medium | Gap |
| API-07 | Missing browser security headers (CSP, frame, referrer policy) | Medium | Medium | Medium | None configured in `next.config.ts` | Security lead | Medium | Gap |

### 3.6 Compliance (UK)

Applicability depends on what FINIX would actually do, for whom, and in which legal structure. **Each item below needs review by qualified specialists (legal, compliance, data protection) before any real-world use; this register does not state that any requirement applies or is met.**

| ID | Topic | Why it may matter | Status in repository | Responsible | Review |
| --- | --- | --- | --- | --- | --- |
| COMP-01 | **UK GDPR and Data Protection Act 2018** | Customer names, e-mail, identifiers and transaction data are personal data | No lawful-basis analysis, privacy notice approval, retention schedule, DPIA, DSAR or breach process. The `/privacy` and `/terms` pages (`frontend/content/`) are drafts marked "not legal advice" with items flagged for legal sign-off | Data protection lead / DPO | Gap |
| COMP-02 | **FCA authorisation** | Accepting deposits, e-money, payments or lending can be regulated activity | Not authorised; FINIX must not be presented as a bank or regulated service | Compliance / legal | Gap |
| COMP-03 | **Payment Services Regulations (where applicable)** | Executing payments, strong customer authentication, safeguarding, incident reporting | Only internal ledger transfers between a customer's own accounts; no SCA design | Compliance / legal | Gap |
| COMP-04 | **AML / KYC / sanctions (where applicable)** | Onboarding checks, monitoring, reporting | Not implemented; self-registration creates an identity with **no accounts** | Compliance (MLRO role) | Gap |
| COMP-05 | **PCI DSS (if card data is involved)** | Storing/processing PAN, CVV or cardholder data | Sandbox cards hold **no PAN/CVV**; keep it that way, or design a tokenised approach with a certified provider | Security lead | Open |
| COMP-06 | **Market-data and trademark licensing** | Redistributing quotes; using brand logos and Visa marks | Third-party quote terms and Logo.dev terms must be reviewed; Visa branding disabled by default; merchant logos are third-party trademarks ([COPYRIGHT.md](COPYRIGHT.md)) | Product owner / legal | Open |
| COMP-07 | **Accessibility (Equality Act / WCAG)** | Public-facing UI | AA targeted, partly automated; incomplete manual testing ([DESIGN.md](DESIGN.md#13-accessibility-wcag-22-aa-target)) | Product owner | Open |

## 4. Mitigation lifecycle for major risks

| Risk area | Prevention | Detection | Response | Recovery | Verification |
| --- | --- | --- | --- | --- | --- |
| **Ledger integrity** (FIN-01/02/04) | Single posting service, balanced-journal and immutability triggers, row locking | Periodic reconciliation and invariant queries *(to build)*; failing constraint errors in logs | Freeze affected accounts, stop posting, investigate from immutable history | Post corrective balancing journals; restore from backup if corruption | `TransferIntegrationTest`, concurrency tests, DB trigger tests |
| **Duplicate money movement** (FIN-03/API-05) | Customer-scoped idempotency keys bound to payload | Conflict (409) rates, duplicate-reference alerts *(to build)* | Reverse by corrective journal, notify customer | Same | Idempotency tests (replay and conflict) |
| **Account takeover / token theft** (AUTH-01/03) | PKCE, short tokens, brute-force protection, generic errors; add MFA | Keycloak events, anomalous sign-in alerts *(to build)* | Revoke sessions/refresh tokens, force password reset, rotate keys | Re-verify identity, audit activity | Auth Playwright suites, `JwtValidationTest` |
| **Authorisation bypass** (AUTH-06/API-01) | Ownership predicate, default-deny security chain | Audit events, access-denied metrics *(to build)* | Disable endpoint, patch, review logs | Notify affected customers per policy | Cross-customer tests, provisioning tests |
| **Data exposure / secret leak** (DATA-01/03/06) | `.env` outside Git, backend-only keys, minimal DTOs, log hygiene | Secret scanning, log review *(to build)* | Rotate affected secrets (`scripts/rotate-secret.sh`), purge Git history | Re-issue credentials, review blast radius | Generated-secret tests; static checks that bundles contain no secrets |
| **Database loss / outage** (FIN-07/INFRA-02/04/05) | Backups, PITR, HA *(to build)* | Health checks, replication lag alerts *(to build)* | Fail over or restore | Restore drills with measured RPO/RTO | Scheduled restore tests *(to build)* |
| **Third-party failure** (API-03/04) | Timeouts, retries, credit limits, no invented data | Provider status endpoint (`/api/market/status`) | Degrade to "unavailable" | Automatic on provider recovery | Mock-server tests for 401/404/429/network failure |
| **Compliance** (COMP-*) | Do not present as regulated; keep scope to sandbox | Legal/compliance review milestones | Stop affected activity | Remediate with specialists | Documented sign-off by qualified reviewers *(none exists)* |

## 5. Review cadence

Review this register before any change in scope (real money, real customers, public hosting), after any security incident, and at least quarterly once the project has an owner. Record each review in Git history with the reviewer role and outcome. **No formal review has taken place yet.**

# FINIX Engineering Rules

> **Purpose:** the binding engineering rules for everyone (people and AI coding agents) changing the FINIX Core Banking Platform. These rules protect the ledger, customer data and the authentication model.
> **Related:** [README](README.md) · [Design System](DESIGN.md) · [Risk Register](RISK.md) · [Security Policy](SECURITY.md)

**Priority when rules conflict:** security and ledger integrity first, then correctness, then user experience, then convenience. A rule may only be relaxed by an explicit, documented decision of the project owner; local-development convenience is never a reason.

## 1. Architecture rules

1. **Preserve the modular monolith.** One deployable Spring Boot application with packages per module (`accounts`, `ledger`, `transfers`, `cards`, `market`, `trading`, `merchants`, `auth`, `events`, `api`, `config`). Do not split into services or add a message broker without a documented decision.
2. **Keep module boundaries.** A module calls another module only through its service or repository API. Controllers never contain business rules and never touch another module's tables directly.
3. **The ledger is authoritative.** Balances are derived from `ledger_entries`; there is no mutable balance column and none may be added. See [README → Banking functionality](README.md#banking-functionality).
4. **Never bypass the ledger.** Only `LedgerService` posts journals. No controller, repository, migration, script or test fixture outside the ledger module may insert, change or delete ledger rows (seed migrations in `db/demo` are the documented dev-only exception, and they post balanced journals).
5. **Financial operations run in one database transaction.** A journal, its entries, the transfer record, the audit event and the outbox event commit together or not at all.
6. **Money-movement requests must be idempotent.** `POST /api/transfers` and card issuance require an `Idempotency-Key`, scoped to the customer and bound to the request payload. Reusing a key with different details is a conflict, never a second posting.
7. **The frontend never changes balances.** It displays server data and sends requests. No client-side arithmetic may be shown as an authoritative balance.
8. **Ledger history is immutable.** Posted journals, entries, transfers and audit events are never updated or deleted (database triggers enforce this). Corrections are new, balancing journals.
9. **Events describe, never carry, financial data.** SSE notices contain ids and reasons only; clients re-read REST endpoints. Notify only after commit.
10. **Optional integrations must fail safely.** Market data, paper trading and logos must never affect ledger operations; failures degrade to labelled "unavailable" states, never invented values.

## 2. Java rules

* Java 21 and the Spring Boot version in `backend/pom.xml`; follow Spring Boot conventions.
* **Constructor injection only**; no field injection, no static service locators.
* Validate input at the boundary with Jakarta Bean Validation (`@NotNull`, `@Min`, `@Size`…) and re-check business invariants in the service.
* Keep controllers thin: map HTTP to a service call and a response. Business rules belong in domain services (`TransferService`, `CardService`, …).
* Use SQL constraints as the last line of defence (CHECK, UNIQUE, foreign keys, triggers) in addition to service checks.
* Handle errors consistently: `ResponseStatusException`/the module's exception types, translated by the existing error handlers; never leak stack traces, SQL or tokens in responses (`server.error.include-message: never`).
* Money is `long` pence (`amountMinor`). Never use `double`/`float` for money.
* Never log secrets, tokens, passwords, full request bodies or personal data.
* Time: store `timestamptz`; display civil time in `Europe/London`.

## 3. TypeScript and frontend rules

* `strict` TypeScript. Avoid `any`; use `unknown` and narrow, or define a type in `frontend/types/`.
* API contracts are typed (`types/*.ts`, `lib/api/*`) and validated with Zod where input is untrusted.
* **Separate server state from UI state:** TanStack Query for API data, React state for UI-only concerns. Do not copy API data into local state.
* Prefer existing shadcn/ui components and the tokens in `app/globals.css`; add a new component only when none fits ([DESIGN.md](DESIGN.md)).
* Components must be accessible: labels, focus order, visible focus, ARIA only where native semantics are insufficient, `prefers-reduced-motion` respected.
* Only browser-public values may use `NEXT_PUBLIC_*`. Server-only code lives under `frontend/lib/server/` and `app/api/`.
* Format money only with the helpers in `lib/utils/format.ts` (`en-GB`, GBP, two decimals, correct sign).
* No tokens in URLs, `localStorage` or logs. OIDC state lives where `oidc-client-ts` puts it (`sessionStorage`).

## 4. Database rules

* PostgreSQL 16 only. **All schema changes go through Flyway migrations** (`backend/src/main/resources/db/migration`). Never edit an applied migration; add a new version.
* `db/demo` holds fictional dev-profile seed data only and must never run in other profiles.
* Amounts are `BIGINT` integer minor units (pence). Currency is `CHAR(3)`; GBP is the only supported currency.
* Do not delete or rewrite customer financial history. "Closing" is a status, not a delete.
* Every customer-owned table is queried through the owner's identity (`oidc_subject` → customer id). New queries without an ownership predicate are rejected in review.
* Add constraints and indexes with the migration; justify any trigger.
* Never run `scripts/reset-dev-db.sh` or remove Docker volumes (`down -v`) against data you need.

## 5. Security rules

1. **Keycloak is the only authentication system.** Do not add another password store, a custom login endpoint, the OAuth password grant, or "temporary" bypasses. (The development demo sign-in is a UI-fixture switch that issues no token and exists only under `FINIX_DEMO_AUTH` in development; do not extend it.)
2. **Spring Security validates every JWT:** signature (Keycloak JWKS), issuer, expiry/not-before, authorised client and API audience. Never relax issuer validation to fix hostnames; fix the configuration.
3. **Authorise every customer-specific endpoint** and enforce ownership in the query, not only in the UI.
4. **No hard-coded secrets.** Secrets come from the environment (`scripts/setup-env.sh` generates local ones). Never commit `.env` files with real values; `.env.example` holds names only.
5. **No secrets in the browser:** nothing sensitive in `NEXT_PUBLIC_*`, bundles, logs, screenshots or test fixtures committed to Git.
6. **Do not weaken a control to make local development easier.** If a control blocks you, fix the cause or ask the owner.
7. Third-party API keys are backend-only (market data, paper trading). Only publishable, designed-for-browser keys (Logo.dev `pk_…`) may reach the client, and a secret-looking key must be refused.
8. Development-only features stay isolated (dev profile, dev theme, server flag) and must be provably absent from production builds.

## 6. Code quality

* Meaningful names; small, testable functions; early returns; no dead code.
* Explicit, user-safe error handling; no silent `catch`.
* No new dependency without a clear need, a licence check ([LICENSE.md](LICENSE.md)) and a note in the pull request.
* Tests accompany behaviour changes: backend unit/integration (JUnit + Testcontainers) and Playwright for user-visible flows. Bug fixes get a regression test.
* Accessible, responsive UI at 375, 768, 1024, 1440 px.
* **Documentation must match the code.** Update the README/`DESIGN.md`/`SECURITY.md` in the same change; never document an unverified feature as working.
* British English and GBP (£) in user-facing text and examples.

## 7. Definition of done

A change is done when: it builds (`npm run typecheck`, `npm run build`, `mvn test`), relevant Playwright suites pass, new behaviour has tests, no secret or personal data is added, ownership/authorisation are verified, documentation is updated, and the author has reported honestly what was and was not verified.

## 8. Instructions for AI coding agents

Follow this sequence for every task:

1. **Inspect first.** Read the relevant code, migrations, tests and docs. Do not rely on memory of how the project "usually" works.
2. **Identify dependencies** (other modules, tests, Docker/Keycloak configuration, documentation).
3. **Preserve working behaviour.** Do not refactor unrelated code, rename public contracts or reformat files you do not need to change.
4. **Make the smallest safe change** that satisfies the request.
5. **Add or update tests** that would fail without the change.
6. **Verify by running** the relevant commands. **Never claim something works without having run it**; say what you ran and what its output was.
7. **Report** what changed, what was verified, what failed or was skipped, and any limitation.

Additional agent rules:

* Do not touch the ledger, authentication, migrations or security configuration unless the task requires it; if it does, say so first.
* Do not delete data, Docker volumes, branches or files you did not create without explicit permission. Look at a target before overwriting it.
* Never print, copy into documents, or commit secrets. Treat `.env` contents as confidential.
* Do not stop or restart processes you did not start without permission.
* If the repository contains concurrent edits by someone else, do not overwrite them; integrate or report the conflict.
* Do not invent features, test results, licences, legal entities, regulatory status or contact details. Mark unknowns as pending.
* If an instruction would weaken security or ledger integrity, stop and explain instead of complying silently.

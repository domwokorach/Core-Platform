# FINIX Roadmap

> **Purpose:** the intended direction of the project. These are **proposals, not commitments or dates**, and none is implemented unless the [README](README.md#project-limitations) says so.
> **Related:** [Risk Register](RISK.md) · [Security Policy](SECURITY.md#10-production-readiness) · [Contributing](CONTRIBUTING.md)

## Near term: hardening the sandbox

* Get CI running and green on GitHub (an account billing lock currently prevents any workflow from starting).
* Browser security headers (CSP, frame, referrer policy) and API-wide rate limiting.
* Dependency, image and secret scanning as required checks (workflows exist; enable branch protection).
* Cross-customer authorisation test suite for every endpoint.
* Manual accessibility pass across all screens.

## Next: banking features

* Outbox dispatcher with leases, retries and poison-message handling; multi-instance event delivery.
* Onboarding that opens accounts for newly registered customers.
* Persisted savings goals and statements/exports.
* MFA/passkeys and step-up authentication for transfers.

## Later: toward production (requires specialists)

* Hardened production Keycloak realm, TLS, secret manager, managed PostgreSQL with backups and PITR, monitoring and alerting, disaster-recovery drills.
* Reconciliation against external statements, fraud and AML controls.
* Legal, regulatory and data-protection review before any real customer or money is involved ([RISK.md](RISK.md#36-compliance-uk)).
* Choose and apply a software licence ([LICENSE.md](LICENSE.md)).

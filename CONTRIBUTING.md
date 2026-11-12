# Contributing to FINIX

> **Purpose:** how to propose, build, test and submit changes to the FINIX Core Banking Platform.
> **Read first:** [Development Rules](RULE.md) (binding), [Security Policy](SECURITY.md), [Design System](DESIGN.md), [README](README.md).

FINIX is a development sandbox, **not** a licensed or production financial service. Never use real customer data, real credentials or real money anywhere in this repository.

## Licensing of contributions

No licence has been selected yet ([LICENSE.md](LICENSE.md)). Until the owner chooses one and a contribution policy, only submit work you have the right to contribute, and expect the owner to confirm terms before merging significant contributions.

## Getting started

```bash
bash scripts/setup-env.sh                                      # generates local secrets (git-ignored)
docker compose -f docker-compose.yml -f docker-compose.full.yml up --build -d
```

Local (non-Docker) development, environment variables and troubleshooting are in the [README](README.md#local-development).

## Workflow

1. Open an issue (use a template) or comment on an existing one before large changes.
2. Branch from `master`: `feature/<short-name>`, `fix/<short-name>`, `docs/<short-name>`.
3. Make the **smallest safe change**; keep unrelated refactors out of the pull request.
4. Add or update tests; update documentation in the same change.
5. Open a pull request using the template and fill in the verification section honestly.
6. Address review comments; the owner merges.

Commit messages: imperative, concise subject (`fix: reject non-GBP transfers`), body explaining *why* when it is not obvious. Conventional prefixes (`feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `ci`) are encouraged.

## Before you open a pull request

| Check | Command |
| --- | --- |
| Frontend types | `cd frontend && npm run typecheck` |
| Frontend build | `cd frontend && npm run build` |
| Backend tests (Docker needed) | `cd backend && mvn test` |
| UI tests (sample data) | `cd frontend && npx playwright test --project=chromium` |
| Authentication tests (full Docker stack) | `cd frontend && npx playwright test --project=auth-desktop --project=auth-ui` |
| No secrets | Never commit `.env*` with real values; run `gitleaks detect` if installed |

State in the pull request which of these you ran and what happened. Do not describe something as working unless you verified it.

## Rules of thumb (see [RULE.md](RULE.md))

* Never bypass the ledger or change posted entries; money is integer pence; money movements are idempotent.
* Keycloak is the only authentication system; do not weaken JWT validation or ownership checks for convenience.
* No secrets in code, logs, screenshots or `NEXT_PUBLIC_*` variables.
* Schema changes only through new Flyway migrations.
* Accessible, responsive UI that follows the design tokens.

## Reporting security issues

**Do not open a public issue.** Follow [SECURITY.md](SECURITY.md#2-reporting-a-vulnerability).

## Versioning strategy

FINIX follows [Semantic Versioning](https://semver.org/) while it is **pre-1.0**:

* `0.MINOR.PATCH`. While below `1.0.0`, minor versions may contain breaking changes (called out in the changelog).
* Development previews carry a `-dev` suffix (for example `v0.1.0-dev`) and are published as **GitHub pre-releases**. A version without a suffix is not a claim of production readiness; `1.0.0` will not be used until the [production-readiness gaps](SECURITY.md#10-production-readiness) are closed.
* Git tags are `vX.Y.Z[-dev]`. Container images (if ever published, see below) use the version tag plus `sha-<short commit>`.
* Every release updates [CHANGELOG.md](CHANGELOG.md) (Keep a Changelog format).
* Releases are cut by the owner only after: build, Docker start-up, authentication and ledger tests pass, documentation is current, no secrets are committed, and known defects are listed rather than hidden.

## Optional container images

`.github/workflows/publish-images.yml` can publish `ghcr.io/<owner>/core-platform-backend` and `…-frontend` to GitHub Container Registry. It is **manual, optional and approval-gated** (environment `ghcr-publish`), uses only the workflow `GITHUB_TOKEN`, scans images first, and is never required for local Docker development. Images must never contain secrets.

## Roadmap

See [ROADMAP.md](ROADMAP.md). Items there are intentions, not commitments.

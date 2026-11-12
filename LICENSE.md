# FINIX Licensing

> **Purpose:** to state the licensing position of the FINIX Core Banking Platform source code and to record the licences of the third-party software it depends on.
> **Related:** [Copyright](COPYRIGHT.md) · [Security Policy](SECURITY.md) · [README](README.md)

## 1. Status: **LICENSE SELECTION PENDING**

**No open-source or commercial licence has been selected for the FINIX source code.**

Repository inspection found no `LICENSE` text file, no `license` field in `frontend/package.json` or `backend/pom.xml`, no per-file copyright headers, and no written instruction from an owner about licensing.

Consequences until a licence is chosen:

* **Publishing, sharing or hosting this repository does not grant anyone permission** to use, copy, modify, distribute, sublicense or sell the FINIX code. Unless and until the owner grants permission in writing, all rights are reserved by the copyright holder, subject to applicable law.
* Contributors should not assume any licence applies to their contributions; see [Contributions](#4-contributions).
* Nothing in this repository is a legal offer, warranty or statement of fitness for any purpose. FINIX is a development sandbox and **must not be used to hold or move real money** ([RISK.md](RISK.md)).

## 2. Project-owner decision required

> ⚠️ **ACTION REQUIRED, project owner approval needed before choosing a licence.**

| Question | Answer (to be completed by the owner) |
| --- | --- |
| Legal owner / licensor of the FINIX code | `[Confirm legal owner]` |
| Intended model | `[ ] Proprietary / all rights reserved   [ ] Open source (name licence)   [ ] Source-available` |
| If open source: which licence (e.g. a permissive licence or a copyleft licence) and why | `[Pending]` |
| Do any contributors, employers or clients hold rights that must be cleared first? | `[Pending]` |
| Is any code, design or asset included from sources that restrict redistribution? | `[Pending]` (see [COPYRIGHT.md](COPYRIGHT.md)) |
| Approved by / date | `[Pending]` |

Legal advice is recommended before choosing, particularly because dependencies with different licences are combined (see §3) and because the product concerns financial services.

**When a licence is selected:**

1. Place the **complete, official text** of the chosen licence in a standard file (for example `LICENSE` or `LICENSE.txt`) at the repository root. Do not paraphrase or edit licence text.
2. Update this document to name the licence and link to that file, and remove the "pending" status.
3. Add `license` metadata to `frontend/package.json` and `backend/pom.xml`.
4. Update [COPYRIGHT.md](COPYRIGHT.md) with the confirmed owner and years, and add per-file headers only if the chosen licence or policy calls for them.

Do not invent a legal entity, licence holder or licence in the meantime.

## 3. Third-party software

FINIX depends on third-party open-source projects that remain under **their own licences**. Choosing a FINIX licence does not change those. The table lists the principal components and the licence **as publicly documented by each project at the time of writing**. It is a guide, not legal advice: confirm each version's licence with an automated report before distributing anything (suggested tools, **not run as part of this documentation**: `npx license-checker` in `frontend/`, the Maven `license-maven-plugin` in `backend/`).

| Component | Used for | Licence (verify) |
| --- | --- | --- |
| Next.js, React, React DOM | Frontend framework | MIT |
| Tailwind CSS, tailwind-merge, tw-animate-css, class-variance-authority, clsx | Styling utilities | MIT (class-variance-authority: Apache-2.0) |
| Radix UI primitives, shadcn/ui-style components (copied patterns) | Accessible UI primitives | MIT |
| Motion for React | Animation | MIT |
| TanStack Query / Table, React Hook Form, Zod, next-themes, sonner, vaul | Data, forms, theming, toasts, drawers | MIT |
| Recharts | Charts | MIT |
| Lucide React | Icons | ISC |
| Geist font (`geist`) | Typography | SIL Open Font License 1.1 |
| oidc-client-ts | OIDC client | Apache-2.0 |
| Playwright, TypeScript | Tests, language | Apache-2.0 |
| axe-core / @axe-core/playwright | Accessibility testing | MPL-2.0 |
| Spring Boot, Spring Framework, Spring Security, springdoc-openapi | Backend | Apache-2.0 |
| Nimbus JOSE + JWT (via Spring Security) | JWT handling | Apache-2.0 |
| Flyway (community edition) | Migrations | Apache-2.0 |
| PostgreSQL server and JDBC driver | Database | PostgreSQL Licence; JDBC driver BSD-2-Clause |
| Keycloak | Identity provider | Apache-2.0 |
| Testcontainers, JUnit 5 | Backend tests | MIT; EPL-2.0 |
| Docker images: `postgres`, `node`, `eclipse-temurin`, `maven`, Alpine | Runtime/build images | Their respective licences |
| Mailpit | Development mail catcher (separate container) | MIT |
| Prometheus; Grafana (optional monitoring profile) | Metrics (separate containers) | Apache-2.0; **AGPL-3.0** (not redistributed with FINIX; consult counsel before bundling or modifying it) |

Notes:

* Copyleft or weak-copyleft components (MPL-2.0 test tooling, AGPL Grafana, EPL-2.0 JUnit) are used as separate tools or test dependencies, not linked into the shipped application. Re-check this if the distribution model changes.
* Keep a record of exact versions with the build (lock files `package-lock.json` and the Maven dependency tree).

## 4. Contributions

Until a licence and a contribution policy exist, accept contributions only from people who have confirmed in writing that they may contribute them and that the owner may license them under the eventual FINIX licence. The owner should decide whether to adopt a Developer Certificate of Origin or a contributor agreement.

## 5. Trademarks, brands and external services (separate from software licensing)

A software licence **does not** grant trademark, branding or payment-network rights. In particular:

* **FINIX** name and logo: ownership and any registration are unconfirmed ([COPYRIGHT.md](COPYRIGHT.md)).
* **Visa** and other payment-network marks: not licensed to FINIX; Visa artwork is disabled by default and must only be enabled with explicit authorisation and the official assets.
* **Merchant logos** (Netflix, DKNY, Starbucks, KFC) belong to their owners and are loaded from Logo.dev under its terms; no endorsement is implied.
* **Market-data and trading providers** (Twelve Data, Alpaca) and **Logo.dev** are governed by their own terms of service and API licences; those terms, not this document, define permitted use, display and redistribution.
* Fonts, icons and imagery must be used within their licences.

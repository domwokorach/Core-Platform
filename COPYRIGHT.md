# FINIX Copyright and Attribution

> **Purpose:** to record who owns what in the FINIX project, how third-party work and trademarks are acknowledged, and how required notices are maintained.
> **Status:** ownership facts are **unconfirmed** and shown as placeholders. This is not legal advice.
> **Related:** [Licensing](LICENSE.md) · [Security Policy](SECURITY.md) · [README](README.md)

## 1. Software ownership

| Item | Value |
| --- | --- |
| Project | FINIX Core Banking Platform |
| Copyright year | 2026 |
| Copyright holder | `[Confirm legal owner]` |
| Licence | **Selection pending**, see [LICENSE.md](LICENSE.md) |
| Notice to use once confirmed | `Copyright © 2026 [Confirm legal owner]. All rights reserved.` (or the wording that matches the chosen licence) |

No legal entity, trading name or owner has been confirmed from the repository. Until the owner is identified, do not publish a notice naming one.

## 2. Original source code

Authorship and ownership of the FINIX source, documentation, designs and tests depend on who actually created them, any employment, contractor or client agreements, and applicable law. Version-control history records who committed changes but **does not by itself establish ownership**.

The project owner should:

1. Confirm who contributed what, including AI-assisted work, and under which agreements.
2. Record the confirmed owner above and in [LICENSE.md](LICENSE.md).
3. Collect written confirmation from any external contributor before accepting their work.

AI coding assistants were used on parts of this repository. Whether and how such output is protected, and who owns it, depends on law and on the tools' terms; the owner should confirm this as part of the review above.

## 3. Third-party software

FINIX is built on third-party software that is **not original FINIX work** and remains the property of its authors under its own licence. Principal projects:

| Project | Authors / steward | Where it is used |
| --- | --- | --- |
| Next.js | Vercel and contributors | Web application framework |
| React | Meta and contributors | UI library |
| Tailwind CSS | Tailwind Labs and contributors | Styling |
| shadcn/ui and Radix UI | shadcn and WorkOS/Radix contributors | Component patterns and accessible primitives (components in `frontend/components/ui` are adapted from these patterns) |
| Spring Boot, Spring Security | VMware/Broadcom and contributors | Backend |
| PostgreSQL | PostgreSQL Global Development Group | Database |
| Keycloak | Keycloak contributors (CNCF project) | Identity provider |
| Motion, TanStack, Recharts, Zod, React Hook Form, Lucide, Geist and others | Respective maintainers | See [`frontend/package.json`](frontend/package.json) |

Licence terms for each are summarised in [LICENSE.md](LICENSE.md#3-third-party-software). Do not describe third-party code as FINIX's own, and keep upstream licence headers where files are copied or adapted.

## 4. Brands and trademarks

All third-party names, logos and marks belong to their respective owners. Their appearance in FINIX does **not** imply sponsorship, endorsement, partnership or affiliation.

| Mark | Position in FINIX |
| --- | --- |
| **FINIX** name and logo | Used as the project's brand. Ownership, registration status and any clearance searches are **unconfirmed**. Do not claim registered-trademark status (®). |
| **Visa** | Visa artwork is **disabled by default** (`NEXT_PUBLIC_VISA_BRANDING_APPROVED=false`). Enable only with documented authorisation from Visa or an issuer/programme manager and the official brand assets. FINIX cards are sandbox-only and not affiliated with any card network. |
| **Merchant logos** (Netflix, DKNY, Starbucks, KFC) | Retrieved on demand from Logo.dev for verified domains, not stored or altered by FINIX. Marks belong to the respective companies. A trademark notice and a "Logos provided by Logo.dev" attribution are displayed whenever logos are enabled. |
| **Company and stock names** (e.g. Apple, Microsoft, NVIDIA, Netflix tickers on the Investments page) | Used nominatively to identify listed securities in sample market data. No affiliation is implied; quotes are third-party data. |
| **API / service providers** (Twelve Data, Alpaca, Logo.dev, Keycloak, Docker, GitHub, AWS) | Names are marks of their owners. Use of their services is governed by their terms. |

Use brand assets only within the permissions and terms that apply to them, and remove any asset whose permission cannot be shown.

## 5. Attribution and notices process

1. **Inventory.** Generate a dependency/licence report for the frontend and backend at each release (suggested tools in [LICENSE.md](LICENSE.md#3-third-party-software)) and store it with the release.
2. **Review changes.** When adding or upgrading a dependency, check its licence and any attribution or NOTICE requirement before merging; record the decision in the pull request.
3. **Maintain notices.** Where a licence requires reproducing a notice (for example Apache-2.0 `NOTICE` files, SIL OFL font notices), collect them in a `THIRD_PARTY_NOTICES` file shipped with distributions. *This file does not exist yet.*
4. **Visible attributions.** Keep the Logo.dev attribution/trademark footer while logos are enabled, and any attribution that a provider's terms require.
5. **Assets.** Record the source and permission for every logo, icon, font, illustration and image added to the repository (`frontend/public`, Keycloak theme resources).
6. **Takedown.** If an owner objects to the use of a mark or asset, remove it promptly and note the change in the history.

## 6. Open questions

* Who is the legal owner and licensor of FINIX? Does any employer, client or contributor hold rights?
* Is the FINIX name/logo cleared and by whom is it owned?
* Do any brand, font or illustration assets lack a recorded permission?
* Which licence will apply, and is a contributor agreement needed? (see [LICENSE.md](LICENSE.md#2-project-owner-decision-required))

import type { LegalDocument } from "./types";

/**
 * DRAFT — not legal advice. Items marked `review` need business facts or legal sign-off before public release.
 */
export const termsOfService: LegalDocument = {
  title: "Terms of Service",
  subtitle: "Understand the terms governing access to and use of FINIX.",
  lastUpdated: "2026-11-12",
  sections: [
    {
      id: "introduction", title: "Introduction",
      paragraphs: [
        "These Terms govern access to and use of the FINIX Core Banking Platform. FINIX is currently a development sandbox. It is not a licensed bank or regulated financial institution, and nothing on it is a real financial service.",
      ],
      review: "Legal name and registered details of the operating entity.",
    },
    {
      id: "acceptance", title: "Acceptance of terms",
      paragraphs: ["By accessing or using FINIX you agree to these Terms. If you do not agree, do not use the platform."],
    },
    {
      id: "eligibility", title: "Eligibility",
      paragraphs: ["You must be permitted by applicable law to use the platform and be authorised to do so, for example by having been given a sandbox account."],
      review: "Minimum age and any jurisdictional restrictions.",
    },
    {
      id: "registration", title: "Account registration",
      paragraphs: ["Accounts are provisioned through FINIX’s identity service. You agree to provide accurate information and to keep it up to date."],
    },
    {
      id: "security", title: "Authentication and account security",
      paragraphs: [
        "You are responsible for keeping your credentials confidential and for activity under your account. Tell us promptly if you suspect unauthorised access.",
      ],
    },
    {
      id: "permitted-use", title: "Permitted use",
      paragraphs: ["You may use FINIX for lawful evaluation, development and testing purposes in line with these Terms."],
    },
    {
      id: "development-environment", title: "Banking development environment",
      paragraphs: [
        "All accounts, balances, transactions and transfers shown in FINIX are simulated sandbox data. Balances are not real deposits, are not held by any bank, and cannot be withdrawn, spent or converted into money.",
        "Market data and investment views, if shown, are for demonstration only and are not financial advice. If FINIX later becomes a real financial service, separate terms, licensing and disclosures will apply.",
      ],
    },
    {
      id: "transactions", title: "Transactions and transfers",
      paragraphs: [
        "Internal transfers move simulated funds between sandbox accounts and are recorded in a double-entry ledger. Sandbox data may be reset, corrected or removed at any time.",
      ],
    },
    {
      id: "fees", title: "Fees and charges",
      paragraphs: ["No fees are charged for the development sandbox."],
      review: "Applicable only if fees are introduced. Confirm fee schedule for any live service.",
    },
    {
      id: "availability", title: "Service availability",
      paragraphs: ["The sandbox is provided as available, without any guarantee of uptime, continuity or data persistence."],
    },
    {
      id: "intellectual-property", title: "Intellectual property",
      paragraphs: ["The FINIX name, logo, software and content are protected by intellectual property rights. Except as permitted, you may not copy, modify or distribute them."],
      review: "Confirm ownership, licences and third-party attributions.",
    },
    {
      id: "prohibited", title: "Prohibited activities",
      paragraphs: [
        "You must not attempt to gain unauthorised access, disrupt or overload the service, probe or bypass security controls without written permission, use the platform for unlawful purposes, or misrepresent sandbox data as real financial information.",
      ],
    },
    {
      id: "suspension", title: "Suspension and termination",
      paragraphs: ["Access may be suspended or ended at any time, including for breach of these Terms or to protect the service."],
    },
    {
      id: "liability", title: "Liability and legal limitations",
      paragraphs: [
        "To the extent permitted by law, the sandbox is provided “as is” and liability arising from its use is limited.",
      ],
      review: "Counsel must draft the warranty disclaimers and liability limits; enforceable wording varies by jurisdiction.",
    },
    {
      id: "changes", title: "Changes to the terms",
      paragraphs: ["These Terms may be updated from time to time. Continued use after a change means you accept the updated Terms. The “Last updated” date shows the latest revision."],
    },
    {
      id: "governing-law", title: "Governing law",
      paragraphs: ["The governing law and venue for disputes will be stated here."],
      review: "Governing law and jurisdiction are subject to legal confirmation. None have been supplied.",
    },
    {
      id: "contact", title: "Contact information",
      paragraphs: ["Contact details for questions about these Terms will be published here."],
      review: "Contact email and postal address. None have been supplied.",
    },
  ],
};

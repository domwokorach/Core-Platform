import type { LegalDocument } from "./types";

/**
 * DRAFT — not legal advice. Items marked `review` need business facts or legal sign-off before public release.
 */
export const privacyPolicy: LegalDocument = {
  title: "Privacy Policy",
  subtitle: "Learn how FINIX handles personal information and protects your privacy.",
  lastUpdated: "2026-11-12",
  sections: [
    {
      id: "introduction", title: "Introduction",
      paragraphs: [
        "This Privacy Policy explains how personal information is handled when you use the FINIX Core Banking Platform. FINIX is currently a development sandbox; it is not a licensed bank and does not hold real deposits.",
        "Please read this policy together with the Terms of Service.",
      ],
      review: "Legal name of the data controller, registered address and registration number.",
    },
    {
      id: "information-collected", title: "Information collected",
      paragraphs: [
        "FINIX may process information you provide directly, such as your name, email address or username, and information generated when you use the platform, such as account details, transfer instructions and activity records.",
        "Technical information such as browser type, device characteristics and request logs may also be processed to operate and secure the service.",
      ],
      review: "Confirm the complete list of data categories actually collected.",
    },
    {
      id: "how-information-is-used", title: "How information is used",
      paragraphs: [
        "Information is used to provide and operate the platform, authenticate users, display accounts and transactions, process internal transfers, keep the service secure, and diagnose faults.",
      ],
      review: "Confirm purposes and the lawful basis for each purpose, where applicable law requires one.",
    },
    {
      id: "account-authentication", title: "Account and authentication information",
      paragraphs: [
        "Sign-in is handled by a separate secure identity service using standard OpenID Connect. Your password is entered on that service and is not entered on, or stored by, the FINIX sign-in page.",
        "FINIX receives identity details and tokens from the identity service so that it can recognise you and authorise your requests.",
      ],
    },
    {
      id: "financial-data", title: "Financial and transaction data",
      paragraphs: [
        "FINIX records accounts, balances and transfers using a double-entry ledger. In the current development environment this data is sandbox data and does not represent real money.",
      ],
      review: "Describe how real customer financial data will be treated if FINIX becomes a live service.",
    },
    {
      id: "cookies", title: "Cookies and session technologies",
      paragraphs: [
        "FINIX uses browser storage to keep you signed in during a session and to remember preferences such as light or dark theme. These are used to deliver the service rather than for advertising.",
      ],
      review: "Confirm the exact cookies and storage used, and whether any consent notice is required.",
    },
    {
      id: "data-sharing", title: "Data sharing and service providers",
      paragraphs: [
        "Information may be shared with service providers that help operate the platform, such as hosting and identity providers, and where disclosure is required by law.",
      ],
      review: "List the actual service providers and any other recipients.",
    },
    {
      id: "data-security", title: "Data security",
      paragraphs: [
        "Reasonable technical and organisational measures are used to protect information, including token-based authentication and access controls. No system is completely secure, and absolute security cannot be guaranteed.",
      ],
      review: "Do not add certifications or specific controls (for example ISO 27001, PCI DSS) unless verified.",
    },
    {
      id: "data-retention", title: "Data retention",
      paragraphs: [
        "Information is kept only as long as needed for the purposes described in this policy or as required by law.",
      ],
      review: "Specify retention periods for each data category.",
    },
    {
      id: "privacy-rights", title: "Individual privacy rights",
      paragraphs: [
        "Depending on where you live, you may have rights to access, correct, delete or restrict the use of your personal information, to object to processing, and to complain to a data protection authority.",
      ],
      review: "Confirm applicable jurisdictions, rights and how requests are handled and verified.",
    },
    {
      id: "international-transfers", title: "International data transfers",
      paragraphs: [
        "If information is transferred outside your country, appropriate safeguards will be applied where required by law.",
      ],
      review: "Applicable only if data is transferred internationally. Confirm hosting locations and transfer mechanisms.",
    },
    {
      id: "contact", title: "Contact information",
      paragraphs: [
        "Contact details for privacy enquiries will be published here.",
      ],
      review: "Privacy contact email, postal address and any data protection officer details. None have been supplied.",
    },
    {
      id: "changes", title: "Changes to this policy",
      paragraphs: [
        "This policy may be updated from time to time. The “Last updated” date at the top of this page shows when it last changed.",
      ],
    },
  ],
};

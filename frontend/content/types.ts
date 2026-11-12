export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  /** Business-specific detail that must be supplied/confirmed by counsel before publication. */
  review?: string;
}

export interface LegalDocument {
  title: string;
  subtitle: string;
  /** ISO date (YYYY-MM-DD). Update when the content changes. */
  lastUpdated: string;
  sections: LegalSection[];
}

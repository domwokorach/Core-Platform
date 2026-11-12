-- GBP (pence) is the only supported currency. Amounts stay integer minor units (100 pence = £1).
-- New accounts default to GBP and non-GBP accounts are rejected. The constraint is NOT VALID on purpose: it applies to
-- every new/updated row but never rewrites or re-labels immutable historical rows. Any legacy non-GBP data must go through
-- an explicitly approved conversion (documented rate + reconciliation), never a relabel.
ALTER TABLE accounts ALTER COLUMN currency SET DEFAULT 'GBP';
ALTER TABLE accounts ADD CONSTRAINT accounts_currency_gbp_only CHECK (currency = 'GBP') NOT VALID;
-- Journal day boundaries (e.g. monthly totals) follow UK civil time.

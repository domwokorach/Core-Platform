-- Money is always represented as integer minor units, never floating point.
-- Journals and their balanced entries are immutable and posted atomically.
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  oidc_subject VARCHAR(160) NOT NULL UNIQUE,
  full_name VARCHAR(160) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id),
  account_number CHAR(12) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  card_brand VARCHAR(20) NOT NULL DEFAULT 'VISA',
  currency CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FROZEN', 'CLOSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_accounts_customer ON accounts(customer_id);

CREATE TABLE ledger_journals (
  id UUID PRIMARY KEY,
  reference VARCHAR(80) NOT NULL UNIQUE,
  description VARCHAR(160) NOT NULL,
  kind VARCHAR(24) NOT NULL CHECK (kind IN ('FUNDING', 'INCOME', 'EXPENSE', 'TRANSFER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY,
  journal_id UUID NOT NULL REFERENCES ledger_journals(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  amount_minor BIGINT NOT NULL CHECK (amount_minor <> 0),
  currency CHAR(3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_entries_account ON ledger_entries(account_id);
CREATE INDEX idx_ledger_entries_journal ON ledger_entries(journal_id);

CREATE TABLE transfers (
  id UUID PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id),
  idempotency_key VARCHAR(100) NOT NULL,
  source_account_id UUID NOT NULL REFERENCES accounts(id),
  destination_account_id UUID NOT NULL REFERENCES accounts(id),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency CHAR(3) NOT NULL,
  description VARCHAR(120) NOT NULL,
  reference VARCHAR(80) NOT NULL UNIQUE,
  journal_id UUID NOT NULL UNIQUE REFERENCES ledger_journals(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_transfer_idempotency UNIQUE(customer_id, idempotency_key),
  CONSTRAINT different_transfer_accounts CHECK (source_account_id <> destination_account_id)
);
CREATE INDEX idx_transfers_customer ON transfers(customer_id, created_at DESC);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(80) NOT NULL,
  actor_subject VARCHAR(160) NOT NULL,
  aggregate_id UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_events_aggregate ON audit_events(aggregate_id, created_at DESC);

-- Transactional outbox: the publisher may update delivery status; financial ledger never changes.
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY,
  aggregate_type VARCHAR(50) NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PUBLISHED','FAILED')),
  attempts INT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_outbox_pending ON outbox_events(status, next_attempt_at, created_at);


CREATE FUNCTION prevent_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END; $$;
CREATE TRIGGER ledger_journals_immutable BEFORE UPDATE OR DELETE ON ledger_journals FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER ledger_entries_immutable BEFORE UPDATE OR DELETE ON ledger_entries FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER transfers_immutable BEFORE UPDATE OR DELETE ON transfers FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER audit_events_immutable BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

CREATE FUNCTION validate_entry_currency() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE account_currency CHAR(3);
BEGIN
  SELECT currency INTO account_currency FROM accounts WHERE id = NEW.account_id;
  IF account_currency IS NULL OR account_currency <> NEW.currency THEN
    RAISE EXCEPTION 'Ledger entry currency does not match account currency';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER validate_ledger_entry_currency BEFORE INSERT ON ledger_entries FOR EACH ROW EXECUTE FUNCTION validate_entry_currency();

CREATE FUNCTION require_balanced_journal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  journal UUID;
  n BIGINT;
  total NUMERIC;
  currency_count BIGINT;
BEGIN
  IF TG_TABLE_NAME = 'ledger_journals' THEN
    journal := NEW.id;
  ELSE
    journal := NEW.journal_id;
  END IF;
  SELECT COUNT(*), COALESCE(SUM(amount_minor::numeric), 0), COUNT(DISTINCT currency)
    INTO n, total, currency_count FROM ledger_entries WHERE journal_id = journal;
  IF n < 2 OR total <> 0 OR currency_count <> 1 THEN
    RAISE EXCEPTION 'Unbalanced ledger journal %: entries %, sum %, currencies %', journal, n, total, currency_count;
  END IF;
  RETURN NULL;
END; $$;
-- Constraint triggers execute at transaction commit, after both debit and credit have been written.
CREATE CONSTRAINT TRIGGER journal_posted_balanced
  AFTER INSERT ON ledger_journals DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION require_balanced_journal();
CREATE CONSTRAINT TRIGGER entries_posted_balanced
  AFTER INSERT ON ledger_entries DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION require_balanced_journal();

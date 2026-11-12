-- Sandbox virtual cards. NO raw PAN, CVV/CVC or other card-authentication data is ever stored: a card is identified by
-- its UUID and a non-numeric masked reference that cannot be mistaken for a payment-card number. A real issuer would
-- supply a token in provider_reference; it is NULL in the sandbox.
-- Cards never touch the ledger: freezing, limits and (sandbox) authorizations post no journals.
-- All amounts are integer pence (GBP).
CREATE TABLE cards (
  id UUID PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id),
  card_type VARCHAR(16) NOT NULL CHECK (card_type IN ('EVERYDAY', 'SAVINGS')),
  status VARCHAR(24) NOT NULL CHECK (status IN ('PENDING_ACTIVATION', 'ACTIVE', 'FROZEN', 'BLOCKED', 'CLOSED')),
  masked_reference VARCHAR(24) NOT NULL,
  provider_reference VARCHAR(120),
  idempotency_key VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT card_activated_consistent CHECK (status IN ('PENDING_ACTIVATION', 'CLOSED', 'BLOCKED') OR activated_at IS NOT NULL)
);
CREATE INDEX idx_cards_customer ON cards(customer_id, created_at);
CREATE UNIQUE INDEX uq_cards_idempotency ON cards(customer_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- The bank account a card draws on. History is kept; at most one link is current.
CREATE TABLE card_account_links (
  id UUID PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES cards(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unlinked_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_card_current_link ON card_account_links(card_id) WHERE unlinked_at IS NULL;
CREATE INDEX idx_card_links_account ON card_account_links(account_id);

CREATE TABLE card_spending_limits (
  card_id UUID PRIMARY KEY REFERENCES cards(id),
  daily_limit_minor BIGINT NOT NULL,
  monthly_limit_minor BIGINT NOT NULL,
  single_limit_minor BIGINT NOT NULL,
  online_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Maximums are the sandbox policy ceiling (£5,000 / £20,000 / £2,500); the API enforces the same values.
  CONSTRAINT limits_positive CHECK (single_limit_minor >= 100 AND daily_limit_minor >= 100 AND monthly_limit_minor >= 100),
  CONSTRAINT limits_ordered CHECK (single_limit_minor <= daily_limit_minor AND daily_limit_minor <= monthly_limit_minor),
  CONSTRAINT limits_ceiling CHECK (single_limit_minor <= 250000 AND daily_limit_minor <= 500000 AND monthly_limit_minor <= 2000000)
);

-- Sandbox authorization decisions. Append-only; they are not ledger postings.
CREATE TABLE card_authorizations (
  id UUID PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES cards(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  merchant_name VARCHAR(80) NOT NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency CHAR(3) NOT NULL CHECK (currency = 'GBP'),
  channel VARCHAR(10) NOT NULL CHECK (channel IN ('ONLINE', 'IN_STORE')),
  outcome VARCHAR(10) NOT NULL CHECK (outcome IN ('APPROVED', 'DECLINED')),
  decline_reason VARCHAR(40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT decline_reason_matches CHECK ((outcome = 'DECLINED') = (decline_reason IS NOT NULL))
);
CREATE INDEX idx_card_auth_card ON card_authorizations(card_id, created_at DESC);

-- Immutable audit trail of card state and settings changes.
CREATE TABLE card_activity_events (
  id UUID PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES cards(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  event_type VARCHAR(40) NOT NULL,
  actor_subject VARCHAR(160) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_card_activity_card ON card_activity_events(card_id, created_at DESC);

CREATE TRIGGER card_authorizations_immutable BEFORE UPDATE OR DELETE ON card_authorizations FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER card_activity_events_immutable BEFORE UPDATE OR DELETE ON card_activity_events FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

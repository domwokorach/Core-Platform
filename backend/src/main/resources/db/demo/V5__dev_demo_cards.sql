-- DEVELOPMENT-ONLY SEED: two fictional sandbox cards for the demo customer. Not payment cards.
INSERT INTO cards (id, customer_id, card_type, status, masked_reference, created_at, activated_at) VALUES
  ('c1111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'EVERYDAY', 'ACTIVE', 'FVC •••• 7Q3K', now() - interval '20 days', now() - interval '20 days'),
  ('c2222222-2222-4222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'SAVINGS', 'PENDING_ACTIVATION', 'FVC •••• 4M9X', now() - interval '1 day', NULL);

INSERT INTO card_account_links (id, card_id, account_id) VALUES
  (gen_random_uuid(), 'c1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111'),
  (gen_random_uuid(), 'c2222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222');

INSERT INTO card_spending_limits (card_id, daily_limit_minor, monthly_limit_minor, single_limit_minor, online_enabled) VALUES
  ('c1111111-1111-4111-8111-111111111111', 50000, 300000, 25000, true),
  ('c2222222-2222-4222-8222-222222222222', 50000, 300000, 25000, true);

INSERT INTO card_authorizations (id, card_id, customer_id, merchant_name, amount_minor, currency, channel, outcome, decline_reason, created_at) VALUES
  (gen_random_uuid(), 'c1111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Starbucks Coffee', 1499, 'GBP', 'IN_STORE', 'APPROVED', NULL, now() - interval '1 day'),
  (gen_random_uuid(), 'c1111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Netflix', 7000, 'GBP', 'ONLINE', 'APPROVED', NULL, now() - interval '3 days'),
  (gen_random_uuid(), 'c1111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'DKNY', 4000, 'GBP', 'IN_STORE', 'APPROVED', NULL, now() - interval '2 days'),
  (gen_random_uuid(), 'c1111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Electronics Outlet', 32000, 'GBP', 'ONLINE', 'DECLINED', 'SINGLE_LIMIT_EXCEEDED', now() - interval '6 days');

INSERT INTO card_activity_events (id, card_id, customer_id, event_type, actor_subject, metadata, created_at) VALUES
  (gen_random_uuid(), 'c1111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'CARD_CREATED', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '{}', now() - interval '20 days'),
  (gen_random_uuid(), 'c1111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'CARD_ACTIVATED', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '{}', now() - interval '20 days'),
  (gen_random_uuid(), 'c2222222-2222-4222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'CARD_CREATED', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '{}', now() - interval '1 day');

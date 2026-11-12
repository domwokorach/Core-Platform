-- DEVELOPMENT-ONLY SEED (fictional GBP data; amounts are pence). Remove/replace this migration before production use.
-- Local databases seeded earlier with USD data must be reset (scripts/reset-dev-db.sh), never relabelled as GBP.
-- Subject below matches the included Keycloak demo user. All deposits and expenses are double entry.
INSERT INTO customers (id, oidc_subject, full_name) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Alex Morgan'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'system:clearing', 'FINIX Clearing');

INSERT INTO accounts (id, customer_id, account_number, display_name, card_brand, currency) VALUES
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '000000004568', 'Everyday account', 'MASTERCARD', 'GBP'),
  ('22222222-2222-4222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '000000000958', 'Savings account', 'VISA', 'GBP'),
  ('99999999-9999-4999-8999-999999999999', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '999999999999', 'System clearing', 'VISA', 'GBP');

INSERT INTO ledger_journals (id, reference, description, kind, created_at) VALUES
  ('00000000-0000-4000-8000-000000000001','SEED-FUNDING-1','Opening funds','FUNDING',now()-interval '31 days'),
  ('00000000-0000-4000-8000-000000000002','SEED-FUNDING-2','Opening savings','FUNDING',now()-interval '31 days'),
  ('00000000-0000-4000-8000-000000000003','SEED-PAYROLL','Payroll','INCOME',now()-interval '5 days'),
  ('00000000-0000-4000-8000-000000000004','SEED-COFFEE','Starbucks Coffee','EXPENSE',now()-interval '1 day'),
  ('00000000-0000-4000-8000-000000000005','SEED-DKNY','DKNY','EXPENSE',now()-interval '2 days'),
  ('00000000-0000-4000-8000-000000000006','SEED-NETFLIX','Netflix','EXPENSE',now()-interval '3 days'),
  ('00000000-0000-4000-8000-000000000007','SEED-KFC','KFC','EXPENSE',now()-interval '4 days');

-- 93,163 + 376,211 - (1,499 + 4,000 + 7,000 + 1,260) = 455,615 cents.
INSERT INTO ledger_entries (id, journal_id, account_id, amount_minor, currency) VALUES
  (gen_random_uuid(),'00000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111',93163,'GBP'),
  (gen_random_uuid(),'00000000-0000-4000-8000-000000000001','99999999-9999-4999-8999-999999999999',-93163,'GBP'),
  (gen_random_uuid(),'00000000-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222',596800,'GBP'),
  (gen_random_uuid(),'00000000-0000-4000-8000-000000000002','99999999-9999-4999-8999-999999999999',-596800,'GBP'),
  (gen_random_uuid(),'00000000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111',376211,'GBP'),
  (gen_random_uuid(),'00000000-0000-4000-8000-000000000003','99999999-9999-4999-8999-999999999999',-376211,'GBP'),
  (gen_random_uuid(),'00000000-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111',-1499,'GBP'),
  (gen_random_uuid(),'00000000-0000-4000-8000-000000000004','99999999-9999-4999-8999-999999999999',1499,'GBP'),
  (gen_random_uuid(),'00000000-0000-4000-8000-000000000005','11111111-1111-4111-8111-111111111111',-4000,'GBP'),
  (gen_random_uuid(),'00000000-0000-4000-8000-000000000005','99999999-9999-4999-8999-999999999999',4000,'GBP'),
  (gen_random_uuid(),'00000000-0000-4000-8000-000000000006','11111111-1111-4111-8111-111111111111',-7000,'GBP'),
  (gen_random_uuid(),'00000000-0000-4000-8000-000000000006','99999999-9999-4999-8999-999999999999',7000,'GBP'),
  (gen_random_uuid(),'00000000-0000-4000-8000-000000000007','11111111-1111-4111-8111-111111111111',-1260,'GBP'),
  (gen_random_uuid(),'00000000-0000-4000-8000-000000000007','99999999-9999-4999-8999-999999999999',1260,'GBP');

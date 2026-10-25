\connect f14_synthetic
DO $$ BEGIN IF current_database()<>'f14_synthetic' OR current_user<>'postgres' THEN RAISE EXCEPTION 'Disposable only';END IF;END $$;
-- This older disposable baseline predates the real hosted admin_grants.granted_at column.
-- Bring only the *synthetic* admin-grant shape into parity with hosted PG.
DO $synthetic_admin_schema$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='admin_private'
  AND table_name='admin_grants' AND column_name='granted_at') THEN
  ALTER TABLE admin_private.admin_grants ADD COLUMN granted_at timestamptz NOT NULL DEFAULT clock_timestamp();
 END IF;
END
$synthetic_admin_schema$;
-- Isolated synthetic owner data. Never connected to hosted/PayPal.
DO $fixture$
DECLARE v_owner uuid;
BEGIN
 -- Previous disposable scenarios may have granted more than one synthetic admin.
 -- Isolate this test's *one* synthetic primary admin without touching hosted data.
 DELETE FROM admin_private.admin_grants WHERE user_id<>f18_test.owner(180);
 INSERT INTO admin_private.admin_grants(user_id,granted_at)
 VALUES(f18_test.owner(180),clock_timestamp()-interval '2 days')
 ON CONFLICT(user_id) DO NOTHING;
 IF (SELECT count(*) FROM admin_private.admin_grants)<>1 THEN RAISE EXCEPTION 'synthetic_one_admin_expected';END IF;
 SELECT user_id INTO STRICT v_owner FROM admin_private.admin_grants;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=v_owner) THEN RAISE EXCEPTION 'missing_synthetic_admin'; END IF;
 INSERT INTO supporter_private.gradual_qa_accounts(owner_id,reason,classified_at)
 VALUES(v_owner,'prebeta_20261023',clock_timestamp()-interval '2 days');
 INSERT INTO supporter_private.f16_sandbox_qa_owners(owner_id,authorized_at,expires_at,status,test_purpose)
 VALUES(v_owner,clock_timestamp()-interval '8 days',clock_timestamp()-interval '1 day','enabled','f16_four_benefits_sandbox');
 INSERT INTO supporter_private.gradual_qa_accounts(owner_id,reason,classified_at)
 VALUES(f18_test.owner(109),'prebeta_20261023',clock_timestamp()-interval '2 days');
 INSERT INTO supporter_private.f16_sandbox_qa_owners(owner_id,authorized_at,expires_at,status,test_purpose)
 VALUES(f18_test.owner(109),clock_timestamp()-interval '8 days',clock_timestamp()-interval '1 day','enabled','f16_four_benefits_sandbox');
END
$fixture$;
SELECT f18_test.check('ADMIN_MISTAKEN_QA_IS_BLOCKED_BEFORE_CORRECTION',
 NOT supporter_private.public_supporter_eligible((SELECT user_id FROM admin_private.admin_grants)));
\i docs/operations/F18_PRODUCTION_ADMIN_CLASSIFICATION_CORRECTION_20261025.sql
SELECT f18_test.check('ADMIN_PRODUCTION_AFTER_CORRECTION',
 supporter_private.public_supporter_eligible((SELECT user_id FROM admin_private.admin_grants)));
SELECT f18_test.check('OTHER_QA_ACCOUNTS_STILL_BLOCKED',
 NOT supporter_private.pazo_live_financial_identity_allowed(f18_test.owner(109))
 AND NOT supporter_private.public_supporter_eligible(f18_test.owner(109)));
SELECT f18_test.check('ONE_OWNER_OVERRIDDEN',
 (SELECT count(*)=1 FROM supporter_private.pazo_live_production_reclassifications));
SELECT f18_test.check('ORIGINAL_SANDBOX_QA_HISTORY_PRESERVED',
 (SELECT count(*)=2 FROM supporter_private.gradual_qa_accounts WHERE owner_id IN ((SELECT user_id FROM admin_private.admin_grants),f18_test.owner(109)))
 AND (SELECT count(*)=2 FROM supporter_private.f16_sandbox_qa_owners WHERE owner_id IN ((SELECT user_id FROM admin_private.admin_grants),f18_test.owner(109))));
SELECT f18_test.check('PRODUCTION_OWNER_HAS_NO_FREE_PAID_ENTITLEMENT',
 NOT supporter_private.public_supporter_paid((SELECT user_id FROM admin_private.admin_grants)));
SELECT f18_test.check('RLS_IS_FORCED_AND_PRIVATE',
 (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='supporter_private.pazo_live_production_reclassifications'::regclass)
 AND NOT has_table_privilege('authenticated','supporter_private.pazo_live_production_reclassifications','SELECT')
 AND NOT has_table_privilege('service_role','supporter_private.pazo_live_production_reclassifications','SELECT'));
SELECT f18_test.check('QA_HISTORY_SNAPSHOTS_RETAINED',
 (SELECT original_gradual_qa->>'reason'='prebeta_20261023'
 AND original_sandbox_qa->>'test_purpose'='f16_four_benefits_sandbox'
 FROM supporter_private.pazo_live_production_reclassifications LIMIT 1));

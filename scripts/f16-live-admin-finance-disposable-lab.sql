DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres' THEN RAISE EXCEPTION 'DISPOSABLE PG17 ONLY'; END IF;
END $guard$;
\i supabase/migrations/20261021220000_pazo_f16_live_admin_finance_summary.sql
BEGIN;
INSERT INTO auth.users(id,email_confirmed_at) VALUES('98456789-1234-4234-8234-123456789abc',clock_timestamp());
INSERT INTO admin_private.admin_grants(user_id) VALUES('98456789-1234-4234-8234-123456789abc');
DO $summary$
DECLARE owner_id uuid:='98456789-1234-4234-8234-123456789abc'; value jsonb; digest text; i text;
BEGIN
 PERFORM set_config('request.jwt.claim.sub','',true);
 BEGIN
  PERFORM public.pazo_admin_live_finance_summary(); RAISE EXCEPTION 'anon read allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub','88456789-1234-4234-8234-123456789abc',true);
 BEGIN
  PERFORM public.pazo_admin_live_finance_summary(); RAISE EXCEPTION 'nonadmin read allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 value:=public.pazo_admin_live_finance_summary();
 IF value->>'source'<>'pazo_verified_live_ledger' OR value->>'providerStatement'<>'false'
  OR value->'payments'->>'grossVerifiedMinor'<>'0' THEN RAISE EXCEPTION 'empty ledger misreported %',value; END IF;
 SELECT terms_digest INTO digest FROM supporter_private.pazo_live_offer_versions WHERE locale='es';
 INSERT INTO supporter_private.pazo_paypal_live_checkout_intents(intent_id,owner_id,request_key,
  merchant_generation,plan_id,locale,terms_version,terms_digest,affirmative_consent,
  provider_create_claimed_at,provider_subscription_id,state)
 VALUES('intent-98456789-1234-4234-8234-123456789abc',owner_id,gen_random_uuid(),1,
  'P-ABCDEFGHIJKLMN','es','pazo-supporter-live.beta20261021-v1',digest,true,
  clock_timestamp(),'I-ADMIN-SUMMARY1234','bound') RETURNING intent_id INTO i;
 INSERT INTO supporter_private.pazo_paypal_live_event_inbox(merchant_generation,provider_event_id,event_type,linked_intent_id,processing_state)
 VALUES(1,'WH-ADMIN-SALE','PAYMENT.SALE.COMPLETED',i,'processed');
 INSERT INTO supporter_private.pazo_paypal_live_paid_periods(sale_id,intent_id,merchant_generation,
  provider_event_id,cycle_key,service_start,service_end,merchant_verified_at)
 VALUES('SALE-ADMIN1234',i,1,'WH-ADMIN-SALE','CYCLE-ADMIN',
  clock_timestamp()-interval '1 day',clock_timestamp()+interval '20 days',clock_timestamp());
 UPDATE supporter_private.pazo_live_dispute_monitors SET ever_clear=true,last_result='clear',
  last_checked_at=clock_timestamp() WHERE sale_id='SALE-ADMIN1234';
 value:=public.pazo_admin_live_finance_summary();
 IF value->'payments'->>'grossVerifiedMinor'<>'299' OR value->'payments'->>'verifiedPayments'<>'1'
  OR value->>'activePaidAccounts'<>'1' THEN RAISE EXCEPTION 'verified gross/count incorrect %',value; END IF;
 INSERT INTO supporter_private.pazo_paypal_live_period_holds(sale_id,hold_id,kind,verified_at) VALUES
  ('SALE-ADMIN1234','HOLD-ADMIN-A','refunded',clock_timestamp()),
  ('SALE-ADMIN1234','HOLD-ADMIN-B','dispute',clock_timestamp());
 value:=public.pazo_admin_live_finance_summary();
 IF value->'payments'->>'heldGrossMinor'<>'299' OR value->'payments'->>'heldPayments'<>'1'
  OR value->>'activePaidAccounts'<>'0' THEN RAISE EXCEPTION 'hold double counted or coverage retained %',value; END IF;
 IF value::text LIKE '%I-ADMIN%' OR value::text LIKE '%'||owner_id::text||'%'
 THEN RAISE EXCEPTION 'aggregate leaked buyer identifiers'; END IF;
 DELETE FROM admin_private.admin_grants WHERE user_id=owner_id;
 BEGIN
  PERFORM public.pazo_admin_live_finance_summary(); RAISE EXCEPTION 'revoked admin read allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF has_function_privilege('anon','public.pazo_admin_live_finance_summary()','EXECUTE') OR
  has_function_privilege('service_role','public.pazo_admin_live_finance_summary()','EXECUTE') OR
  NOT has_function_privilege('authenticated','public.pazo_admin_live_finance_summary()','EXECUTE')
 THEN RAISE EXCEPTION 'finance ACL incorrect'; END IF;
 RAISE NOTICE 'PAZO_LIVE_ADMIN_GROSS_HOLDS_NO_PII_REVOKED_GRANT_ACL_PG17_PASS';
END $summary$;
ROLLBACK;

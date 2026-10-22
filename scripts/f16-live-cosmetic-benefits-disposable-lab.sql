-- Real Live-period projection + original consent functions, synthetic Auth only.
\i supabase/tests/supporter/fixtures/f16-live-benefits-prerequisites.generated.sql
\i supabase/migrations/20261021174836_pazo_f16_live_verified_benefit_projection.sql
CREATE TEMP TABLE pazo_prior_cosmetic_functions AS
 SELECT oid::regprocedure::text AS signature,prosrc FROM pg_proc WHERE oid IN (
 'public.pazo_supporter_set_pet_theme(uuid,text)'::regprocedure,
 'public.pazo_supporter_public_pet_benefits(uuid)'::regprocedure,
 'supporter_private.wall_has_verified_entitlement(uuid)'::regprocedure);
\i supabase/migrations/20261021213000_pazo_f16_live_cosmetic_benefits.sql
BEGIN;
INSERT INTO auth.users(id,email_confirmed_at) VALUES
 ('12345678-1234-4234-8234-123456789abc',clock_timestamp()),
 ('23456789-1234-4234-8234-123456789abc',clock_timestamp());
INSERT INTO public.pets(id,owner_id,name) VALUES
 ('33456789-1234-4234-8234-123456789abc','12345678-1234-4234-8234-123456789abc','SYNTHETIC'),
 ('43456789-1234-4234-8234-123456789abc','23456789-1234-4234-8234-123456789abc','OTHER');
DO $benefits$
DECLARE owner_id uuid:='12345678-1234-4234-8234-123456789abc';
 pet uuid:='33456789-1234-4234-8234-123456789abc'; i text; offer_digest text; value jsonb;
BEGIN
 PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 UPDATE admin_private.pazo_paypal_merchant_generations SET retired_at=NULL WHERE generation=1;
 SELECT terms_digest INTO offer_digest FROM supporter_private.pazo_live_offer_versions WHERE locale='es';
 INSERT INTO supporter_private.pazo_paypal_live_checkout_intents(intent_id,owner_id,request_key,
  merchant_generation,plan_id,locale,terms_version,terms_digest,affirmative_consent,
  provider_create_claimed_at,provider_subscription_id,state)
 VALUES('intent-53456789-1234-4234-8234-123456789abc',owner_id,gen_random_uuid(),1,
  'P-ABCDEFGHIJKLMN','es','pazo-supporter-live.beta20261021-v1',offer_digest,true,
  clock_timestamp(),'I-COSMETIC1234','bound') RETURNING intent_id INTO i;
 -- A bound/ACTIVE subscription alone cannot enable a theme or wall consent.
 BEGIN
  PERFORM public.pazo_supporter_set_pet_theme(pet,'nature'); RAISE EXCEPTION 'unpaid theme allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.pazo_wall_consent_enable(pet,'wall_consent_v1'); RAISE EXCEPTION 'unpaid wall opt-in allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 INSERT INTO supporter_private.pazo_paypal_live_event_inbox(merchant_generation,provider_event_id,event_type,linked_intent_id,processing_state)
 VALUES(1,'WH-COSMETIC-SALE','PAYMENT.SALE.COMPLETED',i,'processed');
 INSERT INTO supporter_private.pazo_paypal_live_paid_periods(sale_id,intent_id,merchant_generation,
  provider_event_id,cycle_key,service_start,service_end,merchant_verified_at)
 VALUES('SALE-COSMETIC1234',i,1,'WH-COSMETIC-SALE','CYCLE-COSMETIC',
  clock_timestamp()-interval '1 day',clock_timestamp()+interval '20 days',clock_timestamp());
 -- Dispute control is part of the actual Live entitlement projection.
 UPDATE supporter_private.pazo_live_dispute_monitors SET last_checked_at=clock_timestamp(),last_result='clear',ever_clear=true,
  next_check_at=clock_timestamp()+interval '15 minutes' WHERE sale_id='SALE-COSMETIC1234';
 value:=public.pazo_supporter_my_account_status();
 IF value->>'active' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'real Live projection not active %',value; END IF;
 IF EXISTS(SELECT 1 FROM public.pazo_supporter_public_wall(48)) THEN RAISE EXCEPTION 'wall auto opt-in'; END IF;
 IF NOT public.pazo_supporter_set_pet_theme(pet,'nature') THEN RAISE EXCEPTION 'Live theme save failed'; END IF;
 value:=public.pazo_supporter_public_pet_benefits(pet);
 IF value->>'badge'<>'true' OR value->>'theme'<>'nature' THEN RAISE EXCEPTION 'Live theme read failed %',value; END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_pet_themes WHERE pet_id=pet) THEN RAISE EXCEPTION 'Live wrote Sandbox preferences'; END IF;
 PERFORM public.pazo_wall_consent_enable(pet,'wall_consent_v1');
 IF (SELECT count(*) FROM public.pazo_supporter_public_wall(48))<>1 THEN RAISE EXCEPTION 'Live wall opt-in not visible'; END IF;
 PERFORM set_config('request.jwt.claim.sub','23456789-1234-4234-8234-123456789abc',true);
 BEGIN
  PERFORM public.pazo_supporter_set_pet_theme(pet,'hearts'); RAISE EXCEPTION 'foreign owner changed theme';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 INSERT INTO supporter_private.pazo_paypal_live_period_holds(sale_id,hold_id,kind,verified_at)
 VALUES('SALE-COSMETIC1234','HOLD-COSMETIC','refunded',clock_timestamp());
 value:=public.pazo_supporter_public_pet_benefits(pet);
 IF value->>'badge'<>'false' OR value->>'theme' IS NOT NULL THEN RAISE EXCEPTION 'hold did not suppress cosmetics'; END IF;
 IF EXISTS(SELECT 1 FROM public.pazo_supporter_public_wall(48)) THEN RAISE EXCEPTION 'held period stayed on wall'; END IF;
 -- Consent withdrawal and removal of preference still work after a hold.
 IF NOT public.pazo_wall_consent_disable(pet) OR NOT public.pazo_supporter_set_pet_theme(pet,NULL)
 THEN RAISE EXCEPTION 'former member cannot withdraw'; END IF;
 UPDATE public.pets SET owner_id='23456789-1234-4234-8234-123456789abc' WHERE id=pet;
 value:=public.pazo_supporter_public_pet_benefits(pet);
 IF value->>'badge'<>'false' OR value->>'theme' IS NOT NULL THEN RAISE EXCEPTION 'transfer leaked old owner benefits'; END IF;
 IF has_table_privilege('authenticated','supporter_private.pazo_live_pet_themes','SELECT') OR
  has_table_privilege('service_role','supporter_private.pazo_live_pet_themes','INSERT') OR
  has_function_privilege('anon','public.pazo_supporter_set_pet_theme(uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'private theme ACL incorrect'; END IF;
 RAISE NOTICE 'PAZO_LIVE_COSMETIC_THEME_WALL_HOLDS_TRANSFER_ACL_PG17_PASS';
END $benefits$;
ROLLBACK;
\i supabase/rollbacks/f16_live_cosmetic_benefits_REVIEW_REQUIRED.sql
DO $rollback$ BEGIN
 IF EXISTS(SELECT 1 FROM pazo_prior_cosmetic_functions f JOIN pg_proc p
   ON p.oid=f.signature::regprocedure WHERE p.prosrc<>f.prosrc)
 THEN RAISE EXCEPTION 'Cosmetic rollback altered prior function source'; END IF;
 RAISE NOTICE 'PAZO_LIVE_COSMETIC_EXACT_ROLLBACK_PG17_PASS';
END $rollback$;
\i supabase/migrations/20261021213000_pazo_f16_live_cosmetic_benefits.sql

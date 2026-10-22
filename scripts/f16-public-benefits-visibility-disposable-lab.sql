-- After the complete Live lab; synthetic data only, no provider calls.
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'DISPOSABLE PG17 ONLY'; END IF;
END $guard$;
-- Minimal moderation storage; exact installed visibility function bodies.
CREATE SCHEMA moderation_private;
CREATE TABLE moderation_private.content_restrictions(target_kind text,target_id uuid);
CREATE FUNCTION moderation_private.is_removed(p_kind text,p_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT EXISTS(SELECT 1 FROM moderation_private.content_restrictions r
 WHERE r.target_kind=p_kind AND r.target_id=p_id); $$;
CREATE FUNCTION public.f14_content_visible(p_kind text,p_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT p_id IS NOT NULL AND NOT moderation_private.is_removed(p_kind,p_id); $$;
REVOKE ALL ON TABLE moderation_private.content_restrictions FROM PUBLIC,anon,authenticated,service_role;

CREATE TEMP TABLE pazo_prior_public_visibility_functions AS
 SELECT p.oid::regprocedure::text AS signature,pg_get_functiondef(p.oid) AS definition
 FROM pg_proc p WHERE p.oid IN (
 'public.pazo_supporter_public_pet_benefits(uuid)'::regprocedure,
 'public.pazo_supporter_public_badges_batch(uuid[])'::regprocedure);
-- Old code already rejects matrices through array_position (0A000), not its
-- explicit input validator. Preserve denial with the intended 22023 response.
DO $reproduce$ BEGIN
 BEGIN
  PERFORM public.pazo_supporter_public_badges_batch(
   array_fill('f3456789-1234-4234-8234-123456789abc'::uuid,ARRAY[1,49]));
  RAISE EXCEPTION 'Old matrix unexpectedly accepted';
 EXCEPTION WHEN feature_not_supported THEN NULL; END;
END $reproduce$;
\i supabase/migrations/20261022021500_pazo_f16_public_benefits_visibility.sql

BEGIN;
INSERT INTO auth.users(id,email_confirmed_at)
 VALUES('b3456789-1234-4234-8234-123456789abc',clock_timestamp());
INSERT INTO public.pets(id,owner_id,name)
 VALUES('c3456789-1234-4234-8234-123456789abc','b3456789-1234-4234-8234-123456789abc','SYNTHETIC VISIBILITY');
INSERT INTO supporter_private.pazo_paypal_live_checkout_intents(intent_id,owner_id,request_key,
 merchant_generation,plan_id,locale,terms_version,terms_digest,affirmative_consent,
 created_at,provider_create_claimed_at,provider_subscription_id,state)
SELECT 'intent-d3456789-1234-4234-8234-123456789abc','b3456789-1234-4234-8234-123456789abc',gen_random_uuid(),
 1,'P-ABCDEFGHIJKLMN','es','pazo-supporter-live.beta20261021-v1',terms_digest,true,
 clock_timestamp()-interval '1 minute',clock_timestamp(),'I-VISIBILITY1234','bound'
FROM supporter_private.pazo_live_offer_versions WHERE locale='es';
INSERT INTO supporter_private.pazo_paypal_live_event_inbox(merchant_generation,provider_event_id,event_type,linked_intent_id,processing_state)
 VALUES(1,'WH-VISIBILITY-SALE','PAYMENT.SALE.COMPLETED','intent-d3456789-1234-4234-8234-123456789abc','processed');
INSERT INTO supporter_private.pazo_paypal_live_paid_periods(sale_id,intent_id,merchant_generation,
 provider_event_id,cycle_key,service_start,service_end,merchant_verified_at)
 VALUES('SALE-VISIBILITY1234','intent-d3456789-1234-4234-8234-123456789abc',1,
 'WH-VISIBILITY-SALE','CYCLE-VISIBILITY',clock_timestamp()-interval '1 day',
 clock_timestamp()+interval '20 days',clock_timestamp());
UPDATE supporter_private.pazo_live_dispute_monitors SET last_checked_at=clock_timestamp(),last_result='clear',ever_clear=true,
 next_check_at=clock_timestamp()+interval '15 minutes' WHERE sale_id='SALE-VISIBILITY1234';
SELECT set_config('request.jwt.claim.sub','b3456789-1234-4234-8234-123456789abc',true);
SELECT public.pazo_wall_consent_enable('c3456789-1234-4234-8234-123456789abc','wall_consent_v1');
DO $visible$ BEGIN
 IF (SELECT count(*) FROM public.pazo_supporter_public_wall(48))<>1
 THEN RAISE EXCEPTION 'Eligible visible opted-in pet missing'; END IF;
END $visible$;
INSERT INTO moderation_private.content_restrictions VALUES('pet_profile','c3456789-1234-4234-8234-123456789abc');

SAVEPOINT insecure_baseline;
DO $old_visibility$ DECLARE source text; BEGIN
 SELECT definition INTO STRICT source FROM pazo_prior_public_visibility_functions
 WHERE signature='pazo_supporter_public_pet_benefits(uuid)';
 EXECUTE source;
 IF (SELECT count(*) FROM public.pazo_supporter_public_wall(48))<>1
 THEN RAISE EXCEPTION 'Expected pre-fix moderation regression not reproduced'; END IF;
 RAISE NOTICE 'PAZO_PRE_FIX_MODERATED_WALL_EXPOSURE_REPRODUCED';
END $old_visibility$;
ROLLBACK TO SAVEPOINT insecure_baseline;

SET LOCAL ROLE anon;
DO $public$ BEGIN
 IF public.pazo_supporter_public_pet_benefits('c3456789-1234-4234-8234-123456789abc')->>'badge'<>'false'
 OR EXISTS(SELECT 1 FROM public.pazo_supporter_public_wall(48))
 OR EXISTS(SELECT 1 FROM public.pazo_supporter_public_badges_batch(ARRAY['c3456789-1234-4234-8234-123456789abc'::uuid]) WHERE badge)
 THEN RAISE EXCEPTION 'Moderated pet leaked through public definer'; END IF;
 IF public.pazo_supporter_public_pet_benefits('e3456789-1234-4234-8234-123456789abc')->>'badge'<>'false'
 THEN RAISE EXCEPTION 'Missing pet did not return neutral response'; END IF;
 BEGIN
  PERFORM public.pazo_supporter_public_badges_batch(array_fill('c3456789-1234-4234-8234-123456789abc'::uuid,ARRAY[1,49]));
  RAISE EXCEPTION 'Oversize matrix accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN
  PERFORM public.pazo_supporter_public_badges_batch(ARRAY[['c3456789-1234-4234-8234-123456789abc'::uuid]]);
  RAISE EXCEPTION 'Multidimensional batch accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN
  PERFORM public.pazo_supporter_public_badges_batch('{}'::uuid[]);
  RAISE EXCEPTION 'Empty batch accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN
  PERFORM public.pazo_supporter_public_badges_batch(NULL);
  RAISE EXCEPTION 'Null batch accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN
  PERFORM public.pazo_supporter_public_badges_batch(ARRAY[NULL::uuid]);
  RAISE EXCEPTION 'Null ID accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN
  PERFORM public.pazo_supporter_public_badges_batch(array_fill('c3456789-1234-4234-8234-123456789abc'::uuid,ARRAY[49]));
  RAISE EXCEPTION 'Oversize vector accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF (SELECT count(*) FROM public.pazo_supporter_public_badges_batch(array_fill('c3456789-1234-4234-8234-123456789abc'::uuid,ARRAY[48])))<>1
 THEN RAISE EXCEPTION 'Valid bounded batch no longer deduplicates'; END IF;
END $public$;
RESET ROLE;
DELETE FROM moderation_private.content_restrictions;
SET LOCAL ROLE authenticated;
DO $restored$ BEGIN
 IF (SELECT count(*) FROM public.pazo_supporter_public_wall(48))<>1
 THEN RAISE EXCEPTION 'Restored profile did not reappear'; END IF;
END $restored$;
RESET ROLE;
SELECT public.pazo_wall_consent_disable('c3456789-1234-4234-8234-123456789abc');
SET LOCAL ROLE anon;
DO $withdrawn$ BEGIN
 IF EXISTS(SELECT 1 FROM public.pazo_supporter_public_wall(48))
 THEN RAISE EXCEPTION 'Withdrawn consent leaked'; END IF;
 RAISE NOTICE 'PAZO_PUBLIC_BENEFITS_MODERATION_BATCH_REAL_ROLES_PG17_PASS';
END $withdrawn$;
ROLLBACK;

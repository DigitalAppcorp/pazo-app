-- DISPOSABLE ONLY: actual reviewed F17 definitions, synthetic users and RLS.
\connect f14_synthetic
DO $$ BEGIN IF current_database()<>'f14_synthetic' THEN RAISE EXCEPTION 'Synthetic DB only'; END IF; END $$;
BEGIN;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticator') THEN CREATE ROLE authenticator NOLOGIN; END IF; END $$;
INSERT INTO auth.users(id,email_confirmed_at,is_anonymous,email) VALUES
 ('f1700000-0000-4000-8000-000000000001',now(),false,'admin@synthetic.invalid'),
 ('f1700000-0000-4000-8000-000000000002',now(),false,'owner@synthetic.invalid'),
 ('f1700000-0000-4000-8000-000000000003',now(),false,'other@synthetic.invalid'),
 ('f1700000-0000-4000-8000-000000000004',now(),false,'quota@synthetic.invalid');
INSERT INTO admin_private.admin_grants(user_id) VALUES('f1700000-0000-4000-8000-000000000001');
INSERT INTO public.pets(id,owner_id,name) VALUES
 ('f1700000-0000-4000-8000-000000000010','f1700000-0000-4000-8000-000000000002','Synthetic gift pet');
CREATE TABLE public.f17_lab_resources(id int primary key,owner_id uuid);
ALTER TABLE public.f17_lab_resources ENABLE ROW LEVEL SECURITY;
INSERT INTO public.f17_lab_resources VALUES(1,'f1700000-0000-4000-8000-000000000002'),(2,'f1700000-0000-4000-8000-000000000001');
CREATE POLICY existing_resource_owner ON public.f17_lab_resources FOR ALL TO authenticated
 USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.f17_lab_resources TO authenticated;
CREATE SCHEMA storage;
CREATE TABLE storage.objects(id int primary key,owner_id uuid);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
INSERT INTO storage.objects VALUES(1,'f1700000-0000-4000-8000-000000000002'),(2,'f1700000-0000-4000-8000-000000000001');
CREATE POLICY existing_storage_owner ON storage.objects FOR ALL TO authenticated
 USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
CREATE SCHEMA realtime;
CREATE TABLE realtime.messages(id int primary key,owner_id uuid);
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
INSERT INTO realtime.messages VALUES(1,'f1700000-0000-4000-8000-000000000002');
CREATE POLICY existing_realtime_owner ON realtime.messages FOR ALL TO authenticated
 USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT SELECT ON realtime.messages TO authenticated;
COMMIT;
\i supabase/tests/supporter/fixtures/f17-public-baseline.generated.sql
CREATE SCHEMA supabase_migrations;
CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY,name text,statements text[]);
ALTER ROLE authenticator RESET pgrst.db_pre_request;
-- Exact combined operator transaction: DDL/history/cron/role changes all roll back.
\i supabase/tests/supporter/fixtures/f17-rollback.generated.sql
DO $$ BEGIN
 IF to_regclass('public.pazo_support_tickets') IS NOT NULL
  OR to_regclass('supporter_private.pazo_admin_gift_access') IS NOT NULL
  OR to_regclass('admin_private.pazo_app_maintenance') IS NOT NULL
  OR EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations)
  OR EXISTS(SELECT 1 FROM cron.job WHERE jobname='pazo_support_retention_daily')
  OR EXISTS(SELECT 1 FROM pg_roles r CROSS JOIN LATERAL unnest(r.rolconfig) setting WHERE r.rolname='authenticator' AND setting LIKE 'pgrst.db_pre_request=%')
 THEN RAISE EXCEPTION 'F17 rehearsal left persistent changes';END IF;
END $$;
\i supabase/tests/supporter/fixtures/f17-commit.generated.sql
BEGIN;
CREATE TABLE public.f17_finance_snapshot AS SELECT
 (SELECT count(*) FROM supporter_private.pazo_paypal_live_paid_periods) AS periods,
 (SELECT count(*) FROM supporter_private.pazo_paypal_live_checkout_intents) AS intents;
COMMIT;

-- Normal owner: RPC-only intake, stable request identifier, bounded quota.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f1700000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"f1700000-0000-4000-8000-000000000002"}',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.f17_lab_resources)<>1 THEN RAISE EXCEPTION 'Ownership changed while OFF';END IF;
 BEGIN INSERT INTO public.pazo_support_tickets(id,owner_id,category,message,admin_reply)
 VALUES(gen_random_uuid(),auth.uid(),'question','Synthetic forged reply','FORGED');
 RAISE EXCEPTION 'FAIL direct ticket write';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 IF NOT public.pazo_submit_support_ticket('f1700000-0000-4000-8000-000000000020','question','Synthetic support request') THEN RAISE EXCEPTION 'Intake failed';END IF;
 PERFORM public.pazo_submit_support_ticket('f1700000-0000-4000-8000-000000000020','question','Synthetic support request');
 IF jsonb_array_length(public.pazo_my_support_tickets())<>1 THEN RAISE EXCEPTION 'Duplicate intake';END IF;
 PERFORM public.pazo_submit_support_ticket('f1700000-0000-4000-8000-000000000021','problem','Synthetic second request');
 PERFORM public.pazo_submit_support_ticket('f1700000-0000-4000-8000-000000000022','other','Synthetic third request');
 BEGIN PERFORM public.pazo_submit_support_ticket(gen_random_uuid(),'other','Synthetic over quota request');
 RAISE EXCEPTION 'FAIL fourth submission';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN PERFORM public.pazo_admin_update_support_ticket('f1700000-0000-4000-8000-000000000020','resolved','Secret note','Reply');
 RAISE EXCEPTION 'FAIL owner admin write';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 IF (SELECT count(*) FROM public.pazo_support_tickets)<>0 THEN RAISE EXCEPTION 'Owner direct row leak';END IF;
 BEGIN PERFORM public.pazo_admin_set_gift_benefits(auth.uid(),'grant',12,0,'Synthetic unauthorized gift');
 RAISE EXCEPTION 'FAIL owner grants gift';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.pazo_admin_gift_history(auth.uid());RAISE EXCEPTION 'FAIL history privilege';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
COMMIT;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f1700000-0000-4000-8000-000000000003',true);
DO $$ BEGIN
 IF jsonb_array_length(public.pazo_my_support_tickets())<>0 THEN RAISE EXCEPTION 'Cross-owner history';END IF;
 BEGIN PERFORM public.pazo_submit_support_ticket('f1700000-0000-4000-8000-000000000020','question','Synthetic support request');
 RAISE EXCEPTION 'FAIL cross-owner request replay';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
ROLLBACK;

-- Admin update keeps note private; NULL duration/action cannot grant permanently.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f1700000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 IF NOT public.pazo_admin_update_support_ticket('f1700000-0000-4000-8000-000000000020','resolved','PRIVATE SYNTHETIC NOTE','Safe owner reply') THEN RAISE EXCEPTION 'Admin reply failed';END IF;
 BEGIN PERFORM public.pazo_admin_set_gift_benefits('f1700000-0000-4000-8000-000000000002','grant',0,NULL,'Synthetic invalid duration');
 RAISE EXCEPTION 'FAIL null duration';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN PERFORM public.pazo_admin_set_gift_benefits('f1700000-0000-4000-8000-000000000002',NULL,0,30,'Synthetic invalid action');
 RAISE EXCEPTION 'FAIL null action';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 PERFORM public.pazo_admin_set_gift_benefits('f1700000-0000-4000-8000-000000000002','grant',1,30,'Synthetic grant','f1700000-0000-4000-8000-000000000030');
 PERFORM public.pazo_admin_set_gift_benefits('f1700000-0000-4000-8000-000000000002','grant',1,30,'Synthetic grant','f1700000-0000-4000-8000-000000000030');
 IF jsonb_array_length(public.pazo_admin_gift_history('f1700000-0000-4000-8000-000000000002'))<>1 THEN RAISE EXCEPTION 'Gift replay audit duplicate';END IF;
END $$;
COMMIT;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f1700000-0000-4000-8000-000000000002',true);
DO $$ DECLARE history jsonb; BEGIN
 history:=public.pazo_my_support_tickets();
 IF history::text LIKE '%PRIVATE SYNTHETIC NOTE%' OR history::text LIKE '%admin_note%' OR history::text NOT LIKE '%Safe owner reply%' THEN RAISE EXCEPTION 'Support privacy/reply projection';END IF;
 IF public.pazo_supporter_public_pet_benefits('f1700000-0000-4000-8000-000000000010')->>'milestone'<>'0'
  OR public.pazo_supporter_public_pet_benefits('f1700000-0000-4000-8000-000000000010')->>'badge'<>'true' THEN RAISE EXCEPTION 'Base gift contract';END IF;
 PERFORM public.pazo_supporter_set_pet_theme('f1700000-0000-4000-8000-000000000010','nature');
 IF public.pazo_supporter_public_pet_benefits('f1700000-0000-4000-8000-000000000010')->>'theme'<>'nature' THEN RAISE EXCEPTION 'Gift theme not usable';END IF;
 IF EXISTS(SELECT 1 FROM public.pazo_supporter_public_wall(48) WHERE pet_id='f1700000-0000-4000-8000-000000000010') THEN RAISE EXCEPTION 'Gift published without consent';END IF;
 PERFORM public.pazo_wall_consent_enable('f1700000-0000-4000-8000-000000000010','wall_consent_v1');
 IF NOT EXISTS(SELECT 1 FROM public.pazo_supporter_public_wall(48) WHERE pet_id='f1700000-0000-4000-8000-000000000010') THEN RAISE EXCEPTION 'Gift consent not usable';END IF;
END $$;
COMMIT;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f1700000-0000-4000-8000-000000000001',true);
SELECT public.pazo_admin_set_gift_benefits('f1700000-0000-4000-8000-000000000002','revoke',1,30,'Synthetic revoke','f1700000-0000-4000-8000-000000000031');
-- Replay old grant after revocation: must not reactivate.
SELECT public.pazo_admin_set_gift_benefits('f1700000-0000-4000-8000-000000000002','grant',1,30,'Synthetic grant','f1700000-0000-4000-8000-000000000030');
RESET ROLE;
DO $$ BEGIN
 IF public.pazo_supporter_public_pet_benefits('f1700000-0000-4000-8000-000000000010')->>'badge'<>'false' THEN RAISE EXCEPTION 'Old grant resurrected';END IF;
 IF EXISTS(SELECT 1 FROM public.pazo_supporter_public_wall(48) WHERE pet_id='f1700000-0000-4000-8000-000000000010') THEN RAISE EXCEPTION 'Revoked wall still visible';END IF;
 IF (SELECT count(*) FROM supporter_private.pazo_admin_gift_audit WHERE owner_id='f1700000-0000-4000-8000-000000000002')<>2 THEN RAISE EXCEPTION 'Replay audit changed';END IF;
END $$;
COMMIT;

-- Explicit permanent access, expiry, moderation and ownership all affect display only.
BEGIN;
SELECT set_config('request.jwt.claim.sub','f1700000-0000-4000-8000-000000000001',true);
SELECT public.pazo_admin_set_gift_benefits('f1700000-0000-4000-8000-000000000002','grant',12,0,'Synthetic explicit permanent gift');
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM supporter_private.pazo_admin_gift_access WHERE owner_id='f1700000-0000-4000-8000-000000000002' AND expires_at IS NULL AND revoked_at IS NULL) THEN RAISE EXCEPTION 'Explicit permanent grant failed';END IF;
 IF public.pazo_supporter_public_pet_benefits('f1700000-0000-4000-8000-000000000010')->>'milestone'<>'12' THEN RAISE EXCEPTION 'Gift milestone absent';END IF;
END $$;
INSERT INTO moderation_private.content_restrictions VALUES('pet_profile','f1700000-0000-4000-8000-000000000010');
DO $$ BEGIN IF public.pazo_supporter_public_pet_benefits('f1700000-0000-4000-8000-000000000010')->>'badge'<>'false' THEN RAISE EXCEPTION 'Moderated gift pet exposed';END IF;END $$;
DELETE FROM moderation_private.content_restrictions WHERE target_id='f1700000-0000-4000-8000-000000000010';
UPDATE supporter_private.pazo_admin_gift_access SET expires_at=now()-interval '1 second' WHERE owner_id='f1700000-0000-4000-8000-000000000002';
DO $$ BEGIN IF public.pazo_supporter_public_pet_benefits('f1700000-0000-4000-8000-000000000010')->>'badge'<>'false' THEN RAISE EXCEPTION 'Expired gift remains active';END IF;END $$;
UPDATE supporter_private.pazo_admin_gift_access SET expires_at=NULL WHERE owner_id='f1700000-0000-4000-8000-000000000002';
UPDATE public.pets SET owner_id='f1700000-0000-4000-8000-000000000003' WHERE id='f1700000-0000-4000-8000-000000000010';
DO $$ BEGIN
 IF public.pazo_supporter_public_pet_benefits('f1700000-0000-4000-8000-000000000010')->>'badge'<>'false' THEN RAISE EXCEPTION 'Old owner gift transferred';END IF;
 IF EXISTS(SELECT 1 FROM public.pazo_supporter_public_wall(48) WHERE pet_id='f1700000-0000-4000-8000-000000000010') THEN RAISE EXCEPTION 'Old wall consent transferred';END IF;
END $$;
SELECT public.pazo_admin_set_gift_benefits('f1700000-0000-4000-8000-000000000003','grant',3,90,'Synthetic new owner gift');
DO $$ BEGIN IF public.pazo_supporter_public_pet_benefits('f1700000-0000-4000-8000-000000000010')->>'theme' IS NOT NULL THEN RAISE EXCEPTION 'Previous owner theme exposed';END IF;END $$;
ROLLBACK;

-- Retention is measured from resolution, unaffected by edits; reopening clears it.
BEGIN;
UPDATE public.pazo_support_tickets SET resolved_at=now()-interval '91 days' WHERE id='f1700000-0000-4000-8000-000000000020';
SELECT set_config('request.jwt.claim.sub','f1700000-0000-4000-8000-000000000001',true);
SELECT public.pazo_admin_update_support_ticket('f1700000-0000-4000-8000-000000000021','resolved','Synthetic recent note','Reply');
UPDATE public.pazo_support_tickets SET resolved_at=now()-interval '89 days' WHERE id='f1700000-0000-4000-8000-000000000021';
SELECT public.pazo_admin_update_support_ticket('f1700000-0000-4000-8000-000000000022','resolved',NULL,NULL);
UPDATE public.pazo_support_tickets SET resolved_at=now()-interval '91 days' WHERE id='f1700000-0000-4000-8000-000000000022';
SELECT public.pazo_admin_update_support_ticket('f1700000-0000-4000-8000-000000000022','open',NULL,NULL);
DO $$ BEGIN
 IF admin_private.pazo_support_prune_resolved()<>1 THEN RAISE EXCEPTION 'Retention cutoff/reopen wrong';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.pazo_support_tickets WHERE id='f1700000-0000-4000-8000-000000000021') THEN RAISE EXCEPTION 'Recent resolved purged';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.pazo_support_tickets WHERE id='f1700000-0000-4000-8000-000000000022' AND resolved_at IS NULL) THEN RAISE EXCEPTION 'Reopened case purged';END IF;
 IF (SELECT count(*) FROM cron.job WHERE jobname='pazo_support_retention_daily')<>1 THEN RAISE EXCEPTION 'Retention not scheduled';END IF;
 IF has_function_privilege('authenticated','admin_private.pazo_support_prune_resolved()','EXECUTE') THEN RAISE EXCEPTION 'Owner can purge support';END IF;
END $$;
COMMIT;

-- Maintenance CAS, replay, ordinary RLS across Data/Storage/Realtime and service continuity.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f1700000-0000-4000-8000-000000000001',true);
SELECT public.pazo_admin_set_maintenance(true,'Mantenimiento de prueba sintética','Synthetic maintenance mode',0,'f1700000-0000-4000-8000-000000000040');
COMMIT;
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f1700000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"f1700000-0000-4000-8000-000000000002"}',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.f17_lab_resources)<>0 OR (SELECT count(*) FROM storage.objects)<>0
  OR (SELECT count(*) FROM realtime.messages)<>0 THEN RAISE EXCEPTION 'Maintenance RLS bypass';END IF;
 BEGIN INSERT INTO storage.objects VALUES(3,auth.uid());RAISE EXCEPTION 'FAIL storage write during maintenance';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 PERFORM set_config('request.path','/rpc/pazo_my_support_tickets',true);
 BEGIN PERFORM public.pazo_app_pre_request_gate();RAISE EXCEPTION 'FAIL RPC bypass';EXCEPTION WHEN sqlstate 'PT503' THEN NULL;END;
 PERFORM set_config('request.path','/rpc/not_really_pazo_is_admin',true);
 BEGIN PERFORM public.pazo_app_pre_request_gate();RAISE EXCEPTION 'FAIL suffix bypass';EXCEPTION WHEN sqlstate 'PT503' THEN NULL;END;
 PERFORM set_config('request.path','/rpc/pazo_public_maintenance_status',true);PERFORM public.pazo_app_pre_request_gate();
 IF public.pazo_public_maintenance_status()->>'enabled'<>'true' THEN RAISE EXCEPTION 'Public state unavailable';END IF;
 BEGIN PERFORM public.pazo_admin_set_maintenance(false,'Mantenimiento de prueba sintética','Synthetic maintenance mode',1,gen_random_uuid());
 RAISE EXCEPTION 'FAIL non-admin restore';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
ROLLBACK;
BEGIN;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SET LOCAL ROLE service_role;
SELECT public.pazo_app_pre_request_gate();
DO $$ BEGIN IF public.pazo_f17_service_new_checkout_allowed() THEN RAISE EXCEPTION 'QA CREATE admitted during maintenance';END IF;END $$;
ROLLBACK;
BEGIN;
DO $$ BEGIN
 BEGIN UPDATE admin_private.pazo_live_release_control SET mode='canary';
 RAISE EXCEPTION 'FAIL finance activation during maintenance';EXCEPTION WHEN raise_exception THEN
 IF SQLERRM='FAIL finance activation during maintenance' THEN RAISE;END IF;END;
 IF admin_private.pazo_live_control_admits('f1700000-0000-4000-8000-000000000002',1) THEN RAISE EXCEPTION 'CREATE admitted';END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f1700000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.f17_lab_resources)<>1 THEN RAISE EXCEPTION 'Admin lockout';END IF;
 BEGIN PERFORM public.pazo_admin_set_maintenance(false,'Mantenimiento de prueba sintética','Synthetic maintenance mode',0,gen_random_uuid());
 RAISE EXCEPTION 'FAIL stale revision';EXCEPTION WHEN serialization_failure THEN NULL;END;
 PERFORM public.pazo_admin_set_maintenance(false,'Mantenimiento de prueba sintética','Synthetic maintenance mode',1,'f1700000-0000-4000-8000-000000000041');
 PERFORM public.pazo_admin_set_maintenance(true,'Mantenimiento de prueba sintética','Synthetic maintenance mode',0,'f1700000-0000-4000-8000-000000000040');
 IF public.pazo_public_maintenance_status()->>'enabled'<>'false' THEN RAISE EXCEPTION 'Old enable replay reversed restore';END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.f17_finance_snapshot WHERE
  periods<>(SELECT count(*) FROM supporter_private.pazo_paypal_live_paid_periods)
  OR intents<>(SELECT count(*) FROM supporter_private.pazo_paypal_live_checkout_intents)) THEN RAISE EXCEPTION 'F17 manufactured financial evidence';END IF;
 IF NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch WHERE NOT live_enabled AND kill_switch) THEN RAISE EXCEPTION 'F17 changed finance switch';END IF;
END $$;
COMMIT;
BEGIN;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $$ BEGIN IF NOT public.pazo_f17_service_new_checkout_allowed() THEN RAISE EXCEPTION 'Restored QA admission unavailable';END IF;END $$;
ROLLBACK;
SELECT 'F17_PG17_SECURITY_PRIVACY_RETENTION_COURTESY_MAINTENANCE_PASS';

\set ON_ERROR_STOP on
DO $$ BEGIN
 IF current_database()<>'pazo_return_roadmap_test' THEN RAISE EXCEPTION 'Disposable roadmap database required'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
END $$;
CREATE SCHEMA auth;
CREATE SCHEMA marketing_private;
CREATE SCHEMA admin_private;
CREATE SCHEMA push_private;
CREATE SCHEMA cron;
CREATE TABLE cron.job (name text PRIMARY KEY, command text NOT NULL);
CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE sql AS $$ INSERT INTO cron.job VALUES ($1,$3) RETURNING 1::bigint; $$;
CREATE TABLE auth.users (
 id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(), email_confirmed_at timestamptz,
 confirmation_sent_at timestamptz, last_sign_in_at timestamptz, is_anonymous boolean NOT NULL DEFAULT false,
 raw_app_meta_data jsonb NOT NULL DEFAULT '{"provider":"email"}', raw_user_meta_data jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE admin_private.admin_grants(user_id uuid PRIMARY KEY);
CREATE TABLE admin_private.app_activity_daily(user_id uuid,activity_day date);
CREATE TABLE public.pets(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES auth.users,created_at timestamptz DEFAULT now(),visible boolean DEFAULT true);
CREATE TABLE public.care_items(pet_id uuid REFERENCES public.pets,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users,
 type text CHECK(type='system'),pet_id uuid,source_id uuid,title text,body text,read_at timestamptz);
CREATE TABLE push_private.subscriptions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users,
 endpoint text UNIQUE, p256dh text,auth text,lang text,updated_at timestamptz DEFAULT now());
CREATE TABLE push_private.preferences(user_id uuid PRIMARY KEY REFERENCES auth.users,admin_vigilante boolean DEFAULT true,updated_at timestamptz DEFAULT now());
CREATE TABLE push_private.outbox(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users,
 kind text CHECK(kind='system'),notification_id uuid REFERENCES public.notifications,status text DEFAULT 'pending',leased_until timestamptz);
CREATE TABLE marketing_private.collection_gate(singleton boolean PRIMARY KEY DEFAULT true,enabled boolean DEFAULT true,retention_days integer DEFAULT 14,policy_version text DEFAULT 'fixture');
INSERT INTO marketing_private.collection_gate DEFAULT VALUES;
CREATE TABLE marketing_private.acquisition(owner_id uuid PRIMARY KEY,campaign text,recorded_at timestamptz DEFAULT now());
CREATE TABLE marketing_private.experience_detail_daily(day date,kind text,value text,requests integer);
CREATE FUNCTION marketing_private.experience_details_ready() RETURNS boolean LANGUAGE sql AS $$ SELECT false; $$;
CREATE FUNCTION marketing_private.retention_ready(integer,text) RETURNS boolean LANGUAGE sql AS $$ SELECT $1=14; $$;
CREATE FUNCTION marketing_private.campaign_for_creative(text) RETURNS text LANGUAGE sql AS $$ SELECT CASE WHEN $1='qr_es' THEN 'pazo_beta_local_202610' END; $$;
CREATE FUNCTION marketing_private.record_verified_acquisition(uuid,text,timestamptz) RETURNS boolean LANGUAGE sql AS $$
 INSERT INTO marketing_private.acquisition(owner_id,campaign) SELECT $1,marketing_private.campaign_for_creative($2)
 WHERE EXISTS(SELECT 1 FROM auth.users WHERE id=$1 AND email_confirmed_at IS NOT NULL)
 ON CONFLICT DO NOTHING RETURNING true;
$$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
CREATE FUNCTION public.pazo_is_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM admin_private.admin_grants WHERE user_id=auth.uid()); $$;
CREATE FUNCTION marketing_private.is_reporting_owner(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT NOT EXISTS(SELECT 1 FROM admin_private.admin_grants WHERE user_id=$1); $$;
CREATE FUNCTION public.pazo_maintenance_data_allowed() RETURNS boolean LANGUAGE sql AS $$ SELECT true; $$;
CREATE FUNCTION public.f14_content_visible(text,uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT visible FROM public.pets WHERE id=$2; $$;
CREATE FUNCTION push_private.is_enabled() RETURNS boolean LANGUAGE sql AS $$ SELECT true; $$;
CREATE FUNCTION public.pazo_push_preferences() RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$
 select jsonb_build_object('adminVigilante',coalesce((select p.admin_vigilante from push_private.preferences p where p.user_id=auth.uid()),true));
$$;
CREATE FUNCTION public.pazo_push_worker_lease(p_limit integer) RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'subscriptions',
   (SELECT coalesce(jsonb_agg(s.id),'[]') FROM push_private.subscriptions s where s.user_id=l.user_id))), '[]')
 FROM push_private.outbox l WHERE l.status='leased';
$$;
CREATE FUNCTION public.pazo_push_worker_report(p_results jsonb) RETURNS void LANGUAGE plpgsql AS $$
declare r jsonb;
begin
 for r in select * from jsonb_array_elements(coalesce(p_results,'[]'::jsonb)) loop
  UPDATE push_private.outbox SET status='sent' WHERE id=(r->>'id')::uuid;
 end loop;
end $$;
GRANT USAGE ON SCHEMA admin_private TO authenticated;
\ir ../migrations/20261106120000_pazo_signup_funnel.sql
\ir ../migrations/20261108131000_pazo_campaign_signup_continuity.sql
\ir ../migrations/20261108132000_pazo_return_tips.sql

-- Browser A supplies one closed code. Browser B confirms with no campaign metadata.
INSERT INTO auth.users(id,raw_user_meta_data) VALUES ('00000000-0000-0000-0000-000000000010',
 jsonb_build_object('pazo_pending_campaign',jsonb_build_object('creative','qr_es','first_touch_ms',floor(extract(epoch FROM now()-interval '1 hour')*1000))));
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM marketing_private.pending_signup_campaign) OR
   EXISTS(SELECT 1 FROM auth.users WHERE raw_user_meta_data ? 'pazo_pending_campaign') OR push_private.return_tick()<>0 THEN
   RAISE EXCEPTION 'Disabled candidates staged data or delivered';
 END IF;
END $$;
UPDATE marketing_private.signup_campaign_gate SET enabled=true;
INSERT INTO auth.users(id,raw_user_meta_data) VALUES ('00000000-0000-0000-0000-000000000011',
 jsonb_build_object('pazo_pending_campaign',jsonb_build_object('creative','qr_es','first_touch_ms',floor(extract(epoch FROM now()-interval '1 hour')*1000))));
DO $$ BEGIN
 IF (SELECT count(*) FROM marketing_private.pending_signup_campaign)<>1 OR EXISTS(SELECT 1 FROM marketing_private.acquisition)
    OR EXISTS(SELECT 1 FROM auth.users WHERE raw_user_meta_data ? 'pazo_pending_campaign') THEN RAISE EXCEPTION 'Pending campaign isolation failed'; END IF;
END $$;
UPDATE auth.users SET email_confirmed_at=now() WHERE id='00000000-0000-0000-0000-000000000011';
DO $$ BEGIN
 IF (SELECT count(*) FROM marketing_private.acquisition)<>1 OR EXISTS(SELECT 1 FROM marketing_private.pending_signup_campaign) THEN
   RAISE EXCEPTION 'Cross-browser confirmation did not promote exactly once'; END IF;
END $$;
INSERT INTO auth.users(id,raw_user_meta_data) VALUES ('00000000-0000-0000-0000-000000000012',
 jsonb_build_object('pazo_pending_campaign',jsonb_build_object('creative','unknown','first_touch_ms',floor(extract(epoch FROM now()-interval '1 hour')*1000))));
INSERT INTO auth.users(id,raw_user_meta_data) VALUES ('00000000-0000-0000-0000-000000000013',
 jsonb_build_object('pazo_pending_campaign',jsonb_build_object('creative','qr_es','first_touch_ms',floor(extract(epoch FROM now()-interval '1 hour')*1000))));
UPDATE marketing_private.pending_signup_campaign SET first_touch_at=now()-interval '73 hours',expires_at=now()-interval '1 hour';
DO $$ BEGIN
 EXECUTE (SELECT command FROM cron.job WHERE name='pazo-expired-signup-campaign-v1');
 IF EXISTS(SELECT 1 FROM marketing_private.pending_signup_campaign) OR EXISTS(SELECT 1 FROM auth.users WHERE raw_user_meta_data ? 'pazo_pending_campaign') THEN
   RAISE EXCEPTION 'Expired or unrecognized campaigns survived'; END IF;
END $$;
INSERT INTO admin_private.admin_grants VALUES ('00000000-0000-0000-0000-000000000099');
SET ROLE authenticated;
SET "request.jwt.claim.sub"='00000000-0000-0000-0000-000000000011';
DO $$ BEGIN
 BEGIN
  PERFORM public.pazo_admin_signup_summary_v1(ARRAY['00000000-0000-0000-0000-000000000011'::uuid]);
  RAISE EXCEPTION 'Account campaign exposed to ordinary user';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SET "request.jwt.claim.sub"='00000000-0000-0000-0000-000000000099';
DO $$ BEGIN
 IF public.pazo_admin_signup_summary_v1(ARRAY['00000000-0000-0000-0000-000000000011'::uuid]) #>>
   '{accounts,00000000-0000-0000-0000-000000000011,ad_campaign}' IS DISTINCT FROM 'pazo_beta_local_202610' THEN RAISE EXCEPTION 'Missing admin campaign'; END IF;
END $$;
RESET ROLE;
UPDATE marketing_private.acquisition SET recorded_at=now()-interval '15 days';
SET ROLE authenticated;
DO $$ BEGIN
 IF public.pazo_admin_signup_summary_v1(ARRAY['00000000-0000-0000-0000-000000000011'::uuid]) #>>
   '{accounts,00000000-0000-0000-0000-000000000011,ad_campaign}' IS NOT NULL THEN RAISE EXCEPTION 'Old campaign exposed'; END IF;
END $$;
RESET ROLE;

UPDATE push_private.return_gate SET enabled=true;
INSERT INTO auth.users(id,email_confirmed_at) VALUES
 ('00000000-0000-0000-0000-000000000021',now()-interval '3 days'),
 ('00000000-0000-0000-0000-000000000022',now()-interval '4 days'),
 ('00000000-0000-0000-0000-000000000023',now()-interval '8 days'),
 ('00000000-0000-0000-0000-000000000024',now()-interval '16 days');
INSERT INTO public.pets VALUES
 ('10000000-0000-0000-0000-000000000022','00000000-0000-0000-0000-000000000022',now()-interval '4 days',true),
 ('10000000-0000-0000-0000-000000000023','00000000-0000-0000-0000-000000000023',now()-interval '20 days',true),
 ('10000000-0000-0000-0000-000000000024','00000000-0000-0000-0000-000000000024',now()-interval '20 days',true);
INSERT INTO public.care_items VALUES ('10000000-0000-0000-0000-000000000024',now());
WITH zone AS (SELECT name FROM pg_timezone_names WHERE (now() AT TIME ZONE name)::time BETWEEN time '10:00' AND time '18:00' ORDER BY name LIMIT 1)
INSERT INTO push_private.subscriptions(user_id,endpoint,return_zone)
 SELECT '00000000-0000-0000-0000-000000000021', endpoints.endpoint, zone.name
 FROM zone CROSS JOIN (VALUES ('fixture-device-a'),('fixture-device-b')) endpoints(endpoint);
DO $$ DECLARE queued uuid; device uuid; BEGIN
 IF push_private.return_tick()<>3 OR push_private.return_tick()<>0 THEN RAISE EXCEPTION 'Timing, priority, dedup or second-phase hold failed'; END IF;
 IF (SELECT array_agg(stage ORDER BY stage) FROM push_private.return_log)<>ARRAY['return_care','return_no_pet','return_share'] THEN RAISE EXCEPTION 'Wrong stages'; END IF;
 IF (SELECT count(*) FROM push_private.outbox)<>1 THEN RAISE EXCEPTION 'Unknown device should receive in-app only'; END IF;
 UPDATE push_private.outbox SET status='leased',leased_until=now()+interval '2 minutes' RETURNING id INTO queued;
 device:=push_private.return_device('00000000-0000-0000-0000-000000000021',now());
 IF NOT public.pazo_push_worker_return_allowed(queued,device) OR jsonb_array_length(public.pazo_push_worker_lease(20)->0->'subscriptions')<>1 THEN
  RAISE EXCEPTION 'One-device preflight failed'; END IF;
 INSERT INTO push_private.preferences(user_id,return_tips) VALUES ('00000000-0000-0000-0000-000000000021',false);
 IF public.pazo_push_worker_return_allowed(queued,device) THEN RAISE EXCEPTION 'Opt-out did not block the queued send'; END IF;
 UPDATE push_private.preferences SET return_tips=true WHERE user_id='00000000-0000-0000-0000-000000000021';
 INSERT INTO public.pets(id,owner_id) VALUES ('10000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000021');
 IF public.pazo_push_worker_return_allowed(queued,device) THEN RAISE EXCEPTION 'An already completed step would still send'; END IF;
 PERFORM public.pazo_push_worker_report(jsonb_build_array(jsonb_build_object('id',queued,'ok',jsonb_build_array(device))));
 IF (SELECT count(*) FROM push_private.return_log WHERE accepted_at IS NOT NULL)<>1 THEN RAISE EXCEPTION 'Provider acceptance was not recorded'; END IF;
END $$;
DO $$ BEGIN
 IF has_function_privilege('authenticated','public.pazo_push_worker_return_allowed(uuid,uuid)','EXECUTE') OR
    has_function_privilege('anon','public.pazo_admin_return_tip_summary()','EXECUTE') THEN RAISE EXCEPTION 'Push or metrics privilege too broad'; END IF;
END $$;
SET ROLE authenticated;
SET "request.jwt.claim.sub"='00000000-0000-0000-0000-000000000099';
DO $$ BEGIN
 IF jsonb_array_length(public.pazo_admin_return_tip_summary())<>3 THEN RAISE EXCEPTION 'Admin totals did not include the three eligible stages'; END IF;
END $$;
RESET ROLE;
UPDATE push_private.return_gate SET phase_two=true;
DO $$ BEGIN
 IF push_private.return_tick()<>1 THEN RAISE EXCEPTION 'Unexpected second-phase batch size'; END IF;
 IF NOT EXISTS(SELECT 1 FROM push_private.return_log WHERE stage='return_home') THEN RAISE EXCEPTION 'Second phase did not remain independently controlled'; END IF;
END $$;
\echo Roadmap campaign continuity and return tips: PASS

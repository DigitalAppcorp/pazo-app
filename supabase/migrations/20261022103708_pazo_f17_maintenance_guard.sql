-- REVIEW REQUIRED: presence in Git is not hosted-application evidence.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $source_guard$ BEGIN
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='admin_private.pazo_live_control_admits(uuid,bigint)'::regprocedure) IS DISTINCT FROM '8c09ce201937af5887ed2b3fd8e2801b' THEN RAISE EXCEPTION 'Reviewed F17 dependency changed: admin_private.pazo_live_control_admits(uuid,bigint)'; END IF;
END $source_guard$;
-- F17 maintenance. Applies guards with maintenance OFF; no financial state changes.
-- Public cached files / issued signed URLs and Auth remain available by design.
create table admin_private.pazo_app_maintenance(
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,revision bigint not null default 0 check(revision>=0),
 message_es text not null default 'PAZO está en mantenimiento. Volveremos pronto.',
 message_en text not null default 'PAZO is under maintenance. We will be back soon.',
 changed_at timestamptz not null default now(),changed_by uuid
);
insert into admin_private.pazo_app_maintenance(singleton) values(true);
create table admin_private.pazo_app_maintenance_audit(
 id bigint generated always as identity primary key,
 request_id uuid unique not null,enabled boolean not null,actor_id uuid not null,
 request_fingerprint text not null check(request_fingerprint ~ '^[a-f0-9]{64}$'),from_revision bigint not null,
 at timestamptz not null default now()
);
alter table admin_private.pazo_app_maintenance enable row level security;
alter table admin_private.pazo_app_maintenance force row level security;
alter table admin_private.pazo_app_maintenance_audit enable row level security;
alter table admin_private.pazo_app_maintenance_audit force row level security;
revoke all on admin_private.pazo_app_maintenance,admin_private.pazo_app_maintenance_audit
 from public,anon,authenticated,service_role;

create or replace function public.pazo_public_maintenance_status()
returns jsonb language sql stable security definer set search_path=''
as $function$
 select pg_catalog.jsonb_build_object('enabled',m.enabled,'revision',m.revision,
  'message_es',m.message_es,'message_en',m.message_en,'updated_at',m.changed_at)
 from admin_private.pazo_app_maintenance m where m.singleton;
$function$;
revoke all on function public.pazo_public_maintenance_status() from public;
grant execute on function public.pazo_public_maintenance_status() to anon,authenticated,service_role;

create or replace function public.pazo_admin_set_maintenance(
 p_enabled boolean,p_message_es text,p_message_en text,p_expected_revision bigint,p_request_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $function$
declare actor uuid:=auth.uid(); revision_now bigint; fingerprint text; previous admin_private.pazo_app_maintenance_audit%rowtype;
begin
 if actor is null or not public.pazo_is_admin() then
  raise exception 'Admin required' using errcode='42501';end if;
 if p_enabled is null or p_request_id is null or p_expected_revision is null
   or p_expected_revision<0 or char_length(btrim(coalesce(p_message_es,''))) not between 12 and 300
   or char_length(btrim(coalesce(p_message_en,''))) not between 12 and 300 then
  raise exception 'Invalid maintenance details' using errcode='22023';end if;
 fingerprint:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  pg_catalog.jsonb_build_array(btrim(p_message_es),btrim(p_message_en))::text,'UTF8')),'hex');
 -- Same lock order as financial control. Never interrupt an admitted payment.
 perform 1 from admin_private.pazo_live_release_control where singleton for update;
 perform 1 from admin_private.pazo_paypal_new_checkout_switch where singleton for update;
 select revision into strict revision_now from admin_private.pazo_app_maintenance where singleton for update;
 select * into previous from admin_private.pazo_app_maintenance_audit where request_id=p_request_id;
 if found then
  if previous.actor_id is distinct from actor or previous.enabled is distinct from p_enabled
   or previous.from_revision is distinct from p_expected_revision
   or previous.request_fingerprint is distinct from fingerprint then
   raise exception 'Maintenance request conflict' using errcode='22023';end if;
  return true; -- Old request replay never reverses a later restore/stop.
 end if;
 if revision_now<>p_expected_revision then
  raise exception 'Read current maintenance state' using errcode='40001';end if;
 if p_enabled and (
  exists(select 1 from admin_private.pazo_live_release_control where singleton and mode<>'off')
  or exists(select 1 from admin_private.pazo_paypal_new_checkout_switch where singleton and live_enabled)
 ) then raise exception 'Stop new PayPal purchases through the release controls first' using errcode='P0001';end if;
 update admin_private.pazo_app_maintenance set enabled=p_enabled,
  message_es=btrim(p_message_es),message_en=btrim(p_message_en),revision=revision+1,
  changed_at=clock_timestamp(),changed_by=actor where singleton;
 insert into admin_private.pazo_app_maintenance_audit(request_id,enabled,actor_id,request_fingerprint,from_revision)
 values(p_request_id,p_enabled,actor,fingerprint,revision_now);
 return true;
end $function$;
revoke all on function public.pazo_admin_set_maintenance(boolean,text,text,bigint,uuid) from public,anon,service_role;
grant execute on function public.pazo_admin_set_maintenance(boolean,text,text,bigint,uuid) to authenticated;

-- Prevent admin financial activation during maintenance; stop and history remain usable.
create or replace function admin_private.pazo_maintenance_financial_guard()
returns trigger language plpgsql security definer set search_path=''
as $function$
begin
 if exists(select 1 from admin_private.pazo_app_maintenance where singleton and enabled)
  and ((tg_table_name='pazo_live_release_control' and to_jsonb(new)->>'mode'<>'off')
    or (tg_table_name='pazo_paypal_new_checkout_switch' and (to_jsonb(new)->>'live_enabled')::boolean)) then
  raise exception 'Application maintenance prevents new checkout activation' using errcode='P0001';end if;
 return new;
end $function$;
revoke all on function admin_private.pazo_maintenance_financial_guard() from public,anon,authenticated,service_role;
create trigger pazo_maintenance_financial_guard before update on admin_private.pazo_live_release_control
 for each row execute function admin_private.pazo_maintenance_financial_guard();
create trigger pazo_maintenance_financial_guard before update on admin_private.pazo_paypal_new_checkout_switch
 for each row execute function admin_private.pazo_maintenance_financial_guard();

create or replace function public.pazo_maintenance_data_allowed()
returns boolean language sql stable security definer set search_path=''
as $function$
 select not exists(select 1 from admin_private.pazo_app_maintenance where singleton and enabled)
  or (auth.uid() is not null and public.pazo_is_admin());
$function$;
revoke all on function public.pazo_maintenance_data_allowed() from public;
grant execute on function public.pazo_maintenance_data_allowed() to anon,authenticated,service_role;

create or replace function public.pazo_app_pre_request_gate()
returns void language plpgsql security definer set search_path=''
as $function$
declare jwt_role text:=coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','anon');
 path text:=coalesce(current_setting('request.path',true),'');
begin
 -- Signed intake, refunds, cancellations and private workers retain service access.
 if jwt_role='service_role' then return;end if;
 if path=any(array[
  '/rpc/pazo_public_maintenance_status','/rpc/pazo_is_admin','/rpc/pazo_admin_set_maintenance',
  '/rest/v1/rpc/pazo_public_maintenance_status','/rest/v1/rpc/pazo_is_admin','/rest/v1/rpc/pazo_admin_set_maintenance'
 ]) then return;end if;
 if public.pazo_maintenance_data_allowed() then return;end if;
 raise sqlstate 'PT503' using message='PAZO is temporarily under maintenance';
end $function$;
revoke all on function public.pazo_app_pre_request_gate() from public;
grant execute on function public.pazo_app_pre_request_gate() to anon,authenticated,service_role;

-- Restrictive policies intersect existing ownership/moderation policies.
-- They grant nothing while OFF. Storage protected requests and PostgresChanges
-- use RLS too; public CDN objects / previously signed URLs are not revocable here.
do $policies$
declare target record;
begin
 for target in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where c.relkind in ('r','p') and c.relrowsecurity and
   (n.nspname='public' or (n.nspname='storage' and c.relname='objects')
    or (n.nspname='realtime' and c.relname='messages')) loop
  execute format('CREATE POLICY pazo_maintenance_access ON %I.%I AS RESTRICTIVE FOR ALL TO anon,authenticated USING ((SELECT public.pazo_maintenance_data_allowed())) WITH CHECK ((SELECT public.pazo_maintenance_data_allowed()))',target.nspname,target.relname);
 end loop;
end $policies$;

-- Admission for Live CREATE/recovery remains denied, even to service callers.
CREATE OR REPLACE FUNCTION admin_private.pazo_live_control_admits(p_owner uuid,p_generation bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $function$
 SELECT p_owner IS NOT NULL AND
  NOT EXISTS(SELECT 1 FROM admin_private.pazo_app_maintenance WHERE singleton AND enabled) AND
  admin_private.pazo_live_artifact_ready() AND EXISTS(
  SELECT 1 FROM admin_private.pazo_live_release_control c
  JOIN admin_private.pazo_paypal_new_checkout_switch s ON s.singleton AND s.revision=c.revision
  JOIN supporter_private.pazo_paypal_live_worker_control w ON w.singleton
  WHERE c.singleton AND c.mode IN('canary','public') AND c.merchant_generation=p_generation
   AND (c.mode='public' OR c.canary_owner=p_owner)
   AND s.environment='live' AND s.live_enabled AND NOT s.kill_switch
   AND s.active_generation=c.merchant_generation AND w.enabled AND w.processing_enabled
   AND w.expected_build='pazo_live_worker_v2'
   AND w.last_heartbeat_at BETWEEN statement_timestamp()-interval '5 minutes' AND statement_timestamp());
$function$;

-- The released Sandbox QA Edge still uses server-side credentials for CREATE.
-- Its new-action guard calls this; cancel/status/receipt actions stay available.
create or replace function public.pazo_f17_service_new_checkout_allowed()
returns boolean language plpgsql stable security definer set search_path=''
as $function$
begin
 if (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role') is distinct from 'service_role' then
  raise exception 'Service role required' using errcode='42501';end if;
 return not exists(select 1 from admin_private.pazo_app_maintenance where singleton and enabled);
end $function$;
revoke all on function public.pazo_f17_service_new_checkout_allowed() from public,anon,authenticated;
grant execute on function public.pazo_f17_service_new_checkout_allowed() to service_role;

-- Refuse to replace an unknown existing gateway hook. Audit currently found none.
do $activation$
begin
 if not exists(select 1 from pg_roles where rolname='authenticator') then
  raise exception 'Expected PostgREST authenticator role missing';end if;
 if exists(select 1 from pg_db_role_setting s left join pg_roles r on r.oid=s.setrole
  cross join lateral unnest(s.setconfig) x(setting)
  where (s.setrole=0 or r.rolname='authenticator') and s.setdatabase in(0,(select oid from pg_database where datname=current_database()))
   and x.setting like 'pgrst.db_pre_request=%'
   and x.setting<>'pgrst.db_pre_request=public.pazo_app_pre_request_gate') then
  raise exception 'Existing pre-request hook requires explicit composition';end if;
end $activation$;
-- Activation occurs ONLY when this complete migration receives deployment GO.
alter role authenticator set pgrst.db_pre_request='public.pazo_app_pre_request_gate';
notify pgrst,'reload config';

COMMIT;

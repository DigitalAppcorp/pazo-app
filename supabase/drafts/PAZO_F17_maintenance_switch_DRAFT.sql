-- F17 DRAFT ONLY, NOT APPLIED. Requires production maintenance readiness GO.
-- The blocker is audited, admin-only, and refuses to enable if PayPal checkout
-- is open. MUST additionally audit Storage/Realtime/Edge non-REST operations
-- before describing this as a complete all-surface maintenance switch.
create table admin_private.pazo_app_maintenance(
 singleton boolean primary key default true check (singleton),
 enabled boolean not null default false,
 message_es text not null default 'PAZO está en mantenimiento. Volveremos pronto.',
 message_en text not null default 'PAZO is under maintenance. We will be back soon.',
 changed_at timestamptz not null default now(),
 changed_by uuid
);
insert into admin_private.pazo_app_maintenance(singleton,enabled) values(true,false)
 on conflict(singleton) do nothing;
revoke all on admin_private.pazo_app_maintenance from public,anon,authenticated;
create table admin_private.pazo_app_maintenance_audit(
 id bigint generated always as identity primary key,
 enabled boolean not null,actor_id uuid not null,at timestamptz not null default now()
);
revoke all on admin_private.pazo_app_maintenance_audit from public,anon,authenticated;

create or replace function public.pazo_public_maintenance_status()
returns jsonb language sql stable security definer set search_path=''
as $function$
 select pg_catalog.jsonb_build_object('enabled',m.enabled,
  'message_es',m.message_es,'message_en',m.message_en,
  'updated_at',m.changed_at)
 from admin_private.pazo_app_maintenance m where m.singleton;
$function$;
revoke all on function public.pazo_public_maintenance_status() from public;
grant execute on function public.pazo_public_maintenance_status() to anon,authenticated,service_role;

create or replace function public.pazo_admin_set_maintenance(
 p_enabled boolean,p_message_es text,p_message_en text)
returns boolean language plpgsql security definer set search_path=''
as $function$
declare actor uuid:=auth.uid();
begin
 if actor is null or not public.pazo_is_admin() then
  raise exception 'Admin required' using errcode='42501';end if;
 if p_enabled is null or char_length(btrim(coalesce(p_message_es,''))) not between 12 and 300
   or char_length(btrim(coalesce(p_message_en,''))) not between 12 and 300 then
  raise exception 'Invalid maintenance details' using errcode='22023';end if;
 if p_enabled and (
  exists(select 1 from admin_private.pazo_live_release_control where singleton and mode<>'off')
  or exists(select 1 from admin_private.pazo_paypal_new_checkout_switch where singleton and live_enabled)
 ) then raise exception 'Stop new PayPal purchases through the release controls first' using errcode='P0001';end if;
 update admin_private.pazo_app_maintenance set
  enabled=p_enabled,message_es=btrim(p_message_es),message_en=btrim(p_message_en),
  changed_at=clock_timestamp(),changed_by=actor where singleton=true;
 insert into admin_private.pazo_app_maintenance_audit(enabled,actor_id) values(p_enabled,actor);
 return true;
end $function$;
revoke all on function public.pazo_admin_set_maintenance(boolean,text,text) from public,anon;
grant execute on function public.pazo_admin_set_maintenance(boolean,text,text) to authenticated;

create or replace function public.pazo_app_pre_request_gate()
returns void language plpgsql security definer set search_path=''
as $function$
declare current_role text:=coalesce((nullif(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role'),'anon');
 path text:=coalesce(pg_catalog.current_setting('request.path',true),'');
begin
 -- Existing administrative workers (service_role) still process signed
 -- webhooks, refunds, cancellations and financial reconciliation.
 if current_role='service_role' then return;end if;
 if not exists(select 1 from admin_private.pazo_app_maintenance where singleton and enabled)
 then return;end if;
 -- Public status is readable while ordinary Data API operations are blocked.
 if path like '%pazo_public_maintenance_status' or path like '%pazo_is_admin'
  or path like '%pazo_admin_set_maintenance' then return;end if;
 if auth.uid() is not null and public.pazo_is_admin() then return;end if;
 raise exception 'PAZO está temporalmente en mantenimiento'
  using errcode='P0001';
end $function$;
revoke execute on function public.pazo_app_pre_request_gate() from public;
grant execute on function public.pazo_app_pre_request_gate() to anon,authenticated,service_role;

-- Deny payment initiation while maintenance is enabled (without modifying
-- financial history, existing subscriptions, webhooks or cancellation flows).
CREATE OR REPLACE FUNCTION admin_private.pazo_live_control_admits(p_owner uuid, p_generation bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
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
   AND w.last_heartbeat_at BETWEEN pg_catalog.statement_timestamp()-interval '5 minutes' AND pg_catalog.statement_timestamp());
$function$
;

-- PRE-REQUEST ACTIVATION IS A SEPARATE EXPLICIT REVIEW GATE:
-- alter role authenticator set pgrst.db_pre_request = 'public.pazo_app_pre_request_gate';
-- notify pgrst, 'reload config';
-- This cannot be declared comprehensive for Realtime/Storage/Edge alone.

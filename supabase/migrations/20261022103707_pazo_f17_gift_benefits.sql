-- REVIEW REQUIRED: presence in Git is not hosted-application evidence.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $source_guard$ BEGIN
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='supporter_private.wall_has_verified_entitlement(uuid)'::regprocedure) IS DISTINCT FROM '89796538fa77752c85a2bea8f5f48907' THEN RAISE EXCEPTION 'Reviewed F17 dependency changed: supporter_private.wall_has_verified_entitlement(uuid)'; END IF;
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.pazo_supporter_set_pet_theme(uuid,text)'::regprocedure) IS DISTINCT FROM '2acb255c716c9de34ca50cf1e289a009' THEN RAISE EXCEPTION 'Reviewed F17 dependency changed: public.pazo_supporter_set_pet_theme(uuid,text)'; END IF;
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.pazo_supporter_public_pet_benefits(uuid)'::regprocedure) IS DISTINCT FROM '055983e8ede5a5a6fa856b73b8717aa2' THEN RAISE EXCEPTION 'Reviewed F17 dependency changed: public.pazo_supporter_public_pet_benefits(uuid)'; END IF;
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.pazo_supporter_my_account_status()'::regprocedure) IS DISTINCT FROM '95c2ecb50c6128ec761097304acfce9e' THEN RAISE EXCEPTION 'Reviewed F17 dependency changed: public.pazo_supporter_my_account_status()'; END IF;
END $source_guard$;
-- F17 courtesy. Gifts are never sales/paid periods.
create table supporter_private.pazo_admin_gift_access (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 milestone int not null check(milestone in (0,1,3,6,12)),
 granted_by uuid not null,
 granted_at timestamptz not null default now(),
 expires_at timestamptz,revoked_at timestamptz,
 reason text not null check(length(btrim(reason)) between 3 and 200)
);
alter table supporter_private.pazo_admin_gift_access enable row level security;
alter table supporter_private.pazo_admin_gift_access force row level security;
revoke all on supporter_private.pazo_admin_gift_access from public,anon,authenticated,service_role;
create table supporter_private.pazo_admin_gift_audit(
 id bigint generated always as identity primary key,
 request_id uuid unique not null,
 owner_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid not null,action text not null check(action in ('grant','revoke')),
 milestone int not null,days int not null,expires_at timestamptz,
 reason text not null,recorded_at timestamptz not null default now()
);
alter table supporter_private.pazo_admin_gift_audit enable row level security;
alter table supporter_private.pazo_admin_gift_audit force row level security;
revoke all on supporter_private.pazo_admin_gift_audit from public,anon,authenticated,service_role;

create or replace function public.pazo_admin_find_benefit_recipients(p_query text)
returns jsonb language plpgsql stable security definer set search_path=''
as $function$
declare v_result jsonb;
begin
 if auth.uid() is null or not public.pazo_is_admin() then
  raise exception 'Admin required' using errcode='42501';end if;
 if p_query is null or length(btrim(p_query)) not between 3 and 80 then
  raise exception 'Search requires 3–80 chars' using errcode='22023';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'owner_id',x.id,'email',x.email,'pets',x.pet_names,
  'gift_level',x.milestone,'gift_expires_at',x.expires_at,'gift_active',x.active)),'[]'::jsonb)
 into v_result from (
  select u.id,u.email,
   (select coalesce(jsonb_agg(p.name order by p.created_at),'[]'::jsonb)
    from public.pets p where p.owner_id=u.id) pet_names,
   g.milestone,g.expires_at,
   (g.owner_id is not null and g.revoked_at is null
    and (g.expires_at is null or g.expires_at>now())) as active
  from auth.users u left join supporter_private.pazo_admin_gift_access g on g.owner_id=u.id
  where pg_catalog.strpos(pg_catalog.lower(coalesce(u.email,'')),pg_catalog.lower(btrim(p_query)))>0
    or exists(select 1 from public.pets p where p.owner_id=u.id
      and pg_catalog.strpos(pg_catalog.lower(p.name),pg_catalog.lower(btrim(p_query)))>0)
  order by u.created_at desc,u.id limit 20
 ) x;
 return v_result;
end $function$;
revoke all on function public.pazo_admin_find_benefit_recipients(text) from public,anon,service_role;
grant execute on function public.pazo_admin_find_benefit_recipients(text) to authenticated;

create or replace function public.pazo_admin_set_gift_benefits(
 p_owner uuid,p_action text,p_level int default 0,p_days int default 30,
 p_reason text default 'Cortesía PAZO',p_request_id uuid default gen_random_uuid())
returns boolean language plpgsql security definer set search_path=''
as $function$
declare actor uuid:=auth.uid(); expiration timestamptz; previous supporter_private.pazo_admin_gift_audit%rowtype;
begin
 if actor is null or not public.pazo_is_admin() then
  raise exception 'Admin required' using errcode='42501';end if;
 if p_owner is null or not exists(select 1 from auth.users where id=p_owner)
   or p_request_id is null or p_action is null or p_action not in('grant','revoke')
   or p_level is null or p_level not in(0,1,3,6,12)
   or p_days is null or p_days not in(0,30,90,365)
   or length(btrim(coalesce(p_reason,''))) not between 3 and 200 then
  raise exception 'Invalid gift request' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,1718));
 select * into previous from supporter_private.pazo_admin_gift_audit where request_id=p_request_id;
 if found then
  if previous.owner_id is distinct from p_owner or previous.actor_id is distinct from actor
    or previous.action is distinct from p_action or previous.milestone is distinct from p_level
    or previous.days is distinct from p_days or previous.reason is distinct from btrim(p_reason) then
   raise exception 'Gift request conflict' using errcode='22023';end if;
  return true; -- Replay never extends a grant or undoes a later revocation.
 end if;
 expiration:=case when p_days=0 then null else clock_timestamp()+make_interval(days=>p_days) end;
 if p_action='grant' then
  insert into supporter_private.pazo_admin_gift_access as g(owner_id,milestone,granted_by,expires_at,reason,revoked_at)
  values(p_owner,p_level,actor,expiration,btrim(p_reason),null)
  on conflict(owner_id) do update set milestone=excluded.milestone,granted_by=excluded.granted_by,
   granted_at=clock_timestamp(),expires_at=excluded.expires_at,reason=excluded.reason,revoked_at=null;
 else
  update supporter_private.pazo_admin_gift_access set revoked_at=clock_timestamp()
   where owner_id=p_owner and revoked_at is null;
 end if;
 insert into supporter_private.pazo_admin_gift_audit(request_id,owner_id,actor_id,action,milestone,days,expires_at,reason)
 values(p_request_id,p_owner,actor,p_action,p_level,p_days,
  case when p_action='grant' then expiration else null end,btrim(p_reason));
 return true;
end $function$;
revoke all on function public.pazo_admin_set_gift_benefits(uuid,text,int,int,text,uuid) from public,anon,service_role;
grant execute on function public.pazo_admin_set_gift_benefits(uuid,text,int,int,text,uuid) to authenticated;

create or replace function public.pazo_admin_gift_history(p_owner uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $function$
begin
 if auth.uid() is null or not public.pazo_is_admin() then
  raise exception 'Admin required' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(to_jsonb(t) order by t.recorded_at desc,t.id desc),'[]'::jsonb)
 from (select id,actor_id,action,milestone,expires_at,reason,recorded_at
  from supporter_private.pazo_admin_gift_audit where owner_id=p_owner
  order by recorded_at desc,id desc limit 20) t);
end $function$;
revoke all on function public.pazo_admin_gift_history(uuid) from public,anon,service_role;
grant execute on function public.pazo_admin_gift_history(uuid) to authenticated;

-- Courtesy can enable a separate voluntary wall opt-in, never auto-publication.
create or replace function supporter_private.wall_has_verified_entitlement(p_owner_id uuid)
returns boolean language sql volatile security definer set search_path=''
as $function$
 select coalesce((supporter_private.pazo_live_project_paid_periods(p_owner_id,clock_timestamp())->>'active')='true',false)
 or exists(select 1 from supporter_private.pazo_admin_gift_access where owner_id=p_owner_id
  and revoked_at is null and (expires_at is null or expires_at>clock_timestamp()))
 or coalesce((supporter_private.f16_sandbox_qa_projection(p_owner_id,clock_timestamp())->>'active')='true',false);
$function$;
revoke all on function supporter_private.wall_has_verified_entitlement(uuid) from public,anon,authenticated,service_role;

-- Preserve verified payment/finance history: only display entitlements change.
CREATE OR REPLACE FUNCTION public.pazo_supporter_my_account_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_owner uuid:=auth.uid();
 v_live jsonb;
 v_qa jsonb;
 v_active boolean;
 v_months integer;
BEGIN
 IF v_owner IS NULL OR NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id=v_owner
   AND u.email_confirmed_at IS NOT NULL
   AND u.is_anonymous IS DISTINCT FROM true
 ) THEN RAISE EXCEPTION 'Confirmed authentication required'
  USING ERRCODE='42501'; END IF;

 v_live:=supporter_private.pazo_live_project_paid_periods(
  v_owner,pg_catalog.clock_timestamp());
 IF v_live IS NULL OR pg_catalog.jsonb_typeof(v_live)<>'object' OR
  v_live->>'sourceEnvironment' IS DISTINCT FROM 'live' OR
  (v_live->>'active') NOT IN ('true','false') OR
  (v_live->>'completedCycles') IS NULL
 THEN RAISE EXCEPTION 'Live projection unavailable'
  USING ERRCODE='P1603'; END IF;
 IF v_live->>'active'='true' THEN
  v_months:=LEAST(100000,GREATEST(0,(v_live->>'completedCycles')::integer));
  -- Cosmetic tier combines active sources; this never changes paid-cycle evidence.
  v_months:=GREATEST(v_months,COALESCE((SELECT milestone FROM supporter_private.pazo_admin_gift_access
   WHERE owner_id=v_owner AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>clock_timestamp())),0));
  RETURN pg_catalog.jsonb_build_object(
   'active',true,'milestone',CASE WHEN v_months>=12 THEN 12
    WHEN v_months>=6 THEN 6 WHEN v_months>=3 THEN 3 ELSE 0 END);
 END IF;

 -- Gifted benefits remain separate from paid periods and payment metrics.
 IF EXISTS(SELECT 1 FROM supporter_private.pazo_admin_gift_access a
  WHERE a.owner_id=v_owner AND a.revoked_at IS NULL
    AND (a.expires_at IS NULL OR a.expires_at>pg_catalog.clock_timestamp())) THEN
  SELECT milestone INTO v_months FROM supporter_private.pazo_admin_gift_access
   WHERE owner_id=v_owner AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at>pg_catalog.clock_timestamp());
  RETURN pg_catalog.jsonb_build_object('active',true,'milestone',CASE WHEN v_months=1 THEN 0 ELSE v_months END);
 END IF;

 -- Existing QA remains a separate, explicitly allowlisted Sandbox source.
 -- A pending Live subscription does not suppress previously verified QA.
 v_qa:=supporter_private.f16_sandbox_qa_projection(
  v_owner,pg_catalog.clock_timestamp());
 v_active:=COALESCE((v_qa->>'active')::boolean,false);
 v_months:=COALESCE((v_qa->>'completedCycles')::integer,0);
 RETURN pg_catalog.jsonb_build_object(
  'active',v_active,
  'milestone',CASE WHEN NOT v_active THEN 0
   WHEN v_months>=12 THEN 12 WHEN v_months>=6 THEN 6
   WHEN v_months>=3 THEN 3 ELSE 0 END);
END $function$
;

CREATE OR REPLACE FUNCTION public.pazo_supporter_public_pet_benefits(p_pet_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_owner uuid;
 v_live jsonb;
 v_months integer;
 v_theme text;
BEGIN
 SELECT owner_id INTO v_owner
 FROM public.pets
 WHERE id=p_pet_id
  AND public.f14_content_visible('pet_profile',id);
 IF v_owner IS NULL THEN
  RETURN pg_catalog.jsonb_build_object('badge',false,'theme',NULL,'milestone',0);
 END IF;


 v_live:=supporter_private.pazo_live_project_paid_periods(
  v_owner,pg_catalog.clock_timestamp());
 IF v_live IS NULL OR pg_catalog.jsonb_typeof(v_live)<>'object' OR
  v_live->>'sourceEnvironment' IS DISTINCT FROM 'live' OR
  (v_live->>'active') NOT IN ('true','false') OR
  (v_live->>'completedCycles') IS NULL
 THEN
  RETURN pg_catalog.jsonb_build_object('badge',false,'theme',NULL,'milestone',0);
 END IF;

 IF v_live->>'active'='true' THEN
  v_months:=LEAST(100000,GREATEST(0,(v_live->>'completedCycles')::integer));
  -- Cosmetic tier combines active sources; this never changes paid-cycle evidence.
  v_months:=GREATEST(v_months,COALESCE((SELECT milestone FROM supporter_private.pazo_admin_gift_access
   WHERE owner_id=v_owner AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>clock_timestamp())),0));
  SELECT t.theme INTO v_theme
   FROM supporter_private.pazo_live_pet_themes t
   WHERE t.pet_id=p_pet_id AND t.owner_id_at_set=v_owner;
  RETURN pg_catalog.jsonb_build_object(
   'badge',true,'theme',v_theme,
   'milestone',CASE WHEN v_months>=12 THEN 12
    WHEN v_months>=6 THEN 6 WHEN v_months>=3 THEN 3 ELSE 0 END);
 END IF;

 -- Manual administrator-granted access is NOT payment or financial evidence.
 IF EXISTS(SELECT 1 FROM supporter_private.pazo_admin_gift_access a
     WHERE a.owner_id=v_owner AND a.revoked_at IS NULL
      AND (a.expires_at IS NULL OR a.expires_at>pg_catalog.clock_timestamp())) THEN
  SELECT a.milestone INTO v_months FROM supporter_private.pazo_admin_gift_access a
   WHERE a.owner_id=v_owner AND a.revoked_at IS NULL
     AND (a.expires_at IS NULL OR a.expires_at>pg_catalog.clock_timestamp());
  SELECT t.theme INTO v_theme FROM supporter_private.pazo_live_pet_themes t
   WHERE t.pet_id=p_pet_id AND t.owner_id_at_set=v_owner;
  RETURN pg_catalog.jsonb_build_object('badge',true,'theme',v_theme,'milestone',CASE WHEN v_months=1 THEN 0 ELSE v_months END);
 END IF;

 RETURN pg_catalog.jsonb_build_object('badge',false,'theme',NULL,'milestone',0);
END $function$
;

CREATE OR REPLACE FUNCTION public.pazo_supporter_set_pet_theme(p_pet_id uuid, p_theme text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_owner uuid:=auth.uid(); v_live jsonb; v_qa jsonb;
BEGIN
 IF v_owner IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=v_owner
  AND email_confirmed_at IS NOT NULL AND is_anonymous IS DISTINCT FROM true)
 THEN RAISE EXCEPTION 'Confirmed authentication required' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.pets WHERE id=p_pet_id AND owner_id=v_owner FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pet not owned' USING ERRCODE='42501'; END IF;
 IF p_theme IS NULL THEN
  -- Removing a preference is available after payment expiry or a hold.
  DELETE FROM supporter_private.pazo_live_pet_themes WHERE pet_id=p_pet_id;
  DELETE FROM supporter_private.f16_sandbox_qa_pet_themes WHERE pet_id=p_pet_id;
  RETURN true;
 END IF;
 IF p_theme NOT IN ('classic','nature','hearts','stars','adventure')
 THEN RAISE EXCEPTION 'Unsupported theme' USING ERRCODE='22023'; END IF;

 v_live:=supporter_private.pazo_live_project_paid_periods(v_owner,pg_catalog.clock_timestamp());
 IF v_live->>'sourceEnvironment'='live' AND v_live->>'active'='true' THEN
  INSERT INTO supporter_private.pazo_live_pet_themes AS t(pet_id,owner_id_at_set,theme)
  VALUES(p_pet_id,v_owner,p_theme) ON CONFLICT(pet_id) DO UPDATE
  SET owner_id_at_set=EXCLUDED.owner_id_at_set,theme=EXCLUDED.theme,
   updated_at=pg_catalog.clock_timestamp();
  RETURN true;
 END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.pazo_admin_gift_access a
  WHERE a.owner_id=v_owner AND a.revoked_at IS NULL
    AND (a.expires_at IS NULL OR a.expires_at>pg_catalog.clock_timestamp())) THEN
  INSERT INTO supporter_private.pazo_live_pet_themes AS t(pet_id,owner_id_at_set,theme)
  VALUES(p_pet_id,v_owner,p_theme) ON CONFLICT(pet_id) DO UPDATE
  SET owner_id_at_set=EXCLUDED.owner_id_at_set,theme=EXCLUDED.theme,
   updated_at=pg_catalog.clock_timestamp();
  RETURN true;
 END IF;

 v_qa:=supporter_private.f16_sandbox_qa_projection(v_owner,pg_catalog.clock_timestamp());
 IF v_qa->>'active' IS DISTINCT FROM 'true'
 THEN RAISE EXCEPTION 'Verified paid coverage required' USING ERRCODE='42501'; END IF;
 -- QA preferences stay in their existing separate table and allowlist.
 INSERT INTO supporter_private.f16_sandbox_qa_pet_themes AS t(pet_id,owner_id_at_set,theme)
 VALUES(p_pet_id,v_owner,p_theme) ON CONFLICT(pet_id) DO UPDATE
 SET owner_id_at_set=EXCLUDED.owner_id_at_set,theme=EXCLUDED.theme,
  updated_at=pg_catalog.clock_timestamp();
 RETURN true;
END $function$
;

COMMENT ON FUNCTION public.pazo_supporter_public_pet_benefits(uuid) IS
 'Public benefits require verified Live coverage or active explicit administrative courtesy. Sandbox QA remains private; no gift is financial evidence.';

COMMIT;

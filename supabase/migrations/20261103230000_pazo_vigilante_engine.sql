-- Vigilante steps 4 and 5: findings from official sources become drafts written from fixed
-- templates; nothing is published or sent until an administrator's decision is recorded here.
-- Installs OFF: vigilante_private.settings.enabled=false stops the worker, ingestion and publishing.
-- Rules and templates only; no AI service.

create schema if not exists vigilante_private;
revoke all on schema vigilante_private from public, anon, authenticated;

create table vigilante_private.settings(
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 daily_draft_cap integer not null default 3 check(daily_draft_cap between 1 and 20),
 dedupe_days integer not null default 7 check(dedupe_days between 1 and 60),
 medium_weekly_cap integer not null default 2 check(medium_weekly_cap between 0 and 7),
 updated_at timestamptz not null default now()
);
insert into vigilante_private.settings(singleton) values(true);

create table vigilante_private.sources(
 key text primary key,
 name text not null,
 home_url text not null check(home_url ~ '^https://'),
 kind text not null check(kind in('heat','smoke','recall','outbreak','manual')),
 enabled boolean not null default true,
 interval_minutes integer not null check(interval_minutes between 15 and 1440),
 trust integer not null default 3 check(trust between 0 and 5),
 last_checked_at timestamptz,
 last_success_at timestamptz,
 consecutive_failures integer not null default 0,
 last_error text,
 rejected_doubtful integer not null default 0
);
insert into vigilante_private.sources(key,name,home_url,kind,enabled,interval_minutes) values
 ('nws_la','Servicio Meteorológico Nacional (NWS)','https://www.weather.gov/lox/','heat',true,60),
 ('fda_recalls','FDA — Recalls, Market Withdrawals & Safety Alerts','https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts','recall',true,240),
 -- AirNow needs a free API key; it stays off until the key is stored as an Edge secret.
 ('airnow_la','AirNow (EPA)','https://www.airnow.gov/','smoke',false,60),
 ('manual','Enlace oficial pegado por el administrador','https://publichealth.lacounty.gov/vet/','manual',true,1440);

-- One row per item read from a source. The fingerprint makes re-reads and cross-source repeats one finding.
create table vigilante_private.findings(
 id uuid primary key default gen_random_uuid(),
 source_key text not null references vigilante_private.sources(key),
 external_id text not null,
 fingerprint text not null,
 kind text not null check(kind in('heat','smoke','recall','outbreak')),
 url text not null check(url ~ '^https://'),
 published_on date not null,
 expires_at timestamptz,
 params jsonb not null default '{}'::jsonb,
 status text not null default 'new' check(status in('new','drafted','duplicate','irrelevant','capped','expired','untrusted')),
 created_at timestamptz not null default now(),
 unique(source_key,external_id)
);
create index vigilante_findings_fingerprint_idx on vigilante_private.findings(fingerprint,created_at desc);

create table vigilante_private.drafts(
 id uuid primary key default gen_random_uuid(),
 finding_id uuid references vigilante_private.findings(id),
 kind text not null check(kind in('heat','smoke','recall','outbreak')),
 priority text not null check(priority in('high','medium','low')),
 title_es text not null, body_es text not null, title_en text not null, body_en text not null,
 vaccine_type text check(vaccine_type is null or vaccine_type = any(array['rabies','dhpp','leptospirosis','bordetella','canine_influenza','fvrcp','felv','other'])),
 food_brand text,
 audience_species text[],
 audience_postal_codes text[],
 source_name text not null,
 source_url text not null check(source_url ~ '^https://'),
 source_published_at date not null,
 expires_at timestamptz,
 review_needed boolean not null default false,
 status text not null default 'pending' check(status in('pending','sent','feed_only','rejected','expired','cancelled')),
 edited boolean not null default false,
 decision text check(decision in('approve','feed_only','reject')),
 reject_reason text check(reject_reason in('not_relevant','doubtful_source','duplicate','tone')),
 decided_by uuid,
 decided_at timestamptz,
 official_post_id uuid references public.official_posts(id) on delete set null,
 notified_count integer,
 push_count integer,
 reminded_at timestamptz[] not null default '{}',
 created_at timestamptz not null default now(),
 constraint vigilante_draft_lengths check(
  char_length(title_es) between 3 and 120 and char_length(title_en) between 3 and 120
  and char_length(body_es) between 3 and 1200 and char_length(body_en) between 3 and 1200),
 constraint vigilante_draft_decision check((status='pending')=(decision is null) or status in('expired','cancelled'))
);
create index vigilante_drafts_status_idx on vigilante_private.drafts(status,created_at desc);

-- Every decision and edit, with the exact text, for later review.
create table vigilante_private.audit(
 id bigint generated always as identity primary key,
 draft_id uuid not null references vigilante_private.drafts(id),
 actor uuid not null,
 action text not null check(action in('approve','feed_only','reject','edit','cancel','test')),
 snapshot jsonb not null,
 created_at timestamptz not null default now()
);

create table vigilante_private.worker_dispatch(
 singleton boolean primary key default true check(singleton),
 dispatch_sha256 bytea,
 dispatch_expires_at timestamptz
);
insert into vigilante_private.worker_dispatch(singleton) values(true);

do $lock$ declare t text; begin
 foreach t in array array['settings','sources','findings','drafts','audit','worker_dispatch'] loop
  execute format('alter table vigilante_private.%I enable row level security',t);
  execute format('alter table vigilante_private.%I force row level security',t);
  execute format('revoke all on vigilante_private.%I from public, anon, authenticated',t);
 end loop;
end $lock$;

-- Bilingual official posts and health notices; the app shows the person's language.
alter table public.official_posts add column title_en text, add column body_en text;
alter table public.notifications add column title_en text, add column body_en text;

-- Administrator notices: a draft waiting for approval, and every approval (to spot one that was not you).
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
 check(type = any(array['sighting','system','community_join','supporter_campaign','supporter_verified','care_reminder','admin_new_pet','admin_new_account','new_follower','welcome','health_alert','admin_vigilante_pending','admin_vigilante_approved']));
alter table push_private.outbox drop constraint outbox_kind_check;
alter table push_private.outbox add constraint outbox_kind_check
 check(kind in('sighting','community_join','care_reminder','admin_new_pet','admin_new_account','new_follower','health_alert','admin_vigilante_pending','admin_vigilante_approved'));
alter table push_private.preferences add column admin_vigilante boolean not null default true;

create or replace function push_private.enqueue_from_notification() returns trigger
language plpgsql security definer set search_path='' as $fn$
begin
 if new.type not in('sighting','community_join','care_reminder','admin_new_pet','admin_new_account','new_follower','health_alert','admin_vigilante_pending','admin_vigilante_approved') or not push_private.is_enabled() then
  return new;
 end if;
 begin
  if exists(select 1 from push_private.subscriptions s where s.user_id=new.user_id)
   and not exists(select 1 from push_private.preferences p where p.user_id=new.user_id and (
    (new.type='sighting' and not p.sightings)
    or (new.type='community_join' and not p.community)
    or (new.type='care_reminder' and not p.care)
    or (new.type='admin_new_pet' and not p.admin_new_pets)
    or (new.type='admin_new_account' and not p.admin_new_accounts)
    or (new.type='new_follower' and not p.followers)
    or (new.type='health_alert' and not p.health_alerts)
    or (new.type in('admin_vigilante_pending','admin_vigilante_approved') and not p.admin_vigilante)))
  then
   insert into push_private.outbox(user_id,kind,notification_id,next_attempt_at)
   values(new.user_id,new.type,new.id,case when new.type='health_alert' then push_private.next_daytime(now()) else now() end)
   on conflict(notification_id) do nothing;
  end if;
 exception when others then
  raise warning 'pazo push enqueue skipped: %',sqlstate;
 end;
 return new;
end
$fn$;

create or replace function public.pazo_push_preferences() returns jsonb
language sql stable security definer set search_path='' as $fn$
 select jsonb_build_object(
  'sightings',coalesce((select p.sightings from push_private.preferences p where p.user_id=auth.uid()),true),
  'community',coalesce((select p.community from push_private.preferences p where p.user_id=auth.uid()),true),
  'care',coalesce((select p.care from push_private.preferences p where p.user_id=auth.uid()),true),
  'followers',coalesce((select p.followers from push_private.preferences p where p.user_id=auth.uid()),true),
  'healthAlerts',coalesce((select p.health_alerts from push_private.preferences p where p.user_id=auth.uid()),true),
  'isAdmin',exists(select 1 from admin_private.admin_grants a where a.user_id=auth.uid()),
  'adminNewPets',coalesce((select p.admin_new_pets from push_private.preferences p where p.user_id=auth.uid()),true),
  'adminNewAccounts',coalesce((select p.admin_new_accounts from push_private.preferences p where p.user_id=auth.uid()),true),
  'adminVigilante',coalesce((select p.admin_vigilante from push_private.preferences p where p.user_id=auth.uid()),true))
$fn$;

create function public.pazo_push_set_admin_vigilante_preference(p_enabled boolean) returns boolean
language plpgsql security definer set search_path='' as $fn$
begin
 if auth.uid() is null or p_enabled is null or not public.pazo_is_admin() then return false; end if;
 insert into push_private.preferences(user_id,admin_vigilante) values(auth.uid(),p_enabled)
 on conflict(user_id) do update set admin_vigilante=excluded.admin_vigilante,updated_at=now();
 return true;
end
$fn$;
revoke all on function public.pazo_push_set_admin_vigilante_preference(boolean) from public, anon;
grant execute on function public.pazo_push_set_admin_vigilante_preference(boolean) to authenticated;

-- ---------- Templates (fixed text; parameters come from the source and are length-bounded) ----------
create or replace function vigilante_private.vaccine_label(p_type text, p_lang text) returns text
language sql immutable set search_path='' as $fn$
 select case p_type
  when 'rabies' then case when p_lang='es' then 'rabia' else 'rabies' end
  when 'dhpp' then case when p_lang='es' then 'moquillo y parvovirus' else 'distemper and parvo' end
  when 'leptospirosis' then 'leptospirosis'
  when 'bordetella' then case when p_lang='es' then 'tos de las perreras' else 'kennel cough' end
  when 'canine_influenza' then case when p_lang='es' then 'influenza canina' else 'canine influenza' end
  when 'fvrcp' then case when p_lang='es' then 'triple felina' else 'feline distemper' end
  when 'felv' then case when p_lang='es' then 'leucemia felina' else 'feline leukemia' end
  else null end
$fn$;

create or replace function vigilante_private.clip(p text, p_max integer) returns text
language sql immutable set search_path='' as $fn$
 select left(regexp_replace(btrim(coalesce(p,'')),'\s+',' ','g'),p_max)
$fn$;

-- Returns {title_es,body_es,title_en,body_en}. No medical claim beyond what the source states.
create or replace function vigilante_private.render(p_kind text, p_params jsonb, p_source text, p_date date)
returns jsonb language plpgsql immutable set search_path='' as $fn$
declare
 v_area_es text := coalesce(nullif(vigilante_private.clip(p_params->>'area',80),''),'el Condado de Los Ángeles');
 v_area_en text := coalesce(nullif(vigilante_private.clip(p_params->>'area',80),''),'Los Angeles County');
 v_until text := vigilante_private.clip(p_params->>'until',40);
 v_d_es text := to_char(p_date,'DD/MM/YYYY');
 v_d_en text := to_char(p_date,'MM/DD/YYYY');
 v_es text; v_en text;
begin
 if p_kind='outbreak' then
  v_es := vigilante_private.vaccine_label(p_params->>'vaccine_type','es');
  v_en := vigilante_private.vaccine_label(p_params->>'vaccine_type','en');
  if v_es is null then raise exception 'Outbreak needs a known vaccine type' using errcode='22023'; end if;
  return jsonb_build_object(
   'title_es',format('Casos de %s reportados en %s',v_es,v_area_es),
   'body_es',format('%s reporta casos de %s en %s (%s). Existe una vacuna contra la %s. Consulta a tu veterinario si tu mascota la necesita.',p_source,v_es,v_area_es,v_d_es,v_es),
   'title_en',format('%s cases reported in %s',initcap(v_en),v_area_en),
   'body_en',format('%s reports %s cases in %s (%s). A vaccine against %s exists. Ask your vet whether your pet needs it.',p_source,v_en,v_area_en,v_d_en,v_en));
 elsif p_kind='recall' then
  return jsonb_build_object(
   'title_es',vigilante_private.clip(format('%s retira %s',p_params->>'brand',p_params->>'product'),120),
   'body_es',format('%s publicó el retiro de %s de la marca %s (%s). Motivo según el aviso: %s. Revisa el lote en la bolsa y sigue las indicaciones del aviso oficial.',p_source,vigilante_private.clip(p_params->>'product',120),vigilante_private.clip(p_params->>'brand',80),v_d_es,vigilante_private.clip(p_params->>'reason',200)),
   'title_en',vigilante_private.clip(format('%s recalls %s',p_params->>'brand',p_params->>'product'),120),
   'body_en',format('%s published a recall of %s by %s (%s). Reason given in the notice: %s. Check the lot number on the bag and follow the official notice.',p_source,vigilante_private.clip(p_params->>'product',120),vigilante_private.clip(p_params->>'brand',80),v_d_en,vigilante_private.clip(p_params->>'reason',200)));
 elsif p_kind='heat' then
  return jsonb_build_object(
   'title_es',format('Aviso de calor en %s',v_area_es),
   'body_es',format('%s emitió un aviso de calor%s (%s). El pavimento caliente puede quemar las patas: pasea temprano o de noche y lleva agua.',p_source,case when v_until<>'' then ' hasta '||v_until else '' end,v_d_es),
   'title_en',format('Heat advisory in %s',v_area_en),
   'body_en',format('%s issued a heat advisory%s (%s). Hot pavement can burn paws: walk early or late and bring water.',p_source,case when v_until<>'' then ' until '||v_until else '' end,v_d_en));
 elsif p_kind='smoke' then
  return jsonb_build_object(
   'title_es',format('Mala calidad del aire en %s',v_area_es),
   'body_es',format('%s informa mala calidad del aire en %s (%s). Acorta los paseos y mantén a tu mascota dentro de casa cuando puedas.',p_source,v_area_es,v_d_es),
   'title_en',format('Poor air quality in %s',v_area_en),
   'body_en',format('%s reports poor air quality in %s (%s). Keep walks short and keep your pet indoors when you can.',p_source,v_area_en,v_d_en));
 end if;
 raise exception 'Unknown template' using errcode='22023';
end
$fn$;

-- ---------- Audience: one row per affected pet, with WHY ----------
-- reason: expired | unregistered | no_date | applies (receive a notice); current | unknown | insufficient | outside (do not).
-- no_date: a dose was recorded as done but no next date exists, so the notice asks instead of concluding.
create or replace function vigilante_private.audience(p_draft vigilante_private.drafts)
returns table(user_id uuid, pet_id uuid, reason text)
language sql stable security definer set search_path='' as $fn$
 with candidates as (
  select p.id as pet_id,p.owner_id as user_id,p.species,h.postal_code,d.food_brand
  from public.pets p
  left join public.household_private_details h on h.user_id=p.owner_id
  left join public.pet_private_details d on d.pet_id=p.id
  where (p_draft.audience_species is null or p.species = any(p_draft.audience_species))
 )
 select c.user_id,c.pet_id,
  case
   when p_draft.audience_postal_codes is not null and c.postal_code is null then 'insufficient'
   when p_draft.audience_postal_codes is not null and not (c.postal_code = any(p_draft.audience_postal_codes)) then 'outside'
   when p_draft.kind='outbreak' then (
    select case
     when count(*)=0 then 'unregistered'
     when bool_or(ci.status='active' and ci.due_date >= current_date) then 'current'
     when bool_or(ci.status='active') then 'expired'
     else 'no_date' end
    from public.care_items ci
    where ci.pet_id=c.pet_id and ci.category='vaccine' and ci.vaccine_type=p_draft.vaccine_type and ci.status in('active','completed'))
   when p_draft.kind='recall' then case
     when c.food_brand is null then 'unknown'
     when lower(regexp_replace(c.food_brand,'[^a-zA-Z0-9]','','g')) = lower(regexp_replace(coalesce(p_draft.food_brand,''),'[^a-zA-Z0-9]','','g')) then 'applies'
     else 'outside' end
   else 'applies'
  end
 from candidates c
$fn$;
revoke all on function vigilante_private.audience(vigilante_private.drafts) from public;

-- Counts the inbox shows before sending. Never returns identities.
create or replace function vigilante_private.audience_counts(p_draft vigilante_private.drafts) returns jsonb
language sql stable security definer set search_path='' as $fn$
 with a as (select * from vigilante_private.audience(p_draft) where reason<>'outside'),
 notified as (
  select distinct on (a.user_id) a.user_id from a where a.reason in('expired','unregistered','no_date','applies')
   and p_draft.priority<>'low'
   and (p_draft.priority='high' or (
    select count(*) from public.notifications n join public.official_posts o on o.id=n.source_id
    where n.user_id=a.user_id and n.type='health_alert' and o.priority='medium' and n.created_at>now()-interval '7 days'
   ) < (select s.medium_weekly_cap from vigilante_private.settings s))
 )
 select jsonb_build_object(
  'pets',jsonb_build_object(
   'expired',(select count(*) from a where reason='expired'),
   'unregistered',(select count(*) from a where reason='unregistered'),
   'no_date',(select count(*) from a where reason='no_date'),
   'applies',(select count(*) from a where reason='applies'),
   'current',(select count(*) from a where reason='current'),
   'unknown',(select count(*) from a where reason='unknown'),
   'insufficient',(select count(*) from a where reason='insufficient')),
  'notified_users',(select count(*) from notified),
  'push_users',(select count(*) from notified n where push_private.is_enabled()
   and exists(select 1 from push_private.subscriptions s where s.user_id=n.user_id)
   and coalesce((select p.health_alerts from push_private.preferences p where p.user_id=n.user_id),true)),
  'feed_species',coalesce(to_jsonb(p_draft.audience_species),'null'::jsonb),
  'feed_postal_codes',coalesce(to_jsonb(p_draft.audience_postal_codes),'null'::jsonb))
$fn$;
revoke all on function vigilante_private.audience_counts(vigilante_private.drafts) from public;

-- ---------- Ingestion (worker only, through the service role) ----------
create or replace function public.pazo_vigilante_ingest(p_source_key text, p_items jsonb) returns jsonb
language plpgsql security definer set search_path='' as $fn$
declare
 s vigilante_private.settings%rowtype;
 src vigilante_private.sources%rowtype;
 it jsonb; f vigilante_private.findings%rowtype; d vigilante_private.drafts%rowtype;
 v_text jsonb; v_kind text; v_priority text; v_species text[]; v_today integer;
 v_counts jsonb; v_new integer := 0; v_drafted integer := 0;
begin
 select * into s from vigilante_private.settings where singleton;
 if not s.enabled then return jsonb_build_object('enabled',false); end if;
 select * into src from vigilante_private.sources where key=p_source_key for update;
 if not found or not src.enabled then raise exception 'Unknown or disabled source' using errcode='22023'; end if;
 update vigilante_private.sources set last_checked_at=now(),last_success_at=now(),consecutive_failures=0,last_error=null where key=src.key;
 for it in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
  v_kind := it->>'kind';
  if v_kind not in('heat','smoke','recall','outbreak') or coalesce(it->>'url','') !~ '^https://' then continue; end if;
  insert into vigilante_private.findings(source_key,external_id,fingerprint,kind,url,published_on,expires_at,params)
  values(src.key,left(it->>'external_id',300),left(it->>'fingerprint',300),v_kind,it->>'url',(it->>'published_on')::date,
   nullif(it->>'expires_at','')::timestamptz,coalesce(it->'params','{}'::jsonb))
  on conflict(source_key,external_id) do nothing
  returning * into f;
  if not found then continue; end if;
  v_new := v_new + 1;
  if f.expires_at is not null and f.expires_at <= now() then update vigilante_private.findings set status='expired' where id=f.id; continue; end if;
  if src.trust <= 0 then update vigilante_private.findings set status='untrusted' where id=f.id; continue; end if;
  if exists(select 1 from vigilante_private.findings o where o.fingerprint=f.fingerprint and o.id<>f.id
   and o.created_at > now()-make_interval(days=>s.dedupe_days)) then
   update vigilante_private.findings set status='duplicate' where id=f.id; continue;
  end if;
  select count(*) into v_today from vigilante_private.drafts where created_at > now()-interval '1 day';
  if v_today >= s.daily_draft_cap then update vigilante_private.findings set status='capped' where id=f.id; continue; end if;
  v_text := vigilante_private.render(v_kind,f.params,coalesce(nullif(vigilante_private.clip(f.params->>'source_label',80),''),src.name),f.published_on);
  v_species := case when v_kind='outbreak' then case when f.params->>'vaccine_type' in('fvrcp','felv') then array['gato'] else array['perro'] end
   else array['perro','gato'] end;
  v_priority := case v_kind when 'recall' then 'high' when 'outbreak' then 'high' else 'medium' end;
  insert into vigilante_private.drafts(finding_id,kind,priority,title_es,body_es,title_en,body_en,vaccine_type,food_brand,
   audience_species,audience_postal_codes,source_name,source_url,source_published_at,expires_at,review_needed)
  values(f.id,v_kind,v_priority,v_text->>'title_es',v_text->>'body_es',v_text->>'title_en',v_text->>'body_en',
   nullif(f.params->>'vaccine_type',''),nullif(vigilante_private.clip(f.params->>'brand',80),''),v_species,
   case when jsonb_typeof(f.params->'postal_codes')='array' then array(select jsonb_array_elements_text(f.params->'postal_codes')) end,
   coalesce(nullif(vigilante_private.clip(f.params->>'source_label',80),''),src.name),f.url,f.published_on,coalesce(f.expires_at,now()+interval '7 days'),src.trust<3)
  returning * into d;
  v_counts := vigilante_private.audience_counts(d);
  -- A finding that reaches no pet is archived without bothering the administrator.
  if (v_counts->>'notified_users')::integer = 0
   and ((v_counts->'pets'->>'current')::integer + (v_counts->'pets'->>'applies')::integer) = 0 then
   delete from vigilante_private.drafts where id=d.id;
   update vigilante_private.findings set status='irrelevant' where id=f.id;
   continue;
  end if;
  update vigilante_private.findings set status='drafted' where id=f.id;
  v_drafted := v_drafted + 1;
  -- The administrator who pasted a link already knows; automatic findings notify every administrator.
  if src.kind<>'manual' then
   insert into public.notifications(user_id,type,title,body,source_id)
   select g.user_id,'admin_vigilante_pending','Hay una alerta esperando tu aprobación','Abre la bandeja del Vigilante.',d.id
   from admin_private.admin_grants g;
  end if;
 end loop;
 return jsonb_build_object('enabled',true,'new',v_new,'drafted',v_drafted);
end
$fn$;
revoke all on function public.pazo_vigilante_ingest(text,jsonb) from public, anon, authenticated;
grant execute on function public.pazo_vigilante_ingest(text,jsonb) to service_role;

create or replace function public.pazo_vigilante_source_failed(p_source_key text, p_error text) returns void
language plpgsql security definer set search_path='' as $fn$
declare v_failures integer;
begin
 -- last_checked_at is left alone, so the next tick (10 minutes) retries a failed source.
 update vigilante_private.sources set consecutive_failures=consecutive_failures+1,last_error=left(p_error,300)
  where key=p_source_key returning consecutive_failures into v_failures;
 -- Three failures in a row: tell the administrators once.
 if v_failures=3 then
  insert into public.notifications(user_id,type,title,body)
  select g.user_id,'system','Una fuente del Vigilante no responde',left(p_source_key,60)||': '||left(coalesce(p_error,''),120)
  from admin_private.admin_grants g;
 end if;
end
$fn$;
revoke all on function public.pazo_vigilante_source_failed(text,text) from public, anon, authenticated;
grant execute on function public.pazo_vigilante_source_failed(text,text) to service_role;

-- Which sources are due. The worker asks before fetching.
create or replace function public.pazo_vigilante_due_sources() returns jsonb
language sql stable security definer set search_path='' as $fn$
 select coalesce(jsonb_agg(s.key),'[]'::jsonb) from vigilante_private.sources s
 where (select enabled from vigilante_private.settings) and s.enabled and s.kind<>'manual'
  and (s.last_checked_at is null or s.last_checked_at < now()-make_interval(mins=>s.interval_minutes))
$fn$;
revoke all on function public.pazo_vigilante_due_sources() from public, anon, authenticated;
grant execute on function public.pazo_vigilante_due_sources() to service_role;

-- ---------- Administrator RPCs ----------
create or replace function vigilante_private.require_admin() returns uuid
language plpgsql stable security definer set search_path='' as $fn$
begin
 if auth.uid() is null or not public.pazo_is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
 return auth.uid();
end
$fn$;
revoke all on function vigilante_private.require_admin() from public;

-- A second factor used within the last five minutes (TOTP today; a passkey when the project enables it).
create or replace function vigilante_private.has_fresh_second_factor() returns boolean
language sql stable set search_path='' as $fn$
 select coalesce(auth.jwt()->>'aal','')='aal2' and exists(
  select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) m
  where m->>'method' in('totp','webauthn')
   and (m->>'timestamp')::bigint >= extract(epoch from now())::bigint-300)
$fn$;
revoke all on function vigilante_private.has_fresh_second_factor() from public;

create or replace function public.pazo_vigilante_inbox() returns jsonb
language plpgsql stable security definer set search_path='' as $fn$
begin
 perform vigilante_private.require_admin();
 return jsonb_build_object(
  'enabled',(select enabled from vigilante_private.settings),
  'drafts',coalesce((select jsonb_agg(jsonb_build_object(
   'id',d.id,'kind',d.kind,'priority',d.priority,'status',d.status,
   'title_es',d.title_es,'body_es',d.body_es,'title_en',d.title_en,'body_en',d.body_en,
   'vaccine_type',d.vaccine_type,'source_name',d.source_name,'source_url',d.source_url,
   'source_published_at',d.source_published_at,'expires_at',d.expires_at,'review_needed',d.review_needed,
   'edited',d.edited,'created_at',d.created_at,'counts',vigilante_private.audience_counts(d))
   order by case d.priority when 'high' then 0 when 'medium' then 1 else 2 end,d.created_at desc)
   from vigilante_private.drafts d where d.status='pending'),'[]'::jsonb),
  'recent',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'title_es',d.title_es,'title_en',d.title_en,'status',d.status,
   'priority',d.priority,'decided_at',d.decided_at,'notified_count',d.notified_count,'push_count',d.push_count) order by d.decided_at desc)
   from vigilante_private.drafts d where d.status in('sent','feed_only','cancelled','rejected','expired') and coalesce(d.decided_at,d.created_at)>now()-interval '14 days'),'[]'::jsonb),
  'sources',coalesce((select jsonb_agg(jsonb_build_object('key',s.key,'name',s.name,'enabled',s.enabled,
   'last_success_at',s.last_success_at,'consecutive_failures',s.consecutive_failures,'trust',s.trust) order by s.key)
   from vigilante_private.sources s),'[]'::jsonb));
end
$fn$;
revoke all on function public.pazo_vigilante_inbox() from public, anon;
grant execute on function public.pazo_vigilante_inbox() to authenticated;

-- Publishes an approved draft: the official post, then one notice per account (most urgent pet first).
create or replace function vigilante_private.publish(d vigilante_private.drafts, p_notify boolean) returns jsonb
language plpgsql security definer set search_path='' as $fn$
declare v_post uuid; v_notified integer := 0; v_push integer := 0;
begin
 insert into public.official_posts(title,body,title_en,body_en,source_name,source_url,source_published_at,priority,
  audience_species,audience_postal_codes,expires_at,vaccine_type)
 values(d.title_es,d.body_es,d.title_en,d.body_en,d.source_name,d.source_url,d.source_published_at,d.priority,
  d.audience_species,d.audience_postal_codes,d.expires_at,d.vaccine_type)
 returning id into v_post;
 if p_notify and d.priority<>'low' then
  with a as (
   select au.user_id,au.pet_id,case when au.reason='no_date' then 'unregistered' else au.reason end as reason
   from vigilante_private.audience(d) au where au.reason in('expired','unregistered','no_date','applies')
  ), one as (
   select distinct on (a.user_id) a.user_id,a.pet_id,a.reason from a
   order by a.user_id, case a.reason when 'expired' then 0 when 'unregistered' then 1 else 2 end, a.pet_id
  ), capped as (
   select one.* from one where d.priority='high' or (
    select count(*) from public.notifications n join public.official_posts o on o.id=n.source_id
    where n.user_id=one.user_id and n.type='health_alert' and o.priority='medium' and n.created_at>now()-interval '7 days'
   ) < (select s.medium_weekly_cap from vigilante_private.settings s)
  ), inserted as (
   insert into public.notifications(user_id,pet_id,type,title,body,title_en,body_en,source_id,alert_reason,alert_vaccine_type)
   select c.user_id,c.pet_id,'health_alert',d.title_es,d.body_es,d.title_en,d.body_en,v_post,c.reason,
    case when d.kind='outbreak' then d.vaccine_type end
   from capped c
   returning user_id
  )
  select count(*),count(*) filter (where exists(select 1 from push_private.subscriptions s where s.user_id=inserted.user_id))
  into v_notified,v_push from inserted;
 end if;
 return jsonb_build_object('post',v_post,'notified',v_notified,'push',v_push);
end
$fn$;
revoke all on function vigilante_private.publish(vigilante_private.drafts,boolean) from public;

create or replace function public.pazo_vigilante_decide(p_draft_id uuid, p_decision text, p_reject_reason text default null) returns jsonb
language plpgsql security definer set search_path='' as $fn$
declare v_admin uuid := vigilante_private.require_admin(); d vigilante_private.drafts%rowtype; v_result jsonb := '{}'::jsonb;
begin
 if p_decision not in('approve','feed_only','reject') then raise exception 'Unknown decision' using errcode='22023'; end if;
 if p_decision<>'reject' and not (select enabled from vigilante_private.settings) then
  raise exception 'Vigilante is off' using errcode='55000';
 end if;
 select * into d from vigilante_private.drafts where id=p_draft_id for update;
 if not found or d.status<>'pending' then raise exception 'Draft is not pending' using errcode='55000'; end if;
 if d.expires_at is not null and d.expires_at <= now() then
  update vigilante_private.drafts set status='expired' where id=d.id;
  raise exception 'Draft expired' using errcode='55000';
 end if;
 if p_decision='reject' then
  if p_reject_reason not in('not_relevant','doubtful_source','duplicate','tone') then raise exception 'Reason required' using errcode='22023'; end if;
  update vigilante_private.drafts set status='rejected',decision='reject',reject_reason=p_reject_reason,decided_by=v_admin,decided_at=now() where id=d.id;
  -- Visible learning: a doubtful source loses trust; a repeat widens the duplicate window.
  if p_reject_reason='doubtful_source' then
   update vigilante_private.sources s set trust=greatest(trust-1,0),rejected_doubtful=rejected_doubtful+1
   from vigilante_private.findings f where f.id=d.finding_id and s.key=f.source_key;
  elsif p_reject_reason='duplicate' then
   update vigilante_private.settings set dedupe_days=least(dedupe_days+3,60),updated_at=now();
  end if;
 else
  -- The audience is recalculated now, at send time, not when the draft was written.
  v_result := vigilante_private.publish(d, p_decision='approve');
  update vigilante_private.drafts set status=case when p_decision='approve' then 'sent' else 'feed_only' end,
   decision=p_decision,decided_by=v_admin,decided_at=now(),official_post_id=(v_result->>'post')::uuid,
   notified_count=(v_result->>'notified')::integer,push_count=(v_result->>'push')::integer
  where id=d.id;
  insert into public.notifications(user_id,type,title,body,source_id)
  select g.user_id,'admin_vigilante_approved','Aprobaste una alerta del Vigilante',left(d.title_es,120),d.id
  from admin_private.admin_grants g;
 end if;
 insert into vigilante_private.audit(draft_id,actor,action,snapshot)
 values(d.id,v_admin,p_decision,to_jsonb(d)||jsonb_build_object('result',v_result,'reject_reason',p_reject_reason));
 return v_result;
end
$fn$;
revoke all on function public.pazo_vigilante_decide(uuid,text,text) from public, anon;
grant execute on function public.pazo_vigilante_decide(uuid,text,text) to authenticated;

-- Editing changes what people will read, so it alone needs a fresh second factor.
-- The audience can only narrow: species and areas must be subsets of the draft's.
create or replace function public.pazo_vigilante_edit(p_draft_id uuid, p_changes jsonb) returns boolean
language plpgsql security definer set search_path='' as $fn$
declare v_admin uuid := vigilante_private.require_admin(); d vigilante_private.drafts%rowtype;
 v_species text[]; v_postal text[];
begin
 if not vigilante_private.has_fresh_second_factor() then raise exception 'Fresh second factor required' using errcode='42501'; end if;
 select * into d from vigilante_private.drafts where id=p_draft_id for update;
 if not found or d.status<>'pending' then raise exception 'Draft is not pending' using errcode='55000'; end if;
 if p_changes ? 'audience_species' then
  v_species := array(select jsonb_array_elements_text(p_changes->'audience_species'));
  if d.audience_species is not null and not (v_species <@ d.audience_species) or cardinality(v_species)=0 then
   raise exception 'Audience can only narrow' using errcode='22023';
  end if;
 end if;
 if p_changes ? 'audience_postal_codes' then
  v_postal := array(select jsonb_array_elements_text(p_changes->'audience_postal_codes'));
  if d.audience_postal_codes is not null and not (v_postal <@ d.audience_postal_codes) or cardinality(v_postal)=0 then
   raise exception 'Audience can only narrow' using errcode='22023';
  end if;
 end if;
 if (p_changes ? 'priority') and p_changes->>'priority' not in('high','medium','low') then raise exception 'Bad priority' using errcode='22023'; end if;
 update vigilante_private.drafts set
  title_es=coalesce(vigilante_private.clip(p_changes->>'title_es',120),title_es),
  body_es=coalesce(vigilante_private.clip(p_changes->>'body_es',1200),body_es),
  title_en=coalesce(vigilante_private.clip(p_changes->>'title_en',120),title_en),
  body_en=coalesce(vigilante_private.clip(p_changes->>'body_en',1200),body_en),
  priority=coalesce(p_changes->>'priority',priority),
  audience_species=coalesce(v_species,audience_species),
  audience_postal_codes=coalesce(v_postal,audience_postal_codes),
  edited=true
 where id=d.id;
 insert into vigilante_private.audit(draft_id,actor,action,snapshot) values(d.id,v_admin,'edit',p_changes);
 return true;
end
$fn$;
revoke all on function public.pazo_vigilante_edit(uuid,jsonb) from public, anon;
grant execute on function public.pazo_vigilante_edit(uuid,jsonb) to authenticated;

-- Stops a sent alert: pending pushes are dropped, unread notices removed, the post leaves the feed.
create or replace function public.pazo_vigilante_cancel(p_draft_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $fn$
declare v_admin uuid := vigilante_private.require_admin(); d vigilante_private.drafts%rowtype; v_dropped integer; v_removed integer;
begin
 select * into d from vigilante_private.drafts where id=p_draft_id for update;
 if not found or d.status not in('sent','feed_only') then raise exception 'Nothing to cancel' using errcode='55000'; end if;
 update push_private.outbox o set status='failed',leased_until=null
  from public.notifications n where n.id=o.notification_id and n.source_id=d.official_post_id and n.type='health_alert'
   and o.status in('pending','leased');
 get diagnostics v_dropped = row_count;
 delete from public.notifications where source_id=d.official_post_id and type='health_alert' and read_at is null;
 get diagnostics v_removed = row_count;
 update public.official_posts set expires_at=greatest(published_at+interval '1 second',now()) where id=d.official_post_id;
 update vigilante_private.drafts set status='cancelled' where id=d.id;
 insert into vigilante_private.audit(draft_id,actor,action,snapshot) values(d.id,v_admin,'cancel',jsonb_build_object('dropped_pushes',v_dropped,'removed_notices',v_removed));
 return jsonb_build_object('dropped_pushes',v_dropped,'removed_notices',v_removed);
end
$fn$;
revoke all on function public.pazo_vigilante_cancel(uuid) from public, anon;
grant execute on function public.pazo_vigilante_cancel(uuid) to authenticated;

-- "Send me a test": a notice only to the calling administrator, without publishing anything.
create or replace function public.pazo_vigilante_test(p_draft_id uuid) returns boolean
language plpgsql security definer set search_path='' as $fn$
declare v_admin uuid := vigilante_private.require_admin(); d vigilante_private.drafts%rowtype;
begin
 select * into d from vigilante_private.drafts where id=p_draft_id and status='pending';
 if not found then return false; end if;
 insert into public.notifications(user_id,type,title,body,title_en,body_en,alert_reason)
 values(v_admin,'health_alert','[Prueba] '||left(d.title_es,110),d.body_es,'[Test] '||left(d.title_en,110),d.body_en,'applies');
 insert into vigilante_private.audit(draft_id,actor,action,snapshot) values(d.id,v_admin,'test','{}'::jsonb);
 return true;
end
$fn$;
revoke all on function public.pazo_vigilante_test(uuid) from public, anon;
grant execute on function public.pazo_vigilante_test(uuid) to authenticated;

-- Manual mode: the administrator pastes an official link and the key facts; the template does the rest.
create or replace function public.pazo_vigilante_manual(p_kind text, p_url text, p_source_name text, p_published_on date, p_params jsonb) returns uuid
language plpgsql security definer set search_path='' as $fn$
declare v_admin uuid := vigilante_private.require_admin(); v_result jsonb; v_id uuid;
begin
 if coalesce(p_url,'') !~ '^https://' then raise exception 'Official https link required' using errcode='22023'; end if;
 if p_published_on is null or p_published_on > current_date then raise exception 'Source date required' using errcode='22023'; end if;
 v_result := public.pazo_vigilante_ingest_as_admin(p_kind,p_url,vigilante_private.clip(p_source_name,80),p_published_on,p_params);
 v_id := (v_result->>'draft')::uuid;
 if v_id is null then raise exception 'No pet would receive this alert (%)',coalesce(v_result->>'status','irrelevant') using errcode='22023'; end if;
 return v_id;
end
$fn$;

create or replace function public.pazo_vigilante_ingest_as_admin(p_kind text, p_url text, p_source_name text, p_published_on date, p_params jsonb) returns jsonb
language plpgsql security definer set search_path='' as $fn$
declare v_external text := 'manual:'||md5(p_url||coalesce(p_params::text,'')); v_result jsonb; v_draft uuid; v_status text;
begin
 perform vigilante_private.require_admin();
 if not (select enabled from vigilante_private.settings) then raise exception 'Vigilante is off' using errcode='55000'; end if;
 v_result := public.pazo_vigilante_ingest('manual',jsonb_build_array(jsonb_build_object(
  'kind',p_kind,'external_id',v_external,'fingerprint',p_kind||':'||lower(coalesce(p_params->>'vaccine_type',p_params->>'brand',p_params->>'area','')),
  'url',p_url,'published_on',p_published_on,'params',coalesce(p_params,'{}'::jsonb)||jsonb_build_object('source_label',p_source_name))));
 select f.status,(select d.id from vigilante_private.drafts d where d.finding_id=f.id) into v_status,v_draft
 from vigilante_private.findings f where f.source_key='manual' and f.external_id=v_external;
 if v_draft is not null and nullif(p_source_name,'') is not null then
  update vigilante_private.drafts set source_name=p_source_name where id=v_draft;
 end if;
 return jsonb_build_object('draft',v_draft,'status',v_status);
end
$fn$;
revoke all on function public.pazo_vigilante_manual(text,text,text,date,jsonb) from public, anon;
revoke all on function public.pazo_vigilante_ingest_as_admin(text,text,text,date,jsonb) from public, anon;
grant execute on function public.pazo_vigilante_manual(text,text,text,date,jsonb) to authenticated;

-- Results of a sent alert, as counts only.
create or replace function public.pazo_vigilante_results(p_draft_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $fn$
declare d vigilante_private.drafts%rowtype;
begin
 perform vigilante_private.require_admin();
 select * into d from vigilante_private.drafts where id=p_draft_id;
 if not found or d.official_post_id is null then return null; end if;
 return jsonb_build_object(
  'notified',(select count(*) from public.notifications n where n.source_id=d.official_post_id and n.type='health_alert'),
  'push_sent',(select count(*) from push_private.outbox o join public.notifications n on n.id=o.notification_id
    where n.source_id=d.official_post_id and o.status='sent'),
  'opened',(select count(*) from public.notifications n where n.source_id=d.official_post_id and n.type='health_alert' and n.read_at is not null),
  'answers',(select coalesce(jsonb_object_agg(a,c),'{}'::jsonb) from (select n.alert_answer a,count(*) c from public.notifications n
    where n.source_id=d.official_post_id and n.alert_answer is not null group by 1) x),
  'turned_off_alerts',(select count(*) from push_private.preferences p where not p.health_alerts and p.updated_at > d.decided_at
    and exists(select 1 from public.notifications n where n.source_id=d.official_post_id and n.user_id=p.user_id)));
end
$fn$;
revoke all on function public.pazo_vigilante_results(uuid) from public, anon;
grant execute on function public.pazo_vigilante_results(uuid) to authenticated;

-- Monthly summary for the administrator (counts only).
create or replace function public.pazo_vigilante_monthly_summary() returns jsonb
language plpgsql stable security definer set search_path='' as $fn$
begin
 perform vigilante_private.require_admin();
 return jsonb_build_object(
  'findings',(select count(*) from vigilante_private.findings where created_at>now()-interval '30 days'),
  'discarded',(select count(*) from vigilante_private.findings where created_at>now()-interval '30 days' and status in('duplicate','irrelevant','capped','expired','untrusted')),
  'approved',(select count(*) from vigilante_private.drafts where decided_at>now()-interval '30 days' and decision in('approve','feed_only')),
  'rejected',(select count(*) from vigilante_private.drafts where decided_at>now()-interval '30 days' and decision='reject'),
  'expired',(select count(*) from vigilante_private.drafts where created_at>now()-interval '30 days' and status='expired'));
end
$fn$;
revoke all on function public.pazo_vigilante_monthly_summary() from public, anon;
grant execute on function public.pazo_vigilante_monthly_summary() to authenticated;

-- ---------- Scheduler ----------
-- Every 10 minutes: expire stale drafts, remind administrators about urgent ones (30 min, 2 h),
-- and wake the worker when a source is due. Does nothing while the Vigilante is off.
create or replace function vigilante_private.tick() returns bigint
language plpgsql security definer set search_path='' as $fn$
declare v_token text; v_request bigint;
begin
 if not (select enabled from vigilante_private.settings) then return null; end if;
 update vigilante_private.drafts set status='expired' where status='pending' and expires_at<=now();
 delete from vigilante_private.findings f where f.created_at<now()-interval '90 days'
  and not exists(select 1 from vigilante_private.drafts d where d.finding_id=f.id);
 with due as (
  update vigilante_private.drafts d set reminded_at=reminded_at||now()
  where d.status='pending' and d.priority='high' and (
   (cardinality(d.reminded_at)=0 and d.created_at<=now()-interval '30 minutes')
   or (cardinality(d.reminded_at)=1 and d.created_at<=now()-interval '2 hours'))
  returning d.id
 )
 insert into public.notifications(user_id,type,title,body,source_id)
 select g.user_id,'admin_vigilante_pending','Una alerta urgente sigue esperando tu aprobación','Abre la bandeja del Vigilante.',due.id
 from due cross join admin_private.admin_grants g;
 if public.pazo_vigilante_due_sources() = '[]'::jsonb then return null; end if;
 v_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 update vigilante_private.worker_dispatch
  set dispatch_sha256=sha256(convert_to(v_token,'UTF8')),dispatch_expires_at=clock_timestamp()+interval '2 minutes'
  where singleton;
 v_request:=net.http_post(
  url:='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-vigilante-worker',
  headers:=jsonb_build_object('authorization','Bearer '||v_token),
  body:=null,timeout_milliseconds:=30000);
 return v_request;
end
$fn$;
revoke all on function vigilante_private.tick() from public;

create or replace function public.pazo_vigilante_worker_admit(p_token text) returns boolean
language plpgsql security definer set search_path='' as $fn$
declare d vigilante_private.worker_dispatch%rowtype;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return false; end if;
 select * into d from vigilante_private.worker_dispatch where singleton for update skip locked;
 if not found or d.dispatch_expires_at is null or d.dispatch_expires_at<clock_timestamp()
  or d.dispatch_sha256 is distinct from sha256(convert_to(p_token,'UTF8')) then return false; end if;
 update vigilante_private.worker_dispatch set dispatch_sha256=null,dispatch_expires_at=null where singleton;
 return true;
end
$fn$;
revoke all on function public.pazo_vigilante_worker_admit(text) from public, anon, authenticated;
grant execute on function public.pazo_vigilante_worker_admit(text) to service_role;

create or replace function public.pazo_vigilante_set_enabled(p_enabled boolean) returns boolean
language plpgsql security definer set search_path='' as $fn$
declare v_admin uuid := vigilante_private.require_admin();
begin
 if p_enabled is null then return false; end if;
 update vigilante_private.settings set enabled=p_enabled,updated_at=now() where singleton;
 return true;
end
$fn$;
revoke all on function public.pazo_vigilante_set_enabled(boolean) from public, anon;
grant execute on function public.pazo_vigilante_set_enabled(boolean) to authenticated;

-- The feed reads the English text too.
drop function public.get_official_feed(uuid,integer);
create function public.get_official_feed(p_actor_pet_id uuid, p_limit integer default 10)
returns table(id uuid,title text,body text,title_en text,body_en text,source_name text,source_url text,source_published_at date,
 priority text,published_at timestamptz,expires_at timestamptz,likes bigint,liked boolean)
language plpgsql stable security definer set search_path='' as $fn$
declare
 v_uid uuid := auth.uid();
 v_species text;
 v_postal text;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 select p.species into v_species from public.pets p where p.id=p_actor_pet_id and p.owner_id=v_uid;
 if v_species is null then raise exception 'Pet not owned by caller' using errcode='42501'; end if;
 select h.postal_code into v_postal from public.household_private_details h where h.user_id=v_uid;
 return query
 select o.id,o.title,o.body,o.title_en,o.body_en,o.source_name,o.source_url,o.source_published_at,o.priority,o.published_at,o.expires_at,
  (select count(*) from public.official_post_likes l where l.post_id=o.id),
  exists(select 1 from public.official_post_likes l where l.post_id=o.id and l.user_id=v_uid)
 from public.official_posts o
 where o.published_at <= now()
  and (o.expires_at is null or o.expires_at > now())
  and (o.audience_species is null or v_species = any(o.audience_species))
  and (o.audience_postal_codes is null or v_postal = any(o.audience_postal_codes))
 order by case o.priority when 'high' then 0 when 'medium' then 1 else 2 end, o.published_at desc
 limit least(greatest(coalesce(p_limit,10),1),20);
end
$fn$;
revoke all on function public.get_official_feed(uuid,integer) from public,anon;
grant execute on function public.get_official_feed(uuid,integer) to authenticated;

select cron.schedule('pazo_vigilante_tick_v1','*/10 * * * *','select vigilante_private.tick()');

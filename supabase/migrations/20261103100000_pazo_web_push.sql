-- Web Push: subscriptions, preferences, outbox and care reminders.
-- Installs inert: release_gate stays false until the worker is deployed.
-- The outbox never holds user-written text. The VAPID private key is generated
-- by the worker, stored in Vault and never leaves the server.

create schema push_private;
revoke all on schema push_private from public, anon, authenticated, service_role;

create table push_private.release_gate(
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
insert into push_private.release_gate(singleton) values(true);

create table push_private.vapid(
 singleton boolean primary key default true check(singleton),
 public_key text not null,
 private_secret_id uuid not null,
 created_at timestamptz not null default now()
);

create table push_private.worker_dispatch(
 singleton boolean primary key default true check(singleton),
 dispatch_sha256 bytea,
 dispatch_expires_at timestamptz
);
insert into push_private.worker_dispatch(singleton) values(true);

create table push_private.subscriptions(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique,
 p256dh text not null,
 auth text not null,
 lang text not null default 'es' check(lang in('es','en')),
 failure_count integer not null default 0,
 last_success_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on push_private.subscriptions(user_id);

create table push_private.preferences(
 user_id uuid primary key references auth.users(id) on delete cascade,
 sightings boolean not null default true,
 community boolean not null default true,
 care boolean not null default true,
 updated_at timestamptz not null default now()
);

create table push_private.outbox(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in('sighting','community_join','care_reminder')),
 notification_id uuid not null unique references public.notifications(id) on delete cascade,
 status text not null default 'pending' check(status in('pending','leased','sent','failed')),
 attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(),
 leased_until timestamptz,
 created_at timestamptz not null default now(),
 sent_at timestamptz
);
create index push_outbox_due_idx on push_private.outbox(next_attempt_at) where status in('pending','leased');

create table push_private.care_reminder_log(
 care_item_id uuid not null references public.care_items(id) on delete cascade,
 due_date date not null,
 created_at timestamptz not null default now(),
 primary key(care_item_id,due_date)
);

do $rls$
declare t text;
begin
 foreach t in array array['release_gate','vapid','worker_dispatch','subscriptions','preferences','outbox','care_reminder_log'] loop
  execute format('alter table push_private.%I enable row level security',t);
  execute format('alter table push_private.%I force row level security',t);
  execute format('revoke all on push_private.%I from public, anon, authenticated, service_role',t);
 end loop;
end
$rls$;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
 check(type = any(array['sighting','system','community_join','supporter_campaign','supporter_verified','care_reminder']));

-- The worker only ever contacts these hosts, so a stored endpoint cannot reach anything else.
create function push_private.valid_endpoint(p_endpoint text) returns boolean
language sql immutable set search_path='' as $fn$
 select coalesce(char_length(p_endpoint)<=1024 and p_endpoint ~ '^https://(fcm\.googleapis\.com|[a-z0-9-]+\.google\.com/fcm|web\.push\.apple\.com|[a-z0-9-]+\.push\.apple\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.services\.mozilla\.com|[a-z0-9-]+\.notify\.windows\.com)/',false)
$fn$;

create function push_private.is_enabled() returns boolean
language sql stable security definer set search_path='' as $fn$
 select coalesce((select enabled from push_private.release_gate where singleton),false)
$fn$;

-- A failure here can never undo the sighting or the membership that caused it.
create function push_private.enqueue_from_notification() returns trigger
language plpgsql security definer set search_path='' as $fn$
begin
 if new.type not in('sighting','community_join','care_reminder') or not push_private.is_enabled() then
  return new;
 end if;
 begin
  if exists(select 1 from push_private.subscriptions s where s.user_id=new.user_id)
   and not exists(select 1 from push_private.preferences p where p.user_id=new.user_id and (
    (new.type='sighting' and not p.sightings)
    or (new.type='community_join' and not p.community)
    or (new.type='care_reminder' and not p.care)))
  then
   insert into push_private.outbox(user_id,kind,notification_id)
   values(new.user_id,new.type,new.id)
   on conflict(notification_id) do nothing;
  end if;
 exception when others then
  raise warning 'pazo push enqueue skipped: %',sqlstate;
 end;
 return new;
end
$fn$;
create trigger pazo_push_enqueue after insert on public.notifications
 for each row execute function push_private.enqueue_from_notification();

-- Sends once per due date, from 09:00 in the timezone saved with the care item.
create function push_private.care_reminder_tick() returns integer
language plpgsql security definer set search_path='' as $fn$
declare v_count integer;
begin
 if not push_private.is_enabled() then return 0; end if;
 with due as (
  select c.id,c.due_date,c.title,c.pet_id,p.owner_id
  from public.care_items c
  join public.pets p on p.id=c.pet_id
  join pg_catalog.pg_timezone_names z on z.name=c.timezone
  where c.status='active' and c.reminder_days_before is not null
   and (now() at time zone c.timezone)::time>='09:00'
   and (now() at time zone c.timezone)::date between c.due_date-c.reminder_days_before and c.due_date
   and not exists(select 1 from push_private.care_reminder_log l where l.care_item_id=c.id and l.due_date=c.due_date)
  limit 500
 ), logged as (
  insert into push_private.care_reminder_log(care_item_id,due_date)
  select id,due_date from due
  on conflict do nothing
  returning care_item_id,due_date
 ), written as (
  insert into public.notifications(user_id,pet_id,type,title,body,source_id)
  select d.owner_id,d.pet_id,'care_reminder','Recordatorio de cuidado',d.title,d.id
  from due d join logged l on l.care_item_id=d.id and l.due_date=d.due_date
  returning 1
 )
 select count(*) into v_count from written;
 return v_count;
end
$fn$;

create function push_private.retention_tick() returns void
language plpgsql security definer set search_path='' as $fn$
begin
 delete from push_private.outbox where status in('sent','failed') and created_at<now()-interval '7 days';
 delete from push_private.care_reminder_log where due_date<current_date-60;
 delete from public.notifications where type='care_reminder' and created_at<now()-interval '30 days';
 delete from push_private.subscriptions
  where failure_count>=20 or coalesce(last_success_at,created_at)<now()-interval '180 days' and updated_at<now()-interval '180 days';
end
$fn$;

create function push_private.worker_tick() returns bigint
language plpgsql security definer set search_path='' as $fn$
declare v_token text; v_request bigint;
begin
 if not push_private.is_enabled() then return null; end if;
 if exists(select 1 from push_private.vapid)
  and not exists(select 1 from push_private.outbox o
   where (o.status='pending' and o.next_attempt_at<=now()) or (o.status='leased' and o.leased_until<now()))
 then return null; end if;
 v_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 update push_private.worker_dispatch
  set dispatch_sha256=sha256(convert_to(v_token,'UTF8')),dispatch_expires_at=clock_timestamp()+interval '2 minutes'
  where singleton;
 v_request:=net.http_post(
  url:='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-push-worker',
  headers:=jsonb_build_object('authorization','Bearer '||v_token),
  body:=null,timeout_milliseconds:=20000);
 return v_request;
end
$fn$;

create function public.pazo_push_worker_admit(p_token text) returns boolean
language plpgsql security definer set search_path='' as $fn$
declare d push_private.worker_dispatch%rowtype;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return false; end if;
 select * into d from push_private.worker_dispatch where singleton for update skip locked;
 if not found or d.dispatch_expires_at is null or d.dispatch_expires_at<clock_timestamp()
  or d.dispatch_sha256 is distinct from sha256(convert_to(p_token,'UTF8'))
 then return false; end if;
 -- Consumed before answering, so a queued value cannot be replayed.
 update push_private.worker_dispatch set dispatch_sha256=null,dispatch_expires_at=null where singleton;
 return true;
end
$fn$;

create function public.pazo_push_worker_vapid() returns jsonb
language sql stable security definer set search_path='' as $fn$
 select jsonb_build_object('publicKey',v.public_key,'privateJwk',d.decrypted_secret)
 from push_private.vapid v join vault.decrypted_secrets d on d.id=v.private_secret_id
$fn$;

create function public.pazo_push_worker_store_vapid(p_public text,p_private text) returns boolean
language plpgsql security definer set search_path='' as $fn$
declare v_id uuid;
begin
 lock table push_private.vapid in exclusive mode;
 if exists(select 1 from push_private.vapid) then return false; end if;
 v_id:=vault.create_secret(p_private,'pazo_push_vapid_private_v1','Web Push VAPID private key');
 insert into push_private.vapid(public_key,private_secret_id) values(p_public,v_id);
 return true;
end
$fn$;

create function public.pazo_push_worker_lease(p_limit integer default 20) returns jsonb
language plpgsql security definer set search_path='' as $fn$
declare v_result jsonb;
begin
 -- A reminder that is a day late, or that keeps failing, is dropped rather than sent stale.
 update push_private.outbox set status='failed',leased_until=null
  where status in('pending','leased') and (created_at<now()-interval '24 hours'
   or (status='leased' and leased_until<now() and attempts>=4));
 with picked as (
  select id from push_private.outbox
  where (status='pending' and next_attempt_at<=now()) or (status='leased' and leased_until<now())
  order by created_at limit least(greatest(coalesce(p_limit,20),1),50)
  for update skip locked
 ), leased as (
  update push_private.outbox o
  set status='leased',leased_until=now()+interval '2 minutes',attempts=o.attempts+1
  from picked where o.id=picked.id
  returning o.id,o.kind,o.user_id
 )
 select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'kind',l.kind,'subscriptions',
  (select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth,'lang',s.lang)),'[]'::jsonb)
   from push_private.subscriptions s where s.user_id=l.user_id))),'[]'::jsonb)
 into v_result from leased l;
 return v_result;
end
$fn$;

-- Each item: {id,retry,ok:[subscription],gone:[subscription],failed:[subscription]}.
create function public.pazo_push_worker_report(p_results jsonb) returns void
language plpgsql security definer set search_path='' as $fn$
declare r jsonb;
begin
 for r in select * from jsonb_array_elements(coalesce(p_results,'[]'::jsonb)) loop
  update push_private.subscriptions set failure_count=0,last_success_at=now()
   where id in(select value::uuid from jsonb_array_elements_text(r->'ok'));
  update push_private.subscriptions set failure_count=failure_count+1
   where id in(select value::uuid from jsonb_array_elements_text(r->'failed'));
  delete from push_private.subscriptions
   where id in(select value::uuid from jsonb_array_elements_text(r->'gone'));
  update push_private.outbox o set leased_until=null,
   status=case when coalesce((r->>'retry')::boolean,false) then (case when o.attempts>=4 then 'failed' else 'pending' end) else 'sent' end,
   sent_at=case when coalesce((r->>'retry')::boolean,false) then null else now() end,
   next_attempt_at=now()+make_interval(mins=>o.attempts*2)
  where o.id=(r->>'id')::uuid and o.status='leased';
 end loop;
end
$fn$;

create function public.pazo_push_config() returns jsonb
language sql stable security definer set search_path='' as $fn$
 select jsonb_build_object('enabled',push_private.is_enabled() and auth.uid() is not null,
  'publicKey',(select public_key from push_private.vapid))
$fn$;

create function public.pazo_push_subscribe(p_endpoint text,p_p256dh text,p_auth text,p_lang text default 'es') returns boolean
language plpgsql security definer set search_path='' as $fn$
declare v_user uuid:=auth.uid();
begin
 if v_user is null or not push_private.is_enabled() or not push_private.valid_endpoint(p_endpoint)
  or coalesce(p_p256dh,'') !~ '^[A-Za-z0-9_-]{86,88}$' or coalesce(p_auth,'') !~ '^[A-Za-z0-9_-]{20,24}$'
 then return false; end if;
 -- The browser's current account owns the device, so a shared phone never notifies the previous one.
 insert into push_private.subscriptions(user_id,endpoint,p256dh,auth,lang)
 values(v_user,p_endpoint,p_p256dh,p_auth,case when p_lang='en' then 'en' else 'es' end)
 on conflict(endpoint) do update set user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth,
  lang=excluded.lang,failure_count=0,updated_at=now();
 delete from push_private.subscriptions where id in(
  select id from push_private.subscriptions where user_id=v_user order by updated_at desc offset 10);
 return true;
end
$fn$;

create function public.pazo_push_unsubscribe(p_endpoint text) returns boolean
language plpgsql security definer set search_path='' as $fn$
begin
 delete from push_private.subscriptions where endpoint=p_endpoint and user_id=auth.uid();
 return found;
end
$fn$;

create function public.pazo_push_preferences() returns jsonb
language sql stable security definer set search_path='' as $fn$
 select jsonb_build_object(
  'sightings',coalesce((select p.sightings from push_private.preferences p where p.user_id=auth.uid()),true),
  'community',coalesce((select p.community from push_private.preferences p where p.user_id=auth.uid()),true),
  'care',coalesce((select p.care from push_private.preferences p where p.user_id=auth.uid()),true))
$fn$;

create function public.pazo_push_set_preferences(p_sightings boolean,p_community boolean,p_care boolean) returns boolean
language plpgsql security definer set search_path='' as $fn$
begin
 if auth.uid() is null or p_sightings is null or p_community is null or p_care is null then return false; end if;
 insert into push_private.preferences(user_id,sightings,community,care)
 values(auth.uid(),p_sightings,p_community,p_care)
 on conflict(user_id) do update set sightings=excluded.sightings,community=excluded.community,care=excluded.care,updated_at=now();
 return true;
end
$fn$;

revoke all on all functions in schema push_private from public, anon, authenticated, service_role;

revoke all on function public.pazo_push_worker_admit(text) from public, anon, authenticated;
revoke all on function public.pazo_push_worker_vapid() from public, anon, authenticated;
revoke all on function public.pazo_push_worker_store_vapid(text,text) from public, anon, authenticated;
revoke all on function public.pazo_push_worker_lease(integer) from public, anon, authenticated;
revoke all on function public.pazo_push_worker_report(jsonb) from public, anon, authenticated;
grant execute on function public.pazo_push_worker_admit(text) to service_role;
grant execute on function public.pazo_push_worker_vapid() to service_role;
grant execute on function public.pazo_push_worker_store_vapid(text,text) to service_role;
grant execute on function public.pazo_push_worker_lease(integer) to service_role;
grant execute on function public.pazo_push_worker_report(jsonb) to service_role;

revoke all on function public.pazo_push_config() from public, anon;
revoke all on function public.pazo_push_subscribe(text,text,text,text) from public, anon;
revoke all on function public.pazo_push_unsubscribe(text) from public, anon;
revoke all on function public.pazo_push_preferences() from public, anon;
revoke all on function public.pazo_push_set_preferences(boolean,boolean,boolean) from public, anon;
grant execute on function public.pazo_push_config() to authenticated;
grant execute on function public.pazo_push_subscribe(text,text,text,text) to authenticated;
grant execute on function public.pazo_push_unsubscribe(text) to authenticated;
grant execute on function public.pazo_push_preferences() to authenticated;
grant execute on function public.pazo_push_set_preferences(boolean,boolean,boolean) to authenticated;

select cron.schedule('pazo_push_worker_v1','* * * * *','select push_private.worker_tick()');
select cron.schedule('pazo_push_care_v1','*/15 * * * *','select push_private.care_reminder_tick()');
select cron.schedule('pazo_push_retention_v1','43 4 * * *','select push_private.retention_tick()');

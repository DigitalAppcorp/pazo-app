-- Isolated PostgreSQL 17 ONLY. Disposable stand-ins for the objects of the PAZO production
-- schema that the Vigilante migrations build on. Synthetic data; no remote users or credentials.
do $$begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end$$;
create schema auth;
create schema private;
create schema admin_private;
create schema push_private;
create schema net;
create schema cron;
grant usage on schema public, auth to anon, authenticated, service_role;
grant usage on schema push_private to service_role;

create table auth.users(id uuid primary key, created_at timestamptz not null default now());
create function auth.uid() returns uuid language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
  nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;

-- pg_net and pg_cron stand-ins: calls are recorded, never sent.
create table net.calls(id bigint generated always as identity primary key, url text, headers jsonb);
create function net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds integer) returns bigint
language sql as $$ insert into net.calls(url,headers) values(url,headers) returning id $$;
create table cron.job(jobid bigint generated always as identity primary key, jobname text unique, schedule text, command text);
create function cron.schedule(p_name text, p_schedule text, p_command text) returns bigint
language sql as $$ insert into cron.job(jobname,schedule,command) values(p_name,p_schedule,p_command) returning jobid $$;

create function public.pazo_maintenance_data_allowed() returns boolean language sql stable as $$ select true $$;
grant execute on function public.pazo_maintenance_data_allowed() to anon, authenticated;
create table admin_private.admin_grants(user_id uuid primary key);
create function public.pazo_is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from admin_private.admin_grants g where g.user_id=auth.uid()) $$;
grant execute on function public.pazo_is_admin() to authenticated;

create table public.profiles(id uuid primary key references auth.users(id), username text, is_founder boolean not null default false);
alter table public.profiles enable row level security;
create policy profiles_public_read on public.profiles for select using(true);
create policy profiles_owner_update on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
grant select on public.profiles to anon, authenticated;
grant update(username) on public.profiles to authenticated;

create table public.pets(id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 name text not null, species text not null check(species in('gato','perro','conejo','ave','otro')), created_at timestamptz not null default now());
alter table public.pets enable row level security;
create policy pets_public_read on public.pets for select using(true);
grant select on public.pets to anon, authenticated;

create table public.pet_private_details(pet_id uuid primary key references public.pets(id) on delete cascade,
 zone text, interests text[], weight text, diet_plan text, updated_at timestamptz default now());
alter table public.pet_private_details enable row level security;
create policy pet_private_details_owner_select on public.pet_private_details for select to authenticated
 using(exists(select 1 from public.pets p where p.id=pet_private_details.pet_id and p.owner_id=auth.uid()));
create policy pet_private_details_owner_insert on public.pet_private_details for insert to authenticated
 with check(exists(select 1 from public.pets p where p.id=pet_private_details.pet_id and p.owner_id=auth.uid()));
create policy pet_private_details_owner_update on public.pet_private_details for update to authenticated
 using(exists(select 1 from public.pets p where p.id=pet_private_details.pet_id and p.owner_id=auth.uid()))
 with check(exists(select 1 from public.pets p where p.id=pet_private_details.pet_id and p.owner_id=auth.uid()));
grant select, insert, update on public.pet_private_details to authenticated;

create table public.care_items(id uuid primary key default gen_random_uuid(), pet_id uuid not null references public.pets(id) on delete cascade,
 title text not null, category text not null check(category in('veterinarian','vaccine','medication','hygiene','feeding','other')),
 due_date date not null, due_time time, timezone text not null default 'America/Los_Angeles', recurrence text not null default 'none',
 reminder_days_before smallint, notes text, status text not null default 'active' check(status in('active','completed','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.care_items enable row level security;
create policy care_items_owner_select on public.care_items for select using(pet_id in(select p.id from public.pets p where p.owner_id=auth.uid()));
create policy care_items_owner_insert on public.care_items for insert with check(status='active' and pet_id in(select p.id from public.pets p where p.owner_id=auth.uid()));
create policy care_items_owner_update_active on public.care_items for update using(status='active' and pet_id in(select p.id from public.pets p where p.owner_id=auth.uid()))
 with check(status='active' and pet_id in(select p.id from public.pets p where p.owner_id=auth.uid()));
grant select on public.care_items to authenticated;
grant insert(pet_id,title,category,due_date,due_time,timezone,recurrence,reminder_days_before,notes) on public.care_items to authenticated;
grant update(title,category,due_date,due_time,timezone,recurrence,reminder_days_before,notes) on public.care_items to authenticated;

create table public.notifications(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 pet_id uuid, type text not null, title text not null, body text not null, source_id uuid, read_at timestamptz,
 created_at timestamptz not null default now(), supporter_copy_version text, supporter_state text);
alter table public.notifications add constraint notifications_type_check
 check(type = any(array['sighting','system','community_join','supporter_campaign','supporter_verified','care_reminder','admin_new_pet','admin_new_account','new_follower']));
alter table public.notifications enable row level security;
create policy notifications_owner_select on public.notifications for select to authenticated using(user_id=auth.uid());
grant select on public.notifications to authenticated;

create table push_private.release_gate(singleton boolean primary key default true, enabled boolean not null default true);
insert into push_private.release_gate values(true,true);
create function push_private.is_enabled() returns boolean language sql stable as $$ select enabled from push_private.release_gate $$;
create table push_private.subscriptions(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, endpoint text not null default 'https://fcm.googleapis.com/fcm/send/x');
create table push_private.preferences(user_id uuid primary key references auth.users(id) on delete cascade,
 sightings boolean not null default true, community boolean not null default true, care boolean not null default true,
 admin_new_pets boolean not null default true, admin_new_accounts boolean not null default true, followers boolean not null default true,
 updated_at timestamptz not null default now());
create table push_private.outbox(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null, notification_id uuid not null unique references public.notifications(id) on delete cascade,
 status text not null default 'pending' check(status in('pending','leased','sent','failed')), attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(), leased_until timestamptz, created_at timestamptz not null default now());
alter table push_private.outbox add constraint outbox_kind_check
 check(kind in('sighting','community_join','care_reminder','admin_new_pet','admin_new_account','new_follower'));
create table push_private.care_reminder_log(care_item_id uuid, due_date date);
create function push_private.enqueue_from_notification() returns trigger language plpgsql as $$ begin return new; end $$;
create trigger pazo_push_enqueue after insert on public.notifications for each row execute function push_private.enqueue_from_notification();

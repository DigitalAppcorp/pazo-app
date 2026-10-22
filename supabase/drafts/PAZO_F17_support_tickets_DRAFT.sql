-- F17 DRAFT ONLY: requires Product Owner migration approval before hosting.
-- Private user-to-admin inbox. Retention and deletion are tracked in data inventory.
-- Do not use user messages in telemetry, app logs or email.
create table if not exists public.pazo_support_tickets (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 category text not null check (category in ('problem','question','feature','other')),
 message text not null check (char_length(btrim(message)) between 10 and 2000),
 status text not null default 'open' check (status in ('open','reviewing','resolved')),
 admin_note text check (admin_note is null or char_length(admin_note)<=1000),
 admin_reply text check (admin_reply is null or char_length(admin_reply)<=2000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists pazo_support_tickets_owner_created_idx
 on public.pazo_support_tickets(owner_id,created_at desc);
create index if not exists pazo_support_tickets_status_created_idx
 on public.pazo_support_tickets(status,created_at desc);
alter table public.pazo_support_tickets enable row level security;
alter table public.pazo_support_tickets force row level security;

-- Internal administrator notes are never readable by the ticket author.
-- All inbox row reads require the server-confirmed admin role.
create policy pazo_support_admin_read on public.pazo_support_tickets
 for select to authenticated using ((select public.pazo_is_admin()));
create policy pazo_support_new_submission on public.pazo_support_tickets
 for insert to authenticated with check (
   owner_id=(select auth.uid()) and status='open' and admin_note is null);
create policy pazo_support_admin_update on public.pazo_support_tickets
 for update to authenticated using ((select public.pazo_is_admin()))
 with check ((select public.pazo_is_admin()));
-- NOTE: Admin update values MUST still be restricted to status/note only.
revoke all on public.pazo_support_tickets from anon,authenticated;
grant select,insert on public.pazo_support_tickets to authenticated;
-- Expose privileged status updates only via a strict admin RPC, not unrestricted table UPDATE.

create or replace function public.pazo_admin_update_support_ticket(
 p_id uuid,p_status text,p_admin_note text default null,p_admin_reply text default null)
returns boolean language plpgsql security definer set search_path=''
as $function$
begin
 if auth.uid() is null or not public.pazo_is_admin() then
  raise exception 'Admin required' using errcode='42501';
 end if;
 if p_id is null or p_status not in ('open','reviewing','resolved')
    or char_length(coalesce(p_admin_note,''))>1000
    or char_length(coalesce(p_admin_reply,''))>2000 then
  raise exception 'Invalid ticket update' using errcode='22023';
 end if;
 update public.pazo_support_tickets
 set status=p_status,admin_note=nullif(btrim(p_admin_note),''),
     admin_reply=nullif(btrim(p_admin_reply),''),
     updated_at=clock_timestamp() where id=p_id;
 return found;
end $function$;
revoke execute on function public.pazo_admin_update_support_ticket(uuid,text,text,text) from public,anon;
grant execute on function public.pazo_admin_update_support_ticket(uuid,text,text,text) to authenticated;


-- Return only fields owned by the caller. In particular, admin_note is NEVER
-- included, because PostgreSQL RLS cannot hide a single column of a visible row.
create or replace function public.pazo_my_support_tickets()
returns jsonb language sql stable security definer set search_path=''
as $function$
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'id',t.id,'category',t.category,'message',t.message,
  'status',t.status,'admin_reply',t.admin_reply,'created_at',t.created_at
 ) order by t.created_at desc),'[]'::jsonb)
 from (
  select id,category,message,status,admin_reply,created_at
  from public.pazo_support_tickets
  where owner_id=auth.uid() and auth.uid() is not null
  order by created_at desc limit 20
 ) t;
$function$;
revoke all on function public.pazo_my_support_tickets() from public,anon;
grant execute on function public.pazo_my_support_tickets() to authenticated;

-- Abuse control, enforced server-side even against modified browsers.
create or replace function admin_private.pazo_support_intake_guard()
returns trigger language plpgsql security definer set search_path=''
as $function$
begin
 if auth.uid() is null or new.owner_id is distinct from auth.uid()
     or new.status<>'open' or new.admin_note is not null then
  raise exception 'Invalid support submission' using errcode='42501';
 end if;
 -- Serialize submissions for the same owner. Otherwise concurrent inserts
 -- can all observe a count below 3 and exceed the hourly limit.
 perform pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended(auth.uid()::text,1717));
 if (select count(*) from public.pazo_support_tickets
     where owner_id=auth.uid() and created_at>statement_timestamp()-interval '1 hour')>=3 then
  raise exception 'Support submission rate limit' using errcode='22023';
 end if;
 new.created_at:=statement_timestamp();
 new.updated_at:=statement_timestamp();
 return new;
end $function$;
drop trigger if exists pazo_support_intake_guard on public.pazo_support_tickets;
create trigger pazo_support_intake_guard before insert on public.pazo_support_tickets
 for each row execute function admin_private.pazo_support_intake_guard();
revoke all on function admin_private.pazo_support_intake_guard() from public,anon,authenticated;

-- REVIEW REQUIRED: presence in Git is not hosted-application evidence.
BEGIN;
SET LOCAL lock_timeout='5s';
-- F17 support. PO retention decision: 90 days after resolution.
-- RPC-only intake; plaintext support never goes to telemetry or third parties.
create table public.pazo_support_tickets (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 category text not null check (category in ('problem','question','feature','other')),
 message text not null check (char_length(btrim(message)) between 10 and 2000),
 status text not null default 'open' check (status in ('open','reviewing','resolved')),
 admin_note text check (admin_note is null or char_length(admin_note)<=1000),
 admin_reply text check (admin_reply is null or char_length(admin_reply)<=2000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 resolved_at timestamptz,
 check ((status='resolved') = (resolved_at is not null))
);
create index pazo_support_tickets_owner_created_idx on public.pazo_support_tickets(owner_id,created_at desc);
create index pazo_support_tickets_status_created_idx on public.pazo_support_tickets(status,created_at desc);
create index pazo_support_tickets_retention_idx on public.pazo_support_tickets(resolved_at) where status='resolved';
alter table public.pazo_support_tickets enable row level security;
alter table public.pazo_support_tickets force row level security;
-- Only admins can read full rows. Owners use the limited projection below.
create policy pazo_support_admin_read on public.pazo_support_tickets
 for select to authenticated using ((select public.pazo_is_admin()));
revoke all on public.pazo_support_tickets from public,anon,authenticated,service_role;
grant select on public.pazo_support_tickets to authenticated;

create or replace function admin_private.pazo_support_intake_guard()
returns trigger language plpgsql security definer set search_path=''
as $function$
begin
 if auth.uid() is null or new.owner_id is distinct from auth.uid()
    or new.status is distinct from 'open' or new.admin_note is not null
    or new.admin_reply is not null or new.resolved_at is not null then
  raise exception 'Invalid support submission' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,1717));
 if (select count(*) from public.pazo_support_tickets
     where owner_id=auth.uid() and created_at>statement_timestamp()-interval '1 hour')>=3 then
  raise exception 'Support submission rate limit' using errcode='22023';end if;
 new.created_at:=statement_timestamp();new.updated_at:=statement_timestamp();
 return new;
end $function$;
create trigger pazo_support_intake_guard before insert on public.pazo_support_tickets
 for each row execute function admin_private.pazo_support_intake_guard();
revoke all on function admin_private.pazo_support_intake_guard() from public,anon,authenticated,service_role;

create or replace function public.pazo_submit_support_ticket(p_request_id uuid,p_category text,p_message text)
returns boolean language plpgsql security definer set search_path=''
as $function$
declare actor uuid:=auth.uid(); previous public.pazo_support_tickets%rowtype;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor
  and email_confirmed_at is not null and is_anonymous is distinct from true) then
  raise exception 'Confirmed authentication required' using errcode='42501';end if;
 if p_request_id is null or p_category is null or p_category not in ('problem','question','feature','other')
  or char_length(btrim(coalesce(p_message,''))) not between 10 and 2000 then
  raise exception 'Invalid support submission' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,1717));
 select * into previous from public.pazo_support_tickets where id=p_request_id;
 if found then
  if previous.owner_id is distinct from actor or previous.category is distinct from p_category
   or previous.message is distinct from btrim(p_message) then
   raise exception 'Support request conflict' using errcode='42501';end if;
  return true; -- Same owner/request/body replay: no duplicate or quota consumption.
 end if;
 insert into public.pazo_support_tickets(id,owner_id,category,message)
 values(p_request_id,actor,p_category,btrim(p_message));
 return true;
end $function$;
revoke all on function public.pazo_submit_support_ticket(uuid,text,text) from public,anon,service_role;
grant execute on function public.pazo_submit_support_ticket(uuid,text,text) to authenticated;

create or replace function public.pazo_admin_update_support_ticket(
 p_id uuid,p_status text,p_admin_note text default null,p_admin_reply text default null)
returns boolean language plpgsql security definer set search_path=''
as $function$
begin
 if auth.uid() is null or not public.pazo_is_admin() then
  raise exception 'Admin required' using errcode='42501';end if;
 if p_id is null or p_status is null or p_status not in ('open','reviewing','resolved')
    or char_length(coalesce(p_admin_note,''))>1000 or char_length(coalesce(p_admin_reply,''))>2000 then
  raise exception 'Invalid ticket update' using errcode='22023';end if;
 update public.pazo_support_tickets set status=p_status,
  admin_note=nullif(btrim(p_admin_note),''),admin_reply=nullif(btrim(p_admin_reply),''),
  resolved_at=case when p_status='resolved' then coalesce(resolved_at,clock_timestamp()) else null end,
  updated_at=clock_timestamp() where id=p_id;
 return found;
end $function$;
revoke all on function public.pazo_admin_update_support_ticket(uuid,text,text,text) from public,anon,service_role;
grant execute on function public.pazo_admin_update_support_ticket(uuid,text,text,text) to authenticated;

create or replace function public.pazo_my_support_tickets()
returns jsonb language sql stable security definer set search_path=''
as $function$
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'id',t.id,'category',t.category,'message',t.message,'status',t.status,
  'admin_reply',t.admin_reply,'created_at',t.created_at
 ) order by t.created_at desc,t.id),'[]'::jsonb)
 from (select id,category,message,status,admin_reply,created_at
  from public.pazo_support_tickets where owner_id=auth.uid() and auth.uid() is not null
  order by created_at desc,id limit 20) t;
$function$;
revoke all on function public.pazo_my_support_tickets() from public,anon,service_role;
grant execute on function public.pazo_my_support_tickets() to authenticated;

-- Daily deletion of resolved plaintext including internal notes and replies.
-- Unresolved/reopened cases are retained for handling; account deletion cascades.
create or replace function admin_private.pazo_support_prune_resolved()
returns bigint language plpgsql security definer set search_path=''
as $function$
declare removed bigint;
begin
 delete from public.pazo_support_tickets where status='resolved'
  and resolved_at<=statement_timestamp()-interval '90 days';
 get diagnostics removed=row_count;return removed;
end $function$;
revoke all on function admin_private.pazo_support_prune_resolved() from public,anon,authenticated,service_role;
-- Existing pg_cron is required (already used by the Live worker). No new add-on.
do $schedule$
begin
 if to_regprocedure('cron.schedule(text,text,text)') is null then
  raise exception 'Existing pg_cron required for support retention';end if;
 perform cron.schedule('pazo_support_retention_daily','25 3 * * *',
  'SELECT admin_private.pazo_support_prune_resolved();');
end $schedule$;

COMMIT;

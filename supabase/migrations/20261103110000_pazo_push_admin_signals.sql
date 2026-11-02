-- Tells administrators about each new pet and each newly confirmed account.
-- Test and admin accounts never trigger it. Text is fixed: no names, no email.
-- A failure here can never undo the registration or the pet that caused it.

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
 check(type = any(array['sighting','system','community_join','supporter_campaign','supporter_verified','care_reminder','admin_new_pet','admin_new_account']));

alter table push_private.outbox drop constraint outbox_kind_check;
alter table push_private.outbox add constraint outbox_kind_check
 check(kind in('sighting','community_join','care_reminder','admin_new_pet','admin_new_account'));

alter table push_private.preferences
 add column admin_new_pets boolean not null default true,
 add column admin_new_accounts boolean not null default true;

create or replace function push_private.enqueue_from_notification() returns trigger
language plpgsql security definer set search_path='' as $fn$
begin
 if new.type not in('sighting','community_join','care_reminder','admin_new_pet','admin_new_account') or not push_private.is_enabled() then
  return new;
 end if;
 begin
  if exists(select 1 from push_private.subscriptions s where s.user_id=new.user_id)
   and not exists(select 1 from push_private.preferences p where p.user_id=new.user_id and (
    (new.type='sighting' and not p.sightings)
    or (new.type='community_join' and not p.community)
    or (new.type='care_reminder' and not p.care)
    or (new.type='admin_new_pet' and not p.admin_new_pets)
    or (new.type='admin_new_account' and not p.admin_new_accounts)))
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

create function push_private.notify_admins_new_pet() returns trigger
language plpgsql security definer set search_path='' as $fn$
begin
 begin
  if push_private.is_enabled() and marketing_private.is_reporting_owner(new.owner_id) then
   insert into public.notifications(user_id,pet_id,type,title,body)
   select a.user_id,new.id,'admin_new_pet','Nueva mascota en PAZO','Toca para ver su perfil.'
   from admin_private.admin_grants a;
  end if;
 exception when others then
  raise warning 'pazo admin pet notice skipped: %',sqlstate;
 end;
 return new;
end
$fn$;
create trigger pazo_push_admin_new_pet after insert on public.pets
 for each row execute function push_private.notify_admins_new_pet();

-- Fires when the address is first confirmed: on insert for Google, on update for email.
create function push_private.notify_admins_new_account() returns trigger
language plpgsql security definer set search_path='' as $fn$
begin
 begin
  if push_private.is_enabled() and new.email_confirmed_at is not null and new.is_anonymous is distinct from true
   and (tg_op='INSERT' or old.email_confirmed_at is null)
   and marketing_private.is_reporting_owner(new.id)
  then
   insert into public.notifications(user_id,type,title,body)
   select a.user_id,'admin_new_account','Nueva cuenta en PAZO','Alguien confirmó su registro.'
   from admin_private.admin_grants a;
  end if;
 exception when others then
  raise warning 'pazo admin account notice skipped: %',sqlstate;
 end;
 return new;
end
$fn$;
create trigger pazo_push_admin_new_account_insert after insert on auth.users
 for each row execute function push_private.notify_admins_new_account();
create trigger pazo_push_admin_new_account_update after update of email_confirmed_at on auth.users
 for each row execute function push_private.notify_admins_new_account();

create or replace function push_private.retention_tick() returns void
language plpgsql security definer set search_path='' as $fn$
begin
 delete from push_private.outbox where status in('sent','failed') and created_at<now()-interval '7 days';
 delete from push_private.care_reminder_log where due_date<current_date-60;
 delete from public.notifications where type in('care_reminder','admin_new_pet','admin_new_account') and created_at<now()-interval '30 days';
 delete from push_private.subscriptions
  where failure_count>=20 or coalesce(last_success_at,created_at)<now()-interval '180 days' and updated_at<now()-interval '180 days';
end
$fn$;

create or replace function public.pazo_push_preferences() returns jsonb
language sql stable security definer set search_path='' as $fn$
 select jsonb_build_object(
  'sightings',coalesce((select p.sightings from push_private.preferences p where p.user_id=auth.uid()),true),
  'community',coalesce((select p.community from push_private.preferences p where p.user_id=auth.uid()),true),
  'care',coalesce((select p.care from push_private.preferences p where p.user_id=auth.uid()),true),
  'isAdmin',exists(select 1 from admin_private.admin_grants a where a.user_id=auth.uid()),
  'adminNewPets',coalesce((select p.admin_new_pets from push_private.preferences p where p.user_id=auth.uid()),true),
  'adminNewAccounts',coalesce((select p.admin_new_accounts from push_private.preferences p where p.user_id=auth.uid()),true))
$fn$;

create function public.pazo_push_set_admin_preferences(p_pets boolean,p_accounts boolean) returns boolean
language plpgsql security definer set search_path='' as $fn$
begin
 if p_pets is null or p_accounts is null
  or not exists(select 1 from admin_private.admin_grants a where a.user_id=auth.uid())
 then return false; end if;
 insert into push_private.preferences(user_id,admin_new_pets,admin_new_accounts)
 values(auth.uid(),p_pets,p_accounts)
 on conflict(user_id) do update set admin_new_pets=excluded.admin_new_pets,admin_new_accounts=excluded.admin_new_accounts,updated_at=now();
 return true;
end
$fn$;

revoke all on function push_private.notify_admins_new_pet() from public, anon, authenticated, service_role;
revoke all on function push_private.notify_admins_new_account() from public, anon, authenticated, service_role;
revoke all on function public.pazo_push_set_admin_preferences(boolean,boolean) from public, anon;
grant execute on function public.pazo_push_set_admin_preferences(boolean,boolean) to authenticated;

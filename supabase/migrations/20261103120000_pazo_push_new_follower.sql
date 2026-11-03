-- Tells a pet's owner when another pet starts following it. One notice per pair
-- per week, so following and unfollowing repeatedly cannot flood anyone.
-- Text is fixed; the notice keeps only which pet followed which.

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
 check(type = any(array['sighting','system','community_join','supporter_campaign','supporter_verified','care_reminder','admin_new_pet','admin_new_account','new_follower']));

alter table push_private.outbox drop constraint outbox_kind_check;
alter table push_private.outbox add constraint outbox_kind_check
 check(kind in('sighting','community_join','care_reminder','admin_new_pet','admin_new_account','new_follower'));

alter table push_private.preferences add column followers boolean not null default true;

create or replace function push_private.enqueue_from_notification() returns trigger
language plpgsql security definer set search_path='' as $fn$
begin
 if new.type not in('sighting','community_join','care_reminder','admin_new_pet','admin_new_account','new_follower') or not push_private.is_enabled() then
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
    or (new.type='new_follower' and not p.followers)))
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

-- A failure here can never undo the follow that caused it.
create function push_private.notify_new_follower() returns trigger
language plpgsql security definer set search_path='' as $fn$
declare v_owner uuid;
begin
 begin
  if push_private.is_enabled() then
   select p.owner_id into v_owner from public.pets p where p.id=new.following_id;
   if v_owner is not null and not exists(
    select 1 from public.notifications n
    where n.user_id=v_owner and n.type='new_follower' and n.pet_id=new.following_id
     and n.source_id=new.follower_id and n.created_at>now()-interval '7 days')
   then
    insert into public.notifications(user_id,pet_id,type,title,body,source_id)
    values(v_owner,new.following_id,'new_follower','Tienes un nuevo seguidor','Toca para ver quién es.',new.follower_id);
   end if;
  end if;
 exception when others then
  raise warning 'pazo follower notice skipped: %',sqlstate;
 end;
 return new;
end
$fn$;
create trigger pazo_push_new_follower after insert on public.follows
 for each row execute function push_private.notify_new_follower();

create or replace function push_private.retention_tick() returns void
language plpgsql security definer set search_path='' as $fn$
begin
 delete from push_private.outbox where status in('sent','failed') and created_at<now()-interval '7 days';
 delete from push_private.care_reminder_log where due_date<current_date-60;
 delete from public.notifications where type in('care_reminder','admin_new_pet','admin_new_account','new_follower') and created_at<now()-interval '30 days';
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
  'followers',coalesce((select p.followers from push_private.preferences p where p.user_id=auth.uid()),true),
  'isAdmin',exists(select 1 from admin_private.admin_grants a where a.user_id=auth.uid()),
  'adminNewPets',coalesce((select p.admin_new_pets from push_private.preferences p where p.user_id=auth.uid()),true),
  'adminNewAccounts',coalesce((select p.admin_new_accounts from push_private.preferences p where p.user_id=auth.uid()),true))
$fn$;

create function public.pazo_push_set_followers_preference(p_followers boolean) returns boolean
language plpgsql security definer set search_path='' as $fn$
begin
 if auth.uid() is null or p_followers is null then return false; end if;
 insert into push_private.preferences(user_id,followers) values(auth.uid(),p_followers)
 on conflict(user_id) do update set followers=excluded.followers,updated_at=now();
 return true;
end
$fn$;

revoke all on function push_private.notify_new_follower() from public, anon, authenticated, service_role;
revoke all on function public.pazo_push_set_followers_preference(boolean) from public, anon;
grant execute on function public.pazo_push_set_followers_preference(boolean) to authenticated;

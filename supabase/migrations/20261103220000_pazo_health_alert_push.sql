-- Vigilante step 3: the health alert notice and its push.
-- The lock screen only ever shows the fixed text of the worker (no pet name, no health data);
-- the personal line ("this applies to Max") is built inside the app from typed columns.

alter table public.official_posts add column vaccine_type text;
alter table public.official_posts add constraint official_posts_vaccine_type_valid check(
 vaccine_type is null or vaccine_type = any(array['rabies','dhpp','leptospirosis','bordetella','canine_influenza','fvrcp','felv','other'])
);

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
 check(type = any(array['sighting','system','community_join','supporter_campaign','supporter_verified','care_reminder','admin_new_pet','admin_new_account','new_follower','welcome','health_alert']));

-- Why this alert reached this pet, and the owner's answer. Only health alerts use them.
alter table public.notifications
 add column alert_reason text,
 add column alert_vaccine_type text,
 add column alert_answer text,
 add column alert_answered_at timestamptz;
alter table public.notifications
 add constraint notifications_alert_reason_valid check(alert_reason is null or (type='health_alert' and alert_reason in('expired','unregistered','applies'))),
 add constraint notifications_alert_vaccine_valid check(alert_vaccine_type is null or (type='health_alert' and alert_vaccine_type = any(array['rabies','dhpp','leptospirosis','bordetella','canine_influenza','fvrcp','felv','other']))),
 add constraint notifications_alert_answer_valid check(alert_answer is null or (type='health_alert' and alert_answer in('has_it','not_yet','unsure')));

alter table push_private.outbox drop constraint outbox_kind_check;
alter table push_private.outbox add constraint outbox_kind_check
 check(kind in('sighting','community_join','care_reminder','admin_new_pet','admin_new_account','new_follower','health_alert'));

alter table push_private.preferences add column health_alerts boolean not null default true;

-- Quiet hours 21:00-08:00 in Los Angeles, where PAZO launches. Health alerts that arrive
-- at night wait for 08:00; everything else keeps its current timing.
create or replace function push_private.next_daytime(p_at timestamptz) returns timestamptz
language sql stable set search_path='' as $fn$
 select case
  when extract(hour from (p_at at time zone 'America/Los_Angeles')) >= 21
   then (((p_at at time zone 'America/Los_Angeles')::date + 1) + time '08:00') at time zone 'America/Los_Angeles'
  when extract(hour from (p_at at time zone 'America/Los_Angeles')) < 8
   then (((p_at at time zone 'America/Los_Angeles')::date) + time '08:00') at time zone 'America/Los_Angeles'
  else p_at
 end
$fn$;
revoke all on function push_private.next_daytime(timestamptz) from public;

create or replace function push_private.enqueue_from_notification() returns trigger
language plpgsql security definer set search_path='' as $fn$
begin
 if new.type not in('sighting','community_join','care_reminder','admin_new_pet','admin_new_account','new_follower','health_alert') or not push_private.is_enabled() then
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
    or (new.type='health_alert' and not p.health_alerts)))
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

create or replace function push_private.retention_tick() returns void
language plpgsql security definer set search_path='' as $fn$
begin
 delete from push_private.outbox where status in('sent','failed') and created_at<now()-interval '7 days';
 delete from push_private.care_reminder_log where due_date<current_date-60;
 delete from public.notifications where type in('care_reminder','admin_new_pet','admin_new_account','new_follower','health_alert') and created_at<now()-interval '30 days';
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
  'healthAlerts',coalesce((select p.health_alerts from push_private.preferences p where p.user_id=auth.uid()),true),
  'isAdmin',exists(select 1 from admin_private.admin_grants a where a.user_id=auth.uid()),
  'adminNewPets',coalesce((select p.admin_new_pets from push_private.preferences p where p.user_id=auth.uid()),true),
  'adminNewAccounts',coalesce((select p.admin_new_accounts from push_private.preferences p where p.user_id=auth.uid()),true))
$fn$;

create function public.pazo_push_set_health_alerts_preference(p_health_alerts boolean) returns boolean
language plpgsql security definer set search_path='' as $fn$
begin
 if auth.uid() is null or p_health_alerts is null then return false; end if;
 insert into push_private.preferences(user_id,health_alerts) values(auth.uid(),p_health_alerts)
 on conflict(user_id) do update set health_alerts=excluded.health_alerts,updated_at=now();
 return true;
end
$fn$;
revoke all on function public.pazo_push_set_health_alerts_preference(boolean) from public, anon;
grant execute on function public.pazo_push_set_health_alerts_preference(boolean) to authenticated;

-- The owner answers once from the notice: "has it", "not yet" or "not sure".
create function public.pazo_answer_health_alert(p_notification_id uuid, p_answer text) returns boolean
language plpgsql security definer set search_path='' as $fn$
begin
 if auth.uid() is null or p_answer not in('has_it','not_yet','unsure') then return false; end if;
 update public.notifications
  set alert_answer=p_answer, alert_answered_at=now(), read_at=coalesce(read_at,now())
  where id=p_notification_id and user_id=auth.uid() and type='health_alert'
   and alert_reason in('expired','unregistered') and alert_answer is null;
 return found;
end
$fn$;
revoke all on function public.pazo_answer_health_alert(uuid,text) from public, anon;
grant execute on function public.pazo_answer_health_alert(uuid,text) to authenticated;

-- Full schema rollback of the Vigilante (migrations 20261103200000 … 20261103230000).
-- REVIEW REQUIRED. Prefer the off switch first:
--   update vigilante_private.settings set enabled=false where singleton;
-- This script DELETES Vigilante data (drafts, findings, official posts and their likes,
-- health alerts, household postal codes, pet health and food details, typed vaccines).
-- Run only with the PO's explicit GO, in one transaction, after a backup.
begin;

select cron.unschedule('pazo_vigilante_tick_v1') where exists(select 1 from cron.job where jobname='pazo_vigilante_tick_v1');

-- Notices created by the Vigilante and the welcome notice.
delete from public.notifications where type in('welcome','health_alert','admin_vigilante_pending','admin_vigilante_approved');

-- Push: previous enqueue function, kinds and preferences (as installed by 20261103120000).
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
delete from push_private.outbox where kind not in('sighting','community_join','care_reminder','admin_new_pet','admin_new_account','new_follower');
alter table push_private.outbox drop constraint outbox_kind_check;
alter table push_private.outbox add constraint outbox_kind_check
 check(kind in('sighting','community_join','care_reminder','admin_new_pet','admin_new_account','new_follower'));
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
drop function if exists public.pazo_push_set_health_alerts_preference(boolean);
drop function if exists public.pazo_push_set_admin_vigilante_preference(boolean);
drop function if exists push_private.next_daytime(timestamptz);
alter table push_private.preferences drop column if exists health_alerts, drop column if exists admin_vigilante;

-- Vigilante engine and official author.
drop schema if exists vigilante_private cascade;
drop function if exists public.pazo_vigilante_ingest(text,jsonb), public.pazo_vigilante_source_failed(text,text),
 public.pazo_vigilante_due_sources(), public.pazo_vigilante_inbox(), public.pazo_vigilante_decide(uuid,text,text),
 public.pazo_vigilante_edit(uuid,jsonb), public.pazo_vigilante_cancel(uuid), public.pazo_vigilante_test(uuid),
 public.pazo_vigilante_manual(text,text,text,date,jsonb), public.pazo_vigilante_ingest_as_admin(text,text,text,date,jsonb),
 public.pazo_vigilante_results(uuid), public.pazo_vigilante_monthly_summary(), public.pazo_vigilante_worker_admit(text),
 public.pazo_vigilante_set_enabled(boolean), public.pazo_answer_health_alert(uuid,text),
 public.get_official_feed(uuid,integer), public.toggle_official_post_like(uuid), public.pazo_founder_pets_batch(uuid[]);
drop table if exists public.official_post_likes, public.official_posts;
alter table public.notifications drop constraint if exists notifications_alert_reason_valid,
 drop constraint if exists notifications_alert_vaccine_valid, drop constraint if exists notifications_alert_answer_valid;
alter table public.notifications drop column if exists alert_reason, drop column if exists alert_vaccine_type,
 drop column if exists alert_answer, drop column if exists alert_answered_at, drop column if exists title_en, drop column if exists body_en;
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
 check(type = any(array['sighting','system','community_join','supporter_campaign','supporter_verified','care_reminder','admin_new_pet','admin_new_account','new_follower']));

-- Reserved names and welcome triggers.
drop trigger if exists pazo_reserved_pet_name on public.pets;
drop trigger if exists pazo_reserved_username on public.profiles;
drop trigger if exists pazo_welcome_on_first_pet on public.pets;
drop function if exists private.pazo_reject_reserved_name(), private.pazo_is_reserved_name(text), private.pazo_welcome_on_first_pet();
-- The administrator keeps is_founder=true; it was the documented intent before the Vigilante.

-- Private data of step 1.
drop table if exists public.household_private_details;
alter table public.pet_private_details drop constraint if exists pet_birth_month_valid, drop constraint if exists pet_health_conditions_valid,
 drop constraint if exists pet_food_brand_length, drop constraint if exists pet_food_product_length;
alter table public.pet_private_details drop column if exists birth_month, drop column if exists health_conditions,
 drop column if exists food_brand, drop column if exists food_product;
revoke insert(vaccine_type), update(vaccine_type) on public.care_items from authenticated;
alter table public.care_items drop constraint if exists care_items_vaccine_type_valid;
alter table public.care_items drop column if exists vaccine_type;

commit;

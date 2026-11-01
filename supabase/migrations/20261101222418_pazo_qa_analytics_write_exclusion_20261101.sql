-- Mirror of migration already applied to PAZO production on 2026-11-01.
-- Keep QA/admin activity out of first-party telemetry without disrupting product usage.
create or replace function marketing_private.is_reporting_owner(p_owner uuid)
returns boolean language sql stable security definer set search_path = ''
as $fn$
  select p_owner is not null
    and exists(select 1 from auth.users u where u.id=p_owner)
    and not exists(select 1 from auth.users u where u.id=p_owner and coalesce(u.raw_app_meta_data->>'pazo_marketing_qa','false')='true')
    and not exists(select 1 from supporter_private.gradual_qa_accounts q where q.owner_id=p_owner)
    and not exists(select 1 from supporter_private.f16_sandbox_qa_owners q where q.owner_id=p_owner)
    and not exists(select 1 from admin_private.admin_grants a where a.user_id=p_owner);
$fn$;
revoke all on function marketing_private.is_reporting_owner(uuid) from public, anon, authenticated;

create or replace function marketing_private.skip_qa_analytics_write()
returns trigger language plpgsql security definer set search_path = ''
as $fn$
begin
  if not marketing_private.is_reporting_owner(new.user_id) then
    return null;
  end if;
  return new;
end;
$fn$;
revoke all on function marketing_private.skip_qa_analytics_write() from public, anon, authenticated;

create trigger pazo_qa_skip_activity before insert on admin_private.app_activity_daily
  for each row execute function marketing_private.skip_qa_analytics_write();
create trigger pazo_qa_skip_places before insert on public.place_usage_events
  for each row execute function marketing_private.skip_qa_analytics_write();
create trigger pazo_qa_skip_search before insert on public.search_usage_events
  for each row execute function marketing_private.skip_qa_analytics_write();
create trigger pazo_qa_skip_module_views before insert on public.module_validation_views
  for each row execute function marketing_private.skip_qa_analytics_write();
create trigger pazo_qa_skip_module_interests before insert on public.module_validation_interests
  for each row execute function marketing_private.skip_qa_analytics_write();
create trigger pazo_qa_skip_module_intents before insert on public.module_validation_intents
  for each row execute function marketing_private.skip_qa_analytics_write();

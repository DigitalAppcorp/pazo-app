-- PAZO Admin Observatory 2026-10-18 — staging first; no PayPal/Live changes.
-- Owner-only analytics; moderators are NOT implicitly analytics administrators.
create schema if not exists admin_private;
revoke all on schema admin_private from public, anon, authenticated;
create table if not exists admin_private.admin_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);
alter table admin_private.admin_grants enable row level security;
alter table admin_private.admin_grants force row level security;
revoke all on admin_private.admin_grants from public, anon, authenticated;

-- Existing QA workspace currently has exactly one owner/moderator. Seed only
-- under that fact; refuse to guess an administrator if roles become ambiguous.
do $$
begin
  if (select count(*) from moderation_private.moderator_grants)=1 then
    insert into admin_private.admin_grants(user_id)
      select user_id from moderation_private.moderator_grants
    on conflict do nothing;
  else
    raise exception 'PAZO admin setup requires an unambiguous owner grant';
  end if;
end $$;

create table if not exists admin_private.app_activity_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_day date not null default (now() at time zone 'utc')::date,
  module_key text not null,
  primary key(user_id,activity_day,module_key),
  constraint pazo_admin_activity_modules check
    (module_key in ('feed','explore','places','communities','profile',
                    'care','documents','notifications','supporter'))
);
create index if not exists idx_pazo_admin_activity_day
 on admin_private.app_activity_daily(activity_day desc,user_id);
alter table admin_private.app_activity_daily enable row level security;
alter table admin_private.app_activity_daily force row level security;
revoke all on admin_private.app_activity_daily from public, anon, authenticated;

create or replace function public.pazo_is_admin()
returns boolean language sql stable security definer set search_path=''
as $$
 select auth.uid() is not null and exists(
  select 1 from admin_private.admin_grants g where g.user_id=auth.uid()
 );
$$;

-- Daily module usage, NOT page/content autocapture; at most 1 row/user/module/day.
-- No GPS, post body, email, IP, device fingerprint or external provider.
create or replace function public.pazo_track_activity(p_module text)
returns void language plpgsql security definer set search_path=''
as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_module is null or p_module not in
 ('feed','explore','places','communities','profile',
  'care','documents','notifications','supporter') then
  raise exception 'Unknown activity module' using errcode='22023';
 end if;
 insert into admin_private.app_activity_daily(user_id,activity_day,module_key)
 values(auth.uid(),(now() at time zone 'utc')::date,p_module)
 on conflict do nothing;
end $$;

-- One server-authorized response, zero direct table access.
-- All amount_* numbers are integer cents and ONLY Sandbox paid-period evidence.
-- Activity only exists from this release onwards: not historic DAU.
create or replace function public.pazo_admin_overview(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare result jsonb;
begin
 if not public.pazo_is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_days not in (7,30,90) or p_days is null then raise exception 'Invalid period' using errcode='22023'; end if;
 select jsonb_build_object(
  'environment','sandbox',
  'as_of',now(),
  'period_days',p_days,
  'people',jsonb_build_object(
   'registered',(select count(*) from auth.users),
   'new_7d',(select count(*) from auth.users where created_at>=now()-interval '7 days'),
   'new_30d',(select count(*) from auth.users where created_at>=now()-interval '30 days'),
   'with_pet',(select count(distinct owner_id) from public.pets),
   'without_pet',(select count(*) from auth.users u where not exists
                   (select 1 from public.pets p where p.owner_id=u.id)),
   'pets',(select count(*) from public.pets),
   'posts',(select count(*) from public.posts),
   'comments',(select count(*) from public.post_comments),
   'communities',(select count(*) from public.communities)
  ),
  'activity',jsonb_build_object(
   'tracking_since','2026-10-18',
   'today',(select count(distinct user_id) from admin_private.app_activity_daily
               where activity_day=(now() at time zone 'utc')::date),
   'last_7d',(select count(distinct user_id) from admin_private.app_activity_daily
               where activity_day >= (now() at time zone 'utc')::date-6),
   'last_30d',(select count(distinct user_id) from admin_private.app_activity_daily
               where activity_day >= (now() at time zone 'utc')::date-29),
   'active_period',(select count(distinct user_id) from admin_private.app_activity_daily
               where activity_day >= (now() at time zone 'utc')::date-(p_days-1)),
   'total_user_days',(select count(*) from
      (select distinct user_id,activity_day from admin_private.app_activity_daily
       where activity_day >= (now() at time zone 'utc')::date-(p_days-1)) x),
   'module_counts',coalesce((select jsonb_object_agg(module_key,n) from
     (select module_key,count(distinct user_id) n from admin_private.app_activity_daily
      where activity_day>=(now() at time zone 'utc')::date-(p_days-1)
      group by module_key) m),'{}'::jsonb)
  ),
  'support',jsonb_build_object(
   'sandbox_verified_periods',(select count(*) from supporter_private.f16_sandbox_qa_paid_periods),
   'sandbox_gross_minor',(select coalesce(sum(amount_minor),0)
     from supporter_private.f16_sandbox_qa_paid_periods where currency='USD' and provider_environment='sandbox'),
   'sandbox_paid_accounts',(select count(distinct owner_id) from supporter_private.f16_sandbox_qa_paid_periods),
   'sandbox_covered_accounts',(select count(distinct pp.owner_id)
      from supporter_private.f16_sandbox_qa_paid_periods pp
      where pp.service_start<=now() and pp.service_end>now()
        and not exists(select 1 from supporter_private.f16_sandbox_qa_holds h where h.sale_id=pp.sale_id)),
   'sandbox_held_periods',(select count(*) from supporter_private.f16_sandbox_qa_holds),
   'checkout_attempts',(select count(*) from supporter_private.f16_sandbox_qa_v2_checkout_attempts),
   'attempts_without_verified_period',(select count(*) from supporter_private.f16_sandbox_qa_v2_checkout_attempts a
       where a.created_at<now()-interval '30 minutes'
       and not exists(select 1 from supporter_private.f16_sandbox_qa_paid_periods pp
                      where pp.owner_id=a.owner_id and pp.created_at>=a.created_at-interval '15 minutes')),
   'live_revenue_minor',null,
   'live_verified',false
  ),
  'experiments',jsonb_build_object(
   'tracked_views',(select count(*) from public.module_validation_views),
   'interested_accounts',(select count(distinct user_id) from public.module_validation_interests),
   'intent_votes',(select count(*) from public.module_validation_intents),
   'place_events',(select count(*) from public.place_usage_events),
   'search_events',(select count(*) from public.search_usage_events)
  ),
  'resources',jsonb_build_object(
   'database_bytes',pg_database_size(current_database()),
   'stored_objects',(select count(*) from storage.objects),
   'storage_estimated_bytes',(select coalesce(sum(
        case when (metadata->>'size')~'^[0-9]+$' then (metadata->>'size')::bigint else 0 end),0)
       from storage.objects),
   'provider_egress_bytes',null,
   'provider_quota_bytes',null,
   'provider_billing_amount',null,
   'note','Database size and Storage metadata are estimates, NOT Supabase billing or egress.'
  )
 ) into result;
 return result;
end $$;

create or replace function public.pazo_admin_users(p_limit integer default 30,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare result jsonb;
begin
 if not public.pazo_is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_limit is null or p_limit<1 or p_limit>50 or p_offset is null or p_offset<0 then
  raise exception 'Invalid pagination' using errcode='22023';
 end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb)
 into result from (
  select u.id::text as user_id,u.email,u.created_at,
   (select count(*) from public.pets p where p.owner_id=u.id) as pet_count,
   (select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'species',p.species)
                    order by p.created_at),'[]'::jsonb)
     from public.pets p where p.owner_id=u.id) as pets,
   (select count(distinct a.activity_day) from admin_private.app_activity_daily a
     where a.user_id=u.id and a.activity_day>=(now() at time zone 'utc')::date-29) as active_days_30,
   (select max(a.activity_day) from admin_private.app_activity_daily a
     where a.user_id=u.id) as last_recorded_day,
   exists(select 1 from supporter_private.f16_sandbox_qa_paid_periods pp
     where pp.owner_id=u.id) as ever_sandbox_paid,
   exists(select 1 from supporter_private.f16_sandbox_qa_paid_periods pp
     where pp.owner_id=u.id and pp.service_start<=now() and pp.service_end>now()
       and not exists(select 1 from supporter_private.f16_sandbox_qa_holds h where h.sale_id=pp.sale_id))
     as has_verified_sandbox_coverage,
   (select count(*) from supporter_private.f16_sandbox_qa_v2_checkout_attempts c
     where c.owner_id=u.id and not exists(
       select 1 from supporter_private.f16_sandbox_qa_paid_periods pp
        where pp.owner_id=u.id and pp.created_at>=c.created_at-interval '15 minutes'))
     as unverified_checkout_attempts
  from auth.users u order by u.created_at desc limit p_limit offset p_offset
 ) x;
 return result;
end $$;

-- Rank by unique interested users, then conversion among exposed unique users.
-- No fake-door pageviews/votes are invented; <30 exposures is insufficient sample.
create or replace function public.pazo_admin_experiments()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare result jsonb;
begin
 if not public.pazo_is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 with catalog(module_key,display_name) as (
  values
  ('communities_events','Eventos y caminatas'),
  ('communities_challenges','Retos colectivos'),
  ('communities_badges','Insignias comunitarias'),
  ('communities_qa','Preguntas y respuestas'),
  ('communities_admin_tools','Herramientas de comunidad'),
  ('places_reviews','Reseñas de lugares'),
  ('places_favorites','Listas de lugares'),
  ('places_user_photos','Fotos de la comunidad'),
  ('places_events','Eventos en lugares'),
  ('places_routes','Rutas y caminatas'),
  ('places_business_offers','Ofertas de negocios')
 ), metrics as (
  select c.module_key,c.display_name,
    (select count(distinct v.user_id) from public.module_validation_views v
      where v.module_key=c.module_key) as viewers,
    (select count(distinct i.user_id) from public.module_validation_interests i
      where i.module_key=c.module_key) as interested,
    (select count(*) from public.module_validation_intents t
      where t.module_key=c.module_key) as intents
  from catalog c
 )
 select coalesce(jsonb_agg(jsonb_build_object(
   'key',m.module_key,'name',m.display_name,'viewers',m.viewers,
   'interested',m.interested,'intent_votes',m.intents,
   'interest_rate',case when m.viewers>0 then round(100.0*m.interested/m.viewers,1) else null end,
   'confidence',case when m.viewers>=100 then 'reasonable'
                     when m.viewers>=30 then 'directional' else 'insufficient' end,
   'priority_score',case when m.viewers>=30 then
        round((m.interested::numeric/greatest(m.viewers,1))*sqrt(m.viewers::numeric),3)
        else null end,
   'choices',(select coalesce(jsonb_agg(jsonb_build_object('option',n.intent_key,'votes',n.votes)
                             order by n.votes desc),'[]'::jsonb)
             from (select t.intent_key,count(*) votes from public.module_validation_intents t
                   where t.module_key=m.module_key group by t.intent_key) n)
 ) order by (m.viewers>=30) desc,m.interested desc,
        (m.interested::numeric/greatest(m.viewers,1)) desc),'[]'::jsonb)
 into result from metrics m;
 return result;
end $$;

create or replace function public.pazo_admin_voters(p_module_key text,p_limit integer default 40)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare result jsonb;
begin
 if not public.pazo_is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_module_key is null or length(p_module_key)>80 or p_limit is null or p_limit<1 or p_limit>50 then
  raise exception 'Invalid voter query' using errcode='22023';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('user_id',u.id,'email',u.email,
   'interested_at',i.created_at,'choice',t.intent_key,'source',i.source)
   order by i.created_at desc),'[]'::jsonb)
 into result
 from public.module_validation_interests i
 join auth.users u on u.id=i.user_id
 left join public.module_validation_intents t on t.user_id=i.user_id and t.module_key=i.module_key
 where i.module_key=p_module_key and u.deleted_at is null
 and i.user_id in (select user_id from public.module_validation_interests where module_key=p_module_key)
 and i.created_at is not null
 and i.user_id is not null
 and i.module_key is not null
 and i.module_key <> ''
 and i.module_key=p_module_key
 and i.user_id=u.id
 and i.created_at <= now()
 and i.user_id in (select z.user_id from public.module_validation_interests z where z.module_key=p_module_key
                   order by z.created_at desc limit p_limit);
 return result;
end $$;


-- Admin-only viewers: who saw a fake door vs who explicitly voted.
create or replace function public.pazo_admin_audience(p_module_key text,p_limit integer default 40)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare result jsonb;
begin
 if not public.pazo_is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_module_key is null or length(p_module_key)>80 or p_limit is null or p_limit<1 or p_limit>50 then
  raise exception 'Invalid audience query' using errcode='22023';
 end if;
 with per_account as (
  select user_id,min(created_at) first_viewed,max(created_at) last_viewed
  from public.module_validation_views
  where module_key=p_module_key group by user_id
  order by last_viewed desc limit p_limit
 )
 select coalesce(jsonb_agg(jsonb_build_object(
   'user_id',u.id,'email',u.email,'first_viewed',v.first_viewed,
   'last_viewed',v.last_viewed,'interested',i.user_id is not null,
   'choice',t.intent_key) order by v.last_viewed desc),'[]'::jsonb)
 into result from per_account v
 join auth.users u on u.id=v.user_id
 left join public.module_validation_interests i
   on i.user_id=v.user_id and i.module_key=p_module_key
 left join public.module_validation_intents t
   on t.user_id=v.user_id and t.module_key=p_module_key;
 return result;
end $$;

revoke execute on function public.pazo_is_admin() from public,anon;
revoke execute on function public.pazo_track_activity(text) from public,anon;
revoke execute on function public.pazo_admin_overview(integer) from public,anon;
revoke execute on function public.pazo_admin_users(integer,integer) from public,anon;
revoke execute on function public.pazo_admin_experiments() from public,anon;
revoke execute on function public.pazo_admin_voters(text,integer) from public,anon;
grant execute on function public.pazo_is_admin() to authenticated;
grant execute on function public.pazo_track_activity(text) to authenticated;
grant execute on function public.pazo_admin_overview(integer) to authenticated;
grant execute on function public.pazo_admin_users(integer,integer) to authenticated;
grant execute on function public.pazo_admin_experiments() to authenticated;
revoke execute on function public.pazo_admin_audience(text,integer) from public,anon;
grant execute on function public.pazo_admin_voters(text,integer) to authenticated;
grant execute on function public.pazo_admin_audience(text,integer) to authenticated;

create schema if not exists rescue_private;
revoke all on schema rescue_private from public;
grant usage on schema rescue_private to anon, authenticated;

create or replace function rescue_private.activate_lost_pet_alert_internal(
  p_pet_id uuid,
  p_last_seen_location text,
  p_last_seen_at timestamptz,
  p_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alert_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.pets p
    where p.id = p_pet_id
      and p.owner_id = (select auth.uid())
  ) then
    raise exception 'Pet not found or not owned by authenticated user.';
  end if;

  if char_length(btrim(coalesce(p_last_seen_location,''))) < 2 then
    raise exception 'Last seen location is required.';
  end if;

  if p_last_seen_at is null then
    raise exception 'Last seen date and time are required.';
  end if;

  if p_last_seen_at > now() + interval '10 minutes' then
    raise exception 'Last seen date and time cannot be in the future.';
  end if;

  update public.lost_pet_alerts
  set
    last_seen_location = btrim(p_last_seen_location),
    last_seen_at = p_last_seen_at,
    details = nullif(btrim(coalesce(p_details,'')), ''),
    resolved_at = null
  where pet_id = p_pet_id
    and status = 'active'
  returning id into v_alert_id;

  if v_alert_id is null then
    insert into public.lost_pet_alerts (
      pet_id,
      last_seen_location,
      last_seen_at,
      details
    )
    values (
      p_pet_id,
      btrim(p_last_seen_location),
      p_last_seen_at,
      nullif(btrim(coalesce(p_details,'')), '')
    )
    returning id into v_alert_id;
  end if;

  update public.pets
  set
    is_lost = true,
    last_seen_location = btrim(p_last_seen_location)
  where id = p_pet_id;

  return v_alert_id;
end;
$$;

create or replace function rescue_private.get_pet_founder_status_internal(
  p_pet_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select coalesce((
    select pr.is_founder
    from public.pets p
    join public.profiles pr on pr.id = p.owner_id
    where p.id = p_pet_id
    limit 1
  ), false);
$$;

create or replace function rescue_private.get_public_pet_rescue_profile_internal(
  p_token uuid
)
returns table(
  name text,
  species text,
  breed text,
  photo_url text,
  bio text,
  is_lost boolean,
  last_seen_location text,
  alert_last_seen_at timestamptz,
  alert_details text
)
language sql
security definer
set search_path = ''
as $$
  select
    p.name,
    p.species,
    p.breed,
    p.photo_url,
    p.bio,
    p.is_lost,
    case when a.id is not null then a.last_seen_location else null end,
    a.last_seen_at,
    a.details
  from public.pet_public_links l
  join public.pets p on p.id = l.pet_id
  left join lateral (
    select la.id, la.last_seen_location, la.last_seen_at, la.details
    from public.lost_pet_alerts la
    where la.pet_id = p.id
      and la.status = 'active'
    order by la.created_at desc
    limit 1
  ) a on true
  where l.public_token = p_token
    and l.enabled = true
  limit 1;
$$;

create or replace function rescue_private.resolve_lost_pet_alert_internal(
  p_pet_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.pets p
    where p.id = p_pet_id
      and p.owner_id = (select auth.uid())
  ) then
    raise exception 'Pet not found or not owned by authenticated user.';
  end if;

  update public.lost_pet_alerts
  set
    status = 'resolved',
    resolved_at = now()
  where pet_id = p_pet_id
    and status = 'active';

  update public.pets
  set
    is_lost = false,
    last_seen_location = null
  where id = p_pet_id;

  return true;
end;
$$;

create or replace function rescue_private.rotate_pet_public_link_internal(
  p_pet_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.pets p
    where p.id = p_pet_id
      and p.owner_id = (select auth.uid())
  ) then
    raise exception 'Pet not found or not owned by authenticated user.';
  end if;

  update public.pet_public_links
  set
    public_token = gen_random_uuid(),
    enabled = true,
    rotated_at = now()
  where pet_id = p_pet_id
  returning public_token into v_token;

  if v_token is null then
    insert into public.pet_public_links (pet_id)
    values (p_pet_id)
    returning public_token into v_token;
  end if;

  return v_token;
end;
$$;

create or replace function rescue_private.submit_pet_sighting_internal(
  p_token uuid,
  p_reporter_name text,
  p_reporter_phone text,
  p_message text,
  p_location text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pet_id uuid;
  v_owner_id uuid;
  v_pet_name text;
  v_alert_id uuid;
  v_sighting_id uuid;
  v_recent_count integer;
  v_reporter_name text := btrim(coalesce(p_reporter_name,''));
  v_reporter_phone text := btrim(coalesce(p_reporter_phone,''));
  v_message text := btrim(coalesce(p_message,''));
  v_location text := nullif(btrim(coalesce(p_location,'')), '');
begin
  if char_length(v_reporter_name) < 2 or char_length(v_reporter_name) > 100 then
    raise exception 'Reporter name must contain between 2 and 100 characters.';
  end if;

  if char_length(v_reporter_phone) < 7 or char_length(v_reporter_phone) > 40 then
    raise exception 'Reporter phone must contain between 7 and 40 characters.';
  end if;

  if char_length(v_message) < 3 or char_length(v_message) > 1000 then
    raise exception 'Sighting message must contain between 3 and 1000 characters.';
  end if;

  if v_location is not null and char_length(v_location) > 250 then
    raise exception 'Sighting location is too long.';
  end if;

  select p.id, p.owner_id, p.name
  into v_pet_id, v_owner_id, v_pet_name
  from public.pet_public_links l
  join public.pets p on p.id = l.pet_id
  where l.public_token = p_token
    and l.enabled = true;

  if v_pet_id is null then
    raise exception 'Invalid or disabled rescue link.';
  end if;

  select count(*)::integer
  into v_recent_count
  from public.pet_sightings s
  where s.pet_id = v_pet_id
    and s.created_at > now() - interval '10 minutes';

  if v_recent_count >= 10 then
    raise exception 'Too many recent sighting reports. Please try again later.';
  end if;

  select a.id
  into v_alert_id
  from public.lost_pet_alerts a
  where a.pet_id = v_pet_id
    and a.status = 'active'
  order by a.created_at desc
  limit 1;

  insert into public.pet_sightings (
    pet_id,
    alert_id,
    reporter_name,
    reporter_phone,
    message,
    location_text
  )
  values (
    v_pet_id,
    v_alert_id,
    v_reporter_name,
    v_reporter_phone,
    v_message,
    v_location
  )
  returning id into v_sighting_id;

  insert into public.notifications (
    user_id,
    pet_id,
    type,
    title,
    body,
    source_id
  )
  values (
    v_owner_id,
    v_pet_id,
    'sighting',
    'Nuevo aviso sobre ' || v_pet_name,
    left(
      case
        when v_location is not null
          then v_message || ' · Ubicación: ' || v_location
        else v_message
      end,
      1200
    ),
    v_sighting_id
  );

  return v_sighting_id;
end;
$$;

revoke all on function rescue_private.activate_lost_pet_alert_internal(uuid,text,timestamptz,text) from public, anon;
revoke all on function rescue_private.get_pet_founder_status_internal(uuid) from public;
revoke all on function rescue_private.get_public_pet_rescue_profile_internal(uuid) from public;
revoke all on function rescue_private.resolve_lost_pet_alert_internal(uuid) from public, anon;
revoke all on function rescue_private.rotate_pet_public_link_internal(uuid) from public, anon;
revoke all on function rescue_private.submit_pet_sighting_internal(uuid,text,text,text,text) from public;

grant execute on function rescue_private.activate_lost_pet_alert_internal(uuid,text,timestamptz,text) to authenticated;
grant execute on function rescue_private.get_pet_founder_status_internal(uuid) to anon, authenticated;
grant execute on function rescue_private.get_public_pet_rescue_profile_internal(uuid) to anon, authenticated;
grant execute on function rescue_private.resolve_lost_pet_alert_internal(uuid) to authenticated;
grant execute on function rescue_private.rotate_pet_public_link_internal(uuid) to authenticated;
grant execute on function rescue_private.submit_pet_sighting_internal(uuid,text,text,text,text) to anon, authenticated;

create or replace function public.activate_lost_pet_alert(
  p_pet_id uuid,
  p_last_seen_location text,
  p_last_seen_at timestamptz,
  p_details text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select rescue_private.activate_lost_pet_alert_internal(
    p_pet_id,
    p_last_seen_location,
    p_last_seen_at,
    p_details
  );
$$;

create or replace function public.get_pet_founder_status(p_pet_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select rescue_private.get_pet_founder_status_internal(p_pet_id);
$$;

create or replace function public.get_public_pet_rescue_profile(p_token uuid)
returns table(
  name text,
  species text,
  breed text,
  photo_url text,
  bio text,
  is_lost boolean,
  last_seen_location text,
  alert_last_seen_at timestamptz,
  alert_details text
)
language sql
security invoker
set search_path = ''
as $$
  select *
  from rescue_private.get_public_pet_rescue_profile_internal(p_token);
$$;

create or replace function public.resolve_lost_pet_alert(p_pet_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select rescue_private.resolve_lost_pet_alert_internal(p_pet_id);
$$;

create or replace function public.rotate_pet_public_link(p_pet_id uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select rescue_private.rotate_pet_public_link_internal(p_pet_id);
$$;

create or replace function public.submit_pet_sighting(
  p_token uuid,
  p_reporter_name text,
  p_reporter_phone text,
  p_message text,
  p_location text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select rescue_private.submit_pet_sighting_internal(
    p_token,
    p_reporter_name,
    p_reporter_phone,
    p_message,
    p_location
  );
$$;

revoke all on function public.activate_lost_pet_alert(uuid,text,timestamptz,text) from public, anon;
revoke all on function public.get_pet_founder_status(uuid) from public;
revoke all on function public.get_public_pet_rescue_profile(uuid) from public;
revoke all on function public.resolve_lost_pet_alert(uuid) from public, anon;
revoke all on function public.rotate_pet_public_link(uuid) from public, anon;
revoke all on function public.submit_pet_sighting(uuid,text,text,text,text) from public;

grant execute on function public.activate_lost_pet_alert(uuid,text,timestamptz,text) to authenticated;
grant execute on function public.get_pet_founder_status(uuid) to anon, authenticated;
grant execute on function public.get_public_pet_rescue_profile(uuid) to anon, authenticated;
grant execute on function public.resolve_lost_pet_alert(uuid) to authenticated;
grant execute on function public.rotate_pet_public_link(uuid) to authenticated;
grant execute on function public.submit_pet_sighting(uuid,text,text,text,text) to anon, authenticated;

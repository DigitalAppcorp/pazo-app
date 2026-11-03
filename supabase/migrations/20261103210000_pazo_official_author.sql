-- Vigilante step 2: the official PAZO author.
-- PAZO is not an account: no email, no password, no auth user. Official posts live in their
-- own table that no client can write; only the Vigilante approval flow (step 4) will insert,
-- as a server function. Comments are impossible by construction (post_comments points at posts).

create table public.official_posts(
 id uuid primary key default gen_random_uuid(),
 title text not null,
 body text not null,
 source_name text not null,
 source_url text not null,
 source_published_at date not null,
 priority text not null default 'medium',
 audience_species text[],      -- null: every species
 audience_postal_codes text[], -- null: every area
 published_at timestamptz not null default now(),
 expires_at timestamptz,
 constraint official_posts_title_length check(char_length(btrim(title)) between 3 and 120),
 constraint official_posts_body_length check(char_length(btrim(body)) between 3 and 1200),
 constraint official_posts_source_url check(source_url ~ '^https://'),
 constraint official_posts_priority_valid check(priority in('high','medium','low')),
 constraint official_posts_species_valid check(audience_species is null or audience_species <@ array['gato','perro','conejo','ave','otro']::text[]),
 constraint official_posts_postal_codes_valid check(audience_postal_codes is null or array_to_string(audience_postal_codes,',') ~ '^[0-9]{5}(,[0-9]{5})*$'),
 constraint official_posts_expiry_after_publish check(expires_at is null or expires_at > published_at)
);
create index official_posts_published_idx on public.official_posts(published_at desc);
alter table public.official_posts enable row level security;

-- Anyone may read what is published, so a shared link opens without an account.
create policy official_posts_public_read on public.official_posts
 for select to anon,authenticated using(published_at <= now());
create policy pazo_maintenance_access on public.official_posts
 as restrictive for all to anon,authenticated
 using((select public.pazo_maintenance_data_allowed())) with check((select public.pazo_maintenance_data_allowed()));
revoke all on public.official_posts from anon,authenticated;
grant select on public.official_posts to anon,authenticated;

create table public.official_post_likes(
 post_id uuid not null references public.official_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(post_id,user_id)
);
alter table public.official_post_likes enable row level security;
create policy pazo_maintenance_access on public.official_post_likes
 as restrictive for all to anon,authenticated
 using((select public.pazo_maintenance_data_allowed())) with check((select public.pazo_maintenance_data_allowed()));
revoke all on public.official_post_likes from anon,authenticated;

-- Official posts that apply to one of the caller's pets: same species and, when the post
-- names areas, the household postal code. Expired posts never show.
create or replace function public.get_official_feed(p_actor_pet_id uuid, p_limit integer default 10)
returns table(id uuid,title text,body text,source_name text,source_url text,source_published_at date,
 priority text,published_at timestamptz,expires_at timestamptz,likes bigint,liked boolean)
language plpgsql stable security definer set search_path='' as $fn$
declare
 v_uid uuid := auth.uid();
 v_species text;
 v_postal text;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 select p.species into v_species from public.pets p where p.id=p_actor_pet_id and p.owner_id=v_uid;
 if v_species is null then raise exception 'Pet not owned by caller' using errcode='42501'; end if;
 select h.postal_code into v_postal from public.household_private_details h where h.user_id=v_uid;
 return query
 select o.id,o.title,o.body,o.source_name,o.source_url,o.source_published_at,o.priority,o.published_at,o.expires_at,
  (select count(*) from public.official_post_likes l where l.post_id=o.id),
  exists(select 1 from public.official_post_likes l where l.post_id=o.id and l.user_id=v_uid)
 from public.official_posts o
 where o.published_at <= now()
  and (o.expires_at is null or o.expires_at > now())
  and (o.audience_species is null or v_species = any(o.audience_species))
  and (o.audience_postal_codes is null or v_postal = any(o.audience_postal_codes))
 order by case o.priority when 'high' then 0 when 'medium' then 1 else 2 end, o.published_at desc
 limit least(greatest(coalesce(p_limit,10),1),20);
end
$fn$;
revoke all on function public.get_official_feed(uuid,integer) from public,anon;
grant execute on function public.get_official_feed(uuid,integer) to authenticated;

create or replace function public.toggle_official_post_like(p_post_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
 v_uid uuid := auth.uid();
 v_liked boolean;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if not exists(select 1 from public.official_posts o where o.id=p_post_id and o.published_at <= now()) then
  raise exception 'Unknown official post' using errcode='P0002';
 end if;
 delete from public.official_post_likes where post_id=p_post_id and user_id=v_uid;
 v_liked := not found;
 if v_liked then insert into public.official_post_likes(post_id,user_id) values(p_post_id,v_uid); end if;
 return jsonb_build_object('liked',v_liked,'likes',(select count(*) from public.official_post_likes where post_id=p_post_id));
end
$fn$;
revoke all on function public.toggle_official_post_like(uuid) from public,anon;
grant execute on function public.toggle_official_post_like(uuid) to authenticated;

-- Founder badge in the feed: which of these pets belong to a founder account.
-- The same fact is already public on each pet profile (get_pet_founder_status).
create or replace function public.pazo_founder_pets_batch(p_pet_ids uuid[])
returns setof uuid language sql stable security definer set search_path='' as $fn$
 select p.id from public.pets p join public.profiles pr on pr.id=p.owner_id
 where p.id = any(p_pet_ids[1:100]) and pr.is_founder is true;
$fn$;
revoke all on function public.pazo_founder_pets_batch(uuid[]) from public;
grant execute on function public.pazo_founder_pets_batch(uuid[]) to anon,authenticated;

-- The administrator account is the founder.
update public.profiles set is_founder = true
where id in(select g.user_id from admin_private.admin_grants g) and is_founder is distinct from true;

-- Names that could pass for PAZO itself are reserved, for pets and usernames.
-- Normalization: lower case, accents removed, look-alike digits and symbols mapped, non-letters dropped.
create or replace function private.pazo_is_reserved_name(p_name text) returns boolean
language sql immutable set search_path='' as $fn$
 with n as (
  select regexp_replace(
   translate(lower(coalesce(p_name,'')),'áàäâéèëêíìïîóòöôúùüû0134@5$','aaaaeeeeiiiioooouuuuoieaass'),
   '[^a-z]','','g') as v
 )
 select v = 'pazo'
  or (v like 'pazo%' and substr(v,5) in('official','oficial','team','equipo','soporte','support','admin','staff','app','oficialpazo'))
  or v in('thepazo','elpazo','teampazo','equipopazo','soportepazo','officialpazo','oficialpazo','adminpazo')
 from n;
$fn$;
revoke all on function private.pazo_is_reserved_name(text) from public;

create or replace function private.pazo_reject_reserved_name() returns trigger
language plpgsql set search_path='' as $fn$
declare v_value text := case when tg_table_name='pets' then new.name else new.username end;
begin
 if tg_op='UPDATE' then
  if (tg_table_name='pets' and new.name is not distinct from old.name)
   or (tg_table_name='profiles' and new.username is not distinct from old.username) then
   return new;
  end if;
 end if;
 if private.pazo_is_reserved_name(v_value) then
  raise exception 'PAZO_RESERVED_NAME' using errcode='23514', hint='This name is reserved for PAZO.';
 end if;
 return new;
end
$fn$;
revoke all on function private.pazo_reject_reserved_name() from public;

create trigger pazo_reserved_pet_name before insert or update of name on public.pets
 for each row execute function private.pazo_reject_reserved_name();
create trigger pazo_reserved_username before insert or update of username on public.profiles
 for each row execute function private.pazo_reject_reserved_name();

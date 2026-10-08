create or replace function private.enforce_social_write_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
begin
  if v_uid is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication required.';
  end if;

  if tg_table_schema = 'public' and tg_table_name = 'posts' then
    select count(*) into v_count
    from public.posts p
    where p.user_id = v_uid
      and p.created_at >= now() - interval '1 hour';

    if v_count >= 30 then
      raise exception using
        errcode = 'P0001',
        message = 'Too many posts. Try again later.';
    end if;

  elsif tg_table_schema = 'public' and tg_table_name = 'post_comments' then
    select count(*) into v_count
    from public.post_comments c
    join public.pets p on p.id = c.author_pet_id
    where p.owner_id = v_uid
      and c.created_at >= now() - interval '1 hour';

    if v_count >= 60 then
      raise exception using
        errcode = 'P0001',
        message = 'Too many comments. Try again later.';
    end if;

  elsif tg_table_schema = 'public' and tg_table_name = 'communities' then
    select count(*) into v_count
    from public.communities c
    where c.owner_user_id = v_uid
      and c.created_at >= now() - interval '24 hours';

    if v_count >= 3 then
      raise exception using
        errcode = 'P0001',
        message = 'Too many communities created. Try again later.';
    end if;

  elsif tg_table_schema = 'public' and tg_table_name = 'community_posts' then
    select count(*) into v_count
    from public.community_posts p
    where p.author_user_id = v_uid
      and p.created_at >= now() - interval '1 hour';

    if v_count >= 30 then
      raise exception using
        errcode = 'P0001',
        message = 'Too many community posts. Try again later.';
    end if;

  elsif tg_table_schema = 'public' and tg_table_name = 'community_post_comments' then
    select count(*) into v_count
    from public.community_post_comments c
    join public.pets p on p.id = c.author_pet_id
    where p.owner_id = v_uid
      and c.created_at >= now() - interval '1 hour';

    if v_count >= 60 then
      raise exception using
        errcode = 'P0001',
        message = 'Too many community comments. Try again later.';
    end if;

  elsif tg_table_schema = 'public' and tg_table_name = 'place_suggestions' then
    select count(*) into v_count
    from public.place_suggestions s
    where s.submitter_user_id = v_uid
      and s.created_at >= now() - interval '24 hours';

    if v_count >= 10 then
      raise exception using
        errcode = 'P0001',
        message = 'Too many place suggestions. Try again later.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_social_write_rate_limit() from public;
revoke all on function private.enforce_social_write_rate_limit() from anon;
revoke all on function private.enforce_social_write_rate_limit() from authenticated;

drop trigger if exists trg_rate_limit_posts on public.posts;
create trigger trg_rate_limit_posts
before insert on public.posts
for each row execute function private.enforce_social_write_rate_limit();

drop trigger if exists trg_rate_limit_post_comments on public.post_comments;
create trigger trg_rate_limit_post_comments
before insert on public.post_comments
for each row execute function private.enforce_social_write_rate_limit();

drop trigger if exists trg_rate_limit_communities on public.communities;
create trigger trg_rate_limit_communities
before insert on public.communities
for each row execute function private.enforce_social_write_rate_limit();

drop trigger if exists trg_rate_limit_community_posts on public.community_posts;
create trigger trg_rate_limit_community_posts
before insert on public.community_posts
for each row execute function private.enforce_social_write_rate_limit();

drop trigger if exists trg_rate_limit_community_post_comments on public.community_post_comments;
create trigger trg_rate_limit_community_post_comments
before insert on public.community_post_comments
for each row execute function private.enforce_social_write_rate_limit();

drop trigger if exists trg_rate_limit_place_suggestions on public.place_suggestions;
create trigger trg_rate_limit_place_suggestions
before insert on public.place_suggestions
for each row execute function private.enforce_social_write_rate_limit();

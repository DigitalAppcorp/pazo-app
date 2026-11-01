-- Mirror of production migration. Preserve existing overview RPC signature,
-- security clauses and support-only sandbox diagnostics; exclude QA from
-- product/audience counts without exposing account identifiers.
do $patch$
declare fn text; previous text;
begin
  select pg_get_functiondef('public.pazo_admin_overview(integer)'::regprocedure) into fn;
  if fn is null then raise exception 'pazo_admin_overview not found'; end if;
  previous := fn;
  fn := replace(fn,
    '(select count(*) from auth.users)',
    '(select count(*) from auth.users u where marketing_private.is_reporting_owner(u.id))');
  fn := replace(fn,
    '(select count(*) from auth.users where created_at>=now()-interval ''7 days'')',
    '(select count(*) from auth.users u where u.created_at>=now()-interval ''7 days'' and marketing_private.is_reporting_owner(u.id))');
  fn := replace(fn,
    '(select count(*) from auth.users where created_at>=now()-interval ''30 days'')',
    '(select count(*) from auth.users u where u.created_at>=now()-interval ''30 days'' and marketing_private.is_reporting_owner(u.id))');
  fn := replace(fn,
    '(select count(distinct owner_id) from public.pets)',
    '(select count(distinct p.owner_id) from public.pets p where marketing_private.is_reporting_owner(p.owner_id))');
  fn := replace(fn,
    '(select count(*) from auth.users u where not exists',
    '(select count(*) from auth.users u where marketing_private.is_reporting_owner(u.id) and not exists');
  fn := replace(fn,
    '(select count(*) from public.pets)',
    '(select count(*) from public.pets p where marketing_private.is_reporting_owner(p.owner_id))');
  fn := replace(fn,
    '(select count(*) from public.posts)',
    '(select count(*) from public.posts p where marketing_private.is_reporting_owner(p.user_id))');
  fn := replace(fn,
    '(select count(*) from public.post_comments)',
    '(select count(*) from public.post_comments c join public.pets p on p.id=c.author_pet_id where marketing_private.is_reporting_owner(p.owner_id))');
  fn := replace(fn,
    '(select count(*) from public.communities)',
    '(select count(*) from public.communities c where marketing_private.is_reporting_owner(c.owner_user_id))');
  if fn=previous
     or fn not like '%marketing_private.is_reporting_owner(u.id)%'
     or fn not like '%marketing_private.is_reporting_owner(p.owner_id)%'
     or fn not like '%marketing_private.is_reporting_owner(c.owner_user_id)%'
  then raise exception 'Unexpected overview function shape. No changes applied.'; end if;
  execute fn;
end
$patch$;

-- Issue130: production QA classification without changing financial QA lists.
-- Only trusted app_metadata is authoritative; user_metadata is user-editable.
-- No Auth settings, identities, financial functions, grants or data are mutated.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE OR REPLACE FUNCTION marketing_private.is_eligible_owner(p_owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT EXISTS (
  SELECT 1 FROM auth.users u JOIN public.profiles p ON p.id=u.id
  WHERE u.id=p_owner AND u.email_confirmed_at IS NOT NULL
   AND u.is_anonymous IS DISTINCT FROM TRUE
   AND p.is_founder IS DISTINCT FROM TRUE
   AND coalesce(u.raw_app_meta_data->>'pazo_marketing_qa','false') <> 'true'
 )
 AND NOT EXISTS(SELECT 1 FROM supporter_private.gradual_qa_accounts q WHERE q.owner_id=p_owner)
 AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_owners q WHERE q.owner_id=p_owner)
 AND NOT EXISTS(SELECT 1 FROM admin_private.admin_grants a WHERE a.user_id=p_owner);
$$;
REVOKE ALL ON FUNCTION marketing_private.is_eligible_owner(uuid)
 FROM PUBLIC,anon,authenticated,service_role;
COMMIT;

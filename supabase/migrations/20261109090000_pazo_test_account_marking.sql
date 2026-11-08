BEGIN;
SET LOCAL lock_timeout='5s';

-- PO order 8-nov-2026: test accounts must never count as real users.
-- An account created with a reserved address is classified before any other
-- trigger reads it, so admin pushes, reminders and measurements skip it.
-- Reserved: aliases of PAZO's own mailbox and the domains reserved for testing.
CREATE FUNCTION marketing_private.reserved_test_address(p_email text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
  SELECT coalesce(
    lower(btrim(p_email)) ~ '^appdigital\.?corp\+[^@]+@gmail\.com$'
    OR split_part(lower(btrim(p_email)),'@',2) IN ('example.com','example.net','example.org')
    OR split_part(lower(btrim(p_email)),'@',2) ~ '\.(test|invalid|example|localhost)$',
    false);
$$;

CREATE FUNCTION marketing_private.mark_reserved_test_signup() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  BEGIN
    IF marketing_private.reserved_test_address(NEW.email) THEN
      NEW.raw_app_meta_data := coalesce(NEW.raw_app_meta_data,'{}'::jsonb)
        || jsonb_build_object('pazo_marketing_qa',true,'pazo_qa_reason','reserved_address');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Classification is optional; it must never block a sign-up.
    NULL;
  END;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION marketing_private.reserved_test_address(text),marketing_private.mark_reserved_test_signup()
  FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER pazo_mark_reserved_test_signup BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION marketing_private.mark_reserved_test_signup();

-- Existing accounts with a reserved address (none expected on 8-nov-2026).
UPDATE auth.users
   SET raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb)
     || jsonb_build_object('pazo_marketing_qa',true,'pazo_qa_reason','reserved_address')
 WHERE marketing_private.reserved_test_address(email)
   AND coalesce(raw_app_meta_data->>'pazo_marketing_qa','false') <> 'true';

-- Administrators mark or unmark any other account from Users.
CREATE FUNCTION admin_private.set_test_account(p_user_id uuid,p_test boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.pazo_is_admin() THEN
    RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501';
  END IF;
  IF p_user_id IS NULL OR p_test IS NULL THEN
    RAISE EXCEPTION 'Invalid account' USING ERRCODE='22023';
  END IF;
  UPDATE auth.users SET raw_app_meta_data = CASE WHEN p_test
      THEN coalesce(raw_app_meta_data,'{}'::jsonb) || jsonb_build_object('pazo_marketing_qa',true,'pazo_qa_reason','admin_panel')
      ELSE coalesce(raw_app_meta_data,'{}'::jsonb) - 'pazo_marketing_qa' - 'pazo_qa_reason' END
   WHERE id=p_user_id AND NOT is_anonymous;
  RETURN FOUND;
END $$;
CREATE FUNCTION public.pazo_admin_set_test_account(p_user_id uuid,p_test boolean) RETURNS boolean
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT admin_private.set_test_account(p_user_id,p_test); $$;
REVOKE ALL ON FUNCTION admin_private.set_test_account(uuid,boolean),public.pazo_admin_set_test_account(uuid,boolean)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION admin_private.set_test_account(uuid,boolean),public.pazo_admin_set_test_account(uuid,boolean) TO authenticated;

-- Users list: add only the flag the toggle controls.
DO $$
DECLARE d text := pg_get_functiondef('public.pazo_admin_users(integer,integer)'::regprocedure);
  marker text := 'select u.id::text as user_id,u.email,u.created_at,';
BEGIN
  IF length(d) - length(replace(d, marker, '')) <> length(marker) THEN
    RAISE EXCEPTION 'Unexpected administrator users projection';
  END IF;
  EXECUTE replace(d, marker, marker || $m$
   coalesce(u.raw_app_meta_data->>'pazo_marketing_qa','false')='true' as test_account,$m$);
END $$;

COMMIT;

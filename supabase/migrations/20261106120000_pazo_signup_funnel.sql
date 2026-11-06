-- Re-engagement: account status and an anonymous login failure category.
-- Apply this migration independently after the experience details migration.
BEGIN;
SET LOCAL lock_timeout='5s';

-- 1) One more closed reason for the existing daily sign-up counters: someone tried to sign in
--    before confirming their email. Same function and check; only the new value is added.
CREATE OR REPLACE FUNCTION marketing_private.experience_detail_valid(p_kind text, p_value text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 SELECT CASE p_kind
  WHEN 'signup_failure' THEN p_value=ANY(ARRAY['missing_fields','age_required','password_mismatch','weak_password','email_taken','invalid_email','rate_limited','network','google_age','google_cancelled','google_failed','unconfirmed_login','other'])
  WHEN 'demo_last_screen' THEN p_value=ANY(ARRAY['home','pet','communities','places','explore'])
  WHEN 'arrival_source' THEN p_value=ANY(ARRAY['search','social','direct','installed','other'])
  ELSE false END
$function$;

-- 2) How each real account signed up and how far it got, for administrators only.
--    Reads fields Auth already keeps (method, confirmation sent, confirmed, last sign-in);
--    collects nothing new. Test and administrator accounts are left out, as in every report.
CREATE FUNCTION admin_private.signup_summary_v1(p_user_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '5s'
AS $function$
DECLARE v_result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.pazo_is_admin() THEN
  RAISE EXCEPTION 'Administrator required' USING ERRCODE = '42501';
 END IF;
 IF p_user_ids IS NULL OR cardinality(p_user_ids) > 30 THEN
  RAISE EXCEPTION 'Invalid account page' USING ERRCODE = '22023';
 END IF;
 WITH accounts AS (
  SELECT u.id,
   CASE u.raw_app_meta_data->>'provider' WHEN 'google' THEN 'google' WHEN 'email' THEN 'email' ELSE 'other' END AS method,
   u.confirmation_sent_at IS NOT NULL AS confirmation_sent,
   u.email_confirmed_at IS NOT NULL AS confirmed,
   u.last_sign_in_at IS NOT NULL AS signed_in,
   EXISTS (SELECT 1 FROM public.pets p WHERE p.owner_id = u.id) AS with_pet
  FROM auth.users u
  WHERE marketing_private.is_reporting_owner(u.id)
 ), today AS (
  SELECT (statement_timestamp() AT TIME ZONE 'America/Los_Angeles')::date AS day
 ), attempts AS (
  SELECT d.day, sum(d.requests)::integer AS requests
  FROM marketing_private.experience_detail_daily d CROSS JOIN today
  WHERE marketing_private.experience_details_ready()
    AND d.kind = 'signup_failure' AND d.value = 'unconfirmed_login'
    AND d.day BETWEEN today.day - 6 AND today.day
  GROUP BY d.day HAVING sum(d.requests) >= 10
 )
 SELECT jsonb_build_object(
  'methods', (SELECT coalesce(jsonb_agg(jsonb_build_object(
     'method', m.method,
     'registered', m.registered,
     'email_sent', m.email_sent,
     'confirmed', m.confirmed,
     'signed_in', m.signed_in,
     'with_pet', m.with_pet
    ) ORDER BY m.method), '[]'::jsonb)
   FROM (
    SELECT m.method, count(a.id) AS registered,
     count(*) FILTER (WHERE a.confirmation_sent) AS email_sent,
     count(*) FILTER (WHERE a.confirmed) AS confirmed,
     count(*) FILTER (WHERE a.signed_in) AS signed_in,
     count(*) FILTER (WHERE a.with_pet) AS with_pet
    FROM (VALUES ('email'), ('google'), ('other')) AS m(method)
    LEFT JOIN accounts a USING (method)
    GROUP BY m.method
   ) m),
  'accounts', (SELECT coalesce(jsonb_object_agg(a.id, jsonb_build_object(
     'method', a.method, 'email_sent', a.confirmation_sent,
     'confirmed', a.confirmed, 'signed_in', a.signed_in
    )), '{}'::jsonb)
   FROM accounts a WHERE a.id = ANY(p_user_ids)),
  'attempts_active', marketing_private.experience_details_ready(),
  'attempts', (SELECT jsonb_agg(jsonb_build_object('day', today.day - n, 'requests', attempts.requests) ORDER BY n DESC)
    FROM today CROSS JOIN generate_series(0, 6) AS days(n)
    LEFT JOIN attempts ON attempts.day = today.day - n)
 ) INTO v_result;
 RETURN v_result;
END
$function$;

-- The exposed RPC runs as the caller. The private reader owns the authorization check.
CREATE FUNCTION public.pazo_admin_signup_summary_v1(p_user_ids uuid[])
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO ''
RETURN admin_private.signup_summary_v1(p_user_ids);

REVOKE ALL ON FUNCTION admin_private.signup_summary_v1(uuid[]), public.pazo_admin_signup_summary_v1(uuid[])
 FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_private.signup_summary_v1(uuid[]), public.pazo_admin_signup_summary_v1(uuid[])
 TO authenticated;
COMMIT;

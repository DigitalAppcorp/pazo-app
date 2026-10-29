-- Administrator-authorized, aggregate analytics reads need a signed-in admin,
-- not a TOTP challenge. Preserve the released report bodies and all other MFA.
-- PREPARED ONLY: production installation requires the final launch approval.
BEGIN;
DO $migration$
DECLARE definition text; guard text;
BEGIN
 SELECT pg_get_functiondef('public.pazo_admin_behavior_summary_v1(integer,text,text)'::regprocedure) INTO definition;
 guard:='IF coalesce(auth.jwt()->>''aal'','''')<>''aal2'' THEN RAISE EXCEPTION ''mfa_required'' USING ERRCODE=''42501'';END IF;';
 IF length(definition)-length(replace(definition,guard,''))<>length(guard)
 OR position('IF NOT public.pazo_is_admin() THEN' IN definition)=0 THEN
  RAISE EXCEPTION 'Unexpected behavior report authorization; stop for review';
 END IF;
 EXECUTE replace(definition,guard,'-- Aggregate read: signed-in administrator authorization is retained.');

 SELECT pg_get_functiondef('public.pazo_admin_intelligence_summary_v1(integer,text,text)'::regprocedure) INTO definition;
 guard:='IF NOT public.pazo_is_admin() OR coalesce(auth.jwt()->>''aal'','''')<>''aal2'' THEN RAISE EXCEPTION ''admin MFA required'' USING ERRCODE=''42501'';END IF;';
 IF length(definition)-length(replace(definition,guard,''))<>length(guard) THEN
  RAISE EXCEPTION 'Unexpected intelligence report authorization; stop for review';
 END IF;
 EXECUTE replace(definition,guard,'IF NOT public.pazo_is_admin() THEN RAISE EXCEPTION ''admin required'' USING ERRCODE=''42501'';END IF;');
END
$migration$;
-- Existing EXECUTE grants, ownership, SECURITY DEFINER, search_path, timeout,
-- closed filters, suppression, QA exclusion and retention remain unchanged.
COMMIT;

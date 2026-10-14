-- PAZO F16 DRAFT ONLY: not a versioned migration; DO NOT APPLY HOSTED.
-- Future service_role-only read of four fields of an already verified event.
BEGIN;
CREATE FUNCTION public.f16_paypal_read_verified_inbox(p_provider_event_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE v supporter_private.paypal_verified_event_inbox%ROWTYPE;
BEGIN
 IF p_provider_event_id IS NULL
    OR p_provider_event_id !~ '^[A-Za-z0-9._-]{1,128}$'
 THEN RAISE EXCEPTION 'Invalid event reference' USING ERRCODE='22023'; END IF;
 SELECT * INTO v FROM supporter_private.paypal_verified_event_inbox
 WHERE provider_event_id=p_provider_event_id;
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN pg_catalog.jsonb_build_object(
  'provider_event_id',v.provider_event_id,'event_type',v.event_type,
  'processing_state',v.processing_state,'retention_hold',v.retention_hold);
END;
$body$;
ALTER FUNCTION public.f16_paypal_read_verified_inbox(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f16_paypal_read_verified_inbox(text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_paypal_read_verified_inbox(text) TO service_role;
COMMIT;

-- PAZO admin payment configuration. Preparation only: checkout providers remain
-- unchanged and LIVE charging is deliberately impossible through this module.
-- Secrets live ONLY in encrypted Supabase Vault; no frontend secret read path.
BEGIN;
CREATE TABLE IF NOT EXISTS admin_private.paypal_gateway_settings(
 environment text PRIMARY KEY CHECK(environment IN ('sandbox','live')),
 plan_id text NOT NULL DEFAULT '',
 price_minor integer NOT NULL DEFAULT 299 CHECK(price_minor BETWEEN 99 AND 100000),
 currency text NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
 interval_unit text NOT NULL DEFAULT 'MONTH' CHECK(interval_unit='MONTH'),
 product_name text NOT NULL DEFAULT 'Amigo de PAZO',
 return_origin text NOT NULL DEFAULT '',
 webhook_id text NOT NULL DEFAULT '',
 client_id_vault uuid,
 client_secret_vault uuid,
 validation_status text NOT NULL DEFAULT 'not_configured'
   CHECK(validation_status IN ('not_configured','not_verified','valid','invalid')),
 validated_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid
);
REVOKE ALL ON admin_private.paypal_gateway_settings FROM PUBLIC,anon,authenticated;
ALTER TABLE admin_private.paypal_gateway_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO admin_private.paypal_gateway_settings(environment,plan_id)
 VALUES('sandbox','P-14V25407JP6850922NLHMDKI'),('live','')
 ON CONFLICT(environment) DO NOTHING;

CREATE TABLE IF NOT EXISTS admin_private.paypal_gateway_change_log(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 environment text NOT NULL CHECK(environment IN ('sandbox','live')),
 actor_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('draft','credentials','validation')),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 -- Safe metadata only: no secrets, plaintext credentials or provider tokens.
 details jsonb NOT NULL DEFAULT '{}'::jsonb
);
REVOKE ALL ON admin_private.paypal_gateway_change_log FROM PUBLIC,anon,authenticated;
ALTER TABLE admin_private.paypal_gateway_change_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS admin_private.paypal_gateway_runtime(
 singleton bool PRIMARY KEY DEFAULT true CHECK(singleton),
 active_environment text NOT NULL DEFAULT 'sandbox' CHECK(active_environment='sandbox'),
 live_checkout_enabled bool NOT NULL DEFAULT false CHECK(live_checkout_enabled=false)
);
REVOKE ALL ON admin_private.paypal_gateway_runtime FROM PUBLIC,anon,authenticated;
ALTER TABLE admin_private.paypal_gateway_runtime ENABLE ROW LEVEL SECURITY;
INSERT INTO admin_private.paypal_gateway_runtime(singleton) VALUES(true) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.pazo_admin_paypal_settings()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path=''
AS $f$
DECLARE v jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(
 SELECT 1 FROM admin_private.admin_grants WHERE user_id=auth.uid())
 THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object(
 'active_environment','sandbox','live_checkout_enabled',false,
 'checkout_source','legacy_sandbox_checkout',
 'environments',COALESCE(jsonb_agg(jsonb_build_object(
  'environment',c.environment,'plan_id',c.plan_id,
  'price_minor',c.price_minor,'currency',c.currency,
  'interval_unit',c.interval_unit,'product_name',c.product_name,
  'return_origin',c.return_origin,'webhook_id',c.webhook_id,
  'client_id_stored',c.client_id_vault IS NOT NULL,
  'client_secret_stored',c.client_secret_vault IS NOT NULL,
  'validation_status',c.validation_status,'validated_at',c.validated_at,
  'updated_at',c.updated_at
 ) ORDER BY c.environment),'[]'::jsonb)
 ) INTO v FROM admin_private.paypal_gateway_settings c;
 RETURN v;
END $f$;

CREATE OR REPLACE FUNCTION public.pazo_admin_paypal_save_draft(
 p_environment text,p_plan_id text,p_price_minor integer,
 p_return_origin text,p_webhook_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $f$
DECLARE actor uuid:=auth.uid(); host text;
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM admin_private.admin_grants WHERE user_id=actor)
 THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 IF p_environment NOT IN ('sandbox','live')
  OR p_plan_id IS NULL OR length(p_plan_id)>80
  OR (p_plan_id<>'' AND p_plan_id !~ '^P-[A-Za-z0-9]{10,75}$')
  OR p_price_minor IS NULL OR p_price_minor<99 OR p_price_minor>100000
  OR p_webhook_id IS NULL OR length(p_webhook_id)>100
  OR (p_webhook_id<>'' AND p_webhook_id !~ '^[A-Za-z0-9_-]{8,100}$')
  OR p_return_origin IS NULL OR length(p_return_origin)>250
 THEN RAISE EXCEPTION 'invalid settings' USING ERRCODE='22023'; END IF;
 -- Only an HTTPS origin, not a redirect path, credentials or query.
 IF p_return_origin<>'' AND (
   p_return_origin !~ '^https://[a-z0-9][a-z0-9.-]{1,240}(:443)?$'
   OR p_return_origin LIKE '%..%' OR p_return_origin LIKE '%.local%'
   OR p_return_origin LIKE '%.localhost%' OR p_return_origin LIKE '%http%http%'
 ) THEN RAISE EXCEPTION 'invalid public origin' USING ERRCODE='22023'; END IF;
 UPDATE admin_private.paypal_gateway_settings SET
  plan_id=p_plan_id,price_minor=p_price_minor,return_origin=p_return_origin,
  webhook_id=p_webhook_id,validation_status='not_verified',
  validated_at=NULL,updated_at=now(),updated_by=actor
 WHERE environment=p_environment;
 IF NOT FOUND THEN RAISE EXCEPTION 'unknown environment' USING ERRCODE='22023'; END IF;
 INSERT INTO admin_private.paypal_gateway_change_log(environment,actor_id,kind,details)
 VALUES(p_environment,actor,'draft',jsonb_build_object('plan_updated',true,
 'price_minor',p_price_minor,'origin_configured',p_return_origin<>'',
 'webhook_configured',p_webhook_id<>''));
 RETURN true;
END $f$;

CREATE OR REPLACE FUNCTION public.pazo_admin_paypal_save_credentials(
 p_environment text,p_client_id text,p_client_secret text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $f$
DECLARE actor uuid:=auth.uid(); old_id uuid; old_secret uuid; new_id uuid; new_secret uuid;
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM admin_private.admin_grants WHERE user_id=actor)
 THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 IF p_environment NOT IN ('sandbox','live')
 OR p_client_id IS NULL OR p_client_id !~ '^[A-Za-z0-9_-]{20,256}$'
 OR p_client_secret IS NULL OR p_client_secret !~ '^[A-Za-z0-9_-]{20,512}$'
 THEN RAISE EXCEPTION 'invalid credentials' USING ERRCODE='22023'; END IF;
 SELECT client_id_vault,client_secret_vault INTO old_id,old_secret
  FROM admin_private.paypal_gateway_settings WHERE environment=p_environment FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'unknown environment' USING ERRCODE='22023'; END IF;
 -- Names intentionally NULL to avoid exposing recognizable secret labels.
 IF old_id IS NULL THEN
  new_id:=vault.create_secret(p_client_id,NULL,'PAZO gateway credential');
 ELSE
  PERFORM vault.update_secret(old_id,p_client_id);new_id:=old_id;
 END IF;
 IF old_secret IS NULL THEN
  new_secret:=vault.create_secret(p_client_secret,NULL,'PAZO gateway credential');
 ELSE
  PERFORM vault.update_secret(old_secret,p_client_secret);new_secret:=old_secret;
 END IF;
 UPDATE admin_private.paypal_gateway_settings SET
 client_id_vault=new_id,client_secret_vault=new_secret,
 validation_status='not_verified',validated_at=NULL,
 updated_at=now(),updated_by=actor WHERE environment=p_environment;
 INSERT INTO admin_private.paypal_gateway_change_log(environment,actor_id,kind)
 VALUES(p_environment,actor,'credentials');
 RETURN true;
END $f$;

-- Service role is the ONLY caller allowed to read encrypted values, from
-- Edge in response to a JWT-verified admin request. Not from the browser.
CREATE OR REPLACE FUNCTION public.pazo_admin_paypal_service_credentials(
 p_environment text,p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path=''
AS $f$
DECLARE out jsonb;
BEGIN
 IF p_environment NOT IN ('sandbox','live')
  OR p_actor IS NULL OR NOT EXISTS(SELECT 1 FROM admin_private.admin_grants WHERE user_id=p_actor)
 THEN RETURN NULL; END IF;
 SELECT CASE WHEN c.client_id_vault IS NOT NULL AND c.client_secret_vault IS NOT NULL
 THEN jsonb_build_object(
 'client_id',i.decrypted_secret,'client_secret',s.decrypted_secret,
 'plan_id',c.plan_id,'return_origin',c.return_origin,'webhook_id',c.webhook_id
 ) ELSE NULL END INTO out
 FROM admin_private.paypal_gateway_settings c
 LEFT JOIN vault.decrypted_secrets i ON i.id=c.client_id_vault
 LEFT JOIN vault.decrypted_secrets s ON s.id=c.client_secret_vault
 WHERE c.environment=p_environment;
 RETURN out;
END $f$;

CREATE OR REPLACE FUNCTION public.pazo_admin_paypal_service_mark_validation(
 p_environment text,p_actor uuid,p_success boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $f$
BEGIN
 IF p_environment NOT IN ('sandbox','live') OR p_actor IS NULL
 OR p_success IS NULL OR NOT EXISTS(
  SELECT 1 FROM admin_private.admin_grants WHERE user_id=p_actor
 ) THEN RETURN false; END IF;
 UPDATE admin_private.paypal_gateway_settings SET
 validation_status=CASE WHEN p_success THEN 'valid' ELSE 'invalid' END,
 validated_at=now(),updated_by=p_actor
 WHERE environment=p_environment;
 IF NOT FOUND THEN RETURN false; END IF;
 INSERT INTO admin_private.paypal_gateway_change_log(environment,actor_id,kind,details)
 VALUES(p_environment,p_actor,'validation',jsonb_build_object('ok',p_success));
 RETURN true;
END $f$;

-- Read-only, redacted administrative audit. Never includes Vault contents.
CREATE OR REPLACE FUNCTION public.pazo_admin_paypal_audit()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(
  SELECT 1 FROM admin_private.admin_grants WHERE user_id=auth.uid()
 ) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 SELECT COALESCE(jsonb_agg(row_data ORDER BY recorded_at DESC),'[]'::jsonb)
 INTO result FROM (
  SELECT recorded_at,jsonb_build_object(
    'environment',environment,'kind',kind,'recorded_at',recorded_at,
    'actor',left(actor_id::text,8),'details',details
  ) row_data FROM admin_private.paypal_gateway_change_log
  ORDER BY recorded_at DESC LIMIT 30
 ) x;
 RETURN result;
END $f$;

REVOKE ALL ON FUNCTION public.pazo_admin_paypal_settings() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_admin_paypal_save_draft(text,text,integer,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_admin_paypal_save_credentials(text,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_admin_paypal_audit() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_admin_paypal_service_credentials(text,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_admin_paypal_service_mark_validation(text,uuid,boolean) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_admin_paypal_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_admin_paypal_save_draft(text,text,integer,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_admin_paypal_save_credentials(text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_admin_paypal_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_admin_paypal_service_credentials(text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_admin_paypal_service_mark_validation(text,uuid,boolean) TO service_role;
COMMIT;

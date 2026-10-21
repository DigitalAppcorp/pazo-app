-- Register content only; no publication, financial release or legal attestation.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $guard$ BEGIN
 IF to_regclass('supporter_private.pazo_live_offer_versions') IS NOT NULL OR
  NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch WHERE singleton
   AND environment='sandbox' AND NOT live_enabled AND kill_switch AND active_generation IS NULL) OR
  EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents)
 THEN RAISE EXCEPTION 'immutable offer prerequisite drift'; END IF;
END $guard$;
CREATE TABLE supporter_private.pazo_live_offer_versions(
 terms_version text NOT NULL CHECK(terms_version ~ '^pazo-supporter-live[.][a-z0-9.-]{3,40}$'),
 locale text NOT NULL CHECK(locale IN('es','en')),
 title text NOT NULL CHECK(length(title) BETWEEN 8 AND 200),
 consent_label text NOT NULL CHECK(length(consent_label) BETWEEN 20 AND 500),
 exact_copy text NOT NULL CHECK(length(exact_copy) BETWEEN 500 AND 12000),
 terms_digest text NOT NULL CHECK(terms_digest ~ '^[a-f0-9]{64}$'),
 price_minor integer NOT NULL CHECK(price_minor=299),currency text NOT NULL CHECK(currency='USD'),
 cadence text NOT NULL CHECK(cadence='MONTH_1'),
 registered_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 PRIMARY KEY(terms_version,locale),UNIQUE(terms_version,locale,terms_digest),
 CONSTRAINT pazo_live_offer_exact_digest CHECK(terms_digest=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  terms_version||E'\n'||locale||E'\n'||title||E'\n'||consent_label||E'\n'||exact_copy,'UTF8')),'hex'))
);
ALTER TABLE supporter_private.pazo_live_offer_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.pazo_live_offer_versions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.pazo_live_offer_versions FROM PUBLIC,anon,authenticated,service_role;
-- PAZO_LIVE_OFFERS_SEED_BEGIN
INSERT INTO supporter_private.pazo_live_offer_versions(terms_version,locale,title,consent_label,exact_copy,terms_digest,price_minor,currency,cadence) VALUES
('pazo-supporter-live.beta20261021-v1','es','Amigo de PAZO — US$2.99 al mes','Acepto la suscripción de US$2.99 USD al mes, con renovación automática hasta que la cancele, y las condiciones mostradas.',pg_catalog.replace('Amigo de PAZO es una suscripción de apoyo voluntario de US$2.99 USD por mensualidad, con renovación automática mensual administrada por PayPal hasta que la canceles. El primer cobro se solicita al aprobar la suscripción en PayPal. No hay prueba gratuita, cuota inicial ni plan anual. PAZO y sus funciones gratuitas siguen disponibles sin suscribirte. PAZO es operado por Alvarado Solutions LLC, California, Estados Unidos. Contacto: appdigital.corp@gmail.com.

Incluye cuatro beneficios: insignia Amigo de PAZO en el perfil de la mascota y junto al autor de sus publicaciones; cinco fondos cosméticos (Clásico PAZO, Naturaleza, Corazones, Cielo estrellado y Aventura); participación opcional de cada mascota en el muro Gracias, Amigos de PAZO, con permiso separado y revocable; y medallas después de completar 3, 6 y 12 períodos mensuales pagados, verificados y no revertidos. La insignia inicial requiere el primer pago verificado. No se ofrece prioridad en rescates ni mayor alcance de publicaciones.

Aprobar en PayPal o regresar a PAZO no activa beneficios. PAZO debe verificar que el cobro regular haya terminado y corresponda a tu cuenta, contrato y período de servicio. El primer período contractual comienza en la activación PayPal verificada y termina justo antes de la próxima fecha de facturación observada por PAZO al activarse la suscripción. Esa fecha es el límite contractual acordado, no una prueba de pago por sí sola. No se añade automáticamente un mes desde el momento del cobro. Si la confirmación llega tarde o falta evidencia suficiente, el ciclo queda en revisión.

Cada renovación requiere un nuevo cobro regular completado y un intervalo observado verificable. Los pagos pendientes o fallidos no extienden beneficios. Un reembolso completo o reverso afecta únicamente al período correspondiente; un reembolso parcial o una situación ambigua requiere revisión. Las disputas se concilian con la venta original. No se crean meses adicionales por recuperar deudas ni por regresar del checkout.

Puedes detener los próximos cobros en PAZO, Mi cuenta → Amigo de PAZO → Administrar mi suscripción → Cancelar renovación. La cancelación se confirma cuando PayPal la verifica. También puedes administrar el pago automático desde tu cuenta PayPal. Un período ya pagado, verificado y no revertido conserva sus beneficios hasta su vencimiento. Cancelar no implica un reembolso automático. El permiso del muro se puede retirar por separado en cualquier momento.

La casilla de aceptación comienza desmarcada. PAZO conserva la versión, el texto, el idioma y la fecha de tu aceptación, y permite descargar la constancia desde Administrar mi suscripción. Solo se guarda la evidencia mínima necesaria para el contrato, la conciliación, las reclamaciones y las obligaciones aplicables; los registros financieros no se borran automáticamente al solicitar la baja de la cuenta. Consulta Privacidad en PAZO y escribe a appdigital.corp@gmail.com para asistencia, cancelación o solicitudes sobre tus datos.',E'\r',''),'b3b6614d95ea6bb600fe9479ac4be115d39769f1e38a4fc30b7cb4273573dbb1',299,'USD','MONTH_1'),
('pazo-supporter-live.beta20261021-v1','en','Friend of PAZO — US$2.99 per month','I accept the US$2.99 USD per month subscription, automatically renewing until I cancel, and the terms shown.',pg_catalog.replace('Friend of PAZO is an optional support subscription costing US$2.99 USD per monthly payment, automatically renewed monthly through PayPal until you cancel. The first payment is requested when you approve the subscription in PayPal. There is no free trial, setup fee or annual plan. PAZO and its free features remain available without subscribing. PAZO is operated by Alvarado Solutions LLC, California, United States. Contact: appdigital.corp@gmail.com.

It includes four benefits: the Friend of PAZO badge on the pet profile and beside its post author; five cosmetic backgrounds (Classic PAZO, Nature, Hearts, Starry Sky and Adventure); optional inclusion of each pet in the Thank You, PAZO Friends wall with separate, revocable permission; and medals after 3, 6 and 12 fully elapsed, verified paid monthly periods that have not been reversed. The initial badge requires the first verified payment. Rescue priority and increased post reach are not offered.

PayPal approval or returning to PAZO does not activate benefits. PAZO must verify that the regular payment is complete and belongs to your account, contract and service period. The first contractual period starts at the verified PayPal activation time and ends immediately before the next billing date observed by PAZO at activation. That date is the agreed contractual boundary, not proof of payment on its own. PAZO does not automatically add a month from the payment time. A late confirmation or insufficient evidence leaves that cycle under review.

Each renewal requires a new completed regular payment and a verifiable observed interval. Pending or failed payments do not extend benefits. A full refund or reversal affects only its corresponding period; a partial refund or ambiguous situation requires review. Disputes are reconciled against the original sale. Recovering an outstanding balance or returning from checkout does not create additional months.

You can stop future charges in PAZO, My account → Friend of PAZO → Manage my subscription → Cancel renewal. Cancellation is confirmed when PayPal verifies it. You can also manage the automatic payment in your PayPal account. An already paid, verified period that has not been reversed keeps its benefits until expiry. Cancellation does not automatically issue a refund. Wall permission can be withdrawn separately at any time.

The acceptance checkbox starts unchecked. PAZO retains the version, text, language and time of your acceptance, and lets you download the acknowledgement from Manage my subscription. Only the minimum evidence needed for the contract, reconciliation, claims and applicable obligations is retained; financial records are not automatically erased when account deletion is requested. See Privacy in PAZO and contact appdigital.corp@gmail.com for assistance, cancellation or requests about your data.',E'\r',''),'eb7f13dc7bb212a83223af0f260d77c5ac66ee993d5e090a3d7e6e7e886484b9',299,'USD','MONTH_1');
-- PAZO_LIVE_OFFERS_SEED_END
CREATE FUNCTION supporter_private.pazo_live_offer_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $immutable$
BEGIN RAISE EXCEPTION 'registered Live offer is immutable' USING ERRCODE='23514'; END $immutable$;
CREATE TRIGGER pazo_live_offer_immutable_rows BEFORE UPDATE OR DELETE ON supporter_private.pazo_live_offer_versions
 FOR EACH ROW EXECUTE FUNCTION supporter_private.pazo_live_offer_immutable();
CREATE TRIGGER pazo_live_offer_immutable_truncate BEFORE TRUNCATE ON supporter_private.pazo_live_offer_versions
 FOR EACH STATEMENT EXECUTE FUNCTION supporter_private.pazo_live_offer_immutable();
REVOKE ALL ON FUNCTION supporter_private.pazo_live_offer_immutable() FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE supporter_private.pazo_paypal_live_checkout_intents ADD CONSTRAINT pazo_live_intent_exact_offer_fk
 FOREIGN KEY(terms_version,locale,terms_digest) REFERENCES supporter_private.pazo_live_offer_versions(terms_version,locale,terms_digest);
CREATE FUNCTION supporter_private.pazo_live_intent_original_consent_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $intent$
BEGIN
 IF ROW(NEW.intent_id,NEW.owner_id,NEW.request_key,NEW.merchant_generation,NEW.source_environment,
   NEW.plan_id,NEW.locale,NEW.terms_version,NEW.terms_digest,NEW.affirmative_consent,NEW.created_at)
  IS DISTINCT FROM ROW(OLD.intent_id,OLD.owner_id,OLD.request_key,OLD.merchant_generation,OLD.source_environment,
   OLD.plan_id,OLD.locale,OLD.terms_version,OLD.terms_digest,OLD.affirmative_consent,OLD.created_at) OR
  (OLD.provider_create_claimed_at IS NOT NULL AND NEW.provider_create_claimed_at IS DISTINCT FROM OLD.provider_create_claimed_at) OR
  (OLD.provider_subscription_id IS NOT NULL AND NEW.provider_subscription_id IS DISTINCT FROM OLD.provider_subscription_id)
 THEN RAISE EXCEPTION 'original Live owner, consent and provider binding are immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $intent$;
CREATE TRIGGER pazo_live_original_consent_immutable BEFORE UPDATE ON supporter_private.pazo_paypal_live_checkout_intents
 FOR EACH ROW EXECUTE FUNCTION supporter_private.pazo_live_intent_original_consent_immutable();
REVOKE ALL ON FUNCTION supporter_private.pazo_live_intent_original_consent_immutable() FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.pazo_f16_live_service_acceptance_read(p_owner uuid,p_intent text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $acceptance$
DECLARE result jsonb;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role') IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_owner IS NULL OR p_intent IS NULL OR p_intent !~ '^intent-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'
 THEN RETURN NULL; END IF;
 SELECT pg_catalog.jsonb_build_object('source','original_live_offer_acceptance','intentId',i.intent_id,
  'acceptedAt',pg_catalog.to_char(i.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'affirmativeConsent',i.affirmative_consent,'termsVersion',o.terms_version,'termsDigest',o.terms_digest,
  'locale',o.locale,'title',o.title,'consentLabel',o.consent_label,'exactCopy',o.exact_copy,
  'priceMinor',o.price_minor,'currency',o.currency,'cadence',o.cadence) INTO result
 FROM supporter_private.pazo_paypal_live_checkout_intents i
 JOIN supporter_private.pazo_live_offer_versions o ON o.terms_version=i.terms_version AND o.locale=i.locale AND o.terms_digest=i.terms_digest
 WHERE i.owner_id=p_owner AND i.intent_id=p_intent AND i.affirmative_consent;
 RETURN result;
END $acceptance$;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_acceptance_read(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_acceptance_read(uuid,text) TO service_role;
COMMIT;

-- PAZO F16-P06: PREPARED Sandbox QA offer publication, reviewed copy, NOT APPLIED.
-- This SQL commits precisely two immutable ES/EN offer rows when a separate
-- exact PUBLICATION GO has been granted. CI executes it ONLY on disposable PG17.
-- It does NOT limit availability to one Auth account by itself; the API server's
-- QA-only exact-UID allowlist is a MANDATORY independent prerequisite.
-- NEVER use for PayPal Live or for granting paid entitlements.
-- OPERATOR PREFLIGHT (separate authorization only): in the SAME controlled
-- database session set pazo.f16_p06_qa_publish_go to:
-- 'PO_EXPLICIT_QA_OFFER_PUBLISH_AFTER_OWNER_GATE'. No actual secret in this flag.
BEGIN;
SET LOCAL statement_timeout = '5000ms';
SET LOCAL lock_timeout = '2000ms';
DO $guard$
BEGIN
 IF current_setting('pazo.f16_p06_qa_publish_go',true)
    IS DISTINCT FROM 'PO_EXPLICIT_QA_OFFER_PUBLISH_AFTER_OWNER_GATE' THEN
   RAISE EXCEPTION 'P06 QA publication requires separate operator GO'
     USING ERRCODE='42501';
 END IF;
 IF NOT pg_catalog.pg_has_role(current_user,'postgres','MEMBER') THEN
   RAISE EXCEPTION 'P06 QA publication requires reviewed administrative role'
     USING ERRCODE='42501';
 END IF;
 IF to_regclass('supporter_private.paypal_p06_offers') IS NULL
   OR to_regclass('supporter_private.paypal_p06_checkout_attempts') IS NULL THEN
   RAISE EXCEPTION 'P06 private checkout schema missing'
     USING ERRCODE='55000';
 END IF;
 -- One-version launch on empty QA catalog, no backfill, no mutation to
 -- existing subscribed accounts. All other rows must remain untouched.
 IF EXISTS (SELECT 1 FROM supporter_private.paypal_p06_offers)
   OR EXISTS (SELECT 1 FROM supporter_private.paypal_p06_checkout_attempts) THEN
   RAISE EXCEPTION 'P06 offer/checkout state is not empty; abort'
     USING ERRCODE='55000';
 END IF;
 IF EXISTS (
   SELECT 1 FROM pg_catalog.pg_proc p
   WHERE p.oid='public.f16_p06_read_published_offer(text)'::regprocedure
     AND (pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
       OR pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'))
 ) THEN
   RAISE EXCEPTION 'P06 public offer RPC ACL unsafe' USING ERRCODE='42501';
 END IF;
END
$guard$;

INSERT INTO supporter_private.paypal_p06_offers(
 version,locale,exact_copy,plan_id,currency,price_minor,cadence,published_at)
VALUES
 ('pazo-supporter-sandbox.qa20261016-v1','es','PRUEBA PAYPAL SANDBOX — SIN DINERO REAL. Esta oferta solo es para una cuenta de PAZO expresamente autorizada para pruebas. No se cobrará dinero real y no constituye la oferta pública definitiva de Amigo de PAZO.

El plan de prueba simula una suscripción de apoyo voluntario de US$2.99 por mes (USD), con renovación automática mensual administrada por PayPal Sandbox. El precio mostrado es el importe de prueba por cada ciclo mensual simulado. No incluye prueba gratuita, plan anual ni cargo de inscripción. Para compras futuras con dinero real se mostrará una oferta diferente, que requerirá aceptación nueva.

PAZO y sus herramientas habituales para mascotas siguen siendo gratuitos. Esta prueba no activa insignias, estilos especiales, un período pagado, acceso prioritario ni otros beneficios. Aprobar la suscripción en PayPal o regresar a PAZO no prueba por sí solo que exista un pago verificado.

La prueba permite comprobar cómo se solicitan las renovaciones y cómo detenerlas. En PAZO, la sección Gestionar Amigo de PAZO incluye la opción Cancelar renovación. Solo se considerará cancelada cuando PayPal confirme el resultado; si el sistema no puede confirmarlo, solicita ayuda a appdigital.corp@gmail.com. La cancelación impide futuras renovaciones cuando PayPal la confirma, pero no equivale a un reembolso automático.

Antes de continuar debes marcar voluntariamente la casilla de aceptación, que empieza desmarcada. PAZO guardará una constancia técnica de esa aceptación y la versión exacta de estas condiciones, destinada a verificar la prueba. Puedes revisar tu estado de suscripción en la sección de gestión de PAZO. No compartas contraseñas de PayPal ni de PAZO con el personal de pruebas.',
  'P-14V25407JP6850922NLHMDKI','USD',299,'MONTH_1',pg_catalog.clock_timestamp()),
 ('pazo-supporter-sandbox.qa20261016-v1','en','PAYPAL SANDBOX TEST — NO REAL MONEY. This offer is available only to one expressly authorized PAZO test account. No real money will be charged. This is not the final public Friend of PAZO offer.

This test plan simulates an optional support subscription costing US$2.99 per month (USD) and automatically renewing monthly through PayPal Sandbox. The stated amount is the simulated charge for each monthly test cycle. There is no free trial, annual plan or enrollment charge. A future real-money purchase would have separate terms and require a new acceptance.

PAZO and its normal pet features remain free. This test does not activate badges, cosmetic themes, a paid service period, priority access or other benefits. Approval at PayPal or a browser return to PAZO does not by itself prove a verified payment.

The test checks how renewals are requested and stopped. In PAZO, Manage Friend of PAZO includes a Cancel renewal option. Cancellation is confirmed only after PayPal confirms the result; if it cannot be confirmed, contact appdigital.corp@gmail.com for test assistance. A confirmed cancellation stops future renewals and is not automatically a refund.

Before continuing, you must voluntarily select an initially unchecked consent checkbox. PAZO will retain technical evidence of your consent and the precise version of these test terms to verify the experiment. You can review subscription status in the PAZO account-management section. Never share your PayPal or PAZO password with the test operators.',
  'P-14V25407JP6850922NLHMDKI','USD',299,'MONTH_1',pg_catalog.clock_timestamp());

DO $post$
BEGIN
 IF (SELECT count(*) FROM supporter_private.paypal_p06_offers
     WHERE version='pazo-supporter-sandbox.qa20261016-v1' AND published_at IS NOT NULL)<>2
   OR public.f16_p06_read_published_offer('es')->>'locale'<>'es'
   OR public.f16_p06_read_published_offer('en')->>'locale'<>'en'
   OR (SELECT count(DISTINCT sha256) FROM supporter_private.paypal_p06_offers
       WHERE version='pazo-supporter-sandbox.qa20261016-v1')<>2
   OR EXISTS (SELECT 1 FROM supporter_private.paypal_p06_offers
       WHERE version='pazo-supporter-sandbox.qa20261016-v1'
         AND (sha256 IS NULL OR price_minor<>299 OR currency<>'USD'
             OR cadence<>'MONTH_1' OR plan_id<>'P-14V25407JP6850922NLHMDKI'))
 THEN RAISE EXCEPTION 'P06 QA offer postflight failed'
    USING ERRCODE='55000';
 END IF;
END
$post$;
COMMIT;
-- Never return exact copy or private Auth identifiers from the postflight.
SELECT 'P06_QA_APPROVED_BILINGUAL_OFFER_STAGED_PUBLICATION_PASS' AS status;

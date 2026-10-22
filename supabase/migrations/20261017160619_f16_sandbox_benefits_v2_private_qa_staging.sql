-- F16 QA V2: merchant evidence staging, NO checkout, no public benefits.
-- Installed only with PO GO of 2026-10-17. Private schema, no test buyers yet.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='15s';
DO $gate$
BEGIN
 IF pg_catalog.current_database()<>'postgres'
    OR to_regclass('supporter_private.paypal_p06_offers') IS NULL
    OR to_regclass('supporter_private.paypal_p06_checkout_attempts') IS NULL
    OR to_regclass('supporter_private.wall_consents') IS NULL
    OR to_regclass('supporter_private.paypal_payment_entries') IS NULL
    OR (SELECT count(*) FROM supporter_private.paypal_p06_offers)<>2
    OR (SELECT count(*) FROM supporter_private.paypal_p06_offers
          WHERE version='pazo-supporter-sandbox.qa20261016-v1'
            AND published_at IS NOT NULL)<>2
    OR (SELECT count(*) FROM supporter_private.paypal_p06_checkout_attempts)<>1
    OR EXISTS(SELECT 1 FROM supporter_private.paypal_payment_entries)
    OR to_regclass('supporter_private.f16_sandbox_qa_owners') IS NOT NULL
    OR to_regclass('supporter_private.f16_sandbox_qa_paid_periods') IS NOT NULL
 THEN RAISE EXCEPTION 'F16 QA V2 baseline changed: install halted' USING ERRCODE='55000'; END IF;
END $gate$;
CREATE TABLE supporter_private.f16_sandbox_qa_owners (
 owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 authorized_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 expires_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'disabled' CHECK (status IN ('disabled','enabled')),
 test_purpose text NOT NULL DEFAULT 'f16_four_benefits_sandbox'
 CHECK (test_purpose='f16_four_benefits_sandbox')
);
CREATE TABLE supporter_private.f16_sandbox_qa_paid_periods (
 sale_id text PRIMARY KEY CHECK (sale_id ~ '^[A-Za-z0-9._-]{6,128}$'),
 event_id text NOT NULL UNIQUE CHECK (event_id ~ '^[A-Za-z0-9._-]{6,128}$'),
 provider_subscription_id text NOT NULL CHECK (provider_subscription_id ~ '^I-[A-Za-z0-9_-]{3,70}$'),
 owner_id uuid NOT NULL REFERENCES supporter_private.f16_sandbox_qa_owners(owner_id),
 cycle_key text NOT NULL CHECK (cycle_key ~ '^[A-Za-z0-9_-]{6,100}$'),
 accepted_offer_version text NOT NULL DEFAULT 'pazo-supporter-sandbox.benefits-v2'
 CHECK (accepted_offer_version='pazo-supporter-sandbox.benefits-v2'),
 provider_environment text NOT NULL DEFAULT 'sandbox' CHECK (provider_environment='sandbox'),
 amount_minor integer NOT NULL DEFAULT 299 CHECK (amount_minor=299),
 currency text NOT NULL DEFAULT 'USD' CHECK (currency='USD'),
 service_start timestamptz NOT NULL,
 service_end timestamptz NOT NULL,
 merchant_verified_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 CONSTRAINT f16_qa_valid_service_month CHECK (
   service_end>service_start AND service_end<=service_start+interval '32 days'),
 CONSTRAINT f16_qa_one_owner_cycle UNIQUE (owner_id,cycle_key)
);
CREATE INDEX f16_sandbox_qa_period_lookup
 ON supporter_private.f16_sandbox_qa_paid_periods(owner_id,service_start,service_end);
CREATE TABLE supporter_private.f16_sandbox_qa_holds (
 sale_id text NOT NULL REFERENCES supporter_private.f16_sandbox_qa_paid_periods(sale_id),
 event_id text NOT NULL UNIQUE CHECK(event_id ~ '^[A-Za-z0-9._-]{6,128}$'),
 reason text NOT NULL CHECK(reason IN ('refunded','partially_refunded','reversed','disputed')),
 verified_at timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 PRIMARY KEY(sale_id,event_id)
);
CREATE TABLE supporter_private.f16_sandbox_qa_pet_themes (
 pet_id uuid PRIMARY KEY REFERENCES public.pets(id) ON DELETE CASCADE,
 owner_id_at_set uuid NOT NULL REFERENCES supporter_private.f16_sandbox_qa_owners(owner_id),
 theme text NOT NULL CHECK(theme IN ('classic','nature','hearts','stars','adventure')),
 updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
);
ALTER TABLE supporter_private.f16_sandbox_qa_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.f16_sandbox_qa_owners FORCE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.f16_sandbox_qa_paid_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.f16_sandbox_qa_paid_periods FORCE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.f16_sandbox_qa_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.f16_sandbox_qa_holds FORCE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.f16_sandbox_qa_pet_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.f16_sandbox_qa_pet_themes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.f16_sandbox_qa_owners FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON supporter_private.f16_sandbox_qa_paid_periods FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON supporter_private.f16_sandbox_qa_holds FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON supporter_private.f16_sandbox_qa_pet_themes FROM PUBLIC,anon,authenticated,service_role;
-- V2 is staged but NOT PUBLISHED; the running checkout stays on historical QA
-- with its existing separate allowlist + hard-coded OFF gate. Never overwrite V1.
INSERT INTO supporter_private.paypal_p06_offers
 (version,locale,exact_copy,plan_id,currency,price_minor,cadence,published_at)
VALUES
 ('pazo-supporter-sandbox.benefits-v2','es','PRUEBA CONTROLADA — PAYPAL SANDBOX. NO SE UTILIZA DINERO REAL. Esta oferta es únicamente para una cuenta y mascota descartables de PAZO. No es la oferta pública definitiva.

Amigo de PAZO es una suscripción de apoyo voluntario de US$2.99 al mes, USD, con renovación automática mensual administrada por PayPal Sandbox hasta que se cancele. Sin prueba gratuita, cuota inicial ni plan anual. PAZO y todas sus funciones gratuitas siguen disponibles sin suscribirse.

Esta prueba incluye exactamente cuatro beneficios de Amigo de PAZO, habilitados SOLO si PAZO verifica un cobro mensual regular completado y la identidad del propietario: (1) insignia Amigo de PAZO en el perfil de la mascota y junto al autor en publicaciones del Feed; (2) elección y guardado de cinco fondos cosméticos para la mascota: Clásico PAZO, Naturaleza, Corazones, Cielo estrellado y Aventura; (3) participación opcional de cada mascota en el muro público Gracias, Amigos de PAZO, solamente si su propietario concede consentimiento separado, que puede retirar en cualquier momento; (4) insignias de evolución al completar 3, 6 y 12 períodos mensuales pagados, verificados y no revertidos. No hay prioridad en rescates ni otras funciones exclusivas.

Aprobar en PayPal Sandbox o volver a PAZO NO significa que haya un período pagado. La activación exige prueba independiente del vendedor y del cargo, términos aceptados y un intervalo de servicio contractual verificable. Si falta prueba, hay pago pendiente, fallido, reembolso o disputa, los beneficios no se activan. Los hitos de 3/6/12 se ensayan aparte con períodos sintéticos: no se inventan pagos PayPal.

Puedes cancelar las próximas renovaciones desde Gestionar Amigo de PAZO; la cancelación solo se confirma después de la respuesta verificable del proveedor. Un período previamente pagado y no revertido conserva sus beneficios hasta su vencimiento verificado. El permiso para aparecer en el muro se puede revocar por separado incluso tras cancelar o expirar.

Antes de enviar la solicitud de prueba debes marcar voluntariamente una casilla de aceptación inicialmente desmarcada. PAZO conservará una constancia descargable de la versión y texto exacto aceptado. La prueba puede permanecer bloqueada si todavía se necesitan permisos o evidencias de pago. Para asistencia: appdigital.corp@gmail.com.','P-14V25407JP6850922NLHMDKI','USD',299,'MONTH_1',NULL),
 ('pazo-supporter-sandbox.benefits-v2','en','CONTROLLED TEST — PAYPAL SANDBOX. NO REAL MONEY. This offer is only for an expressly authorized, disposable PAZO user and pet. It is not a public real-money offer.

Friend of PAZO is an optional US$2.99 per month recurring support subscription (USD), automatically renewed monthly through PayPal Sandbox until cancelled. No free trial, setup fee or annual plan. PAZO and all its ordinary free features remain available without subscribing.

This test includes exactly four Friend of PAZO benefits, enabled ONLY after PAZO independently confirms a completed regular monthly payment and the authenticated owner: (1) Friend of PAZO badge on a pet profile and Feed post author; (2) selection and saving of five pet profile themes, Classic PAZO, Nature, Hearts, Starry Sky and Adventure; (3) optional inclusion of each pet in the public Thank You, PAZO Friends wall only after separate, individually revocable owner consent; (4) evolution medals after 3, 6 and 12 entirely elapsed, verified paid and non-reversed monthly periods. No rescue priority or other exclusive features.

PayPal Sandbox approval or redirect does NOT prove a paid service period. Benefits require independent merchant verification of the completed charge, verified original terms and a real contractual service interval. Pending or failed payments, refunds, disputes or missing evidence cannot activate benefits. Three-, six- and twelve-month milestones are tested separately using synthetic elapsed cycles, never forged PayPal charges.

Manage Friend of PAZO lets you request cancellation of future renewals; it is confirmed only when the provider confirms. An already paid and non-reversed service period retains its benefits until verified expiry. Public wall consent can be withdrawn separately, even after cancellation or expiry.

Before requesting the test subscription you must voluntarily tick a checkbox that starts unchecked. PAZO keeps a downloadable copy of the exact accepted terms and version. The test may remain blocked when needed proof or authorization is missing. For assistance: appdigital.corp@gmail.com.','P-14V25407JP6850922NLHMDKI','USD',299,'MONTH_1',NULL);
DO $post$
BEGIN
 IF (SELECT COUNT(*) FROM supporter_private.paypal_p06_offers
      WHERE version='pazo-supporter-sandbox.benefits-v2' AND published_at IS NULL)<>2
    OR (SELECT COUNT(*) FROM supporter_private.paypal_p06_offers
      WHERE version='pazo-supporter-sandbox.qa20261016-v1' AND published_at IS NOT NULL)<>2
    OR EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_owners)
    OR EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_paid_periods)
    OR EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_holds)
    OR EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_pet_themes)
 THEN RAISE EXCEPTION 'F16 sandbox empty staging postflight failed' USING ERRCODE='55000'; END IF;
END $post$;
COMMIT;
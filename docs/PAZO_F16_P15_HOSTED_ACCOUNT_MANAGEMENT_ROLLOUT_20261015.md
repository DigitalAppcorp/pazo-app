# PAZO F16-P15 — Sandbox hosted deployment, explicit PO GO

**Fecha:** 2026-10-15. Aprobación explícita: «ok aprobado, hazlo», tras gate F16-P14 de instalación SQL/endpoint/UI. **Se autorizaron esas operaciones**, NO Live, checkout público, compra, publicación de oferta legal no revisada, beneficio o merge.

## Cambios efectivos en Supabase alojado (mismo proyecto PAZO)

Proyecto `mrybvqdebbgcayuvgkkr`, PostgreSQL `postgres`, modalidad de pagos PayPal **Sandbox**. Herramienta Supabase de migraciones registró:

- `20261015170222_f16_p12_private_checkout_schema_sandbox_no_offers.sql` — instalación real transaccional de tablas P06, RPCs P06/P07/P08/P10 (ofertas y consentimientos VACÍOS, sin inserción de suscripción ni evento). Fuente auditada en P12 bundle, flag operator `PO_APPROVED_P12_HOSTED_SCHEMA_ONLY` establecido solo dentro de la transacción.
- `20261015170258_f16_p14_owner_acceptance_read_only_rpc.sql` — nuevo lector privilegiado de texto/version/digest/instante exacto de consentimiento para owner/intent, sin PII ajena y sin DML, convertido del draft PG.
- `20261015170428_f16_p15_owner_supporter_account_list_readonly.sql` — list owner-only de máximo 5 referencias de intents, estado pending/bound y capacidad de recuperar la aceptación; NO devuelve PayPal subscription ID ni cobertura.

**Pruebas alojadas realizadas:** SQL de catálogo confirmó tablas RLS forzada, `anon/authenticated` sin EXECUTE de RPCs privados, `service_role` permitido, owner falso devuelve `[]`, 0 ofertas/checkout intents P06, 0 entradas ledger, 8 eventos QA pendientes intactos. Security Advisor sigue mostrando avisos históricos, especialmente RLS sin políticas para tablas privadas intencionalmente cerradas; ver `https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy`. No asumir que el aviso equivale a exposición pública. Auditoría adicional antes de Beta pública.

## Despliegue Edge

- Función NUEVA: `f16-paypal-supporter-account` **ACTIVE v2**, `verify_jwt=true`. Se desplegó sin tocar `f16-paypal-webhook` ni `paypal-webhook`.
- Código fuente canónico `supabase/functions/f16-paypal-supporter-account/index.ts`; en deploy los imports originales `../f16-paypal-webhook/*.mjs` fueron empaquetados en raíz de la función, manteniendo contenidos originales. Subscripción de checkout `begin` / `offer` NO expuesta.
- Acciones de dueño autenticado mediante `getUser(token)`: `list` (RPC P15), `status` (PayPal GET), `cancel` (PayPal GET→POST→GET con confirmación), `acknowledgement` (RPC P14 + texto descargable). En todos los casos exige origin HTTPS exacto de `PAZO_F16_APP_ORIGIN`, admisión global, campos limitados, CORS y JWT validado. El navegador nunca decide owner, plan, suscripción o entitlements.
- **Variables aún no verificadas por prueba real:** `PAZO_F16_APP_ORIGIN`, `PAZO_F16_PAYPAL_ENV=sandbox`, `PAZO_F16_PAYPAL_CLIENT_ID`, `PAZO_F16_PAYPAL_CLIENT_SECRET` en Edge. Si faltan, 503 sin cambios. No se leen ni guardan secretos fuera del runtime. **No hay una cancelación real E2E verificada**: no se ha utilizado un token real del comprador ni se ha ejecutado PayPal POST cancel en este paso.

## UI en GitHub, no en web publicada

Nuevo `src/features/supporter/components/SupporterAccountManagement.tsx`; botón bajo `Mi mascota → Menú y Utilidades` (solo si puede gestionar la mascota), sin rediseñar las pantallas anteriores ni insertar bordes/contornos. Vista autenticada ES/EN con lista de propias intenciones, estado PayPal, botón cancelar con confirmación voluntaria y descarga original con `cache: no-store`. Errores NO fingen éxito. **El frontend está solo en el PR #44 DRAFT**; no se ha tocado Vercel ni main, sin permiso separado de publicación Beta/Preview.

## Gate siguiente

1. Validar el dominio HTTPS exacto que usa la app y verificar las variables Edge requeridas; sin eso, funcionalidad externa puede devolver 503.
2. Probar sesión real con una cuenta Sandbox de titular en navegador sobre preview específico autorizado: GET list → GET status → confirmar cancelación de la suscripción adecuada → GET CANCELLED y descarga de términos existentes. El intento histórico no tiene aceptación P06, por lo que para él no se puede fabricar un recibo.
3. Implementar entrega automática conservable tras nuevo consentimiento legal aprobado. La descarga disponible tras autenticación no prueba entrega al alta.
4. Integrar y verificar contabilidad, reembolsos, disputas y períodos; aprobación PO separada para publicación de oferta real/PayPal buyer y eventual Live. No acreditar un activo PayPal como pago.

**Invariantes:** PAZO gratis, Amigo de PAZO opcional 2.99 USD/mes todavía sin venta pública, `paidThrough=null`, `mayGrantBenefits=false`. Ocho eventos QA no reprocesados ni eliminados.

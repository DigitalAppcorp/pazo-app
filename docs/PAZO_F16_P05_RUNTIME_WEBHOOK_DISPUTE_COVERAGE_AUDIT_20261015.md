# PAZO F16-P05 — Auditoría real del receptor Sandbox y cobertura de disputas

**Fecha:** 15 de octubre de 2026. **Estado:** auditoría alojada exclusivamente de solo lectura + hardening de evaluadores y preflight en GitHub. F16 pagos **NO-GO**. Product Owner: «ok sigamos» permite seguir trabajando en el gate, NO sustituye permiso específico para desplegar SQL/Edge, cambiar suscripciones PayPal, procesar eventos históricos o activar beneficios. Rama `f13/section-titles-20261012`, PR #44 DRAFT.

## Hechos confirmados en Supabase alojado (sin modificar)

- `f16-paypal-webhook` **ACTIVE v13** con `verify_jwt:false`. El receptor **verifica por PayPal** firmas para aceptar y persiste sólo IDs/tipo, sin escribir ledger. No confundir `verify_jwt:false` con omisión de verificación de la firma PayPal: son controles distintos. El código de ingreso desplegado coincide en estos aspectos con `supabase/functions/f16-paypal-webhook/core.mjs` de la rama.
- Tabla privada de intenciones: **1 BOUND**; inbox: **8 pending**; reversos **0**; `paypal_payment_entries` sin filas. Consultas de catálogo: **7 RPC F16 de Paypal** `SECURITY DEFINER` accesibles a `service_role`, NO a `anon` o `authenticated`; seis tablas de `supporter_private` siguen `RLS+FORCE` y sin permisos de SELECT directo a roles externos.
- La función alojada `public.f16_paypal_record_verified_event(p_provider_event_id,p_event_type)` **solo acepta 11 tipos** de suscripciones y ventas, incluyendo `PAYMENT.SALE.REFUNDED` y `PAYMENT.SALE.REVERSED`, pero **no** `CUSTOMER.DISPUTE.CREATED`, `CUSTOMER.DISPUTE.UPDATED` o `CUSTOMER.DISPUTE.RESOLVED`. La `core.mjs` desplegada también omite los tres: un aviso válido de disputa se considera `verified_unhandled_event` y se responde HTTP 200 sin conservar referencia. **No existe cobertura de disputas ni garantía de historial financiero completo.**
- No se consultó el contenido/ID individual del comprador, no se ejecutaron RPC de escritura ni lecturas PayPal reales. Los ocho eventos históricos siguen intactos.
- Security Advisor señala INFO `rls_enabled_no_policy` en tablas privadas intencionalmente inaccesibles; **NO** crear policies abiertas para silenciarlo. También existen avisos WARN sobre otras funciones F14 fuera del alcance de pagos: requieren auditoría F14 independiente, no se alteraron.

## Verificación del proveedor y cambios de plataforma

PayPal documenta `CUSTOMER.DISPUTE.CREATED/UPDATED/RESOLVED` como eventos de disputas y no los incluye necesariamente en la lista de eventos exclusivamente de suscripciones. Ver https://developer.paypal.com/disputes/test-go-live y https://developer.paypal.com/api/disputes/.

La nueva política de Supabase para `public` usa grants explícitos en nuevas tablas (rollout para proyectos existentes previsto para 30-oct-2026). Las futuras funciones internas deben restringir `EXECUTE` en la misma migración y las tablas privadas no deben depender de grants por defecto. Ver https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically.

## Hardening realizado AHORA, solo código de rama

1. `p05FirstRegularObligationLab.mjs` y su test: cuando el historial simulado contenga cualquiera de los tres eventos de disputa, **REVIEW_REQUIRED**; nunca deducir primer cargo regular ni membresía.
2. `p05OfflineInboxOrchestrator.mjs` y su test: los tres eventos se clasifican como `review/reversal_possible`, nunca como un pago. El flujo permanece sin worker real.
3. `p05SandboxMerchantEvidenceReader.mjs`: amplía las clases reconocibles en los mocks, sin cambiar el receptor alojado.
4. `paypalSandboxWebhookContract.mjs`: añade `missingDisputeEvents`, `financialRiskEventsConfigured` y `financialReconciliationReady`, separados del indicador previo `ok` de eventos básicos. El resultado no expone URL/credenciales.
5. `scripts/f16-paypal-verify-webhooks-readonly.mjs`: sigue haciendo **exclusivamente OAuth token + GET list** con secretos locales; ahora devuelve código no-cero si los eventos de disputa necesarios no están configurados en el mismo listener candidato. No se ejecutó porque los secretos PayPal no están accesibles a esta sesión. Pruebas de configuraciones incompletas, completas, wildcard y webhooks separados.

**No** se añadieron disputas a `core.mjs` activo ni al RPC alojado: modificar solo uno provocaría pérdida silenciosa o errores de entrega, y almacenar eventos de otras operaciones del comerciante requeriría política de alcance y retención específica.

## Gates independientes necesarios para habilitar lectura auténtica / posterior conciliación

- **G1 — Alcance de datos y retención:** decidir cómo diferenciar disputas de PAZO frente a disputas ajenas del mismo merchant, si se puede retener únicamente ID+tipo+timestamp, plazos de holds/archivo, eliminación de cuenta y conservación legal-contable (P01–P04/P09). Sin esto, no instalar captura nueva.
- **G2 — Webhooks coordinados:** comprobar mediante OAuth **solo lectura** el listado real de suscripciones de webhook PayPal. Si se habilita captura, modificar en una migración formal y reversible los dos allowlists del `core.mjs` + `f16_paypal_record_verified_event` y comprobar firma, idempotencia, adversariales y grants; **separadamente** confirmar/actualizar suscripción del webhook PayPal al mismo conjunto. No asumir que eventos no recibidos puedan reconstruirse.
- **G3 — Worker privado:** instalar RPC de claim/read/inverse/finish ya redactadas como `DO_NOT_APPLY`, con rollout **apagado** y cutoff prospectivo, después de análisis de locks y permisos. Se requiere GO explícito de aplicación de DDL y otro de despliegue/activación; no tocar los 8 QA pendientes.
- **G4 — Primer cargo:** sólo una fuente PayPal autenticada y un historial de ventas, fallos, deudas, reembolsos/disputas suficientemente completo, junto a consentimiento explícito de renovación, permitirían revisar atribución del primer ciclo. Una coincidencia de sale/event/subscription no otorga `paidThrough`.
- **G5 — Lanzamiento:** términos ES/EN reales, acuse durable, cancelación online, política de privacidad/retención, decisión PO y verificación de extremo a extremo. **PAZO continúa completamente gratuito salvo apoyo opcional futuro**, checkout y entitlements NO-GO.

**Conclusión operativa:** el receptor Sandbox sí está desplegado y funciona como *captura de referencias firmadas*, pero el *procesador P05 de pagos no lo está*; hay una brecha específica de disputas que invalida cualquier afirmación de cobertura financiera completa. El próximo avance auténtico requiere primero G1 y autorización para instalar G2/G3 de forma controlada.

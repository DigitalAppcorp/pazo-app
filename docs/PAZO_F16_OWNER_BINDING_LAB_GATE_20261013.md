# PAZO F16 — Binding Auth/PayPal en laboratorio

**Estado:** PASS de contrato y PostgreSQL 17 **descartable**, NO desplegado ni instalado. PR #44 DRAFT; sin cambios en PayPal, Supabase alojado, fundadores, entitlement ni cobros reales.

## Flujo de titularidad, no de cobro

1. El servidor valida la sesión de PAZO usando Auth y obtiene el UUID real del usuario. Nunca usar `owner_id` del navegador ni `user_metadata` para autorizar.
2. Solo el backend crea una intención privada con referencia opaca y UUID dueño verificado. Esa referencia pasa a PayPal como `custom_id`.
3. El backend consulta PayPal Sandbox mediante credenciales de su propia app; debe recibir el plan `P-14V25407JP6850922NLHMDKI`, `subscription.id` y `custom_id` idénticos a la intención existente.
4. Una transacción atómica reclama la suscripción una sola vez: UNIQUE en referencia PayPal, lock por intención, mismo dueño, mismo plan y `custom_id`. Repetir la misma operación es idempotente; otra cuenta, otra intención, otro plan o cambios posteriores fallan cerrado.
5. El resultado es **solo `readyToBind` / `bound`**. No acredita USD 2.99, no calcula períodos, no modifica `profiles.is_founder` ni el guard `wall_has_verified_entitlement()=false`.

## Código y pruebas sin despliegue

- `supabase/tests/supporter/f16-subscription-intent-lab-draft.sql`: schema/función interna de LAB **no es migración**. `supporter_private.paypal_subscription_intents` con dueño, plan, estado `pending` / `bound`, UNIQUE del ID externo, RLS habilitado y forzado, sin acceso directo para roles de navegador o service_role. La función de LAB `f16_lab_bind_subscription` es SECURITY INVOKER y está revocada de los roles del Data API. Los argumentos sintéticos representan evidencia de Auth/PayPal que deberá aportar el backend confiable; **no son prueba de validación real de Auth ni de PayPal**.
- `supabase/functions/f16-paypal-webhook/ownerBindingPreflight.mjs`: composición de **solo lectura**, con adaptadores inyectados para dueño autenticado, intención privada y suscripción recuperada desde PayPal. Confirma coincidencias y entrega candidato sin PII, sin escrituras ni beneficios. La procedencia de los adaptadores todavía deberá auditarse al integrar entrypoint real.
- `src/features/supporter/testing/f16OwnerBindingPreflight.test.mjs`: pruebas offline de sesión anónima, dueño suplantado, `custom_id` falso, plan/subscripción incorrectos, estado ya vinculado, referencias maliciosas y proveedor caído.
- `supabase/tests/supporter/f16-subscription-intent-synthetic.sql`: sesiones/UUID de fixture, ataques de cuenta A/B, duplicados, otro plan y `custom_id` alterado; todo en transacción con rollback.
- `scripts/f16-postgres-owner-binding-concurrency.mjs`: 27 intentos concurrentes, 1 vínculo por suscripción y cero pagos creados. El laboratorio contiene dos pagos sintéticos de la fase previa; el control comprueba que el número de pagos **no cambia**.

**Evidencia:** CI [#38508230482](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38508230482) SUCCESS y PostgreSQL [#38508230495](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38508230495) SUCCESS. Logs: `PASS F16 ownership: cross-owner, forged custom_id, wrong plan, replay and conflicting subscription denied`; `PASS F16 owner binding: 27 race attempts; one intent per subscription, no cross-owner claim, zero payments`.

## Limitaciones / siguientes gates

- **No hay todavía verificación Auth o llamada PayPal Sandbox conectada a un endpoint real**, ni migración instalada de intenciones. Los tests utilizan adaptadores y fixtures controlados. No se debe afirmar que una suscripción real está vinculada.
- Hay que decidir y auditar el ciclo de vida de intentos (expiración, eliminación de cuenta, reintentos, reporte de pagos) antes de instalar tablas; retención de ledger/reversos **pendiente**. Los 90 días aprobados son solo para IDs de webhooks definitivamente conciliados.
- Crear migración oficial del vínculo con **Supabase CLI** y probar PostgreSQL tras aprobar sus requisitos de datos; pedir GO del Product Owner ANTES de aplicar SQL alojado.
- Solo después integrar sesión Auth servidor, confirmación PayPal Sandbox auténtica y worker ACID de conciliación de pagos y reversos. Aún falta demostrar períodos pagados antes de habilitar el muro.

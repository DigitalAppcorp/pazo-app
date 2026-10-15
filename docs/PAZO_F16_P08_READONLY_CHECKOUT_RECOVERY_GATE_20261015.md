# PAZO F16-P08 — Recuperación de checkout vinculado, solo lectura (gate verificado)

**Fecha:** 2026-10-15. Producto: PAZO gratuito + Amigo de PAZO opcional USD 2.99/mes. Rama `f13/section-titles-20261012`, PR #44 DRAFT.

## Evidencia

Commit [409c766f](https://github.com/DigitalAppcorp/pazo-app/commit/409c766f66c27acac4aea90fd7f6267b32df9db4): **CI general SUCCESS y F16 Disposable PostgreSQL Lab SUCCESS**. Se ejecutaron pruebas `f16P08ReadOnlyCheckoutRecovery.test.mjs` y el SQL sintético P06 ampliado para P08, sin conexiones alojadas PayPal, Auth o Supabase.

## Cambio técnico exacto

- `supabase/drafts/f16_p08_read_checkout_recovery_DO_NOT_APPLY.sql`: DDL con guard obligatorio `current_database=f14_synthetic`, `session_user=f14_admin`, `current_user=postgres`. Nueva RPC `f16_p08_read_checkout_recovery(owner_id,request_key)` consulta intent previamente registrado y consentimiento P06, nunca crea o modifica filas. Encapsula sub ID solo para estado `bound`. Revocación pública explícita, `EXECUTE` solo `service_role`. No se aplica en hosted.
- `p06CheckoutConsentStore.mjs`: `readRecoveryForOwner` usa service key solo en servidor, salida restringida y validada (owner, clave, intent, plan fijo, pending/bound, `providerCreateClaimed`, ID PayPal opcional en BOUND).
- `p08SandboxReadOnlyCheckoutRecovery.mjs`: consulta desde `Request` real con Supabase Auth, rate admission y clave idempotente del propio usuario, no owner/sub ID del navegador. Solo para intent `bound` lee PayPal Sandbox GET mediante lector ya existente. Compara ID, `plan_id` y `custom_id`; no transmite emails, referencias privadas, approval URLs ni datos de tarjeta. Nunca hace POST de suscripción, cancelación, actualización SQL o acreditación.
- `f16P08ReadOnlyCheckoutRecovery.test.mjs`: pruebas de estados merchant, owner ajeno, referencias falsas, roles, errores, manipulación de request y ausencia de escrituras al proveedor. SQL de P06 prueba lectura pending (claim libre/consumido), BOUND, foreign key, roles y preservation.

## Estados expuestos (sin saldo)

| Estado privado / merchant | Respuesta protegida | Siguiente acción |
| --- | --- | --- |
| Pending + claim P07 consumido | `MANUAL_MERCHANT_RECONCILIATION_REQUIRED` | No reintentar POST; atribución merchant manual |
| Pending + claim libre | `NO_PROVIDER_CREATE_CLAIM` | Ningún POST desde recovery |
| Bound + APPROVAL_PENDING | `BUYER_APPROVAL_PENDING_READ_ONLY` | Estado informativo, sin enlace de aprobación |
| Bound + APPROVED/ACTIVE | `LINKED_FINANCIAL_RECONCILIATION_REQUIRED` | Pago/ciclo aún no probado |
| Bound + CANCELLED | `RENEWALS_CANCELLED_NO_RESUBSCRIBE` | No autoriza nuevo checkout |
| Bound + SUSPENDED/EXPIRED | `PROVIDER_STATE_REVIEW_REQUIRED` | Operador verifica deuda/reversals |
| Owner/plan/custom_id errado o GET fallido | `BLOCKED` | Ninguna mutación |

## Lo que permanece sin resolver

**Recuperación sin vínculo:** si PayPal creó la suscripción pero el servidor perdió respuesta antes de persistir sub ID, esta etapa no puede inventar el ID; necesitará correlación merchant/eventos comprobados (sin escaneo indiscriminado de compradores ni extracción de PII), estatus de duplicados y proceso manual seguro.

**Resuscripción tras cancelación:** el índice `p06_one_checkout_per_owner` todavía impide nuevos intentos por cuenta, incluso cancelada. Antes de permitirlo, diseñar y probar evidencia de cancelación efectiva, conciliación del período anterior y reversos/deuda, consentimiento bilingüe nuevo por ciclo, unicidad de suscripción activa y aislamiento concurrente. No eliminar el índice ni reutilizar el consentimiento anterior sin un gate explícito.

**Release:** sigue pendiente revisión de texto/retención legal/fiscal P01-P09, instalación de SQL Sandbox mediante autorización separada, conexión Edge apagada, permiso PayPal buyer nuevo de prueba y pruebas financieras. No ejecutar SQL `DO_NOT_APPLY` en DB alojada. No nuevos datos QA ni replay de ocho eventos pasados; `paidThrough=null`, `mayGrantBenefits=false`, Live NO-GO.

## Próximo checkpoint recomendado

Definir el contrato read-only para recuperación de `pending` reclamado pero sin ID, con evidencia verificable de PayPal y revisión explícita del caso ambiguo. **No crear subscripciones ni aprobar resuscripción automáticamente**.

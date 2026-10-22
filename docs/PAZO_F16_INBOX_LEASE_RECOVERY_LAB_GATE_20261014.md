# PAZO F16 — Claim/lease/retry/recovery (LAB ONLY) | 2026-10-14

## Evidencia y alcance
Proyecto `DigitalAppcorp/pazo-app`, rama `f13/section-titles-20261012`, PR #44 DRAFT. Este cambio NO es una migración de Supabase, despliegue, suscripción, conciliación de pago, activación de membresía ni autorización de infraestructura.

En el laboratorio PostgreSQL 17 descartable de GitHub Actions se prepararon:
- `supabase/queries/f16_inbox_claim_lease_lab_DRAFT_DO_NOT_APPLY.sql`
- `supabase/tests/supporter/f16-inbox-claim-lease-synthetic.sql`
- `scripts/f16-inbox-lease-concurrency.mjs`
- paso nuevo en `.github/workflows/f16-postgres-inbox-lab.yml`.

La suite verificó en commit `d3b39806`: [F16 PostgreSQL PASS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38563825729) y [CI PASS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38563826529). Un ajuste posterior valida explicitamente duración NULL: comprobar CI del HEAD siguiente antes de declarar ese SHA PASS.

## Protocolo aislado
1. `claim`: fila elegible `pending`, bajo hold y con `next_attempt_at<=now`, se bloquea mediante `FOR UPDATE SKIP LOCKED`; cambia atómicamente a `processing`, incrementa intentos y genera UUID aleatorio como token de lease. Límite de cinco intentos; lease 15–300 s.
2. `ack_lifecycle`: solo `BILLING.SUBSCRIPTION.*`, con token exacto vigente. No permite ACK financiero; la retención sigue `true`. Un segundo ACK no surte efecto.
3. `release_claim`: el trabajador devuelve error de catálogo saneado; solo el dueño del lease puede programar nuevo intento con backoff, o cuarentena terminal, sin pérdida del evento y sin liberar hold.
4. `recover_expired`: batches limitados y locks con `SKIP LOCKED` reclasifican leases expirados a `pending` con espera o `quarantined` cuando alcanzaron cinco intentos. Es deliberadamente un RPC explícito: NO existe scheduler.
5. Todas las RPC son `SECURITY DEFINER` con `search_path=''` y `EXECUTE` solo para `service_role`; la tabla privada mantiene FORCE RLS y sin SELECT/UPDATE directos para roles Data API. El test incluye roles sin permisos, retención, backoff, recuperación y 32 claims concurrentes (4 únicos).
6. Los cuatro eventos auténticos recibidos en hosted NO se consumieron. Supabase READ ONLY del 14-oct-2026 confirmó inbox=4, pending=4, intents=0, ledger=0, reversals=0, consents=0, lectores/claims DRAFT ausentes y entitlement(`NULL`)=false; receptor v13 ACTIVE.

## Advertencia crítica: integración financiera aún NO-GO
La función alojada `public.f16_paypal_commit_verified_sale` (migración existente) acepta eventos `pending`/`processing` sin exigir token de lease ni `expires_at`. El nuevo `ack_lifecycle` intencionalmente **no** aplica a `PAYMENT.SALE.*`. Antes de conectar cualquier worker, diseñar versión en laboratorio que ejecute validación del dueño/token y escritura del ledger + finalización del evento **en la misma transacción**, con pruebas de workers concurrentes, caída después de consulta a PayPal, reversos anteriores, duplicados y reintentos. Un token vigente NO sustituye prueba de merchant, owner Auth, monto/plan, identidad de la venta original ni reverso independiente.

Nunca conectar el nuevo protocolo con la RPC financiera actual sin ese endurecimiento. La retención de intent/ledger/tombstones continúa pendiente; los 90 días del inbox comienzan solo al conciliar definitivamente un evento y obtener GO del Product Owner. Quarantine no borra ni libera retención.

## Siguiente gate
Implementación offline de la transacción financiera lease-bound, correlación Auth/PayPal y tests de caída/reintento en PostgreSQL descartable. Posteriormente presentar gate específico al PO para migración versionada por Supabase CLI, SQL hosted, despliegue Edge/worker, recuperación programada y política de retención. Ninguno de esos cambios está autorizado por el PASS de laboratorio.

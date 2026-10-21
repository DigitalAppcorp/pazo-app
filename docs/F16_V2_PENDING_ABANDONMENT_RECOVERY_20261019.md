# PAZO F16 — Recuperación controlada del abandono de aprobación PayPal

**Fecha:** 2026-10-19 UTC. **Product Owner:** autorización expresa para actualizar SOLO el backend QA Sandbox. **Ámbito:** PR #44 DRAFT, rama `f13/section-titles-20261012`. No PayPal Live, main ni beneficios activados.

## Diagnóstico verificable

La app crea una suscripción de PayPal ANTES de que el usuario apruebe en PayPal. Salir desde el login deja el intent inicial `bound` aunque no haya pago. El `begin_checkout` antiguo exige un único primer intento por owner y la vía append-only de retry requiere un grant comercial reconciliado. Un recurso PayPal que devuelve 404 NO equivale a `CANCELLED`. No se autoriza segundo POST por el 404 o por falta de registros de pago locales.

**SQL postflight agregado (no divulgar owners ni IDs):** 3 primeros V2; 0 retry intents; 0 retry grants; 1 período Sandbox histórico (no corresponde por sí solo a las cuentas abandonadas); 0 entradas `paypal_payment_entries`; 2 solicitudes cumplen solo el preflight local. Este último número **no confirma estado o elegibilidad de PayPal**.

## Entrega instalada (protegida)

1. Migración `supabase/migrations/20261019044000_f16_sandbox_v2_pending_abandonment_preflight.sql` aplicada a `mrybvqdebbgcayuvgkkr` con resultado SUCCESS. Crea solo RPC `public.f16_qa_v2_abandonment_preflight(owner_id,intent_id)` **read-only** `SECURITY DEFINER`: check Auth confirmado, allowlist QA, consentimiento/original intent `bound`, provider-create reclamado, owner/plan y ausencia de pagos/activaciones/períodos/reintentos de ese owner. REVOKE `anon`/`authenticated`, EXECUTE solamente `service_role`. No INSERT/UPDATE/DELETE en la migración, no modificación de estado de suscripción.
2. Edge `f16-paypal-supporter-v2-qa` **v17 ACTIVE, verify_jwt=true**, desplegado sustituyendo **solo** `index.ts` y `p06SandboxCancellationProvider.mjs` de un bundle de 19 archivos; las otras 17 dependencias sin cambios. Acción nueva `abandon_pending`: origin exacto; `getUser()`; consentimiento explícito `confirmAbandon:true`; rate limit global; SQL preflight local; cuenta `owner`/intent vinculada; PayPal GET debe devolver `APPROVAL_PENDING` y coincidir en `id`, `plan_id` y `custom_id`; POST `/cancel` con request-id estable; GET posterior debe devolver `CANCELLED`. Solo entonces reporta cancelación. Si PayPal 404, error/timeout o estado distinto, **NO confirma cancelación**.
3. Frontend en PR #44: dentro de Gestión de la solicitud V2, usuario puede confirmar expresamente **«Cancelar solicitud pendiente»** únicamente si la lectura PayPal acreditó `APPROVAL_PENDING` y el intent corresponde al owner. Tras cancelación no finge pago ni habilita un nuevo checkout. Muestra que falta comprobar que puede volver a intentarlo.
4. Pruebas `src/features/supporter/testing/f16PendingAbandonmentCancellation.test.mjs`: GET→POST→GET terminal, negativa para APPROVED/ACTIVE/CANCELLED/EXPIRED/404/mismatch, negativa ante 204 sin GET terminal y contrato de backend/frontend/SQL. **CI + seis laboratorios: 7/7 SUCCESS** en commit `92641d653e23e6334f859fca550871c4edcc2546` (run CI `39199401037`).

## Lo que no queda resuelto

**No está resuelto un nuevo checkout después de 404 ni después de cancelar**, porque `f16_sandbox_qa_v2_retry_grants` sigue vacío. Un GET `CANCELLED` confirma el estado terminal, pero falta reconciliación merchant de transacciones, eventos y saldo para conceder retry; no inventar `webhook_inbox_reconciled` ni `no_collectible_subscription`. El `BILLING.SUBSCRIPTION.CREATED` firmado pendiente no es una venta, pero tampoco debe borrarse o marcarse arbitrariamente procesado.

**Próximo gate:** implementar evidencia merchant/inbox completa y concesión atomizada de retry **solo con estado terminal y transacciones reconciliadas**; en recurso 404, caso aislado de soporte/proveedor hasta contar con evidencia independiente suficiente. Probar: abandono sin compra→reanudación mismo checkout o cancelación confirmada→grant reconciliado→consentimiento nuevo→un solo pago Sandbox. No pedir al PO crear otra cuenta para el mismo síntoma. No habilitar Live sin GO independiente.

**Validación operativa:** actualizar Vite local de PR #44 y comprobar interface de cuenta con approval pendiente. No pedir al PO cancelar ninguna solicitud que pueda haber sido aprobada/pagada. El usuario ejecuta el botón solo si realmente desea cerrar su solicitud de prueba.

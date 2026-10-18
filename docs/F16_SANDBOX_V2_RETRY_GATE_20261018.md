**Actualización de implementación 2026-10-18 (código solamente):** recuperador automático en panel V2; lee GET propietario vinculado a través de Edge vigente sin iniciar POST PayPal, reanuda solo con aprobación verificada; 404 obliga conciliación y no genera otro checkout. Clasificador `sandboxV2RecoveryState.mjs` y tests de abandono/retorno. CI y 3 PG labs SUCCESS en SHA `c6aa8a7d` (39139940695/39139940634/39139940589/39139940680). **No desplegado**: front queda en PR #44; Edge QA v12 intacta, Live OFF, grants 0. Implementación de consulta y UX ≠ autorización de nuevo pago. La conciliación de evento CREATED + prueba mercantil no cobrable aún pendiente.

# PAZO F16 — Reintentos de PayPal Sandbox tras abandono

**Postflight 2026-10-18:** migraciones SQL instaladas; Edge QA v9 JWT true con inventario comercial de solo lectura, 16/16 archivos verificados; CI y tres PG17 labs exitosos (commit `40855926`). Nuevo CTA `Investigar suscripción en PayPal` consulta inventario asociado a merchant/app actual, sin mutar merchant ni generar grants. Cero intentos nuevos, cero grants, cero paidThrough. Falta investigar merchant de origen del 404 y toda exposición a cobro tardío antes de grant. PayPal Live NO habilitado; nueva compra aún bloqueada.


**Estado actualizado 2026-10-18:** dos migraciones aplicadas a Supabase y Edge QA v8 publicada, tras PO GO. El control owner-only para consultar elegibilidad está ON, pero **0 merchant reconciliation grants** y **0 retry attempts**: aún NO es posible efectuar una compra de reintento. PayPal Live OFF, PR #44 DRAFT sin merge. CI y tres laboratorios PG17 SUCCESS. El 404 original requiere evidencia independiente antes de un grant.

## Problema confirmado
- P06 fue una prueba antigua pagada y cancelada.
- La solicitud V2 actual pertenece a la misma cuenta PAZO, pero tiene un intent y un subscription ID diferentes.
- El comprador abrió PayPal y salió antes de aprobar. No hay registro interno de pago, período pagado ni activación.
- El posterior GET original en PayPal Sandbox dio HTTP 404; no prueba por sí mismo si aún puede ocurrir un cobro con otra aplicación/credencial.
- El SQL alojado `f16_qa_v2_begin_checkout` imponía **un único intento por propietario para siempre**. El diseño nuevo evita esa limitación sin mutar la evidencia histórica.

## Decisión de arquitectura
1. **Intocable:** P06, primer V2, términos aceptados, IDs, transacciones, webhooks y estados. No hacer `DELETE`, `UPDATE` correctivos ni usar nuevo `request_key` para sobrescribirlos.
2. **Normal:** si PayPal dice `APPROVAL_PENDING` y proporciona la URL segura de la misma solicitud, reanudarla. Nada de reintento.
3. **Terminal verificado:** `CANCELLED` o `EXPIRED`, o `MERCHANT_CONFIRMED_ABSENT` con **auditoría de comerciante independiente**. Un 404, token ausente, inactividad, pantalla cerrada, cronómetro, cancelación local o ledger vacío NO conceden elegibilidad.
4. **Prueba antes de nuevo intento:** confirmar misma identidad merchant/app y plan, que el objeto antiguo no sea cobrable, conciliación de transacciones e inbox/webhooks sin pagos pendientes, ausencia de período, pago y activación para esa suscripción, y consentimiento exacto bilingüe US$2.99/mes.
5. **Privado y explícito:** solo DBA/operador autorizado puede introducir un `f16_sandbox_qa_v2_retry_grants` con evidencia de conciliación `evidence_digest`; no existe un endpoint de grant para usuario ni Edge. El grant necesita todas las banderas de evidencia y aprobación; no se rellena con conjeturas.
6. **Nuevo intento:** `retry_begin` se activa solo con migración aplicada, grant revisado y flag **QA_V2_RETRY_RELEASE_APPROVED=true** aprobado por PO. Requiere nuevo consentimiento, requestKey y `intent-` nuevos en tablas append-only. Una llave repetida retorna el mismo intent; una distinta se rechaza mientras el anterior esté sin resolver.
7. **Punto irreversible:** `retry_claim_provider_create` es de una sola ejecución, serializado por owner y revalida pagos tardíos antes del único POST de PayPal. Respuesta perdida bloquea otro POST; no se inventa nuevo pago ni período.
8. **Activación:** redirect, `APPROVAL_PENDING`, `APPROVED`, `bound`, nota de conciliación o un clic no conceden beneficios. Solo venta y período realmente verificados por el merchant/ledger permiten insignias, temas, agradecimiento (con consentimiento por mascota) y hitos.

## Controles implementados en rama
- `src/features/supporter/sandboxRetryPolicy.mjs`: decisión fail-closed independiente, incluyendo 404 y auditoría merchant ausente.
- `supabase/migrations/20261018165000_f16_sandbox_v2_append_only_checkout_retries.sql`: tablas privadas append-only, RLS FORCE, grants no accesibles por usuario/service role, RPCs begin/claim/eligibility por service role, serialización por owner, una reclamación y conciliación tardía.
- `supabase/functions/f16-paypal-webhook/pazoSandboxV2RetryConsentStore.mjs`: adapter con validación de propietario autenticado (pasado desde Edge) y consentimiento exacto.
- `supabase/functions/f16-paypal-supporter-v2-qa/index.ts`: `retry_status`/`retry_begin` detrás de flag **false**; no son accesibles en Edge v6 publicada.
- `src/features/supporter/testing/f16SandboxRetryLifecycle.test.mjs`: policy, consent, idempotencia, flags, aislamiento.
- `scripts/f16-v2-retry-disposable-lab.sql` y `.github/workflows/f16-v2-retry-disposable-lab.yml`: SQL PostgreSQL 17 desechable con pruebas de grant incompleto, alta, repetición, claim único, RLS/ACL y pago tardío.

## Bloqueos explícitos antes de un lanzamiento
**Migraciones instaladas y QA v8 desplegada, no equivalente a autorización de pago:** falta cerrar el reconciliador del comerciante que pueda aportar evidencia verificable para `MERCHANT_CONFIRMED_ABSENT`, y que el lector de cuenta/aceptación, verificación de pago y cancelación seleccionen el intento activo más reciente sin perder el P06 y primer V2. El frontend final de reintento debe quedar conectado únicamente cuando esas rutas pasen E2E. El flag permanece OFF y ninguna nueva suscripción debe crearse aún.

## Secuencia para próximos gates (no ejecutar sin PO)
- CI y ensayo PG 17 completos + revisar migración con diffs.
- Verificar aplicación Sandbox propietaria, facturabilidad y cobertura de eventos; documentar evidencia sin exponer PII/secretos.
- Product Owner aprueba **aplicar migración** separadamente y se revisa pre/postflight de datos y ACL.
- Integrar gestión multi-intento + descarga de nueva aceptación + cancelación/beneficios y probar abandono/retorno/charge tardío con datos descartables.
- Product Owner aprueba habilitar QA reintentos; desplegar solo Sandbox y realizar una compra Sandbox autorizada.
- Live, merge a main y derecho pagado continúan cerrados hasta autorización propia.

**No borrar el intento que devolvió 404. No interpretar que SQL/CI PASS significa facturación lista.**

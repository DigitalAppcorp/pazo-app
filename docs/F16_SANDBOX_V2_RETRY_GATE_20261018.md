# F16 — Inventario completo PayPal negativo; diagnóstico de recuperación delimitado (2026-10-18)

**Nuevo resultado real de la cuenta Auth QA (captura Product Owner):** después de pulsar `Investigar suscripción en PayPal` con Edge `f16-paypal-supporter-v2-qa` v14, la UI mostró **(a)** «El inventario del plan no muestra el intento original» y **(b)** «La solicitud tampoco aparece en el inventario completo sin filtro de plan». Según contrato del frontend, este segundo texto solo corresponde a `unfiltered_inventory_original_absent` con `unfilteredInventoryEnumerated=true`. Esto confirma que **el mismo merchant y API credentials no presentan el ID original en ninguna de las dos listas que PAZO consultó**. No repetir el botón de investigación; ya está completado.

**Cadena de evidencia:** PayPal entregó POST create/GET original válido en `APPROVAL_PENDING`; el webhook firmado `BILLING.SUBSCRIPTION.CREATED` se consultó de nuevo vía `GET /v1/notifications/webhooks-events/{id}` y `resource.id` coincidió EXACTAMENTE con la solicitud owner-bound; el GET del recurso `/v1/billing/subscriptions/{id}` devuelve `404 RESOURCE_NOT_FOUND`; inventario por plan y sin filtros no muestran la solicitud; el Product Owner verificó 0 ACTIVE/UNPAID y no movimientos entre 17–18 oct en cuenta Business, sin cambios de credenciales. **No atribuir estado terminal al recurso por ausencia en inventario**: las APIs no garantizan que el objeto sea permanentemente no cobrable, y no hay un `CANCELLED`/ `EXPIRED` verificado para ese ID.

**Postflight 2026-10-18 read-only:** 1 V2 original, **0** retries, **0** private retry grants, **0** payment entries, **0** paid periods, 1 evento `CREATED` sigue `pending`, P05 worker `enabled=false`. Las reglas actuales exigen `merchant_terminal_verified`, `all_transactions_reconciled`, `webhook_inbox_reconciled`, `no_outstanding_charge`, `no_collectible_subscription`, `merchant_scope_verified` + digest auditable antes de un grant. Ninguna de las dos listas, ni el 404, justifica marcar estos booleanos true sin evidencia independiente. **No rellenar flags inventados**, no forzar `processing_state=processed`, no crear `retry_grants` ni nuevos PayPal POST. Live/main intactos.

**Decisión de diagnóstico:** detener el bucle de pruebas repetidas en PAZO. Para resolver el estatus real del subscription ID, escalar como inconsistencia de proveedor a PayPal Merchant Technical Support, adjuntando por canal seguro: ID de suscripción, ID de webhook `CREATED`, plan y momento UTC de 2026-10-17 ~19:41, evidencia de GET inicial válido y de 404 posterior y respuesta censada de inventarios. No incluir credenciales, secretos, payer PII ni IDs privados de suscripción en GitHub; recuperarlos del backend únicamente para el soporte autorizado. PayPal documenta soporte en `https://www.paypal-support.com/` (PayPal developer technical troubleshooting). Alternativa para seguir probando otros casos funcionales sin tocar el huérfano: **cuenta QA Sandbox descartable distinta** con nuevo consentimiento, pero requiere gate y PO GO separados; no equivale a solucionar la recuperación del mismo owner.

**Marcador:** `F16_ORIGINAL_CREATED_CORRELATED_PROVIDER_SUB_404_ABSENT_FILTERED_AND_UNFILTERED_NO_PAYMENT_RETRY_UNSAFE_VENDOR_DISPOSITION_REQUIRED`.

---

**Actualización 2026-10-18 (read-only, sin nuevos pagos):** PayPal API `GET /v1/billing/subscriptions` documenta `plan_ids` opcional, por lo que ausencia V2 del inventario filtrado NO cubría inventario completo. Publicada Edge Sandbox QA **v14 JWT ON** con lector independiente sin plan/status filtros, paginación protegida y diagnóstico dual en `audit_retry_inventory`, UI botón «Investigar suscripción en PayPal». CI+4 PG17 PASS; hosted 0 reintentos/grants/pagos/periodos, CREATED sigue `pending`, worker P05 OFF. Falta resultado real owner Auth; no modificar inbox, no declarar noncollectible ni conceder grant por ausencia. Detalles `docs/F16_V2_UNFILTERED_MERCHANT_RECONCILIATION_20261018.md`.

**Evidencia nueva — 2026-10-18:** QA real en PAZO desde Edge Sandbox v13 dio mensaje `created_event_matches_bound_subscription`: webhook firmado PayPal `BILLING.SUBSCRIPTION.CREATED` correlaciona exactamente al ID de la suscripción V2 guardada. Postflight solo lectura: 1 original, 0 reintentos/grants/pagos/períodos/activaciones, 0 webhooks sale posteriores a la creación, 1 CREATED `pending`. Confirmado **CREATED**, NO aprobación/pago/terminal/no-cobrabilidad; suscripción GET todavía 404. No repetir esta prueba ni merchant/credenciales al PO. Siguiente paso: conciliación de posible cobro futuro e inbox, sin mutar por 404 ni por screenshot. Referencia `docs/PAZO_ACTIVE_HANDOFF.md`.

**Estado autorizado 2026-10-18:** el PO aprobó instalar la nueva RPC de solo lectura y publicar únicamente el diagnóstico de webhook firmado. **RPC instalada con ACL service_role only** y Edge `f16-paypal-supporter-v2-qa` **v13 ACTIVE, JWT ON**, código `audit_created_webhook` habilitado; UI de botón «Verificar origen de solicitud» en PR #44, aún sin sincronizar Vite local. Postflight 1 candidato, 1 CREATED `pending`, 0 reintentos, 0 grants, 0 pagos y 0 activaciones. CI+4 PG labs PASS. **No equivale a conciliar el evento ni a confirmar su ID de PayPal**: el GET externo real debe ejecutarse en una sesión Auth QA. Aunque correlacione, 404 no demuestra cancelación, no se habilita otro intento y la conciliación financiera sigue pendiente. No volver a pedir credenciales y merchant ya confirmados por PO.

**Conciliación CREATED propuesta 2026-10-18:** hay 1 webhook `BILLING.SUBSCRIPTION.CREATED` de inbox verificado `pending`, dentro de ~9.32 s del intento original, pero aún sin coincidencia `resource.id` validada. Preparados reader GET PayPal del evento + RPC de candidato owner-bound de solo lectura + acción Edge QA **OFF** para verificar ID sin conservar payload del pagador. Migración `20261018190000_f16_v2_created_webhook_candidate_readonly.sql` **NO APLICADA**, deploy Edge NO efectuado, 5/5 CI+PG labs PASS. Para instalar/mover gate pedir autorización PO nueva; incluso correlación positiva de CREATED **NO** es estado terminal, pago ni permiso de retry y no cierra la deuda del inbox. Detalle en `docs/F16_V2_CREATED_WEBHOOK_RECONCILIATION_20261018.md`.

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

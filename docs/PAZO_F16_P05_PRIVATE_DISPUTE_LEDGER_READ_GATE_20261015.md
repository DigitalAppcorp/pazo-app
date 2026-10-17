# PAZO F16-P05 — Consulta privada de venta y titular para disputas (DRAFT)

**Fecha:** 15-oct-2026. **Aprobación PO «ok sigue»:** diseñar, probar y dejar preparada la lectura privada; **no** aplicar SQL a Supabase alojado, no desplegar workers ni capturar nuevas disputas, no operar con PayPal Live, no crear compradores, cuotas, ledger o beneficios. Rama `f13/section-titles-20261012`, PR #44 DRAFT. PAZO base gratuito.

## Evidencia real verificada, solo lectura

La estructura alojada ya contiene todo lo necesario para una búsqueda mínima: `supporter_private.paypal_payment_entries.external_payment_id` (PK), `external_subscription_id`, `owner_id`, `plan_id`, `currency`, `gross_minor_units`, `entry_state`; `supporter_private.paypal_subscription_intents.external_subscription_id` (UNIQUE), `owner_id`, `state`, `bound_at` y `provider`.

**El ledger alojado sigue en cero filas.** No permite demostrar que una disputa real pertenece a PAZO y tampoco demuestra que sea ajena. No hay necesidad de inventar una venta o replay del buyer histórico.

Los dos registros privados mantienen RLS/FORCE; los roles de frontend no pueden consultar directamente sus tablas. Este gate solo requiere lectura acotada.

## Diseño de implementación, NO desplegada

En `supabase/drafts/f16_p05_dispute_private_ledger_read_DO_NOT_APPLY.sql` se crearon **dos funciones SQL sin escrituras**, bajo una guardia que solo permite PostgreSQL desechable (`f14_synthetic`, sesión `f14_admin`, rol `postgres`). El DRAFT vive fuera de `supabase/migrations`:

1. `public.f16_p05_draft_read_pazo_payment_by_sale(seller_transaction_id)`: solo encuentra una venta con PK coincidente y forma segura; coteja plan aprobado, USD 2.99, estado `uncredited/blocked_reversal`, owner/sub válida y una intención `bound` del mismo dueño. Proyecta ID venta/sub/owner/plan/importe/estado, **sin payer, contacto, raw evento o meses de servicio**.
2. `public.f16_p05_draft_read_bound_intent_for_sale(subscription_id,expected_owner_id)`: requiere **también** el UUID del dueño recuperado del ledger; busca la intención vinculada y verifica que exista una entrada de ledger bajo el mismo owner/plan/sub. Devuelve solo intent ID, sub, owner, provider, plan y state. Una sub ID de otro usuario o un owner NULL produce respuesta NULL.

Ambas funciones: `SECURITY DEFINER`, `search_path=''`, `EXECUTE` explícito **solo service_role**, `REVOKE ALL` a `PUBLIC/anon/authenticated` dentro de la misma transacción. No se añaden grants de SELECT a las tablas privadas ni políticas permisivas. Como alternativa futura preferible, mover funciones de uso interno a un esquema no expuesto con conexión privada cuando exista una infraestructura de worker capaz de llamarlas sin PostgREST público. La `service_role` debe permanecer exclusiva del backend.

**Nota de alcance:** se usa `POST /rest/v1/rpc/...` únicamente para invocar una función de lectura SQL; **no equivale a registrar un pago**. Los argumentos vienen de una lectura PayPal autenticada en el worker, nunca del navegador. El control de token del webhook firmado, la correlación de la venta y la revisión legal de retención aún no están habilitados en un worker alojado.

Nuevo adaptador `supabase/functions/f16-paypal-webhook/p05ServerOnlyDisputeLedgerReaders.mjs` prepara las dos llamadas RPC contra el proyecto Supabase Sandbox fijo, acepta solo clave de servidor inyectada, verifica y minimiza los resultados y transforma fallos en códigos controlados. **Inactivo, todas sus pruebas usan fetch simulado, ninguna credencial real**.

`p05OfflineDisputeScopeResolver.mjs` ahora entrega `expectedOwnerId` del pago a la segunda lectura, evitando consultar intenciones por sub ID sin titular esperado. Aun con match completo, solo produce `confirmed_pazo` como clasificación de origen, **sin `cycleVerified`, `paidThrough`, `processed` ni beneficios**.

## Pruebas y protección

- `p05-dispute-private-ledger-security.sql`: RPC service-only, search_path vacío, RLS/FORCE, sin SELECT directo y sin overloads.
- `p05-dispute-private-ledger-synthetic.sql`: ledger vacío → NULL; venta correcta; reverso bloqueado; intent BOUND; propietarios/subs cruzados; venta huérfana; owner inválido; cambio de bound_at; USD/importe incorrectos; estado financiero inválido; sin período ni crédito. Todo se revierte al terminar.
- `f16P05ServerOnlyDisputeLedgerReaders.test.mjs`: URL fija, forma exacta de JSON, secretos fuera de la respuesta, inputs no autorizados, payload cruzado, errores sanitizados y mock de la cadena PayPal→ledger→intent.
- `.github/workflows/ci.yml`: ejecución exclusivamente con PostgreSQL 17 desechable, sin Supabase hosted ni PayPal real.

## Siguiente gate y límites

La consulta no resuelve automáticamente el bloqueo de **retención de disputas P01–P04/P09** ni el problema de ledger vacío. Tampoco habilita webhooks de disputa ni garantiza historia financiera completa. Antes de registrar eventos de disputa debe existir atribución real y supervisión de respuestas 503; se mantienen por defecto `disputeCaptureApproved=false` y el SQL `DO_NOT_APPLY`.

**Requiere GO PO por separado** para convertir el borrador en migración formal, aplicar SQL al proyecto alojado, desplegar el backend de lectura, configurar PayPal, activar captura y, mucho después, revisar cualquier acreditación de servicio. Los 8 eventos históricos QA permanecen excluidos. F16 pagos públicos NO-GO.

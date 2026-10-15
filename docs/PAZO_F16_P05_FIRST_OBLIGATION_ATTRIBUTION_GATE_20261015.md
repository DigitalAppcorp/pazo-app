# PAZO F16-P05 — Primer cargo regular y obligación contractual

**Fecha:** 2026-10-15. **Estado:** gate prospectivo de razonamiento OFFLINE, sin instalación ni cobranza. PO «ok go» para avanzar el análisis de primera mensualidad y reversals; **NO** autoriza migración alojada, PayPal nuevos, ledger, beneficios, checkout, Live, merge ni despliegue. Rama `f13/section-titles-20261012`, PR #44 DRAFT.

## Hallazgo confirmado en PayPal (Subscriptions REST v1)

- PayPal permite que un pago fallido se reintente; si no se recupera, puede sumarse como saldo pendiente a un ciclo posterior. Los reintentos pueden producir ventas que NO abonan el ciclo actual. Fuente actualizada 14-sep-2026: https://developer.paypal.com/subscriptions/payment-failure-retry/
- `billing_info.failed_payments_count` mide fallos **consecutivos** y puede regresar a 0 tras un cobro. Cero no prueba que jamás falló. Fuente: https://developer.paypal.com/api/subscriptions/v1/definitions/subscription/
- El listado `GET /v1/billing/subscriptions/{id}/transactions?start_time=...&end_time=...` ofrece transacciones, `total_items`, `total_pages` y enlaces; las transacciones identifican `id/status/time/gross_amount` pero no un `cycle_key` directo. Fuente: https://developer.paypal.com/api/subscriptions/v1/subscriptions-transactions . La consulta histórica Sandbox anterior careció de metadatos suficientes de cobertura: **no certificar exhaustividad, ni repetir el buyer**.
- `PAYMENT.SALE.COMPLETED` del webhook + GET merchant permite verificar que `resource.id` == `transaction.id` y `resource.billing_agreement_id` == sub id. **Solo acredita correlación, no el ciclo pagado.** Fuente y código: `p05SourceSaleCorrelationLab.mjs`, `f16SandboxSaleWebhookComparator.mjs`.

## Decisión de implementación sugerida: obligación PAZO propia, no `cycle_key` inventado de PayPal

El modelo contractual de producto ya aprobado por PO para futuras altas define el **primer período** `[activación merchant, próxima factura PayPal observada en esa activación)`, siempre condicionado a la aceptación previa y al cobro correspondiente. No se debe usar como prueba financiera per se: es una **obligación de servicio de PAZO** cuya liquidación se investiga por las ventas autenticadas.

En vez de esperar un ID de ciclo que la API consultada no proporciona, asignar PAZO una **obligación interna ordinal 0** ligada inmutablemente a `intent_id` y `subscription_id` de una nueva suscripción: creada como obligación contractual prospectiva, **todavía NO pagada**. Una nueva obligación distinta surgirá solo bajo futuras reglas de renovación aprobadas. Las referencias y términos contractuales no se pueden crear retrospectivamente para la única QA Sandbox cancelada.

### Condiciones conservadoras que permitirían presentar un **candidato** al primer cargo, NO conceder derechos

1. Existencia de términos de PAZO firmemente versionados y aceptados antes del `POST /subscriptions`; owner Auth validado servidor, intent BOUND, PayPal plan/sub merchant GET con MONTH/1 USD2.99, quantity1, NO overrides, NO trials y setup fee explícitamente 0.
2. Snapshot merchant en activación con `activationAt` y próxima facturación `next_billing_time` efectivamente observada, posterior a activación, coherente con términos. Nunca `+30 days` ni zona horaria inventada.
3. Una sola venta `COMPLETED` USD2.99 cuyo ID y subscription coinciden en PayPal GET event y transactions, registrada tras creación y antes de siguiente facturación. La venta puede preceder al webhook `ACTIVATED` algunos segundos; **no** exigir orden cronológico falso.
4. La lectura merchant del historial desde **creación original de la sub** hasta la instantánea de revisión debe ser suficientemente completa: **exactamente una transacción** en ese tramo; `total_items=1`, `total_pages=1`, sin `next`, una fila cuyo sale ID sea el mismo. Si los campos están ausentes, rechazar (datos completos no se inventan). Aun así solo se garantiza el tramo solicitado, no vida entera de la suscripción ni futuro.
5. Historial de eventos de ciclo PayPal desde creación hasta la revisión correlacionado con el signed inbox y recuperado de merchant, sin `PAYMENT.FAILED`, retry/suspensión, deuda saldada, refund, reversals o disputes; el simple `failed_payments_count=0` no alcanza. Si el inbox no puede demostrar cobertura **completa del período** y disponibilidad de eventos merchant, revisar manualmente.
6. `outstanding_balance` comprobado exactamente 0 y `setup_fee` exactamente 0: ausencia de dato es desconocido, no 0; `regularCyclesCompleted=1` ayuda a evaluar, **no** demuestra aplicación al primer ciclo sin el resto. `auto_bill_outstanding` puede estar activo; sin una historia suficiente, ningún snapshot evita falsa imputación.
7. Revisión financiera de refunds/disputas/reversals realizada de forma independiente **hasta el momento de la decisión**; la ausencia permanente de reversals futuros no puede demostrarse. Los eventos posteriores tendrían que actualizar el estado según P06 aprobado cuando exista infraestructura autorizada.
8. Una sola obligación primera por sub, un solo sale ID, transacciones e inbox deduplicados, futuros permisos y ledger con no duplicación atómica. Los FKs compuestos en el DRAFT SQL prueban solo integridad de IDs, no PayPal autoría ni tipo del ciclo.

**Resultado actual:** `CLEAN_FIRST_CHARGE_CANDIDATE_ONLY` bajo hechos simulados y completos, y `REVIEW_REQUIRED` para cualquier información incompleta. Ninguna de estas salidas es un estado de pago autorizado, período probado o beneficio activo.

## Código y pruebas

`supabase/functions/f16-paypal-webhook/p05FirstRegularObligationLab.mjs`, tests `src/features/supporter/testing/f16P05FirstRegularObligationLab.test.mjs`.

Inputs cerrados: `contract`, `plan`, `transactionHistory`, `webhookJournal`, `financialReview`. Se contrastan forma/canonical UTC/orden, venta única, alcance del historial y contadores, trial/fee/overrides, evento de fallo/reembolso/suspensión/disputa, duplicaciones y PII.

**Limitación de seguridad de diseño:** `source` y `coverage:'complete'` en estos datos son **simulados, no prueba de procedencia**. Los modelos NO realizan OAuth ni verifican firma del webhook. `sourceAttestedByThisCode:false`, `regularChargeAttributedByThisCode:false`, `cycleVerified:false`, `periodStart:null`, `paidThrough:null`, `mayRecordPayment:false`, `mayGrantBenefits:false`, `dbWrites:0` **siempre**, incluso en escenario positivo. No importar el módulo al checkout, worker, Edge desplegado ni procedimientos de SQL financiero.

## Gate de integración y decisiones pendientes

- **Mayor obstáculo real**: demostrar el historial de fallos y operaciones de PayPal suficiente para diferenciar el primer cobro regular de retry/importe por deuda; inbox actual solo guarda ID/tipo (8 pending históricos), no garantía de historial completo para futuros cronogramas. Implementar una bitácora de eventos verificados **desde el primer momento de la suscripción futura**, con fuente PayPal recuperable, idempotencia, alertas de lag y revisión de out-of-order, una vez autorizada la retención/RPC. Para cuentas con cualquier brecha: `REVIEW_REQUIRED`, no inferencias.
- **Reembolsos/disputas**: requerir APIs y eventos adicionales y plan de reconciliación periódica hasta decidir qué considerar sin conflictos; ninguna lectura sola establece ausencia a futuro. Pasivo financiero para ledger requiere revisión contable/retención.
- **Política de retención**: CA BPC §17602(a)(6) mínimo de consentimiento ya documentado, pero para ledger, refunds, disputes, datos de usuario eliminado y backups falta aplicar asesoría legal/contable por clase. No reusar retention de inbox como norma universal.
- **Operación**: no hay términos legales finales ES/EN, cancelación online, confirmación conservable, ni permiso de insert real. El DRAFT SQL está bajo `supabase/drafts/*DO_NOT_APPLY.sql` protegido; seguir PR#44 DRAFT, payments NO-GO. Tras pruebas y revisión de alcance, solicitar gate **específico** de PO para preparar migración formal y, separadamente, **aplicarla** en hosted.

**Resultado:** el concepto de una primera obligación de PAZO evita exigir un campo PayPal inexistente, pero no elimina el deber de demostrar un pago inequívoco y honrar reversals. No fingir que este gate quedó listo para producción.

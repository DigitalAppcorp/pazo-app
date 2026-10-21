# PAZO F16-P05 — Paquete de decisiones para retención y liberación técnica

**Fecha:** 2026-10-15 · **Estado:** PREPARADO PARA REVISIÓN, NO APROBADO · PR #44 DRAFT.

El PO indicó «ok go» para avanzar preparación técnica y pruebas. Este permiso **no significa** aprobación legal, contable, de retención ni autorización de aplicar migraciones al Supabase alojado, desplegar Edge, configurar webhook PayPal, procesar eventos QA, cobrar, otorgar beneficios o habilitar borrado automático.

## Entregable técnico

Registro machine-readable: `docs/PAZO_F16_P05_RETENTION_DECISION_REGISTER_20261015.json`.

- Incluye P01 (aceptación), P02 (ventas/contabilidad), P03 (disputas/reversos), P04 (inbox firmado), P05 (logs), P06 (solicitudes de privacidad), P07 (backups y bajas) y P09 (avisos y acuses).
- Cada categoría lleva finalidad, alcance, mínimo a revisar, condición de hold y borrado exclusivamente mediante revisión por clase.
- La aplicabilidad California ARL / CCPA figura **condicionada**, nunca como deber universal. P01: California BPC §17602(a)(6), tres años desde aceptación o un año tras terminación, mayor plazo, para contratos comprendidos en la norma. P06: 11 CCR §7101, mínimo 24 meses para registro de solicitudes/respuestas **solo si CCPA resulta aplicable**; P02/P03/P04 no reciben un plazo uniforme artificial.
- Las cinco revisiones que faltan (jurídica, fiscal/contable, privacidad, aprobación específica PO y backups) están en `pending`, sin firmas ni nombres inventados.
- Controles `disputeCaptureApproved`, `financialDeletionApproved`, `bulkDisputeImportApproved`, `retentionPolicyEffective`, `serviceRoleDeploymentApproved`, `mayGrantBenefits` = **false**, `paidThrough=null`.

El auditor `src/features/supporter/testing/p05RetentionDecisionRegisterAudit.mjs` y tests `p05RetentionDecisionRegisterAudit.test.mjs` comprueban el registro real y rechazan la manipulación de categorías, plazos, alcance merchant y banderas. **La salida máxima es `REVIEW_PACKET_PREPARED_NOT_APPROVED`, sin capacidad de autorización**, aun si alguien modifica manualmente el JSON. El auditor no es un lector de aprobaciones autenticadas y no debe conectarse a la captura real como fuente de permisos.

## Mejora defensiva independiente

En `supabase/functions/f16-paypal-webhook/core.mjs` (únicamente en rama, sin despliegue) ya no existe la salida `200 verified_non_pazo_dispute` basada sólo en que un callback diga `outside_pazo`. El resolutor actual solo puede clasificar `confirmed_pazo` o `unknown`, y **no puede demostrar independientemente que una operación es ajena a PAZO** cuando el ledger está vacío. Por eso, un supuesto `outside_pazo` provoca `503 dispute_scope_unverified` y no se persiste; se requiere vigilancia de reintentos futuros.

Ninguna disputa pasa al inbox salvo después de firma PayPal, gate de captura verdadero, aprobación real de privacidad/retención independiente y correlación privada PAZO demostrada. **Todos los gates operativos siguen en OFF**, y el receptor Sandbox alojado no se modificó. Esto evita afirmar falsa ausencia de disputas u ocultar eventos dudosos con respuestas 2xx.

## Resoluciones externas necesarias antes de la instalación

| Gate | Decisión documentable | Autoridad / evidencia | Actual |
|---|---|---|---|
| G1 | Confirmar si CA ARL y CCPA aplican a oferta y entidad; requisitos de aceptación, avisos, cancelación y prueba conservable | Asesoría legal y producto | PENDIENTE |
| G2 | Definir conservación contable P02 por ejercicio, tipo de ingreso, refunds, disputas y prescripción fiscal | Contador/asesor fiscal | PENDIENTE |
| G3 | Definir supresión/anonimización P03/P04/P05/P07, eliminación de cuenta, backups, alcance de merchant ajeno, hold y alarmas 503 | Privacidad, seguridad, operaciones | PENDIENTE |
| G4 | Verificar fuentes auténticas de aprobación, versionadas y auditables, sin booleanos de frontend o variables arbitrarias | Backend privado + PO específico | PENDIENTE |
| G5 | Autorizar **con alcance y rollback propios**, secuencialmente: migración SQL Sandbox, Edge Sandbox OFF, configuración de eventos PayPal, activación de recepción | PO por acción concreta | PENDIENTE |

**Recomendación técnica de ejecución:** no generar ninguna fuente que devuelva `verifyDisputeRetentionRelease=true` mientras G1–G4 no estén aprobados y atestados. Incluso después, éxito de pruebas no prueba `paidThrough` ni autoriza Entitlements, Live o cobros.

**Registro real al último checkpoint:** un intent BOUND, 8 eventos QA pending, 0 pagos ledger, 0 reversals. Los ocho eventos históricos no deben reclamarse ni eliminarse. No se ha ejercido ni decidido el borrado de registros.

Fuentes: [California BPC §17602](https://law.justia.com/codes/california/code-bpc/division-7/part-3/chapter-1/article-9/section-17602/), [11 CCR §7101](https://www.law.cornell.edu/regulations/california/11-CCR-7101), [IRS records](https://www.irs.gov/businesses/small-businesses-self-employed/how-long-should-i-keep-records), `docs/PAZO_F16_P05_PRIVACY_RETENTION_OPERATIONAL_GATE_20261015.md`.

**No hubo cambios hosted, PayPal real, datos financieros, borrado ni activación de beneficios.** Esta documentación identifica lo que puede revisarse y lo que todavía no está autorizado.

## Gate prospectivo 2026-10-16 — alcance y retención sin duplicar

**Estado técnico:** inventario completado; NO equivale a aprobación G1 legal/contable, no cambia `docs/PAZO_F16_P05_RETENTION_DECISION_REGISTER_20261015.json`, firmas, captura alojada, política de borrado ni cobros. PR #44 DRAFT.

### Decisiones que YA EXISTEN y no se deben reabrir

1. P06-A–E del Product Owner: cancelación de renovación no elimina por sí sola un primer período pagado y verificado; pago fallido no concede cobertura; refund parcial se congela para revisión; refund total afecta al ciclo devuelto; disputa abierta suspende nuevas acreditaciones, sin presumir fraude.
2. El inbox firmado tiene retención de **90 días únicamente después de conciliación definitiva y liberación de `retention_hold`**. No se extiende ese TTL a ledger, disputas, consentimientos ni logs.
3. California BPC §17602(a)(6): cuando la ley resulte aplicable, verificar consentimiento afirmativo durante **al menos tres años desde consentimiento o un año después de terminar el contrato, lo que sea mayor**. No confundir esta duración con la de transacciones, archivos de disputas o datos sociales. Archivo inmutable de términos y SHA/versión/fecha deben permitir reconstruir la aceptación; adecuación jurídica final pendiente.
4. El mecanismo de ámbito de disputa ya está preparado: `p05SandboxDisputeMerchantReaders.mjs`, `p05OfflineDisputeScopeResolver.mjs`, `p05ServerOnlyDisputeLedgerReaders.mjs`, `f16_p05_dispute_private_ledger_read_DO_NOT_APPLY.sql` y los tests correspondientes. Una firma PayPal no demuestra que el cargo pertenece a PAZO. Se requiere `disputed_transactions[].seller_transaction_id` autenticado, venta de ledger privado PAZO e intento BOUND coincidente por owner/sub. Ledger alojado vacío => `unknown`, nunca `outside_pazo` o `confirmed_pazo`.
5. La captura está APAGADA; `disputeCaptureApproved=false`; en rama `core.mjs` se bloquea por privacidad/retención, mientras en runtime la entrada de disputas sigue fuera del allowlist. No ejecutar el SQL de laboratorio, no redeplegar para forzar procesado.

### Decisiones realmente pendientes para G1 y futura operación

| Objeto | Falta revisión de | Propuesta conservadora mientras se resuelve | No afirmar |
| --- | --- | --- | --- |
| P02 ventas/ledger/reembolsos | Asesor fiscal/contable: tipo de prueba tributaria, jurisdicción, inicio de reloj, períodos de reclamación | Sin job de purga, mínimo privado y holds trazables; diseñar vencimiento caso por caso después de revisión | Que un plazo general de 3 o 7 años cubre todas las categorías |
| P03 dispute/refund case | Legal/privacidad: finalidad, datos mínimos necesarios, case close/appeals, reversos, backup | No guardar `resource` bruto, email, mensajes ni documentación del comercio; vincular solo a transacción PAZO verificada | Que un listado vacío hoy excluye disputas futuras |
| P04 inbox / servicio | Operaciones: esquema de atribución, firma, `503` y reintentos agotados, alerta y recuperación | Ningún ACK `200` `outside_pazo` basado en ausencia de registro; sin capturas nuevas hasta resolver | Que devolver `503` garantiza reentrega o archivo |
| P07/P09 backups/acuse | Legal y proveedor de backups: borrado, aislamiento tras baja, retención consentimientos, reconstrucción de versión ES/EN | Retención por clase con controles de acceso; no borrar en cascada, no reactivar cuentas | Que borrar perfil elimina obligaciones financieras o datos en PayPal |
| Oferta real ES/EN | Producto/legal: regla contractual primer ciclo, cargos/impuestos reales, acceso directo a cancelación, envío/acceso a acuse, avisos | Borrador `src/features/supporter/offerCopyDraftP13.mjs` actualizado en rama con `[activation_time, observed_next_billing_time)` explicado en ambos idiomas, **no publicado**, sin poderes de checkout | Que el consentimiento QA `pazo-supporter-sandbox.qa20261016-v1` autoriza beneficios o servicio de pago |

**Nota de fuentes:** la guía actual de PayPal Disputes documenta consulta del caso y webhooks; una firma verifica procedencia, pero la pertenencia a PAZO requiere correlación interna independiente. Fuentes: https://developer.paypal.com/api/disputes/ , https://www.oag.ca.gov/news/press-releases/attorney-general-bonta-issues-consumer-alert-california%E2%80%99s-automatic-renewal-law , https://law.justia.com/codes/california/code-bpc/division-7/part-3/chapter-1/article-9/section-17602/ , https://www.irs.gov/businesses/small-businesses-self-employed/how-long-should-i-keep-records .

### Secuencia de ejecución sin ampliación innecesaria

- Reutilizar código/SQL/tests de disputa existentes; no crear otro resolver ni otra tabla.
- Obtener decisiones G1 documentadas de legal, tax/accounting, privacidad/backup y aprobación PO según el registro ya existente. Ningún `ok go` técnico las suplanta.
- Separadamente preparar una **oferta nueva** con período de servicio efectivo, beneficios realmente implementados y aprobación ES/EN; jamás modificar retroactivamente los términos QA inmutables.
- Solo después y bajo GO técnico nuevo: migración/Edge/PayPal webhook/captura Sandbox con scope exacto, control de reintentos, y rollback. Un GET de disputes con `items=[]` solo prueba un instante; plantear `coverageAsOf` más monitoreo y compensación bajo revisión, no certificación eterna.

**Salida:** `G1_RETENTION_AND_DISPUTE_SCOPE_DOCUMENTED_REVIEW_REQUIRED`; `disputeCaptureApproved=false`; `financialDeletionApproved=false`; `mayRecordPayment=false`; `mayGrantBenefits=false`.

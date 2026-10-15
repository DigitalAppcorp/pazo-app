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

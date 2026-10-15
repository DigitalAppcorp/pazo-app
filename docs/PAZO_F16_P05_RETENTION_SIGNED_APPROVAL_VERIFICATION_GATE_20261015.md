# PAZO F16-P05 — Firmas verificables para revisión de retención (NO-GO)

Fecha: 2026-10-15. Rama f13/section-titles-20261012, PR #44 DRAFT. Autorización PO: continuar diseño y pruebas, no aprobar política legal ni activar backend, cobros o beneficios.

## Qué fue implementado

Módulo offline: src/features/supporter/testing/p05SignedRetentionReviewAudit.mjs. Test: src/features/supporter/testing/p05SignedRetentionReviewAudit.test.mjs.

Verifica con WebCrypto Ed25519 un paquete hipotético de revisión de la política P05. Vincula las firmas a cinco roles independientes: legal, taxAccounting, privacy, productOwnerClassApproval y providerBackups. Las firmas cubren entorno Sandbox, finalidad exacta dispute_intake_minimal, versión, huella SHA-256 de política conocida por fuente externa confiable, fechas de validez y los tres eventos de disputa. El keyring público debe venir del servidor, no del paquete aportado por alguien. La validez del paquete sintético expira tras treinta días como máximo; esto NO establece un plazo legal de conservación.

Las pruebas generan sus propias claves efímeras; no existen firmas de profesionales reales ni decisiones administrativas aprobadas. Casos que se rechazan: huella/versión alterada, sustitución de roles/clave, firma reutilizada, eventos agregados, Live, pérdida de firmante, documento malformado, fecha vencida y errores del motor criptográfico.

El mejor resultado posible es SIGNATURES_VERIFIED_REVIEW_ONLY. Incluso cinco firmas válidas mantienen independentLegalApprovalConfirmed=false, currentNonrevocationConfirmed=false, policyOperationallyApproved=false, mayReleaseCapture=false, mayDeleteFinancialRecords=false, mayRecordPayment=false, mayGrantBenefits=false y paidThrough=null. El auditor no tiene imports en el receiver alojado, ni es una implementación de verifyDisputeRetentionRelease, ni devuelve un booleano de GO.

## Lo que falta para una autorización real

1. Decisión legal y contable aplicable a P01-P09; términos, acuses, holds, eliminación y backups con revisión del PO. El registro actual docs/PAZO_F16_P05_RETENTION_DECISION_REGISTER_20261015.json continúa DRAFT_REVIEW_ONLY, todas las revisiones pendientes.
2. Comprobar profesional/autoridad de cada firmante y establecer claves custodiadas, rotación, segregación y revocación.
3. Fuente privada duradera de política efectiva, digest inmutable, estado/revocación y auditoría. Sin esto NO se puede convertir firmas válidas en aprobación operativa ni implementar el callback que devuelve true.
4. Separar aprobaciones de datos de los GO técnicos: migración SQL Sandbox, deploy Edge Sandbox con captura OFF, webhooks PayPal y activación final. Actualmente ledger hosted tiene cero pagos; las disputas sin venta PAZO verificable siguen unknown y no deben recibirse como confirmadas.
5. Para una futura migración, comprobar grants explícitos, esquemas expuestos y RLS. Supabase anunció cambio de grants por defecto para proyectos existentes el 2026-10-30: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically

Este módulo es evidencia de integridad de posibles firmas, no una certificación legal ni autorización de despliegue. PAZO core gratis. F16-P05 y pagos públicos NO-GO. Ningún evento histórico o ledger cambia.

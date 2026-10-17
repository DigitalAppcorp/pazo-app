# F16-P30 — conciliación de seguridad y ruta financiera prospectiva
Fecha: 2026-10-15. Estado: LAB ONLY / NO-GO hosted.

## Validación
- Commit 97f4668: CI general SUCCESS (38852591795).
- PostgreSQL descartable SUCCESS (38852591714).
- P26 ya incorpora esquema de créditos bloqueados, controles de unicidad por venta y obligación, trigger de integridad con reserva P25, y pruebas de concurrencia.
- P30 agregó ensayo que impide considerar disponible una actualización directa por service_role; ninguna fila de pagos queda acreditada por este ensayo.
- P29 realiza correlación simulada Sale/event/refunds/disputes; resultados siempre REVIEW_REQUIRED, nunca prueba financiera completa.

## Gate real hacia un pago legítimo
1. P06: términos ES/EN publicados con aceptación original duradera y atribuible al dueño.
2. P21/P22: claim de evento firmado con cutoff prospectivo y lease exclusivo.
3. PayPal Sandbox: fuente merchant autenticada de venta, ciclo e historial de reembolsos/disputas; no sustituir ausencia de registros por prueba de cobertura total.
4. P25: reservar primera obligación contractual sin duplicados y con propietario exacto.
5. Ledger: transacción idempotente y compensable vinculada a evidencia de proveedor y contrato; definir períodos y políticas de reversión antes de cualquier escritura real.
6. Revisión de privacidad, retención, alcance y permisos. PO GO **separado** para DDL hosted, buyer sandbox, checkout, worker y beneficios.

## Decisión operativa
No duplicar P26 ni diseñar una segunda tabla de pagos solo por avance incremental.
Priorizar reconciliación entre evidencias mercantiles P29 y claim contractual P24/P25,
y pruebas negativas de origen, refunds incompletos y períodos ambiguos.
No activar pagos ni beneficios; P28 permanece diferido.

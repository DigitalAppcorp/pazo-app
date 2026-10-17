# PAZO F16-P05 — Preparación coordinada de disputas (NO DESPLEGAR)

**15 de octubre de 2026 · PR #44 DRAFT · F16 pagos NO-GO**

## Alcance y autorización

El PO indicó «ok go» para continuar con la preparación, aislamiento y verificación del gate de disputas; **no autorizó** recopilar nuevos datos reales, modificar el PayPal webhook existente, aplicar SQL hosted, activar tareas recurrentes, procesar 8 eventos QA anteriores, crear compradores, registrar dinero, habilitar checkout o conceder beneficios. Los cambios viven sólo en la rama `f13/section-titles-20261012`.

**Hallazgo original real (hosted read-only):** receptor `f16-paypal-webhook` ACTIVE v13 con firma PayPal verificada, pero el `core.mjs` instalado y `public.f16_paypal_record_verified_event` alojada no admiten `CUSTOMER.DISPUTE.CREATED/UPDATED/RESOLVED`. Un evento de disputa autenticado sería ignorado sin referencia persistida. PayPal documenta los tres: https://developer.paypal.com/disputes/test-go-live .

## Diseño de minimización y aislamiento (PROPUESTA; G1 legal pendiente)

El webhook de PayPal puede entregar disputas del comercio que **no pertenezcan a PAZO**. Firmar un evento únicamente prueba su origen, no que la operación sea de PAZO.

1. **Primero validar firma** con el mecanismo PayPal POSTBACK existente; rechazar la entrega si falla. Mantener entrada sin JWT de Supabase porque PayPal no emite un JWT de usuario PAZO; no desactivar la firma PayPal.
2. **Antes de cualquier escritura**, ejecutar una única interfaz interna `assessTrustedDisputeScope({eventId,eventType})` que **NO recibe cuerpo bruto, correo, mensajes, ID de pagador, encabezados o tokens**. El worker interno futuro debe volver a consultar mediante OAuth Sandbox al evento concreto y, de forma selectiva, los detalles de disputa en PayPal; corroborar el ID de venta/transaction ID del comerciante con una entrada financiera PAZO verificable, vinculada al intent BOUND, sin aceptar owner/ID desde un navegador.
3. **Ausencia de prueba => no registrar ni dar ACK definitivo.** Con rollout apagado, falta de resolver, fallo de proveedor o propiedad ambigua: responder `503` retryable, sin datos personales en respuesta. Las herramientas de procesamiento deben generar alerta si PayPal deja de reintentar; un `503` no constituye preservación garantizada.
4. Si se **demuestra** que la operación pertenece a PAZO: persistir únicamente `provider_event_id`, `event_type`, `verified_at` en el inbox privado con deduplicación. No conservar `resource` completo, mensajes, motivo, email, nombre, dirección ni pruebas de disputa. Mantener `retention_hold`; el procesamiento financiero futuro sigue deshabilitado.
5. Si se **demuestra** fuera de PAZO con evidencia autenticada, responder 200 sin persistir. No considerar una respuesta arbitraria `outside_pazo` como prueba: es un contrato de interfaz **pendiente de implementar** y sólo debe montarse en un servicio autenticado.
6. **Retención P01–P04/P09:** alcance, fundamento de tratamiento, conservación legal/fiscal, condiciones de `retention_hold` y liberación, eliminación de cuenta, backups y borrados están **PENDIENTES de revisión legal/privacidad**. No inventar un período fijo de 90 días, 3 años o 7 años. Si la disputa pertenece al comercio pero no se puede atribuir a PAZO, no guardarla en el inbox PAZO; la gestión administrativa externa sigue siendo responsabilidad del comerciante.

**Limitación para pruebas reales:** el ledger PAZO tiene **0 payment entries**, así que actualmente **no puede** probarse pertenencia de nuevas disputas por referencia de venta. Los casos confirmados de PAZO en CI son mocks, no una acreditación financiera auténtica.

## Código preparado y validado SOLO en laboratorio

- `supabase/functions/f16-paypal-webhook/core.mjs` reconoce las tres clases, **pero** `disputeCaptureApproved=false` por defecto impide toda captura; requieren firma PayPal y `assessTrustedDisputeScope` (sin cuerpo bruto). Incluso con un `confirmed_pazo` inyectado en pruebas, escribe sólo ID/tipo y nunca `paidThrough`, `profile.is_founder`, suscripción ni ledger.
- `supabase/drafts/f16_p05_dispute_event_rpc_DO_NOT_APPLY.sql` conserva la implementación alojada existente de `f16_paypal_record_verified_event` y amplía exactamente los tres tipos. **Guardia dura a** `f14_synthetic`, `session_user=f14_admin` y `current_user=postgres`; no es una migración de producción. No autentica la pertenencia PAZO por sí sola: presupone entrada por receptor restringido.
- `src/features/supporter/testing/f16SafeWebhookIntake.test.mjs`: firma fallida, gate apagado, resolver faltante, ambigüedad y errores de proveedor, operación fuera de PAZO, confirmación de PAZO con event refs mínimos, deduplicación y error durable. No permite fugas del cuerpo del evento al callback.
- `supabase/tests/supporter/p05-dispute-event-rpc-synthetic.sql` + CI PostgreSQL 17 desechable: incluye autorización `EXECUTE` sólo `service_role`, `SECURITY DEFINER` search_path vacío, RLS/FORCE en inbox, inserción por primer evento, duplicados, colisión de ID/tipo y ausencia de ledger.
- `.github/workflows/ci.yml` ejecuta SQL DRAFT y pruebas en CI; ninguna conexión alojada. **CI y F16 Disposable PostgreSQL Lab SUCCESS** en commit técnico `a3db02cb145634ee8bfdddd5fa4e8b83af9aa028`. Revisar CI de cualquier commit posterior antes de afirmar verificación de HEAD.

## Secuencia segura para una eventual autorización específica

1. **G1 legal/privacidad:** aprobar propósito, retención, controles de atribución PAZO y operativa de alertas ante eventos fuera de alcance y de entregas que agotan reintentos.
2. **G2 contrato backend:** implementar de forma demostrable `assessTrustedDisputeScope` utilizando merchant GET autenticado y correlación **con ledger PAZO real**; prueba independiente de refetch, firma, redelivery, idempotencia, out-of-order y separación de otros cobros del comercio. Actualmente falta este adapter, por diseño.
3. **G3 SQL:** tras GO del PO y auditoría de locks/grants, convertir el DRAFT a migración formal mediante la CLI de Supabase, con revisión de seguridad. Aplicar sólo la RPC allowlist y comprobar metadata e idempotencia, sin activar captura.
4. **G4 Edge Sandbox:** otro GO específico para desplegar receiver con gate default disabled; comprobar versión/hash y rechazos seguros.
5. **G5 PayPal Sandbox:** comprobar previamente GET de configuración y obtener GO distinto para suscribir los tres eventos. Activar gate **sólo después** de verificar datos mínimos, scope seguro, alarma y un procedimiento de rollback. La suscripción PayPal al webhook no puede hacer la validación de propiedad PAZO por sí sola.
6. **Rollback:** desactivar gate; suspender la suscripción PayPal de nuevos eventos si fue habilitada; recuperar receiver anterior. No borrar registros bajo `retention_hold` ni suponer que PayPal reenviará eventos perdidos. Revisar conformidad de almacenamiento y decisión legal antes de purgas.

**Ninguna de estas acciones operativas fue ejecutada en este turno.** La cuenta Sandbox original cancelada, 8 eventos QA pendientes y ledger sin pagos siguen fuera de alcance. PAZO permanece totalmente gratis; el apoyo opcional continúa NO-GO.

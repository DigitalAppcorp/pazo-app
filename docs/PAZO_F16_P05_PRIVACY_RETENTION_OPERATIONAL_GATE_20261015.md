# PAZO F16-P05 — Gate operativo de privacidad y conservación de datos

**Fecha:** 2026-10-15 · **Estado:** propuesta técnica estricta; revisión legal/contable y aprobación de Product Owner **PENDIENTES**. Rama `f13/section-titles-20261012`, PR #44 DRAFT. No aplicar en Supabase alojado, no suscribir webhooks, no desplegar, no iniciar pagos ni habilitar beneficios.

## Hallazgo y alcance

El backend alojado permanece sin ledger acreditado ni procesamiento de disputas: `paypal_payment_entries` tiene 0 filas, y el receptor actual no registra `CUSTOMER.DISPUTE.CREATED/UPDATED/RESOLVED`. Los borradores P05 de claim, RPC, consultas al merchant y clasificación no son datos reales ni proporcionan un fundamento jurídico de retención. El nuevo control de privacidad es independiente del control de firma y de propiedad de la venta.

**Decisión operativa provisional — fail closed:** no incorporar ninguna nueva categoría de disputas ni crear una tarea de borrado hasta revisar finalidad, aplicabilidad, duración, preservación legal y acceso; no conservar indefinidamente por comodidad. Esta es una **medida temporal de bloqueo de operaciones**, no una decisión de mantener todos los datos para siempre.

## Matriz de registros y criterios que requiere aprobación

| P | Categoría | Mínimo técnico / finalidad | Regla de conservación a evaluar | Borrado / hold | Estado |
|---|---|---|---|---|---|
| P01 | Aceptación afirmativa de renovación y versión ES/EN de condiciones, fecha de aceptación, usuario/intención | Probar el consentimiento a una oferta concreta sin tarjeta ni IP | **Si California BPC §17602 aplica**, conservar verificación **≥3 años desde la aceptación o ≥1 año tras la terminación contractual, el período más largo**; durante contrato abierto no existe fecha de purga calculable. Un hash solo no reemplaza texto inmutable de los términos mostrados | Control de contrato terminado y holds antes de evaluar eliminación; sin job automático | Regla legal identificada; asesoría/PO pendientes |
| P02 | Referencia mínima de venta, suscripción, importe, estado y asignación | Contabilidad, idempotencia, reembolsos y seguridad | Depende del tipo de registro y de la prescripción fiscal real, reclamaciones y ejercicios; **no** fijar 3 o 7 años a todo el ledger | No eliminar mientras cargo/disputa/reclamación esté abierta; después evaluar plazo con asesor fiscal | PENDIENTE |
| P03 | Referencias mínimas de disputa PayPal y reversos, fecha y vínculo a venta PAZO | Manejo de disputas y prevención de acreditación indebida | Plazo vinculado al caso, reglas del proveedor, deberes legales y resolución confirmada; decidir después del análisis contractual | `retention_hold` activo cuando aplique, sin purga automática; no almacenar disputa de otro comerciante en inbox PAZO | PENDIENTE |
| P04 | Inbox firmado: `event_id`, `event_type`, `verified_at`, reintentos/estado | Deduplicar e investigar discrepancias | Política separada de ledger y aceptación; el TTL técnico no es período legal universal | No eliminar evento con `retention_hold` activo, sin borrar evidencias abiertas | PENDIENTE |
| P05 | Logs técnicos mínimos de webhook / worker | Diagnóstico de fallos, sin JWT, correo ni cuerpos de PayPal | Duración operativa limitada a definir; logs no sustituyen ledger ni consentimiento | Rotación/expiración controlada y redacción; no usar analytics para pagos | PENDIENTE |
| P06 | Solicitudes de privacidad y respuesta | Demostrar cumplimiento del derecho aplicable | **Si CCPA/CPRA alcanza a la entidad**, 11 CCR §7101 requiere conservar registro de solicitudes/respuestas **≥24 meses**; no equivale a 24 meses para toda la cuenta | Control de acceso, propósito exclusivo de cumplimiento y no recopilar más datos personales de los necesarios | Aplicabilidad PENDIENTE |
| P07 | Backups y eliminación de cuenta | Recuperación, obligaciones de continuidad y eliminación legal | Ventanas técnicas de retención y purga diferida por proveedor **PENDIENTES** | Borrar datos sociales elegibles sin destruir soportes financieros legítimamente retenidos; no reactivar cuenta eliminada al restaurar backup | PENDIENTE |
| P09 | Actualizaciones de términos, aviso conservable, cancelación, cambio de precio | Reconstruir lo comunicado al consumidor y la respuesta contractual | Junto al consentimiento y según tipo de prueba legal/contractual, sujeto a revisión | Solo metadata mínima más ejemplar inmutable de avisos y versiones | PENDIENTE |

P01–P04/P09 son los grupos nombrados en gates anteriores; P05–P07 distinguen otras operaciones y **no sustituyen** el inventario global de PAZO.

## Fuentes legales verificadas y límites de aplicabilidad

- California Business & Professions Code §17602(a)(6) impone el período de verificación de consentimiento indicado **a renovaciones sujetas a esa norma**. También exige consentimiento expreso, acuse conservable y cancelación online para casos aplicables: https://law.justia.com/codes/california/code-bpc/division-7/part-3/chapter-1/article-9/section-17602/
- California Civil Code §1798.100 exige, a **empresas sujetas a CCPA**, informar categorías, finalidades y duración o criterio, y no conservar más allá de lo razonablemente necesario: https://law.justia.com/codes/california/code-civ/division-3/part-4/title-1-81-5/section-1798-100/
- California Civil Code §1798.105 establece un derecho de eliminación y **excepciones acotadas** para contratos, obligaciones legales, seguridad y otras circunstancias: https://oag.ca.gov/privacy/ccpa . No convertir excepción posible en retención automática para cualquier dato.
- 11 CCR §7101 (regulación CCPA, si aplica) exige ≥24 meses para registros de solicitudes y respuestas, **no** para todo el historial social o financiero: https://cppa.ca.gov/regulations/pdf/ccpa_statute_eff_20260101.pdf
- El IRS distingue períodos de 3, 6 y 7 años o indefinidos según el supuesto fiscal; requiere asesoría para clasificar facturas, pagos y declaraciones reales, sin imponer un número fijo: https://www.irs.gov/businesses/small-businesses-self-employed/how-long-should-i-keep-records
- **No se ha determinado** si Alvarado Solutions LLC supera los umbrales o cumple otras condiciones de aplicación de CCPA. La legislación de renovación automática tiene un ámbito diferente; no equipararlas.

Este documento es una propuesta técnica/comercial para revisión, **no un dictamen legal**. Cualquier plazo adicional, modalidad de bloqueo o política de borrado necesita confirmación jurídica y, para registros fiscales, del contador.

## Cambio de seguridad implementado en la rama (NO DESPLEGADO)

La fábrica `createSafeF16WebhookHandler` ahora exige **tres barreras** antes de insertar una referencia de disputa:

1. Firma PayPal válida (boundary existente).
2. `disputeCaptureApproved===true` (apagado por defecto) **y** `verifyDisputeRetentionRelease({eventType,environment})===true` mediante callback **server-only** y sin raw payload / user ID / payer. Callback ausente, `false`, excepción o un valor no booleano produce `503 dispute_retention_not_approved`, sin llamar al resolvedor de pertenencia ni almacenar.
3. `assessTrustedDisputeScope({eventId,eventType})==='confirmed_pazo'` con comprobación merchant/ledger/owner; ante valor incierto, `503 dispute_scope_unverified`, sin aceptación 2xx ni persistencia. PayPal puede agotar reintentos: se requieren alarmas; nunca afirmar entrega garantizada.

El callback de retención **NO ESTÁ IMPLEMENTADO NI APROBADO** en el servidor real; las pruebas positivas usan un mock expresamente sintético para verificar las etapas posteriores. No existe un registro de aprobación real, ni se ha activado captura. El contratante/PO debe aprobar las categorías y criterios antes de proporcionar esa capacidad al backend. Este control no prueba por sí solo aplicabilidad jurídica ni resuelve el ledger vacío.

Las pruebas `f16SafeWebhookIntake.test.mjs` comprueban captura apagada, firma, privacidad ausente, `false`/excepción, no transmisión de contenido privado al callback, y ausencia de escritura bajo incertidumbre; los tests de resolución de disputas usan el callback ficticio `true`, sin considerar la política aprobada.

## Checklist antes de liberar cualquier captura real

**G1 legal y producto:** evaluar aplicabilidad ARL/CCPA, política de privacidad bilingüe, acuse/opt-in y cancelación, criterio por clase de datos (P01–P09), borrado/cuenta y backups, retención por soporte y archivo, holds fiscales/reclamaciones, revisión profesional.

**G2 fuente y alcance:** PayPal GET autenticado de disputa/venta, firma en ingreso, existencia de `seller_transaction_id` en ledger privado verificado, BOUND intent y propietario, registro mínimo únicamente. *Hoy* ledger de PAZO = 0: no se puede confirmar propiedad real.

**G3 operación:** runbook para 503/timeouts/retries, alertas, independencia de PayPal Webhook, retención en vendor PayPal, rollback de servicio, acceso mínimo, rotación de claves, privacidad de logs y controles de exportación y borrado.

**G4 GO técnicos independientes:** PO autoriza por separado (a) migración en Supabase Sandbox, (b) deploy Edge con bandera OFF, (c) suscripción de eventos PayPal Sandbox, (d) activar captura una vez validadas las etapas anteriores. Ningún GO implica créditos, período pagado, Live ni checkout.

**Estado de liberación:** `privacyRetentionApproved:false`, `disputeCaptureApproved:false`, `mayRecordPayment:false`, `mayGrantBenefits:false`, `paidThrough:null`, `deleteJobEnabled:false`. PR #44 DRAFT y F16-P05 continúa NO-GO.

# PAZO F16-P05 — Modelo de servicio mensual aprobado; ancla concreta en evaluación

**Decisión del Product Owner:** 14-oct-2026: «ok, hagamoslo» después de aclarar explícitamente que PAZO definirá sus períodos de servicio mensuales **coordinados con PayPal** y el usuario aceptará las condiciones al suscribirse, **sin negociar fechas individuales**. La aplicación PAZO es y continuará gratuita en sus funciones generales; esto aplica solo al aporte opcional **Amigo de PAZO**. Este GO permite **diseño y pruebas offline**, no backend alojado, PayPal Live ni acreditaciones.

## Política de producto aprobada (principio)

1. PayPal gestiona la autorización del comprador, el cobro recurrente y la cancelación de la suscripción.
2. PAZO documenta y comunica antes de la compra cómo se determinan los períodos de servicio, y conserva la aceptación/versionado al permitirlo.
3. PAZO vincula cada venta a un ciclo y solo acredita ventajas opcionales si el cobro, la obligación mensual y el intervalo se pueden verificar de modo independiente.
4. Cancelar detiene futuras renovaciones; **no** revoca automáticamente el servicio de un ciclo previamente pagado y probado. Un pago pendiente, fallido, disputado o devuelto exige reglas P06 y revisión; jamás es un «mes gratis».
5. Cobros tardíos se imputan únicamente al **ciclo que originó la deuda** con evidencia de esa imputación; no extienden 30 días por cobrar tarde. P05-L aprobado prevalece.
6. El contrato comunica una metodología mensual, no una fecha de vencimiento negociada por usuario. La UI no puede mostrar períodos no comprobados como si fueran exactos.

### Condiciones todavía NO aprobadas por implicación

- **Ancla exacta:** si se toma de fecha de cobro inicial merchant o del calendario efectivo de suscripción; el Sandbox de prueba mostró `subscription.start_time=2026-10-15T02:03:31Z` y `next_billing_time=2026-11-14T10:00:00Z`, valores que **no se alinean con un mes natural idéntico**.
- **Zona horaria y 29/30/31:** propuesta de UTC con regla de fin de mes «clamp y regreso al día original». Ej. enero 31→febrero 28/29→marzo 31. No es una semántica PayPal garantizada. Si su calendario difiere, **REVIEW_REQUIRED**; la app nunca corrige el cobro de PayPal ni fabrica cobertura.
- **Trials, cambios de tarifa, suspensiones, reactivaciones, atrasos, horarios de verano**: necesitan reglas contractuales versionadas y evidence review. De momento no acreditar.
- **Retención financiera**: P01–P04/P09 y eliminación de cuenta, RLS y plazos sujetos a gate PO y revisión legal. Ningún dato de pago se recoge por este código.

## Implementación de laboratorio terminada en rama F16, NO desplegada

`src/features/supporter/testing/p05ServiceCalendarDraftLab.mjs` expone exclusivamente cálculo UTC hipotético `calculateP05DraftUtcWindow` y evaluación `assessP05DraftCalendar`.

- Input de `policy`: versión 1, frecuencia MONTH/1, USD2.99, cuota inicial explícitamente 0, zona UTC, ancla con evidencia por demostrar, ancla original conservada y `cycleIndex` acotado; cualquier dato extra o plazo no canónico bloquea.
- Deriva fechas **únicamente como candidato interno de laboratorio**, nunca para presentar usuario o escribir paid periods.
- Compara su siguiente fecha con `observedProviderNextBillingUtc` aportada; falta o discrepancia => revisión. Coincidencia => `CALENDAR_CANDIDATE_ONLY`, **no prueba que un pago corresponda a ese ciclo**.
- Si allocation es `retry`, `outstanding_capture`, `unknown` o refund/disputa no aclarados => revisión incluso con calendario coincidente.
- Salida pública del evaluador siempre `cycleVerified:false`, `periodStart:null`, `periodEnd:null`, `paidThrough:null`, `mayGrantBenefits:false`, `mayRecordPayment:false`, `mayCreatePaidPeriod:false`; sin IDs ni fechas exactas en JSON de diagnóstico.
- Pruebas `src/features/supporter/testing/p05ServiceCalendarDraftLab.test.mjs`: enero31/febrero28-29/marzo31, años bisiestos, huso UTC vs DST, intervalos consecutivos, fechas imposibles, diferencia PayPal de caso real, pago atrasado, incidentes financieros, entradas extra e intentos de fabricar grants.

**Importante:** la etiqueta de origen `PROPOSED_PAZO_TERMS_AND_PROVIDER_ANCHOR` no prueba ninguna firma, aceptación del usuario ni captura merchant. No convertir este laboratorio en un boundary operativo. El setupFee del PayPal Sandbox real continúa NULL; nunca tratarlo como 0.

## Nueva investigación: diferencia entre fecha UTC y día calendario (2026-10-14)

**Verificación del código de origen:** en el único ensayo Auth BOUND, `scripts/f16-sandbox-auth-bound-e2e.mjs` hizo POST `/v1/billing/subscriptions` enviando `plan_id` y `custom_id`, **sin** campo `start_time`. Por tanto, el proveedor administró el calendario efectivo. Un `subscription.start_time` retornado posteriormente no es evidencia de que PAZO solicitara ese timestamp como ancla de renovación.

La evidencia REAL fue `start_time=2026-10-15T02:03:31Z` y próxima facturación en evento de activación `2026-11-14T10:00:00Z`. Al REPRESENTAR ambos timestamps en `America/Los_Angeles`, corresponden a **14-oct-2026 19:03:31 PDT** y **14-nov-2026 02:00:00 PST**. Ambos son día local **14**, aunque en UTC son días 15 y 14 y la hora es diferente. El cambio PDT→PST ocurrió entre ambas fechas. Esto genera la **HIPÓTESIS** de calendario merchant expresado en una zona local, pero el ambiente/merchant PayPal aún no ha certificado cuál zona utiliza, cómo normaliza horarios ni que `next_billing_time` sea fin de cobertura.

Laboratorio `src/features/supporter/testing/p05LocalCalendarInterpretationLab.mjs` y pruebas `p05LocalCalendarInterpretationLab.test.mjs`: compara fechas en UTC y en la zona Los Ángeles SOLO para detectar patrones, verifica cronología y cambios de offset de horario; la salida máxima `DATE_PATTERN_CANDIDATE_ONLY` mantiene `providerTimeZoneVerified:false`, `saleToCycleVerified:false`, `paidThrough:null`, `mayGrantBenefits:false`. No se imprime identificador, dato del pagador ni timestamp específico en salida del analizador.

**Diseño a evitar:** no imponer `UTC + 1 month` al `subscription.start_time` como política contractual antes de reconciliar el calendario merchant. No forzar una zona horaria PayPal basándose en el lugar donde vive el usuario. En futuros contratos se registrará por separado: hora de inicio que devuelve PayPal, próxima factura observada, zona de presentación al usuario, y fuente contractual/aceptación; solo después de validación se podrá conectar el ciclo de servicio a una venta. La API PayPal ofrece fechas en RFC3339 y permite un `start_time` opcional en creación; ninguna de estas propiedades prueba directamente la asignación de un pago a un período.

Fuentes: https://developer.paypal.com/api/subscriptions/v1/definitions/subscription/ ; https://developer.paypal.com/platforms/subscriptions/customize/future-date/ ; https://developer.paypal.com/subscriptions/payment-failure-retry/ . No mezclar reglas del sistema Braintree Recurring Billing con Subscriptions v1.

## Próximo gate

Auditar/fijar fuentes server-only y contrato de aceptación del usuario, sincronización verdadera con PayPal bajo variaciones de calendario, evidencia independiente venta→ciclo, reembolsos/disputas, retención y condiciones legales. Solo después de validar esas reglas se propondrá al PO una migración privada versionada/worker con permisos explícitos separados. La suscripción virtual original quedó cancelada; no ejecutar más compras para resolver este gate. F16 EN CURSO, PR #44 DRAFT, lanzamiento pagos NO-GO.

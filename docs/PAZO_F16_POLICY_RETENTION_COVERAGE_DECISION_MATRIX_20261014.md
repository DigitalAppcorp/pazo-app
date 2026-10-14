# PAZO F16 — Matriz de retención, bajas, reembolsos y cobertura

**Versión:** propuesta para decisión de Product Owner, 2026-10-14. **Estado:** no aprobada como política legal/comercial ni configurada en Supabase. F16 NO-GO, PR #44 Draft.

## Alcance de aprobación posterior — arquitectura P06, no política de beneficios

El Product Owner escribió **«aprobado»** tras la propuesta de ledger multirreembolso. Queda aprobada **solo la arquitectura técnica**: refund ID independiente, enlace a sale original, importe USD en centavos, deduplicación y acumulado exacto, hold incluso si refund llega antes de sale y atomicidad con token lease. Prototipo en `supabase/queries/f16_refund_multievent_ledger_lab_DRAFT_DO_NOT_APPLY.sql`, lectores F14/F16 en `f16_refund_multievent_readers_lab_DRAFT_DO_NOT_APPLY.sql`, flujos privados Node y pruebas PostgreSQL CI. Informe `docs/PAZO_F16_MULTIEVENT_REFUND_LEDGER_LAB_APPROVED_GATE_20261014.md`. Ninguna migración SQL oficial creada ni aplicada. **P06 continúa pendiente en lo comercial/legal**: pérdida o prorrateo de beneficios tras parcial/total, disputas, renovación, cobertura e insignias conmemorativas. También siguen pendientes P01–P05 y P07–P10, incluidos plazos y eliminación de datos financieros.

## Principios ya acordados — no volver a decidir

- Núcleo social y funciones de ayuda/rescate gratuitos. Membresía opcional «Amigo de PAZO» de **USD 2.99 mensuales** por PayPal, con insignia, estilos de perfil y muro de mascotas solo tras pago real acreditado; consentimientos por mascota y revocables.
- El inbox de eventos PayPal permite eliminación **a los 90 días de la conciliación definitiva**, **solo si** se libera legal y técnicamente `retention_hold`. Pendientes, disputados o imposibles de atribuir no deben purgarse por simple antigüedad. **NO** se extiende esa regla al ledger, reembolsos o intenciones.
- No almacenar nombres de pagadores, emails, tarjetas, CVV, credenciales o cuerpos íntegros de webhook; usar IDs opacos, importe en centavos, propietario Auth interno y fechas necesarias.
- Sin entitlement real, cobertura pagada, beneficios, checkout ni activación de Worker hasta validar conciliación PayPal + Auth con pruebas reales y autorización PO de cambio alojado.

## Decisiones pendientes (propuestas, NO autorizadas)

| ID | Tema | Recomendación técnica sujeta a aprobación | Política todavía requerida |
|---|---|---|---|
| P01 | Intención `pending` nunca vinculada | Expirar y minimizar después de un plazo acotado, sin generar beneficios. El contrato de expiración debe tolerar un checkout que tarda y auditar duplicados. | Plazo exacto, punto de partida y método de depuración; cómo atender conflictos/reclamaciones |
| P02 | Intención `bound` con dueño Auth y suscripción | Mantener correlación privada mientras haya transacciones, reembolsos, disputas o obligaciones activas. No desasociar el UUID sin plan de reconciliación. | Criterios de minimización/anonimización tras baja y plazo legal |
| P03 | Ledger: pago, ajuste, tombstone de reversión | Categoría financiera **distinta** de inbox y de contenido social; proteger prueba contable, evitar cambios retroactivos y no borrar automáticamente tras cierre de cuenta. | Calendario de conservación por obligación fiscal, contable, contractual, litigio y circunstancias excepcionales, revisado por asesor |
| P04 | Solicitud de eliminación de cuenta | Verificar Auth, suscripción y obligaciones; despublicar/dejar de usar contenido social según SOP F14; revisar cancelación con PayPal por separado y evaluar si corresponde mantener registro financiero mínimo y comunicar excepción de modo claro. **Nunca** marcar `completed` sin reconciliación de dependencias. | Qué datos financieros pueden separarse, anonimizarse o conservarse y cómo reflejarlo en Privacidad y flujo de bajas |
| P05 | Pago exitoso y período de cobertura | No calcular `paid_through` añadiendo 30 días al evento ni derivar «un mes» de `ACTIVE`; exigir período de facturación sustentado por proveedor y pago no revertido. El ledger actual es `uncredited` o `blocked_reversal`. | Regla exacta de inicio/fin de cobertura, renovaciones, prorrateo, gracia y desfases de cobro |
| P06 | Cancelación, pago fallido y reembolso total/parcial | Cancelar renovación ≠ reembolsar; un pago histórico puede seguir siendo válido aunque la suscripción figure `CANCELLED`. Reembolso/disputa bloquea una acreditación nueva hasta revisar alcance; reverso completo/parcial exige fuente independiente. | Cuándo cesa un beneficio, qué ocurre con período parcialmente utilizado, suspensiones/disputas/chargebacks |
| P07 | Insignias conmemorativas 3, 6 y 12 meses | Contar períodos pagados verificables **sin** duplicar pagos ni inferir duración por calendario/estatus `ACTIVE`. Nunca usar posts o consentimientos como prueba de pago. | Si los períodos deben ser consecutivos o acumulados, reversión de insignias, pérdida de continuidad |
| P08 | Muro público de mascotas | Mantener doble requisito: consentimiento individual revocable + entitlement server-side real; no aparecer por suscripción pendiente ni por compra de otra cuenta. | Plazo de revocación/caché y borrado de consentimiento, si corresponde |
| P09 | Retención de solicitudes de privacidad | Registrar evidencia mínima de solicitud, respuesta y excepción, separada de contenido personal y financiero. | Confirmar si CCPA/CPRA aplica a Alvarado Solutions LLC y plazos obligatorios bajo el régimen aplicable |
| P10 | Integración de PayPal | Confirmar con el proveedor el GET auténtico de venta/reembolso y el historial completo, incluyendo disputas fuera de ventanas de 31 días; no usar Payments v1 depreciada sin verificación de disponibilidad y plan de compatibilidad. | Aprobación de ensayo nuevo Sandbox con cuenta Auth vinculada; proceso de incidentes y refund |

## Estado de ingeniería P06 tras aprobación técnica

**Hecho aprobado y probado SOLO EN LAB:** la estructura multireembolso por `refund_id` independiente, vinculado a venta y suscripción, supera el límite histórico de un único tombstone por venta. El servicio y las RPC `f16_lab_*` DRAFT pueden registrar varias devoluciones parciales, sin conceder entitlements. Una ventana temporal de PayPal puede mostrar ya `REFUNDED` mientras un evento de 199 centavos se procesa antes que el refund de 100 centavos: el ledger debe sumar los centavos verificados de cada ID individual y no derivar el importe de un estado global. Se agregó la prueba `f16-refund-cumulative-status-out-of-order-synthetic.sql` y el informe `docs/PAZO_F16_P06_BENEFITS_AND_RETENTION_DECISION_GATE_20261014.md`.

**Lo NO aprobado:** la respuesta comercial ante un refund parcial, el momento de suspensión o continuación de beneficios, la duración contractual de ciclos cubiertos, el tratamiento de disputas y el plazo/forma de eliminación de registros financieros. **Aceptar evidencia financiera no equivale a asignar beneficios**. Mantener el bloqueo de cualquier entitlement hasta que la fuente de periodos esté verificada y el PO autorice expresamente la política P05/P06.

## Regla de ingeniería activa mientras P01–P10 no estén aprobadas

**Conservación defensiva ≠ política de retención definitiva.** No se inicia eliminación automática de filas financieras; no se concede entitlement, insignia ni períodos pagados; el usuario puede seguir utilizando PAZO gratis; cualquier baja con señales financieras queda en revisión manual bajo F14. Retener indefinidamente tampoco se aprueba como política legal: se debe documentar y resolver cada bloqueo con minimización y revisión de obligaciones.

La nueva función offline `financialDeletionReview.mjs` solo clasifica exposición financiera (sin acceso a tablas desde frontend). Devuelve siempre `mayDeleteAuthUser:false` y `mayPurgeFinancialRecords:false`; una comprobación sin registros F16 **no certifica** la baja F14. El SQL `f16_financial_deletion_exposure_lab_DRAFT_DO_NOT_APPLY.sql` calcula agregados por owner usando SECURITY DEFINER con acceso restringido, y bloquea revisión cuando hay eventos financieros huérfanos/no concluidos. **No está instalado en hosted.**

## Referencias verificadas al 14-oct-2026

- [California AG — derechos y excepciones de eliminación bajo CCPA](https://oag.ca.gov/privacy/ccpa). La aplicabilidad legal a la empresa debe determinarse, no se presume.
- [California Privacy Protection Agency — texto normativo CCPA vigente a 2026](https://cppa.ca.gov/regulations/pdf/ccpa_statute_eff_20260101.pdf): los requisitos de registro de solicitudes (p. ej. 24 meses en §7101 para negocios sujetos al régimen) no equivalen a una autorización general para conservar pagos ni sustituyen el análisis de aplicabilidad.
- [IRS — How long should I keep records?](https://www.irs.gov/businesses/small-businesses-self-employed/how-long-should-i-keep-records): los plazos dependen de cada registro y período de limitaciones; no seleccionar automáticamente 3, 6 o 7 años para todos los registros.
- [PayPal Subscriptions v1 API](https://developer.paypal.com/api/subscriptions/v1): distingue suscripción, plan y transacciones.
- [PayPal Transaction Details](https://developer.paypal.com/api/subscriptions/v1/definitions/transaction/): `COMPLETED`, `PENDING`, `PARTIALLY_REFUNDED`, `REFUNDED`, `FAILED`, etc. no son equivalentes.
- [PayPal Payments v1 — deprecated](https://developer.paypal.com/api/deprecated/payments/v1/definitions/transaction/): consultar ventas/refunds por ruta antigua no prueba disponibilidad futura.

**Solicitud pendiente a PO cuando corresponda:** aprobar o modificar decisiones P01–P10, con revisión jurídica/contable si aplica. Aprobación del diseño de políticas **no** autoriza por sí sola aplicar migraciones, activar workers o realizar pagos. Toda operación hosted conserva su propio gate explícito.

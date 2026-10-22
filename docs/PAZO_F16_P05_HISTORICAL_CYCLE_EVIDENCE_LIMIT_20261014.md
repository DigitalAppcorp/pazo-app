# PAZO F16-P05 — Límite de atribución del ciclo tras evento histórico MATCH

**Evaluación:** 14 de octubre de 2026 (timestamps PayPal en UTC 15-oct). **Estado:** evidencia externa leída en Sandbox, diseño de siguiente gate; **sin períodos acreditados**. F16 EN CURSO, PR #44 DRAFT, beta pagos NO-GO.

## Evidencia efectivamente obtenida

| Evidencia | Valor saneado | Calidad |
|---|---|---|
| Intención privada PAZO Auth↔PayPal | BOUND, mismo contrato del ensayo | Vinculación comprobada anteriormente |
| Suscripción merchant original | CANCELLED; plan mensual USD 2.99; cantidad 1; plan_overridden false | Merchant GET comprobado |
| Venta concreta | COMPLETED, USD 2.99, 2026-10-15T03:20:33Z | Merchant GET + webhook original: MATCH exacto |
| Inicio de suscripción | 2026-10-15T02:03:31Z | Merchant GET + evento activación |
| Evento histórico activación | BILLING.SUBSCRIPTION.ACTIVATED, 2026-10-15T03:20:37.957Z; estado ACTIVE y misma subscripción | GET PayPal del eventId obtenido localmente de inbox firmado |
| Próximo cobro en fotografía del evento | 2026-11-14T10:00:00Z | HISTORICAL_SCHEDULE_CANDIDATE, **no período de cobertura** |
| Última transacción en snapshot posterior | 2026-10-15T03:20:33Z, USD 2.99 | Merchant GET |
| cycle_executions | REGULAR, sequence 1, cyclesCompleted 1 | Contador; **no cycle_key** |
| setup_fee / outstanding_balance / next_billing_time actual | null / null / null | Ausente = desconocido; jamás atribuir cero |
| Cobertura total historial de transacciones | false | PayPal omitió total_items y total_pages en ventana limitada |
| ledger / procesamiento inbox | 0 pagos registrados; ocho eventos pending según último SELECT | No procesados |
| Estado operacional | cycleVerified:false; paidThrough:null; beneficios:false | Correcto |

El evento histórico **NO** demuestra que el intervalo pagado termine el 2026-11-14T10:00:00Z. No coincide literalmente con el horario de inicio de suscripción; no suplir esta discrepancia con `+30 days`, `+1 month`, hora local ni redondeo arbitrario. El webhook fue obtenido del proveedor por su ID, pero no se reconstruyó en el lector su verificación criptográfica de recepción; el inbox lo registró previamente como firmado. La lista acotada de pagos no prueba ausencia de refunds/disputas ni obligación histórica.

## Confirmación de semántica

Fuentes:
- https://developer.paypal.com/api/subscriptions/v1/definitions/subscription/ — `billing_info.next_billing_time` es la próxima fecha programada de cobro; `cycle_executions.cycles_completed` es un contador de ciclos, no una referencia de venta↔ciclo.
- https://developer.paypal.com/api/subscriptions/v1/definitions/billing_cycle/ — define frecuencia MONTH/1; no da identificador de período de cada venta.
- https://developer.paypal.com/subscriptions/payment-failure-retry/ — pagos pendientes pueden reintentarse o acumular deuda para el siguiente ciclo; `failed_payments_count=0` después de cobro no descarta fallos previos.
- https://developer.paypal.com/subscriptions/webhooks/ — `PAYMENT.SALE.COMPLETED` acredita evento de venta; no especifica inicio/fin de servicio de esa venta.

**Límite de la evidencia:** los endpoints de Subscriptions v1 utilizados en la prueba no expusieron un identificador de `cycle_key` directamente correlacionable con la venta ni los límites contractuales sellados de ese ciclo. Eso no demuestra que ningún otro documento/provider pueda ofrecerlo; sí impide inferirlo de estos campos.

## Decisión técnica de P05 (solo propuesta de implementación, NO aprobación de períodos)

1. **Contratación inicial:** conservar de forma privada una fotografía inmutable de las reglas contractuales vigentes para la suscripción y su propietario autorizado, con plan/versión, esquema de ciclos, frecuencia, cantidad, start_time, timezone y procedencia exacta. No capturar datos de pagador ni tarjetas; mantener secretos fuera del repositorio.
2. **Activación en el momento:** tras webhook firmado, confirmar GET merchant del mismo contrato, almacenar solo el calendario de cobro evidenciado (incluido next_billing_time si presente) y timestamp/fuente. El identificador del webhook y estado de su verificación sirven como trazabilidad, **no como única prueba de período**.
3. **Venta y su aplicación:** reconciliar siempre la misma venta merchant↔webhook↔suscripción↔Auth y prueba de abono por ciclo; distinguir venta regular de deuda recuperada, importes agrupados, reintentos, devoluciones y disputas. No fabricar un cycle_key a partir de la fecha de venta ni de un hash de la próxima fecha.
4. **Calendario mensual:** especificar y aprobar fuente contractual del ancla de facturación, huso y comportamiento de 28/29/30/31, y cómo se versionan cambios. Ausencia de evidencia independiente = revisión manual, nunca `paidThrough`.
5. **Preflight previo a toda contabilización:** rechazar ventas duplicadas, un ciclo acreditado más de una vez, período solapado, saldo no aclarado, reversión/disputa no conciliada o historia insuficiente. El laboratorio existente `p05CycleMappingPreflightLab.mjs` conserva por defecto denegación total de entitlements.
6. **Solo tras nuevos permisos:** proponer migración versionada para fotografías privadas mínimas, retención financiera y worker. Ningún despliegue, SQL alojado, cron, ledger ni beneficio está autorizado por esta evaluación.

## Resultado de esta única prueba histórica

**CANDIDATE_OBSERVED / CYCLE_UNATTRIBUTED.** Registrar fecha observada únicamente como evidencia auxiliar. No volver a comprar, activar o cancelar para cerrar esta prueba. La aprobación comercial P05-L de cobros atrasados ya existe; falta aprobar e implementar el ancla/correlación técnica y retención. Continuar por diseño offline y pruebas antes de proponer hosted write; el pasado no debe «rellenarse» sin evidencia.

## Gate de salida de P05

No cerrar P05 sin: (a) fuente auditable del calendario y su periodStart/periodEnd, (b) comprobación de asignación venta a ese ciclo con política de atrasos P05-L y de reversals P06-A–E, (c) cobertura mínima financiera/reversals o caso de revisión, (d) pruebas adversariales y doble captura, (e) aprobación PO del contrato y operación alojada, (f) verificación contra requisitos de retención y privacidad. Hasta entonces `cycleVerified:false`, `paidThrough:null`, `mayGrantBenefits:false`, beta pagos NO-GO.

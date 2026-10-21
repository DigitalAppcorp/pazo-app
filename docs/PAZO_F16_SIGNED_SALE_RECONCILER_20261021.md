# P1 — Conciliador de ventas Live firmado

Orden vigente: `CODEX_F16_BETA_LAUNCH_COMPLETION_ORDER_20261021.md`.
Rama: `f16/live-signed-sale-reconciler-20261021`, integración hacia F13 mediante PR.
El sistema continúa Live OFF; no se requieren claves ni otra prueba de recursos.

## Evidencia duradera de entrada — código y PG17

El postback PayPal valida los bytes originales antes de comprobar el owner,
intento, plan y generación. De esos mismos bytes se deriva un recibo mínimo:
hash SHA-256, webhook, referencias opacas y fechas. Nunca se guarda el cuerpo
PayPal, pagador, ID de comercio, saldos ni claves. Una fecha ausente no se inventa.

La nueva cola service-only guarda recibo e inbox en la misma transacción.
Comprueba el webhook de la generación original y rechaza referencias o fechas
contradictorias. Una redelivery semánticamente idéntica conserva el primer hash.
Los registros heredados de la cola carecen de esa prueba y no se convierten en
firmados por asignarles una constante en JavaScript.

`pazo_f16_live_service_signed_receipt_read` exige el token de una reclamación
duradera vigente. Tras finalizar o caducar el lease no devuelve evidencia.
No concede SELECT/INSERT directo a service_role, anon o authenticated.

`liveSignedSaleClaim.mjs` une reclamación, recibo, binding original y GET del
evento original con credenciales de Vault de esa generación. Compara referencias,
fechas y dueño; solo entonces entrega evidencia privada al coordinador. Los
conflictos quedan held y un fallo temporal vuelve a pending bajo el límite de
reintentos de la cola. No escribe pagos ni períodos.

Migración local: `20261021074014_pazo_f16_live_signed_event_evidence.sql`.
Rollback previo a credenciales: `f16_live_signed_event_evidence_REVIEW_REQUIRED.sql`;
rechaza cualquier tabla con recibos y requiere Live OFF, sin CASCADE.
Instalada tras CI3501/gateway418 PASS del commit `2f1403f6` y preflight de
catálogo/LiveOFF; versión MCP real `20261021074014`, archivo alineado con SQL idéntico.

Pruebas dirigidas de Node: firma inválida, datos fuera de alcance, fechas imposibles,
IDs cruzados, propietario y generación originales, falta de prueba persistida,
fallo temporal, liberación incierta y ausencia de contenido privado en respuestas.
PG17 aislado: roles reales, RLS/ACL, idempotencia, conflictos, lease exclusivo,
caducidad y recuperación, legacy sin prueba, rechazo de processed sin venta y
rollback/reapply en vacío. Cluster apagado al terminar.

Gate local: governance/closure 376/376, F16 synthetic 1193/1193, TypeScript/build
y dist PWA 4/4 PASS. OpenSSL de Git requiere el contexto local autorizado en
Windows; la ejecución en sandbox no pudo cargar su DLL y quedó registrada como
fallo de entorno, antes de repetir únicamente la suite afectada con perfil vacío.

Auditoría de dependencias detectó Vite fijado en lock a 8.3.2. Actualizado a
8.3.3 exacto; ninguna otra versión del lock cambió y npm audit reporta cero
vulnerabilidades. [Aviso oficial](https://github.com/advisories/GHSA-587h-7wmj-h5pm).

## Resto de P1 — en curso

### Venta y período observados — segundo bloque de PR54

El lector verifica GET de suscripción/intent/plan bajo OAuth de la generación
original y la transacción exacta COMPLETED USD2.99. Completa la paginación acotada;
un next de otro host, suscripción, ventana o con parámetros extra se rechaza sin
reenviar el bearer. Esta cadena verifica el origen comercial de la venta, no la
identidad legal del comercio ni un ID derivado del Client ID. La
[API de transacciones](https://developer.paypal.com/api/subscriptions/v1/subscriptions-transactions)
y su [schema oficial](https://github.com/paypal/paypal-rest-api-specifications/blob/main/openapi/billing_subscriptions_v1.json)
definen COMPLETED como crédito a la cuenta del payee. No se consulta balances.

`liveObservedPeriodProof.mjs` exige consentimiento original contra el registro
de ofertas autorizado, activación firmada persistida y GET corroborado, venta
original y snapshot merchant fresco. Primer intervalo contractual:
`[activationAt, nextBillingAt)` observado. Renovación ordinaria: ordinal
consecutivo, last_payment exacto, cero deuda/fallos y fin anterior verificado
como nuevo comienzo; el nuevo fin se observa en PayPal. No hay suma de meses.
Confirmación mayor de24h, cobro fuera de la ventana operativa de6h desde el
inicio, ciclo omitido, retry, hold o límite contradictorio requieren revisión.
Las ventanas solo deciden revisión, nunca añaden cobertura. Es una regla
contractual de PAZO, no un campo de período pagado emitido por PayPal.

`liveDurableSaleWorker.mjs` compone claim→prueba→escritura. Nuevas RPC
`leased_sale_record` / `leased_refund_record`: exigen lease actual y recibo firmado,
usan los escritores privados existentes y cierran el lease en una transacción.
Un token de intento completado permite resolver una respuesta HTTP incierta
sin duplicar pago/ciclo; cambios en hechos se rechazan. Los bridges financieros
antiguos sin lease pierden EXECUTE para service_role.

`financial_context_read`, limitada al lease, devuelve solo consentimiento,
referencias/fechas y riesgos pendientes. No sale al navegador. DDL locales:
`20261021074024_pazo_f16_live_atomic_leased_settlement.sql` y
`20261021074032_pazo_f16_live_financial_context.sql`, con rollback OFF y PG17.
Ambas aplicadas una vez tras el mismo CI. Cinco RPC nuevas postgres/definer/
search_path vacío/service-only, receipt FORCE RLS; bridges viejos ya revocados.
Postflight: reserva1, merchant/inbox/receipt/períodos0 y selector sandbox/LiveOFF.
El laboratorio fuerza un fallo entre INSERT y ACK: no sobrevive pago parcial,
el lease se recupera tras expiración y el replay confirmado es idempotente.

`verify:prepreview` completo PASS en contexto autorizado y perfil sintético
vacío: closure397/397, F16synthetic1193/1193, build/dist4/4. CI principal se
amplía a PR/push F13 para ejecutar sus cuatro jobs antes omitidos por rama,
además del laboratorio gateway independiente. Ambos workflows SUCCESS en GitHub.

### Ciclo de vida y devoluciones — tercer bloque, local

Worker lifecycle: evento firmado persistido + GET de la suscripción original,
status y status_update_time. SQL monotónico rechaza contradicciones y evita
volver de CANCELLED a ACTIVE por entrega atrasada. Actualiza estado/diagnóstico
de fallo y cierra el lease en una transacción; no modifica períodos ni beneficios.
PG17 comprueba que cancelar conserva acceso hasta el fin pagado.

Worker refund: reconstruye la fecha y el vínculo de la venta original a partir
del ledger y recibo firmado. Una devolución meses después usa esa ventana de
búsqueda, no la fecha reciente del refund. Si el payload carece de subscriptionId,
solo se resuelve desde la venta previamente registrada de la misma generación.
Refund completo exige REFUNDED merchant; parcial queda held/revisión. Un reverso
requiere además lectura del SALE original con CHARGEBACK e importe completo;
no se inventa un estado de transacción REVERSED. La API antigua se usa solo para
esa corroboración de recursos SALE, sin crear/capturar/devolver dinero.
[Schema oficial](https://developer.paypal.com/api/deprecated/payments/v1/schema.json).

Dos RPC/columnas de ciclo de vida están en la migración local
`20261021074511_pazo_f16_live_lifecycle_and_refund_scope.sql`, NO APLICADA.
PG17 local14 verifica cancelación, fallo de renovación, orden inverso, alcance de
refund, pago/refund atómico, ACL y rollback/reapply. Nueve pruebas Node nuevas.

Quedan scheduler privado, monitoreo de disputas, beneficios y P2–P5.
El hash de Client ID guardado por el preparador Vault identifica la aplicación;
no es evidencia de identidad del payee. No convertirlo en un match financiero.

La política prospectiva aprobada del primer ciclo está en
`PAZO_F16_P05_FIRST_SERVICE_PERIOD_POLICY_APPROVED_20261014.md`: activación
confirmada y próxima fecha observada como límite contractual, junto con venta
regular verificada y consentimiento previo. No sumar meses/30 días ni usar
una fecha futura aislada como prueba. Un caso insuficiente queda REVIEW_REQUIRED.

No hay worker financiero liberado ni una venta Live. P1 completo, readiness de
credenciales, HTTPS E2E, canary y beta pública conservan gates independientes.

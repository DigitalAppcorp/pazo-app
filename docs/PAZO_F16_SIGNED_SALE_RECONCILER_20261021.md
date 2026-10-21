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
`20261021142517_pazo_f16_live_lifecycle_and_refund_scope.sql`, APLICADA tras
CI3502/gateway419 PASS de `75dfd4e6`. Nombre alineado con versión MCP, SQL igual.
Postflight: dos RPC service-only, cuatro columnas y LiveOFF/0 datos financieros.
PG17 local14 verifica cancelación, fallo de renovación, orden inverso, alcance de
refund, pago/refund atómico, ACL y rollback/reapply. Nueve pruebas Node nuevas.

Quedan scheduler privado, monitoreo de disputas, beneficios y P2–P5.

### Transporte privado y recuperación — cuarto bloque local

`pazo-paypal-live-worker` prepara un endpoint sin CORS de navegador. Solo POST,
ruta/cuerpo acotados y una capacidad aleatoria interna permiten pedir admisión;
el SQL service-only verifica su hash. La capacidad nace dentro de PostgreSQL y
queda cifrada en Vault, sin llegar al PO, chat, archivos, argumentos o logs.
No es una clave PayPal ni un token de Management API.

El control empieza `enabled=false / processing_enabled=false`. Un lote privado
exclusivo de3min admite como máximo un evento; cada evento conserva su lease de2min.
Los wrappers respetan backoff1/5min y convierten el tercer fallo en held con
diagnóstico. Revocan EXECUTE de claim/finish antiguos al servicio. Salud devuelve
solo contadores/códigos/fechas, sin invoker/hash/IDs privados. El modo de salud
no lee claves de PayPal, no consulta el proveedor y no procesa eventos.

DDL `20261021144809_pazo_f16_live_private_worker_control.sql` APLICADA tras
CI3503/gateway420 de `9c8c090c`; nombre alineado con versión MCP, SQL idéntico.
Postflight FORCE RLS, cinco RPC service-only, dos bridges de lease revocados,
control y procesamiento OFF, 0 eventos/períodos/generaciones comerciales. PG15
prueba ACL, autenticación, OFF, salud, build incorrecto, exclusión, espera,
agotamiento y rollback/reapply en vacío. Vault es un mock SOLO en ese laboratorio;
no se presenta como ensayo del cifrado real. HTTP y lease11/11, governance y
closure413/413 PASS. Edge worker v1 ACTIVE desde25 módulos inmutables de ese
commit, JWT OFF porque valida capacidad propia antes de admisión service-only.
Cuatro HTTP reales sin credenciales PASS: sin auth403, invoker inválido403,
Origin navegador403, GET405; cero CORS. No se leyó ni compartió el invoker.

Scheduler `20261021145500` APLICADO una vez mediante SQL Editor después de dos
fallos del estado de petición MCP, ambos comprobados sin ejecución. Historial
registrado explícitamente en la misma transacción; una corrección posterior del
campo `statements` reparó la serialización de `$'`, sin repetir DDL. Fuente del
tick canónica MD5 `c08d3977938766fa5e6dcbcc2367ac55` coincide con la revisada.
pg_cron1.6.4/pg_net0.20.4 nativos instalados; cron por minuto ya ejecutó el tick
deshabilitado correctamente, sin emitir solicitudes. Control y procesamiento OFF.

El postflight real detectó que Supabase conserva grants PUBLIC sobre `net`:
su propietario es `supabase_admin` y los REVOKE de postgres son un no-op.
No afirmar ACL denegada ni una cola privada. Es una restricción documentada de
[Supabase](https://supabase.com/docs/guides/troubleshooting/revoking-access-to-pg_net-objects-has-no-effect-0bbc16).
La configuración real expone solo public/graphql_public; net no se expone en la
Data API. Los logins de base existentes son de plataforma/administración y CLI.
Ningún header ni contenido de Vault se ha leído ni enviado por el scheduler.

Corrección local `20261021155429`: cada dispatch crea una capacidad aleatoria
de244bits para UNA admisión durante120s; solo su hash permanece en el control
privado. Admisión consume el hash bajo lock, incluso si el lote está ocupado.
El antiguo bearer Vault deja de aceptarse y nunca se coloca en pg_net. La cola
solo contendrá esta capacidad efímera, legible por logins confiables de la DB,
sin clave de servicio ni PayPal. La frecuencia55s, lease activo y dispatch vigente
evitan solapamientos. Rollback operativo invalida dispatch y deshabilita trabajo;
no restaura autenticación permanente. APLICADA con versión MCP155429 después de
CI3505/gateway422 PASS de `114756e1`; nombre local alineado, cuerpo sin cambios.
Solo los logs técnicos del job se conservan7d; otros registros quedan intactos.

PG17 ejecutó el core exacto extraído de la migración con adaptadores simulados
cron/net, sin red: OFF, target/auth correctos, frecuencia, exclusión, fallo sin
invoker, retención aislada y rollback/reapply PASS. El primer ensayo falló por
un nombre ambiguo de la fixture, corregido; no se relajó el SQL del producto.
PG19 verifica además retiro del bearer, uso único, rechazo de nonce inválido,
vencimiento, recuperación con nonce distinto y rollback de deshabilitación PASS.
PG18 falló por comparación CRLF/LF en el guard; se corrigió normalizando solo
finales de línea antes del hash, sin aceptar otra función. Clusters detenidos.
Extensiones nativas y recorrido HTTP autenticado PASS a15:55:37UTC: request1,
HTTP200 worker_idle/processed0, nonce consumido y batch cerrado; cron automático
repitió PASS a15:57UTC. enabled=true SOLO salud, processing_enabled=false,
LiveOFF/killON/inbox0/períodos0. No claves ni llamadas a PayPal.
[Scheduling oficial](https://supabase.com/docs/guides/functions/schedule-functions),
[pg_net oficial](https://supabase.com/docs/guides/database/extensions/pg_net).

### Monitor privado de disputas — código local

`20261021160103` añade cola por venta ya registrada, con origen firmado y
generación original; dos tablas FORCE RLS sin grants directos. Claim/finish son
service-only, ligados al lote activo y al lease exclusivo de esa venta. Primer
control satisfactorio habilita su elegibilidad futura; no fabrica otro pago ni
período. La proyección de beneficios debe exigir ese control antes del primer
grant (pendiente P3). Capacidad acotada: un candidato por lote; uno de cada cinco
lotes ocupados se reserva al monitor para evitar que los eventos lo posterguen.
Health/backlog y admisión de checkout todavía se deben integrar en P4/P5.

El lector GET verifica la suscripción/transacción original y recorre todas las
páginas de disputas filtradas por seller transaction. Lee detalles de cada caso,
incluidos casos conocidos que desaparecen de la lista. No almacena nombres,
email, mensajes, documentos ni cuerpos del proveedor. Solo ID, estado, fecha,
importe y decisión mínima. Rechaza links externos, ciclos, duplicados, páginas
incompletas y datos de otra venta. No existe POST de respuesta, aceptación,
conciliación PayPal ni reembolso en este monitor.

Disputa completa abierta o resuelta a favor del comprador crea un hold de esa
venta. Solo resolución favorable al comercio o cancelación por comprador, con
transacción COMPLETED e importe reembolsado cero, permite liberar SU hold.
Otros holds/refunds permanecen. Parciales/resultados ambiguos quedan review y
conservan cobertura anterior; ausencia/error/permisos no se interpretan como
clear. Casos previos no pueden desaparecer, retroceder ni reasignarse.
Check y hold se escriben con ACK en una sola transacción. Cadencia operativa:
5min para pendiente/review/error,30min para clear con cobertura,1día histórico;
es planificación de consultas, no cálculo ni extensión del servicio pagado.

Protocolo worker v2 impide que un endpoint antiguo se declare preparado para
monitorear: la instalación deja control OFF, heartbeat vacío y build v2; falta
deploy v2 y repetir SOLO salud tras CI, sin PayPal. PG23 y governance423/423
PASS; PG20/21 detectaron orden incorrecto de aserciones SQL en la fixture,
corregido separando mutación de lectura. PG22/23 probaron hold, parcial, resolución,
replay, lease vencido, ACK crash/rollback y no-grant; clusters detenidos.
PG24 valida además que un outcome NULL no cree un hold por lógica ternaria.
Último gate CI pendiente antes de instalar.
17 Node dirigidas PASS (lector/worker/HTTP). La app PayPal requiere lectura de
Disputes; su permiso real no se puede afirmar sin OAuth de esa app. Se verificará
en preparación privada, nunca mediante Reporting/Balances ni pruebas Sandbox.
[Esquema oficial](https://developer.paypal.com/api/customer-disputes/v1/schema.json).
El hash de Client ID guardado por el preparador Vault identifica la aplicación;
no es evidencia de identidad del payee. No convertirlo en un match financiero.

La política prospectiva aprobada del primer ciclo está en
`PAZO_F16_P05_FIRST_SERVICE_PERIOD_POLICY_APPROVED_20261014.md`: activación
confirmada y próxima fecha observada como límite contractual, junto con venta
regular verificada y consentimiento previo. No sumar meses/30 días ni usar
una fecha futura aislada como prueba. Un caso insuficiente queda REVIEW_REQUIRED.

No hay worker financiero liberado ni una venta Live. P1 completo, readiness de
credenciales, HTTPS E2E, canary y beta pública conservan gates independientes.

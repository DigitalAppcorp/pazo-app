# PAZO F16 — Reglas de apertura Live POR ACCIÓN (event-driven), cola y comunicación UI/API/Supabase

**Fecha:** 23-oct-2026
**Documento especializado:** anexo vinculante de producto/arquitectura para `PAZO_F16_GRADUAL_LIVE_ROLLOUT_PRODUCT_SPEC_20261023.md` (no sustituye sus 22 requisitos ni el historial de ideas).
**Decisión expresa PO de esta conversación:** los **parámetros 5 invitaciones, 72 horas para responder y cuotas acumuladas 1→5→20** recibieron «sí listo»; el PO ordenó **eliminar la espera por día** para pasar de etapa y fijar decisiones **basadas en acciones/evidencia**, con datos comunicados entre frontend, backend y Supabase, **sin supervisión del PO por cada venta**.
**Estado:** `PRODUCT_EVENT_DRIVEN_DIRECTION_APPROVED / DECISION_PACKET_SAVED / BRANCH_CODE_AUTHORIZED_PREVIOUSLY / NOT_IMPLEMENTED / NOT_DEPLOYED / PAYMENTS_NOT_EXPANDED`.
**Precedencia:** las reglas de este archivo **reemplazan explícitamente** cualquier requisito anterior de **24 horas** como condición de promoción entre etapas en el documento rector, roadmap o handoff. El periodo de **72h solo es caducidad de invitación sin checkout**, nunca ventana de avance financiero. Las ventanas técnicas de reintento/leases/salud son necesarias, pero **no son días de espera comercial**.

## 1. Resumen y límite honesto

Queremos que 25 usuarios interesados **no sean descartados** porque un primer checkout solo admite un comprador. Dos conceptos distintos:
- **Interés no limitado:** cualquier usuario elegible invitado o que abra `Amigo de PAZO` desde la app puede indicar «Me interesa» y quedar en una **lista de espera duradera**, incluso mientras se permite 1 checkout. Deduplicación por cuenta y campaña. No crea intención PayPal ni cargo.
- **Pago limitado temporalmente:** al inicio **solo 1 comprador** puede iniciar una nueva suscripción Live en la etapa L1; L2 permite **hasta 5 compradores acumulados**; L3 permite **hasta 20 acumulados**; los demás esperan sin perder su posición.

**Advertencia comercial sin engaños:** preservar el interés/cola **NO garantiza conservar todas las ventas**, porque los usuarios pueden desistir antes de que llegue su turno. Si 25 desean pagar y el techo autorizado es 20, **al menos cinco permanecerán sin checkout** aunque todo funcione. Para aceptar 25 con garantía de cupo se debe aprobar ANTES un techo mayor de 25, por ejemplo una etapa posterior de 50 compradores, o autorizar apertura pública; **no introducir ese cambio unilateralmente**.

El PO no tiene que promover manualmente L1→L2→L3: PAZO lo hace **en el mismo flujo del evento validado**, sujeto a salud/evidencia. El paso de L3 (20) a capacidad mayor o `public` **todavía requiere nueva decisión previa**; PAZO avisa de demanda retenida sin detener trabajo de reconciliación.

## 2. Reglas de promoción *por evento*, sin días de espera

| Regla | Evento verificable que la dispara | Resultado automático | Si falla |
| --- | --- | --- | --- |
| `EV-01` Preentrada a cola | `INTEREST_ACCEPTED` de usuario autenticado/elegible | Insertar/actualizar interés idempotente; devolver `QUEUED` o `SLOT_GRANTED` | Devolver error seguro, sin doble fila ni cargo |
| `EV-02` Primer lugar L1 | `INTEREST_ACCEPTED` + cupo inicial libre + salud backend/PayPal lista | Reservar **1** slot de checkout, notificación existente cambia a `TU CUPO` | Mantener cola FIFO |
| `EV-03` **L1→L2 (1→5)** | **Primer** pago Live de comprador externo independiente verificado: firma+merchant+plan+amount+periodo pagado persistido **y beneficio server-side visible** | Actualizar etapa a L2 y capacidad acumulada a **5** en transacción CAS, liberar inmediatamente el siguiente lote de slots conforme cola | `BLOCKED/REVIEW_REQUIRED`: no promover; notificar admin |
| `EV-04` **L2→L3 (5→20)** | Tercer **comprador distinto**, total acumulado de 3 ventas Live auténticas conciliadas + beneficios activos y **sin fallos críticos abiertos** | Actualizar L3 y cupo a **20** atomizado; reasignar cola | Sin prueba suficiente, conservar L2 |
| `EV-05` Reasignación sin venta | Usuario rechaza o un intento **sin CREATE en PayPal** termina localmente con prueba/lease finalizado; o proveedor confirma terminal sin cobro ni pendientes | Liberar **solo reserva temporal** si no existe suscripción Live vinculada; ofrecer slot al siguiente FIFO | Si estado remoto desconocido, mantener cupo reservado y reconciliar |
| `EV-06` Venta COMPLETED con retraso | Webhook firmado llega después de retorno/app cerrada | Procesar inbox durable, verificar fuente original, acreditar beneficio; ejecutar EV-03/04 cuando criterios completos | Dejar pendiente, reintentar de modo idempotente |
| `EV-07` Usuario paga y beneficio falla | Venta confirmada pero proyección de beneficios incorrecta/pendiente crítica | NO notificación 2; detener NUEVAS compras, registrar caso, reintentar reparación idempotente | No inventar periodo, no borrar transacción |
| `EV-08` Riesgo financiero | Firma no válida, merchant mismatch, workers/webhook sin salud, eventos/holds críticos, creación PayPal ambigua no reconciliable | `PAUSED_AUTOMATIC` de nuevas compras + alertas/código de causa para admin | Continuar liquidación histórica, renovación, cancelaciones, refunds y soporte |
| `EV-09` Demanda acumulada | Un nuevo interesado eleva `queue_depth` y capacidad está agotada | Conservar puesto y mostrar cola / panel; **sin saltarse EV-03/04** | No fingir «cupo disponible» |
| `EV-10` Techo L3 alcanzado | 20 compradores distintos realmente admitidos | `LIMITED_COMPLETE`, cola aún funcional, alerta de demanda | No sobrepasar 20 por carrera ni autocambiar a `public` |
| `EV-11` Comprador verificado | Pago+periodo+beneficios `ACTIVE_VERIFIED` | Una **notificación 2**: agradecimiento + comprobación opcional, idempotente | Reintentar únicamente la entrega de mensaje |
| `EV-12` Usuario contesta revisión | `FEEDBACK_OK` / `FEEDBACK_ISSUE` | Registrar UX/ticket y métricas separadas de finanzas | Feedback negativo no revoca pago ni frena todos los checkouts sin gravedad |
| `EV-13` App vuelve a primer plano | `APP_RESUME` / apertura bandeja | Consultar el estado autoritativo y reflejar cupo/cola/pago/beneficios aunque no se recibiera Realtime | Mantener estados explícitos; no doble CREATE |

**Antes de cada promoción** el orquestador reevalúa bajo lock/versión: worker heartbeat reciente, webhook firmado/listo, generación PayPal original y price USD 299, origen canónico, términos, integridad de cola/leases, saldo de transacciones pendientes y ausencia de bloqueos críticos. La lectura de métricas del navegador no decide promociones.

**Una venta parcial o `ACTIVE` sin venta `COMPLETED` NO satisface EV-03/04.** Una cortesía administrativa tampoco. El formulario voluntario de beneficios NO es gate financiero ni gatillo para demorar ventas.

**Qué NO hay:** espera de 24 horas, aprobación administrativa por cada subida, esperas de «un día sin reportes», depender del usuario para confirmar que el webhook funciona.

## 3. Flujo real para 25 compradores interesados

- Enviar las primeras **5 invitaciones** en la bandeja tal como aprobó el PO; si otros 20 visitan la oferta por sí mismos, pueden registrar su interés **sin esperar a ser invitados**. De lo contrario, solo 5 sabrían del programa.
- Supabase guarda 25 voluntades únicas en orden servidor y decide el primero con permiso de iniciar el checkout. Los 24 restantes ven una **espera transparente**, estado y opción de regresar; nadie paga para hacer fila.
- **Tras acreditar primer pago y beneficios:** el mismo procesamiento dispara L2 y entrega permisos a los siguientes 4 hasta capacidad acumulada 5. La app conectada recibe cambio; quien vuelva más tarde lo verá correctamente.
- **Tras tercer comprador distinto acreditado:** el mismo procesamiento dispara L3 y se admiten compradores hasta llegar a 20, sin reloj de 24 horas.
- Quedan 5 personas en cola si las 25 mantienen interés. **No se puede ofrecerles checkout bajo el techo de 20**; para no perderlas, proponer al PO ampliar el techo de forma anticipada (por ejemplo `L4=50`) con criterios automáticos, **pendiente de autorización, NO aprobado**.
- La velocidad real depende de que al menos tres personas **finalicen efectivamente** y PayPal/worker produzcan evidencia. Si el primer comprador no paga, PAZO no puede demostrar el primer cobro; se rotan **únicamente intentos terminales verificados**, sin timers que borren obligaciones remotas.

## 4. Tiempo por ACCIÓN, no por días

| Evento | Acción inmediata del sistema | Regla del reloj |
| --- | --- | --- |
| Pulsa «Me interesa» | ACK autenticado, upsert de una fila de cola y resultado de reserva/posición aproximada | No esperar a cron nocturno |
| El primer usuario obtiene cupo | Server-side `SLOT_GRANTED`, consumir tiempo de checkout solo si realmente inicia proceso; render inmediato | Reservas no iniciadas pueden expirar con lease corto configurable; **valor exacto se mide/aprueba en arquitectura**, no inventar timeout de PayPal |
| Cierra checkout ANTES del CREATE | Cancelación local idempotente, liberación de reserva y siguiente cola en misma transacción | Inmediata si existe evidencia de que NO hubo CREATE |
| Sale de PayPal DESPUÉS de CREATE | Retomar intento original o conciliar terminal del proveedor; **no** doble CREATE | No liberar por caducidad simple |
| `PAYMENT.SALE.COMPLETED` firmado y concilado | Creditar periodo, verificar beneficio, probar regla L1/L2, modificar etapa y despachar cola | En evento/transacción, sin espera comercial; duración externa/asíncrona variable |
| Beneficio no aparece / hold | Pausa nuevas compras y retry seguro de proyección | Salud/retries con backoff controlado; no esperar 24 h |
| 72 horas desde invitación SIN respuesta | Cerrar invitación original y, si hay cola, invitación a siguiente elegible | 72h es solo invitación, jamás avance de etapa o borrado de pago |
| App vuelve online | GET de estado propio + sincronización de bandeja | Al enfocar/reconectar; fallback frente a eventos realtime perdidos |

Un *worker durable* procesará inbox/outbox; Supabase cron/pg_net pueden ser un **respaldo de recuperación periódica**, no condición comercial para pasar a otra etapa. No prometer «en milisegundos»: transacciones remotas y conciliación PayPal pueden tardar, la UI siempre muestra estado real.

## 5. Fronteras de información y permisos

### Frontend
- Muestra dos notificaciones y la pantalla de oferta/cola; autentica intención de participar, salir de cola, solicitar checkout, revisar sus propios beneficios; **no escribe estados financieros ni decide etapa**.
- REST/Edge autenticado devuelve categorías saneadas: `pilotStage`, `myState`, `myCanCheckout`, `queueStatus`, `pendingVerification`, `benefitsActive`, `allowedActions`. Nunca IDs de merchant o de otros compradores, contadores de personas identificables ni secretos.
- Optimismo solo para la presentación «solicitud recibida», no para `paid`, `membershipActive` ni para un permiso de cupo no confirmado.
- Realtime/invalidación por cambios de proyección permitidos; **fallback GET al entrar, al volver de PayPal y al reenfocar PWA**.

### Edge Functions / Backend
- Validan JWT/owner, onboarding, permisos, términos, versionado, idempotency key y *rate limits*.
- Encargadas de la saga: intento propio, proveedor, evidencia de suscripción, periodo y proyección. No elevan modo por header o valor de frontend.
- Checkout obtiene autorización actual **en cada POST** y otra comprobación antes de CREATE; admitir de forma atómica en Supabase, jamás permitir GET `ready` como promesa de capacidad permanente.
- Worker escribe comprobante solo tras reconciliación firmada; publica evento de `PAID_ENTITLEMENT_VERIFIED` con identificador opaco. La rutina transaccional promueve cuota, asigna siguientes y encola notificación 2.
- Reintentos se reinician seguros tras caídas y no originan segundo cobro, segundo badge ni segunda notificación.

### Supabase/Postgres, fuente de verdad
- Estado privado versionado de campaña (`OFF/L1/L2/L3/PAUSED/LIMITED_COMPLETE`), `max_distinct_admitted`, `distinct_admitted_count`, `pending_slot_count`, contadores y revisión CAS.
- Tabla/estado privado de interés+cola con identificador de cuenta, fecha servidor, origen, aceptación/declinación y timestamp mínimo; sin almacenar datos del pagador ni mensajes de usuarios.
- Tabla/estado de **reservas** bloqueadas/atómicas con token opaco y owner, referencia idempotente, estado y transacción; índice de unicidad por owner/campaña y prevención de carreras.
- Fuente de evidencia pagada debe seguir siendo ledger privado Live existente: `pazo_paypal_live_paid_periods`, inbox firmado y proyección, nunca sumas de notificaciones, formulario o concesión `COMPLIMENTARY`.
- Outbox de acciones notificación y promociones con clave única `campaign,owner,kind`, *claim/ack* reintentable; las notificaciones que se ven al usuario conservan su propia RLS actual.
- Trabajadores con menor privilegio, RPC `SECURITY DEFINER` auditadas y scope exacto, RLS/FORCE+ACL, índice único/lock `FOR UPDATE`, límites de frecuencia y tampering tests.
- `anon/authenticated` no pueden promocionar stages, crear permisos propios ni escribir filas de ledger. No exponer lista completa ni posición exacta de otras cuentas.
- Cancelación de propia membresía, cobros históricos/renovaciones, reversos/holds siguen procesándose **aunque el canal de nuevos compradores esté pausado**.
- Migración propuesta **no aplicada**: modo `LIMITED` no existe en la release Live actual, `canary` continúa admitiendo únicamente su dueño original. Antes de cualquier implementación, conciliar intento Live ya abierto sin descartarlo/forzarlo.

## 6. Contrato de UX y dos notificaciones, no spam

**Notificación 1 — Invitación/apoyo** (una identidad lógica por cuenta/campaña, dentro de la bandeja):
- Inicio: «¿Te gustaría apoyar PAZO por $2.99 al mes?».
- Tras aceptar sin cupo: su misma tarjeta abre «Ya estás en la lista de espera»; no crea segunda invitación ni promete cuándo llegará turno.
- Al asignar cupo: **actualizar el estado/contenido del MISMO hilo lógico** a «Ya puedes continuar con PayPal», nuevo no leído si procede, y abrir pantalla de membresía con admisión revalidada. Es actualización de invitación 1, **no tercera campaña/notificación independiente**.
- No redirigir a una aprobación automática. El usuario puede dejar el proceso voluntariamente. Los que ven `Amigo de PAZO` pueden entrar en espera sin recibir campaña publicitaria previa.
- Si se trata de una bandeja que no soporta editar/actualizar el mismo registro, diseñar la proyección de un único hilo de campaña y una señal de unread/delta idempotente; **no crear dos notificaciones idénticas ni omitir aviso de cupo**.

**Notificación 2 — Pago acreditado, excelencia/revisión** (solo una por primera activación real): «¡Ya eres Amigo de PAZO! Tu pago fue verificado y tus beneficios ya están disponibles. Queremos ofrecer una experiencia excelente; ¿puedes comprobar tu insignia y beneficios?». CTA abrir revisión opcional. Feedback técnico+humano separados; no depender del feedback para pasar de etapa.

Todo bilingüe ES/EN, con UI ligera y cero contornos, sin push/email por defecto. El usuario puede consultar su estado también dentro de `Amigo de PAZO`.

## 7. Casos de aceptación e invariantes nuevos

| ID | Caso que debe pasar | Salida verificable |
| --- | --- | --- |
| `EVT-01` | 25 solicitudes simultáneas a cola con cuota L1 | 25 intereses únicos, a lo sumo 1 comprador con permiso; 24 cola, sin pagos |
| `EVT-02` | Primera venta firmada/conciliada y beneficio activo | L2=5 en el **mismo cierre de verificación** o transacción/outbox durable, nunca 24h |
| `EVT-03` | Tres compradores distintos verificados en L2 | L3=20, sin esperar día, IDs deduplicados por cuenta |
| `EVT-04` | Uno acepta invitación pero no pulsa pagar | Libera reserva segura por expiración **solo si no CREATE**, siguiente cola |
| `EVT-05` | Uno abandona tras CREATE proveedor | No libera sin comprobación PayPal; `resume` correcto, sin suscripción duplicada |
| `EVT-06` | PayPal tarda o webhook llega duplicado | Estado de cola correcto, una sola venta/periodo, una sola notificación 2 |
| `EVT-07` | Pago COMPLETED sin entitlement visible | Pausa nuevas ventas, beneficia después de recuperación, notificación 2 aplazada |
| `EVT-08` | 21.º al 25.º interesado con límite aprobado 20 | Continúa en cola, no recibe cobro; dashboard avisa demanda; sin ampliar arbitrariamente |
| `EVT-09` | 25 usuarios recargan/abren PWA tras notificaciones perdidas | GET recupera cupo actual/espera con dedup; ninguna doble venta |
| `EVT-10` | Reconciler cae después de pago firmado y antes de promocionar | Outbox durable/reintento retoma actualización; cero ascensos falsos |
| `EVT-11` | Cancelación/renovación/disputa mientras la campaña está pausada | Gestión y eventos históricos continúan, nuevo CREATE denegado |
| `EVT-12` | Usuario recibe solo notificación de beneficios con pago real | Únicamente si ledger+entitlement verificadas, sin enviar por cortesía administrativa |
| `EVT-13` | Cliente modifica respuesta `myCanCheckout` en navegador | POST servidor rechaza falta de cupo (no se elude límite) |
| `EVT-14` | Contención concurrente al promover o asignar | CAS/lock único, no sobrepasar cuotas ni ofrecer doble slot |
| `EVT-15` | Solicitud original Live abierta al desplegar control nuevo | Queda conciliada/aislada antes de operar, sin cancelación o borrado arbitrarios |

Añadir EVT-01…EVT-15 al **Scope Closure** de GR-01…GR-22; no retirar pruebas Sandbox ni controles que ya pasaron. No declarar `RELEASE_READY` por documentación, CI o mocks.

## 8. Decisión adicional para resolver demanda por encima de 20

**YA AUTORIZADO:** cuotas L1=1, L2=5, L3=20 e invitación inicial a 5 cuentas, caducidad 72h. Avanzar en función del evento financiero y beneficio, **no por 24h**. El PO autorizó en el turno previo preparar la implementación de esas reglas en rama, pero **no autorizó SQL/Edge hospedado ni cobros nuevos**.

**POR DECIDIR PARA CASO 25+ interesados:** autorizar de antemano una **cuota máxima adicional** (recomendación `L4=50`, con ampliación automática desde L3 únicamente tras, por ejemplo, 10 compradores distintos acreditados y cero incidentes financieros abiertos) **o** conservar tope 20, mostrar demanda y permitir que el PO abra `public` cuando quiera. `L4` es una recomendación **no aprobada**, no habilitarla ni cambiar el contrato financiero. En cualquiera de las opciones, no se debe cobrar ni prometer cupo a personas fuera de la capacidad que el PO autorizó.

**PRÓXIMO GATE:** revisión de reglas de EVT-01..15 y decisión L4/techo; después implementar en rama la cola/guard transaccional/worker-notificaciones y ensayos reproducibles. El permiso de encender cobros es siempre independiente y requiere una orden expresa de producción del PO.

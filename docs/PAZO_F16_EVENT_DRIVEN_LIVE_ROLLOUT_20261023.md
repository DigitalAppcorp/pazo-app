# PAZO F16 — Reglas de apertura Live POR ACCIÓN (event-driven), cola y comunicación UI/API/Supabase

**Fecha:** 23-oct-2026
**Documento especializado:** anexo vinculante de producto/arquitectura para `PAZO_F16_GRADUAL_LIVE_ROLLOUT_PRODUCT_SPEC_20261023.md` (no sustituye sus 22 requisitos ni el historial de ideas).
**Decisión expresa PO de esta conversación:** el PO aprobó **5 invitaciones iniciales, 72 horas para responder, cola FIFO y cuotas acumuladas 1→5→20→50**. Ordenó **eliminar la espera por día** y avanzar por **acciones verificadas**. Aprobó expresamente la cuarta etapa `L4=50` con disparador de **10 compradores distintos**, cada uno con pago Live verificado y beneficios acreditados, **sin incidencias financieras críticas abiertas**. Backend/Supabase ejecutan el cambio automáticamente y el frontend lo refleja, sin intervención administrativa por cada venta.
**Estado:** `PRODUCT_EVENT_DRIVEN_DIRECTION_APPROVED / DECISION_PACKET_SAVED / BRANCH_CODE_AUTHORIZED_PREVIOUSLY / NOT_IMPLEMENTED / NOT_DEPLOYED / PAYMENTS_NOT_EXPANDED`.
**Precedencia:** las reglas de este archivo **reemplazan explícitamente** cualquier requisito anterior de **24 horas** como condición de promoción entre etapas en el documento rector, roadmap o handoff. El periodo de **72h solo es caducidad de invitación sin checkout**, nunca ventana de avance financiero. Las ventanas técnicas de reintento/leases/salud son necesarias, pero **no son días de espera comercial**.

## 1. Resumen y límite honesto

Queremos que 25 usuarios interesados **no sean descartados** porque un primer checkout solo admite un comprador. Dos conceptos distintos:
- **Interés no limitado:** cualquier usuario elegible invitado o que abra `Amigo de PAZO` desde la app puede indicar «Me interesa» y quedar en una **lista de espera duradera**, incluso mientras se permite 1 checkout. Deduplicación por cuenta y campaña. No crea intención PayPal ni cargo.
- **Pago limitado temporalmente:** al inicio **solo 1 comprador** puede iniciar una nueva suscripción Live en L1; L2 permite **5 compradores acumulados**, L3 **20 acumulados** y L4 **50 acumulados**. La cola conserva los interesados mientras llega el evento de ampliación; no hay permiso para sobrepasar el techo de 50.

**Advertencia comercial sin engaños:** conservar interés/cola **NO garantiza convertir ventas**: alguien puede desistir. En el ejemplo de 25 interesados, todos pueden conservar su puesto y, **si se verifican 10 compradores distintos y no hay fallos críticos**, L4 autoriza hasta 50 sin intervención del PO. Hasta que ese disparador ocurra, los restantes esperan. Más de 50 requieren decisión futura o GO separado para `public`; PAZO no rompe el máximo de forma unilateral.

El PO no tiene que promover manualmente **L1→L2→L3→L4**: PAZO lo hace al verificar el evento requerido y su salud. El paso desde **L4 (50) a `public` o más de 50** requiere autorización posterior y MFA. Mientras no se cumpla el disparador de una etapa, la demanda se conserva en cola y nunca se ofrece checkout falso.

## 2. Reglas de promoción *por evento*, sin días de espera

| Regla | Evento verificable que la dispara | Resultado automático | Si falla |
| --- | --- | --- | --- |
| `EV-01` Preentrada a cola | `INTEREST_ACCEPTED` de usuario autenticado/elegible | Insertar/actualizar interés idempotente; devolver `QUEUED` o `SLOT_GRANTED` | Devolver error seguro, sin doble fila ni cargo |
| `EV-02` Primer lugar L1 | `INTEREST_ACCEPTED` + cupo inicial libre + salud backend/PayPal lista | Reservar **1** slot de checkout, notificación existente cambia a `TU CUPO` | Mantener cola FIFO |
| `EV-03` **L1→L2 (1→5)** | **Primer** pago Live de comprador externo independiente verificado: firma+merchant+plan+amount+periodo pagado persistido **y beneficio server-side visible** | Actualizar etapa a L2 y capacidad acumulada a **5** en transacción CAS, liberar inmediatamente el siguiente lote de slots conforme cola | `BLOCKED/REVIEW_REQUIRED`: no promover; notificar admin |
| `EV-04` **L2→L3 (5→20)** | Tercer **comprador distinto**, total acumulado de 3 ventas Live auténticas conciliadas + beneficios activos y **sin fallos críticos abiertos** | Actualizar L3 y cupo a **20** atomizado; reasignar cola | Sin prueba suficiente, conservar L2 |
| `EV-05` Reasignación sin venta | Usuario rechaza o un intento **sin CREATE en PayPal** termina localmente con prueba/lease finalizado; o proveedor confirma terminal sin cobro ni pendientes | Liberar **solo reserva temporal** si no existe suscripción Live vinculada; ofrecer slot al siguiente FIFO | Si estado remoto desconocido, mantener cupo reservado y reconciliar |
| `EV-06` Venta COMPLETED con retraso | Webhook firmado llega después de retorno/app cerrada | Procesar inbox durable, verificar fuente original, acreditar beneficio; ejecutar EV-03/04/14 cuando criterios completos | Dejar pendiente, reintentar de modo idempotente |
| `EV-07` Usuario paga y beneficio falla | Venta confirmada pero proyección de beneficios incorrecta/pendiente crítica | NO notificación 2; detener NUEVAS compras, registrar caso, reintentar reparación idempotente | No inventar periodo, no borrar transacción |
| `EV-08` Riesgo financiero | Firma no válida, merchant mismatch, workers/webhook sin salud, eventos/holds críticos, creación PayPal ambigua no reconciliable | `PAUSED_AUTOMATIC` de nuevas compras + alertas/código de causa para admin | Continuar liquidación histórica, renovación, cancelaciones, refunds y soporte |
| `EV-09` Demanda acumulada | Un nuevo interesado eleva `queue_depth` y capacidad está agotada | Conservar puesto y mostrar cola / panel; **sin saltarse EV-03/04/14** | No fingir «cupo disponible» |
| `EV-10` Techo final L4 alcanzado | 50 compradores distintos realmente admitidos | `LIMITED_COMPLETE`, conservar cola e informar al admin sobre demanda adicional | No sobrepasar 50 por carrera ni autocambiar a `public` |
| `EV-11` Comprador verificado | Pago+periodo+beneficios `ACTIVE_VERIFIED` | Una **notificación 2**: agradecimiento + comprobación opcional, idempotente | Reintentar únicamente la entrega de mensaje |
| `EV-12` Usuario contesta revisión | `FEEDBACK_OK` / `FEEDBACK_ISSUE` | Registrar UX/ticket y métricas separadas de finanzas | Feedback negativo no revoca pago ni frena todos los checkouts sin gravedad |
| `EV-13` App vuelve a primer plano | `APP_RESUME` / apertura bandeja | Consultar el estado autoritativo y reflejar cupo/cola/pago/beneficios aunque no se recibiera Realtime | Mantener estados explícitos; no doble CREATE |
| `EV-14` **L3→L4 (20→50)** | **Décimo comprador distinto** con primera venta Live `COMPLETED` firmada, conciliada, período vigente y beneficio real `ACTIVE_VERIFIED`; sin incidencias financieras críticas abiertas | Elevar en CAS/transacción capacidad acumulada a **50**, activar asignación FIFO y actualizar frontend/notificaciones, **sin esperar horas o aprobación manual** | Conservar L3=20 y cola si hay anomalía, firma dudosa, pagos sin beneficio o worker inactivo |
| `EV-15` Techo L4 o solicitud `public` | Llegar a 50 compradores admitidos o recibir petición de ampliar sin aprobación adicional | Mantener `LIMITED_COMPLETE` y solicitar nueva decisión PO con MFA para ir a `public`; seguir reconciliando compras históricas | Ninguna transición automática a más de 50 |

**Antes de cada promoción** el orquestador reevalúa bajo lock/versión: worker heartbeat reciente, webhook firmado/listo, generación PayPal original y price USD 299, origen canónico, términos, integridad de cola/leases, saldo de transacciones pendientes y ausencia de bloqueos críticos. La lectura de métricas del navegador no decide promociones.

**Una venta parcial o `ACTIVE` sin venta `COMPLETED` NO satisface EV-03/04/14.** Una cortesía administrativa tampoco. El formulario voluntario de beneficios NO es gate financiero ni gatillo para demorar ventas.

**Qué NO hay:** espera de 24 horas, aprobación administrativa por cada subida, esperas de «un día sin reportes», depender del usuario para confirmar que el webhook funciona.

## 3. Flujo real para 25 compradores interesados

- Enviar las primeras **5 invitaciones** en la bandeja tal como aprobó el PO; si otros 20 visitan la oferta por sí mismos, pueden registrar su interés **sin esperar a ser invitados**. De lo contrario, solo 5 sabrían del programa.
- Supabase guarda 25 voluntades únicas en orden servidor y decide el primero con permiso de iniciar el checkout. Los 24 restantes ven una **espera transparente**, estado y opción de regresar; nadie paga para hacer fila.
- **Tras acreditar primer pago y beneficios:** el mismo procesamiento dispara L2 y entrega permisos a los siguientes 4 hasta capacidad acumulada 5. La app conectada recibe cambio; quien vuelva más tarde lo verá correctamente.
- **Tras tercer comprador distinto acreditado:** el mismo procesamiento dispara L3 y se admiten compradores hasta llegar a 20, sin reloj de 24 horas.
- **Tras el décimo comprador distinto acreditado y sin incidentes críticos:** el evento promueve L3→L4 automáticamente y habilita hasta **50 compradores acumulados**, ofreciendo cupo según FIFO a quienes seguían en cola. Si aún no existen 10 ventas correctamente acreditadas, cualquier interesado fuera de los 20 continúa esperando; no es autorización para sobrepasar capacidad.
- La velocidad real depende de que **1, luego 3 y finalmente 10 compradores distintos** finalicen efectivamente y PayPal/worker acrediten sus ventas y beneficios. Si el primer comprador no paga, PAZO no puede demostrar el primer cobro; se rotan **únicamente intentos terminales verificados**, sin timers que borren obligaciones remotas.

## 4. Tiempo por ACCIÓN, no por días

| Evento | Acción inmediata del sistema | Regla del reloj |
| --- | --- | --- |
| Pulsa «Me interesa» | ACK autenticado, upsert de una fila de cola y resultado de reserva/posición aproximada | No esperar a cron nocturno |
| El primer usuario obtiene cupo | Server-side `SLOT_GRANTED`, consumir tiempo de checkout solo si realmente inicia proceso; render inmediato | Reservas no iniciadas pueden expirar con lease corto configurable; **valor exacto se mide/aprueba en arquitectura**, no inventar timeout de PayPal |
| Cierra checkout ANTES del CREATE | Cancelación local idempotente, liberación de reserva y siguiente cola en misma transacción | Inmediata si existe evidencia de que NO hubo CREATE |
| Sale de PayPal DESPUÉS de CREATE | Retomar intento original o conciliar terminal del proveedor; **no** doble CREATE | No liberar por caducidad simple |
| `PAYMENT.SALE.COMPLETED` firmado y concilado | Acreditar período, verificar beneficio, probar umbrales **1/3/10** y promover etapa/cupo atómicamente antes de despachar cola | En evento/transacción, sin espera comercial; duración externa/asíncrona variable |
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
| `EVT-08` | 21.º al 25.º interesado con etapa L3 de 20 sin llegar a 10 ventas verificadas | Continúa en cola sin cobro; al alcanzar décimo pago verificado, L4=50 permite asignación sin intervención PO |
| `EVT-09` | 25 usuarios recargan/abren PWA tras notificaciones perdidas | GET recupera cupo actual/espera con dedup; ninguna doble venta |
| `EVT-10` | Reconciler cae después de pago firmado y antes de promocionar | Outbox durable/reintento retoma actualización; cero ascensos falsos |
| `EVT-11` | Cancelación/renovación/disputa mientras la campaña está pausada | Gestión y eventos históricos continúan, nuevo CREATE denegado |
| `EVT-12` | Usuario recibe solo notificación de beneficios con pago real | Únicamente si ledger+entitlement verificadas, sin enviar por cortesía administrativa |
| `EVT-13` | Cliente modifica respuesta `myCanCheckout` en navegador | POST servidor rechaza falta de cupo (no se elude límite) |
| `EVT-14` | Contención concurrente al promover o asignar | CAS/lock único, no sobrepasar cuotas ni ofrecer doble slot |
| `EVT-15` | Solicitud original Live abierta al desplegar control nuevo | Queda conciliada/aislada antes de operar, sin cancelación o borrado arbitrarios |
| `EVT-16` | Décima venta de comprador distinto firmada, conciliada y con beneficio activo en L3 | El mismo cierre de verificación (o trabajo durable inmediato) promueve **L4=50** y asigna cupos FIFO sin esperar un día |
| `EVT-17` | Diez ventas brutas pero una de ellas repetida, reembolsada/en hold, sin beneficio o de cortesía | **NO** promover L4: solo cuentan diez propietarios distintos con períodos Live verificados y beneficio vigente, sin anomalías críticas |
| `EVT-18` | 51.º interesado mientras se alcanzó el tope 50 | Sin nuevo CREATE, permanece en cola; `public` requiere autorización PO/MFA independiente |
| `EVT-19` | 25 usuarios en cola y 10 pagos verificados con L4 habilitada | Los interesados restantes reciben un cupo hasta el máximo 50; ni tercero cobra por estar en cola ni pierde su puesto por cambio de etapa |

Añadir EVT-01…EVT-19 al **Scope Closure** de GR-01…GR-22; no retirar pruebas Sandbox ni controles que ya pasaron. No declarar `RELEASE_READY` por documentación, CI o mocks.

## 8. Decisión PO APROBADA — cuarta etapa automática de 50 compradores

**Autorización expresa del PO:** «sí» a **L4=50 compradores acumulados**. El disparador es **10 compradores distintos** con venta Live real `COMPLETED`, firma y conciliación correctas, cobertura pagada acreditada y beneficios activos, **sin fallos financieros críticos abiertos**. El mismo orquestador que abre L2/L3 debe abrir L4 automáticamente después del décimo éxito verificado, con control CAS/lock, asignación a cola FIFO y notificación de disponibilidad en el hilo existente. No esperar 24 horas ni solicitar entrada a Administración para ese avance.

**Escalera cerrada y ya decidida a nivel producto:**

| Etapa | Máximo acumulado de compradores autorizados | Desencadenante de entrada | Requiere decisión humana entre etapas |
| --- | ---: | --- | --- |
| `L1_FIRST_REAL` | 1 | Activación inicial con GO de lanzamiento limitado | Sí: **solo para empezar la campaña Live real**, no para cada comprador |
| `L2_SMALL` | 5 | 1 comprador distinto con pago Live y beneficios verificados | **No** |
| `L3_BETA` | 20 | 3 compradores distintos con pago Live y beneficios verificados | **No** |
| `L4_EXTENDED` | 50 | 10 compradores distintos con pago Live y beneficios verificados | **No** |
| `LIMITED_COMPLETE` | 50 | Capacidad final de 50 compradores admitidos | No más CREATE; interés/cola siguen |
| `PUBLIC` | Sin cuota piloto | **GO posterior explícito del PO con MFA**, no por diez ventas | **Sí** |

**Qué significa «compradores»:** cuentas distintas con una **suscripción Live admitida**, no mascotas ni renovaciones. El límite de capacidad es de suscriptores distintos acumulados admitidos; un cliente cancelado sigue habiendo consumido una plaza histórica. Para alcanzar el umbral de promoción, además, deben existir **1, 3 o 10 clientes distintos con sus propias ventas iniciales verificadas y beneficio pagado proyectado**. Los intentos en estado indeterminado ocupan una reserva segura hasta reconciliarse; no se liberan con timers arbitrarios.

**Qué ocurre con 25 interesados:** todos pueden expresarse en cola. Solo uno empieza L1; cuando se valida un pago, se abre L2; al tercero, L3; al décimo, L4, donde caben 25 y hasta 50. Puede haber abandono de interesados o demoras del proveedor; PAZO no debe prometer una compra instantánea ni que los 25 necesariamente pagarán.

**Gate de integridad adicional:** si una transacción está cuestionada, reembolsada, en hold, no tiene período válido/beneficio o su owner es distinto/inválido, **NO** cuenta para disparar L4. Si el sistema ya amplió cuando la evidencia era válida y después hay refund/disputa, pausar futuras nuevas compras según reglas de riesgo; no eliminar historia, vender más por liberar plazas ni retirar derechos arbitrariamente. Ninguna promoción se produce sin webhook/worker y base saludables.

**Go de implementación:** documentado como aprobación de producto y de programación en rama F17 ya otorgada. **No implica** instalar SQL alojado, desplegar Edge/Vercel, habilitar nuevos cargos reales ni cambiar release del estado `canary`; esas operaciones requieren GO separado. Los requisitos previos EV y GR siguen vigentes, ampliar pruebas a EVT-19.

**Límite posterior:** para superar 50 o quitar el techo, pedir nueva aprobación del PO mediante Administración/MFA; no inventar L5 ni pasar a `public` automáticamente.
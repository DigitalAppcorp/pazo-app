# PAZO F16 — Apertura gradual automática de Amigo de PAZO Live

**Fecha:** 23 de octubre de 2026  
**Documento rector:** especificación funcional + seguridad + matriz de aceptación del lanzamiento financiero  
**Estado:** `PRODUCT_DIRECTION_APPROVED / FLOW_PROPOSED / CODE_NOT_AUTHORIZED / PAYMENTS_NOT_EXPANDED`  
**Product Owner:** PAZO  
**Ámbito:** membresía voluntaria Amigo de PAZO, **USD 2.99/mes**, suscripción real renovable PayPal Live  
**Rama:** `f17/beta-final-mobile-support-admin-20261022`; PR #81 DRAFT  
**Referencias:** `PAZO_ACTIVE_HANDOFF.md`, `PAZO_MASTER_ROADMAP.md`, `PAZO_FIRST_LIVE_SUPPORTER_AUTOMATED_PILOT_PROPOSAL_20261023.md`, `PAZO_MODULE_LIFECYCLE.md`, `PAZO_PRIVACY_DATA_GOVERNANCE.md`, `PAZO_DATA_INVENTORY.md`, `PAZO_ARCHITECTURE_CONTRACT.md`.

> **Precedencia y preservación de ideas:** este documento desarrolla la **opción B de LANZAMIENTO GRADUAL AUTOMÁTICO**, expresamente elegida por el PO el 23-oct-2026. **No significa que eligió la antigua opción B de SELECCIÓN DE INVITADOS** (varias invitaciones vs. una por vez), distinción que sigue abierta. Conserva la antigua propuesta y todos sus textos como fuente histórica; no borrar ni reescribir silenciosamente sus ideas. La decisión de estrategia no autoriza por sí misma nueva DDL, SQL, deploy, pagos reales ni cambio de control de release.

## 1. Decisión aprobada vs. decisiones en estudio

### Decidido por el PO
1. Elegir **apertura limitada y ampliación automática por etapas**, en lugar de exigir una compra Live previa separada y supervisada antes de admitir cualquier comprador externo, o abrir desde el primer instante a todos.
2. Mantener a PAZO gratis en sus funciones principales; **Amigo de PAZO** continúa como apoyo opcional de **USD 2.99 mensuales**, bajo consentimiento individual claro.
3. Conservar **dos notificaciones exclusivamente en la bandeja de PAZO**: invitación a apoyar (antes de la compra) y agradecimiento tras un pago acreditado invitando a verificar beneficios (después).
4. Preferir operación desatendida: selección/cola, checkout, procesamiento firmado, beneficios, mensajes y panel, sin necesidad de contactar manualmente al comprador.
5. Recibir confirmaciones de experiencia y problemas; cuando la experiencia esté bien validada, **considerar** simplificar la segunda notificación a un agradecimiento normal.
6. Preservar las pruebas Sandbox y concesiones manuales ya aprobadas: **no repetirlas innecesariamente ni confundir cortesías administrativas con pagos Live**.

### Propuestas concretas, **aún no autorizadas como configuración**
- Tamaños de cohortes, condiciones de avance, tiempos máximos, selección de destinatarios, frecuencia de invitaciones, cooldown y reversión.
- Seleccionar **una invitación a la vez** o **varias invitaciones con cola** (eran A/B del documento anterior, NO la B aprobada aquí). **Recomendación de diseño:** invitar a varios interesados, pero reservar pocos cupos para checkout; no atribuir elección al PO.
- Copia final ES/EN y el momento exacto para sustituir la solicitud de revisión por agradecimiento simple.
- Cuándo cambiar de `LIMITED` a `PUBLIC`; se propone mantener **GO administrativo explícito con MFA** para quitar el último límite.
- Requisitos concretos de cumplimiento legal, retención de telemetría piloto, umbrales de incidente y versión final de contratos.

**Gate actual:** diseño para discusión/documentación. No iniciar actividad financiera nueva en esta fase.

## 2. Principios inviolables de esta versión

- **PAZO no inicia un pago al enviar o aceptar una invitación.** Cada usuario ve oferta, términos, periodicidad y cancelación; decide personalmente en PayPal. Renovaciones pactadas con PayPal se rigen por ese consentimiento.
- **No fingir que es una transacción de prueba.** Son pagos Live auténticos de clientes reales, no Sandbox ni autocompra del comercio.
- La app nunca declara beneficio pagado por `APPROVAL_PENDING`, simple `ACTIVE`, retorno al navegador o tarjeta de aceptación; solo por evidencia de venta `COMPLETED` firmada/conciliada y período pagado vigente.
- **No emitir la segunda notificación de beneficios activos** sin verificar ambos: pago/periodo **Y** proyección real de beneficio.
- La experiencia de revisión es **voluntaria y no modifica derechos**; ausencia de respuesta jamás revoca o pospone beneficios.
- Las concesiones de cortesía de Administración no se registran como ventas, ingresos, primera compra Live ni éxito financiero.
- El usuario mantiene acceso al historial, cancelación de renovaciones, disputas, reembolsos y soporte **aunque el sistema pause nuevos checkouts**.
- Seguridad permanece activa: CORS de orígenes exactos, JWT/GoTrue, fresh MFA de Administración, Vault por generación original, evento firmado, RLS/ACL, SQL service-only, idempotencia/leases, CAS revisión y kill switch.
- No abrir `public` para sortear `canary`; diseñar e instalar un nuevo control limitado **antes** del primer cliente externo, bajo GO separado.
- No tocar el mapa Mapbox Standard, los seis módulos gratuitos ni pantallas aprobadas fuera del ámbito financiero/notificaciones.

## 3. Experiencia del usuario — antes de pagar

### U01 — Invitación en bandeja (notificación 1)
- Enviar solo dentro de `notificaciones`; **no push, SMS ni email** por defecto.
- El remitente es `PAZO`. La notificación se asocia a una campaña de lanzamiento y se deduplica por usuario/campaña/etapa.
- Bilingüe ES/EN según idioma de PAZO, con lectura/accesibilidad, sin bordes/contornos conforme AGENTS.md.
- Texto candidato:
  - **Título:** «¿Te gustaría ser uno de los primeros Amigos de PAZO?»
  - **Cuerpo:** «Estamos creando una comunidad mejor para nuestras mascotas. Puedes apoyar voluntariamente a PAZO por **$2.99 al mes** y recibir beneficios especiales. ¿Te interesa?»
  - Acciones: **«Quiero participar»** y **«Ahora no»**.
- Clic en aceptar abre explicación + términos; **NO** crea intent PayPal ni reserva indefinidamente un cupo.
- «Ahora no» conserva todas las funciones gratuitas; registrar como declinación para no recontactar en la misma campaña.
- Si no hay cupo disponible, invitar a expresar interés para una **lista de espera explícita**, sin prometer acceso inmediato ni abrir checkout. No mostrar botón pagar activo si el servidor no otorgó acceso.

### U02 — Oferta y consentimiento
- Abrir `Amigo de PAZO` existente: **USD 2.99/mes**, renovación mensual, beneficios reales, fecha/condiciones aplicables, método PayPal, gestión y cancelación; versionar consentimiento ES/EN.
- Releer autorización en el servidor antes de GET/POST de checkout. El usuario no puede elegir cupo, owner, generación, merchant, precio o plan por cliente.
- En caso de indisponibilidad: «Por el momento las suscripciones están temporalmente limitadas. PAZO sigue siendo gratuito.» Opcional: apuntarse a lista de espera; nunca cobrar fuera de control.

### U03 — Ingreso PayPal, retorno y abandono
- Reservar un **cupo transaccional servidor** justo antes de permitir crear una suscripción real y comprobar límite dentro de la misma operación concurrente.
- Si la persona abandona PayPal, PAZO conserva **«Continuar con PayPal»** y **«Comprobar cierre e intentar de nuevo»**, usando los contratos Live del 23-oct-2026, no un segundo CREATE.
- No liberar cupo al vencer temporizador cuando PayPal ya tiene una solicitud abierta, cuenta de solicitud reclamada, cancelación en tránsito o estado desconocido.
- Estado visible al volver: «Comprobando el pago», nunca «Membresía activa» hasta verificación.
- Si no tiene PayPal, puede salir sin penalización; no afirmar que el pago como invitado o tarjeta funciona si no está implementado y probado para suscripciones.

## 4. Experiencia del usuario — después de pagar

### U04 — Cobro confirmado y beneficio activo
- Mostrar los beneficios originales de Amigo de PAZO sin esperar respuesta al cuestionario: insignia en perfil y publicación, hitos/ventajas existentes, gestión y cancelación.
- Evitar parpadeo entre oferta y beneficio durante la carga; distinguir `verificando`, `pagado verificando acceso`, `beneficios activos`, `revisión requerida`, `error recuperable`.
- Exponer datos financieros mínimos de la propia cuenta; nunca PayPal IDs, logs o información de otra persona.

### U05 — Notificación 2 (una por primera acreditación)
- Condición estricta: primera venta pagada verificada **Y** beneficio habilitado; **no** por la mera llegada del webhook ni por renovación mensual. Entrega idempotente; posible `unread` en bandeja y navegación hacia revisión.
- **Título:** «¡Ya eres Amigo de PAZO!»
- **Cuerpo:** «Muchas gracias por apoyar nuestra comunidad. Tu pago fue verificado y tus beneficios ya están disponibles. En PAZO queremos ofrecer una experiencia excelente. ¿Nos ayudas a revisarlos y contarnos si todo funciona correctamente?»
- CTA: **«Revisar mis beneficios»**.
- Si aún no hay prueba de acreditación completa, permitir pantalla de estado/soporte pero **no enviar esta notificación engañosa**.

### U06 — Pantalla de revisión voluntaria
- Reutilizar `SupporterBenefitsHome` y soporte, sin inventar recompensas adicionales por responder.
- Cuatro señales visibles: insignia Amigo; insignia en perfil/publicaciones; acceso a beneficios; gestión de membresía.
- Botones: «Todo funciona correctamente», «Encontré un problema» y cierre/salir.
- «Encontré un problema» abre un ticket privado de soporte con categoría campaña, identificador interno seguro, sin solicitar datos de tarjeta/PayPal; permitir indicar cuál componente falló.
- Guardar consentimiento/feedback mínimo, deduplicación y tiempo; no publicar opinión en perfil, no afectar el ledger ni cancelar automáticamente.
- **Futuro:** una vez que la calidad esté validada y el PO lo apruebe, convertir esta notificación en **agradecimiento simple** y dejar la comprobación opcional en `Mis beneficios`. **No eliminar ni sobrescribir el texto original del piloto.**

## 5. Modelo de lanzamiento gradual — protección financiera

La opción B aprobada es crecer automáticamente **dentro de una capacidad máxima explícita**. Valores abajo son **recomendación para revisión**, no parámetros ya aprobados:

| Etapa propuesta | Compradores Live distintos admitidos desde inicio | Condición antes de ampliar | Público |
| --- | --- | --- | --- |
| `L1_FIRST_REAL` | **1 acumulado** | Una venta original firmada, conciliación escrita, beneficio visible, salud worker/webhook normal y cero alertas críticas; revisión opcional | Solo invitados autorizados |
| `L2_SMALL` | Hasta **5 acumulados** | Primera compra `L1` acreditada y procesamiento estable durante ventana observacional propuesta de 24 h | Solo interesados seleccionados |
| `L3_BETA` | Hasta **20 acumulados** | Al menos 3 compras distintas confirmadas sin incidentes abiertos que comprometan dinero/beneficios; ventana saludable propuesta de 24 h | Solo interesados seleccionados |
| `LIMITED_COMPLETE` | Máximo **20**, sin crecimiento adicional | Reporte financiero + UX + soporte disponible a admin | Continúa restringido |
| `PUBLIC` | Sin cupo piloto | **Autorización expresa del PO en Administración con MFA reciente** y revisión real de resultados/retención/cancelación | Todos los usuarios elegibles |

**Interpretación esencial de la cuota:** cuenta **número acumulado de suscripciones Live admitidas para este piloto** (incluidas las que luego cancelen), no solamente número de checkouts ejecutándose ni número de suscriptores activos. Un pedido reservado y todavía incierto consume capacidad; cuando queda probado que nunca creó suscripción o fue terminal sin pago y sin pendientes, se puede liberar esa reserva bajo reglas verificadas. No liberar una suscripción real ya admitida porque pagó rápido o después canceló; evitar crecimiento ilimitado por rotación.

**Concurrencia:** adicionalmente proponer techo de **1 intento nuevo en transición sin resolver** en L1 y techo bajo configurable en L2/L3. Una reserva no es un cobro, expira solo si no se inició CREATE ni existe estado pendiente remoto. Bajo timeout se consulta registro idempotente antes de decidir; nunca duplicar.

**Autoavance condicionado:** comprobar salud de la fuente financiera y del plano de control en cada ampliación (worker heartbeat, webhook listo, generación/origen fijados, términos, ledger, atribución y proyección de beneficios, ausencia de disputas/holds o eventos estancados relevantes). La respuesta voluntaria del usuario **aporta señal UX**, pero no sustituye evidencia financiera ni debe ser obligatoria para que el comprador conserve sus beneficios.

**Cierre de control antiguo:** la ruta `canary -> public` vigente exige un propietario canary específico y evidencia de cancelación de esa cuenta. Debe revisarse el gate para que **no dependa de cancelar la renovación del primer cliente legítimo**. Nunca cancelar o reembolsar de oficio la suscripción de un cliente para que el release pase.

**No auto-publicación:** después del límite máximo, mostrar `LISTO PARA REVISIÓN ADMIN`, no convertir `public` en automático. El PO puede dejar piloto limitado si lo desea.

## 6. Selección, cola e invitaciones

- Dirigirse solo a cuentas existentes y elegibles (18+ según atestación actual, onboarding completo, no bloqueadas ni eliminadas, sin pago activo de la misma oferta). Evitar seleccionar la cuenta comercial PayPal propia o cuentas QA cuando exista vínculo probado, sin recopilar datos invasivos.
- El **método de distribución** continúa sin decisión: una invitación cada vez versus varias invitaciones + lista de espera. Recomendación técnica provisional: invitar a un lote limitado, pero permitir **un solo intento Live nuevo sin resolver** al empezar; nadie pagará solo por estar en la cola.
- Usuario único como unidad; múltiples mascotas NO multiplican cupos, votos, invitaciones ni métricas.
- Sin insistencia comercial o mensajes repetidos al que declinó. Fecha de caducidad, tamaño del lote y máximo de nuevas invitaciones al día son **parámetros pendientes de GO**. Evitar prometer turnos con plazo fijo.
- Si se congela piloto por seguridad, suspender invitaciones y nuevas reservas, informar con claridad al usuario que espera; invitaciones ya leídas no conceden derecho a cobro fuera de estado activo.
- Lista de espera no puede utilizarse para emitir CREATE PayPal hasta otorgarse autorización servidor y cupo verificado.

## 7. Estados separados: no colapsar toda la operación en un solo status

**Campaña financiera:** `DRAFT` -> `APPROVED_INACTIVE` -> `L1_FIRST_REAL` -> `L2_SMALL` -> `L3_BETA` -> `LIMITED_COMPLETE` -> (GO humano) `PUBLIC`; en cualquiera de las etapas limitadas: `PAUSED_AUTOMATIC` o `PAUSED_ADMIN`. Pausa no borra etapa/cupos ni cambia una venta antigua.

**Invitación:** `ELIGIBLE`, `INVITED`, `OPENED`, `INTERESTED`, `WAITLISTED`, `DECLINED`, `EXPIRED_UNCLAIMED`. No confundir con estado de pago.

**Reserva / checkout:** `NO_RESERVATION`, `SLOT_RESERVED`, `PROVIDER_CREATE_UNCERTAIN`, `APPROVAL_PENDING`, `APPROVED_UNVERIFIED`, `TERMINAL_CONFIRMED`, `SALE_RECONCILIATION_PENDING`, `SALE_VERIFIED`, `REVIEW_REQUIRED`. Este estado orquesta/adapta los estados ya existentes; NO sustituir la historia PayPal Live.

**Beneficios:** `NO_PAID_COVERAGE`, `PENDING_PROJECTION`, `ACTIVE_VERIFIED`, `HELD_OR_EXPIRED`; separar cortesías `COMPLIMENTARY` no monetarias.

**Feedback:** `NOT_ELIGIBLE`, `INVITATION_SENT`, `NOTIFICATION_READ`, `CONFIRMED_OK`, `ISSUE_REPORTED`, `NO_RESPONSE`, `THANK_YOU_ONLY`.

Todas las transiciones financieras requieren evidencia privada servidor con CAS/idempotencia, autor original y generación; **nunca desde un checkbox ni una respuesta de notificación.**

## 8. Automatizaciones y manejo de incidentes

### Sistema / PAZO
1. Generar y deduplicar invitaciones solo cuando etapa permita nuevas incorporaciones.
2. Reservar cuota en transacción/lease atómica antes de CREATE PayPal; evaluar admisión en GET y POST.
3. Validar salud y registrar correlación intento→usuario→generación original, leyendo únicamente datos autorizados.
4. Procesar webhook firmado en durable inbox; GET independiente contra PayPal cuando corresponde; ledger y paidThrough exactos; proyección de beneficio; notificación posterior idempotente.
5. Actualizar dashboard/alertas; pasar de etapa solo con métricas confiables; asegurar que una tarea caída se reanuda sin repetir cargos/notificaciones.
6. Seguir reconciliando renovaciones, cancelaciones, reembolsos, disputes y period holds **aunque esté pausada la admisión**.
7. Pausar nuevas invitaciones/CREATE automáticamente ante incidente financiero crítico. No borrar ni esconder compradores existentes; proporcionar estado comprensible y soporte.

### Incidentes / respuestas
| Incidente | Acción automática en nuevas ventas | Acción para clientes existentes |
| --- | --- | --- |
| Worker heartbeat vencido, webhook no disponible o firma inválida | `PAUSED_AUTOMATIC`, sin nuevas reservas/CREATE | Preservar webhook/inbox y recuperar estado; no borrar historial |
| PayPal `COMPLETED` y beneficio no proyectado | Pausar ante caso crítico; reintentar proyección idempotente | Mostrar «Pago en verificación; estamos resolviéndolo» y acceso a soporte; alerta admin |
| Incongruencia amount/plan/merchant/owner | Pausar, `REVIEW_REQUIRED`, sin grant | Mantener prueba financiera y soporte, no decidir automáticamente reembolso |
| Duplicados de webhook, reintento de red o callback múltiple | Deduplicar, no cobrar ni acreditar doble | Mantener cuenta y historial correctos |
| Desacuerdo de feedback UX sin error financiero | Registrar ticket; evaluar severidad, no inferir fallo de PayPal | Conservar derechos; respuesta soporte |
| Ventana de 24h sin nuevos pagos | No elevar etapa sin evidencia; sin alertas falsas | Mantener usuarios satisfechos |
| Límite alcanzado | No autorizar más checkouts; cola opcional | Seguir atendiendo renovaciones/gestión |
| Mantenimiento global de PAZO | Sin nuevos checkouts, según guard actual | Cancelaciones, reconciliación y vías de recuperación seguras siguen disponibles |
| Usuario paga y vuelve fuera de sesión PWA | No inferir pago del deep-link ni del login | Leer estado propio verificado; mostrar feedback y soporte |

**No definir como hechos** ventanas de recuperación de 10/15 min, umbrales de disputas o días de observación: requieren medición y aprobación por el PO antes de configuración real.

## 9. Vista de Administración — panel «Apertura gradual PayPal Live»

### A. Resumen operativo
- Estado actual, etapa, cupos totales y usados/reservados, número acumulado de compradores admitidos, invitaciones enviadas/leídas, interesados, cola, pagos verificados, casos `REVIEW_REQUIRED`, beneficios correctamente proyectados, notificaciones 2 entregadas, revisiones positivas/problemas.
- Ingresos **solo de ledger Live verificado**, separando bruto registrado de neto real disponible (que requiere comisiones/reembolsos/disputas) y sin atribuir cortesías como ventas.
- Salud: timestamp/hito de reconciliador, webhook, pendientes de inbox, holds/disputas, retrasos, últimas pausas y motivo sanitizado.
- Diferenciar **«PAGO CONFIRMADO»**, **«BENEFICIO ACTIVO»** y **«USUARIO LO CONFIRMÓ»**. Una marca de feedback jamás equivale a evidencia contable.

### B. Control de campaña
- `Preparar lanzamiento limitado` (lecturas y condiciones de readiness).
- `Iniciar etapa limitada` solo con confirmación explícita PO y auth/admin/MFA; no por guardar credenciales.
- `Pausar nuevas compras` y `Reanudar` con auditoría, nonce y CAS. Pausar bloquea únicamente nuevos intentos; no interfiere con cancelación/gestión de membresías activas.
- `Ver propuesta de siguiente etapa`; autoavance solo hasta límite general aprobado y sobre condiciones PASS.
- `Abrir para todos` disponible tras evaluación y **GO explícito PO + MFA reciente**; no se habilita desde la notificación ni por número bruto de «Todo funciona».
- Proveer control separado `Stop` de checkout y controles de mantenimiento general; no confundir ni convertir una parada de pagos en bloqueo de toda PAZO.

### C. Bandeja de incidencias
- Filtros por etapa y estado: `INTENT_ABANDONED`, `APPROVAL_PENDING`, `PAYMENT_UNVERIFIED`, `PAID_BENEFITS_PENDING`, `REFUND_OR_DISPUTE`, `FEEDBACK_ISSUE`; distinguir origen técnico/usuario.
- Acceso privilegiado únicamente según permisos; datos sanitizados por defecto; acciones manuales excepcionales justificadas/auditadas.
- Si falla entrega de notificación, reparar cola sin generar nuevo pago, carta o entitlement.

### D. Panel de cierre
- Progreso por cohorte, pendientes críticos y reversibilidad.
- `LISTO_PARA_REVISIÓN` solo si trabajadores/firmas/ledger/beneficios/gestión de cancelación y privacidad cumplen condiciones verificadas.
- El PO conserva la decisión de ir a público y puede mantener límites indefinidamente.

## 10. Cambios técnicos que esta propuesta REQUERIRÍA, no ejecutados

**Hallazgos verificados el 23-oct-2026 en Supabase, solo lectura:** `admin_private.pazo_live_release_control.mode='canary'`, rev1; 1 intento Live abierto, 0 períodos pagados. `admin_private.pazo_live_control_admits` actualmente acepta `canary` de **un `canary_owner`** o `public` para todos. El RPC `pazo_f16_live_service_release_change` impone evidencia de primer pagador original (incluida cancelación/disputa) antes de `public`. La tabla `public.notifications` tiene `type` restringido a `sighting`, `system` y `community_join`; no hay todavía tipos específicos para el flujo monetario.

**Contrato de implementación a especificar en Gate 7:**
- Modelo `LIMITED` (o equivalente) con límites acumulados, reservas atómicas, control versionado, campañas/estado, outbox de dos notificaciones, cola e idempotencia. Definir si reutilizar `system` con `source_id` o añadir tipos seguros; no quebrar las notificaciones existentes.
- Cambiar **coherentemente** `release_change`, `release_admit`, readiness de GET/POST, webhook y UI admin para admitir compradores elegibles limitados **sin quitar** verificaciones de firma, owner, Consent, pago ni entitlement.
- Reconciliar intento abierto de `canary` **antes** de cambiar reglas globales. No crear una segunda suscripción ni cancelar la solicitud vinculada arbitrariamente.
- Mantener Vault, merchant_generation=original, plan/importe, origin oficial y auditoría por revisión; no permitir acceso financiero de clientes directos a esquemas privados.
- Revisar incompatibilidad del guard previo de `cancel_claim` antes de considerar primera compra real suficiente; **nunca exigir cancelar la renovación del primer cliente para abrir al público** como efecto colateral invisible.
- Ubicar nuevo dominio UI en `src/features/supporter/` y/o `src/features/admin/`; notificaciones en su módulo existente. No añadir lógica financiera a componentes genéricos ni duplicar SaaS.
- Versionar migraciones mediante CLI, hacer ensayo ROLLBACK/COMMIT y verificar grants/RLS (preferiblemente FORCE), roles anon/authenticated/service y tokens en tests aislados; aplicar hospedado solo con autorización específica.
- Registrar categorías nuevas, finalidad, RLS, baja y retención aprobadas en `docs/PAZO_DATA_INVENTORY.md` y privacidad/Terms **antes de recopilar datos reales**. Sin PINs, emails, payee, transcripciones ni datos PayPal en notificaciones o analytics.
- Pruebas de no regresión de Sandbox, recuperación Live abandonada ya aprobada, mapas, PWA y funciones gratuitas; no pedir al PO repetir las pruebas exitosas sin cambio relevante.

## 11. Matriz de aceptación: IDs rastreables para que no se pierdan funciones

| ID | Contrato comprobable | Responsable | Estado |
| --- | --- | --- | --- |
| `GR-01` | Oferta de suscripción clara $2.99/mes y PAZO básico gratis | UI+legal | **POR HACER** |
| `GR-02` | Notificación 1 única, bilingüe, acepta/declina sin cobro | Notificaciones | **POR HACER** |
| `GR-03` | Una cuenta con varias mascotas cuenta una vez; no envíos insistentes | Campaign/DB | **POR HACER** |
| `GR-04` | Interés/lista de espera no equivale a permiso de pago | Checkout | **POR HACER** |
| `GR-05` | Reserva de cupo y cap acumulado atómicos bajo concurrencia | SQL/service | **POR HACER** |
| `GR-06` | Checkout Live respeta consentimiento, sesión y generation; no doble CREATE | F16 checkout | **REUSAR/APLICAR GATE NUEVO** |
| `GR-07` | Recuperación de abandono aprobada no regresa a bug CTA oculto | F16 account | **YA APROBADO POR PO — NO REGRESIÓN** |
| `GR-08` | Pago Live firmado + original merchant+amount + ledger/período idempotente | Worker/DB | **E2E REAL PENDIENTE** |
| `GR-09` | Beneficio basado en pago real, independiente de regalo/admin | Entitlement | **E2E REAL PENDIENTE** |
| `GR-10` | Notificación 2 solo tras GR-08 y GR-09, una vez, no cada renovación | Notificaciones | **POR HACER** |
| `GR-11` | Revisión simple positiva/problema/omitir no modifica derechos | Supporter+soporte | **POR HACER** |
| `GR-12` | Incidencia/conciliación incierta pausa nuevos pagos pero no servicio histórico | Runtime control | **POR HACER** |
| `GR-13` | Ampliación limitada automática verificando evidencia; no auto-`public` | Orquestador | **POR HACER** |
| `GR-14` | Admin: estado, cupos, ingresos verificados, feedback, incidentes, salud | Admin | **POR HACER** |
| `GR-15` | Admin: pausa/reanudar, audit/nonce/CAS, STOP, GO a público con MFA | Admin+SQL | **POR HACER** |
| `GR-16` | Mantenimiento, cancelaciones, refunds/holds/disputas funcionan durante pausa | F16 core | **COMPROBAR NO REGRESIÓN** |
| `GR-17` | Privacy, retención, borrado y términos ES/EN coherentes; sin datos de pagador | Privacy/Legal | **PENDIENTE** |
| `GR-18` | Pruebas concurrencia/duplicados/replay/timeout, CI y navegación móvil | QA | **PENDIENTE** |
| `GR-19` | Despliegue controlado / alias oficial / versions Edge / rollback / documentación | Release | **PENDIENTE** |
| `GR-20` | Mapbox Standard y resto app permanecen funcionales sin cambio visual | Integración | **CONSERVAR QA PO YA APROBADA** |
| `GR-21` | Segunda notificación podrá evolucionar a gracias sin perder versión original | Producto | **DECISIÓN POSTERIOR** |
| `GR-22` | `main`/PR reconciliados sin borrar historias, idéntico commit testeado | Ingeniería | **PENDIENTE** |

**Definition of Done general:** no declarar `LIVE_PUBLIC_READY` ni `BETA_COMPLETA` hasta reconciliar todos los GR aplicables frente a fuente de verdad, rutas alojadas, tests, evidencias y aceptación PO. El documento por sí solo no certifica ningún GR nuevo.

## 12. Dependencias y orden de implementación **futuro**, tras autorización

1. **Gate de producto:** PO revisa escalera de límites, forma de invitaciones, tiempos y textos; ratifica L1/L2/L3 + stop rules.
2. **Gate privacidad/legal:** finalidad/retención y actualización del inventario público/privado; revisión de términos.
3. **Gate arquitectura:** matriz SQL de estados, quota/leases, notificación+feedback, audit y adaptador release sin bypass; revisión formal SQL existente de canary/pub.
4. **Gate desarrollo aislado:** primero migración y DB/Edge con modo nuevo **OFF**; luego app de invitación/notificaciones, beneficios/feedback y admin; pruebas regresión + fallos.
5. **Gate despliegue dirigido:** Supabase y Vercel aprobados separadamente, revisando CI y manteniendo mapa intacto, previo control de clientes.
6. **Gate operación financiera Live:** el PO autoriza explícitamente el inicio limitado con riesgos y límites entendidos; cada comprador acepta su propia suscripción real.
7. **Gate supervisión automática:** L1→L2→L3 dentro de máximos aprobados; PAZO pausa automáticamente nuevas compras si hay falla.
8. **Gate público final:** entrega reporte al PO y solicita GO administrativo para pasar de limitado a público; sin GO conserva restricción.

**NO HACER AHORA:** deploy, migrations, nuevas notificaciones a usuarios, cambio de `canary` a `public`, token/plan/merchant nuevo, dinero real, reset de intents, eliminar la antigua propuesta, rehacer Sandbox ni tocar el mapa.

## 13. Registro de decisiones pendientes para próximo chat

| Decisión | Estado | Recomendación no aprobada |
| --- | --- | --- |
| Estrategia de lanzamiento | **APROBADA** | Opción B: gradual automática |
| Dos notificaciones en bandeja | **APROBADO COMO DIRECCIÓN** | Invitación antes / excelencia+revisión tras beneficios |
| ¿Una invitación a la vez o varias + cola? | **PENDIENTE** | Varias expresiones de interés, 1 checkout inicial |
| Escalera de compras acumuladas | **PENDIENTE** | 1→5→20 |
| Ventanas/umbral de avance | **PENDIENTE** | Observación 24h, cero incidentes críticos |
| Texto final ES/EN y no insistencia | **PENDIENTE** | Copia U01/U05; sin push/email |
| Tratamiento tras pago incierto / reembolso | **SEGURIDAD NO NEGOCIABLE**, operación por definir | Pause new; preservar derechos; revisión humana de anomalías |
| Modificar segunda notificación a solo gracias | **PENDIENTE** | Tras evidencia suficiente y decisión PO |
| Abrir pagos sin cupo a todo PAZO | **NO APROBADO** | Requiere GO admin con MFA y reporte |
| Autorizar código/SQL y luego habilitar pilot Live | **NO APROBADO EN ESTE TURNO** | Gates independientes posteriores |

## 14. Scope Closure / Handoff

**Fuente vigente de la opción B:** este archivo. El documento del primer comprador individual se conserva como **historial y variante descartada como estrategia principal**, pero sus dos notificaciones, revisión y idea de automatización quedan heredadas y explícitas aquí. No editar ni borrar textos históricos sin orden PO.

**Release actual observado al redactar (solo lectura):** Supabase modo `canary`, rev1; 1 intent Live abierto; 0 períodos Live pagados. No confundir esto con un piloto limitado operativo: **el modo `LIMITED` todavía no existe ni está instalado**.

**Estados finales después de GUARDAR DOCUMENTACIÓN:** `STRATEGY_B_SELECTED`, `SPEC_RECORDED`, `PRODUCT_GATES_OPEN`, `CODE_UNCHANGED`, `SQL_UNCHANGED`, `EDGE_UNCHANGED`, `PAYPAL_UNCHANGED`, `PRODUCTION_UNCHANGED`, `MAIN_NOT_MERGED`.

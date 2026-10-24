## ACTUALIZACIÓN OPERATIVA VIGENTE — 24-oct-2026, 20:14 UTC (F17/L1)

**Esta sección prevalece sobre notas históricas inferiores** que indiquen `PR #81/95/97/98/99 DRAFT`, `worker v10`, `L1 paused_automatic`, `L1 BLOCKED`, `PR #102 DRAFT` o que repitan gates QA ya aprobados. Es un corte documentado, no un permiso nuevo de escritura.

- **Código**: PR #81, #95, #97, #98, #99 y **#102 integrados en `main`**. El merge squash de #102 es `37e5e7c423148ff34aadc7990affeaf268b30a43`; `main` incluye `webhookReadinessProbe.mjs`, pruebas de regresión y el sondeo recuperable ante timeout aislado. Dos workflows del PR #102: **SUCCESS**. El sondeo conserva `fail-closed` ante dos fallos de transporte o webhook realmente insalubre.
- **Producción Supabase**: `pazo-paypal-live-worker` **v11 ACTIVE**; lectura del bundle confirmada contra el HEAD del PR #102, runtime POST HTTP 200 comprobado. El PO autorizó expresamente el deploy aislado y posteriormente el merge de #102. No volver a desplegar el worker desde un commit antiguo.
- **Finanzas**: SELECT alojado a las **2026-10-24 20:14:50 UTC**: `gradual_campaign.lifecycle=active`, `stage=L1_FIRST_REAL`, `capacity=1`, `revision=4`, `hosted_gate_verified=true`, `gradual_health()=true`, **0 incidentes abiertos, 0 inbox HELD, 0 intereses/invitaciones/admisiones y 0 períodos pagados Live**. `release_mode=limited` confirmado en postflight anterior. El incidente `webhook_unhealthy` (16:01–16:02 UTC) está resuelto. El PO realizó reanudación MFA; auditoría `resume` registrada a las 19:24:39 UTC. No abrir PayPal `public` ni crear pagos sintéticos.
- **Beta web**: PAZO oficial está publicada en `https://pazo-app.vercel.app/`; el proyecto Vercel `prj_nk61nr5ZVpxlp8qbIvRCsua36iXI` reportó último deployment F17 `dpl_ESNkTmyXqtaybJYyUXakNjnqw8qx` **READY**; no se atribuye a un nuevo despliegue web del PR #102. El worker es una función Edge de Supabase, no una modificación del frontend.
- **Backups**: [PR #100](https://github.com/DigitalAppcorp/pazo-app/pull/100) sigue **DRAFT/no merged**. Respaldos reales privados y dos restores aislados **PASS local** según su evidencia; Auth/Storage HTTP, Vault operativo y copia off-site **no certificados**; no repetir el ensayo ya aprobado. Al revisar este corte, PR #100 reportó `mergeable=false`; reconciliar diff/base antes de intentar integrar, nunca forzar.
- **Migraciones**: el replay íntegro desde cero carece de baseline pre-5-oct; continúa `NO_GO_DB_PUSH` y `NO_MIGRATION_REPAIR`. No confundir restore de un snapshot actual con replay histórico.
- **Siguiente gate técnico/financiero**: esperar un comprador **real y voluntario**, con aceptación personal PayPal; verificar webhook firmado, reconciliación del proveedor, período en ledger y beneficios de la cuenta. El estado 0 ventas no se resuelve con cuentas de pruebas. Marketing/creativos están a cargo de otro agente. PR #91 instrumentación promocional permanece sin activar.
- **Gobernanza**: cambios nuevos en `main`, Vercel o Supabase siempre requieren autorización por su alcance. Este corte no permite modificar credenciales, crear compras, abrir capacidad pública ni escribir SQL alojado.

Ver [reconciliación F17 actualizada](PAZO_F17_RELEASE_GATES_RECONCILED_20261024.md) y [PR #102](https://github.com/DigitalAppcorp/pazo-app/pull/102).

---

# ESTADO VIGENTE — PAZO F17 / PAYPAL LIVE L1 (23-oct-2026 18:50 PDT)

**Esta sección tiene prioridad temporal sobre las entradas históricas más abajo que aún dicen “L1 BLOCKED”, “canary/inactive” o exigen conciliar el checkout QA que ya fue eliminado.** Los límites permanentes de seguridad, privacidad, aprobaciones y no modificar main sin GO siguen vigentes.

- **L1 ACTIVADO POR EL PRODUCT OWNER (MFA):** registro alojado auditado en Supabase: release mode=limited, gradual_campaign.lifecycle=active, stage=L1_FIRST_REAL, capacity=1, campaign revision=2, hosted_gate_verified=true, gradual_health()=true y 1 certificado, desde 2026-10-24 01:45:25 UTC. No se activó modo public.
- **Limpieza QA #88:** 0 legacy checkout intents, 0 webhooks retenidos, 0 recibos Live operativos de esa prueba, 0 períodos pagados. Las 8 cuentas Auth anteriores conservan su clasificación QA y no pueden recibir invitación o figurar como comprador; administrador y MFA intactos. La purga DB no cancela por sí sola una obligación en PayPal externo (su referencia remota histórica devolvió 404).
- **Tecnología desplegada:** Edge checkout v6, worker v10, admin gradual v2 y webhook existente; sus bundles coinciden con el manifiesto #85. CI 12/12 PASS, flujo HTTPS/PWA sintético validado. La beta oficial publicada es https://pazo-app.vercel.app/.
- **Ausencia de transacción real:** aún 0 usuarios reales elegibles/admitidos, 0 invitaciones, 0 nuevos intents, 0 eventos de venta y 0 períodos pagados. El sistema está habilitado para admitir al primer comprador **siempre que esa persona consienta en PayPal**, pero no hay un E2E de venta real para dar por PASS. Worker sale/refund/cancel y concesión de beneficios están implementados y probados sintéticamente; cualquier anomalía real requiere revisión.
- **Código y cierre:** PR #81 permanece DRAFT sin merge en main. Mantener F17 como rama técnica activa; no declarar F16/F17 COMPLETADA hasta reconciliar el DoD y los gates de release aplicables. Marketing está fuera de este brazo técnico.
- **Evidencia y siguiente gate:** [auditoría técnica L1](PAZO_L1_TECHNICAL_POST_ACTIVATION_20261023.md) y [issue #85](https://github.com/DigitalAppcorp/pazo-app/issues/85). Siguiente control: seguimiento del primer pago **real voluntario** y proyección de ledger/beneficios sin generar compras de prueba, más Scope Closure Review de PR #81.

---

## Issue #85 — GO L1 autorizado, ejecutar tras conciliación (23-oct-2026)

El PO autorizó activar solamente Live limitado L1, con crecimiento 1→5→20→50 por evidencia 1/3/10 y MFA reciente en PAZO. [Issue85](https://github.com/DigitalAppcorp/pazo-app/issues/85) prevalece sobre el NO-GO financiero histórico de #84. Primero resolver suscripción prebeta y CREATED firmado HELD sin borrar evidencias, excluir las ocho cuentas QA y conservar admin/MFA. No iniciar si hay legado incierto/held; no public ilimitado ni pagos sin consentimiento individual. Trabajo técnico en `f16/issue85-live-l1-activation-20261023`, base F17 `67fbf675`. Reporte: `docs/PAZO_ISSUE85_L1_ACTIVATION_EVIDENCE_20261023.md`. No llamar SQL start para evitar GoTrue/MFA.

**Resultado técnico #85 (24-oct-2026):** PR86 y PR87 integrados en F17 `2b63907b`; tres migraciones y Edge worker10/checkout6/admin2 instalados, frontend oficial `fbe6c751` READY. CI final 4 workflows/12 jobs PASS, Chromium51, QA8 excluidos/reales0/admin1/MFA1 conservados. **L1_ACTIVATED BLOCKED** por GET original PayPal404 RESOURCE_NOT_FOUND, aunque plan/evento originales sí corroborados. Inactive/canary/gatefalse/legacy1/HELD1, sin invitaciones ni nuevas compras. Única intervención pendiente: consultar el ID original en PayPal Business Live; después conciliación auténtica, certificado y MFA dentro de PAZO. No llamar SQL start ni borrar evidencia. [Registro](PAZO_ISSUE85_L1_ACTIVATION_EVIDENCE_20261023.md).

## Issue #84 — release beta autorizado, campaña inactiva (23-oct-2026)

**Prevalece sobre los NO-GO hospedados históricos de #82:** el PO autorizó expresamente integrar #83→F17, instalar Supabase/Edge con campaña inactiva, verificar y publicar beta oficial. PR81→main está autorizado únicamente tras los gates técnicos de este release. **No** iniciar campaña, mover canary a limited/public, hacer CREATE PayPal, enviar invitaciones ni modificar el intent previo. [Orden #84](https://github.com/DigitalAppcorp/pazo-app/issues/84).

#83 integrado en F17 mediante `57e8511f`; se cierra además la admisión legacy canary durante inactive antes del primer apply. Registro de auditoría, checksum, backup/rollback y resultados por gate: [PAZO_ISSUE84_BETA_RELEASE_EVIDENCE_20261023.md](PAZO_ISSUE84_BETA_RELEASE_EVIDENCE_20261023.md). Vercel correcto es `pazo-app` / `prj_nk61nr5ZVpxlp8qbIvRCsua36iXI`, dominio `pazo-app.vercel.app`; no desplegar al proyecto anterior t83r por su nombre histórico.

**Resultado #84 al 23-oct-2026:** PR83_MERGED / F17_CI_PASS / DB_HOSTED_APPLIED / EDGE_HOSTED_DEPLOYED / OFFICIAL_BETA_DEPLOYED = **PASS**. Beta oficial https://pazo-app.vercel.app/ publicada desde `d9fd7506` (deployment `dpl_HCcdWk8Uo79LxrfCUXgqDzMdHa5J`). SQL fuente 20261023211315 aplicado con historial API 20261023224519; admin v1 / checkout v5 / worker v5, contenidos verificados contra el mismo SHA. Campaña **inactive**, hosted_gate_verified=false, canary rev1/generación1; 1 intent anterior intacto, 0 períodos pagados, 0 invitaciones/outbox. **LIVE_LIMITED_START_NOT_AUTHORIZED**. No se necesitó main; PR81 sigue draft. Postflight público Chromium **51/51 PASS**, CI posterior de `609a91f5` **12/12 PASS** (run40037663360). Visual PO de cambios nuevos/PWA física pendiente, no se declara fase COMPLETADA. Evidencia, límites de observabilidad, pruebas y rollback en el reporte #84. Las secciones inferiores de #82 y anteriores se conservan como historia superada en lo relativo a permisos/instalación.

---

## F16 issue #82 — código gradual implementado en rama (23-oct-2026)

**Estado vigente sobre notas históricas:** `CODE_DONE / DB_MIGRATION_PREPARED / READY_FOR_HOSTED_GATE`, sin declarar F16 COMPLETADA ni beta lanzable. Rama `f16/gradual-live-event-rollout-20261023`, [PR #83 DRAFT](https://github.com/DigitalAppcorp/pazo-app/pull/83), derivada de F17 `872ff8c3` / PR #81. Motor 1→5→20→50 por 1/3/10 compradores verificados, FIFO, reservas, outbox, revisión voluntaria, Administración MFA/CAS y pruebas PostgreSQL17/UI implementados. **No** SQL/Edge/Vercel producción, cargos/notificaciones reales ni merge a main.

Evidencia por `GR-01…22 / EVT-01…19`, cambios, comandos, commit/CI y estados independientes: [PAZO_F16_GRADUAL_IMPLEMENTATION_EVIDENCE_20261023.md](PAZO_F16_GRADUAL_IMPLEMENTATION_EVIDENCE_20261023.md). [Gate alojado y rollback](PAZO_F16_GRADUAL_HOSTED_GATE_RUNBOOK_20261023.md) preparado; siguiente permiso acotado es instalar/publicar en entorno controlado con campaña **inactiva**, separado del GO financiero. La auditoría inicial solo lectura encontró un intent Live previo abierto: se conserva, inicio bloqueado hasta su conciliación original. QA Sandbox y mapa aprobados no se reabren. Historial inferior conservado; sus etiquetas `NOT_IMPLEMENTED/EXECUTION_NOT_CONFIRMED` quedan superadas para esta rama, no para producción.

---

## F16 — Ejecución encargada a Codex, código completo de apertura gradual (23-oct-2026)

El PO delegó explícitamente **a Codex** el desarrollo de la fase ya decidida. **Orden formal:** [`CODEX_F16_EVENT_DRIVEN_GRADUAL_LIVE_IMPLEMENTATION_ORDER_20261023.md`](CODEX_F16_EVENT_DRIVEN_GRADUAL_LIVE_IMPLEMENTATION_ORDER_20261023.md). **Tracking:** [issue #82](https://github.com/DigitalAppcorp/pazo-app/issues/82). Leer AGENTS.md y fuentes GR/EVT sin recortar funcionalidades. Construir en rama aislada derivada de F17 HEAD y PR hacia F17: cola FIFO para interesados, cinco invitaciones/72h, cuotas 1→5→20→50 promocionadas al verificar 1/3/10 compradores reales, cancelación/reanudación Live existente, outbox/idempotencia y STOP, dos notificaciones con revisión de beneficios, Administración y pruebas. No limitarse a plan: entregar software verificable y documentos de cierre.

**Estado REAL AL ASENTAR LA ORDEN:** issue creado pero **no hay prueba de que la ejecución de Codex se haya iniciado**; no confundir encargo con código completado. Producción sigue protegida: sin cambios alojados/activación de cobros/`main`. El PO ya autorizó programación en rama, no aplicar SQL Supabase ni Edge/Vercel producción. **Criterios de cierre:** GR-01..22 y EVT-01..19, CI/PG17 y evidencia/PR; pedir GO específicamente para cualquier mutación hospedada.

---

## F16 — DECISIÓN APROBADA: L4=50 al décimo comprador Live verificado (23-oct-2026)

**PRECEDENCIA SOBRE GATES HISTÓRICOS:** El PO aprobó explícitamente la escalera acumulada **1 → 5 → 20 → 50**. L1→L2: primer comprador con venta Live firmada/conciliada, cobertura y beneficios activos. L2→L3: **tercer** comprador distinto con las mismas pruebas y sin anomalía financiera crítica. **L3→L4: DÉCIMO comprador distinto**, igualmente con pago real y beneficios activos, sin incidencias financieras críticas. PAZO amplía al momento de verificar cada umbral, mediante backend + Supabase y asigna cupos a la cola FIFO; **NO esperar 24 horas/días** ni pedir al administrador que pulse en cada promoción.

**PRESERVACIÓN DE DEMANDA:** cinco invitaciones iniciales, 72h para declarar interés (no timeout de PayPal), entrada espontánea a cola desde la oferta y lista FIFO persistente sin límites de interesados. Estado visible por frontend y dos notificaciones: (1) invitación de apoyo / mismo hilo actualiza «Cupo disponible»; (2) agradecimiento+verificación voluntaria solo tras pago acreditado y beneficios reales. A 25 interesados, algunos esperan hasta que se cumplan 10 transacciones válidas; L4 admite hasta 50. Una solicitud dudosa no libera un cupo sin conciliación. Ninguna garantía de convertir interés en ventas.

**NUEVO GATE DE LANZAMIENTO:** no superar **50 compradores distintos acumulados** sin autorización posterior del PO; apertura `public` ilimitada requiere GO separado con MFA. Tampoco se autoriza instalar SQL/Edge alojado, desplegar producción ni activar compras reales por la mera aprobación del producto. Estado `PRODUCT_L4_APPROVED / EVENT_SPEC_SAVED / F17_BRANCH_IMPLEMENTATION_AUTHORIZED / NO_HOSTED_CHANGE / NO_CHARGE`. Mantener 1 intento Live previo, mapbox Standard, QA Sandbox y recuperación Live ya validada sin cambios.

**CONTRATO DE INGENIERÍA VIGENTE:** [`PAZO_F16_EVENT_DRIVEN_LIVE_ROLLOUT_20261023.md`](PAZO_F16_EVENT_DRIVEN_LIVE_ROLLOUT_20261023.md) (`EV-01…EV-15`, `EVT-01…EVT-19`) + [`PAZO_F16_GRADUAL_LIVE_ROLLOUT_PRODUCT_SPEC_20261023.md`](PAZO_F16_GRADUAL_LIVE_ROLLOUT_PRODUCT_SPEC_20261023.md) (`GR-01…GR-22`). Las frases previas **«L4 pendiente»**, **«20 techo final»**, **«24h entre fases»** y «paquete aún no aprobado» son historia SUPERADA. No borrar ideas/scope anteriores ni confundir aprobar estrategia con checkout real listo. PR #81 DRAFT y `main` sin merge.

---

## F16 — PUERTA DE PRODUCTO CERRADA: avance por acción, no por 24h (23-oct-2026)

**DECISIÓN EXPRESA PO:** aprobado el paquete inicial de **5 invitaciones, 72h para responder, FIFO, cuotas acumuladas L1=1→L2=5→L3=20**. Después el PO corrigió el criterio de transición: **NO esperar 24 horas ni días**; cuando backend+Supabase prueben **1 pago Live auténtico y beneficio activo**, L1→L2 sucede automáticamente; cuando se prueben **3 compradores distintos con venta+beneficios**, L2→L3 sucede automáticamente. Ni botón de Administración ni feedback humano debe retrasar cada etapa. Fuente de verdad con contratos de front/Edge/Postgres, durable waitlist, incidentes, valores aprobados y 15 pruebas obligatorias: [`PAZO_F16_EVENT_DRIVEN_LIVE_ROLLOUT_20261023.md`](PAZO_F16_EVENT_DRIVEN_LIVE_ROLLOUT_20261023.md). Reemplaza menciones previas de 24h en el [documento rector](PAZO_F16_GRADUAL_LIVE_ROLLOUT_PRODUCT_SPEC_20261023.md), ahora enlazadas como historia y sin efecto normativo.

**Ventas no descartadas:** la pantalla Amigo de PAZO acepta expresiones de interés incluso sin invitación y conserva cola durable; las cinco notificaciones iniciales no significan techo de interesados. Un slot checkout se reserva atómicamente y no se libera ante estado remoto ambiguo; PayPal abandonado recupera el mismo intent (QA PO ya aprobado). Notificación 1 se actualiza a «Cupo disponible» al turno; notificación 2 únicamente tras pago y beneficio confirmados. **HISTÓRICO SUPERADO:** el límite final vigente ya no es 20: **L4=50 está APROBADO por el PO**, con ampliación automática desde L3 en cuanto se verifique el décimo comprador distinto. `public` sigue sujeto a GO separado. El usuario puede abandonar la cola; su interés no obliga compra. Nunca asegurar conversiones futuras ni promocionar `public` sin GO.

**Gate de desarrollo:** estrategia y parámetros aprobados, implementar en rama F17 conforme AGENTS.md, SEC/RLS/SQL versionado y pruebas; estado actual **SOLO DOCUMENTACIÓN**. SQL/Edge/Vercel producción y autorización de cobros siguen separados. No sustituir documentación histórica ni eliminar los tests existentes. Alcance de cierre: GR-01…GR-22 + EVT-01…EVT-15.

---

## F16 — Paquete de parámetros de apertura gradual, listo para decisión PO (23-oct-2026)

La estrategia B gradual sí está aprobada, **pero no se infieren aprobaciones automáticas de sus parámetros**. Apéndice §15 del documento rector [`PAZO_F16_GRADUAL_LIVE_ROLLOUT_PRODUCT_SPEC_20261023.md`](PAZO_F16_GRADUAL_LIVE_ROLLOUT_PRODUCT_SPEC_20261023.md) consolida una propuesta concreta revisable: **5 notificaciones iniciales, 72h para declarar interés, FIFO, un solo checkout Live remoto abierto en L1, cupos acumulados 1→5→20, observación 24h, tres compradores distintos pagados/verificados antes de L3, dos CREATE remotos sin resolver como máximo en L2/L3**, pausa automática por anomalías y no promoción a `public` sin GO PO/MFA. Los dos mensajes en bandeja y reporte voluntario permanecen. **ESTADO `RECOMMENDED_FOR_PO_REVIEW`**, no implementado ni habilitado; solicitar aprobación explícita o correcciones de paquete antes de código/SQL. Reutilizar GR-01…GR-22 para cierre sin pérdida de alcance. No solicitar repetición de QA Sandbox ni alterar Mapbox.

---

## F16 — Estrategia aprobada: apertura GRADUAL AUTOMÁTICA PayPal Live (23-oct-2026)

**DECISIÓN DE PRODUCTO (PO):** reemplazar como plan principal la prueba individual anterior por una **apertura de pagos Live por etapas con cupos acumulados, avance automático condicionado a evidencia financiera y pausas automáticas**. El PO no eligió apertura ilimitada ni aprobó modificar producción en esta conversación. Amigo de PAZO mantiene **USD 2.99/mes**, consentimiento voluntario y app gratuita. **Las dos notificaciones de bandeja se conservan**: invitación a apoyar y, tras pago+beneficios verificados, agradecimiento y revisión voluntaria; en una fase posterior podría simplificarse a solo gracias, sin borrar esta idea. Especificación canónica (flujos usuario/PAZO/admin, estados, 22 requisitos rastreables GR-01…GR-22 y gates): [`PAZO_F16_GRADUAL_LIVE_ROLLOUT_PRODUCT_SPEC_20261023.md`](PAZO_F16_GRADUAL_LIVE_ROLLOUT_PRODUCT_SPEC_20261023.md).

**DECISIONES NO TOMADAS:** escalera propuesta 1→5→20 compradores acumulados y ventanas 24h son **SOLO RECOMENDACIONES**, no configuración aprobada; número simultáneo de invitaciones/lista de espera, fechas, mensajes finales y retención requieren aprobación del PO. La antigua «opción B de selección de invitados» es distinta de la **opción B aprobada de apertura gradual**. Fuente histórica conservada sin borrar: [`PAZO_FIRST_LIVE_SUPPORTER_AUTOMATED_PILOT_PROPOSAL_20261023.md`](PAZO_FIRST_LIVE_SUPPORTER_AUTOMATED_PILOT_PROPOSAL_20261023.md).

**Gate técnico pendiente:** hoy el SQL únicamente admite `canary` para dueño original o `public` ilimitado, y el paso a `public` exige venta/cancelación canary. Necesita diseño de modo limitado con cuota servidor atómica, no bypass; notificaciones solo soportan `sighting/system/community_join`; conciliación del intento Live abierto y retención antes de instalar. Supabase alojado leído: `canary` rev1, **1 intento Live abierto y 0 períodos Live pagados**. No reusar una concesión admin como evidencia financiera. **Estado:** `PRODUCT_DIRECTION_APPROVED / SPEC_SAVED / NO_CODE / NO_SQL / NO_DEPLOY / NO_PAYPAL_CHANGES`; PR #81 permanece DRAFT y `main` sin merge. No reabrir pruebas Sandbox ni mapa Standard ya aceptado por PO.

**SIGUIENTE:** revisión/aceptación de parámetros concretos y seguridad → autorización independiente de implementar → CI/sandbox aislado sin repetir pruebas de usuario aprobadas → gate SQL/Edge/producción → GO PO explícito para campaña y primer cliente real. La ampliación dentro del techo aprobado será automática; quitar el último techo para `public` requiere GO explícito con MFA. No borrar el documento anterior ni alterar promesas originales sin reconciliar todos los GR.

---

## F16 — Backlog de diseño: piloto automático primer Amigo de PAZO (23-oct-2026)

**PROPUESTA GUARDADA, SIN GO DE IMPLEMENTACIÓN.** Producto propuesto: invitación a apoyar PAZO por **$2.99/mes** mediante **notificación 1** en bandeja y, después de pago real + periodo/beneficios verificados, **notificación 2** que invita voluntariamente a revisar insignia, beneficios y reportar errores. PAZO automatizaría selección de participante, consentimiento y checkout PayPal ya existente, reconciliación, respuestas y dashboard sin contacto manual del administrador. No se activan cobros ni se promete abrir membresías públicamente. Continuidad/DoD, textos ES y estado exacto en [`docs/PAZO_FIRST_LIVE_SUPPORTER_AUTOMATED_PILOT_PROPOSAL_20261023.md`](PAZO_FIRST_LIVE_SUPPORTER_AUTOMATED_PILOT_PROPOSAL_20261023.md).

**GATE de producto pendiente:** el PO aún no ha escogido **A (invitación uno a uno; recomendada)** o **B (varios interesados, único comprador canary)**; caducidad 72h fue únicamente ejemplo, elegibilidad/retención/texto definitivo pendientes. Un usuario nunca recibe membresía pagada sin PayPal real verificado; un reporte de prueba no cancela ni altera sus derechos. `canary` no puede promoverse automáticamente a `public`; requiere GO del PO. La experiencia de recuperación de checkout ya fue aceptada por el PO con múltiples intentos Live sin pagar; primer cobro real sigue pendiente.

**Estado:** `DOCUMENTED_PROPOSAL_ONLY`. No modifica fase F16/F17 en ejecución, PR #81 DRAFT, main, datos, pagos, Supabase, Vercel o mapa.

---

## F16/F17 — Cierre de regresión de checkout abandonado (23-oct-2026; rama, sin producción)

**DECISIÓN PO:** la recuperación ya validada en Sandbox debe mantenerse en Live. Estado código: `ff954b86` con CI general SUCCESS (`40006044745`), seguridad F17 SUCCESS (`40006044654`) y F16 bootstrap SUCCESS (`40006044657`). La invitación Live conserva el CTA con intent abierto, `resume` reutiliza el original y resuelve terminales con conciliación SQL; `abandon_pending` permite pedir cierre de aprobación sin pago con confirmación del titular, cancelación única en proveedor, GET independiente y liberación solo sin pagos ni eventos pendientes. Los pagos/beneficios siguen protegidos; `ACTIVE/APPROVED/SUSPENDED` no se liberan. Sin modificaciones de Supabase, PayPal ni producción.

**SIGUIENTE GATE:** desplegar el endpoint y frontend solo con GO del PO y verificación previa; probar con sesión autorizada sin completar pago que volver del login no oculta el CTA, que se retoma el original o se cierra de manera segura, y que no hay dos intentos. PR #81 DRAFT, sin merge a `main`; PayPal Live E2E cobro real no verificado. El mapa Standard oficial fue aprobado, no repetir. Soporte E2E posbeta según decisión PO.

---

## F17 — Zona segura compacta y cristal localizado cerca del dock (22-oct-2026 · SOLO RAMA)

**Evidencia del PO:** después del ajuste `bd24213c` sigue habiendo excesivo espacio vacío al final del Feed y Mi mascota. Auditoría de código identificó **dos reservas inferiores acumuladas**: `App.tsx` añade `padding-bottom:9rem+safe-area` (144px base) en el contenedor principal y cada vista social (`HomeView`, `CommunitiesView`, `PetView`) incluye `pb-6` (24px). Total previo: 168px + safe-area sin contar geometría de otros elementos. El dock real tiene una rejilla de 76px más padding vertical (aprox. 92px+safe-area). Una reserva mayor separaba visualmente las últimas tarjetas y herramientas del menú.

**Corrección en PR #81:** reducir únicamente la reserva de `<main>` a **6rem+safe-area** (96px), conservando el `pb-6` propio de los tres módulos (total ≈120px+safe-area, clearance sobre el menú sin hueco excesivo). Mantener intactos el tamaño físico del efecto de cristal, su `blur(20px)`, la barra, `z-index`, `pointer-events`, mapa y módulos financieros. Solo concentrar máscara de desenfoque en el **55% inferior de la misma capa**: transparente al 45%, débil al 56%, progresiva al 70/86% y completa en el borde inferior. Los controles de distancia moderada dejan de quedar borrosos; las últimas acciones deben poder quedar visibles por encima del dock. Sin capas de color, neblina ni corte horizontal.

**Regresión:** `scripts/closure-ui.test.mjs` comprueba ausencia de antiguas reservas 9/13rem, presencia de `pb-6` interno en las tres vistas sociales, máscara localizada, altura y blur anteriores. **Gate pendiente:** CI exacto y aceptación Android de fin de scroll y controles accesibles. No publicación en producción, merge a main, pagos, datos ni infraestructura.

---

## F17 — Menos espacio vacío sin achicar la capa de cristal (22-oct-2026; solo rama)

**Evidencia PO:** en el Preview `83fefec2` las últimas publicaciones del Feed y los controles finales de Mi mascota quedan demasiado separados del dock flotante porque `main` añade `13rem` al final del scroll. El estilo de cristal (20px blur, altura total y extensión 20px hacia arriba) fue aprobado; no hay autorización para reducirlo ni convertirlo en una capa blanca.

**Corrección autorizada:** `src/App.tsx`: bajar solo `padding-bottom` del contenido desplazable de `13rem+safe-area` a `9rem+safe-area` (64px menos de espacio vacío con rem base 16px) y mantener la barra flotante en su capa actual. `src/index.css`: conservar exactamente `height: calc(5.75rem + clamp(84px, 13dvh, 116px) + 20px + env(safe-area-inset-bottom, 0px))` y `backdrop-filter: blur(20px)`; concentrar únicamente la máscara alfa: transparente hasta 30%, difuminado tenue desde 42%, más fuerte progresivamente hasta 100% en el fondo. Así contenido de distancia moderada mantiene nitidez y el último botón puede subir por encima del dock sin neblina ni franja dura. Se aplica solo a Feed, Comunidades y Mi mascota; Mapa/Lugares, paneles y acciones sin cambios.

**Gate:** regresiones de `scripts/closure-ui.test.mjs`, CI exacto, Preview aislado y aceptación visual Android de último botón visible y ausencia de espacio desproporcionado. **No main, producción, PayPal, Supabase ni gastos.**

---

## F17 — Microajuste aprobado: desenfoque 20 px más alto (22-oct-2026; solo rama)

**Aceptación parcial PO:** el nuevo efecto tipo cristal en Feed se ve correcto; pide únicamente iniciar el desenfoque ligeramente más arriba del menú flotante, sin exagerar altura ni alterar estilo, transparencia o nitidez del dock. Se corrigió la afirmación equivocada de falta de acceso: el repositorio sigue conectado y los cambios se ejecutan por GitHub.

**Cambio limitado:** `src/index.css`, `.pazo-scroll-soft-edge`: añadir **20 px** a la altura de la capa desde `bottom:0`, sin cambiar `blur(20px)`, máscara, stops, colores (ninguno), `z-index`, `pointer-events` ni lógica. El inicio visual del desenfoque sube levemente; la zona inferior continúa bajo el menú sin un corte horizontal. La capa sigue condicionada en `src/App.tsx` exclusivamente a `inicio`/Feed, `comunidades` y `mascota`; Mapa excluido. Prueba estática actualizada para fijar este valor.

**Gate:** CI exacto del nuevo commit, Preview independiente y aprobación visual Android. No `main`, no producción, sin cambios en datos, PayPal, Supabase, assets ni navegación.

---

## F17 — Cristal esmerilado, sin neblina ni resplandor blanco (22-oct-2026 · SOLO RAMA)

**Nueva evidencia PO:** el Preview `d90e5040` ya no presenta corte horizontal, pero el área inferior de Feed se ve cubierta por neblina/sombra blanca, no borrosa como cristal. Auditoría CSS confirmó `.pazo-scroll-soft-edge::after` con capa crema hasta `rgba(250,248,245,0.94)`: ocultaba los colores y detalles originales de la foto. El filtro real de 11px resultaba secundario.

**Cambio:** eliminado totalmente `::after`, sus tintes blancos y `isolation:isolate`. Único `::before` transparente con `backdrop-filter: blur(20px)` y `-webkit-backdrop-filter`, máscara `mask-image/-webkit-mask-image` con varios stops crecientes para que el **desenfoque** progrese hacia el borde inferior sin pintar encima. La capa mantiene `pointer-events:none` y `z-20`, continúa tras el dock flotante `z-30` que nunca se difumina. Se monta solo en Feed, Comunidades, Mi mascota, no Mapa. Se conserva el clearance de scroll de 13rem+safe-area para que los botones sigan accesibles. No se tocaron lógica, navegación, modelos, pagos ni backend.

**Regresión:** `scripts/closure-ui.test.mjs` prohíbe la capa crema, exige backdrop blur real, stops progresivos y muestreo no aislado. **GATE**: aprobar CI SHA exacto y validación visual Android de borrosidad real sin neblina; no aceptar UX automáticamente por CI. Sin merge, sin producción, sin cambios Supabase/PayPal.

---

## F17 — Corrección del corte duro en el degradado social (22-oct-2026; SOLO RAMA)

**Evidencia PO:** captura Android del Feed del Preview `17916b0c`: banda difusa rectangular interrumpida abruptamente por una línea horizontal, seguida de imagen completamente nítida antes del dock flotante. **Causa exacta:** la capa CSS `.pazo-scroll-soft-edge` tenía `bottom:calc(5.75rem + safe-area)` y se acababa antes del menú, dejando una segunda franja sin ningún efecto.

**Corrección:** el overlay social `z-20` ahora continúa **hasta `bottom:0`** por detrás del menú `z-30` (que sigue nítido y con cavidad intacta). La altura incluye la zona del dock + una franja superior de difuminado. Máscara del `backdrop-filter` de 11px y color crema con varias paradas alfa progresivas, sin terminación visible entre la foto y el menú. `pointer-events:none` impide bloquear interacciones. Se mantienen únicamente `inicio|comunidades|mascota`, excluyendo mapa, y la reserva inferior de scroll de 13rem para que los últimos botones de Mi mascota sean accesibles.

**Gates:** `scripts/closure-ui.test.mjs` prohíbe volver a posicionar el overlay encima del dock, valida `bottom:0`, máscara, progresividad, orden DOM, tabs y toques. CI SHA exacto + comprobación visual Android pendientes; no aprobar UX por solo CI. Sin merge, producción, cambios financieros ni Supabase.

---

## F17 — Desenfoque inferior progresivo del contenido social (22-oct-2026; SOLO RAMA)

**Decisión PO:** Feed, Comunidades y Mi mascota desvanecen progresivamente publicaciones, tarjetas y controles al acercarse a la zona superior del menú flotante. La capa difumina el contenido con `backdrop-filter` + máscara alfa vertical y añade un degradado crema suave como respaldo. **El dock flotante permanece completamente nítido, su cavidad conserva transparencia y sus botones funcionan igual.** El módulo Lugares/Mapa queda expresamente excluido.

**Implementación:** una única capa `data-pazo-scroll-soft-edge` como hermana de `<main>`, entre el scroll y `<BottomNav>`, renderizada solo para `inicio|comunidades|mascota`; CSS `z-index:20`, menú `z-30`, `pointer-events:none`, altura sensible al viewport y borde inferior por encima del dock. `main` mantiene su scroll, pero extiende el espacio final a `13rem+safe-area` para que botones importantes puedan subir por encima del difuminado al llegar al final. Sin cambio de lógica de Feed/comunidades/perfil, ni de datos, ni de navegación.

**Regresión:** `scripts/closure-ui.test.mjs` comprueba tres módulos, exclusión de Mapa, orden DOM/z-index, máscara, difuminado, pointer-events y clearance. Pendiente prueba CI del SHA exacto y aceptación visual Android; no merge ni producción sin GO, sin cambios de Supabase/PayPal ni proveedores.

---

## F17 — Corrección visual del carrusel de Lugares (22-oct-2026; solo rama)

PO observó solapamiento de las tarjetas con el dock flotante al desplazarlas verticalmente. Causa: scroll vertical artificial dentro del rail y espaciador inferior de 9rem. Corregido en `ImmersivePlacesStage.tsx`: banda horizontal única, sin scroll vertical ni espaciador, posicionada por encima del dock según safe-area; se conservan fotografía, selección, títulos compactos y dock global. Contrato actualizado en `scripts/closure-ui.test.mjs`. **Pendiente:** CI SHA exacto y aceptación visual Android. No fusionar ni publicar en producción sin GO.

---

## F17 — Restitución tipográfica precisa de Lugares a partir de comparativa Android (22-oct-2026 · SOLO RAMA)

El PO comparó captura actual vs aspecto original y aclaró que la orden de ampliar textos correspondía **únicamente** al modal de detalles (Cómo llegar, check-in, reglas), NO al lienzo exterior de Lugares. Diagnóstico con GitHub: en el commit histórico `3e74e102` el título del rail era `text-[15px]`, el contador `text-[11px]`, los filtros `text-[11px]`, los nombres de tarjeta `text-[14px]` y la categoría/presencia `text-[10px]`. En la versión reciente se habían sustituido varios por `text-lg` / `text-xs`, que PAZO redefinió globalmente en `src/index.css` a tamaños superiores, agrandándolos sin intención del PO.

**Corrección aplicada** exclusivamente en `ImmersivePlacesStage.tsx`: restituir exactamente los tamaños numéricos anteriores para título, resultados, filtros y metadatos de tarjetas; títulos de establecimiento permanecen en 14px. Quitar cápsula blanca grande del título conservando separación y encabezado fijo, scroll de tarjetas y safe-area del dock. `MapView.tsx` y la tipografía incrementada del diálogo de detalles permanecen intactos. Nueva prueba `closure-ui.test.mjs` fija estos tamaños y evita que vuelvan a heredar `@theme --text-xs/--text-lg`.

**Estado:** solo código/CI de rama F17 PR #81. El fondo del mapa Mapbox vectorial/3D y las seis ilustraciones locales siguen como gate visual independiente; no confundir con esta corrección de tipografía. Nada de `main`, producción, PayPal, Supabase, nuevas APIs, gastos ni alteraciones de permisos. Próximo gate: CI SHA exacto, Preview independiente y aceptación en Android.

---

## F17 — Android QA: modal de experimentos y mapa sin base (22-oct-2026, PR #81; SOLO RAMA)

**Evidencia PO:** fotografías correctas y glTF de uno de los seis lugares visibles, pero cartografía de fondo completamente gris en Preview SHA `85c28e40`; el título «Lugares disponibles» queda cortado tras desplazar el carrusel; control blanco Mapbox se solapa con botón amarillo de ubicación; créditos Wikimedia demasiado grandes. Al desplazarse al final del detalle, «Funciones en desarrollo» aparece a escala desequilibrada y desaparece la cabecera/cierre del modal. **El usuario NO aprobó esta experiencia.**

**Código nuevo:** modal detalle dividido en header/close fijo y scroll exclusivo de cuerpo, manteniendo check-in y fake doors con idénticas acciones/tracking; jerarquía de tipografía del bloque de experimentos reducida y tarjetas ajustadas a 10–13px explícitos. Rail de Lugares ahora separa su encabezado fijo del scroll vertical de tarjetas, con espaciador de 9rem + safe-area al final del contenido para que el dock no cubra la última tarjeta. Créditos visibles sobre las fotos reducidos a 9px; barra de zoom nativa Mapbox retirada únicamente de la vista inmersiva para no superponerse al control de ubicación. El fondo de Mapbox se conserva; un error recuperable de tesela NO desmonta el canvas. `mapFailure` reconoce HTTP 401/403 incluso cuando la librería no expone URL. Tras fallos de los dos estilos vectoriales, mapa OSM de emergencia se identifica con un mensaje claro; esto **NO representa relieve 3D**.

**Estado/mapa:** se han visto imágenes/3D locales sobre un fondo gris; falta distinguir si la causa es restricción URL del token, permiso de estilo o descarga de tiles en el navegador Android. El token público existe en Vercel para Preview y producción; su autorización efectiva por origen NO se confirmó. La solución final requiere respuesta 200 de estilo + mosaicos + DEM y aceptación del PO; un CI verde no prueba el render visual. Ninguna clave rota, proveedor nuevo, gasto, DB, Edge o pago modificado. Revisar restricciones de referer/domain de Mapbox en el panel sin compartir token.

**Gate:** validar SHA final en CI, luego Preview separado (sin tocar producción) y Android real: cartografía 3D, seis modelos por categoría, cabecera y botón de cierre siempre visibles, todas las tarjetas accesibles, créditos legibles y barra flotante sin tapar. No merge ni producción hasta aprobación expresa.

---

## F17 — Captura Android: raster sin relieve, marcadores ausentes y carrusel recortado (22-oct-2026, SOLO RAMA)

Evidencia del PO: Preview SHA `3707e485`, calles exageradas/relieve 3D ausente, modelos originales no visibles, crédito OSM gigante, área de tarjetas excesiva y recortada. Diagnóstico de código: el error de una sola tesela degradaba directamente Mapbox Standard a raster OSM; el fondo de OSM NO es 3D y la capa nativa glTF solo arrancaba desde zoom 13.25, sin anotaciones DOM independientes. Además, el rail de Lugares tenía altura limitada 300px *incluyendo* padding inferior de 7rem, que recortaba títulos y fotos de sus tarjetas.

**Corrección en PR #81:** secuencia Mapbox Standard 3D → segundo estilo vectorial Streets v12 → raster SOLO como emergencia después de problemas del vector; altura de terreno desde la fuente DEM del proveedor existente en estilos vectoriales con `setTerrain`. Se preservan los seis archivos `public/models/places/*.gltf`, su `model-id` por categoría y selección real; capa 3D desde zoom 12.5. Marcadores de categoría locales ligados a los seis lugares son accesibles, pulsables e independientes de `style.load`, para que no desaparezcan cuando fallan las capas o el token de Mapbox. Errores individuales en raster no eliminan todo el mapa. Los modelos nativos tienen precedencia visual a zoom cercano. Se elimina crédito OSM duplicado de tamaño excesivo: la atribución del motor Mapbox continúa activa. Carrusel horizontal compactado, rail de alto natural limitado y margen de dock como espaciador DENTRO del scroll, no restado de su altura visible. Se conserva dock flotante, fotos reales/ilustrativas licenciadas, check-in, foco, ubicación opcional y navegación.

**GATE SIN CERRAR:** Mapbox Standard y Streets dependen de que el token actual permita el dominio del Preview (posible 403 por restricción de referer); no asumir que la corrección visual de código resuelve la autorización de un tercero. Si ambos estilos vectoriales son denegados, no se puede ofrecer relieve 3D con el raster OSM; corregir scopes/restricciones del token desde Mapbox con el PO, sin revelar ni sustituir credenciales ni contratar otro servicio. CI exacto del SHA final, revisión en Android (modelo glTF visible tras tocar lugar + acercar; cartografía realmente 3D; tarjeta completa + scroll final) y GO explícito requeridos. Sin cambios en producción, SQL/Edge, PayPal, `main` ni nuevo presupuesto.

---

## F17 — Dock flotante global, scroll seguro y detalle legible (22-oct-2026, SOLO RAMA)

Aprobado por PO: escalar tipografía exclusivamente dentro del modal de detalles de Lugares (dirección, especies, reglas, check-in y Cómo llegar), sin alterar la escala de títulos/filtros fuera de él. Se conserva portal a document.body para centrado real. El menú inferior es una capa flotante con fondo exterior transparente en TODOS los módulos y cavidad real sobre la burbuja móvil; solo los controles de la barra interceptan toques. App.tsx reserva 7rem + env(safe-area-inset-bottom) al final del scroll no-mapa para que Mi mascota, Comunidades y Feed no oculten acciones. Lugares tiene ahora rail inferior vertical desplazable (además del carrusel horizontal), con la misma reserva al final; la última tarjeta puede subir totalmente sobre el dock y las tarjetas siguen viéndose por detrás durante el desplazamiento. La atribución del mapa y el botón voluntario de ubicación se desplazan bajo los filtros, fuera del carrusel.

Se conserva Mapbox Standard 3D como estilo primario y los modelos PAZO; solamente se suaviza saturación/contraste del respaldo raster OSM cuando Mapbox falla (ese respaldo no es 3D). Para las seis fotos Commons ya licenciadas, el componente prueba la miniatura directa y, si falla, un único enlace Special:FilePath de ESA MISMA foto antes de mostrar el fondo sin imagen; fotos propias reales siempre prevalecen y cinco siguen claramente identificadas como ilustrativas. Sin proveedores pagados, SQL, credenciales, migraciones ni cambios financieros.

**Evidencia:** código y regresiones versionados en PR #81. **PENDIENTE:** CI exacto del último SHA y validación real en Android de scroll final, cavidad, legibilidad, carga de las seis fotos y mapa 3D. No se autoriza despliegue Preview adicional, merge ni producción hasta GO específico del Product Owner.

---

## F17 — Correcciones tras capturas reales del PO, 22-oct-2026 (rama solamente)

Capturas Android mostraron detalle de Lugares limitado al mapa y texto fijo demasiado pequeño; raster OpenStreetMap con carreteras demasiado contrastadas; fotografías de Wikimedia Commons no visibles por miniaturas /640px; y barra inferior con franja sólida entre las tarjetas. Código corregido: portal al body para modal centrado a escala PAZO con cierre Escape; Mapbox Standard 3D suave y fallback raster solo ante fallos; rutas de miniatura Commons /500px con créditos condicionados a que haya imagen; navegación flotante y transparente sobre tarjetas cuando Mapa está activo, preservando la máscara de la burbuja. Sin alterar PayPal ni Supabase.

**GATE:** código y tests en rama F17; CI, carga fotográfica real, estilo 3D en Android y aceptación PO por verificar. No publicado en producción, no nuevo Preview, no merge a main. No certificar funcionalidad visual solo con pruebas estáticas.

---

## F17 — fotos reales de Lugares sin Google Places, rama PR81, 22-oct-2026

Decisión PO: fotografías reales distintas sustituyen la imagen genérica
de Unsplash; Google Maps/Places API no requerido. Catálogo curado de seis
fotografías licenciadas (una exacta Runyon Canyon, cinco ilustrativas
con etiqueta) con autor, licencia y fuente; las imágenes
propias de negocio que se publiquen en `photo_url` prevalecerán.
Sin Google, facturación, SQL, despliegues ni efectos financieros.
Falta QA CI SHA final y aceptación PO Android, no fusionar ni publicar.
Véase `docs/PAZO_F17_PLACES_PHOTO_SOURCES_20261022.md`.

---

## F17 UI — ajustes Lugares / feed pendientes de aceptación, 22-oct-2026

PR #81 DRAFT, solo código. Contenedores de filtros transparentes; scroll categorías con bordes degradados; rutas externas nativas con CTA Cómo llegar; reacciones/comentarios redondos y mayores, sin romper acciones. Se retiró el *fallback* de carretera repetida: no existen fotos particulares registradas para los 6 lugares. Integración de Google Place Photos BLOQUEADA a la espera de autorización de API con facturación y revisión de licencias; no fingirla terminada. **NO desplegar en producción**. CI, prueba de teléfono y aprobación PO pendientes. Véase `docs/PAZO_F17_PLACES_FEED_POLISH_20261022.md`.

---

## F17 EN CURSO — continuación Codex sobre PR81, 22-oct-2026 Guatemala

Se recuperó HEADa7b1f2c8 de la rama F17 y se conservó el trabajo de ChatGPT.
Código/ensayo local completados: soporte RPC idempotente, notas privadas y
respuesta del titular, retención90 días elegida por PO; cortesías con historial,
nonce y expiración/revocación; mantenimiento REST/RLS/Storage, admisión Edge y
recuperación independiente; sesiones privadas protegidas al cambiar cuenta.
PWA, viewport100dvh y mapa Streets ya programados se conservaron; errores del
mapa ahora se clasifican sin registrar URLs/tokens.

Tres migraciones versionadas103706/103707/103708, NO APLICADAS. Cinco cuerpos
alojados auditados contra Git; ensayo PG17 con ROLLBACK/COMMIT/historial y
roles reales PASS. Concurrencia12→3/8→1/8→1; `verify:prepreview`1818 PASS,
contratos16 PASS, Chromium local390/1440 **40 verificaciones PASS** (recuperación
compilada con App bloqueada); no Auth/PayPal real ni instalación física.
Informe vigente y Scope Closure: `docs/PAZO_F17_BETA_CLOSURE_GATE_20261022.md`.

Postflight alojado: F17 ausente. F16 **canary/rev1**, Live=true/kill=false,
credenciales válidas y0 intentos/períodos; avance externo preservado sin tocar
finanzas ni pedir guardar otra vez las claves. QA Edge26 JWT ON auditado:
19/20 archivos exactos y1 solo comentarios; despliegue dirigido sigue pendiente.

Bloqueo real: runtime3 permite solo api.supabase.com. Git HTTPS permite push;
API GitHub/Vercel/Mapbox no. Red preparada en borrador (incluye previews
*.vercel.app), requiere revisión/guardado/publicación del entorno por PO;
no otro token. Después verificar CI exacto, gate F17 de SQL/publicación,
backend/Edge/HTTPS, mapa/PWA física y aceptación antes de merge/main.
No declarar F17 COMPLETADA ni LIVE_CANARY_PASS. Notas inferiores de F17 en
borradores y finanzasOFF son checkpoints anteriores.

---

## Estado beta técnico publicado — 22-oct-2026 UTC (último corte verificado)

**Frontend Production READY:** `dpl_DFkGfivtBoK5CV3jvL4V2yJV2pSW` SHA `b5547243bfaeb6c17b8bd3929f05468273b9576b`; PR78 (labels Auth) y PR79 (Chromium E2E más estricto) integrados. GitHub Actions [run39733214540](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39733214540) **7/7 jobs PASS**, Chromium 390/1440 **29/29 PASS** incluyendo navegación pública de registro/login/recuperación, retorno/cancelación no financiera y worker PWA real; no usuario autenticado ni dispositivo físico. Backend: migración beneficios públicos Live-only aplicada y QA conservado; Vault Edge v2 ACTIVE. Certificado técnico v3 registrado en DB para **el SHA desplegado** con digest `03aeb1b37a465a52f0de6bf1963b46d258c5a9ef1848bb46775809bc30fabf9a`, BEGIN/ROLLBACK y COMMIT PASS, `artifact_ready=true`; versiones antiguas de evidencia preservadas.

**El PO aún debe completar personalmente:** validar UI Admin autenticada y aspecto visual responsive, instalar PWA en teléfono real, guardar privadamente claves PayPal Live con TOTP fresco, autorizar canary real US$2.99 y validar venta/cancelación/beneficios. Live sigue OFF, kill switch ON y cero pagos. No declarar beta financiera pública lanzada sin lo anterior. Informe detallado en `docs/PAZO_BETA_RELEASE_FINAL_ACCEPTANCE_20261022.md`. Este checkpoint prevalece sobre reportes históricos inferiores que citan frontend `5283bbc9` o versiones anteriores.

---

## Continuación de beta — corrección de roles, teclado y reconciliación de alcance (22-oct-2026 UTC)

**Orden textual del PO del 21-oct inalterada; beta global aún NO cerrada.** El código de PR74 (DRAFT, sin merge a main ni despliegue) corrige un defecto real: AdminDashboard exigía indirectamente el rol de moderador aunque `pazo_is_admin()` fuera verdadero. Ahora la consola admite admin-only y las colas de moderación solo se muestran a moderadores. Diálogo fullscreen: foco inicial, teclado Tab/Escape, retorno del foco, sin alterar el diseño F13. CI PG17-P12 cambia puerto fijo 55442 por puerto dinámico tras observar colisión de Docker. Evidencia específica y matriz DoD en `docs/PAZO_BETA_SCOPE_CLOSURE_20261022.md`. CI anterior al ajuste del puerto `39723890289`: 4/4 SUCCESS; CI de último HEAD sigue sujeto a comprobación.

**Pendientes que no pueden declararse PASS por CI:** aceptación visual final del Centro de control frente al diseño ya elegido; instalación PWA en dispositivo real y E2E autenticado; seguridad Auth advisor; operación PayPal Live real bajo credenciales privadas + GO. Release financiero permanece OFF y kill-switch ON. Código de producción Vercel sigue SHA `f7cc359a...`. No pedir credenciales por inercia ni declarar beta Live pública.

## F16 — certificado técnico instalado y gate previo a credenciales — 22-oct-2026 UTC

**PASS real de la parte técnica comprobable sin PayPal Live**. GitHub `main` incluye PR71/72; Vercel Production `dpl_J548ManBu2xMJCUwV6L7QwiNfNzM` READY, frontend SHA `f7cc359a15e874942f68fc15f55c43e851f7724d`, canonical `https://pazo-app-t83r.vercel.app`; HTTP público 7/7 PASS en Actions run39718690012/job119626859178. Cinco Edge Live listadas ACTIVE en versiones release1/webhook2/checkout3/cuenta5/worker4 y hashes exactos almacenados en `docs/evidence/PAZO_F16_TECHNICAL_CERTIFICATE_BASIS_20261022.md`; fuente de69/69 verificada por postflight anterior. Worker vivo (heartbeat dentro5min), oferta ES/EN, RPC recuperación, beneficios y finanzas PASS.

Se ejecutó `scripts/f16-technical-release-certificate-operator-20261022.sql` contra Supabase: **primero BEGIN/ROLLBACK PASS con 0 certificados después; después CI SUCCESS y ejecución COMMIT exactamente una vez**. Postflight alojado confirmó fila única `admin_private.pazo_live_release_artifact` con `verified_at=2026-10-22T03:58:00.946349+00:00`, `frontend_commit=f7cc359a...`, `return_origin` canónico, `evidence_sha256=ad9a35ae6b268c5eb9fbe5f26aeeaadb65de8f769eb693c5363cf2a22dd37c29`, `admin_private.pazo_live_artifact_ready()=true`. Fuentes SQL de readiness: terms, recuperación, beneficios, finanzas, certificado y worker **6/6 true**. No hubo merchant configurado.

**SEGURIDAD:** release `off/rev0`; sandbox/live=false/kill=true/active_generation=null; Live intentos0/períodos0. No uso de PayPal Live, claves, pagos, autorización canary ni acceso público financiero. Queda **READY_FOR_PO_PRIVATE_LIVE_CREDENTIAL_ENTRY** por cobertura técnica, pero **NOT LIVE_CANARY_PASS ni BETA_FINANCIAL_PUBLIC_GO**. El PO ingresa Client ID/Secret solo en PAZO Admin→PayPal→Live autenticado con MFA y aprueba expresamente canary US$2.99; tras canary se deben verificar venta firmada, período, beneficios, cancelación y condiciones de apertura pública. QA de usuario autenticado e instalación física PWA no se afirman. Este estado prevalece sobre notas históricas de certificado0.

## Lanzamiento técnico en Production — 22-oct-2026 UTC (estado más reciente)

PR71 F13/F16 integrado a `main` (`f7cc359a15e874942f68fc15f55c43e851f7724d`) tras 8/8 Actions PASS del release; Vercel production `dpl_J548ManBu2xMJCUwV6L7QwiNfNzM` **READY**, alias `https://pazo-app-t83r.vercel.app` sin error. **HTTPS/PWA HTTP7/7 PASS real** en GitHub Actions [run39718690012](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39718690012), job119626859178 (portada, return/cancel, manifest, SW, iconos). No debe reabrirse el bloqueo anterior de404/SSO en la URL canónica sin evidencia nueva. 

Supabase release `off/revision0`, PayPal Live false, kill ON, certificado0, solicitudes/evidencias0; no pago real, canary ni claves. Falta QA autenticada/PWA física, registro de certificado técnico conforme a P4 y entrada privada/GO del PO para canary US$2.99, venta/renovación/cancelación y apertura pública financiera. Monetización sigue NO-GO; la PWA gratuita ya tiene despliegue técnico Production y rutas HTTP válidas. Handoff detallado: `docs/PAZO_BETA_PRODUCTION_DEPLOY_POSTFLIGHT_20261022.md`. Esta sección supersede las notas históricas inferiores que digan `main` intacto o canonical no publicado.

## Preview HTTPS verificado — 21-oct-2026, Guatemala (22-oct UTC)

Red del candidato RESUELTA, sin volver a pedir secretos/publicación de entorno.
Fuente a3f912eb, deployment dpl_8wYorPT2TVTFvbyBT9hufbTKNzA3: HTTP7/7 y
Chromium HTTPS390/1440 PASS, app inicia, legal Gmail/PayPal, mayoría18+ desmarcada,
callbacks limpian tokens, SW activo/CacheStorage0, offline503 y recuperación online.
Mapbox estilo+JS/CSS200; no certificación de mapa/instalación física. Gmail
recibido confirmado previamente, sin envío nuevo. CIa3f912eb y875f3d92:5/5 cada uno.

Postflight readonly: modoOFF/rev0, Live=false/kill=true/procesamiento=false,
heartbeat reciente, intentos/períodos/certificados0. Main y producción intactos.
Pendiente GO de integración/despliegue técnico canonical con comprasOFF; después
verificación/certificado, claves privadas y GO canary. NO pago real ni beta
pública aprobados, no READY_FOR_PO_CREDENTIALS hasta canonical/certificado.
Evidencia `docs/PAZO_PREVIEW_HTTPS_VALIDATION_20261021_GT.md` y JSON agregado.
Las notas inferiores del403 de este hostname quedan superadas.

## Vista final y configuración pública corregida — 22-oct-2026

Código `a3f912ebbb64d1c2365471be04ac2915fc9e1e9e`: **5/5 Actions SUCCESS**.
Gmail configurado, envío HTTP200 y recepción confirmada por PO. SQL de seguridad
20261022021500 instalado/verificado; release financiero sigueOFF sin certificado.

Prueba protegida anterior: HTTP7/7 PASS, pero navegador detectó bloqueo real
`PAZO is unavailable`: la URL pública Supabase estaba tipada sensitive en Vercel
y el pull/prebuilt la exportaba vacía. No confundir HTTP200 con app utilizable.
La API no permite cambiar tipo sensitive: se reemplazó SOLO esa URL pública por
plain con el origin canónico ya fijado en código, mismos targets preview+production.
No se leyó/reveló un valor sensible ni se cambiaron claves. Mapbox público existente
conservó valor y se preparó también para Production; QA=false/beneficios=true
server-gated configurados para ambos targets, sin tocar overrides de ramas.
Ningún despliegue de producción ni nuevo plan/add-on.

Pull oficial+parser real del cliente PASS para Supabase, Mapbox pk y flags;
Vercel build local/prebuilt regenerado con esa configuración, fecha legal vacía.
Navegador sobre bundle compilado390/1440 PASS (registro/legales/móvil/foco).
Nueva vista protegida **READY** del SHAa3f912eb:
https://pazo-app-t83r-b6fzt5jwv-digitalapp.vercel.app,
`dpl_8wYorPT2TVTFvbyBT9hufbTKNzA3`. Proyecto/equipo/SHA exactos verificados por API.
SSO conservado. Es el candidato vigente; no usar el preview anterior como app
aceptada. Main y producción conservados.

Este hostname nuevo devuelve403 del túnel del entorno; excepción exacta guardada
en borrador revisión9, `requires_publish=true`. PO debe revisar/guardar/publicar
el entorno de esta conversación; la herramienta no puede publicarlo. El hostname
anterior sí es accesible y responde302 de SSO, no afirmar bloqueo global.
Falta verificar la vista final HTTPS/PWA bajo autenticación, luego canonical y
certificado solo tras GO de publicación. No READY_FOR_PO_CREDENTIALS todavía.
Detalle `docs/PAZO_FINAL_PREVIEW_RUNTIME_20261022.md`.

## Gmail operativo — 22-oct-2026

PO confirmó que la contraseña de aplicación corresponde al correo de soporte
ya designado. SMTP Supabase→Gmail **APLICADO**, smtp.gmail.com:587 con STARTTLS,
remitente PAZO y correo de soporte. Clave usada solo en memoria hacia API
Management, nunca frontend/Git/logs. PATCH+GET verificó campos y presencia de
password sin devolverla; otros ajustes Auth preservados. Límite técnico10
correos/hora (antes2 del proveedor predeterminado), sin plan/add-on ni coste
nuevo contratado; límites propios de Google siguen aplicando.

**Entrega PASS:** una sola solicitud de recuperación a la propia cuenta del PO,
registrada previamente, HTTP200; PO confirmó «Sí, ya llegó». No envíos a terceros,
reintento, cambio de contraseña ni repetición del E2E Auth aceptado. Se verificó
transporte real, no una simple respuesta genérica para correo inexistente.
Privacidad ES/EN ahora describe Google/Gmail, direcciones y contenido de correos
de cuenta/recuperación/soporte; sin nuevos datos de mascotas/pago o analytics.

Red de preview ya accesible por ruta normal: HTTP302 de autenticación Vercel,
no403 del túnel. No afirmar fallo de red actual ni pedir volver a generar
contraseñas. Falta validar HTTPS/PWA autenticado y la vista final actualizada;
no READY_FOR_PO_CREDENTIALS aún. Las notas inferiores de SMTP ausente/bloqueo403
son checkpoints anteriores.

## Seguridad RPC instalada — 22-oct-2026

Parche de visibilidad pública `20261022021500` APLICADO tras CI73525439
**5/5 SUCCESS** y ensayo alojado ROLLBACK. Fuente2/2, ACL y tres HTTP públicos
PASS (lectura neutral, lote válido y matriz rechazada22023). Inspección41 RPC
completada; no grants nuevos ni datos de clientes consultados. ModoOFF/rev0,
Live=false/kill=true/gen=null/procesamiento=false, intentos/períodos/certificados0.
Artefacto Vercel local/prebuilt SHA73525439 PASS, no desplegado; preview sigue
SHA020e6ce1 y HTTPS continúa pendiente. Detalle:
`docs/PAZO_PUBLIC_RPC_SECURITY_REVIEW_20261022.md`.

## Seguridad RPC — 22-oct-2026, parche preparado

Inspección íntegra de41 SECURITY DEFINER públicas ejecutables por authenticated
(4 también anon), todas search_path vacío. Hallazgo reproducido: muro podía
exponer mascota retirada por moderación al saltarse RLS. SQL20261022021500 corrige
lector público de beneficios usando visibilidad moderada existente; no modifica
pagos, consentimiento ni grants. Matrices ya se rechazaban (no bypass); límite
se valida explícitamente. Gateway PG17 completo PASS con fuente anterior
reproducida, rollback/savepoint y roles anon/authenticated reales. SQL aún
NO APLICADO en este checkpoint; CI y ensayo/postflight alojado pendientes.
HIBP requiere Pro según documentación oficial, plan actualFree: riesgo residual
pendiente de considerar en GO, sin upgrade ni presunción de aceptación.
Ver `docs/PAZO_PUBLIC_RPC_SECURITY_REVIEW_20261022.md`.

## Correo, Auth, privacidad y preview — 22-oct-2026 (estado vigente)

Vista protegida creada y **READY** por Vercel: deployment
`dpl_FGiumJgvLvrL3MmxSwk8i1WUC11s`, fuente `020e6ce1`,
https://pazo-app-t83r-8zbuzaf2x-digitalapp.vercel.app. Build local/prebuilt,
Sandbox QA UI=false, beneficios=true sujetos a cobertura SQL; sin promoción,
sin alias público ni cambio de SSO. **No HTTPS_E2E_PASS:** el proxy de este
entorno rechaza ese hostname con403 antes de Vercel. Excepción exacta guardada
en borrador; requiere revisión/guardado/publicación por el PO en Codex Cloud.
No confundir READY del deployment con página comprobada ni beta pública.

Auth alojado: `site_url` corregido de localhost al origin canónico; añadidas
rutas exactas `/` y `/?auth=recovery` de canonical y este preview. Redirección
anterior preservada (5 entradas), autoconfirmación/MFA/contraseñas sin cambios,
PATCH y GET postflight PASS. No altas, resets ni correos enviados; no se reabre
el QA Auth ya aceptado. Copia operativa anterior privada fuera de Git.

El PO eligió **Gmail**. Auditoría confirma SMTP propio ausente/hook deshabilitado;
el SMTP predeterminado Supabase no entrega a cuentas ajenas al equipo. Requisito
`PAZO_GMAIL_APP_PASSWORD` guardado en borrador (solo destino api.supabase.com),
valor todavía no disponible. Solo el titular puede generar la contraseña de
aplicación de Google y guardarla en bóveda; jamás chat, repo o variable VITE.
No se ha configurado Gmail ni declarado entrega PASS.

Privacidad ES/EN reconciliada con PayPal, referencias financieras restringidas,
consentimiento y muro opcional revocable; términos remiten al checkout y al
histórico aceptado sin cambiar el contrato inmutable de la oferta Live.
Fecha legal mediante metadata opcional `VITE_PAZO_LEGAL_EFFECTIVE_DATE`, ISO
real validado: vacía en previews; fecha real solo al publicar con GO. No activa
pagos ni sustituye aceptación. `verify:prepreview` **1,813 PASS**, build/dist,
lint archivos tocados0/0 y Chromium390/1440 (modal real, scroll, Escape/foco,
sin overflow/errores) PASS LOCAL. Incremento aún no desplegado en ese preview.

P4 permanece instalado/verificado, modoOFF/rev0/certificado0/autorizaciones0;
producción antigua y main intactos. Pendientes externos: publicación del entorno,
secreto Gmail; luego HTTPS/PWA/certificación técnica y entrega real de correo.
No pedir PayPal todavía. **NO READY_FOR_PO_CREDENTIALS ni beta lista**.
Detalle: `docs/PAZO_BETA_MAIL_AUTH_PREVIEW_20261022.md`.

## P4 alojado — 22-oct-2026

`41871d47`5/5CI PASS; migración controlada230000 APLICADA con ensayo y13/13
fuentes/ACL/RLS verificadas. Cinco Edge actualizadas,69/69 fuentes exactas y
HTTP negativos PASS. ModoOFF, certificado0/autorizaciones0, Live=false/kill=true,
procesamiento=false, intentos/períodos0. HTTPS público sigue antiguo/NO-GO;
preview protegido y cierre operativo en preparación. No READY_FOR_PO_CREDENTIALS,
no canary/producción/main autorizados. Postflight:
`docs/PAZO_F16_CONTROLLED_RELEASE_POSTFLIGHT_20261022.md`.

## P4 — control de activación y parada (22-oct-2026, código preparado)

PR67 continúa sobre `5972855e`: control Admin+GoTrue+MFA, canary del operador
original, evidencia firmada/conciliada para abrir público, CAS/nonce/audit y
parada sin interrumpir histórico. EntryPoints locales usan comprobaciones del
backend; no cambian al guardar claves. SQL `20261021230000` todavía NO aplicado,
Edge nueva NO desplegada, certificado AUSENTE y dinero OFF. Local1811/PG17/
Chromium390/1440 PASS. CI/instalación/deploy/HTTPS y operaciones siguen pendientes;
no READY_FOR_PO_CREDENTIALS. Evidencia en
`docs/PAZO_F16_CONTROLLED_RELEASE_20261022.md`.

## Actualización — readiness administrativo instalado

PR67: código `3dcd8e07` publicado con 5/5 Actions SUCCESS. Migración readonly
`20261021223000` APLICADA tras ensayo ROLLBACK y postflight de cuerpo/ACL;
Live=false/kill=true/sandbox/generación=null/revision0, intentos/períodos0.
No operación PayPal ni publicación. P4 control financiero y HTTPS/PWA siguen
pendientes; no pedir claves PayPal todavía. Cada incremento se sube a GitHub
con documentación por orden expresa del PO. Evidencia y límites:
`docs/PAZO_SUPABASE_BETA_POSTFLIGHT_20261021.md`.

## Supabase operativo — 21-oct-2026, 21:47 UTC

PR67: migraciones `20261021210000`, `20261021213000`, `20261021220000`
**APLICADAS** tras autorización explícita y ensayo alojado con ROLLBACK.
Postflight ACL/RLS y 6/6 fuentes SQL PASS, nueva tabla vacía. Cuenta Live
**v4 ACTIVE/JWT ON**, 8/8 fuentes exactas y HTTP negativos401 PASS.
Live=false, kill=true, sandbox, generación activa null; 0 merchants/intents/
períodos/inbox. Main y producción Vercel intactos.

P4 avanza con readiness administrativo de lectura y recuperación de estado de
credenciales; nuevo SQL `20261021223000` aún NO aplicado. Verify:prepreview1788
PASS, PG17 y Chromium390/1440 PASS. Habilitación financiera controlada sigue
pendiente; NO beta lista ni READY_FOR_PO_CREDENTIALS. No pedir más tokens ni
claves PayPal por ahora. Evidencia actual en
`docs/PAZO_SUPABASE_BETA_POSTFLIGHT_20261021.md`; estados inferiores de falta de
acceso/SQL nuevo sin aplicar/cuenta sin desplegar son historia superada.

## Continuidad Codex — 21-oct-2026, implementación local verificada

Base de integración auditada por Git: F13 `669efafdb5678cae40c5137d7bddc9403c2ab8a3`;
PR #66 `d1d34fa230c0928748141adf1f02adb186a99568` revisado: solo alinea el nombre
de la migración de cancelación ya aplicada y su prueba, más el handoff. Se usó
como base de `f16/beta-completion-20261021`, sin modificar `main` ni sobrescribir F13.
La API estuvo bloqueada durante esa implementación; el postflight de 20:30 UTC
ya revisó PR/CI por GraphQL y REST. Ver
`docs/PAZO_CLOUD_ACCESS_AND_HTTPS_POSTFLIGHT_20261021.md`: PR66 tiene 12/12
Actions SUCCESS, pero Vercel falla por cuota y los callbacks/PWA públicos dan404.

Código adicional implementado: reanudación del CREATE original con lease y el
mismo cuerpo/PayPal-Request-Id dentro de 48h; GET independiente antes del binding;
reconciliación de cancelaciones inciertas por GET sin segundo POST; cierre de
slots solo tras estado terminal verificado, sin eventos/cancelaciones pendientes
ni cobertura sin vencer (incluidos holds); consentimiento nuevo para otro intento;
descarga ES/EN de condiciones incluso tras cierre; acceso a gestión desde miembro
verificado; aislamiento ante cambio de usuario; fondos/muro Live basados en períodos
verificados; agregados administrativos sin saldo/ingreso neto inventado.

Tres migraciones nuevas SOLO preparadas y probadas en PG17 desechable:
`20261021210000` recovery finish, `20261021213000` cosméticos Live,
`20261021220000` resumen financiero administrativo. NO instaladas en Supabase.
La Edge de cuenta actualizada NO fue desplegada. Checkout/webhook siguen hard-OFF
en el código. No hay cobros, nuevas credenciales ni publicación por estos cambios.

Validación: suite local de gobernanza/F16, build y dist; PG17 con SQL real y
rollback/reapply; navegador sintético 390/1440px, doble clic, cancelación explícita,
fuente financiera no disponible y callbacks reales de la SPA sin tokens en URL.
Estos resultados NO son PayPal Live, PWA instalada HTTPS ni CI remoto.

**Bloqueo operativo actualizado a 20:30 UTC:** GitHub, Auth Supabase y portada
HTTPS ya responden; los callbacks y archivos PWA de ese dominio devuelven404.
Sin autenticación administrativa Supabase/Vercel. El login oficial Vercel sigue
bloqueado por proxy a vercel.com; se añadieron vercel.com y supabase.com al
borrador preservando lo anterior. Guardar no aplica: requiere revisión/guardado
y publicación del entorno de desarrollo, no de PAZO. Postflight enlazado arriba.
Falta auditar source/versión alojados antes de instalar/desplegar; también falta
terminar P4 (readiness y habilitación controlada Admin/DB/Edge), publicación HTTPS
bajo GO y canary real autorizado. NO pedir claves PayPal todavía.
No hacer push a ramas conectadas sin verificar primero Preview OFF/cuota.
Ver informe de esta entrega: `docs/PAZO_CODEX_BETA_CONTINUATION_20261021.md`.
**Estado global: NO-GO; no READY_FOR_LIVE_CREDENTIALS_AND_PO_CANARY.**

> **F16 vigente 21-oct:** plan y webhook generación1 YA aprobados; no repetir. PR54 a F13: ocho migraciones aplicadas para firma, venta/refund con ACK atómico, lifecycle, scheduler privado y monitor de disputas. Worker Edgev2,27/27 fuentes verificadas; cron automático200/healthy a16:27UTC con protocolo v2 y0 pagos/eventos/casos. Procesamiento financieroOFF/LiveOFF/killON. pg_net conserva grants de plataforma: net fuera de Data API y capacidad de un uso/120s, sin claves PayPal/servicio en cola. PG24/governance423 yCI3506/gateway423 PASS. Beneficios/checkout/readiness/HTTPS y resto P2–P5 pendientes; no declarar READY_FOR_LIVE_CREDENTIALS_AND_PO_CANARY. main intacto, claves solo al terminar ingeniería; cobros/publicación requieren GO.

## MANDATO EXPRESO DEL PRODUCT OWNER — BETA PAZO / PAYPAL LIVE (21 OCT 2026)
**PRIORIDAD MÁXIMA. VIGENTE. NO OPCIONAL. NO REINTERPRETAR.**

**Orden textual del Product Owner:** «termina todo lo que tengas que terminar para que yo solamente coloque las credenciales de paypal ya este funcionando, sigue mi orden, no quiero que te desvies, mi orden es que termines ya la beta para sacarla y que dejes todo terminado para que yo solamente guarde las credenciales en el apartado de administracion y ya pueda cobrar, esa es mi orden explicita y quiero que lo anotes en mi pazo de hithub como orden que se tiene que hacer. terminar lo que falta para que al terminar la beta que ya este todo listo para que yo solo tenga que colocar las credenciales para que todo este listo para cobrar y lanzar».

**Definición de terminado (DoD obligatoria y medible):**
1. La app beta pública (módulos sociales aprobados, panel administrativo responsive, registro/login, moderación, términos, PWA instalada/no instalada) queda compilada, probada, desplegable y validada en HTTPS oficial; no reabrir sin regresión lo ya aceptado por el PO.
2. Admin → Configuración → PayPal → Live permite a un administrador auténtico con MFA reciente introducir Client ID y Client Secret **dentro de PAZO una sola vez**, con guardado cifrado server-only, confirmación inequívoca y recuperación segura tras refresh. Se usa **el plan US$2.99 mensual, webhook y generación1 YA EXISTENTES**; no exigir permiso PayPal `reporting/balances/read`, pruebas Sandbox adicionales, creación de recursos duplicados, enlaces manuales ni pegar secretos en GitHub/chat/CLI.
3. Ese flujo privado valida OAuth Live, plan de US$2.99, webhook por generación y evidencia del comercio, vincula de forma auditable la generación original, coloca secretos en el backend y prepara los controles de release. Una simple coincidencia introducida por usuario no se debe confundir con evidencia independiente; los cobros solo se habilitan si todos los checks de transacción y seguridad están satisfechos.
4. Checkout real dentro de PAZO → consentimiento expreso versionado → creación PayPal con idempotencia → aprobación/retorno HTTPS en navegador y PWA → lectura de PayPal + webhook firmado → inbox durable → ventas/completados/renovaciones → períodos pagados reales → insignias Amigo de PAZO (1/3/6/12 meses) y demás beneficios sin falso grant, con proyección verificada.
5. Gestión autónoma de cancelaciones, errores/abandono de checkout, reintentos controlados, reembolsos, reversos, disputas, caducidad; conciliación y observabilidad/admin (usuarios, suscripciones, recaudación, abandonos, actividad, fake doors). Kill-switch y rollback probados.
6. QA end-to-end sintética y en HTTPS, base y RLS, trazabilidad y pruebas del gate financiero, seguridad, accesibilidad/móvil, callback PWA, firma de webhooks y humo real supervisado. Sin release silencioso de `main` ni cobro real no autorizado.

**Experiencia final prevista:** tras la entrega técnica completa, la única configuración rutinaria pendiente del PO debe ser ingresar las credenciales Live en Administración y aprobar personalmente la activación/prueba real que implique dinero. Ningún trámite técnico repetitivo, replanteo del producto o cambio de proveedor como sustituto. Cualquier obstáculo externo verdadero se documenta por nombre con alternativa concreta y mínima ayuda solicitada.

**Flujo de ejecución:** ejecutar sin pausas arbitrarias cambios de código, migraciones técnicas ya autorizadas, pruebas y preparación; usar F13/PR44 como integración y preservar `main` y cualquier dato real hasta GO del PO. Los controles de seguridad del cobro, verificación de pagos y permisos de terceros NO se omiten por urgencia; **nunca marcar «beta lista» ni «Live cobra» sin pruebas reales completas**. Si una dependencia requiere consentimiento/secretos o autorización externa, continuar el resto mientras se espera y preguntar únicamente la intervención imprescindible.

**PRECEDENCIA:** Este mandato reemplaza propuestas previas que aplazaban F16 a después de beta, exigían el scope PayPal de balances, sugerían links PayPal manuales o aceptaban beta incompleta. Se incorpora en handoff y hoja maestra para todo agente, incluyendo Codex.



## Corrección prioritaria: permitir cobros sin permiso de saldos — 21-oct-2026 (vigente)

**Decisión operativa PO:** prioridad que la membresía US$2.99 pueda recibir
pagos reales correctamente, sin nuevas pruebas innecesarias de identidad.
La llamada `reporting/balances` provocó
`live_merchant_read_permission_required`; **ese permiso NO es requisito
de PayPal para crear suscripciones, configurar webhook o consultar plan**.
No pedir al PO activar reporting/Transaction Search ni repetir el formulario.
La coincidencia Merchant ID vía saldos fue un gate artificial introducido
durante desarrollo. No usarla para bloquear integración financiera.

**Código ya integrado:** PR #49 (squash `5fb025b6`, 9/9 GitHub CI SUCCESS)
retiró el formulario `AdminPaypalLiveMerchantMatch` del flujo normal de
Admin→PayPal→Live, sustituyéndolo por un mensaje claro de preparación pendiente.
Tests de regresión en `adminPaypalLiveMerchantMatch.test.mjs`.
El lector histórico puede permanecer en repositorio como laboratorio privado,
pero NO forma parte del criterio de go-live ni debe ser invocado por usuario.
No hubo migración ni despliegue de frontend/Edge financiero en PR49.

**Estado real de cobros no se sobrestima:** plan y webhook generación1
comprobados y registrados; Live sin credenciales generacionales, sin generación
comercial persistente, webhook Live y checkout Live con latches de código OFF,
rutas de reconciliación/beneficios no activas. Antes de ofrecer pagos en PAZO
hay que cerrar almacenado seguro de secretos, originales de comerciante con
MFA y proveedor OAuth/plan ya verificados, ingreso de webhook firmado,
ventas completadas y cancelación/refund/entitlements, callback HTTPS y GO de
operación real. No es seguro habilitar solo un botón de PayPal.

**Alternativa inmediata de ingresos, separada de integración en PAZO:**
PayPal Business permite `Sales → Subscriptions → Create/Manage plan →
Generate Link` (PayPal ayuda oficial). Puede cobrar recurrencias mediante
enlace de PayPal sin servidor PAZO, pero **no asigna automáticamente membresía
ni beneficios en la app**. No publicarlo como Amigo de PAZO integrado sin
reconcilación explícita con el usuario. Si se usa como transición, informar
claramente el carácter manual. No inventar ni sintetizar URL de plan.

**Próxima implementación:** dejar de optimizar la consulta de saldos;
priorizar un recorrido administrativo de una única entrada de credenciales
con verificación de OAuth/plan/webhook desde Edge, custodia segura por generación,
ingestión firmada e idempotente, reconciliación y flujo de cobro/cancelación
end-to-end con pruebas negativas. Mantener main/checkout Live OFF hasta GO
expreso y prueba financiera supervisada.


## Continuidad Codex recuperada — 21-oct-2026 (vigente)

El PO publicó los dos archivos WIP de Codex desde `pazo-beta-rc` en
`f16/codex-merchant-identity-handoff-20261020` (respaldo preservado).
El clon local `PAZO-F13-preview` seguía en `9c034c03` con cambio
exclusivo en `package-lock.json`; no se alteró esa modificación.

**PR #47 integrado SOLO a F13 (squash `b28e455`), CI 9/9 PASS:**
lector server-only `liveMerchantIdentityReadOnly.mjs` obtenido de Codex,
que verifica OAuth/plan/webhook y consulta la API PayPal Live
`GET /v1/reporting/balances?currency_code=USD` con permiso
`reporting/balances/read`. Descarta respuesta de saldos, ID bruto y tokens;
deriva `SHA-256(paypal:live:<account_id>)`. Sin fingerprint comercial
original fijado por metadatos inmutables del servidor, solo devuelve candidato
`ok=false / merchantIdentityVerified=false`. El verificador conectado al
provisioner exige comparar huella original y rechaza mismatches antes de
cualquier escritura de secretos. El hosted entrypoint permanece OFF.

**PR #46 integrado SOLO a F13 (squash `1e2661f`), CI 9/9 PASS:**
`pazo-admin-paypal-provision/intake.mjs` admite rutas Edge interna/pública,
responde preflight CORS solo a Origin y método aprobados, rechaza prefijos,
sufijos, query y métodos indebidos; OPTIONS nunca llama al backend.
Se ajustó la release guard para exigir la liberación bloqueada.
Sin despliegue ni provisión de claves ni activación financiera.

**Postflight alojado solo lectura:** `merchant_generations=0`,
`secret_provision_attempts=0`, `release_evidence=0`,
`live_paid_periods=0`. `environment=sandbox`,
`live_enabled=false`, `kill_switch=true`, `active_generation=null`.
La generación 1 YA tiene registro real
`plan_read_verified=true/webhook_read_verified=true` (no repetir).
`validation_status=not_verified` es intencional hasta validar el comercio,
entrega de webhook y circuito financiero.

**SIGUIENTE gate real:** verificar por fuente independiente el ID del comercio
original autorizado y fijar su huella en generación 1 tras MFA reciente y
aprobación explícita PO; completar registro/secretos con scope mínimo, webhook
firmado, conciliación, checkout/retornos HTTPS, beneficios y rollback.
No inventar la huella ni confundir el candidato con identidad original.
Ningún GO de cobro/producción, ninguna migración alojada en estos dos PR,
`main` intacto y PR #44 todavía DRAFT.


> **ESTADO VERIFICADO 20-OCT-2026 GUATEMALA / 21 UTC:** POST503 reproducido y corregido en17guardasSQLJSON de PostgREST. Commitba9605637c035f873a0e5793937e04aa76e7a551:9/9CI SUCCESS; migraciónHOSTED20261021012636,17definiciones/ACLprotegidas y0reservas/0generaciones/0intentos,LiveOFF. PO autoriza todas las migraciones necesarias sin GO individual; conservar auditoría/versionado/postflight y gates independientes de cobro/publicación/visual. SolicitudPO pendiente: única comprobación administrativa readonly desde localhost actualizado, no reservar todavía. VercelpreviewOFFverificado; portada200pero retornos/manifest/SW404. RC sigueNO-GO. Véanse handoff vigente y PAZO_BETA_RELEASE_CANDIDATE_REPORT.md; no repetir altasMFA/plan/Sandbox aprobado.

> **DECISIÓN PO 20-OCT-2026 — BETA F16_GATE_COMPLETO O NO SE PUBLICA:** antes de beta es obligatorio terminar y desplegar bajo GO toda la lógica de PayPal Sandbox/Live, incluido panel administrativo **Guardar y activar** para que el PO pueda introducir credenciales y operar SIN volver a programar, sea antes o después del lanzamiento. No se autoriza dejar el checkout Live, webhook, períodos, cancelación, renovación, refunds/disputas, beneficios, reglas de reconciliación, selector, auditoría ni rollback para una fase posterior a beta. La fecha de publicación NO condiciona habilitar Live; el HTTPS público real, el comercio válido, las pruebas y autorización explícita SÍ. Live permanece OFF durante desarrollo, no desplegar ni cobrar por este cambio. Se revocan los snapshots históricos contradictorios. Handoff canónico y gate: `docs/PAZO_ACTIVE_HANDOFF.md` y `docs/PAZO_F16_ADMIN_EDGE_PROVISIONING_GATE_20261020.md`.

> **F16 CONTINUIDAD RECUPERADA 19-OCT-2026:** código del gateway Live en PR #44 hasta `0ffa103f`, CI+7 laboratorios PostgreSQL 8/8 SUCCESS, checkout/webhook/conmutador admin Live **OFF**, drafts SQL SOLO desechables. Supabase alojado sandbox/Live false, 26 eventos pendientes, 2 períodos QA. Para instalar SQL real/Edge: migración versionada y GO específico; siguiente desarrollo exacto en `docs/PAZO_ACTIVE_HANDOFF.md` y `docs/PAZO_MVP_TO_LIVE_EXECUTION_ROUTE_20261019.md`. No declarar Live operativo, no repetir módulos social/QA ya aprobados.

> **RUTA DE LANZAMIENTO VIGENTE (19-OCT-2026):** ver `docs/PAZO_MVP_TO_LIVE_EXECUTION_ROUTE_20261019.md`. R0–R9 para preparar MVP Beta y PayPal Live sin activar dinero real. Dev localhost + Sandbox, beta requiere dominio y PWA E2E, Live requiere preflight backend y GO expreso del Product Owner. Conservar gates visual F16, beneficios, conciliación y moderación.

> **GATE VIGENTE — CONTINUIDAD 19-OCT-2026:** `F16_MEMBER_UX_CODE_CI_PASS_PO_VISUAL_PENDING`. La corrección aprobada para **ocultar herramientas QA de membresía y eliminar parpadeo «Amigo de PAZO» en Mi mascota** está programada en PR #44 DRAFT, rama `f13/section-titles-20261012`. CI + 6 labs PostgreSQL 7/7 SUCCESS en commit de código `d5cfed87b5ff699e6855f999ae1ec90eaa77040b`; no se ha obtenido aún **validación visual del Product Owner** de la nueva versión Vite. Prioridad INMEDIATA: ver ambas pantallas con la cuenta Sandbox pagada y corregir si hay diferencias; preservar backend/verificación/cancelación. Segundo gate: `ADMIN_PAYPAL_PREP_VAULT_APPLIED_UI_PO_REVIEW_PENDING_LIVE_OFF`: configuración admin PayPal autorizada, dos entornos y Vault instalados, Live desactivado y sin conexión aún al runtime legacy. Tercer gate: fidelidad visual de diseño admin «Resumen general» al mockup escogido, pendiente PO; no confundir captura rechazada previa con último código. Estado DB 19-oct: 2 períodos pagados Sandbox, 0 entradas en el ledger alternativo `paypal_payment_entries`; conciliar por fuente antes de Live. **CANÓNICO:** `docs/PAZO_ACTIVE_HANDOFF.md` (snapshot compacto) y `docs/PAZO_NEXT_CHAT_ACTIVATE.txt`. Historial en `docs/archive/PAZO_ACTIVE_HANDOFF_HISTORY_20261019.md`. No merge/main, Live, nuevas migraciones o pagos sin gate del PO; no delegar a Codex.

> **GATE HISTÓRICO/SUPERADO — 2026-10-18, NO ES LA PRÓXIMA ACCIÓN:** `ADMIN_SECOND_VISUAL_REWORK_CODE_CI_PASS_PO_RUNTIME_COMPARISON_PENDING`. El Product Owner seleccionó un diseño desktop «Resumen general» y RECHAZÓ la primera captura real por baja fidelidad (tipografía mínima, KPI planos, sidebar pobre, barras simplificadas, espacios vacíos). **Una segunda implementación YA EXISTE en PR #44 DRAFT** (`AdminDashboard.tsx` + `AdminVisuals.tsx`; sidebar/íconos/gráficos/KPI más grandes) y la última comprobación de HEAD previa a handoff `874c89e` marcó **7/7 PASS**, pero **no hay aprobación visual PO** de esa versión nueva. Las dos capturas están en Library raíz: `/Panel de Control PAZO en Tiempo Real (1)(1).png` (referencia) y `/image(20261019-014820).png` (1.ª entrega rechazada). **Siguiente acción**: comparar en Vite la nueva versión desktop/móvil con referencia; subsanar únicamente diferencias actuales, sin tocar PayPal Live/main. Leer snapshot corto `docs/PAZO_ACTIVE_HANDOFF.md` y checklist `docs/PAZO_ADMIN_VISUAL_FIDELITY_GATE_20261018.md`; historia archivada en `docs/archive/PAZO_ACTIVE_HANDOFF_HISTORY_20261018.md`. **No reabrir decisión de diseño ni declarar la fase finalizada por CI**.

> **ADMIN 2026-10-18 — Centro de control de PAZO en desarrollo autorizado por PO:** código UI/tablas/RPC de métricas y fake doors en PR #44 DRAFT; `admin_private` + `pazo_admin_overview/users/experiments/voters/audience` y `pazo_track_activity` desplegados SOLO en Supabase staging por migración `20261018234721`. Auditados permisos: un administrador distinto a moderadores futuros; anonimato denegado, datos admin con auth.uid y roles explícitos. Cuentas/mascotas, ingreso Sandbox vs Live no disponible, funnels de intentos, actividad diaria desde esta versión, ranking 11 fake doors, votos opcionales y tamaños aproximados PG/Storage; NO métricas comerciales externas inventadas. Seguimiento público solo categoría de módulo, sin contenido/GPS/IP. **Aún NO completado:** aceptación visual PO, privacidad/retención y medición de egress/facturación Supabase e ingresos Live mediante fuente real. Mantener F16 y main/Live intactos. `docs/PAZO_ADMIN_CONTROL_CENTER_20261018.md`, `docs/PAZO_ACTIVE_HANDOFF.md`.

> **F16 2026-10-18 — Migración nueva cuenta QA INSTALADA con GO PO:** `f16_sandbox_fresh_owner_qa_admission` aplicada a Supabase, quita dependencia P06 exclusivamente para nuevos owners previamente Auth+QA-allowlisted; conserva ACL server-only, consentimiento/idempotencia, old owner/payment data. Postflight: RPC anon/auth NO, service SÍ, 1 owner habilitado, 1 V2 original, 0 retry/grants/payment/periods, 1 CREATED pending. Email indicado por PO YA existe en Auth y confirmado, no es descartable nuevo: no crear otra cuenta ni eliminar la existente. **Todavía NO está QA-enabled**; se requiere permiso PO aparte para allowlist temporal (48h) sobre ese Auth exacto. CI+5 PG labs 6/6 PASS. PR #44 DRAFT, Live/main intactos. `docs/F16_SECOND_DISPOSABLE_QA_ACCOUNT_20261018.md` y `docs/PAZO_ACTIVE_HANDOFF.md`.

> **F16 2026-10-18 — Segundo Auth QA descartable preparado sin creación ni instalación SQL:** auditamos que `f16_qa_v2_owner_can_checkout` y `f16_qa_v2_begin_checkout` exigían prueba P06 previa. Migración propuesta `20261018193000_f16_sandbox_fresh_owner_qa_admission.sql` conserva allowlist/Auth/expiración/consentimiento/idempotencia y quita solo P06 para un owner nuevo. Nuevo PG17 synthetic PASS, CI+5 PG labs 6/6 SUCCESS (commit `a5a953b2`). No aplicar sin PO GO separado; aún no existe cuenta nueva ni QA allowlist. Original 404 y `CREATED` pending intactos. Véase `docs/F16_SECOND_DISPOSABLE_QA_ACCOUNT_20261018.md`.

> **F16 2026-10-18 — Inventario PayPal Sandbox completo, Edge v14 ACTIVE, CI+4 PG17 5/5 PASS:** La lectura anterior usó filtro `plan_ids`; ahora `audit_retry_inventory` añade consulta sin filtros de plan/estados, paginada y fail-closed mediante `pazoSandboxV2UnfilteredInventoryRead.mjs`. UI botón existente «Investigar suscripción en PayPal», sin PII, grants o payment writes. Edge JWT true, 19 files. Postflight: 1 V2, 0 reintentos/grants/pagos/períodos/activaciones, 1 CREATED pending; worker P05 OFF. PR #44 DRAFT, main/Live intactos. El resultado real general debe ejecutarse una vez desde sesión Auth QA tras sincronizar Vite local; ni 404 ni ausencia en inventarios equivalen a no-cobrabilidad certificada. Informe `docs/F16_V2_UNFILTERED_MERCHANT_RECONCILIATION_20261018.md`.

**Evidencia nueva — 2026-10-18:** QA real en PAZO desde Edge Sandbox v13 dio mensaje `created_event_matches_bound_subscription`: webhook firmado PayPal `BILLING.SUBSCRIPTION.CREATED` correlaciona exactamente al ID de la suscripción V2 guardada. Postflight solo lectura: 1 original, 0 reintentos/grants/pagos/períodos/activaciones, 0 webhooks sale posteriores a la creación, 1 CREATED `pending`. Confirmado **CREATED**, NO aprobación/pago/terminal/no-cobrabilidad; suscripción GET todavía 404. No repetir esta prueba ni merchant/credenciales al PO. Siguiente paso: conciliación de posible cobro futuro e inbox, sin mutar por 404 ni por screenshot. Referencia `docs/PAZO_ACTIVE_HANDOFF.md`.

> **F16 2026-10-18 — RPC read-only + Edge Sandbox QA v13 instaladas con GO del PO:** migración `f16_v2_created_webhook_candidate_readonly` PASS, ACL anon/auth NO y service_role SÍ; Edge `f16-paypal-supporter-v2-qa` v13 ACTIVE JWT ON 18 archivos; `audit_created_webhook` habilitado owner-only, sin pagos. UI `Verificar origen de solicitud` preparada en rama local PR #44, no desplegada como web pública. CI+4 PG17 PASS commit `e1d62816` (39141841083/39141841057/39141841209/39141841135/39141841067). Postflight: 1 candidato CREATED, 0 reintentos/grants/pagos/períodos/activaciones y 1 evento inbox `pending`. Falta la lectura del evento PayPal autenticada por usuario QA; resultado aún DESCONOCIDO. Nunca autorizar retry/grant por correlación, 404 o UI vacía. Informe `docs/F16_V2_CREATED_WEBHOOK_RECONCILIATION_20261018.md`.

> **F16 2026-10-18 — Correlación exacta de webhook CREATED preparada y QA todavía apagada:** V2 generó 1 evento PayPal verificado CREATED `pending` 9.32 s después; no atribuir por tiempo. Nueva RPC **read-only propuesta, NO instalada** (`20261018190000_f16_v2_created_webhook_candidate_readonly.sql`); nuevo verificador merchant GET `webhooks-events/{id}` y Edge acción `audit_created_webhook` con flag **OFF** (sin deploy), cotejo exacto de ID recurso+plan/custom cuando disponibles. CI+4 PG17 SUCCESS `39140987566/39140987623/39140987602/39140987606/39140987732`. Original V2, ledger, inbox, Live y main intactos. **Gate PO separado requerido** antes de instalar RPC o desplegar Edge; no grant por resultado correlacionado. Informe `docs/F16_V2_CREATED_WEBHOOK_RECONCILIATION_20261018.md`.

> **F16 2026-10-18 — Recuperación automática de abandonos lista en rama PR #44:** clasificador fail-closed `sandboxV2RecoveryState.mjs`, panel gestiona automáticamente el intento previo al entrar sin POST ni redirección automática, permite botón Retomar **solo** con `APPROVAL_PENDING` + link válido; 404 muestra conciliación necesaria y no ofrece enlace fallido, aprobación no equivale a pago, terminal no equivale a permiso de otro cobro. Pruebas+CI+3 PG17 labs **SUCCESS** (39139940695/39139940634/39139940589/39139940680), commit `c6aa8a7d`; SQL hosted read-only: 1 V2, 0 reintentos/grants/pagos/periodos/activaciones, 1 CREATED inbox pendiente. **Sin deploy**; siguiente gate=conciliación merchant/inbox; Live OFF. Véase `docs/PAZO_ACTIVE_HANDOFF.md`.

> **F16 2026-10-18 — Diagnóstico raíz comprobado sin cambios alojados:** SQL `f16_qa_v2_begin_checkout` bloquea un segundo intento del mismo owner sin distinguir pagado; `bound` tras GET `APPROVAL_PENDING` no concede pago. Test sintético `f16AbandonedV2RootCause.test.mjs` reproduce abandono, veto del segundo requestKey y 1 solo POST. CI+3 PG labs SUCCESS (39138437947/39138437956/39138437962/39138437954). **Causa de PayPal 404 desconocida:** merchant mismo confirmado PO, inventario sin V2, ausencia de cobro en UI y DB, webhook CREATED pendiente. No fabricar grant, no Live, no desplegar ni modificar main. Informe `docs/F16_V2_ABANDONMENT_ROOT_CAUSE_20261018.md`.

> **F16 2026-10-18 — QA v12 inventario por ID estricto:** corregida exigencia errónea de plan/estado para suscripciones ajenas al intento V2; solo se requieren IDs ajenos válidos y plan/status para el ID exacto. Fila sin ID, falta de paginación y ausencia de evidencia de cobro no permiten grant. CI + 3 PG17 checks PASS (39135944634/39135944584/39135944641/39135944652). Edge QA v12 ACTIVE JWT, 16/16 archivos, 1 intento original, 0 reintentos/grants/periodos/ledger. Usuario puede pulsar `Investigar suscripción en PayPal` una vez sin actualizar frontend (solo cambió backend); no crear cobro nuevo ni activar Live. Ver handoff.

> **F16 2026-10-18 — Lector comercial tolerante a registros incompletos sin riesgo de cobro:** nuevo Edge QA v11 JWT ON, 16/16 archivos, CI + 3 PG Labs SUCCESS 39135431907/39135431898/39135431897/39135431909. Parser de inventario identifica original plan/status verificables y trata otras filas parciales como cobertura incompleta, jamás como ausencia. UI explica si falla colección/filas/detalles/paginación. DB 1 V2 original, 0 grants/reintentos/cobros. PO actualiza Vite, hace un diagnóstico read-only y comparte mensaje; PayPal Live y nuevo checkout siguen bloqueados hasta conciliación merchant real. Véase handoff.

> **F16 2026-10-18 — Inventario falló 503, corregido diagnóstico en QA Edge v10:** logs confirmaron que Auth y lectura privada V2 funcionan; llamada inventario devolvió 503 genérico, aún sin causa PayPal precisa. Agregados códigos estáticos seguros para HTTP/OAuth/red/permisos y mensajes UI ES/EN, pruebas de regresión. PR #44 commit `10e76811`, CI + 3 PG17 labs PASS (runs 39134754625/39134754525/39134754572/39134754659). Edge QA v10 ACTIVE JWT ON, 16/16 archivos; DB histórico 1 V2, 0 retries/grants/paid. **PO actualiza Vite local y pulsa Investigar una vez para obtener categoría segura**. PayPal Live, pagos nuevos, grants y main sin cambios. Handoff arriba.

> **F16 2026-10-18 — Edge Sandbox QA v9 instalada + lector PayPal merchant de solo lectura:** tras aplicar dos migraciones y habilitar elegibilidad protegida por grants privados (0 grants), se incorporó inventario paginado PayPal `GET /v1/billing/subscriptions` a Edge v9 JWT true; acción `audit_retry_inventory` owner-only y CTA `Investigar suscripción en PayPal` en PAZO. 16/16 archivos contra GH `40855926`, CI + 3 laboratorios PG17 SUCCESS. Datos invariables: 1 V2 histórica, 0 nuevos intentos, 0 grants, 0 cobros/períodos/activaciones. NO es autorización de nueva suscripción; el 404 aún necesita evidencia independiente merchant/app + pagos tardíos, refunds, disputas e inbox antes del grant. PayPal Live OFF y PR #44 DRAFT. [Handoff](docs/PAZO_ACTIVE_HANDOFF.md).

> **F16 2026-10-18 — Sandbox retry instalado, 404 aún no conciliado:** después del PO GO se aplicaron a Supabase 2 migraciones `f16_sandbox_v2_append_only_checkout_retries` y `f16_sandbox_v2_multiattempt_account_read_and_finance` (ambas SUCCESS/postflight); Edge `f16-paypal-supporter-v2-qa` v8 JWT ON, 15/15 archivos cotejados. Código para historia/constancia/cancelación/recuperación de intent exacto y CTA reintento por elegibilidad instalado. CI + 3 PG17 labs SUCCESS (último commit `cbae0fd`). **0 grants, 0 retry attempts, 0 pagos/períodos/beneficios nuevos.** La ruta owner-only de elegibilidad funciona en diseño; botón de iniciar PayPal permanece bloqueado por grant merchant ausente. 404 original requiere reconciliación independiente de merchant/app, transacciones y posibles cargos tardíos ANTES de autorizar otro checkout. NO crear grant por 404 aislado, NO Live, no merge, no compra, no Vercel upgrade. Ver `docs/PAZO_ACTIVE_HANDOFF.md`.

> **F16 reintentos V2 preparados, NO desplegados (PO GO 2026-10-18):** política de retry por evidencia merchant sin admitir `404` aislado, migración `20261018165000_f16_sandbox_v2_append_only_checkout_retries.sql` privada/append-only + consentimiento nuevo/idempotencia/one-shot, Edge `retry_status/retry_begin` **hard OFF**, sin cambiar Edge hosted v6. CI [39129477347](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39129477347), PG Lab [39129477345](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39129477345) y nuevo PG17 Retry Lab [39129477358](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39129477358) SUCCESS; test late payment antes de POST bloquea retry. **Pendiente:** merchant reconciliación 404, read/management/terms/benefits multiintento, revisión PO separada para aplicar migración y activar QA; PR #44 DRAFT, sin Live. Ver `docs/F16_SANDBOX_V2_RETRY_GATE_20261018.md`.

> **F16 — Causa checkout abandonado identificada (2026-10-18):** PO confirma credenciales Sandbox SIN cambios; prueba P06 antigua pagada/cancelada; prueba V2 nueva abrió PayPal pero PO salió sin pagar. SQL read-only confirma 1 P06 y 1 V2, **misma cuenta PAZO y subscriptions/intent IDs diferentes**, V2 0 registros pagados/0 períodos/0 activaciones. Fallo estructural de UX: `f16_qa_v2_begin_checkout` limita a **un solo intento de por vida por owner**, aunque se abandone, y el V2 original ahora devuelve 404. **Next:** diseñar retry V2 por intentos versionados + conciliación merchant para impedir cobro duplicado/tardío, permitir siguiente intento cuando el anterior sea terminal/inaccesible y sin cargo, consentimiento nuevo y idempotencia. NO resetear SQL ni crear otra suscripción por 404 aislado; desplegar sólo con nuevo gate PO. Edge Sandbox v6 activo, Live OFF, PR #44 DRAFT. Ver handoff.

> **F16 Sandbox 404 confirmado (2026-10-18):** Tras desplegar Edge v6 el PO recibió `paypal_subscription_not_found`; OAuth Sandbox respondió, pero el GET al ID original devolvió 404 con credenciales actuales. Auditado código de creación: original se vincula únicamente después de GET válido del proveedor (ID/plan/custom_id). DB: 1 intento V2 bound desde 2026-10-17, 0 ciclos pagados, 0 pagos registrados, 0 activaciones. **NEXT:** comprobar merchant/app Sandbox original vs actual sin exponer secretos; después implementar recuperación o cierre/supersesión versionada de intento abandonado con conciliación para habilitar compra nueva. No resetear desde 404 solo. PR #44 DRAFT, Edge v6 sin cambios, Live OFF. Ver handoff.

> **F16 PayPal Sandbox v6 (PO autorizó 2026-10-18):** Edge `f16-paypal-supporter-v2-qa` v6 ACTIVE/JWT true, solo dos archivos cambian frente a v5, 14/14 coinciden con GitHub `773bf23`, CI 39126188665 + PG 39126188526 SUCCESS, postflight DB un intento V2 `bound` sin cambios. Diagnóstico privado OAuth/GET con códigos fijos, sin datos secretos ni nuevas suscripciones. **NEXT:** PO hace un único `Retomar en PayPal` en QA local actualizada para identificar rechazo OAuth, 404, 403 o red; no repetir pago ni activar Live. PR #44 DRAFT, sin merge. Ver handoff.

> **F16 PAYPAL SANDBOX READ ERROR 2026-10-18:** el PO reprodujo `resume_approval` 503 a las 12:02:40/44 UTC (lista V2 200); Edge v5 no distingue rechazo OAuth vs GET PayPal 404/403/429. PR #44 DRAFT contiene diagnósticos por etapa solo read-only en `paypalSandboxTransactions.mjs`, `f16-paypal-supporter-v2-qa/index.ts` y panel QA, con tests sintéticos sin logs de datos sensibles. **Backend instalado sigue v5**: despliegue v6 pendiente autorización específica PO. No crear nuevo checkout, tocar Live, SQL ni beneficios. Ver handoff F16 de 2026-10-18.

> **F16 PAYPAL SANDBOX v5 PUBLICADA (2026-10-18, PO sí):** Edge `f16-paypal-supporter-v2-qa` v5 ACTIVE, `verify_jwt=true`; solo cambian 2 archivos de los 14 con diagnóstico `resume_approval` y estados de link separados del estado verificado del proveedor. Postflight 14/14 concuerdan con commit `a8bcbd1`. Agregado DB intacto: 1 intento V2 vinculado, sin evidencia monetaria ni nueva suscripción. CI #39095078505 y PostgreSQL #39095078543 PASS. **Pendiente:** PO probar «Retomar en PayPal» en PAZO local (sin iniciar cobro) para saber categoría real del error. Sin Live, SQL, merge o Vercel. Handoff actualizado.

> **F16 SANDBOX QA V2 DEPLOY 2026-10-18 (PO «sí»):** Supabase Edge `f16-paypal-supporter-v2-qa` v4 ACTIVE con JWT ON; 14/14 archivos verificados vs commit de código `8b3c193`, 12 idénticos a v3 y solo 2 archivos modificados para `resume_approval` owner-scoped por GET del objeto PayPal existente. SQL agregado sigue mostrando 1 intento V2 bound tras deploy; sin compra ni abono por despliegue. **Gate pendiente:** browser autenticado `Consultar PayPal Sandbox` → `Continuar la aprobación en PayPal` (solo APPROVAL_PENDING) y prueba de salida sin completar pago; enlace original puede faltar, en cuyo caso hace falta flujo separado de nueva solicitud segura. Live OFF, PR #44 DRAFT, sin merge. Ver handoff.

> **F16 ABANDONO PAYPAL / REANUDAR APROBACIÓN (PO 2026-10-18):** salir de PayPal sin aprobar/pagar NO es membresía activa. La API crea un objeto `APPROVAL_PENDING` como solicitud técnica, pero `paidThrough/entitlement/beneficios` siguen OFF hasta evidencia monetaria real. PR #44 DRAFT: adaptador GET recupera exclusivamente link `rel=approve` del objeto original, endpoint Sandbox `resume_approval` owner-scoped con plan/custom_id y validación estricta, CTA «Continuar la aprobación en PayPal» en administración cuando el proveedor confirme pendiente; no segundo POST/create ni ruta Live. **Pendiente gate:** CI/PG, autorización PO para despliegue de Edge QA, QA real de abandono/retorno. **Caso sin link, expired/cancelled:** diseñar migración/versionado/conciliación para sustituir de forma segura una solicitud finalizada, nunca borrar registros ni generar segunda suscripción a ciegas. Revisar `docs/PAZO_ACTIVE_HANDOFF.md`.

> **A01 CORRECCIÓN COLA / CÉSPED 2026-10-17 (PO autorizado):** animación errónea desplazaba círculo de pasto al rotar recorte de escena completo. SVG oficial reemplazado por fondo estático `sceneWithoutTail`, cola realmente aislada `onlyTail` en WebP RGBA y cabeza original; pivote de cola en unión anatómica con arco ±1.5°, `prefers-reduced-motion`, sin transformar fondo ni máscaras de escena móvil. Commit sobre PR #44 DRAFT, tests específicos. QA visual browser todavía pendiente. Sin Live/PayPal/DB ni merge. Ver `docs/PAZO_ACTIVE_HANDOFF.md`.

> **A01 2026-10-17 — PO RECHAZÓ PRIMERA EJECUCIÓN VISUAL:** fotografía/código frente al mockup aprobado reveló el perrito SVG improvisado excesivamente simple. Corregido en PR #44 DRAFT usando **el arte original recortado de la referencia aportada por el PO**, sin rasterizar texto/botones, en `public/onboarding/welcome-approved-art.svg`, con máscaras de cabeza, cola y cuerpo que conservan animaciones suaves y reduced-motion. Actualizados componente, escalado móvil, verde, pruebas. CI #39074835702 SUCCESS y PG Lab #39074835678 SUCCESS en commit `f2e252e`; pendiente nuevo screenshot/aceptación PO a 390–430px, sin merge ni Live/PayPal/DB. Ver `docs/PAZO_ACTIVE_HANDOFF.md`.

> **A01 BIENVENIDA ANIMADA (PO GO 2026-10-17):** composición crema/verde ilustrada, texto exacto «Hecho con amor para las mascotas» / «Únete y descubre la mejor app social para mascotas», perrito vectorial con respiración, cola, parpadeo/cabeza y adornos independientemente animados; reducido movimiento detiene todo. Mantiene Comenzar/A02, login, Demo, ES/EN, enlace público al muro y versión. Implementado solo en PR #44 DRAFT; CI #39072898168 SUCCESS (commit `7aafbdc`), PG Lab del último SHA y aceptación visual móvil siguen gate. Sin cambios en seguridad/PayPal/DB y sin merge. Ver handoff.

> **F16 MURO OPCIÓN D APROBADO 2026-10-17:** UI cronológica compartida para bienvenida vacía y roster realmente autorizado/verificado, filtros Todos/Recientes/Más tiempo apoyando; estado vacío ilustrado SVG y adornos con movimiento `pazo-supporter-float` reutilizado de personalización y `prefers-reduced-motion`. No perfiles falsos, no mensajes/fechas inventadas; los hitos 3/6/12 se ordenan con RPC ya instalada. PR #44 DRAFT. CI #39068489897 SUCCESS y PG Lab #39068489877 SUCCESS del commit `054a977`. QA visual PO en localhost pendiente, sin nuevos SQL/PayPal/Live/merge. `docs/PAZO_ACTIVE_HANDOFF.md`.

> **F16 Opción B (PO autorizado 2026-10-17):** pantalla Amigo de PAZO implementada solo en PR #44 DRAFT con insignia decorativa aprobada, encabezado «Pequeñas acciones, grandes historias», cuatro beneficios, US$2.99/mes, aceptación desmarcada, botón amarillo PayPal en Sandbox QA y salida «Ahora no». Reutiliza el checkout V2 autenticado y one-shot; Live checkout OFF. Pendiente CI/PG del HEAD, captura real móvil/desktop y aceptación visual, Sandbox E2E, sin merge. Ver `docs/PAZO_ACTIVE_HANDOFF.md`.

> **F16 UX aprobada 2026-10-17:** Amigo de PAZO tendrá un acceso único en Mi mascota. Sin cobertura pagada verificada: invitación voluntaria; con cobertura verificada: botón decorado y centro de beneficios (fondos, opt-in por mascota, insignias y gestión). Código en PR #44 DRAFT. La invitación automática se mantiene OFF hasta aprobación de señales y cooldown de 30 días persistente. Comprar diseños extra de insignias queda como idea futura. Pendiente QA visual, Sandbox real, sin Live. Ver handoff.

> **F16 PRODUCT UX — 2026-10-17, GO PO «de acuerdo, go».** PR #44 rama `f13/section-titles-20261012`: se separó la página comercial Amigo de PAZO de diagnóstico Sandbox; cuatro beneficios y US$2.99/mes, PAZO gratis, cerrar sin pérdida, gestión y cancelación separadas; el checkout QA conserva copy íntegro/aceptación y backend seguro existente. Producción sigue con compras OFF. Regla pura de elegibilidad definida (7d cuenta, 3 días/14, 5 acciones/2 superficies, 30d cooldown, nunca primera sesión/onboarding/rescate), pero no se activa pitch automático hasta tener señales fiables con revisión de privacidad y retención. Falta CI del HEAD, capturas UI, PO visual, Sandbox E2E; no Live, pagos, Edge, SQL, Vercel ni merge. [Handoff](docs/PAZO_ACTIVE_HANDOFF.md).

> **F16 — PRUEBA REAL SANDBOX V2 HABILITADA EN PAZO LOCAL (2026-10-17).** Edge independiente `f16-paypal-supporter-v2-qa` ACTIVE v2 (JWT, origen Preview QA o Vite localhost:5173), exactamente una cuenta Auth existente autorizada temporalmente, oferta V2 mensual $2.99 ES/EN publicada; historial P06 v1 intacto, sin compra V2 ni período pagado. Merchant GET verifica suscripción/venta/transacción y fecha de servicio, con RPC privada y reversals. Vercel bloqueó Preview nuevo por **402 cuota diaria**; **no cambiar plan**. Lanzar PAZO verdadero con `scripts/f16-run-real-sandbox-qa.ps1`, aprobar personalmente SOLO PayPal Sandbox y verificar beneficios dentro de PAZO. No E2E aprobado sin intervención real del comprador. Live/P42 OFF. [Handoff](docs/PAZO_ACTIVE_HANDOFF.md).

> **F16 — BENEFICIOS REALES DE SANDBOX QA SOLO PARA OWNER AUTORIZADO, INSTALADO 2026-10-17.** A la primera migración staging `20261017160619` se sumó `20261017161221_f16_sandbox_qa_verified_benefits_reads`: RPC públicas de lectura de insignia/fondo/muro, guardar fondo solo de propia mascota y entitlement privado únicamente si owner está explícitamente `enabled`, no expiró y tiene cobro Sandbox QA demostrado. Ejecución previa ROLLBACK PASS y postflight confirma todos los 4 beneficios vacíos (QA owners, periods, holds, temas, muro, badges=0). V2 términos todavía sin publicar, checkout Edge OFF. Próxima dependencia: crear cuenta+mascota descartables y coordinar activación Sandbox verificada — no Live ni P42. El PO aún debe inspeccionar pantallas sobre PAZO real.

> **F16 — Sandbox V2 STAGING HOSTED PASS, NO PAGO (PO GO 2026-10-17).** Migración real Supabase `20261017160619_f16_sandbox_benefits_v2_private_qa_staging` aplicada tras ensayo con ROLLBACK. Nueva oferta de $2.99 mensuales con 4 beneficios ES/EN existe **NO publicada** (2 filas); oferta Sandbox histórica sigue publicada (2), checkout antiguo 1; cero cuentas QA autorizadas/cobros/períodos/holds/fondos. Cuatro nuevas tablas `supporter_private.f16_sandbox_qa_*` RLS FORCE y revocadas. No se desplegó Edge, P42, Vercel ni Live. **Siguiente:** cuenta/mascota descartables seleccionadas de forma explícita, ruta de comprobación PayPal Sandbox real -> períodos QA -> cuatro beneficios y cancelación; solo entonces habilitar checkout QA. La prueba visual real y aceptación PO siguen pendientes. No volver a pedir PayPal Business/Live. [Handoff](docs/PAZO_ACTIVE_HANDOFF.md).

> **F16-P42 — ABSOLUTE EXPIRY HOSTED INSTALADO POR PRODUCT OWNER Y VERIFICADO (2026-10-16).** PO ejecutó una sola vez el SQL de `supabase/drafts/f16_p42_absolute_expiry_PO_SQL_EDITOR_OPERATOR_PENDING_EXECUTION.sql` desde el SQL Editor oficial; consulta Supabase independiente confirma `clock_timestamp() >= v_key_end` y `v_key_end IS NULL` en función P42. Sin claves, P40 0, P21/P42 OFF, ledger/reversos 0, EXECUTE denegado anon/auth/service/PUBLIC. **No reejecutar el parche** ni provisionar claves por este GO. El SQL Editor no añadió entrada `supabase_migrations.schema_migrations`; falta reconciliación documental/operacional del historial, NO repetición del DDL. Issue #45 del control de la herramienta es histórico, no un obstáculo para el patch ya instalado; no se confirmó ningún cambio al control del conector. La custodia 24h, revocación, términos prospectivos, merchant history/reversos y contabilidad siguen NO-GO, PR #44 DRAFT. Handoff: `docs/PAZO_ACTIVE_HANDOFF.md`.

> **F16-P37 — RPC READ-ONLY INSTALADA 2026-10-16.** PO autorizó exclusivamente SQL `public.f16_p37_read_claimed_activation(text,uuid)` bajo claim P21 y binding P40. **Supabase migration `20261016234350_f16_p37_service_only_claimed_activation_read` aplicada SUCCESS**, versionada en GitHub `supabase/migrations/`. Postflight: EXECUTE solo `service_role`, PUBLIC/anon/auth false, P40 RLS forzado, ledger y reversals 0, claves P42 0, P21/P42 OFF. No PayPal GET ni Edge/cron, pago o beneficios. Ver `docs/PAZO_ACTIVE_HANDOFF.md` para evidencia. P42 custodia/ingress, P21 worker y cumplimiento siguen bloqueados; P44 REVIEW_REQUIRED y PR #44 DRAFT. **No repetir la migración.**

> **F16-G1 — COPY PROSPECTIVO ES/EN Y SCOPE DE DISPUTAS (2026-10-16).** Borrador P13 ES/EN actualizado **en rama** con regla PO P05 del primer intervalo `[activation_time, observed_next_billing_time)` condicionado a cargo regular y atribución autenticada. Dos tests añadidos; aún NO publicable, beneficios no implementados. No confundir consentimiento QA publicado sin beneficios con contrato de servicio futuro. El diseño de atribución de disputas P03 y registro de retención P01–P09 **ya existen**: reutilizar. Queda pendiente aprobación legal/contable de plazos P02/P03, seguridad de vendedor/retención backups, cobertura webhook `CUSTOMER.DISPUTE.*`, cancelación online, acuse durable y avisos. `docs/PAZO_F16_P05_RETENTION_DECISION_PACKET_20261015.md` y `docs/PAZO_F16_P13_BILINGUAL_OFFER_AND_RETENTION_REVIEW_20261015.md` son entradas de este gate. P21/P42 OFF, ledger 0, P44 REVIEW_REQUIRED, F16 NO-GO, PR #44 DRAFT. Ningún GO de publicación, captura, desplegar o comprar.

> **F16-P44 → P26 EJECUCIÓN PROSPECTIVA — 2026-10-16.** PAZO conserva venta/evento PayPal Sandbox correlacionados en P44 `REVIEW_REQUIRED`. Supabase contiene **2 ofertas QA ES/EN publicadas y 1 checkout aceptado con hash**, pero esos términos QA **excluyen períodos/beneficios**; no son el contrato de servicio prospectivo P05. El contrato de *evidencia* offline P05 y los puentes P26/P27 **YA EXISTEN**; no duplicar. P22 instalado; P24/P25/P26 hosted ausentes. Webhook no procesa `CUSTOMER.DISPUTE.*`. Siguiente gate: datos autenticados y alcance/retención/compensación de disputas, más términos específicos de servicio y pruebas negativas dirigidas. **No repetir P44 ni comprar otra vez**, no SQL/Edge/worker/ledger/Live por este GO. Inventario y criterios completos: `docs/PAZO_F16_P44_MERCHANT_COVERAGE_REUSE_GATE_20261016.md`. F16 NO-GO, PR #44 DRAFT.

> **F16-P44 — AUDITORÍA DE COBERTURA READ-ONLY (2026-10-16):** sale/evento Sandbox correlacionados en una sola ejecución HTTP 200, pero paginación, historia global, primer ciclo REGULAR, refunds y disputes NO acreditados. Diagnóstico Edge P44 v2 solo leyó transacciones desde 2026-10-16 00:00 UTC hasta su instante de revisión; no repetir ni ampliar por redeploy. Componentes P05/P23/P24/P29/P32 y tests ya existentes: **REUTILIZAR**, no duplicar. Webhook alojado v18 carece de `CUSTOMER.DISPUTE.*`, lo cual exige gate de alcance/retención aparte. Ledger 0; P21/P42 OFF; F16 NO-GO, PR #44 DRAFT. Fuente detallada: `docs/PAZO_F16_P44_MERCHANT_COVERAGE_REUSE_GATE_20261016.md`. Solo revisión documental/offline, no más pagos/GET/compras ni deploy bajo este GO.

> **F16-P43 — ONE-SHOT EPHEMERAL DB READ-ONLY PASS (2026-10-16).** Codex reportó `P43_EPHEMERAL_DB_READ_ONLY_PASS`, `P42_STRUCTURAL_PASS_NO_PROVISIONING_AUTHORITY`, `P43_NO_REAL_KEY_NO_CHECKOUT_NO_PAYMENT`, CLI 2.121.0 y psql 17.11. Lock local intacto, **no repetir**. Este chat verificó de modo read-only 0 signing keys, writer P42/P21 OFF, P40=0, pagos=0, servicio sin EXECUTE P42. Método acceso comprobado, **no sesión permanente**. Siguiente gate requiere ventana `not_before/not_after` aprobada y procedimiento NUEVO de provisión dual privada Edge+DB (GO Sandbox preexistente pero tiempo/canal faltante), otra autorización para nueva credencial efímera. NO generar clave, habilitar worker/checkout, borrar lock ni activar pagos todavía. F16 NO-GO; PR #44 DRAFT; P28 diferido.

> **F16-P43 — GO ONE-SHOT TEMP POSTGRES READ-ONLY (2026-10-16):** PO dijo «sí» para obtener UNA credencial temporal oficial `cli_login_postgres` y ejecutar solo `supabase/queries/f16_p42_provisioning_structural_preflight_READ_ONLY.sql` por psql con TLS verify-full. Script `scripts/f16-p43-ephemeral-readonly-preflight.mjs` con fingerprint SQL, CLI 2.121.0/psql 17.11, strict fail-closed y marcador local único; SOP `docs/PAZO_F16_P43_APPROVED_EPHEMERAL_DB_READONLY_EXECUTION_20261016.md`. **No ejecutado aún** desde este chat/PC. Una falla tras registrar intento requiere nuevo GO; no repetir. No autorización de cambios de password/JIT/DDL, ni provisión de clave P42, writer, worker, checkout o pagos. F16 NO-GO, P28 diferido, PR #44 DRAFT.

> **F16-P43 — METADATA VERCEL PASS, TEMP DB LOGIN PENDIENTE GO (2026-10-16).** Reporte Codex: `pazo-app` y `pazo-app-t83r` METADATA_PARSED, cada proyecto cero nombres DB reconocidos; solo comprueba ese patrón, no inexistencia de conexiones. Herramientas CLI 2.121.0/psql 17.11 listas. Procedimiento `docs/PAZO_F16_P43_VERCEL_METADATA_AND_TEMP_DB_CREDENTIAL_PROPOSAL_20261016.md` actualizado. Próximo gate exige autorización PO exclusiva antes de solicitar credencial temporal `cli_login_postgres` y verificar SQL P42 READ ONLY. Sin rol emitido, sin reset, sin P42 key; gates/P21 OFF, F16 NO-GO.

> **F16-P43 — READY TO AUDIT VERCEL / TEMPORARY POSTGRES GO PENDING (2026-10-16):** según Codex Supabase CLI 2.121.0, psql 17.11, Vercel CLI/team digitalapp autenticados, cuatro flags disponibles; cero cambios hosted. Este chat conserva 403 para Vercel. Nuevo `scripts/f16-p43-vercel-db-env-names-readonly.mjs` con test sintético: consulta local env ls de dos proyectos y solo imprime nombres de posibles conexiones DB y destinos, no valores; fail closed ante formato desconocido. Propuesta de rol temporal `cli_login_postgres` bajo **GO independiente** en `docs/PAZO_F16_P43_VERCEL_METADATA_AND_TEMP_DB_CREDENTIAL_PROPOSAL_20261016.md` y no ejecutar dry-run/SQL antes de autorizar. P42/P21 apagados, P40/ledger 0, F16 NO-GO, P28 diferido.

> **F16-P43 — CODEX TRABAJO LOCAL AUTORIZADO (2026-10-16).** PO pidió delegar instalación de herramientas gratuitas y diagnóstico Vercel a Codex. Orden precisa en `docs/PAZO_F16_P43_CODEX_LOCAL_SETUP_OPERATOR_ORDER_20261016.md`: Node >=20 con CLI `npx ... --help`, `psql` cliente solamente, comprobar Vercel sin valores de variables, login privado del usuario si hace falta, auditar compatibilidad de flags SIN `db dump --dry-run` ni emitir rol temporal. Se requiere resultado local de Codex; no se ejecutó desde este chat. Cero GO para reset DB, JIT/rol temporal, claves reales P42, grants, worker, PayPal ni checkout. F16 NO-GO, P28 diferido, PR #44 DRAFT.

> **F16-P43 — RESULTADO CLI PREREQS (2026-10-16):** Node/npm disponibles, Scoop/psql/Supabase CLI ausentes, Vercel 63.1.2 pero `whoami` NOT_VERIFIED sin diagnóstico, equipo `digitalapp` no auditado. Se actualizó `scripts/f16-p43-next-prereqs-readonly.ps1` para clasificar razones localmente sin stdout secreto y detectar Node >=20 para posible `npx --yes supabase --help` sin Scoop (puede descargar paquete a caché local); ninguna conexión, login, acceso temporal, cambio en DB o password autorizado. Ver `docs/PAZO_F16_P43_VERCEL_NOT_VERIFIED_NODE_NPX_GATE_20261016.md`. P42/P21 apagados, F16 NO-GO, P28 diferido y `not_before/not_after` pendientes.

> **F16-P43 — INVENTARIO LOCAL WINDOWS CONFIRMADO POR OPERADOR (2026-10-16).** Codex reporta `supabase` y `psql` ausentes, Vercel CLI 63.1.2 presente, archivos credenciales privados ausentes. Sin DB ni secretos generados. Preparado `scripts/f16-p43-next-prereqs-readonly.ps1` para estado de Node/Scoop y autenticación Vercel/team via `whoami`/`teams ls`, sin leer variables ni credenciales; instalación de Supabase CLI/psql queda en manos del operador. Ver `docs/PAZO_F16_P43_INVENTORY_RESULT_NEXT_LOCAL_GATE_20261016.md`. Vercel team `digitalapp` por confirmar; CLI temporal podría crear rol y requiere gate; not_before/not_after sin decisión. F16 NO-GO, P42/P21 OFF, P40/ledger 0.

## F16-P43 — INVENTARIO LOCAL CLI / VERCEL SIN SECRETOS (2026-10-16)

- PO indicó «ok go» para continuar **comprobaciones** sin solicitar credenciales temporales ni resetear DB. Vercel connector `list_teams` devolvió **0 teams** accesibles; `digitalapp` permanece sin autorización para leer nombres/destinos de variables. No afirmar que entorno Vercel fue auditado.
- Preparado `scripts/f16-p43-local-tooling-inventory.ps1` para Windows PowerShell 7: imprime estado y versiones de `supabase`, `psql`, `vercel`; para credenciales DPAPI solo indica existencia del archivo, no lo abre. Nunca ejecuta `supabase db dump/link/login`, no obtiene roles temporales ni toca Supabase.
- `docs/PAZO_F16_P43_LOCAL_CLI_VERCEL_ACCESS_REVIEW_20261016.md` da instrucciones para Codex y resultado `P43_TOOLING_INVENTORY_ONLY_NO_DB_AUTH_OR_MUTATION`, no un acceso DB validado. CLI temporal requiere nueva revisión/GO ya que puede emitir credenciales y crear rol; `not_before`/`not_after` continúan sin decisión.
- Sin clave P42, cambios a gates, password, checkout, transacciones ni despliegues. F16 NO-GO, P28 diferido, PR #44 DRAFT.

> **F16-P43 — ANÁLISIS DE IMPACTO DE DB PASSWORD (2026-10-16; RESETEO BLOQUEADO).** PO autorizó evaluar, NO cambiar contraseña. 6 Edge Functions Supabase activas sin patrón de conexión Postgres directa en código inspeccionado; `pg_stat_activity` solo muestra 4 conexiones internas en instantánea. Dos proyectos Vercel detectados, variables bloqueadas por **403**; dependencia externa desconocida. `scripts/backup-database.ps1` ofrece alternativa `$SupabaseCli` de credenciales temporales, sustentada por documentación Supabase, PERO sin ejecución ni validación local y puede crear rol temporal; no asumir GO. Ver `docs/PAZO_F16_P43_POSTGRES_PASSWORD_RESET_IMPACT_20261016.md`. No resetear; completar inventario Vercel, CLI y jobs, más decisión vigencia `not_before/not_after`. P42/P21 OFF; P40/ledger 0; PR #44 DRAFT, F16 NO-GO, P28 diferido.

> **F16-P43 — ACCESO DB LOCAL SOLO LECTURA, CONTRASEÑA PENDIENTE (2026-10-16).** Codex confirmó preflight hosted PASS y Edge Secrets accesible sin P42, pero no dispone de contraseña PostgreSQL ni conexión administrativa local; NO se creó clave. `scripts/f16-p43-db-access-readonly.ps1` usa entrada oculta local, `psql` en proceso hijo con PGPASSWORD temporal, TLS verify-full + CA y SQL structural preflight read-only, sin contraseñas en argumentos/chat/SQL. `docs/PAZO_F16_P43_LOCAL_DB_ACCESS_READ_ONLY_PLAN_20261016.md` registra rutas Direct/Session Pooler; recuperar contraseña existente de custodio, jamás cambiarla unilateralmente. **No hay decisión aprobada de `not_before` exacto ni `not_after`/vigencia de clave**; 120 s solo de token HMAC. P42/P21 apagados, P40/ledger vacíos; P28 diferido; F16 NO-GO.

> **F16-P43 — PROVISIÓN REAL SANDBOX AUTORIZADA PERO NO EJECUTADA (2026-10-16).** PO dijo «sí» para generar y guardar misma clave interna P42 en Edge Secret Store y DB, **ambas inactivas**. Conector Chat de Supabase carece de secrets management, así que no se generó ni guardó clave para evitar secreto DB-solo o exposición. Procedimiento seguro y compensación en `docs/PAZO_F16_P43_SANDBOX_KEY_PROVISIONING_SECURE_HANDOFF_20261016.md`; requiere canal privado para Edge y PostgreSQL parametrizado (preferentemente Work). P42 instalado pero inerte, P40 vacío, worker OFF, ledger 0. No autoriza activar escritor/checkout/beneficios; P28 diferido; F16 NO-GO.

> **F16-P42 — PREFLIGHT CRIPTOGRÁFICO READ-ONLY SUPERADO (2026-10-16).** `supabase/queries/f16_p42_provisioning_structural_preflight_READ_ONLY.sql` detecta drift de RLS/ACL, SQL definer/search_path, gate P42/P21, claves y pagos. Ejecutado en hosted sin escrituras: `P42_STRUCTURAL_PASS_NO_PROVISIONING_AUTHORITY`, CI #38862474610 y PG17 #38862475023 PASS. Claves = 0, P40 = 0, gate P42/P21 OFF y ledger = 0. Provisión real, custodia Edge, rotación, habilitación de RPC, términos/retención y cobros siguen SIN GO; P28 diferido, F16 NO-GO. `docs/PAZO_F16_P42_SECRET_PROVISIONING_OPERATIONS_NO_GO_20261016.md`.

> **F16-P42 — INFRAESTRUCTURA ALOJADA E INERTE INSTALADA (2026-10-16, GO ESPECÍFICO PO).** Migración `20261016062849_f16_p42_keys_and_writer_inert`: tabla de claves 0 filas, gate P42 `enabled=false` sin cutoff, RPC instalada pero EXECUTE revocado a roles cliente y service_role, RLS FORCE en tablas. P40 0, P21 OFF, pagos 0, inbox 8/intents 1 intactos; no secret, no Edge, no buyer. CI/PG17 previos PASS #38861314593/#38861314423 y postflight alojado PASS. Claves reales, grants, activación, retención legal y flujo de cobros quedan bajo nuevos GO. F16 NO-GO, P28 diferido, PR #44 DRAFT. `docs/PAZO_F16_P42_HOSTED_INERT_INSTALL_POSTFLIGHT_20261016.md`.

> **F16-P42 — CANDIDATO HOSTED DESACTIVADO SELLADO / NO INSTALADO (2026-10-16).** SQL de revisión `f16_p42_hosted_keys_and_disabled_writer_REVIEW_ONLY_DO_NOT_APPLY.sql` y adaptador opcional `p42HostedContractRecorder.mjs` usan HMAC `p42|sandbox|...`, tablas claves SIN FILAS y gate OFF, RPC sin EXECUTE para usuarios/service_role. CI general #38860828060 + PG17 #38860828106 PASS (`d9a3815`). Supabase alojado no tiene secreto, gate ni RPC P42; P40 0 registros/worker OFF/ledger 0. GO de preparación aprobado, instalación de claves y escritor NO autorizada; política custodio/rotación y DDL específica pendientes GO separado. `docs/PAZO_F16_P42_HOSTED_DISABLED_KEYS_ROTATION_PROPOSAL_20261016.md`.

> **F16-P42 — INFRAESTRUCTURA ALOJABLE PREPARADA, NO INSTALADA (2026-10-16, PO GO de preparación).** Draft `supabase/drafts/f16_p42_hosted_keys_and_disabled_writer_REVIEW_ONLY_DO_NOT_APPLY.sql`: tabla de claves privadas sin filas, gate P42 deshabilitado, RPC sin EXECUTE para roles de aplicación, RLS FORCE y preflight estricto P40/P21/ledger. Ensayo literal PG17 + CI PASS en commit `3f7a936` (#38860287454 / #38860287370). Política de generación, custodia, rotación y revocación propuesta, pendiente revisión y GO separado para instalación; no secret real, DDL hosted, worker, Edge, PayPal, cobro o entitlement. P40 vacía; P28 histórico diferido; F16 NO-GO. `docs/PAZO_F16_P42_HOSTED_DISABLED_KEYS_ROTATION_PROPOSAL_20261016.md`.

> **F16-P42 — HMAC PARA VÍNCULO DE ACTIVACIÓN (2026-10-16, SOLO PG17).** El writer P39 original confía en una cadena de origen controlable por otros servicios, y **no debe instalarse hosted**. Laboratorio P42 usa token HMAC de evento/suscripción/fecha/nonce TTL 120s, clave privada aislada, corte prospectivo, revocación y P40 inmutable. Pruebas de firma falsa/historial/cruce/TTL/clave revocada sin pagos PASS; versión y secreta sintéticas NO aplicables alojadas. P40 vacía instalada, writer ausente; requiere PO GO específico para secreto alojado/rotación, writer, Edge/worker/PayPal, más retención legal/backups. F16 NO-GO, P28 diferido. `docs/PAZO_F16_P42_CRYPTOGRAPHIC_INGRESS_SECURITY_LAB_20261016.md`.

> **F16-P40 INSTALADA ÚNICAMENTE TABLA PRIVADA VACÍA — 2026-10-15, PO GO específico.** Migración alojada `20261016055145_f16_p40_empty_private_activation_bindings` completada; tabla `supporter_private.paypal_verified_activation_bindings` filas **0**, RLS FORCE, sin grants DML anon/authenticated/service_role, P39 writer AUSENTE, worker OFF, ledger 0, inbox 8/intents 1 intactos. El criterio P41 provisional no autoriza aún ingesta/borrado alojados; necesitan privacidad/legal/backup y GO separados para RPC/Edge/PayPal/worker/ledger. CI sobre esquema en PG17 PASS previo, postflight alojado PASS; no merge y F16 NO-GO. `docs/PAZO_F16_P40_HOSTED_EMPTY_SCHEMA_POSTFLIGHT_20261015.md`.

> **F16-P41 — CRITERIO DE RETENCIÓN APROBADO PROVISIONALMENTE (2026-10-15).** El PO aprobó mantener vínculo privado de activación mientras suscripción activa y **3 años calendario desde cierre contractual confirmado**; extensión motivada para disputa/reembolso/obligación legal pendiente de revisión. No equivale a autorización legal definitiva, DDL hosted ni borrado. Evaluador offline P41 exige fuente merchant de cierre, reconciliación, owner y ausencia de holds; siempre `mayDelete=false`. Ver `docs/PAZO_F16_P40_PRIVATE_BINDING_STORAGE_RETENTION_REVIEW_20261015.md`. P28 diferido; worker/checkout/ledger apagados.

> **F16-P40 — ALMACENAMIENTO DE REFERENCIA DE ACTIVACIÓN (2026-10-15; PO aprueba categoría, NO instalación).** PO aprobó registro privado mínimo evento/suscripción/owner para reconciliación. Borrador `f16_p40_private_activation_storage_hosted_REVIEW_ONLY_DO_NOT_APPLY.sql` con RLS FORCE, FK al inbox, trigger de relación con intent BOUND, tabla inmutable, ningún acceso directo ni writer. CI #38856619514 + PG17 #38856619470 PASS (commit `cbbb982`). Retención, borrado/backup, DDL hosted, writer firmado, Edge, PayPal, worker y ledger pendientes de GO separados; P28 diferido. `docs/PAZO_F16_P40_PRIVATE_BINDING_STORAGE_RETENTION_REVIEW_20261015.md`.

> **F16-P38/P39 — VÍNCULO DE ACTIVACIÓN PROSPECTIVA (LAB ONLY, 2026-10-15).** P38 PG17 prueba vínculo evento↔suscripción↔owner con lease vigente, cutoff, RLS/ACL; P39 conecta opcionalmente webhook firmado→inbox→atribución privada y reintento 503 sin ACK si falta persistencia, desactivado por defecto. Prueba PG17/CI corregida en `5ce9a3a` SUCCESS; ningún componente P39/P38 instalado en Supabase alojado. **PENDIENTE PO:** retención/consentimiento P06, migración específica privada y autorización independiente para Edge y pruebas de pagos nuevas; el SQL no autentica firmas PayPal por sí mismo. P28 diferido y worker OFF. `docs/PAZO_F16_P39_SIGNED_ACTIVATION_INGRESS_GATE_20261015.md`.

 > **F16 — DECISIÓN PO DE PRIORIDAD (2026-10-15):** priorizar cobros prospectivos P06/P21-P27; P28 revisión histórica diferida, NO-GO y deshabilitada. No se autorizaron cobros ni activación del worker, checkout, PayPal, períodos o beneficios. PR #44 DRAFT. Aplicar gates financieros/legales y permisos alojados individualmente.

> **F16-P25 — ÚNICA RESERVA DE REVISIÓN POR OBLIGACIÓN INICIAL (2026-10-15).** Draft PG17 `supabase/drafts/f16_p25_first_obligation_review_reservation_DO_NOT_APPLY.sql`: `p25_first_obligation_reviews` (ordinal 0, UNIQUE venta/evento, RLS FORCE) + RPC service_role con lease P21 y consentimiento P24, en modo obligatorio review_only, sin pagos/períodos/beneficios. El sale ID sigue siendo declarado por un futuro servicio merchant, NO autenticado dentro del SQL: no puede promoverse a pago. Tests synthetic: replay, P06 legacy, stale lease, conflicto cross-owner/sale; PASS commit [5bec073](https://github.com/DigitalAppcorp/pazo-app/commit/5bec073b9a4d5678ee30f7b3102147f7d7fc3b6c) CI/PG/P25. Hosted gate OFF, 8 eventos intactos, ledger 0, P25 **no instalado**. Sig. F16-P26: conector merchant autenticado y reversos/obligación + ledger compensable; aprobación para todo hosted/PayPal new buyer por separado. `docs/PAZO_F16_P25_FIRST_OBLIGATION_REVIEW_RESERVATION_20261015.md`.

> **F16-P24 — CONSENTIMIENTO P06 FENCED + REFUND LINEAGE (2026-10-15).** SQL PG17 `f16_p24_claim_scoped_consent_lineage_DO_NOT_APPLY.sql` propone RPC privada de aceptación P06 solo bajo claim SALE + plan + owner + digest + secuencia cronológica, sin escritura ni importar históricos. Nuevo evaluador `p24RefundLineageLab.mjs` distingue v1 Sale refunds vs v2 Captures, compara eventos firmados y reembolsos múltiples (≤299 centavos y temporalidad) sin dar paidThrough; missing/partial/pending ⇒ REVIEW. Commit [e3bdca5](https://github.com/DigitalAppcorp/pazo-app/commit/e3bdca58cb6a0a43951a593131205a7a9b19e61c) CI/PG/P24 PASS. Hosted sigue gate P21 OFF, cutoff NULL, 8 eventos históricos sin claim, 0 pagos/refunds/ofertas/P06, RPC P24 NO INSTALADA. Nueva etapa: autenticación Merchant Sale GET/reversal, consentimiento publicado conforme a política, período contractual + ledger idempotente. Todo go-live y DDL nuevos con aprobación adicional. `docs/PAZO_F16_P24_CONSENT_REFUND_LINEAGE_GATE_20261015.md`.

> **F16-P23 — BOUNDED TRANSACTION HISTORY Y DISPUTE SNAPSHOT, AÚN REVIEW-ONLY (2026-10-15).** Se añadieron `p23SandboxHistoryWindowReader.mjs` (consultas GET Sandbox de transacciones en segmentos 30d, rechazo ante metadata/paginación/doble ID/venta faltante) y `p23SandboxDisputeSnapshot.mjs` (GET disputa por ID de transacción, vacío NO prueba ausencia futura). Ambos inactivos por defecto, solo mocks offline, datos minimizados, sin activos financieros; commit [731e688](https://github.com/DigitalAppcorp/pazo-app/commit/731e6886410ca812f3370c2f33794f3e4b75ff09) CI+PG SUCCESS. Hosted worker OFF/cutoff NULL, ocho históricos pendientes, ledger/reversos/ofertas/consentimientos=0, P22 no instalado. Próximo: fuente original de aceptación P06, prueba total de ciclos/refunds/disputes y ledger idempotente; GO separado antes de aplicación a Supabase/worker/compras. Ver `docs/PAZO_F16_P23_HISTORY_DISPUTE_SNAPSHOT_GATE_20261015.md`.

> **F16-P22 — SERVER-ONLY REVIEW BRIDGE LISTO EN LABORATORIO (2026-10-15).** `p22PrivateLeaseRpcAdapter.mjs` une RPCs P21 del worker privado y `p22SandboxReviewWorker.mjs` compone lector PayPal Sandbox GET + P05 merchant-correlation + REVIEW/RETRY. `f16_p22_resolve_bound_under_claim` sigue draft PG17, sin instalar hosted: exige lease/cutoff/estado/bound intent. Pruebas Node y PG (CI SUCCESS, F16 Lab SUCCESS, P21/P22 rehearsal SUCCESS) en [21662dd](https://github.com/DigitalAppcorp/pazo-app/commit/21662dd098bd08ee43c0e6c78ce139cdf43a758b). Hosted POSTCHECK READ-ONLY: gate OFF, cutoff NULL, 8 eventos intactos, ledger/refunds/ofertas/consentimientos 0. Nada permite acreditar dinero ni activar beneficios; siguiente gate financiera/legal y eventual GO P22 solo función; P21 gate OFF siempre hasta GO separado. Doc `docs/PAZO_F16_P22_PRIVATE_MERCHANT_REVIEW_BRIDGE_GATE_20261015.md`.

> **F16-P21 HOSTED — WORKER SCHEMA INSTALADO PERO DESACTIVADO (2026-10-15).** PO autorizó explícitamente instalación limitada. Migración REAL `20261015190239_f16_p21_private_inbox_worker_schema_off` aplicada a PAZO Supabase, versionada `supabase/migrations/20261015190239_f16_p21_private_inbox_worker_schema_off.sql`. 1 gate disabled/not_before NULL; tres RPCs service_role exclusivas, RLS FORCE; 8 inbox históricos pending sin claim, 0 pagos/reversos/ofertas/consentimientos. Sin worker programado, PayPal, periodo ni beneficios. Reconciliación P05 y habilitar worker exigen autorizaciones separadas. Detalles `docs/PAZO_F16_P21_HOSTED_SCHEMA_OFF_INSTALL_20261015.md`.

> **F16-P21 — SCHEMA FUTURO DE WORKER SEGURAMENTE APAGADO (2026-10-15).** Implementado `f16_p21_hosted_compatible_inbox_worker_DO_NOT_APPLY.sql` basado en las columnas reales del inbox (solo token adicional + gate disabled + 3 RPC service-only), sin pagados ni beneficios. Tests P21 reconstruyen 8 históricos (intactos con cutoff futuro) + sale nueva que solo puede ir a REVIEW. Commit [d4aeac5](https://github.com/DigitalAppcorp/pazo-app/commit/d4aeac5ff0061071e93c1e7f458a5018c23a3c55) CI/PG/P21 PASS. Hosted aún 8 pending, 0 ofertas/consentimientos/ledger, gate P21 no instalado. Next: GO específico para migración hosted Sandbox OFF, después worker merchant, ledger y período con prueba; oferta P13 y retención pendientes. `docs/PAZO_F16_P21_INBOX_WORKER_HOSTED_COMPATIBLE_GATE_20261015.md`.

> **F16-P19 — REAL CORS VERIFICADO CON ORIGEN CONFIGURADO (2026-10-15).** PO «listo» configuró `PAZO_F16_APP_ORIGIN`. Supabase Edge `f16-paypal-supporter-account` ACTIVE **v5 JWT true**. Rerun job 116595831601 en [GitHub Actions #38783752404](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38783752404): OPTIONS real sin bearer desde preview aprobado temporal retornó **204 `CORS_VERIFIED`**, CI SUCCESS. El bloqueo P18 de 503 quedó resuelto PARA ESE ORIGEN, no otros dominios. **Siguiente gate owner GET autenticado** (real POST `list`) sin compartir tokens; no se ha probado PayPal status/cancel, recibido términos, cobranzas ni períodos. Ninguna mutación DB/PayPal ni manual Vercel; preview automático permitido. `docs/PAZO_F16_P19_CORS_VERIFIED_20261015.md`.

> **F16-P18 FINAL — RECHAZO CORS REAL CAUSADO POR ORIGEN EDGE NO CONFIGURADO (2026-10-15).** GitHub Actions OPTIONS sin JWT => HTTP503; después de Edge v3, respuesta `preflight_503_origin_not_configured`. Se corrigió el orden OPTIONS antes de `shouldRun` y se separaron `list`/`acknowledgement` de modo PayPal (commit `7cb4480` CI/PG PASS). Edge **v4 ACTIVE JWT true**; PHP/PayPal/SQL no cambiados. Snapshot hosted 0 ofertas/consentimientos/pagos, 8 eventos inbox pending. **Acción operativa pendiente:** configurar Supabase Edge Secret `PAZO_F16_APP_ORIGIN` como URL HTTPS exacta, sin slash ni wildcard, luego repetir preflight/owner E2E. No se pueden gestionar secretos con conector disponible. Step temporal de OPTIONS retirado de CI, tests sintéticos conservados. PR #44 DRAFT, previews automáticos okay, sin checkout ni Live. `docs/PAZO_F16_P18_CORS_REAL_SMOKE_20261015.md`.

> **F16-P18 — CORS REAL HTTP 503 + CORRECCIÓN PRE-FLIGHT EDGE v3 (2026-10-15).** Un OPTIONS real sin bearer de GitHub Actions encontró HTTP503; el código intentaba `shouldRun` antes de contestar CORS. `accountOriginGateP18.mjs` reordena, valida origen exacto + headers, sin wildcard ni JWT desactivado. Deployed Sandbox `f16-paypal-supporter-account` v3 `verify_jwt=true`; tests en commit técnico `0f2ef89` CI y PG PASS. Repetir OPTIONS después del despliegue; listo ≠ pago/registro/servicio. Script P17 clasifica 503 con enum seguro, no expone datos. Ver `docs/PAZO_F16_P18_CORS_REAL_SMOKE_20261015.md`. No compra, cancelación, nuevas ofertas, Live o merge.

> **F16-P17 — PREVIEW AUTOMÁTICO PERMITIDO, SIN DESPLIEGUE MANUAL (2026-10-15).** Integrado script de diagnóstico `scripts/f16-p17-account-readonly-preflight.mjs` y test sintético F16 (no red por defecto, solo OPTIONS/list bajo GO y Auth). CORS exact-origin; nunca cancel/checkout. Importado desde ZIP local; preview automático por GitHub **expresamente permitido por PO**, merge/manual/producción siguen NO-GO. Aún falta CORS real/secretos/origen HTTPS estable + titular y prueba E2E. `docs/PAZO_F16_P17_READONLY_DIAGNOSTIC_INTEGRATION_20261015.md`.

> **F16-P16 — CANCELACIÓN ACCESIBLE INCLUSO SI FALLAN MASCOTAS (2026-10-15).** Branch-only en PR #44, enlace Auth `#/account/supporter` antes de pet loading/errors, botón de recuperación en error y descarga aceptaciones sin revocación Blob prematura. Commit técnico [e501b18](https://github.com/DigitalAppcorp/pazo-app/commit/e501b18c6395126c0ad275a2a563600a8641215b) CI + PostgreSQL SUCCESS. Vercel preview Git READY `pazo-app-t83r-gmiex98ov-digitalapp.vercel.app` (sin promoción). Hosted mantiene 0 ofertas/aceptaciones/ledger, 8 inbox QA pending; Edge cuenta v2 JWT true; **falta** verificar HTTPS origin variable, bearer real, CORS y PayPal GET/cancel en sesión sin arriesgar histórico. Documento `docs/PAZO_F16_P16_PET_INDEPENDENT_ACCOUNT_RECOVERY_GATE_20261015.md`. Sin buyer, Live, nuevos pagos, retrobeneficios.

> **F16-P15 — INSTALACIÓN REAL HOSTED APROBADA POR PO (2026-10-15).** Migraciones Supabase `20261015170222` P12, `20261015170258` P14 y `20261015170428` P15 aplicadas de modo transaccional. Edge nueva `f16-paypal-supporter-account` ACTIVE v2 con JWT, owner getUser, Origin HTTPS allowlist; sin checkout. UI gestionar Amigo en menú de mascota (branch PR #44, no desplegada web). Ofertas, nuevos consentimientos, ledger 0; 8 eventos QA intactos. Pendiente verificar env de origen y PayPal Sandbox con sesión autorizada, entregar acuse automáticamente, cerrar legal/retención/finanzas y aprobación separada para ofrecer nueva compra. Documento `docs/PAZO_F16_P15_HOSTED_ACCOUNT_MANAGEMENT_ROLLOUT_20261015.md`. NO público/NO beneficio/NO Live.

> **F16-P14 — CONSENTIMIENTO HISTÓRICO DESCARGABLE + CANCELACIÓN EXISTENTE EN RUTA SERVER-ONLY (2026-10-15).** El código `p14SandboxSupporterAccountHandler.mjs` integra acciones status/cancel P06 y recibo text/plain owner-only vía Auth, rate limit y CORS exact origin. RPC borrador `f16_p14_read_owner_checkout_acknowledgement(uuid,text)` solo `service_role` y PostgreSQL disposable, versión exacta/digest y sin mutaciones; no convierte consentimiento en pago ni acredita periodo. **Commit [5e977ed](https://github.com/DigitalAppcorp/pazo-app/commit/5e977eddc19fb984075555703bd91d81801a56f6) CI general + f16-p12-staged-install + F16 Disposable PG Lab SUCCESS**. Faltan migración real P12+P14 con GO, Edge y botón UI, acuse enviado automáticamente, aprobación legal/copy P13 y ledger financiero. PR #44 DRAFT, cero compras ni beneficios. Documento `docs/PAZO_F16_P14_CANCEL_AND_ACKNOWLEDGEMENT_DOWNLOAD_GATE_20261015.md`.

> **F16-P13 — DRAFT ES/EN Y RETENCIÓN DIFERENCIADA, NO PUBLICABLE (2026-10-15).** Copy propuesto en `src/features/supporter/offerCopyDraftP13.mjs`, con datos USD 2.99/mes, renovación PayPal, cuatro beneficios PO aprobados pero sin funcionamiento pagado, cancelación/acuses pendientes explícitos, revisión jurídica/PO pendiente y flags de publicación/cobro siempre false. CA ARL mínimo condicional 3 años consentimiento o 1 año tras fin mayor, inbox reconciliado PO 90 días sin holds; ledger/solicitudes/disputas sin plazo universal. CI test `f16P13OfferCopyDraft.test.mjs`. Sin SQL alojado, pagos, miembros, merge ni Live. Documento `docs/PAZO_F16_P13_BILINGUAL_OFFER_AND_RETENTION_REVIEW_20261015.md`.

> **F16-P12 VALIDADO (2026-10-15):** commit de código `8d68d6b`: **CI SUCCESS + f16-p12-staged-install SUCCESS + F16 Disposable PostgreSQL Lab SUCCESS**. SQL consolidado con gates y roles instalado/testeado SOLO en PostgreSQL desechable, no en Supabase alojado; migración real/terminología/retención y GOs PO aún pendientes. PAZO gratis, Amigo $2.99 OFF.

> **F16-P12 — CANDIDATO SQL DE INSTALACIÓN STAGING (2026-10-15).** Preparado bajo «ok sigamos», NO aplicado hosted. Bundle atómico P06/P07/P08/P10 `supabase/drafts/f16_p12_staged_install_REQUIRES_PO_GO.sql` con preflight y postflight de roles/RLS/funciones y ninguna oferta/cobro publicado; CI desechable aislada y `scripts/f16-p12-build-staged-install.mjs --verify`. Sin versión de migración Supabase CLI ni GO instalado; falta legal+retención P01-P09, términos ES/EN y autorización de SQL alojado independiente; Edge/PayPal buyer/worker/Live GOs separados. `docs/PAZO_F16_P12_STAGED_SCHEMA_INSTALL_GATE_20261015.md`. PAZO gratis, Amigo opcional 2.99 USD/mes OFF.

> **F16-P11 — AUDITORÍA HOSTED REAL Y SIGUIENTE AUTORIZACIÓN (2026-10-15).** Supabase read-only confirmó 1 intent BOUND, 8 eventos pending, 0 ledger, 0 reversals; P06 ofertas/attempts NO instaladas, P10 bind RPC NO instalado; Edge `f16-paypal-webhook` ACTIVE v13, sin worker. Nuevo SQL read-only de preflight en `supabase/queries/f16_p11_hosted_payment_readiness_READ_ONLY.sql` + test anti-DDL/PII. Siguiente GO NO más simulaciones: texto ES/EN legal aprobado, retención P01–P09 y autorización **específica** de migración P06–P10 Sandbox; después Edge OFF, webhook, buyer E2E y conciliación contractual, Live aparte. Sin escrituras hosted, checkout, membresías ni paidThrough. Documento `docs/PAZO_F16_P11_HOSTED_READINESS_GATE_20261015.md`.

> **F16-P10 — RECOVERED CHECKOUT BIND CON REVISIÓN INDEPENDIENTE, SÓLO LAB (2026-10-15).** PO «ok sigue» permitió código/tests branch-only. P09 `examinePrivate` entrega ID solo internamente tras lista acotada/único status `APPROVAL_PENDING`; P10 exige Auth, claim P07, merchant GET independiente y `verifyIndependentRelease` sin implementación real (fail-closed), antes de RPC P10 privada con owner/requestKey/intent/claim UNIQUE, sin financiación, ledger ni derechos. SQL `DO_NOT_APPLY` solo PG f14_synthetic, NO hosted; tests SQL/Node adversariales. **[Commit `e469bf3`](https://github.com/DigitalAppcorp/pazo-app/commit/e469bf3223c4fdc131348eddbbd89f2c81cd14e4) CI SUCCESS + F16 Disposable PostgreSQL Lab SUCCESS**. Falta revisión humana/fuente autenticada real, cobertura merchant integral, conciliación, términos/retención P01-P09, GO SQL Sandbox, Edge, PayPal buyer, Live. Resuscripción bloqueada. PR #44 DRAFT, PAZO core gratis, Amigo opcional 2.99 USD/mes desactivado. `docs/PAZO_F16_P10_RECOVERED_BINDING_DRAFT_GATE_20261015.md`.

> **F16-P09 — ORPHAN MERCHANT PROBE ACOTADA, SOLO REVIEW (2026-10-15).** GO PO de código/tests offline en PR #44: lector PayPal Sandbox GET plan/time paginado hasta 10/una página, verificación interna custom_id contra intención privada P08 pending con claim P07; salida candidate-review-only sin datos personales/subscription ID. Nueva fecha `providerCreateClaimedAt` en P08 RPC service-only + store. No buscar de manera ilimitada ni declarar ausencia por lista vacía; sin escritura, autopost, bind, beneficios ni paidThrough. **Commit 85a08dec CI general y F16 Disposable PostgreSQL Lab SUCCESS**. Tests extendidos y soporte timestamptz con offset (+00:00) **CI general + PostgreSQL disposable SUCCESS** commit `06d93f8`. Siguiente gate: trazabilidad de resultado merchant y revisión/consentimiento para vinculación atómica posterior, previa aprobación separada; no permitir resuscripción todavía, índice P06 sigue. `docs/PAZO_F16_P09_BOUNDED_ORPHAN_PAYPAL_MERCHANT_PROBE_20261015.md`. PAZO gratis + Amigo 2.99 USD/mes opcional sin checkout público.

> **F16-P08 — RECUPERACIÓN READ-ONLY VERIFICADA, SIN PAYPAL POST (2026-10-15).** Bajo «ok sigue» PO, solo rama PR #44 DRAFT: nueva RPC SQL borrador `f16_p08_read_checkout_recovery` service-only con guard `f14_synthetic`, lector privado en `p06CheckoutConsentStore` y orquestador server-only `p08SandboxReadOnlyCheckoutRecovery`. Solo GET de sub BOUND con Auth owner, compara `plan_id/custom_id` y devuelve categorías públicas sin PII ni IDs financieros. Sub no vinculada después de POST ambiguo => revisión manual, ningún segundo POST; ACTIVE no acredita cobertura. **Commit técnico [409c766f](https://github.com/DigitalAppcorp/pazo-app/commit/409c766f66c27acac4aea90fd7f6267b32df9db4): CI general y F16 Disposable PostgreSQL Lab SUCCESS.** Siguiente: atribución merchant/read-only para missing binding; diseño resuscripción con cierre financiero previo y consentimiento nuevo, sin levantar índice por owner ni GO hosted. Documento `docs/PAZO_F16_P08_READONLY_CHECKOUT_RECOVERY_GATE_20261015.md`. F16 NO-GO, no Edge/PayPal buyer/ledger/pagos reales/beneficios; PAZO gratis, Amigo opcional 2.99 USD/mes.

> **F16-P07 — CREATE CLAIM ONE-SHOT, SOLO BRANCH/LAB (2026-10-15).** PO «ok sigue» autorizó cambios de código y pruebas, NO hosted/PayPal. SQL DRAFT P06 añade `provider_create_claimed_at` y RPC `f16_p07_claim_provider_create` (owner/key/intent, una sola reserva durable), llamada obligatoria en `p06SandboxVerifiedCheckout` antes de PayPal POST. Pérdida de respuesta/segundo caller bloqueados para recuperación manual, nunca nuevo POST automático. Tests Node+PG añadidos; **CI general y PostgreSQL disposable SUCCESS** del commit técnico `c9fcb6b` tras corregir el regex SQL. Documento `docs/PAZO_F16_P07_PROVIDER_CREATE_ONE_SHOT_GATE_20261015.md`. Resuscripción requiere gate posterior explícito; `p06_one_checkout_per_owner` sigue. PR #44 DRAFT, sin DDL alojado, buyer QA, Live, ledger, `paidThrough` ni beneficios; PAZO gratis y Amigo 2.99 USD/mes opcional.

> **F16-P06 — CHECKPOINT RECUPERADO: TÉRMINOS ES/EN INMUTABLES, NO-GO PAGOS (2026-10-15).** PO pidió continuar tras interrupción. GitHub PR #44 rama `f13/section-titles-20261012`; HEAD original `cb04958c` había implementado trigger de prohibición UPDATE/DELETE tras publicación, CI+PG PASS. Se completó SQL DRAFT `supabase/drafts/f16_p06_durable_checkout_consent_DO_NOT_APPLY.sql`: exponer/aceptar oferta solamente si versión ES+EN publicada y plan/precio mensual consistentes. Nuevas pruebas `supabase/tests/supporter/p06-durable-checkout-consent-synthetic.sql` rechazan checkout monolingüe y mutaciones/borrado de texto publicado; **CI y Disposable PostgreSQL Lab SUCCESS** commit [`534b3368`](https://github.com/DigitalAppcorp/pazo-app/commit/534b33681ffab6bf59dee468c50ee45484a6fc20). Estado/documentación `docs/PAZO_F16_P06_BILINGUAL_IMMUTABLE_OFFER_GATE_20261015.md`. Las funciones checkout/cancelación y primeros períodos están sólo en rama/lab y NO acreditan servicio real; no se aplicó SQL hosted ni se creó buyer. **SIGUIENTE** texto contractual/retención aprobado, GOs separados de instalación Sandbox, Edge, E2E buyer autorizado, conciliación/ciclo y Live; no habilitar `paidThrough`/entitlements hasta prueba financiera verificada. Núcleo PAZO gratis, Amigo opcional 2.99/mes, PR DRAFT, F16 NO-GO.

> **F16-P05 — DEFAULT GRANTS SQL HOSTED: BLOQUEO DE MIGRACIÓN NUEVA (2026-10-15).** PO «ok sigue» autorizó auditoría y código branch-only, NO DDL, despliegue ni captura. Consulta real READ ONLY `supabase/queries/f16_p05_public_grants_preflight_READ_ONLY.sql` ejecutada en Supabase: siete RPC financieras `f16_paypal_*` actuales service-only PASS, seis tablas privadas RLS+FORCE sin SELECT público PASS, drafts P05 no instalados PASS, **configuración de privilegios por defecto de nuevas funciones públicas puede conceder EXECUTE a anon/authenticated → BLOCK_NEW_DDL**. No confundir con exposición de RPC actuales. CI nueva `p05PrivilegedDraftGrantAudit.mjs`+test exige guard disposable y revocaciones atómicas `REVOKE PUBLIC,anon,authenticated` con `GRANT service_role` para los cinco SQL DO_NOT_APPLY; **CI y F16 Disposable PostgreSQL Lab SUCCESS** commit [d39e96f6](https://github.com/DigitalAppcorp/pazo-app/commit/d39e96f65145f43aea6897d83a92bb76b795b841). Documento `docs/PAZO_F16_P05_HOSTED_DEFAULT_GRANTS_PREFLIGHT_20261015.md`. **SIGUIENTE GATE:** no nuevos simuladores de firmas como si fueran aprobación. Obtener decisiones reales legal/contable/privacidad P01-P09, fuente de política efectiva/revocación y GO PO separado para migración SQL Sandbox, Edge OFF, configuración PayPal y recepción. Arquitectura de RPC privadas vs exposición REST requiere decisión y verificación de grants luego del próximo cambio de Supabase. Ledger 0, 8 QA intactos, PR #44 DRAFT, F16 NO-GO, PAZO gratis.

> **F16-P05 — VALIDACIÓN CRIPTOGRÁFICA DE PAQUETE DE REVISIÓN, NO GO LEGAL (2026-10-15).** Continuación PO «ok sigue»: módulo offline p05SignedRetentionReviewAudit.mjs y tests verifican cinco firmas Ed25519 separadas, digest conocido externamente, roles, Sandbox, eventos limitados y vigencia; claves generadas solo temporalmente en CI. **CI + Disposable PostgreSQL Lab SUCCESS** commit técnico a8abf554feed1db9f1a99932f27a705060d2e40e. Aunque la prueba de firma pase, auditor SIEMPRE declara revisión-only y desautoriza captura, borrar, ledger, paidThrough o derechos; sin claves reales, firmas auténticas de profesionales, revocaciones, aprobación legal o política efectiva. No está conectado a Edge ni a permiso booleano de captura. Documentado en docs/PAZO_F16_P05_RETENTION_SIGNED_APPROVAL_VERIFICATION_GATE_20261015.md y handoff. **SIGUIENTE** solo con revisión legal/contable/privacidad P01-P09 y PO: definir registro autentificado de política efectiva y revocaciones, y luego GOs separados para migración Sandbox, Edge OFF, webhook PayPal y activación; no existe GO hosted. El 2026-10-30 Supabase cambiará exposición por defecto de nuevos objetos para proyectos existentes; controlar grants explícitos. PR #44 DRAFT, ocho eventos QA sin tocar, ledger 0, PAZO núcleo gratis, F16 pagos NO-GO. Este banner es el estado vigente.

> **F16-P05 — RETENCIÓN AUDITABLE CON POLÍTICA NO APROBADA (2026-10-15).** GO PO «ok go» permitió preparar registro de decisiones y pruebas, **no** autoriza instalación ni revisión jurídica fingida. Nuevo `docs/PAZO_F16_P05_RETENTION_DECISION_REGISTER_20261015.json` documenta P01/P02/P03/P04/P05/P06/P07/P09, scope/hold/finalidad, plazos condicionales CA ARL/CCPA, otros PENDIENTES, ninguna bandera de captación/borrado/beneficio activa. Nuevo `p05RetentionDecisionRegisterAudit.mjs` y tests comprueban fuente JSON, duplicados, alcance de disputas ajenas, falsos GO y retenciones inventadas; salida máxima `REVIEW_PACKET_PREPARED_NOT_APPROVED`, jamás autoriza operaciones. Defensa adicional en branch `core.mjs`: sin prueba independiente, supuesto `outside_pazo` ya NO se ACK 200; se rechaza 503 sin almacenar. Documento `docs/PAZO_F16_P05_RETENTION_DECISION_PACKET_20261015.md`, handoff actualizado. **SIGUIENTE GATE** G1-G3 revisión de aplicabilidad, fiscal/privacidad, backups, hold y reintentos; G4 fuente de aprobación autenticada; G5 GO separados SQL Sandbox, Edge OFF, suscripción PayPal y activación. No se tocó Supabase hosted ni comprador de prueba, 8 eventos QA intactos, ledger 0, F16 NO-GO, PR #44 DRAFT, PAZO gratis.\n\n> **F16-P05 — PRIVACIDAD Y RETENCIÓN POR CLASE, GATE EJECUTABLE NO-GO (2026-10-15).** «ok go» PO autorizó avanzar revisión y tests, NO aceptar nueva recolección ni aplicar cambios hosted. `docs/PAZO_F16_P05_PRIVACY_RETENTION_OPERATIONAL_GATE_20261015.md` clasifica P01 consentimiento, P02 ventas/contabilidad, P03 disputas/reversos, P04 inbox, P05 logs, P06 solicitudes privacidad, P07 backups y P09 acuse/versiones. Mínimos jurídicos condicionados: CA BPC §17602(a)(6) evidencia consentimiento ≥3 años desde aceptación o ≥1 tras contrato, mayor, si aplicable; CCPA 11 CCR §7101 ≥24 meses solo registro solicitudes/respuestas SI sujeto; IRS plazo de registros variable según caso, NO uniformizar ledger. Revisión legal/contable de aplicabilidad/retenciones PENDIENTE; prohibida purga automática o preservación indefinida «por si acaso». **Hardening real en BRANCH no desplegado:** `core.mjs` exige `disputeCaptureApproved=true` + `verifyDisputeRetentionRelease({eventType,environment})===true` de fuente server-only + `assessTrustedDisputeScope==='confirmed_pazo'` después de firma PayPal, antes de inbox; default OFF y callback ausente => 503 sin guardar ni exponer PII. Nuevas pruebas rechazan false/null/excepción. No hay implementación legal/operativa del callback en backend real, tests solo mocks. Next GO: definir y aprobar política por clase, consentimiento verificable y revisión de retención; luego autorizaciones separadas de migración hosted, Edge Sandbox, configuración PayPal y activación. PR #44 DRAFT, ledger vacío, 8 eventos QA intocados, F16 NO-GO, núcleo gratis.

> **F16-P05 — RPC PRIVADA DE LECTURA LEDGER/OWNER, SÓLO LAB (2026-10-15).** Tras «ok sigue», se auditó catálogo real read-only: sale ID PK, intent sub ID UNIQUE, owner/plan/USD299/entry_state y ledger alojado **0 filas**. Nuevo borrador protegido `supabase/drafts/f16_p05_dispute_private_ledger_read_DO_NOT_APPLY.sql` (sólo PG efímero) prepara `f16_p05_draft_read_pazo_payment_by_sale(sale)` y `f16_p05_draft_read_bound_intent_for_sale(sub,expected_owner)`; no da SQL SELECT directo a usuarios, EXECUTE `service_role` solamente, verifica mismo owner/sub/plan BOUND y nunca paidThrough. Nuevo adaptador inactivo `p05ServerOnlyDisputeLedgerReaders.mjs`; `p05OfflineDisputeScopeResolver` ahora exige expected owner, pruebas adversariales. **CI y F16 Disposable PostgreSQL Lab SUCCESS** commit `79ef1e0bdb00ae56190800da113c90634b6db599`. Guía `docs/PAZO_F16_P05_PRIVATE_DISPUTE_LEDGER_READ_GATE_20261015.md`. NO migración/worker instalado, OAuth real, ledger, captura de disputa ni grants; disputeCaptureApproved=false. **SIGUIENTE** revisión legal/retención P01–P04/P09 y GO PO **separado** de instalar SQL y luego conectar worker privado y webhook Sandbox. PR #44 DRAFT, F16 NO-GO, PAZO gratis.

> **F16-P05 — DISPUTAS: SELLER TRANSACTION → LEDGER PRIVADO, LAB PASS (2026-10-15).** GO PO «ok go» permitió continuar solo código y pruebas sin deploy. PayPal Disputes API v1 ofrece `disputed_transactions[].seller_transaction_id`, que ahora permite comprobar mejor PAZO vs comercio ajeno: `p05OfflineDisputeScopeResolver.mjs` hace refetch PayPal evento→dispute ID→seller sale ID y enlaza lectura privada simulada de `paypal_payment_entries.external_payment_id` con owner/sub/plan e intención BOUND. **Ausencia de fila, referencias extranjeras, varias transacciones o incertidumbre = `unknown`**, nunca `outside_pazo` o beneficios. Nuevo `p05SandboxDisputeMerchantReaders.mjs` OAuth Sandbox GET solamente, host fijo, proyección sin PII. CI y F16 Disposable PostgreSQL Lab **SUCCESS** para commit técnico `531062dbc1cd72dca351cc26308efd70b01f7533`. El ledger alojado sigue con **0 entradas**, no puede corroborarse aún una disputa real de PAZO ni inferirse ausencia de disputas; callbacks privados y refetch solo mocks. Detalles `docs/PAZO_F16_P05_DISPUTE_SELLER_TRANSACTION_SCOPE_GATE_20261015.md`. **SIGUIENTE GO:** revisión legal/retención P01–P04/P09 y RPC interna service-only de ledger/intención, luego integración Sandbox real mediante permisos específicos separados. Captura `disputeCaptureApproved=false`, SQL DRAFT DO_NOT_APPLY, PR #44 DRAFT, F16 NO-GO, core PAZO gratis.

> **F16-P05 — DISPUTAS PREPARADAS CON CAPTURA OFF POR DEFECTO (2026-10-15).** Tras «ok go» del PO, cambios SOLO GitHub PR #44 DRAFT: `core.mjs` reconoce `CUSTOMER.DISPUTE.CREATED/UPDATED/RESOLVED` pero `disputeCaptureApproved=false` impide nuevas capturas. Firma PayPal + `assessTrustedDisputeScope({eventId,eventType})` interno obligatorio y sin raw payload/PII; callback real no instalado, resultados no atribuidos retry 503, demostrados ajenos a PAZO no se almacenan. `supabase/drafts/f16_p05_dispute_event_rpc_DO_NOT_APPLY.sql` amplía 3 tipos de RPC sólo en laboratorio PG `f14_synthetic` con rol servicio y no ledger; SQL+tests y **CI/F16 Disposable PostgreSQL Lab SUCCESS** para commit `a3db02cb145634ee8bfdddd5fa4e8b83af9aa028`. Documento `docs/PAZO_F16_P05_DISPUTE_CAPTURE_PRIVACY_AND_ROLLOUT_DRAFT_20261015.md`. Sin aprobación G1 de retención/aislamiento de pagos del comercio, sin resolver GET PayPal + ledger PAZO verificable (hosted 0 entries), NO migración, NO Edge deploy, NO suscripción nuevos webhook, NO beneficios/periodos. Gates operacionales separados explícitos; 8 eventos QA históricos inalterados; F16 NO-GO, PAZO gratis. Este aviso prevalece.

> **F16-P05 — AUDITORÍA HOSTED DEL WEBHOOK: DISPUTAS NO CUBIERTAS (2026-10-15).** Edge `f16-paypal-webhook` ACTIVE v13 actualmente verifica firmas antes de guardar ID/tipo; NO procesa pagos. Hosted READ ONLY: 1 intent BOUND, 8 inbox pending, 0 ledger/reversos, RPCs financieras service-only. **Brecha crítica:** la lista de eventos firmados de `core.mjs` y la RPC de guardado `f16_paypal_record_verified_event` omiten `CUSTOMER.DISPUTE.CREATED/UPDATED/RESOLVED`. Eventos de disputa potenciales no entran al inbox; no se puede declarar historial financiero completo. **Sin modificaciones live:** hardening de módulos offline (disputa→review), y `paypalSandboxWebhookContract` / `f16-paypal-verify-webhooks-readonly.mjs` ahora reportan `financialReconciliationReady=false` si faltan esos tipos en el MISMO listener, con pruebas; no se ejecutó OAuth real. Documento `docs/PAZO_F16_P05_RUNTIME_WEBHOOK_DISPUTE_COVERAGE_AUDIT_20261015.md`. **Próximo GO específico**: retención/aislamiento de disputas merchant PAZO, migración coordinada de allowlists SQL+Edge y suscripción PayPal, RPC worker sólo después, siempre rollback/ingress verificado. PR #44 DRAFT, F16 NO-GO, PAZO core gratis; cero buyers/grants. Este banner prevalece.

> **F16-P05 — MERCHANT GET SANDBOX CON CLAIM VIGENTE, CÓDIGO INACTIVO (2026-10-15).** PO «Ok dale»: nuevo `p05SandboxClaimScopedMerchantReaders.mjs` y pruebas CI `f16P05SandboxClaimScopedMerchantReaders.test.mjs`; PayPal OAuth token POST y GET event/subscription de **host Sandbox fijo**, readClaimedEvent con lease válido antes de cada event GET, y sub GET limitada a `resource.billing_agreement_id` del evento. Sale/plan/custom_id/importe/estado se cotejan, sin datos del pagador ni respuestas sin filtrar. `p05OfflineMerchantClaimBridge` propaga token en ambas llamadas. **CI y F16 Disposable PostgreSQL Lab SUCCESS** commit técnico `3b615c54eb5389146d4cb7ed47bd2b1c525887b0`. **SIN proveedor real, sin Supabase alojado, ledger, grants ni beneficios**: todas las lecturas de pruebas son mocks; el máximo es review/cycle_unproven. Fuente merchant no equivale a firma del webhook ni atribución REGULAR; falta RPC signed-inbox/inverse runtime, cobertura de deuda/retry/refunds/disputas y retención legal. Documento `docs/PAZO_F16_P05_CLAIM_SCOPED_PAYPAL_MERCHANT_READER_GATE_20261015.md`. **PRÓXIMO**: solicitar GO específico para la mínima integración READ-ONLY de Sandbox alojado, sin nuevas compras/replay/Live/worker auto, antes de nuevos laboratorios. PR #44 DRAFT, F16 NO-GO.

> **F16-P05 — LOOKUP INVERSO SUB PAYPAL → INTENCIÓN BOUND CON LEASE, LAB PASS (2026-10-15).** GO PO «ok dale» para preparación offline. Esquema hosted READ-ONLY auditado: `paypal_subscription_intents.external_subscription_id` UNIQUE y owner/plan/bound_at existentes, inbox sólo event ID/tipo. Nuevo `supabase/drafts/f16_p05_claimed_subscription_inverse_lookup_DO_NOT_APPLY.sql` (guard desechable, servicio exclusivo, `search_path=''`, lease/cutoff/tipo event/plan/custom_id/BOUND) y `p05OfflineMerchantClaimBridge.mjs` con mocks GET event/GET subscription/RPC, integrado en `p05OfflineInboxOrchestrator.mjs` pasando claimToken. Seguridad y casos de IDs cruzados, leases vencidos, pending y errores probados: **GitHub CI y F16 Disposable PostgreSQL Lab SUCCESS** commit [0d44f3c0](https://github.com/DigitalAppcorp/pazo-app/commit/0d44f3c03483f25c050c5023b86ee67870f4ca59). Resultado máximo `REVIEW_REQUESTED/cycle_unproven`, sin `processed`, ledger ni paidThrough. SQL **NO atesta PayPal**: un worker servidor deberá autenticar event/refetch y custom_id/sub contra provider, firmar procedencia y cubrir debt/retry/refunds/disputas. Documento `docs/PAZO_F16_P05_INVERSE_CLAIMED_SUBSCRIPTION_GATE_20261015.md`. No SQL hosted, OAuth real, 8 eventos históricos, cobros ni beneficios modificados. PR #44 DRAFT, F16 pagos NO-GO. Próximo gate: procedencia merchant real + retención/consent/cancelación + eventual migración formal sólo con GO separado. Este banner prevalece.

> **F16-P05 — ORQUESTACIÓN INBOX FAIL-CLOSED OFFLINE (2026-10-15).** PO «ok go» habilitó el siguiente laboratorio, NO despliegue ni pagos. Nuevo `p05OfflineInboxOrchestrator.mjs` y tests: `runOnce()` sin parámetros ejecuta claim → verificación de lease/evento → clasificación merchant inyectada → finish sólo `retry|review`. Candidato de venta `SALE.COMPLETED` siempre termina en `review/cycle_unproven`; refunds/disputas en revisión; nunca `processed`, ledger, `paidThrough` o beneficios. Mocks cubren payload malicioso, tokens obsoletos, errores y UTC microsegundos PG. **CI y F16 Disposable PostgreSQL Lab SUCCESS** commit técnico `98e2577c4116a554bbb454b3240af42698c13212`. Documento `docs/PAZO_F16_P05_OFFLINE_INBOX_ORCHESTRATOR_GATE_20261015.md`. **SIGUIENTE GATE REAL:** bridge de identidad merchant event→subscription ID→intención privada BOUND por RPC inversa service-only con claim, y luego procedencia financiera/retención/consent/cancelación; no existe actualmente. El inbox no guarda propietario. Borradores SQL DO_NOT_APPLY, no cambios a Supabase ni PayPal; PR #44 DRAFT, F16 NO-GO. Este banner prevalece sobre históricos.

> **F16-P05 — FINISH/ACK RESTRINGIDO: REINTENTO O REVISIÓN, NO ACREDITACIÓN (2026-10-15).** Tras «ok sigue», se añadió tercera RPC DRAFT `f16_p05_draft_finish_claimed_event(event_id,lease_token,outcome,reason)` solo en `supabase/drafts/f16_p05_inbox_claim_v1_DO_NOT_APPLY.sql` y pruebas PostgreSQL desechables. El token actual debe estar vigente, estado processing y rollout habilitado; reintento pasa a pending con backoff y a la quinta falla cuarentena; review pasa a quarantined, sin exposición de PII. Nunca marca processed ni ledger ni paidThrough; retention_hold se conserva. **CI + F16 Disposable PostgreSQL Lab SUCCESS** commit técnico [c5d83398](https://github.com/DigitalAppcorp/pazo-app/commit/c5d83398b0d8881f0dbbb7fc41b5e9b77f567d3a). Detalles `docs/PAZO_F16_P05_INBOX_FINISH_RETRY_REVIEW_GATE_20261015.md`. **SIGUIENTE:** conectar claim→GET merchant PayPal→correlación de owner/venta→finish(retry|review) por worker sintético; ACK final a processed y beneficios bloqueados hasta fuente financiera, conciliación de reversals, política legal/retención, migración formal y GO específico. No modificaciones hosted ni eventos QA procesados; PR #44 DRAFT, F16 NO-GO, PAZO gratuito. Este banner prevalece sobre avisos históricos.

> **F16-P05 — INBOX PAYPAL CLAIM/READ CON FENCING, SOLO LAB (2026-10-15).** La tabla hosted `supporter_private.paypal_verified_event_inbox` ya tiene `pending/processing/quarantined/processed`, intentos y próxima ejecución, sin subscriptionId/owner. Preparado `supabase/drafts/f16_p05_inbox_claim_v1_DO_NOT_APPLY.sql` con guard contra ejecución fuera de PostgreSQL desechable: gate singleton **apagado**, `not_before` exige rollout prospectivo, claim de evento sin argumentos de usuario `FOR UPDATE SKIP LOCKED`, token UUID rotativo, lease cinco minutos, lectura sólo con token vigente, sin directo SELECT/grants a cliente y sin ACK/beneficios. Tests SQL y **dos sesiones PostgreSQL reales** PASS junto con **CI SUCCESS y F16 Disposable PostgreSQL Lab SUCCESS** commit [32d1edda](https://github.com/DigitalAppcorp/pazo-app/commit/32d1eddadc49eb21b8f842922c9065ff144349e1). Los 8 eventos QA históricos quedan sin reclamar. Documentado en `docs/PAZO_F16_P05_INBOX_CLAIM_FENCING_DRAFT_20261015.md`. **SIGUIENTE:** ACK/finish fenced, registrar/garantizar cobertura de eventos + merchants y refunds/disputes, retención P01–P04/P09, aprobación legal y GO separados para migración formal/hosted. Nada desplegado, PR #44 DRAFT, F16 payments NO-GO, núcleo PAZO gratis. Este banner prevalece sobre anteriores.

> **F16-P05 — LECTOR MERCHANT SANDBOX SERVER-ONLY Y RPC PRIVADA REUSADA (15-OCT-2026).** PO «ok go» aprobó continuar preparación sin deploy ni SQL hosted. Ya existe `public.f16_paypal_read_private_intent` service_role-only; nuevo adaptador `p05ServerOnlyBoundIntentReader.mjs` lo prepara para un futuro worker, sin llamadas reales en este turno. Nuevo `p05SandboxMerchantEvidenceReader.mjs` limita PayPal a OAuth y GET Sandbox (suscripción, ventana de transacciones, eventos por refs del inbox), obedece scope de BOUND intent y elimina PII; no deduce cobertura histórica ni refund/dispute. **CI y F16 Disposable PostgreSQL Lab SUCCESS**, commit `323a269731820aff619a03a91fff119bb0eddca0`. Documentado en `docs/PAZO_F16_P05_SERVER_ONLY_PAYPAL_EVIDENCE_READER_20261015.md`; no conectado a Edge, worker ni usuario. **BLOQUEO actual:** falta RPC interna `claim/read` del inbox verificado, control de eventos faltantes/fallos y política de retención antes del backend real, más términos/cancelación/acuse. Nunca habilitar ledger/paidThrough/beneficios sin prueba de ciclo y nuevo GO específico. PR #44 DRAFT, F16 NO-GO, PAZO núcleo gratis. Este banner prevalece sobre anteriores.

> **F16-P05 — PRIMER CARGO REGULAR, GATE OFFLINE APROBADO POR CI (2026-10-15).** PO «ok go» permitió avanzar comprobación prospectiva sin hosted writes. Para evitar un `cycle_key` que PayPal no proporciona, PAZO propone obligación contractual primera ordinal 0 (términos aceptados), cruzada con una única venta COMPLETED USD2.99 de un historial merchant íntegro `total_items=1/total_pages=1`, plan MONTH/1 sin trial/setup/override, calendario de activación, historial de eventos verificados desde creación sin fallos/retry/deuda ni reversals y revisión financiera. El contador de fallos PayPal puede volver a cero tras cobrar: nunca usarlo solo. Nuevo `p05FirstRegularObligationLab.mjs` y tests adversariales, ambos workflows **CI+F16 Disposable PostgreSQL Lab SUCCESS** commit `914282b3399bfc6962aad19e0d2133fe60bfae20`. Resultado máximo `CLEAN_FIRST_CHARGE_CANDIDATE_ONLY`; `paidThrough:null`, sin escritura/beneficios. Detalles en `docs/PAZO_F16_P05_FIRST_OBLIGATION_ATTRIBUTION_GATE_20261015.md`. Siguen abiertos provenance de eventos en servidor, refund/disputa/fiscal/retención, aceptación/cancelación y GO formal de migración hosted. PR #44 DRAFT, F16 NO-GO. Este banner prevalece sobre anteriores.

> **F16-P05 SOURCE SALE CORRELATION — GATE OFFLINE CI PASS (2026-10-14).** PO «ok go» permitió avanzar la correspondencia `evento PayPal firmado ↔ sale merchant ↔ sub/plan/custom_id ↔ private Auth intent BOUND` sin ejecutar compras, migración hosted o ledger. Nuevo `p05SourceSaleCorrelationLab.mjs` (6 adapters de solo lectura inyectados; ninguno conectado a PayPal/hosted), tests adversariales `f16P05SourceSaleCorrelationLab.test.mjs`; **CI + F16 Disposable PostgreSQL Lab SUCCESS** commit `89c74bceceb6d9f60ebdb5d635464ff7fec4b15e`. Resultado máximo `SALE_CORRELATION_CANDIDATE_ONLY`, no paidThrough, entitlement ni imputación demostrada al primer REGULAR: los campos documentados de PayPal no contienen venta→ciclo de servicio; vencimiento prospectivo contractual PAZO aprobado permanece separado de evidencia financiera. Refetch GET PayPal event ID autentica contenido merchant, no revalida firma original. Ver `docs/PAZO_F16_P05_SOURCE_SALE_CORRELATION_V2_OFFLINE_20261014.md`. **SIGUIENTE:** prueba independiente de primer cargo REGULAR vs deuda/retry + history/reversals, retención/privacidad, términos/cancelación y gate PO específico de SQL formal. PR #44 DRAFT / F16 NO-GO; no writes en Supabase ni PayPal. Este banner prevalece sobre avisos históricos.

> **F16-P05 — SQL PRIVADO DRAFT VERIFICADO, NO APLICAR (2026-10-14).** PO «ok go» aprobó PREPARAR la propuesta versionada, no hacer hosted DDL, ventas, beneficios ni despliegue. `supabase/drafts/f16_p05_private_prospective_evidence_v1_DO_NOT_APPLY.sql` queda **fuera de `supabase/migrations`** y falla fuera de PostgreSQL desechable `f14_synthetic`. Propone evidencia mínima de consentimiento, snapshot de activación/fecha merchant y revisión del primer período — sin estado de beneficio aprobado —, con FORCE RLS, cero grants, FKs, claves únicas y FKs compuestas venta+suscripción/evento+tipo. La CI usa fixture sintética y pruebas SQL de roles, constraints, duplicados y atribuciones cruzadas. **Source attestation sigue abierta:** PayPal sale event/GET deben demostrar contenido y ciclo original regular; la DB sola no prueba cobro↔ciclo. Retención/privacidad P01-P04/P09, borrado, legal ES/EN y nueva migración formal con CLI requieren gates aparte. Ver `docs/PAZO_F16_P05_PRIVATE_SCHEMA_DRAFT_REVIEW_20261014.md`. PR #44 DRAFT; F16 NO-GO. Este aviso prevalece sobre banners anteriores.

> **F16-P05 RETENCIÓN Y ORIGEN — GATE AVANZADO (2026-10-14).** El PO autorizó continuar la preparación, **NO** aplicar SQL ni habilitar pagos. Nueva auditoría de California BPC §17602(a)(6): la verificación de consentimiento para renovación automática aplicable debe conservarse >=3 años o >=1 año tras terminar contrato, lo más largo; no procede deducir que la anulación FTC elimina este mandato estatal. Distinguir plazos financieros por impuestos/disputas todavía sin aprobación de abogado/PO y solicitudes CCPA >=24 meses **solo si aplica CCPA**. Código offline `src/features/supporter/testing/p05CaliforniaConsentRetentionLab.mjs` y tests, CI+F16 Disposable PG Lab PASS en commit `efdf2e84f8412294bc60e8db3007bd6dcb6915ab`: jamás habilita borrado; no DML. Ver `docs/PAZO_F16_P05_RETENTION_AND_PROVIDER_PROVENANCE_GATE_20261014.md` para cadena server-only de prueba de primer cargo: inbox guarda event ID/type, refetch PayPal merchant vincula recurso, se exige distinción primer REGULAR vs deuda y cobertura refunds; no inventar cycleKey. **Siguiente gate:** revisión/aprobación PO y asesoría de retención para ledger, holds, privacidad/borrado y source attestation operativa; después DRAFT de migración versionada sin apply. F16 NO-GO, PR #44 DRAFT, sin buyer/payments/benefits nuevos. Prevalece sobre banners antiguos inferiores.

> **F16-P05 VIGENTE — PRIMER PERÍODO DE SERVICIO APROBADO POR PO (2026-10-14).** Para **nuevas suscripciones**, el primer período contractual de Amigo de PAZO comienza al confirmar activación PayPal y pago regular correspondiente; termina en la próxima facturación PayPal observada y aceptada como límite contractual por PAZO, con condiciones previamente aceptadas. Esto NO convierte `next_billing_time` en prueba PayPal del ciclo pagado; requiere evidencia independiente venta↔obligación, Auth/intent, cancelación/reversals y retención. El caso Sandbox anterior cancelado NO es acreditable retroactivamente, `paidThrough:null` y beneficios desactivados. Regla canónica `docs/PAZO_F16_P05_FIRST_SERVICE_PERIOD_POLICY_APPROVED_20261014.md`; evaluador OFFLINE y tests `src/features/supporter/testing/p05ApprovedFirstPeriodPolicyLab.mjs` y `.test.mjs`. **PENDIENTES:** períodos renovados, retención financiera P01–P04/P09, texto legal ES/EN, confirmación y cancelación online, source attestation merchant y worker/ledger. NO hay GO para hosted SQL, PayPal nuevo/Live, checkout, beneficios, merge ni Vercel; PR #44 DRAFT, F16 NO-GO. Este banner prevalece sobre los históricos inferiores.

> **F16 — AUTH BOUND VERIFIED, PASO SIGUIENTE COMPRADOR SANDBOX (14-oct-2026):** la recuperación autorizada de UNA cuenta QA y UNA intención privada quedó `bound_verified` según operador; verificación independiente Supabase hosted READ-ONLY: **8 Auth, 1 intent BOUND/0 pending, 0 payment entries/reversals, 5 signed events pending**. La asociación owner/plan/sub está completada; aún faltan prueba de aprobación virtual comprador, verificación de webhook+venta merchant/ciclo, ledger/worker/entitlements y PayPal Live. Guard/ejecutor de GitHub `f16ExistingBuyerSandboxGate.mjs` + `scripts/f16-sandbox-existing-buyer-e2e.mjs` + tests, solo para **MISMA** suscripción BOUND. `--preflight` solo GET; `--approve-and-cancel` con GO independiente para una aprobación virtual Personal Sandbox y cancelación inmediatamente después de ACTIVE, no crea suscripciones ni cargos Live; sin GO no se ejecuta. Runbook `docs/PAZO_F16_EXISTING_BOUND_BUYER_SANDBOX_GATE_20261014.md`. Conservar state y claims QA originales; no segundo --run, no SQL ni Edge/migrations, no activar beneficios. F16 EN CURSO, PR #44 DRAFT, beta pagos NO-GO.

> **F16 PRIORIDAD VIGENTE — COMPLETAR PAGOS CON SEGURIDAD, NO REPETIR COMPRA (14-oct-2026):** PO solicita terminar integración de pagos, no saltar a MVP gratis. Realidad: PayPal plan Sandbox $2.99/mes y webhooks firmados funcionan, pero primer Auth-bound E2E dejó 1 Auth QA, 1 intent `pending` y 1 sub `APPROVAL_PENDING`, 0 `bound` y 0 ledger; no comprador aprobado ni meses/beneficios. En GitHub nueva recuperación de UN solo intento `f16ExistingSandboxRecoveryGate.mjs` / `scripts/f16-paypal-recover-existing-bound.mjs`, con revisión read-only de owner Auth creado ese ensayo + plan/sub e intent; modo mutador `--bind-existing` no usado, gate `PAZO_F16_RECOVERY_WRITE_GO` obligatorio y claim local exclusivo. **SE REQUIERE GO PO CONCRETO** para reset de contraseña de cuenta QA y BOUND privado de esa misma intención al mismo I- PayPal Sandbox. Prohibido otra compra sin GO separado, vinculación por UUID sin `getUser(jwt)`, Live, beneficios/worker/migraciones, merge o Vercel. Siguientes gates tras BOUND: aprobación PERSONAL Sandbox virtual y cancelación de la misma sub con pruebas de webhook, cycle_key/ledger y entitlement offline -> hosted autorizado -> Live autorizado aparte. Estado F16 EN CURSO, PR #44 DRAFT, beta pagos NO-GO.

> **F16 — SUBGATE DIAGNÓSTICO PLAN CERRADO, AUTH BOUND E2E NO CERRADO (14-oct-2026):** PO entregó `--diagnose-readonly` definitivo sobre **misma** cuenta/intent/suscripción Sandbox: Auth y owner PASS; intent PENDING, PayPal APPROVAL_PENDING; plan USD2.99 mensual canónico PASS (`plan299MonthlyConsistent:true`, `planTermIssueCodes:[]`), `quantityOneExplicit:true`, `planOverrideExplicitlyFalse:true`, aprobación URL GET Sandbox; `couldCompletePreapprovalChecks:true`, **pero `mayBind:false`, `mayApproveBuyer:false`, `mayCreateSubscription:false`, `mayGrantBenefits:false`, `paidThrough:null`, `networkWrites:0`**. Se confirma fallo anterior del **diagnóstico duplicado**, no causa exacta original del error de ejecución `f16_unexpected_error`. BOUND sigue 0 hosted; la contraseña/ JWT efímeros del usuario descartable no persisten por diseño, por lo que está PROHIBIDO usar su UUID como si fuera sesión Auth genuina. No hacer bind admin retroactivo ni segunda compra sin gate/GO. Estado de única sub sigue APPROVAL_PENDING, y API cancelar solo admite ACTIVE/SUSPENDED. Mantener registro y freeze; no nuevas acciones merchant, worker ni grants. Próxima decisión de producto: recuperación administrativa explícitamente autorizada de **la misma** sub y una sesión Auth verificada, O separar F16 del camino crítico y avanzar MVP social gratuito sin checkout/beneficios. F16 EN CURSO, PR #44 DRAFT, beta NO-GO.

> **F16 — VERIFICACIÓN DEL MISMO PLAN CORREGIDA OFFLINE, NUEVO GET SOLO LECTURA PENDIENTE (2026-10-14):** PO informó `--diagnose-readonly` con coincidencia correcta de Auth, intent pending, subscription ID, custom_id, quantity 1, override false, approvalLink sandbox; único false fue `plan299MonthlyConsistent`, `effective_terms_unknown_or_different`. Preflight remoto previo `paypalPlanReady:true` con plan canonical validó 2.99/mes. Diagnóstico forense anterior comparaba literales de precio y setup fee más estrictamente que el validador canónico; podría tratar `0.0` como distinto de USD0. Sin observar campo crudo, no inventar cuál falló. Nuevo `f16PendingSandboxReadOnlyAssessment.mjs` utiliza `assessPazoSandboxPlan` y muestra enumeraciones saneadas `planTermIssueCodes`; tests con variantes zero y negativos. Próximo paso PO tras CI: pull limpio y **solo --diagnose-readonly** de la suscripción PREEXISTENTE. Todo sigue sin grants, usuario comprador sin aprobar, 1 intent pending y 0 bound/ledger; no repetir compra/cancelación, no borrar estado local, no Live/worker/merge/PR. F16 en curso.

> **F16 — SIN NUEVA COMPRA: DIAGNÓSTICO FORENSE PREAPPROVAL PREPARADO (2026-10-14):** PO autorizó seguir, NO repetir un experimento E2E ya consumido. Supabase READ ONLY: Auth 8, 1 `pending`/0 `bound`, 0 ledger/reversals/consents, 5 inbox signed pending. PayPal GET anterior APPROVAL_PENDING con referencia/plan/custom_id concordantes; POST cancel no admite ese estado. Comando nuevo `scripts/f16-sandbox-auth-bound-e2e.mjs --diagnose-readonly` consulta por **solo lectura** misma cuenta Auth, intent y sub/plan merchant ya existentes; ayuda a separar quantity omitido/override/approval link de discrepancia de owner; no devuelve PII, no habilita `bind`, compra, cancelación, meses ni `paidThrough`. Prueba pura `f16PendingSandboxReadOnlyAssessment.test.mjs` protege fallos y sanitización. Estado hosted intacto; no Auth/PayPal nuevos, no Live, Edge, worker, ledger, migrations, merge, Vercel. Próximo paso PO: actualizar checkout limpio y ejecutar **SOLO --diagnose-readonly** y compartir JSON sanitizado para decidir reparación offline. F16 EN CURSO, PR #44 DRAFT.

> **F16 P05 E2E — PAYPAL PENDING, API CANCEL NO ADMITE ESTADO (14-oct-2026):** operador ejecutó `--status-readonly` tras primer `--run` y dos `cancel_unverified`: GET merchant genuino `subscriptionStatus=APPROVAL_PENDING`, `merchantReadSucceeded=true`, `subscriptionIdMatches=true`, `planMatches=true`, `customIdMatches=true`, `savedPhase=paypal_created`; comprador NO aprobó, sin evidencia de pago/ciclo y 0 grants. Contrato PayPal Subscriptions v1 cancel-422: POST cancel solo ACTIVE/SUSPENDED; `APPROVAL_PENDING` no cancelable por esa API. No intentar pago para conseguir un estado cancelable, no reintentar `--run` o `--cancel-only`, no borrar estado/intent. Fix en `scripts/f16-sandbox-auth-bound-e2e.mjs`: solo POST cancel cuando eligible, nuevo `approval_not_cancellable` y tests. Próximo control GET solo lectura mismo Sandbox a futuro, sin asumir expiración automática. Runbook y handoff verificados; hosted conserva 1 intent pending/0 bound, sin mes acreditado ni ledger. F16 en curso, PR #44 Draft, beta NO-GO.

> **F16 PRIMER AUTH BOUND REAL — STOP POR CANCELACIÓN NO VERIFICADA (2026-10-14):** ejecutor local `--run` una vez: remote preflight PASS, Auth/intent `intent_created`, luego `cancel_unverified` y `BLOCKED:f16_unexpected_error`; `--cancel-only` posterior devolvió `cancel_unverified / manual_check_required`. Supabase READ ONLY: **8 cuentas Auth** (antes 7), **1 intent `pending` no BOUND**, 0 ledger/reversals, 5 eventos firmados inbox `pending` (nuevo `BILLING.SUBSCRIPTION.CREATED`). No se aprobó pago por comprador, no se probó cancelación, tampoco mes/paidThrough. La única autorización de compra ya fue utilizada, NO repetir `--run`, ni SQL correctivo/borrar estado. Añadido operador `--status-readonly` (OAuth/GET mismo I- local, solo status/matches/phase saneados, sin cambios); siguiente paso PO: pull limpio + ejecutar **solo --status-readonly**, revisar si PayPal indica `APPROVAL_PENDING`/`CANCELLED` y decidir cancelación supervisada. Detalles `docs/PAZO_F16_AUTH_BOUND_SANDBOX_E2E_PREAPPROVAL_GATE_20261014.md`, handoff. F16 activo, PR #44 Draft, beta NO-GO; sin beneficios, Live, merge o Vercel.

> **F16 — PREFLIGHT LOCAL TRES CLAVES PASS / REMOTO SOLO LECTURA AÚN PENDIENTE (14-oct-2026):** PO confirma credenciales PayPal Sandbox y Supabase secret configuradas, `previousTestExists:false`, `networkCalls:0`, `writes:0`. **No se creó** usuario, intent ni suscripción de la nueva prueba aún. `scripts/f16-sandbox-auth-bound-e2e.mjs --validate-remote` es nuevo gate de lecturas reales de permisos Auth Admin + RPC `service_role` e identidad de plan existente PayPal $2.99/mes sin setup/tax no aprobado; **sin escrituras**; el `--run` autorizado lo repite antes de reservar el experimento. En PayPal, plan `quantity_supported:false` por defecto requiere no mandar quantity en nuevo POST; GET/BOUND mantiene cantidad 1 y `plan_overridden:false` explícitos, fail closed si faltan. Actualizar checkout limpio con `git pull --ff-only` antes de ejecutar solo `--validate-remote`; **NO ejecutar --run** si lectura falla. GO del PO para UNA prueba Sandbox Auth BOUND/cancelación sigue vigente, no se necesita repetirlo. No Live/entitlements/migraciones/worker/merge/Vercel. F16 EN CURSO y PR #44 DRAFT.

> **F16 — GO DEL PO PARA UNA COMPRA SIMULADA AUTH BOUND + CANCELACIÓN SANDBOX (14-oct-2026):** respuesta explícita **«Si»** para crear **UNA** cuenta Auth descartable de PAZO, **UNA** intención privada con RPC `service_role`, UNA suscripción PayPal **Sandbox** del plan PAZO $2.99 virtuales, vincularla a Auth ANTES de la aprobación, probar comprador Personal Sandbox y cancelarla. **No se ha ejecutado todavía:** las credenciales del comercio + una secret API key de Supabase residen solo en Windows del PO, no disponibles al runtime ChatGPT. Nuevo operador local `scripts/f16-sandbox-auth-bound-e2e.mjs` con `--preflight` cero red/cero writes, `--run` una única ejecución protegida por reserva local e idempotencia y cancelación PayPal, `--cancel-only` recuperación sin crear otra suscripción, `--inspect` lectura merchant/API + DB privada con salida agregada; test `src/features/supporter/testing/f16SandboxBoundOperatorPreflight.test.mjs`, más pruebas de coordinador. Incluye check Auth `getUser`, plan efectivo mensual/no override/quantity 1, PayPal `APPROVAL_PENDING` y `custom_id` exacto antes de BOUND; jamás concede meses, ledger, perks ni `paidThrough`. Ya existen RPCs reales private create/bind restringidas `service_role`, **no se necesita migración nueva para esta prueba**. Secret key siempre ambiente local Node, NUNCA en ChatGPT, Git, browser o capturas. Informe operativo `docs/PAZO_F16_AUTH_BOUND_SANDBOX_E2E_PREAPPROVAL_GATE_20261014.md`, handoff actualizado. Antes del experimento hosted READ ONLY: 7 Auth, 4 eventos PayPal firmados pending y 0 intents/pagos/reversals/consents; no alterar los cuatro eventos históricos. El GO **NO** autoriza PayPal Live, gastos reales, nuevos webhooks/planes, worker/cron/Edge, ledger, entitlements, merge/Vercel ni segunda compra si hay timeout. Próximo paso PO: actualizar checkout local limpio y ejecutar `--preflight` con secreto privado; solo si hay PASS proceder de manera supervisada a `--run`. P05-L y P06-A–E comercial aprobadas, P05 ciclo contractual/paidThrough aún sin evidencia y sin activación. PR #44 DRAFT, F16 EN CURSO, beta NO-GO.

> **F16 — NUEVO GATE Auth BOUND Sandbox E2E PREPARADO, SIN EJECUTAR NI APROBACIÓN DE COMPRA (2026-10-14):** Supabase READ ONLY: 7 cuentas Auth, 4 webhooks PayPal firmados `pending`, 0 intents/ledger/reversals/consents; RPCs `f16_paypal_create_private_intent` y `f16_paypal_bind_private_intent` **sí están hosted** solo `service_role`, mientras que el lector inbox del futuro worker aún **no** está alojado. Nuevo coordinador `supabase/functions/f16-paypal-webhook/f16BoundSandboxIntentCoordinator.mjs` no desplegado: prepara intención `intent-UUIDv4` solamente con Auth `getUser` validado, después exige GET merchant PayPal `APPROVAL_PENDING` más `plan_id/custom_id` exactos antes de BOUND; rechaza una suscripción ya activa/cancelada, owner ajeno, segunda reclamación o RPC inconsistente; no crea PayPal POST ni grants, meses ni `paidThrough`. Tests `src/features/supporter/testing/f16BoundSandboxIntentCoordinator.test.mjs` **CI SUCCESS #38658750299** y **PG17 SUCCESS #38658750302** en SHA `caa130da1cd6a44ac3fd6fbf563fe90c2a580d83`; verificar último HEAD documental. `docs/PAZO_F16_AUTH_BOUND_SANDBOX_E2E_PREAPPROVAL_GATE_20261014.md` presenta recorrido exacto y próximos permisos. **Nuevo GO requerido:** crear UNA cuenta Auth descartable + UNA intención privada/BOUND alojada + UNA nueva suscripción Sandbox con pago virtual USD2.99 y cancelación de prueba; **NO fue autorizado por "ok sigamos"** y nada de ello se hizo. Suscripción anterior CANCELLED solo fue GET merchant: **no reatribuir**. P05-L (pagos tardíos al ciclo original con prueba) y P06-A–E comercialmente aprobadas, pero sin periodo ni beneficio en hosted. Prohibidos checkout/Live, worker/Edge/cron, SQL no aprobado, merges/Vercel hasta GO correspondiente. F16 EN CURSO; PR #44 DRAFT; beta pública NO-GO.

> **F16-P05-L — POLÍTICA DE COBROS ATRASADOS APROBADA POR PO (2026-10-14), IMPLEMENTACIÓN PENDIENTE:** respuesta explícita **«sí»** del Product Owner a la propuesta: imputar pagos atrasados/recuperados al ciclo original que originó la deuda **solo con evidencia independiente comprobable**; jamás crear mes extra por pago tardío; si falta prueba de origen/ciclo, mantener en revisión **sin conceder beneficios**; períodos conforme al calendario contractual merchant corroborado, nunca `completedAt+30 días`. Se confirma aprobación **comercial únicamente**, NO `cycle_key` concreto, ancla exacta/timezone, correlación cobro agrupado, reactivación retroactiva, insignias P07, retención ni autorización para escribir en Supabase, crear compra Sandbox, lanzar Edge/worker/cron, PayPal Live, checkout/entitlements, merge/Vercel. Documento canónico `docs/PAZO_F16_P05_LATE_PAYMENT_POLICY_APPROVED_20261014.md`, matriz y handoff. Test/clasificador offline cambia `recovered_payment_cycle_policy_unapproved` por `recovered_payment_requires_verified_original_cycle`, con **todas** las salidas aún en revisión sin grant, sin `paidThrough`. P06-A–E previamente aprobada comercialmente y no aplicada. La lectura de merchant Sandbox plan+suscripción previa fue PASS limitado (sub CANCELLED, `balanceKnown:false`, `billingPeriodProven:false`); no repetir ni vincular su venta a PAZO Auth. Siguiente gate real: fuente documental/merchant de ciclo y nueva prueba E2E Auth BOUND bajo **GO específico distinto**. F16 EN CURSO, PR #44 DRAFT y beta NO-GO. Esta decisión prevalece sobre cualquier banner histórico que diga que **la política de atraso** no se aprobó; **P05 técnico sí sigue pendiente**.

> **F16-P05 — MERCHANT PAYPAL SANDBOX READ-ONLY E2E PASS (14-oct-2026), GATE DE LECTURA CERRADO:** PO autorizó y ejecutó en Windows `node scripts/f16-paypal-p05-readonly.mjs` sobre suscripción Sandbox existente. JSON sanitizado compartido por operador: `merchantReadSucceeded:true`, plan 2.99 USD/mes verdadero, `subscriptionPlanOverride:false`, quantity 1, `effectiveTermsConsistent:true`, `subscriptionCurrentlyCancelled:true`, `observedFailedPaymentCount:0`, `balanceKnown:false`, sin próximo cobro ni retry. `billingPeriodProven:false`, `cycleAttributionProven:false`, `financialHistoryComplete:false`, `mayGrantEntitlement:false`, `paidThrough:null`. **Saldo desconocido no equivale saldo cero**; no inferir ausencia histórica de fallos ni meses a partir de cancelación. No guardar ID/secretos/PII en GitHub. El asistente no leyó merchant directamente; evidencia aportada por salida local del PO. Informe `docs/PAZO_F16_P05_SANDBOX_READ_ONLY_OPERATOR_GO_20261014.md` y handoff actualizados; no repetir GET ni credenciales, NO más labs sintéticos que no desbloqueen producción. Supabase READ ONLY: 4 signed pending, cero intents/payments/reversals/consents, sin despliegue. **Próximo gate P05:** decisión PO de `cycle_key` original, periodo mensual contractual, pagos tardíos; futura nueva suscripción Sandbox Auth BOUND / pago y escritura requieren GO **diferente y explícito**. P06-A–E comercial aprobado offline, beneficios NO activos, PR #44 Draft, F16 EN CURSO, beta NO-GO, Live/worker/migraciones/merge/Vercel sin autorización.

> **F16-P05 — GO SOLO LECTURA PAYPAL SANDBOX APROBADO (2026-10-14), EJECUCIÓN PENDIENTE:** PO respondió «si» a autorización explícita para consultar **plan y una suscripción existente** de PayPal Sandbox, exclusivamente OAuth token + GET plan + GET subscription. Sin autorización de nuevas compras, alteraciones PayPal, procesar webs, migraciones hosted, worker/Edge/cron, entitlement/Live/checkout/merge/Vercel. Aunque el GO ya está concedido, este runtime no tiene credenciales merchant del Windows ni app PayPal conectada; **NO se ejecutó** el GET real. El inbox Supabase solo guarda referencias firmadas (4 pending) y no incluye ID `I-...`, que se obtiene de business Sandbox subscriptions `https://www.sandbox.paypal.com/billing/subscriptions`. `scripts/f16-paypal-p05-readonly.mjs` ya preparado en GitHub, validado y reforzado: `effectiveTermsConsistent` exige no override y quantity=1 además del plan USD2.99; no falso PASS si condiciones individuales distintas. Pruebas de esta regresión agregadas. Documento de permiso `docs/PAZO_F16_P05_SANDBOX_READ_ONLY_OPERATOR_GO_20261014.md`, handoff actualizado. **Siguiente:** ejecutar en Windows la lectura merchant permitida usando env variables locales, sin compartir secretos/ID; analizar resultado JSON sanitizado. La política P05 de cycle_key y paid periods sigue NO aprobada, P06 comercial aprobada pero sin acciones. PR #44 DRAFT, F16 EN CURSO, beta NO-GO.

> **F16-P05 — GATE PAYPAL REAL PREPARADO SIN EJECUTAR (2026-10-14):** script operador `scripts/f16-paypal-p05-readonly.mjs` agregado para usar reader merchant SANDBOX previamente auditado exclusivamente OAuth2 token + GET plan + GET subscription. Credenciales solo variables privadas locales, ID de suscripción requerido; sin red si faltan, salida JSON mínima sin PII, referencia a PayPal o secretos, sin periodo/entitlement. Nuevas pruebas `src/features/supporter/testing/f16P05ReadOnlyDiagnostic.test.mjs` cubren credenciales ausentes, sanitización y errores. Código técnico `8d54f9304feccd1c8bda3028ca16dfaef7b1f873`: [CI SUCCESS #38653656741](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38653656741), [PG17 SUCCESS #38653656732](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38653656732). Propuesta P05 formal `docs/PAZO_F16_P05_SANDBOX_READ_ONLY_OPERATOR_GO_20261014.md` define único GO nuevo: permiso explícito **solo lectura PayPal merchant Sandbox existente**, sin compra ni registro, que aún NO se ha otorgado ni ejecutado. Pruebas de compra Auth BOUND, cambio hosted, P05 política de atribución, retención financiera son gates separados. P06 comercial aprobado offline; PR #44 Draft, F16 EN CURSO y beta NO-GO. No sumar labs redundantes ni desplegar nada antes del GO.

> **F16-P05 — PLAN EFECTIVO PAYPAL, E2E READINESS (14-oct-2026):** schema API confirma `Subscription.plan_overridden` y ruta `billing_info.last_failed_payment.next_payment_retry_time`. Nuevo `p05PaypalSandboxBillingSnapshotReader.mjs` usa exclusivamente OAuth merchant + GET plan + GET subscription a Sandbox, sin datos del pagador y sin mutaciones; pruebas mock con ruta correcta e integración a analizadores P05. Reforzado `p05BillingEvidenceLab.mjs` para exigir `plan_overridden:false` explícito y cantidad 1, evitando atribuir plan general a una suscripción con condiciones cambiadas o flag ausente; parser retry corregido. SHA técnico `972dffc1a1e615c83aaf790e7d64a29f0a619230`: [CI SUCCESS #38651650941](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38651650941), [PG17 SUCCESS #38651650920](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38651650920); comprobar HEAD documental final. `docs/PAZO_F16_P05_EFFECTIVE_PAYPAL_PLAN_READINESS_GATE_20261014.md` contiene el único siguiente gate: **GO específico nuevo para leer PayPal Sandbox merchant real** y, por separado, **GO de compra E2E Auth BOUND**. No más capas sintéticas por inercia; P05 comercial y retención financiera siguen sin aprobación. P06 comercial aprobado pero sin despliegue. Hosted sin cambios, 4 webhooks pending no asociados. PR #44 DRAFT, F16 EN CURSO y beta NO-GO; no migrar/worker/Edge/cron/checkout/Live/entitlements/merge/Vercel sin GO.

> **F16-P05 — HISTORIAL PAYPAL POR VENTANAS, LAB (2026-10-14):** lector oficial de transacciones de suscripción PayPal requiere `start_time/end_time`; el reader actual protege metadatos de una ventana local <=31 días, no el historial de la vida de la suscripción. `p05TransactionWindowCoverageLab.mjs` valida hasta 24 ventanas de respuestas sintéticas, continuidad exacta sin gaps o solapes, IDs únicos, scope merchant/suscripción y `total_pages/items` completos. Test `f16P05TransactionWindowCoverageLab.test.mjs` incluye casos adversariales para datos ausentes, paginación, PII, duplicados y 48 combinaciones. Aun con `requestedWindowCovered:true`, resultado `globalFinancialCoverage:false`, `canConcludeNoRefunds:false`, `canConcludeNoDisputes:false`, `mayAssignBillingCycle:false`, `mayGrantBenefits:false`, `paidThrough:null`. Informe `docs/PAZO_F16_P05_TRANSACTION_WINDOW_COVERAGE_GATE_20261014.md`, matriz y handoff actualizados. P05 **NO aprobada**: sigue sin ciclo/periodo contractual verificado, sin E2E merchant Auth BOUND, sin retención financiera autorizada. P06-A–E comercial aprobada, sin activación real. PR #44 DRAFT, F16 EN CURSO y beta NO-GO. Verificar CI/PG17 del HEAD documental final. No host SQL, worker/Edge/cron, nuevas compras PayPal, Live, beneficios, merge ni Vercel sin GO explícito.

> **F16-P05 — PREFLIGHT DE ATRIBUCIÓN venta/ciclo OFFLINE PASS (14-oct-2026):** nuevo `p05CycleMappingPreflightLab.mjs` y `f16P05CycleMappingPreflightLab.test.mjs` rechazan venta duplicada en dos meses, dos ventas en mismo ciclo, rangos solapados/anidados, cobros recuperados sin política, importes inesperados y ausencia de evidencia merchant sin asignar `paidThrough` ni beneficios. 120 combinaciones y regresiones en CI [#38649153071 SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38649153071), PG17 [#38649153100 SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38649153100), SHA técnico `639183228759dc1eeb3365df1ac1dfe65f416ba2`; verificar HEAD documental. Informe `docs/PAZO_F16_P05_SALE_CYCLE_MAPPING_PREFLIGHT_GATE_20261014.md`, matriz y handoff. **NO es política P05 aprobada**: quedan cycle_key, periodo real y ancla mensual, cobros atrasados, documentación contractual y E2E PayPal Auth BOUND bajo GO separado; P06-A–E sí está aprobada, sin activación alojada. Retención financiera P01–P04/P09 pendiente. 4 webhooks Sandbox firmados pendientes sin Auth, ningún pago conciliado. PR #44 DRAFT, F16 EN CURSO, beta NO-GO; no SQL host/Edge/worker/cron/PayPal/entitlements/merge/Vercel sin autorización específica.

> **F16-P05 — DEUDA/REINTENTOS Y ATTRIBUTION, LAB PASS (14-oct-2026):** PayPal ([guía actualizada 14-sep-2026](https://developer.paypal.com/subscriptions/payment-failure-retry/)) reintenta pagos fallidos y traslada saldos al siguiente ciclo. Un cobro por USD 2.99 no implica automáticamente un nuevo mes, ni `outstanding_balance=0` prueba historial sin deudas. Nuevo análisis privado puro `p05CycleAttributionRisksLab.mjs` y `f16P05CycleAttributionRisksLab.test.mjs` (72 escenarios), sin llamadas PayPal/DB ni owner/PII en resultado. Nunca crea períodos, entitlements, meses insignia o `paidThrough`: todo NULL/bloqueado. [CI SUCCESS #38648521449](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38648521449) y [PostgreSQL 17 SUCCESS #38648521565](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38648521565) en `64d171296ffdba3ee4608034d48bf17fbf9a5b3f`; verificar HEAD documental final. Documento `docs/PAZO_F16_P05_CYCLE_ATTRIBUTION_RISK_GATE_20261014.md` propone opciones **no aprobadas** de clave de ciclo, atribución de pagos atrasados, deuda combinada y fechas 29/30/31. P06 comercial sí aprobado, **P05 NO**; retención financiera pendiente. No migrar/aplicar cambios alojados/Edge/worker/cron/PayPal/entitlements/merge/Vercel sin GO específico. F16 EN CURSO, PR #44 DRAFT, beta NO-GO.

> **F16-P05 — AUDITORÍA DE PERIODO REAL, OFFLINE PASS (2026-10-14):** nueva función `supabase/functions/f16-paypal-webhook/p05BillingEvidenceLab.mjs` + tests `src/features/supporter/testing/f16P05BillingEvidenceLab.test.mjs`. Fuente oficial PayPal: plan `billing_cycles`, subscription `last_payment`, `next_billing_time` y transacciones; incluso juntos NO garantizan ciclo liquidado de un pago cuando hay saldos atrasados, reintentos, cancelación o múltiples pagos. Función valida Sandbox y propietario Auth BOUND, coincidencia merchant plan USD 2.99/mes, original SALE e historial único; retorna SIEMPRE `coverageReady:false`, `paidThrough:null`, `periodStart/end:null`, `entitlement:false`. [CI técnica SUCCESS #38647436662](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38647436662), [PG17 técnica SUCCESS #38647436453](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38647436453) sobre `cdc884af349dd130d7b7cdd4dc36c1420a76e07d`; verificar HEAD documental final. Informe `docs/PAZO_F16_P05_BILLING_PERIOD_EVIDENCE_GATE_20261014.md` y handoff actualizados. **P05 permanece NO APROBADO**: falta vínculo verificable de venta→ciclo concreto, regla de pagos atrasados y política de intervalos, E2E PayPal Sandbox Auth BOUND y GO independientes. P06-A–E ya aprobada comercialmente pero ejecución real NO autorizada. Retención P01–P04/P09 pendiente. Hosted sin cambios (4 eventos pending, 0 pagos). PR #44 DRAFT, F16 EN CURSO, beta NO-GO, no migración/worker/cron/PayPal/entitlements/merge/Vercel sin GO.

> **F16 — P06 POLÍTICA COMERCIAL APROBADA, OFFLINE (14-oct-2026):** PO aprobó P06-A–E: cancelación detiene renovaciones sin quitar ciclo ya pagado; pagos fallidos/pendientes no extienden beneficios; refund parcial → revisión solo ciclo afectado, **sin prorrateo**; refund total verificado → cobertura afectada solo del ciclo original; disputa no resuelta → bloquear nuevas acreditaciones hasta resolución independiente. Contrato puro/no ejecutor `supabase/functions/f16-paypal-webhook/p06BenefitPolicyLab.mjs` y `src/features/supporter/testing/f16P06BenefitPolicyLab.test.mjs`: 512 combinaciones y casos negativos; **ninguna salida concede o revoca**, todas prohíben billing y mantienen acceso gratis, `paidThrough:null`. Documento aprobado `docs/PAZO_F16_P06_BENEFITS_AND_RETENTION_DECISION_GATE_20261014.md`, matriz y handoff actualizados. **P05 duración y periodos corroborados, P07 insignias, P08 muro, retención P01–P04/P09 siguen NO APROBADOS** en sus dimensiones separadas; ninguna ejecución hosted autorizada. SQL de refund por ID y PG17 siguen en LAB; 4 webhooks Sandbox no vinculados Auth pending, 0 ledger/beneficios. Verificar CI del HEAD final antes de declarar PASS. PR #44 DRAFT, F16 EN CURSO, beta NO-GO, no migrar/PayPal/Edge/worker/cron/Live/entitlements/merge/Vercel sin autorización adicional.

> **F16 — REFUNDS FUERA DE ORDEN Y DECISIÓN P06 (2026-10-14; LAB PASS):** la transacción PayPal puede reportar `REFUNDED` global para la venta completa aunque un evento individual de refund sea de solo 199 centavos. Se corrigió en SQL DRAFT `f16_refund_multievent_ledger_lab_DRAFT_DO_NOT_APPLY.sql`: importe individual inmutable por refund ID, 199+100 reconciliados en cualquier orden, status de venta acumulado tratado como snapshot y dedup tolerante a evolución del status; suma >299 y replays contradictorios bloqueados. Nueva prueba `f16-refund-cumulative-status-out-of-order-synthetic.sql`, concurrencia adaptada y test Node; [CI SUCCESS #38646027179](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38646027179) y [PG17 SUCCESS #38646027092](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38646027092) en SHA `db54f02086cefa6d8967c72ece66519ca680d0d7`. Nuevo informe de decisiones `docs/PAZO_F16_P06_BENEFITS_AND_RETENTION_DECISION_GATE_20261014.md`: **propuestas** sobre cancelación, parciales, totales, disputas, cobertura e insignias NO APROBADAS. Retención de ledger, refunds, intents y bajas NO aprobada; solo regla previa del inbox conciliado 90 días. Supabase hosted READ ONLY: 4 webhooks pending, 0 intents/pagos/reversos/consent, ningún RPC nuevo instalado. **Siguiente:** GO PO de política P05/P06 y retención; después GO separados para migración CLI y pago E2E real. No Edge/worker/cron/Live/checkout/entitlements/merge/Vercel sin GO. F16 EN CURSO, PR #44 DRAFT, beta NO-GO.

> **F16 — ARQUITECTURA MULTIREEMBOLSO APROBADA POR PO; SQL SOLO LAB PG17 (14-oct-2026):** nuevo DRAFT `supabase/queries/f16_refund_multievent_ledger_lab_DRAFT_DO_NOT_APPLY.sql` con eventos privados `refund_id` único, `original_sale_id`, importe 1–299 centavos USD, `f16_lab_refund_sale_holds` acumulado, dedup, refund-before-sale, venta v2 lease-bound y revocación de rutas financieras anteriores **SOLO EN DB DESCARTABLE**. Lectores privados v2 de reversiones y baja Auth incorporan refunds; flujo Node ahora usa GET original con refund_id/centavos, estado de transacción acumulado, RPC refund exacta y sin entitlement. Pruebas SQL, Node y concurrencia incluidos en workflow F16. Primer SQL sintético [PG17 SUCCESS #38643304846](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38643304846) + [CI SUCCESS #38643304922](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38643304922), commit `0619b9f2`. Reader global fail-closed devuelve NULL con refund ajeno no resuelto; test ajustado sin modificar el guard. **Cierre técnico verificado: SHA `6de032f5`, [CI SUCCESS #38644980684](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38644980684) y [PG17 SUCCESS #38644980867](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38644980867); comprobar igualmente HEAD documental final.** Alcance aprobado = arquitectura técnica, **NO** política P06 de cobertura/beneficios, retención, migraciones hosted, nueva compra Sandbox, Live, worker/cron, merge o Vercel. 4 eventos firmados viejos continúan pending sin Auth bound; legacy finance hosted sigue sin lease. F16 EN CURSO, PR #44 DRAFT, beta NO-GO. Informe `docs/PAZO_F16_MULTIEVENT_REFUND_LEDGER_LAB_APPROVED_GATE_20261014.md`.

> **F16 — REFUND PARCIAL/MÚLTIPLE: PROTECCIÓN OFFLINE PASS (2026-10-14):** el ledger actual solo guarda una reversión por `external_payment_id`, por lo que una segunda devolución con otra fecha/tipo entra en conflicto. Cambios de `privateProviderProofFlow.mjs` y `privateLabRpcStores.mjs` evitan que los reembolsos `partially_refunded` lleguen a commit/ACK mientras no exista soporte multievento y política P06. Prueba PostgreSQL `f16-multi-refund-schema-limit-synthetic.sql` reproduce dos eventos (parcial y total) y demuestra que la segunda no se marca procesada; ROLLBACK. [CI PASS #38641407793](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38641407793), [PG17 PASS #38641407912](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38641407912) en commit `b02c24e8`; verificar CI del HEAD final con doble guard. **Limitación:** SQL DRAFT aún permite parcial directo; NO desplegar. Política P06 y diseño ledger por `provider_refund_id` siguen pendientes de decisión PO en `docs/PAZO_F16_MULTI_REFUND_RECONCILIATION_GATE_20261014.md`. Las funciones financieras antiguas alojadas carecen de lease y cuatro webhooks Sandbox reales continúan pendientes. F16 EN CURSO, PR #44 DRAFT; sin GO no migrar/paypal/worker/cron/entitlements/merge.

> **F16 — MATRIZ DE POLÍTICA FINANCIERA Y PROTECCIÓN DE BAJA PASS SOLO LAB (14-oct-2026):** `financialDeletionReview.mjs` y lector privado SQL DRAFT `f16_financial_deletion_exposure_lab_DRAFT_DO_NOT_APPLY.sql`: ningún resultado da permiso de borrar Auth ni de purgar pagos; si hay intents, pagos, reversos o eventos financieros inconclusos se requiere revisión. [CI #38640476149 SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38640476149) y [PG17 #38640476289 SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38640476289) para SHA `d7ff86e2`. Nueva `docs/PAZO_F16_POLICY_RETENTION_COVERAGE_DECISION_MATRIX_20261014.md` enumera P01–P10 **NO aprobadas** para retención de intents/ledger/refunds, baja de cuenta, cobertura/renovación/insignias y futuras pruebas PayPal. Los 90 días aprobados aplican **solo inbox conciliado**. Inventario de datos corregido: 4 webhooks PayPal firmados pending, cero intents/ledger/reversos/consent en Supabase alojado; RPCs DRAFT no instalados; legacy finance sin lease sigue abierta a service_role. PR #44 DRAFT, F16 EN CURSO, no checkout/Live/worker/entitlement/merge/producción. **SIGUIENTE:** decisiones expresas PO y validación externa/jurídica antes de preparar/aplicar migración alojada o repetir compra Sandbox.

> **F16 — ENSAYO DE CUTOVER FINANCIERO PG17 PASS (14-oct-2026):** Nueva consulta `supabase/queries/f16_finance_cutover_preflight_READ_ONLY.sql`; test transaccional `supabase/tests/supporter/f16-finance-cutover-transaction-rehearsal.sql` que recupera permisos antiguos **solo en PG17 descartable**, los revoca atómicamente, deniega legacy a service_role, permite lease-bound y hace ROLLBACK. [CI #38639178499 SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38639178499) y [F16 PG17 #38639178815 SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38639178815) en `18f63b0d`. **NO hosted**: cuatro eventos genuinos pending, cero intents/pagos/reversos, RPC legacy todavía ejecutables por service_role. Siguiente gate = política financiera de retención/borrado, semántica de cobertura y reembolso, validación PayPal/Auth real y GO específico antes de migración Supabase CLI/SQL alojado/Edge/worker/cron/payments/merge. F16 EN CURSO, beta NO-GO, PR #44 DRAFT. Ver `docs/PAZO_F16_ATOMIC_FINANCE_CUTOVER_REHEARSAL_GATE_20261014.md`.

> **F16 — ADAPTADORES PRIVADOS RPC SOLO LAB PASS (2026-10-14):** `privateLabRpcStores.mjs` implementa contratos concretos de claim/release/recovery, owner bound, reversal reader y finanzas lease-bound; SQL DRAFT `f16_private_proof_reads_lab_DRAFT_DO_NOT_APPLY.sql` sólo PostgreSQL descartable. CI #38574613614 y PG17 #38574613732 SUCCESS en `7b50298f`. Supabase hosted read-only: cuatro webhooks reales pending, 0 intents/pagos/reversos/consent; no RPCs LAB instalados. El reader devuelve NULL si hay refunds pendientes o huérfanos. **Siguiente:** auditoría para migración segura y validación PayPal/Auth real, sólo tras GO PO específico; no SQL/Edge/worker/cron, checkout/Live/entitlements, merge ni Vercel. F16 EN CURSO, PR #44 DRAFT. Ver `docs/PAZO_F16_PRIVATE_RPC_ADAPTERS_LAB_GATE_20261014.md`.

> **F16 — PRUEBA INDEPENDIENTE PAYPAL + AUTH OFFLINE PASS (2026-10-14):** los adaptadores privados `paypalSandboxOriginalProof.mjs`, `privateAuthOwnerGuard.mjs` y `privateProviderProofFlow.mjs` verifican SALE, REFUND original, PayPal subscription/history, intención BOUND y Auth Admin de manera fail-closed. La prueba soporta refunds completos/parciales; evento REVERSED no probado de forma independiente permanece BLOCKED. Código solo GitHub con pruebas de mocks, [CI #38570031697 SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38570031697) y [PG17 #38570031920 SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38570031920) para SHA `7a8de60f`. Aún faltan adaptadores concretos DB/worker, PayPal real y política retención; Payments v1 GET está deprecated. Supabase hosted READ ONLY confirma 4 eventos pending y 0 intents/ledger/reversals/consents; no RPCs LAB instaladas. **Siguiente: adapters server-only concretos y QA de recovery sin hosted; prohibido ejecutar migración, worker/cron, checkout, Live, entitlement o merge sin PO gate.** PR #44 DRAFT. Informe `docs/PAZO_F16_INDEPENDENT_PROVIDER_PROOF_LAB_GATE_20261014.md`.

> **F16 GATE FINANCIERO LEASE-BOUND PASS SOLO LAB — 14-oct-2026:** SQL DRAFT de finalización atómica de SALE/REFUND/REVERSAL con token de lease no expirado; se desactiva acceso del service_role a antiguas RPC inseguras **solo en base descartable**. Concurrencia 32 llamadas/4 eventos y dedupe por ID de pago, crash rollback, expired lease, reversal-before-sale y ACL. [PG17 SUCCESS #38566150262](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38566150262) y [CI SUCCESS #38566150248](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38566150248) en commit técnico `f81eb173`. Ninguna venta real conciliada, el worker sigue OFF y las viejas RPC hosted no han cambiado. Próximo gate = fuente PayPal original + vinculación Auth independiente server-only; retención financiera y hosted requieren autorización PO. F16 EN CURSO, PR #44 DRAFT. Ver `docs/PAZO_F16_LEASE_BOUND_ATOMIC_FINANCE_LAB_GATE_20261014.md`.

> **F16 NUEVO GATE 2026-10-14 — CLAIM/LEASE/RECOVERY PASS EN LAB:** GitHub `d3b39806` [PostgreSQL 17 descartable PASS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38563825729) + [CI PASS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38563826529). Nuevo protocolo `f16_inbox_claim_lease_lab_DRAFT_DO_NOT_APPLY.sql`, pruebas SQL y 32 reclamaciones concurrentes; token UUID, SKIP LOCKED, backoff y recuperación; cero escritura financiera. Reader/claim RPC no existen hosted y los 4 eventos reales PayPal continúan pendientes. **SIGUIENTE**: commit financiero + ACK atómicos vinculados a token lease no expirado, con tests de reintentos/caídas, exclusivamente offline. No conectar worker a RPC actual porque ésta no exige lease. Retención y autorización alojada pendientes; PR #44 DRAFT, checkout/PayPal Live/entitlements OFF. Ver `docs/PAZO_F16_INBOX_LEASE_RECOVERY_LAB_GATE_20261014.md`. HEAD posterior al commit base requiere CI propia.

> **ESTADO OPERATIVO F16 ACTUAL — HANDOFF 2026-10-14:** Leer primero `docs/PAZO_ACTIVE_HANDOFF.md` (compacto y canónico). En `95eb6378` **CI #38561691334 PASS** y **PG descartable #38561691223 PASS** para reader RPC 4 campos server-only, tras dos correcciones solo de QA (variables opcionales en Bash `set -u`, luego fixture ledger no vacío). SQL en `supabase/queries/f16_read_verified_inbox_rpc_DRAFT_DO_NOT_APPLY.sql` **NO MIGRACIÓN y NO INSTALADO alojado**; no ejecutar. Supabase READ ONLY confirmado Edge v13, 4 webhooks reales pending, 0 intents/payment/reversal/consents; entitlement false. **Siguiente: claim/lease/retry ACID exclusivamente offline, concurrencia y recuperación**, luego gate específico PO antes de SQL/Edge/worker hosted. PR #44 DRAFT, no checkout/Live/premium. La documentación previa en roadmap es historial y puede contener estados superados. Versión Brain OS v1.4.1; mejora genérica transferible actualizada en repo Brain OS `74f54bc`.

> **F16 READER SERVICE_ROLE-ONLY EN LAB (2026-10-14):** lector SQL de inbox de cuatro campos `f16_read_verified_inbox_rpc_DRAFT_DO_NOT_APPLY.sql` y adaptador `privateInboxReadAdapter.mjs` preparados en GitHub **sin desplegar Supabase**. Tests de permisos/aislamiento PostgreSQL y HTTP mock validan acceso solo service_role, RLS y cero beneficio; CI del commit debe verificarse. Faltan claim/retry ACID, proveniencia original refunds y retención; los 4 webhooks reales permanecen pending. Ver `docs/PAZO_F16_SERVICE_ONLY_INBOX_READ_GATE_20261014.md`.

> **F16 REVERSAL EVIDENCE SOLO LAB (2026-10-14):** nueva evaluación pura para `PAYMENT.SALE.REFUNDED/REVERSED` que exige merchant PayPal independiente, venta original, mismo plan/suscripción y USD 2.99, soporta tombstone anterior al pago, refund parcial sin premiar, datos mínimos. No hay adaptador PayPal live/hosted ni cambios SQL/Edge, ni compra/refund real nuevo; pruebas sintéticas en CI. Ver `docs/PAZO_F16_SANDBOX_REVERSAL_EVIDENCE_GATE_20261014.md`.

> **F16 GO HARDENING INBOX / REVERSAL 2026-10-14:** Product Owner indicó «ok go» tras CI PASS en reconciliación. Se preparó `privateInboxDecisionGate.mjs` que exige lectura **servidor** del inbox privado realmente verificado, tipo PayPal exacto, `pending` y `retention_hold`. `sandboxSaleWorker.mjs` ahora depende obligatoriamente de esa comprobación antes de reconciliar o invocar finanzas. CANCELLED/EXPIRED/FAILED nunca acreditan; REFUNDED/REVERSED permanecen pendientes de vinculación independiente al ID de pago original y políticas de reversal. Tests adversariales agregados; **solo GitHub/CI**, sin tocar SQL/Edge hosted, cuatro eventos reales pending, PayPal, checkout, Live, ledger o entitlements. Requerirá gate PO independiente para worker alojado.

> **F16 GATE RECONCILIACIÓN FAIL-CLOSED — SOLO CÓDIGO, NO HOSTED (2026-10-14):** tras 4 webhooks reales firmados PASS, se endurecieron los adaptadores: **sin intención Auth privada BOUND y plan fijo no hay candidato de pago** (el experimento Personal Sandbox anterior carece de ese vínculo); PayPal transactions exige `total_pages` y `total_items` consistentes; IDs de pago duplicados/ambiguos producen cuarentena, no primera coincidencia. Pruebas sintéticas añadidas para intent pendiente, plan incorrecto, metadata incompleta y duplicados. No borrar ni procesar las 4 filas pendientes; ninguna membresía/ledger, checkout, PayPal Live, Edge/SQL hosted, merge o deploy fue habilitado. CI del commit debe verificarse antes de cerrar gate offline. Resto: retención financiera, reconciliación reversos y lifecycle Auth antes del GO financiero.

> **F16 E2E REAL PAYPAL SANDBOX — FIRMA/INBOX PASS (2026-10-14 UTC):** PO confirmó suscripción Personal Sandbox aprobada y cancelada. Supabase hosted READ ONLY confirmó `f16-paypal-webhook` **v13 ACTIVE**, **4 webhooks diferentes** privados y pendientes (`BILLING.SUBSCRIPTION.CREATED`, `ACTIVATED`, `PAYMENT.SALE.COMPLETED`, `CANCELLED`), exactamente **4 HTTP POST 202** reales de v13 registrados en Edge. Ingesta autenticada y durable PASS; 0 intenciones vinculadas, pagos contabilizados, reversiones o wall_consents, sin entitlement. Cuenta `admitted=5` no equivale a 5 eventos. Cancelación del usuario confirmada por PO y webhook, pero estado actual REST PayPal no consultado independientemente. **No repetir la prueba ni webhook PATCH, SQL/Edge.** Próximo gate reconciliación/atribución segura e idempotencia **NO-GO pendiente**; Live, checkout público y membresías OFF. Reporte `docs/PAZO_F16_GENUINE_SANDBOX_WEBHOOK_E2E_PASS_20261014.md`. Esta actualización supersede entradas históricas de «E2E pendiente» inferiores.

> **F16 PAYPAL SANDBOX WEBHOOK PATCH — PASS SEGÚN POSTFLIGHT LOCAL DEL PO (2026-10-14):** la herramienta `-Check ApplyWebhook` devolvió `updated_and_verified/same_webhook_eleven_events_f16_destination` para webhook EXISTENTE `6N7889790V1467139`; preservó 8 tipos, añadió 3 SALE y confirmó URL F16. **NO REPETIR PATCH**; Live/checkout/entitlements OFF. Supabase READ ONLY posterior: Edge v13 ACTIVE, SQL `20261014094349` aplicada, inbox/intents/pagos/reversiones/admissions = 0. Sin entrega auténtica firmada aún. **Próximo gate: evento real de Sandbox desde misma REST app, bajo autorización PO separada; simulador mock de PayPal NO pasa verificación postback**. Ver `docs/PAZO_F16_PAYPAL_WEBHOOK_PATCH_CLOSEOUT_20261014.md`. Esta nota supera instrucciones históricas inferiores que aún dicen «PATCH pendiente» o «ApplyWebhook bloqueado». PR #44 Draft.

> **F16 DESTINO PAYPAL RESUELTO POR PO — DASHBOARD ADMINISTRATIVO, NO RECEPCIÓN (2026-10-14):** el campo Webhook URL del webhook Sandbox existente `6N7889790V1467139` contiene exactamente `https://supabase.com/dashboard/project/mrybvqdebbgcayuvgkkr/functions`. Esa URL es un panel de Supabase, no listener de PayPal. SQL 11 tipos `20261014094349` y Edge Sandbox v13 estaban PASS y se corroboraron nuevamente read-only. ChatGPT actualizó el contrato local para **exigir exactamente ese destino previo + ocho eventos anteriores** antes de permitir un único PATCH hacia F16 con tres eventos SALE añadidos; ante cualquier drift, no muta. Script `-Check ApplyWebhook` habilitado únicamente con confirmación literal `APLICAR`; correr solo tras CI PASS y checkout limpio. No hay PATCH ejecutado aún, ni Live, checkout, pagos, entitlements ni pruebas firmadas auténticas. Gate vigente: PATCH Sandbox controlado por Product Owner, con credenciales solo en su PowerShell.

> **2026-10-14 — MODO DIRECTO CHATGPT RESTAURADO / HANDOFF COMPACTADO:** PO aclaró que la coordinación con Codex fue solo un experimento; **no delegar futuras tareas ni esperar a ese agente**. Toda ingeniería, GitHub y Supabase corresponde a ChatGPT; cuando una acción depende del navegador/computadora, hablar directamente con PO. `docs/PAZO_ACTIVE_HANDOFF.md` ahora es snapshot corto canónico; historial anterior archivado completo en `docs/archive/PAZO_ACTIVE_HANDOFF_HISTORY_THROUGH_20261014.md`. **SQL F16 `20261014094349` y Edge v13 siguen PASS, no repetir.** Callback anterior de webhook PayPal con host distinto, propiedad y dependencias DESCONOCIDAS; login PayPal Developer del PO requerido para inspección read-only. ApplyWebhook conserva latch OFF y no puede tocarse aún. PR #44 Draft. Esta nota supera la delegación experimental mencionada más abajo.

> **F16 CODEX LOCAL PAUSADO — LOGIN PAYPAL SANDBOX (2026-10-14):** Codex verificó fast-forward/checkout limpio en `C:\Users\osori\PAZO-F13-preview`, HEAD local `f492c5951` (evidencia informada; branch remoto puede avanzar). Auditoría del callback del webhook existente `6N7889790V1467139` PAUSADA: sesión PayPal Developer expiró y la app exige login del propietario con biometría/passkey en Chrome. **Categoría, propiedad y dependencia del host previo: DESCONOCIDAS**; no asumir «no». Ninguna visita al callback, scripts, PATCH, test ni Resend realizados. PO completa autenticación local; Codex investiga SOLO read-only y devuelve estado saneado. `ApplyWebhook` sigue fail-closed. SQL Gate A migración `20261014094349` y Edge Gate B v13 PASS y **NO se repiten**; no pagos, checkout, Live ni entitlements habilitados. PR #44 Draft.

> **F16 GATE A+B HOSTED PASS — SQL 11 eventos + EDGE v13 (2026-10-14):** GO expreso PO transmitido por Codex. Migración Supabase `f16_preserve_two_subscription_lifecycle_events` **instalada versión `20261014094349`**; restricción/función 11 tipos, RLS/ACLs intactos, cero inbox/pagos/reversiones/intents/cuota. GitHub renombró migración para coincidir con historial real, sin cambiar SQL. Receptor `f16-paypal-webhook` v13 Sandbox ACTIVE, 8 fuentes exactas del commit probado, latch true, firma PayPal, worker/global gate. HTTP GitHub [#38544817793](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38544817793) SUCCESS GET 405, unsigned POST 400; workflow efímero retirado. **NO PayPal PATCH**: destino actual `different_host`, 8 eventos presentes, 3 SALE faltantes; host externo/dependencias sin auditar. Script local ApplyWebhook aún bloqueado; no Live/checkout/pagos/entitlements ni merge. Ver `docs/PAZO_F16_ELEVEN_EVENT_HOSTED_CLOSEOUT_20261014.md`. Próximo gate: auditoría read-only del destino previo, luego decidir con PO cómo preservar integraciones existentes.

> **F16 11 EVENTOS — GATE DE BACKEND PENDIENTE (2026-10-14):** Diagnóstico del PO confirma 8 tipos PayPal actuales (6 básicos + CREATED y RE-ACTIVATED) y 3 SALE faltantes. Para evitar ACK silencioso de eventos verificados, GitHub ahora prepara receptor/contrato 11 y migración SQL CLI `20261014085430_f16_preserve_two_subscription_lifecycle_events.sql` exclusivamente en rama; test PostgreSQL descartable PASS, nunca aplicado a Supabase. **Edge alojada sigue v12 con 9 tipos**, webhook PayPal sigue `different_host` sin PATCH. `ApplyWebhook` local se bloqueó con `$F16ElevenEventBackendReady=$false`. PO debe autorizar por separado nueva migración SQL y despliegue Edge actualizado antes de retirar bloqueo y efectuar el PATCH previamente aprobado. Otro host previo podría tener dependencias; confirmar antes de redirección. 0 checkout, Live, cargos ni entitlements. Ver `docs/PAZO_F16_ELEVEN_EVENT_BACKEND_GATE_20261014.md`; PR #44 DRAFT.

> **F16 WEBHOOK ACTUAL 8 EVENTOS — CATALOGO PAYPAL EN LECTURA (2026-10-14):** el PO verificó seis eventos de suscripción correctos, dos extras sin identificar, tres SALE faltantes y URL wrong host; no se emitió PATCH. El nuevo `-Check Resources` consulta `GET /v1/notifications/webhooks-event-types` opcional y ofrece únicamente nombres de extras confirmados en catálogo, sin datos arbitrarios. Suite sintética PASS; antes de modificar webhook, identificar función de los dos extras y evitar pérdida/ACK silencioso. `ApplyWebhook` detenido; pedir PO únicamente repetir Resources tras actualizar código. PayPal Live/checkout/entitlements no autorizados.

> **F16 PAYPAL PATCH BLOQUEADO EN PREFLIGHT — SIN MUTACIÓN (2026-10-14):** salida Windows del PO: `resource_preflight/webhook_events_unexpected/outcome=no_mutation_attempted`. Ningún PATCH llegó a intentarse; la advertencia antigua era genérica. El contrato esperaba exactamente seis eventos subscription y no conocemos todavía si hay extras o si falta uno. GitHub preparó salida de diagnóstico de solo lectura `-Check Resources` (conteos y tipos conocidos; no URL ni valores arbitrarios), corrigió la advertencia en PowerShell y añadió tests. **Prohibido repetir `ApplyWebhook`** antes de recibir JSON saneado de Resources y decidir qué conservar. PayPal Live, checkout, cobros, entitlements y webhook legacy sin cambios; Edge F16 v12 Sandbox sigue activo; PR #44 DRAFT.

> **F16 WEBHOOK SANDBOX PATCH APROBADO, TODAVÍA NO EJECUTADO (2026-10-14):** Product Owner dijo «sí» a modificar **únicamente** el webhook PayPal existente `6N7889790V1467139` con URL F16 y seis eventos conservados + tres SALE. No hay conexión directa a PayPal ni credenciales accesibles desde ChatGPT; NO se efectuó PATCH. Nueva operación local controlada `scripts/f16-paypal-sandbox-plan.ps1 -Check ApplyWebhook`, con credenciales ocultas, GET plan/webhook, comparación anti-deriva, UN PATCH y GET postflight, pruebas sintéticas y no-retry tras resultado ambiguo. Procedimiento `docs/PAZO_F16_PAYPAL_WEBHOOK_UPDATE_LOCAL_RUNBOOK_20261014.md`. Próximo paso requiere ejecutar en PowerShell y reportar solo salida saneada; NO volver a pedir aprobación del mismo alcance. F16 Edge v12 activa solo Sandbox, evento real/checkout/pago/Live/entitlement NO-GO y PR #44 DRAFT.

> **F16 SANDBOX ACTIVE v12 / HTTP NEGATIVE SMOKE PASS (2026-10-14):** PO autorizó activar exclusivamente `f16-paypal-webhook` Sandbox en Supabase PAZO. GitHub `aac99f4c` cambió latch a true y config enabled=true; deploy v12 con 8 archivos, verificación de firma PayPal postback + límites worker/global + inbox privado. HTTP externo [#38532805881](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38532805881) PASS: GET 405 y POST unsigned `{}` 400; workflow temporal borrado. Postflight financiero 0/0/0/0, cuotas admitidas 0, no entitlements, PayPal legado v35 intacto. **Esto NO es entrega real PayPal.** El webhook Sandbox existente sigue en `different_host` y carece de tres tipos de pago; requiere GO PO separado para editarlo, otro GO para comprador de prueba/reenvíos. PayPal Live, checkout, cargos, membresías y merge siguen NO-GO; Free plan puede sufrir invocaciones abusivas. Los banners anteriores «v11 inerte» quedan superados.

> **F16 RECEPTOR v11 INERTE HOSTED — HTTP 503 REAL PASS (2026-10-14):** PO autorizó exclusivamente actualizar el receptor F16 de Supabase sin activarlo. Se desplegaron 8 fuentes exactamente desde `f13/section-titles-20261012` SHA `4c6324f8`; función `f16-paypal-webhook` v11, latch `F16_SANDBOX_RECEIVER_RELEASE_APPROVED=false`, `verify_jwt=false`. Smoke real externo [GitHub #38531593132](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38531593132) PASS: GET y POST respondieron HTTP 503 `f16_receiver_not_released`. Workflow de verificación efímero retirado. SQL global instalado, 0 admisiones; 4 tablas financieras vacías y 0 entitlements. PayPal webhook destino/eventos SIN CORREGIR, legado `paypal-webhook` v35 intocable; PayPal Live/checkout/entitlement NO-GO. Próximo GO separado para activar solamente Sandbox y otro para editar webhook existente. PR #44 DRAFT, beta NO-GO. Estados históricos v10 quedan superados.

> **F16 PAYPAL SANDBOX — RETRY/RECOVERY AUDITADO (2026-10-14):** documentación oficial PayPal confirma hasta 25 reintentos en 3 días ante HTTP no-2xx y reenvío manual posible tras agotar intentos. Contrato F16 de rama revisado: quota/verificador/inbox no disponible→503 sin ACK; evento autenticado recién guardado→202; duplicado autenticado→200; firma inválida→401. Añadidos `docs/PAZO_F16_SANDBOX_REDELIVERY_RECOVERY_GATE_20261014.md` y `supabase/queries/f16_webhook_delivery_recovery_preview_READ_ONLY.sql`. Preflight READ ONLY en Supabase: 0 eventos, 0 pendientes/cuaren­tena, 0 pagos/reversos, presupuesto F16 utilizado 0. Prueba automatizada nueva bloqueada por seguridad del host: **NO declarar nuevo test PASS**. NO se desplegó nueva Edge ni se modificó PayPal, Live, checkout o entitlement. Siguen NO-GO la entrega autentica/recuperación 503 y el cambio del webhook. PR #44 DRAFT.

> **F16 — SQL GLOBAL HOSTED PASS (2026-10-14):** PO autorizó exclusivamente SQL; Supabase aplicó migración `20261014073658_f16_global_webhook_admission` (mismo SQL del archivo originalmente `20261014070015`, ahora renombrado en GitHub para coincidir con historial real). Tabla de cuotas privada RLS forzada, RPC restringida a service_role, 4 tablas financieras 0 filas, sin entitlements; Edge F16 v10 INERTE, PayPal/webhook/checkout sin cambios. El presupuesto no protege contra invocaciones externas ni garantiza entrega PayPal. Se exige otro GO para activar recepción Sandbox y otro para modificar webhook. PR #44 DRAFT, beta NO-GO. Las notas históricas inferiores «sin aplicar» están superadas.

> **F16 SQL GLOBAL CLI VERSIONADA, NO APLICADA (2026-10-14):** migración `20261014073658_f16_global_webhook_admission.sql` generada por Supabase CLI 2.120.0 en GitHub Actions aislado; está en PR #44 DRAFT, NO instalada en Supabase. La CI ejecuta ese archivo exacto en PostgreSQL 17 descartable y audita ACL, RLS, 30 verificaciones/minuto, 2,000/día y concurrencia. Preflight alojado READ ONLY confirma tabla/RPC todavía inexistentes y registros financieros cero. No hay autorización para DDL alojado ni activación de Edge/PayPal/entitlements. Control de RPC no limita invocaciones entrantes ni garantiza entrega ante denegación de tráfico. Próximo GO separado = solo instalación controlada de SQL y postflight, manteniendo `f16-paypal-webhook` v10 inerte. Requisitos/rollback en `docs/PAZO_F16_GLOBAL_ADMISSION_SQL_GATE_20261014.md`; no duplicar recursos ni reabrir F13/F14 previamente aprobados.\n\n> **F16 PROTECCIÓN GLOBAL SANDBOX — CÓDIGO Y LABORATORIO, NO DESPLEGADO (2026-10-14):** PO aprobó preparar en GitHub un control compartido y revisión de costos, sin mutaciones remotas. Supabase Free: 500,000 Edge invocaciones/mes compartidas por organización, sin cobros por excedentes; pueden limitar el servicio por Fair Use. `f16_paypal_try_admit_global` se ensaya solo en PostgreSQL 17 descartable, 30 admisiones/minuto y 2,000/día tentativas compartidas entre isolates, mediante RPC `service_role` y tabla privada mínima sin PII; el receptor de rama requiere su adaptador antes del OAuth/PayPal. Negación/error → 503 sin ACK ni membresía. Este control **no bloquea solicitudes antes de invocar Edge** ni garantiza proteger cuota Free, ni corrige entrega/assinatura/reintentos. Se requieren gate separado para migración versionada/aplicación alojada, decidir protección ingress y presupuesto, activar receptor Sandbox y luego modificar webhook PayPal existente. Hosted v10 inerte, sin cambios SQL/PayPal/Live y PR #44 DRAFT. Detalles operativos en handoff y runbook F16.\n\n> **F16 HARDENING ANTIABUSO SOLO EN RAMA (2026-10-14):** autorización PO limitada a código y pruebas GitHub del receptor PayPal Sandbox. `workerAdmissionGate.mjs` acota por isolate a 4 verificaciones simultáneas y 60 intentos/minuto ANTES de OAuth/verificación de firma/DB, rechaza exceso con 503 reintentable y `Retry-After: 5` y libera siempre en `finally`. Nuevos tests adversariales y protección anti-regresión; ningún servicio/costo nuevo, cambio Supabase/PayPal/SQL/checkout/entitlement, ni merge. **Este control no cubre múltiples instancias ni detiene invocaciones entrantes:** queda pendiente control global, límite de gasto, evidencia real Sandbox y autorización específica antes de activar receptor. Webhook existente está en `different_host` y le faltan 3 eventos `PAYMENT.SALE.*`; no modificarlo todavía. Ver `docs/PAZO_ACTIVE_HANDOFF.md` y runbook F16. PR #44 sigue DRAFT, beta NO-GO.\n\n> **F16 PAYPAL SANDBOX — RECURSOS CONFIRMADOS POR PO (2026-10-14):** preflight local de solo lectura `-Check Resources` PASS para acceso al plan existente `P-14V25407JP6850922NLHMDKI` (ACTIVE USD 2.99 MONTH/1) y al webhook existente `6N7889790V1467139` con el mismo par de credenciales ingresado en Windows. **BLOQUEADO PARA ACTIVACIÓN:** `destinationCategory=different_host`, faltan `PAYMENT.SALE.COMPLETED`, `PAYMENT.SALE.REFUNDED`, `PAYMENT.SALE.REVERSED`; no hay prueba de firma/entrega/pago ni equivalencia exacta con secretos Supabase alojados. Receptor `f16-paypal-webhook` v10 inerte y 4 tablas financieras vacías verificadas por auditoría alojada read-only. No crear recursos duplicados ni alterar webhook; siguiente gate = revisión de seguridad/antiabuso de receptor y autorización PO aparte para activación Sandbox, seguida por autorización independiente para cambiar destino/eventos del webhook existente. **F16 sigue EN CURSO / PR #44 DRAFT / beta NO-GO.** El handoff F16 más reciente prevalece sobre banners históricos inferiores.\n\n> **F13 / FIGMA — GATE DE CORRECCIÓN PRIORITARIO (2026-10-12):** El Product Owner pidió replicar **las pantallas y pasos REALES de PAZO**, con elementos completamente editables en Figma. El archivo creado https://www.figma.com/design/7D8RNWhkRHf1RSNqrMZVV4 contiene **25 propuestas genéricas** que el PO rechazó expresamente («esas no son las pantallas de pazo»), por lo que **NO son entregables ni referencia visual aprobada**. URL exacta proporcionada por PO para reconstrucción fiel: https://pazo-app-t83r-git-release-mvp-beta-fast-track-f4f99c-digitalapp.vercel.app/ . Acceso/commit de ese Preview **pendiente de verificar**; no asumir que corresponde al HEAD RC. Tarea única inmediata: inspeccionar UI real, reproducir **una** pantalla/estado como capas editables (texto, vectores, fotos individuales, componentes, auto-layout), compararla con pantalla fuente y pedir aprobación PO antes de escalar. Si login bloquea, solicitar solo mínima captura/sesión legítima; no credenciales. **El handoff vigente fue compactado (94KB → ~9KB)**, preservando historia completa en commit anterior `9385f339242f013e7d35b0c98d10b8051b07222d`; leer primero `docs/PAZO_ACTIVE_HANDOFF.md`. Ningún cambio de código ni Vercel autorizado por esta tarea. F13 sigue EN CURSO, beta NO-GO y smoke T12 final después de F13.

> **F13 SPLASH INTEGRADO RC — 2026-10-12:** Product Owner aprobó GIF/MP4 de animación del Concepto 4 («listo, me gusta»), autorizó versión final («excelente»). PR #43 [merged](https://github.com/DigitalAppcorp/pazo-app/pull/43) solo RC, squash `cf868edd6f760438c74d7b56241e7149de142cd2`: reemplazo de splash giratorio por SVG/CSS de logo perro+gato+huella+wordmark, 2.5s sin temporizador adicional, colores PAZO, prefers-reduced-motion, sin paquetes. [CI #38255114510 SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38255114510) sobre PR head; app original no alterada fuera del splash. **Render final in-browser aún pendiente** de gate F13/T12; no Vercel/main ni publicar sin PO GO. Detalles en `PAZO_F13_SPLASH_ANIMATION_20261012.md`.

> **F13 TIPOGRAFÍA INTEGRADA — 2026-10-12:** PR [#42](https://github.com/DigitalAppcorp/pazo-app/pull/42) **MERGED RC** squash `50d7a97c810f57e497aa47148518c901d3274785`: fuente Quicksand global (la declarada en el perfil mostrado por PO), HTML load, Tailwind `--font-sans`, herencia de controles, eliminación de Palo Seco forzado en negritas. CI [#38250362789](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38250362789) SUCCESS para head PR, no para SHA merge. **Validación visual PO todavía pendiente**; F13 no completada. Sin Vercel, `main`, DB, ni cambios funcionales.

> **F13 TIPOGRAFÍA GLOBAL — 2026-10-12:** PO pidió aplicar a todos los textos el tipo de letra del perfil mostrado en screenshot «bretman». Auditoría: perfil declara Quicksand/Nunito, pero CSS forzaba Palo Seco sobre todas las negritas y HTML cargaba Plus Jakarta Sans. Cambio aislado mínimo en F13: cargar **Quicksand** (Google Fonts actual), definir `--font-sans` Tailwind y heredar en todos los textos/controles, retirar override Palo Seco y anular excepción del perfil. **Validación CI y visual por PO separadas**; no afirmar que screenshot original renderizó exactamente Quicksand (CSS viejo lo impedía). Sin cambios de funcionamiento, `main`, Vercel ni Supabase.

> **F13 iconografía vectorial — 2026-10-12:** PO ordenó reemplazar todos los emojis en textos propios de la app. PR #41 fusionado SOLO a RC (commit `f5260715f4eaf19987f011c9ef60c7829a91f215`): auditoría 98 archivos/15 apariciones/12 glifos; 12 iconos SVG originales y test que impide reintroducción de emojis. [CI PR #38248191885 SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38248191885). Documentación `PAZO_F13_EMOJI_INVENTORY_20261012.md`; **aceptación visual PO todavía pendiente**, F13 EN CURSO, T12 smoke final después. No cambios a `main` ni producción.

> **F13 AUTORIZADA — 2026-10-12:** El Product Owner aceptó iniciar una revisión visual **enfocada**, no un rediseño masivo. Gate inicial: comparación de capturas reales de PAZO con hallazgos de CSS/componentes; corregir solo inconsistencias aprobadas bloque por bloque, preservando funcionalidad y regla permanente **cero contornos**. Diagnóstico de código pendiente de confirmación visual: márgenes 2px `!important` de todos los h1–h6/p/label en `src/index.css`; microtextos 10–11px en `BottomNav`, `HeaderBar`, `HomeView` y otras vistas; `PublicProfileView` fuerza Quicksand/Nunito en lugar de Palo Seco. No eliminar reglas globales ni modificar componentes antes del comparativo visual y aceptación PO. La smoke final T12 HTTPS+CI debe ser una sola pasada después de cambios F13 aprobados, no duplicarse. `main`, Vercel y Supabase sin autorización de mutación adicional.

> **T09 PWA física PASS por PO — 2026-10-12:** El PO confirmó prueba satisfactoria de instalación/uso de PAZO en iPhone; Android Chrome instalado sin barra de URL ya estaba aprobado previamente. No repetir pruebas físicas de ambos dispositivos. El cierre por SHA de release/HTTPS queda en T12, antes de F13 y GO/NO-GO; no equivale a autorizar publicación. **Siguiente gate T11**: respaldo DB/Storage, cifrado age y restore aislado ya PASS LOCAL, falta verificar off-site personal Drive/upload-download/custodia recuperable. Ver handoff vigente.

> **ACTUALIZACIÓN PRIORITARIA — 2026-10-12, F14/T08 Gate B PASS específico:** reconciliación administrativa de **un único objeto de prueba** finalizada con POST autenticado HTTP 200 y postflight SQL alojado: claim invalidated=1/held=0; un evento invalidated; restricción purged=1/pending=0; reporte removed=1; foto original ausente y dos avatares intactos. Rollback CLI secreto OFF + código OFF y funciones alojadas bloqueadas (reconciler v27, purge v41, JWT true) confirmado. **NO repetir purga, POST, migración ni ensayos históricos; F14 integral y GO beta NO se declaran completos.** Fuente de detalle: `docs/PAZO_ACTIVE_HANDOFF.md`. Prioridad siguiente: gates T05/T07/T09/T10/T11/T12 y F13 visual al final, sin tocar main/Vercel hasta gate del PO.

> **FUENTE OPERATIVA VIGENTE — TRANSFERENCIA 2026-10-11:** Este documento contiene banners históricos y decisiones anteriores que pueden decir que las migraciones F14 están pendientes o que Edge no está instalada. Esos encabezados **NO** gobiernan el estado actual. Leer primero [PAZO_ACTIVE_HANDOFF.md](PAZO_ACTIVE_HANDOFF.md) y [PAZO_F14_ONE_OBJECT_HOSTED_EXECUTION_20261011.md](PAZO_F14_ONE_OBJECT_HOSTED_EXECUTION_20261011.md), contrastados con GitHub RC y Supabase alojado. F14: migraciones ya aplicadas; función Edge v7 instalada pero **desactivada**, foto de prueba intacta y en `pending_review`; preflight SDK PASS; bloqueo actual = entorno operador con sesión moderadora, flag reversible y rollback demostrable. Autorización del PO para un solo objeto ya otorgada. No ampliar ni repetir pruebas, no tocar `main`, no comenzar F13 ni declarar beta lista.

> **RECUPERACIÓN REAL / ESTADO VIGENTE — 2026-10-11:** acceso administrativo oficial CLI Supabase resuelto sin contraseña original ni reset. Backup DB completo/roles y 2 objetos Storage (486020 bytes), cifrado y roundtrip reales PASS LOCAL. Restore real offline: 81 tablas + 3 secuencias, 197 funciones, 96 políticas, 353 constraints, 47 triggers; cero diferencias de datos, owners/ACL/RLS, extensiones y propiedades DB. Ambas migraciones F14 pendientes aplicadas solo en clone fiel con postgres NOSUPERUSER, cero cambios de datos: **PASS LOCAL**; no PASS Storage físico/alojado. **T11 PARCIAL:** el PO deja reconexión/subida a Drive pendiente para hacerla personalmente después; cero subida, descarga externa o custodia independiente de clave certificadas. No volver a pedir acceso de DB ni repetir suites aprobadas. Acceso CLI Vercel digitalappcorp/digitalapp/pazo-app-t83r PASS; OAuth/descubrimiento del nuevo MCP PASS pero permiso efectivo del proyecto no probado en este contexto. Soporte con cuota llena, sesión real moderador, iPhone físico, 3D con lugares reales y smoke integrado siguen pendientes. Autorización F14 acotada ya existe, pero gates operativos/de recuperación aún abiertos: SQL alojado, foto nueva, Edge/flags/purga NO ejecutados. **F13 no iniciada; NO-GO público.** [Evidencia y límites](PAZO_REAL_BACKUP_LOCAL_RECOVERY_20261011.md). Este delta sustituye los estados históricos de acceso faltante/ausencia de backup local; no declara T11 completo ni valida datos de CI como backup real.

> **EJECUCIÓN AUTÓNOMA PRE-F13 — 2026-10-11 (vigente):** la nueva orden del PO autoriza aplicar las dos migraciones pendientes F14, en orden, y ensayar una sola foto NUEVA, únicamente después de respaldo recuperable y preflight. La autorización ya existe; la ejecución alojada sigue BLOQUEADA por acceso PostgreSQL/SDK aún no preparado y respaldo real pendiente. PASS LOCAL F14 conservado (42 SQL, 300 aliases, 12 concurrencias, 38 Edge/HTTP); no repetir módulos aprobados. Tooling T11 corregido: 11 regresiones SDK sintéticas, export/restore PostgreSQL sintético y paquete cifrado/descifrado verificados, sin backup real. PO elige Drive personal; falta OAuth de esa cuenta. La cuenta de soporte conectada tiene cuota llena, bloquea T07/T10 hasta comprobar correo operativo y sesión Auth real de moderador. Vercel login oficial y HTTP del Preview de referencia desbloqueados; no acredita smoke visual. [Estado y dependencias exactas](PAZO_AUTONOMOUS_PRE_F13_GATES_20261011.md). Este delta supersede límites/estados históricos inferiores; main, producción, datos/Storage alojados y flags no modificados, F13 no iniciada, lanzamiento NO-GO.

> **F14 / T08 — AUDITORÍA LOCAL CORREGIDA (2026-10-11): PASS LOCAL**, sobre RC baseline f29937d. Dos carreras reproducidas y corregidas: nueva referencia tras preflight y DELETE Storage con snapshot RLS anterior al commit del claim. Ambas migraciones pendientes ejecutadas/repetidas con postgres NOSUPERUSER; 42 casos SQL, 300 aliases, 12 escenarios de concurrencia, 38 tests Edge/HTTP y build PASS. Catálogo/ACL/RLS fieles al contrato F14 con diferencias de entorno declaradas. Infraestructura PostgreSQL17 aislada incorporada al CI; comprobar su ejecución en el SHA final publicado. [Informe y próximo gate](PAZO_F14_T08_SECURITY_LOCAL_AUDIT_20261011.md). **T08 retirada física sigue PENDIENTE DE AUTORIZACIÓN/PRUEBA HOSTED**, no PASS de producción. A candidata a ensayo acotado; mantener B para beta hasta aprobarlo. Cero migraciones/filas/objetos/Edge/flags alojados modificados; purga global OFF. T05/T06/T07/T09/T10/T11/T12 y F13 no se reabrieron. Este delta supersede únicamente los bloqueos históricos de laboratorio F14.

> **CIERRE P0/P1 EN EJECUCIÓN — 2026-10-10:** T01–T04/T13–T16 corregidas y pruebas dirigidas PASS; T17 fail-closed implementado, pendiente login Preview. Estados/evidencia vigentes en [subhoja maestra](PAZO_MVP_TECHNICAL_CLOSURE_SUBROADMAP_20261010.md), procedimientos/gates en [operaciones de cierre](PAZO_MVP_CLOSURE_OPERATIONS_20261010.md). T05–T12 mantienen gates explícitos de acceso Preview/Mapbox, Auth, operador, medios físicos, dispositivos y release. No Computer Use, P2/F13, main, producción, SQL hosted ni borrados; los estados históricos anteriores no superseden este delta. CI del HEAD publicado debe comprobarse por SHA; build/QA local no acreditan runtime.

> **ORDEN ACTUAL DEL PRODUCT OWNER (2026-10-10):** cerrar primero únicamente los pendientes técnicos, incoherencias funcionales T01–T12 y micropendientes T13–T20 enumeradas en [`PAZO_MVP_TECHNICAL_CLOSURE_SUBROADMAP_20261010.md`](PAZO_MVP_TECHNICAL_CLOSURE_SUBROADMAP_20261010.md); dejar **F13 visual para el último paso antes del GO/NO-GO**, exclusivamente con el PO. El documento tiene rutas fuente, gates y DoD; no reabrir QA histórico ni asumir que `READY` en Vercel equivale a prueba de instalación. Los párrafos anteriores de este roadmap permanecen como historial, no como prioridad que invalide esta decisión.

> **ESTADO MÁS RECIENTE DE CIERRE TÉCNICO (2026-10-10):** leer `docs/PAZO_MVP_TECHNICAL_RELEASE_READINESS.md` y después este roadmap histórico. Resultado NO-GO público: tests de gobernanza/PWA y build local PASS; lint tiene deuda heredada; F14 física sigue apagada con migración de reintentos preparada pero no aplicada; Preview HTTPS está bloqueado por autorización Vercel 403; instalación móvil real y ajustes finales de privacidad/operación requieren gates. La baja E2E de la cuenta QA ya pasó y no se repite. F13 sigue exclusivamente a decisión del PO; recordarla antes del último GO/NO-GO.

## DECISIÓN EXPRESA DEL PRODUCT OWNER — PWA OBLIGATORIA / F13 PENDIENTE (2026-10-10)
- **Condición de lanzamiento no negociable:** PAZO debe ser una **PWA instalable/descargable** desde un navegador compatible, como estaba concebida originalmente. Una simple web móvil no satisface el alcance. Implementar el conjunto mínimo: manifest, iconos PAZO reales, experiencia standalone, SW seguro sin caché privada, enlace e instrucciones de instalación si corresponde y prueba de instalación en origen HTTPS cuando se autorice desplegar. No declarar la Fase 15 cerrada por solo CI o metadatos estáticos. Reutilizar stack sin costes recurrentes.
- **Fase 13 sigue PLANIFICADA/PENDIENTE, no completada ni cancelada.** El PO pide que se le recuerde explícitamente **justo antes del último gate de lanzamiento del MVP**, cuando PWA y Codex estén resueltos, **antes de solicitar autorización para publicar**. Presentar entonces la F13, la opción de abordarla o diferirla y sus implicaciones; no tomar esa decisión por el PO ahora.
- Este acuerdo reemplaza cualquier sugerencia anterior de lanzar «solo web móvil» como sustituto de PWA. No interfiere con el ensayo reservado a Codex ni autoriza Vercel/main/DB.
> **AUDITORÍA NUEVA — 2026-10-10:** antes de interpretar los estados históricos de las fases, consultar `docs/PAZO_MASTER_PHASE_AUDIT_20261010.md`. F13 PLANIFICADA (rediseño no ejecutado), F14 mínimo beta no igual a fase integral completa, F15 PLANIFICADA sin instalación PWA acreditada. Aplicar gate «fases 6–15 completadas o explícitamente descartadas por PO» con rigor. CI #652 PASS del RC `a778aefa` no constituye Gate 8 de F13/F15.

> **HANDOFF VIGENTE — 2026-10-10:** El siguiente chat debe leer primero `docs/PAZO_ACTIVE_HANDOFF.md` (snapshot compactado, commit `0468e138`) antes de cualquier bloque histórico aquí. RC CI #626 SUCCESS (HEAD anterior `08351535`; comprobar CI nuevo), siete usuarios Auth = seis originales + única QA confirmada y reservada a Codex; un moderador, una mascota y un archivo; cero solicitudes de baja. Privacy ES/EN actualizada, `LEGAL_RELEASE_READY=false`. Trabajo independiente siguiente: revisión legal/retención y preparación RC; baja QA pendiente delegada exclusivamente a Codex por `docs/PAZO_CODEX_PENDING_QA_20261010.md`. Prohibido repetir QA ya aceptada, tocar Vercel/main/A3 avanzado, o alterar datos test que romperían el preflight.

> **MVP — RC CI #616 PASS Y BAJA SUPERVISADA ACOTADA (2026-10-10):** CI #616 `SUCCESS`, commit `acd09781`, preflight SQL READ-ONLY reforzado: `blocked_last_moderator` para impedir borrar a la única persona que modera, prueba real SELECT contra cuenta designada PASS sin revelar UUID ni modificar datos. Datos alojados: único moderador, seis Auth, cero solicitudes de baja; esquema tiene FK NO ACTION (pets/posts) y CASCADE (community_posts), así que no procede borrado ciego. SOP provisional actualizado para **un** ensayo nuevo descartable con gate destructivo específico; no tocar cuentas anteriores. El botón de solicitar baja sigue apagado por defecto en compilación pública y se habilitará solo al verificar capacidad real de atención. Próximo P0: aceptación manual limitada y política/retención verdaderas, después gate RC; no reabrir Auth, Feed, Lugares, moderación aprobada ni A3 avanzado; Vercel/main no tocados.

> **MVP GATE OPERADOR MODERADOR — CERRADO A NIVEL DB (2026-10-10):** el PO autorizó y ejecutó desde SQL Editor la asignación del permiso existente a `appdigital.corp@gmail.com`. SELECT verificado: total grants = **1**, cuenta objetivo confirmada = **1**, otros grants = **0**, Auth = **6**, denuncias pendientes = **0**. El bloqueo de permisos anteriormente registrado queda **RESUELTO**; no repetir la inserción ni decir que la herramienta hizo la escritura. Sigue pendiente únicamente confirmar comportamiento efectivo de cola con sesión legítima si se realiza QA de release acotada; no afirmar UI E2E PASS. A3 avanzada congelada, `LEGAL_RELEASE_READY=false`, no tocar Vercel/main/credenciales. Priorización: política real y atención de baja manual sobre una identidad futura descartable, luego gate de release.

> **MVP FAST-TRACK — RETENCIÓN Y GUARD DE SQL (2026-10-10):** matriz propuesta `docs/PAZO_MVP_RETENTION_MATRIX_DRAFT_20261010.md` por categorías efectivamente presentes en DB, sin cifras de retención inventadas; previews Privacy ES/EN aclaran que no hay purga automática, que las bajas exigen revisión manual y que backups/cachés pueden persistir; prueba de copia agregada y `LEGAL_RELEASE_READY=false`. Se protegió con `RAISE EXCEPTION` al comienzo el draft `20261010_f14_deleted_author_threads_NOT_APPLIED.sql` que podía modificar tablas accidentalmente; sin aplicar migraciones. Próximos únicos gates: cierre RC/build, política y retención respaldadas por comportamiento real, baja de cuenta nueva descartable bajo aprobación específica, QA final acotada y después merge/producción. Mantener Auth y módulos previamente aprobados, A3 avanzado en pausa, sin Vercel ni main.

> **MVP — CALIFORNIA CONFIRMADA POR PO (2026-10-10):** Alvarado Solutions LLC es la entidad operadora declarada y el PO confirmó que está registrada en **California**. Borradores de Privacidad y Términos ES/EN y test en `src/features/legal/legalCopy.ts` reflejan nombre y estado; no se ha consultado documentación del registro y no se inventan domicilio/agente ni plazos de conservación. Contacto público de privacidad: `appdigital.corp@gmail.com`. Los únicos pendientes legales esenciales siguen siendo política/retención verificable y procedimiento real de baja manual, más integración RC. `LEGAL_RELEASE_READY=false`, sin cambios en Auth, Vercel, Supabase ni main. No pedir de nuevo estado de registro; mantener A3 avanzado pausado.

> **MVP — OPERADOR DE PAZO CONFIRMADO POR PO (2026-10-10):** **Alvarado Solutions LLC** es la empresa registrada bajo la que operará PAZO, según la declaración del PO. Borradores de Privacidad y Términos ES/EN atribuyen operador mediante `PAZO_LEGAL_OPERATOR_NAME`; pruebas nuevas verifican coherencia y `LEGAL_RELEASE_READY=false`. El contacto público sigue siendo `appdigital.corp@gmail.com`. **Por confirmar** jurisdicción/domicilio de contacto cuando corresponda, plazos o criterios reales de conservación, pruebas limitadas de baja manual y texto legal final. No reabrir Auth ni módulos ya probados; no continuar A3 avanzado, hacer merge ni tocar Vercel/Supabase por este cambio.

> **CORRECCIÓN QA AUTH / PRIORIDAD LANZAMIENTO (2026-10-10):** el PO ya había validado `LOCAL AUTH PASS` (registro, mascota, Feed y recarga) el 2026-10-08, y **«listo, funcionó»** para la recuperación por enlace/formulario el 2026-10-10. No reabrir estas pruebas; el asistente pidió repetirlas por un checkpoint antiguo. Se revirtió el cambio no solicitado de redirección `emailRedirectTo` en signup y sus tests para preservar el baseline aprobado `781069d6`. **No hay gate de Auth E2E pendiente** sin regresión concreta. La siguiente prioridad real del MVP es integración de RC, privacidad/retención/operador legal y baja manual supervisada; no A3 avanzado ni Vercel hasta RC.

> **MVP — CONTACTO PÚBLICO APROBADO (2026-10-10):** `appdigital.corp@gmail.com` es correo público de soporte y privacidad, enlazado en la vista de Privacidad/Reglas y solicitud de baja. `LEGAL_RELEASE_READY=false` por identidad legal y retención aún pendientes; NO por enlace de recuperación. No borrar cuentas QA, cambiar Supabase alojado, tocar main ni Vercel.
> **DECISIÓN PO VIGENTE — MVP FAST-TRACK (2026-10-10):** A3 avanzada se **congela**: no más SQL de 30 tablas, leases/worker ni pruebas especulativas. Existe intake real en Supabase para solicitudes de eliminación; atención provisional **manual y supervisada** por operador designado, cola privada de solo lectura y SOP, con test de una cuenta descartable **pendiente**. No declarar eliminación real como funcional hasta completarla. Rama RC limpia `release/mvp-beta-fast-track-20261010` parte de `781069d6` anterior a los 132 commits de A3 en PR #37; esa rama histórica y PR #38 se conservan SIN MERGE. **Orden obligatorio:** RC/integración → confirmar/recuperar Auth por enlace real → moderación/medio descartable → privacidad/contacto/baja manual ensayada → QA/merge autorizado → Vercel. Canónico `docs/PAZO_MVP_RELEASE_GATES_20261010.md` y `docs/PAZO_MVP_MANUAL_DELETION_SOP_20261010.md`. No gastar, borrar seis cuentas, cambiar DB, main o Vercel. Esta entrada PREVALECE sobre A3 antiguo.

> **F14 A3 — GATE DE IMPLEMENTACIÓN MÍNIMA LISTO PARA APROBACIÓN / 2026-10-10:** Auditoría read-only alojada: 6 Auth, 1 perfil, 1 mascota, 0 publicaciones/comunidades/comentarios/documentos, 1 avatar Storage, 0 solicitudes de baja. Intake seguro en DB ya existe, **ejecutor de eliminación no existe**. FK de comunidades hacia Auth ahora usa `ON DELETE SET NULL`; otros bloqueos por contribuciones cruzadas, documentos, cuidados, sesiones, Storage/CDN siguen vigentes. Plan único verificable en `docs/PAZO_F14_A3_MINIMUM_RELEASE_GATE_20261010.md`: reutilización selectiva PR #38, una implementación proporcional revisable con SQL NO APLICADO y test posterior controlado tras permisos separados. **Siguiente gate de PO:** autorizar la preparación de código/migración como borrador. No merge, Vercel, operación destructiva, migraciones ni release autorizado. La baja por solicitud actual NO es eliminación automática.

> **POST-RESET AUTH — GATE CERRADO PARA CUENTA PROBADA / 2026-10-10:** PO confirmó nuevo checkout `pazo-app-versionado`: splash termina, login con cuenta retenida funciona y se muestran Privacy/Terms (borradores) y solicitar baja (intake). SELECT hosted tras el login: **6 Auth, 1 profile (era 0), 1 pet, 0 posts, 1 objeto Storage**, y la mascota tiene perfil propietario (`pets_without_profile=0`). Resolución real de la discrepancia de recuperación para esa identidad, sin afirmar las otras cinco cuentas. Handoff actualizado con evidencia y límites. QA visual exacto del nuevo footer de versión A01 no documentado separadamente. **Siguiente P0:** ruta de eliminación definitiva cuenta/medios y política de privacidad veraz; no repetir tests ya aprobados. PR #37 DRAFT, ningún merge/Vercel/SQL nuevo autorizado. Este checkpoint prevalece sobre referencias históricas a `profiles=0`.

> **UI DE VERSIÓN DOBLE / 2026-10-10 (ESTADO MÁS RECIENTE):** PO confirmó que la instalación limpia `pazo-app-versionado` con el commit `0541521` superó su prueba local. Código `ac74ecc6` añade el mismo texto dinámico `Versión 0.1.NNNNNNNN` que ya tenía el splash a la parte inferior de la pantalla A01 (bienvenida con opciones de comenzar, iniciar sesión y demo). Sin rediseñar ni tocar Auth/backend. Falta QA visual específica del footer después de actualizar el nuevo clone; el CI se comprueba por separado. Conserva `pazo-visual-qa` como respaldo. No merge, Vercel ni migraciones. Este checkpoint sustituye las decisiones visuales antiguas que proponían quitar la palabra «Versión».

> **SNAPSHOT VIGENTE / 2026-10-10, PRE-BETA:** La fuente operativa actual es `docs/PAZO_ACTIVE_HANDOFF.md`; los bloques cronológicos inferiores son historial, no instrucciones de ejecución. Tras el reset autorizado se conservan **6 usuarios e identidades Auth**; una prueba del PO creó **1 mascota y 1 avatar**. `profiles=0` hasta que un usuario vuelva a iniciar sesión. El PO autorizó exclusivamente `20261010072555_f14_recover_missing_profile`, **APLICADA** en Supabase, y el frontend en PR #37 recupera perfiles de forma idempotente. CI de código #38034600644 **PASS**; el PO reportó PASS visual tras la integración, pero SELECT posterior siguió dando `profiles=0` en Supabase alojado; falta conciliar el SHA local y el entorno antes de declarar E2E PASS. No repetir borrados, no crear nuevos usuarios Auth, no Vercel, no merge, no aplicar otros drafts. El bloqueo de release F14 permanece abierto. Documentación histórica previa: `docs/archive/PAZO_ACTIVE_HANDOFF_BEFORE_PROFILE_RECOVERY_20261010.md`.

> **MEJORA DE TRAZABILIDAD / 2026-10-10:** el splash de PAZO muestra automáticamente `Versión <SHA de 8 caracteres>` (+ `· local` si está en Vite dev; `· modificado` para cambios locales rastreados). El SHA se obtiene del checkout Git activo al iniciar el servidor o `VITE_APP_RELEASE` en CI; reiniciar Vite tras cambios de rama. Código PR #37 `9f0caed7`, CI #38035960896 **PASS**. La versión visible servirá para conciliar el PASS visual reportado con `profiles=0` en Supabase alojado. No implica aún E2E de recuperación. No merge, Vercel, borrados ni migraciones.

> **AJUSTE VISUAL DEL SPLASH / 2026-10-10 (SUPERSEDE ETIQUETA ANTERIOR):** pedido PO: solo números y puntos, en la parte inferior central, pequeña y atenuada, sin textos como «Versión», «local» o «modificado». Identificador automático `0.1.NNNNNNNN` obtenido del commit Git; `.1` final para checkout modificado; `0.0.0` si no puede leerse la revisión. Código commits `4fcc9fdd` / `bbf82eea` en PR #37. La versión es una pista de QA y **no** confirma por sí sola que el entorno Supabase de Antigravity sea el alojado. La recuperación de `profiles` sigue sin verificación E2E. Ningún merge, despliegue ni migración adicional autorizado.

> **F14 / AUTOR ELIMINADO — POLÍTICA PO APROBADA, CÓDIGO + QA PASS (2026-10-10):** PR #37 `17b1bd42` CI **PASS #38031508038**. Se construyeron tombstones de solo lectura ES/EN para Feed/Comunidades que presentan `Autor eliminado` y comentarios ajenos sin mostrar nombre, mascota, avatar, ubicación ni medios del autor. SQL `supabase/drafts/20261010_f14_deleted_author_threads_NOT_APPLIED.sql` **NO APLICADO**: cambia FKs para preservar hilos tras baja Auth/mascota, restricciones de anonimización, cuatro triggers antiinteracción, RPC solo `service_role` para redacción si solicitud `processing`, sin claims held y solo tras conciliar Storage/medios externos y comentarios JSON legados. Feed RPC de recomendaciones modificado en el draft para incluir hilos con comentarios, sin omitir moderación. SQL compiló y pasó pruebas de ACL/triggers dentro de BEGIN/ROLLBACK; 0 datos cambiados. **Bloqueos reales:** 3 publicaciones Feed con `posts.comments` JSON histórico, 8 URLs de fotos sin match exacto Storage, 1 media claim `held`; no borrar a ciegas. UI de selección extra de columna de Comunidad detrás de `VITE_F14_DELETED_AUTHOR_THREADS_ENABLED` OFF por defecto. Vercel y main intocados. Siguiente gate = autorización específica de aplicación de migración y posterior QA, NO autoriza ni sustituye ejecutor Auth/Storage.

> **F14 / INTEGRIDAD ANTES DE ELIMINAR CUENTAS — QA READ-ONLY 2026-10-10:** GitHub PR #37 amplía el preflight existente con acciones Feed sin FK, likes externos, impresiones, cruces user/pet, claim `held` y URL de media no resoluble. Escaneo no destructivo sobre 6 cuentas: **13 interacciones explícitas ajenas, 76 impresiones ajenas, 1 claim moderación held y 8 referencias de foto no resolubles exactamente** (6 publicaciones Feed, 2 avatars de mascota). No significa 8 archivos borrados: URLs pueden ser antiguas/externas o con parámetros; investigar antes de intervenir. Nuevas queries read-only agregadas sin identificadores `f14_account_cleanup_integrity_READ_ONLY.sql`, `f14_storage_footprint_READ_ONLY.sql`, `f14_photo_reference_footprint_READ_ONLY.sql` más tests. Las 6 cuentas continúan `may_delete_auth=false`/ `may_delete_storage=false`. Ninguna migración SQL permanente ni ejecución Storage/Auth en este lote, CI de código PASS. No Vercel, no merge.

> **F14 COMUNIDADES — MIGRACIÓN APLICADA 2026-10-10:** PO autorizó y se aplicó migración remota `20261010053708_f14_community_ownership_continuity` (PR #37). La FK propietaria cambió a `ON DELETE SET NULL` con CHECK que prohíbe comunidad activa sin owner; sigue el trigger de membresía. Se añadieron seis RPC y tabla privada de ofertas; anon no puede aceptarlas, usuarios autenticados no pueden archivar, service_role sí. Prueba real en DB alojada con dos identidades autenticadas bajo `BEGIN/ROLLBACK`: PASS designación admin, oferta, invalidación tras cancel/re-request, nueva oferta, aceptación y conservación de los 3 posts. La prueba reversible del archivo **preinstalación** pasó; una prueba adicional de archivo ya instalado fue bloqueada por el entorno y permanece sin ejecutar. Datos intactos: 6 Auth, 1 comunidad, 3 posts, 21 Storage, 0 solicitudes, 0 ofertas, 0 admins permanentes. UI administrativa solo `import.meta.env.DEV` / flag explícito, producción OFF. Sin ejecutor definitivo de borrado. No Vercel, sin merge a main.

> **F14 / CONTINUIDAD COMUNIDADES IMPLEMENTADA EN CÓDIGO — 2026-10-10:** PR #37 commit `4881ab7b`, CI #38026921677 PASS. Decisión PO: ofrecer traspaso solo a administrador designado con aceptación explícita; sin aceptación vigente archivar preservando publicaciones de otros usuarios. Migración `supabase/drafts/20261010_f14_community_ownership_continuity_NOT_APPLIED.sql` **NO APLICADA**: introduce rol `admin`, oferta de 7 días con aceptación/rechazo por receptor, RPC de archivo restringida a `service_role` y solicitudes `processing`, FK propietario `ON DELETE SET NULL` con CHECK para impedir comunidad activa sin propietario, y guard de membresía. UI propietario/candidato ES/EN oculta con `VITE_F14_COMMUNITY_OWNERSHIP_ENABLED` OFF. PG sintético en `pg_temp` con `BEGIN/ROLLBACK` PASS: transferencia consentida sin perder publicaciones, archivo sin perder contenido ajeno, oferta vigente bloquea archivo; **no es E2E de la migración real**, todavía requiere gate PO y QA aislada. Datos existentes sin cambios, Auth/Storage no borrados, Vercel/main intactos.

> **F14 / CONTINUIDAD COMUNIDADES (POLÍTICA APROBADA PO 2026-10-10):** Si el propietario solicita eliminar cuenta, ofrece titularidad SOLO a un administrador previamente designado que puede aceptar/rechazar en su propia sesión; transferencia exige aceptación y no borra contenido ajeno. Sin aceptación vigente, el operador al pasar solicitud a `processing` archivará conservando posts/comentarios y desacoplará propietario antes del Auth delete. Auditoría: roles actuales `owner/member` sin `admin`, owner FK `ON DELETE CASCADE`, trigger de propietario requiere membership; corregidos en **una migración SQL versionada NO APLICADA** `supabase/drafts/20261010_f14_community_ownership_continuity_NOT_APPLIED.sql`. UI y servicio de gestión en `CommunityDetailView` bajo `VITE_F14_COMMUNITY_OWNERSHIP_ENABLED=true`, apagado por defecto; no se desplegó ni cambió DB. La transición Auth/Storage todavía carece de ejecutor autorizado. NO fusionar PR ni tocar Vercel.

> **PREVALIDACIÓN F14 EJECUTADA / PASS — 2026-10-10:** PR #37 `c4140424` CI #38026303714 PASS. Se ejecutó `supabase/queries/f14_account_deletion_preflight_READ_ONLY.sql` contra las **6 cuentas de prueba** sustituyendo solo CTE del candidato por `auth.users`, sin mutaciones: **3 bloqueadas por aportes de terceros, 2 requieren limpieza de contenido propio, 1 sin dependencias de las clases contadas pero aún SIN permiso para borrado** (`awaiting_executor`). Todas `may_delete_auth=false`, `may_delete_storage=false`. Estado remoto: 6 Auth, 0 solicitudes, 21 objetos Storage totales (14 fotos de publicaciones), 0 medios purged, no nueva RPC, Edge moderación v5 OFF. La interfaz de solicitudes se habilitó **solo en DEV/local** y sigue apagada para builds de producción salvo flag explícito. **Siguiente gate real:** estrategia explícita de conservación/traspaso o cierre seguro de comunidades con contribuciones de terceros y comentarios ajenos, limpia Storage mediante API, reconciliación FK/Auth; no ejecutor aún. Sin deploy, SQL permanente adicional, Vercel ni merge.

> **F14 / PREVALIDACIÓN DE BORRADO (2026-10-10):** inventario PostgreSQL real confirma bloqueo FK: `pets.owner_id` y `posts.user_id` carecen de `ON DELETE CASCADE` en Auth; `communities.owner_user_id ON DELETE CASCADE` arrastraría posts de otros usuarios. Escaneo agregado de 6 cuentas muestra 1 comunidad con 1 post ajeno, 6 comentarios ajenos en Feed, 1 documento privado y 21 objetos en 5 buckets; 0 solicitudes activas. Se implementó **consulta admin READ-ONLY** `supabase/queries/f14_account_deletion_preflight_READ_ONLY.sql` y motor puro tipado `src/features/account/deletionPreflight.ts` con tests (reporte `blocked_third_party/cleanup_required/awaiting_executor` y `may_delete_auth=false` / `may_delete_storage=false` inmutables). Entrada de solicitudes `Mi mascota → Cuenta y datos` habilitada sólo en `import.meta.env.DEV` para QA local, producción sigue apagada y el ejecutor no existe. **Ningún SQL nuevo se instala**, 0 borrados, Vercel sin tocar, PR sin merge. Este es el gate técnico antes del borrado real, no un reemplazo de ello.

> **F14 ACCOUNT REQUEST INTAKE INSTALADA Y QA PASS — 2026-10-10 UTC:** autorización PO ejecutada; Supabase migración `20261010045708_f14_account_request_intake`. Creó schema privado, tabla de solicitudes por usuario y RPCs `pazo_deletion_request/status/cancel`; **0 solicitudes reales**, 6 usuarios Auth y 14 archivos intactos. ACL verificado: anon sin RPC, authenticated solo RPC, ni anon ni authenticated SELECT/USAGE de schema privado, RLS enabled. QA SQL sobre objetos *instalados*, con `SET LOCAL ROLE authenticated` y dos cuentas separadas: solicitud, consulta, repetición idempotente, aislamiento BOLA, cancelación solo de `requested`, rechazo en `processing`; todo bajo `BEGIN/ROLLBACK`, sin dejar datos. La UI de `Mi mascota → Cuenta y datos` está versionada pero permanece **apagada por `VITE_F14_DELETION_REQUESTS_ENABLED` (default OFF)**; no activada, no desplegada. Solicitud ≠ eliminación definitiva; ejecutor Auth/Storage/terceros NO existe aún. Vercel no tocado y PR #37 sin merge.

> **F14 REQUEST INTAKE SQL QA PASS / 2026-10-10 04:50 UTC:** PR #37 commit `8925f2d5`, CI #38025574055 **SUCCESS**. La migración `supabase/drafts/20261010_f14_account_request_intake_NOT_APPLIED.sql` fue ejecutada únicamente dentro de BEGIN/ROLLBACK: se verificaron dos identidades distintas en instrucciones SQL separadas, request/status/cancel idempotentes, aislamiento de cuentas y ACL. Se corrigió `JSON null` a `SQL NULL` para ausencia de solicitud. **No se aplicó** nada permanente ni se habilitó UI; necesita autorización PO específica según AGENTS.md. La recepción segura de solicitud no reemplaza el ejecutor de eliminación real, que sigue P0. D3-A Edge v5 sigue OFF. 

> **F14 / LOTe CUENTA (2026-10-10):** entrega de solicitud autenticada de eliminación (NO ejecución): `supabase/drafts/20261010_f14_account_request_intake_NOT_APPLIED.sql`, tres RPC idempotentes request/status/cancel, esquema privado/tabla mínima, UI ES/EN en Mi mascota detrás de `VITE_F14_DELETION_REQUESTS_ENABLED` (OFF), tests de ownership y no borrado. **NO se aplicó la migración**: `AGENTS.md` requiere gate PO independiente para SQL, y eliminar datos/Auth/Storage sigue totalmente fuera de alcance. Solicitud registrada != cuenta eliminada, no abrir Beta hasta manejo real seguro. D3-A Edge v5 desactivada; 14 objetos intactos.

> **D3-A ROLLBACK SEGURO — 2026-10-10 04:37 UTC:** ante petición del PO de automatizar y seguir rápido, se restauró Edge `f14-moderation-purge` **v5**, `verify_jwt=true`, release latch `F14_MEDIA_PURGE_RELEASE_APPROVED=false`, sin excepción temporal para ningún UUID; UI también vuelve a apagada (sin botón dev). Foto descartable verificada sigue **sin borrar**, 14 objetos Storage (13 anteriores + 1 ensayo), purged=0. Se corrigió y verificó preflight JWT `auth.role()` (migración `20261010043307_f14_media_jwt_claim_compat_single_test`; PASS SQL), pero **no es una prueba de purga real**. D3-A NO cerrada. Requiere ejecución futura con JWT de moderador vía flujo explícito; no manipular Storage SQL. Continuar en paralelo con gates MVP sin tocar Vercel ni merge.

> **D3-A BACKEND LISTO PARA QA AISLADO — 2026-10-10 UTC:** Edge v3 + SQL `20261010034610_f14_finalize_media_after_verified_claim` aplicadas y verificadas; apagadas por release latch en código. Único pendiente D3-A: foto NUEVA descartable + ensayo de eliminación por moderador controlado. No Vercel, sin merge; no reiniciar drafts A3.

> **DECISIÓN PO / FAST-TRACK 2026-10-09:** NO usar Vercel hasta MVP listo para lanzar. Carril activo: integración del MVP #36→#37 y cierres Auth/moderación/privacidad con criterios E2E; **PR #38 A3 PAUSADA**, sin más drafts hipotéticos. Detalle y gates: [PAZO_MVP_LAUNCH_FAST_TRACK_20261009.md](PAZO_MVP_LAUNCH_FAST_TRACK_20261009.md). Los checkpoints cronológicos antiguos de esta rama no reactivan A3 ni autorizan merge/deploy/SQL.

# PAZO — Hoja Maestra de Desarrollo

**Documento canónico del proyecto.**  
**Última actualización:** 2026-10-07  
**Estado general:** Fase 12 Global Search COMPLETADA / Gate 9 medición. Production Hardening ocupa temporalmente el Carril de Implementación por riesgo operativo pre-Beta.

---

## 0. Cómo usar esta hoja

Antes de modificar código, base de datos o arquitectura de PAZO:

1. Leer este archivo completo.
2. Leer `docs/PAZO_MODULE_LIFECYCLE.md`.
3. Identificar el módulo/fase activo y su gate pendiente.
4. Si existe sub-ruta específica, leerla.
5. No implementar decisiones marcadas como **DECISIÓN PENDIENTE**.
6. No convertir un módulo en implementación solo por su número de fase.
7. Después de cada decisión/merge relevante, actualizar esta hoja.

La finalidad es evitar reconstruir contexto, reducir tokens y evitar desarrollar funciones sin evidencia suficiente.

### Modelo de dos carriles

PAZO trabaja con dos carriles paralelos:

- **Carril de Validación:** módulos opcionales pueden medir interés durante semanas/meses sin bloquear el proyecto.
- **Carril de Implementación:** contiene únicamente utilidades núcleo, infraestructura necesaria o módulos que ya pasaron su gate.

Por tanto, una fase en validación puede permanecer abierta mientras otra fase aprobada avanza en implementación.

---

# 1. Roles de trabajo

## Product Owner
- Brandon.
- Define prioridades, reglas funcionales y acepta/rechaza comportamiento visual.
- Hace pruebas visuales y de producto cuando se solicitan.
- Autoriza explícitamente cualquier mutación importante en Supabase.

## Implementación
ChatGPT trabaja directamente sobre GitHub y Supabase:
- frontend React/TypeScript;
- arquitectura;
- Supabase/PostgreSQL;
- migraciones;
- RLS;
- RPCs;
- Storage;
- seguridad;
- pruebas;
- PRs y merge.

No pedir al Product Owner que copie código entre herramientas salvo que sea estrictamente necesario para una prueba local.

---

# 2. Flujo obligatorio por fase

Cada fase nueva sigue este orden:

1. **Auditoría de estado real**
   - GitHub `main`;
   - Supabase real cuando aplique;
   - no asumir que un mock es funcional.

2. **Definir alcance**
   - qué entra;
   - qué NO entra;
   - decisiones de producto pendientes.

3. **Crear rama**
   - una rama por fase.

4. **Implementar sin tocar producción antes de tiempo**
   - frontend;
   - backend versionado;
   - migraciones preparadas.

5. **Preflight**
   - build;
   - diff;
   - permisos;
   - RLS;
   - concurrencia;
   - integridad.

6. **Autorización explícita**
   - antes de aplicar una migración o mutación sensible en Supabase.

7. **Pruebas**
   - SQL con `ROLLBACK` cuando aplique;
   - build;
   - prueba visual real del Product Owner.

8. **Merge**
   - PR fuera de borrador;
   - merge a `main`;
   - verificar `main`;
   - actualizar esta hoja maestra.

---

# 3. Reglas técnicas permanentes

Estas reglas no deben romperse sin una decisión explícita de arquitectura.

- La identidad social pertenece a la **mascota**, no directamente al usuario.
- Una cuenta puede tener múltiples mascotas.
- Las mascotas del mismo dueño:
  - ven sus publicaciones entre sí;
  - no necesitan seguirse;
  - no pueden crear relación Follow entre ellas.
- Follow, Like, Save, Comment y recomendaciones se ejecutan en contexto de la mascota activa.
- `interactions` es fuente de verdad para estados activos de Like/Save.
- `posts.likes` es contador derivado administrado por backend; el cliente no lo escribe.
- Los datos privados de mascota deben permanecer separados de datos públicos.
- Ningún cliente debe poder actuar usando una mascota que no pertenece al usuario autenticado.
- Todo objeto nuevo expuesto por Data API requiere grants mínimos + RLS.
- Funciones `SECURITY DEFINER` solo cuando sean realmente necesarias, con superficie de ejecución explícitamente restringida.
- Nunca exponer `service_role` ni secretos en frontend.
- No considerar un módulo “terminado” mientras siga dependiendo de `mockData` para su funcionalidad principal.
- Toda persistencia debe sobrevivir recarga `F5`.
- Operaciones optimistas deben soportar rollback y cambio rápido de mascota.
- Las pruebas de seguridad no sustituyen las pruebas visuales, y viceversa.
- Durante una fase de rediseño visual, la funcionalidad existente debe mantenerse intacta salvo aprobación explícita del Product Owner.
- Cambios puramente estéticos no deben introducir nuevas dependencias de backend, alterar contratos de datos ni modificar reglas de negocio.
- Módulos opcionales/sociales de alto coste deben pasar un gate de validación de producto antes de su implementación completa; usar `docs/PAZO_FEATURE_VALIDATION_FRAMEWORK.md`.

---

# 4. Estado real actual

## Base real disponible

Actualmente el núcleo persistente usa, entre otras:

- `profiles`
- `pets`
- `pet_private_details`
- `pet_private_metrics`
- `posts`
- `post_comments`
- `interactions`
- `follows`
- `pet_places`
- `care_items`
- `care_completions`
- `pet_documents`

## Módulos reales

- Supabase Auth.
- Onboarding y creación de primera mascota.
- Crear mascotas adicionales.
- Editar mascota.
- Datos públicos/privados de mascota.
- Varias mascotas por cuenta.
- Cambio de mascota activa.
- Feed.
- Posts con/sin foto.
- Feed de mascotas propias + seguidas + recomendadas.
- Cold start de recomendaciones.
- Like / Unlike.
- Save / Unsave.
- Comentarios.
- Perfil público.
- Follow / Unfollow.
- Seguridad RLS/grants/RPC/Storage del núcleo.
- Persistencia de scroll entre pestañas.
- Protección contra follows entre mascotas del mismo dueño.
- Agenda/Cuidados persistente por mascota.
- Documentos privados persistentes por mascota.

## Módulos todavía mock, parciales o de demostración

- Eventos.
- Mensajería 1 a 1.
- Centro general de notificaciones.

---

# 5. Fases terminadas

## Fase 0 — Fundación
**Estado: COMPLETADA**

- React + TypeScript + Vite.
- Tailwind.
- React Router instalado.
- Supabase conectado.
- arquitectura base.

## Fase 1 — Perfil público y Follow
**Estado: COMPLETADA**

- perfil público real;
- navegación desde Feed;
- Follow/Unfollow persistente;
- ownership corregido.

## Fase 2 — Interacciones del Feed
**Estado: COMPLETADA**

### 2.1 Like / Save
- persistencia;
- reload;
- deduplicación;
- contadores backend;
- rollback;
- concurrencia.

### 2.2 Comentarios
- tabla real;
- carga;
- creación;
- contador;
- ownership;
- persistencia.

## Fase 3 — Registro, edición y privacidad de mascota
**Estado: COMPLETADA**

- create_pet_profile;
- datos privados separados;
- edición;
- intereses privados;
- avatar;
- métricas privadas.

## Fase 4 — Seguridad y estabilización
**Estado: COMPLETADA**

- RLS/grants endurecidos;
- posts normalizados;
- profiles protegidos;
- follows asegurados;
- interactions privados;
- Storage endurecido;
- repositorio limpiado;
- Security Advisor sin alertas SQL/RLS relevantes.

**Pendiente global de configuración:** activar Leaked Password Protection en Supabase Auth.

## Fase 5 — Múltiples mascotas
**Estado: COMPLETADA**

- cargar todas las mascotas owned;
- recordar mascota activa;
- cambiar contexto;
- Feed independiente por mascota activa;
- cold start;
- posts de mascotas hermanas visibles;
- interacciones aisladas por mascota;
- AddPet;
- scroll por pestaña;
- mismas-owner Follow oculto y bloqueado en backend.

---

# 6. Nueva Ruta Maestra — MVP social útil

## Fase 6 — Pasaporte QR, mascota perdida y avistamientos
**Estado: COMPLETADA**

### Objetivo
Convertir el sistema de rescate que hoy es visual en una utilidad real.

### Alcance
- token público revocable por mascota;
- QR realmente escaneable;
- página pública accesible sin login;
- ficha pública limitada a datos seguros;
- activar alerta de mascota perdida;
- resolver alerta;
- avistamiento público;
- notificación privada al dueño;
- persistencia;
- RLS y rate limiting básico;
- descargar/compartir QR.

### No entra todavía
- push notification del sistema operativo;
- ubicación GPS automática de quien reporta;
- mapa comunitario de alertas;
- SMS;
- email transaccional;
- red de rescates externos.

### Estado técnico final
- PR #6 implementado y validado;
- backend 6A, 6B y 6C aplicado en Supabase PAZO;
- QR real y token revocable por mascota;
- alerta perdida persistente y resoluble;
- avistamientos públicos con nombre/teléfono privados para el dueño;
- notificaciones reales y detalle accionable;
- recordatorio empático persistente de mascota perdida;
- acceso directo al avistamiento nuevo desde el recordatorio;
- notificaciones nuevas/vistas diferenciadas;
- Feed con paginación por desplazamiento en bloques de 10;
- Notificaciones con paginación por desplazamiento en bloques de 10;
- badge de no leídas calculado sin descargar todas las filas;
- recomendaciones paginadas sin solapamiento;
- RLS/ownership/privacidad validados;
- builds locales aprobados;
- prueba visual/end-to-end aprobada por Product Owner;
- datos visuales de prueba limpiados de Supabase;
- Pancho quedó con `is_lost=false` y sin ubicación de prueba;
- Advisors revisados; sin problemas nuevos introducidos por 6C.

### Definition of Done
- escanear QR desde otro dispositivo abre la mascota correcta;
- funciona sin login;
- no expone owner_id, pet_id privado, teléfono, domicilio ni información privada;
- una alerta persiste tras F5;
- un avistamiento crea registro real;
- el dueño recibe notificación real;
- resolver alerta persiste;
- RLS/advisors aprobados;
- build y prueba visual aprobados.

---

## Fase 7 — Comunidades
**Estado: COMPLETADA**

**Producto:** `docs/PAZO_PHASE_7_COMMUNITIES_MVP_SPEC.md`  
**Arquitectura:** `docs/PAZO_PHASE_7_COMMUNITIES_ARCHITECTURE.md`  
**Estado operativo:** `docs/PAZO_COMMUNITIES_CURRENT_STATE.md`

Decisión vigente:
- MVP útil real aprobado;
- membership por cuenta;
- contenido por mascota activa;
- comunidades públicas;
- creación, Join/Leave, feed, comentarios/likes y administración básica reales;
- extensiones avanzadas se validan dentro del módulo real;
- posts de comunidad no contaminan Feed global por defecto.

Gate 6: CERRADO.  
Gate 7: CERRADO.  
Gate 8: CERRADO.

Backend:
- `20261007014214 communities_mvp_core`;
- `20261007014624 fix_community_storage_policies`;
- build local PASS;
- RLS/ownership/counters PASS;
- Security Advisor sin findings nuevos atribuibles.

Estado técnico final:
- PR #18 fusionado a `main`;
- merge commit: `169b9a47453de0653a3aba27338ea80cd046e0d6`;
- build local PASS confirmado por Product Owner;
- prueba visual/end-to-end PASS;
- núcleo real y fake doors contextuales validados;
- señales legacy limpiadas;
- Security Advisor sin findings nuevos atribuibles a Comunidades.


---

## Fase 8 — Lugares, mapa y Check-ins
**Estado: COMPLETADA — GATE 8 CERRADO / GATE 9 MEDICIÓN**

### Objetivo
Hacer funcional el descubrimiento local.

### Alcance
- consumir `pet_places` reales;
- listado y detalle;
- categorías;
- búsqueda;
- mapa real;
- check-in temporal por mascota;
- contador activo;
- privacidad de ubicación;
- creación/sugerencia de lugares según decisión de producto.

### Decisiones de producto cerradas
- Mapbox GL JS;
- ubicación solo por acción explícita y uso efímero;
- no persistir GPS exacto;
- PAZO publica lugares y usuarios sugieren;
- check-in 2 horas;
- contador público + identidad de mascota solo con opt-in;
- modelos 3D GLB/glTF por categoría preparados desde arquitectura.

Gate 6: CERRADO / aprobado.  
Gate 7: CERRADO.  
Gate 8: CERRADO — Scope Closure Reconciliation PASS.

Estado técnico final:
- PR #20 fusionado a `main`;
- merge commit: `ca3fedd977e0720839a420f2e3673942871b7a61`;
- build local PASS;
- Mapbox runtime PASS;
- ubicación del dispositivo solo bajo acción explícita y uso efímero;
- 0 GPS exacto persistido;
- catálogo real inicial + lugares demo archivados;
- check-in privado/visible, expiración, cambio de lugar y checkout manual: PASS;
- aislamiento entre cuentas: PASS;
- sugerencias de lugares: PASS;
- búsqueda/filtros/detalle: PASS;
- Security Advisor sin findings nuevos atribuibles a Fase 8;
- migraciones aplicadas:
  - `20261007052747 phase_8_places_map_core`;
  - `20261007052749 phase_8_places_initial_catalog`;
  - `20261007053859 fix_place_checkin_checkout_rls`.

Fuentes:
- producto: `docs/PAZO_PHASE_8_PLACES_MVP_SPEC.md`;
- arquitectura: `docs/PAZO_PHASE_8_PLACES_ARCHITECTURE.md`;
- estado: `docs/PAZO_PHASE_8_PLACES_MASTER.md`.

---


### Corrección de cierre — FINALIZADA
- PR #22 fusionado a `main`;
- merge commit: `f775ce75f680a7059dbb7ccef9084816a1c3a299`;
- 6 fake doors contextuales implementadas;
- Supabase registry `20261007072355 place_extension_experiments`: APPLIED;
- runtime `Me interesa` + F5: PASS;
- 6 modelos glTF low-poly por categoría: implementados;
- veterinaria 3D: PASS después del fix de visibilidad;
- parque/sendero: PASS;
- build local Product Owner: PASS;
- backend QA: PASS;
- Security Advisor: sin findings nuevos atribuibles a Fase 8;
- `main` verificado después del merge;
- Scope Closure Reconciliation: PASS.

Fase 8 queda cerrada. Sus extensiones experimentales pasan a medición post-lanzamiento; no se construyen automáticamente por existir interés.

## Fase 9 — Cuidados y documentos privados

**Priorización:** `docs/PAZO_MVP_MODULE_PRIORITY.md`

### 9A — Agenda/Cuidados
**Estado: COMPLETADA**

**Sub-ruta de producto:** `docs/PAZO_PHASE_9A_CARE_MASTER.md`  
**Arquitectura técnica:** `docs/PAZO_PHASE_9A_CARE_ARCHITECTURE.md`

Decisión:
- BUILD NOW;
- utilidad individual;
- no depende de masa crítica;
- producto MVP especificado, arquitectado, implementado y validado.

Alcance funcional:
- cuidados persistentes por mascota;
- próximos/hoy/vencidos;
- completar/deshacer;
- historial real;
- edición/eliminación;
- recurrencia simple;
- reminder interno;
- privacidad owner-only.

### Estado técnico final
- PR #12 fusionado a `main`;
- commit de merge: `1876f7f02a452e58597a1c8151af77bc26c519f2`;
- build local aprobado por Product Owner;
- prueba visual/end-to-end aprobada por Product Owner;
- migración 9A aplicada a Supabase y registrada como `20261006054510 care_agenda`;
- `care_items` + `care_completions` reales;
- RLS/grants owner-only aplicados y auditados;
- completar/deshacer/archivar atómicos;
- frontend sin mock de Agenda;
- crear, editar, archivar, completar y deshacer persistentes;
- estados Próximo/Hoy/Vencido;
- historial paginado en bloques de 20;
- reminders internos según `Recordarme` y timezone;
- contador/resumen actualiza en carga, F5, mutaciones y cambio de mascota;
- banner superior reservado a rescate/avistamientos;
- feedback `Completando…` y bloqueo de doble clic en completion;
- pruebas SQL/RLS con `ROLLBACK` aprobadas: owner/non-owner, one-off, recurrencia, double-complete, undo, archive e historial;
- Advisors post-apply revisados sin hallazgos nuevos de seguridad atribuibles a 9A.

### 9B — Documentos privados
**Estado: COMPLETADA**

**Sub-ruta de producto:** `docs/PAZO_PHASE_9B_DOCUMENTS_MASTER.md`  
**Arquitectura técnica:** `docs/PAZO_PHASE_9B_DOCUMENTS_ARCHITECTURE.md`

Gates 0–7 cerrados. Resultado Gate 5: **MVP REDUCIDO**.

Núcleo aprobado: documentos privados owner-only. Compartir externamente queda fuera del MVP y se reevalúa después.

### Estado técnico final
- PR #14 fusionado a `main`;
- commit de merge: `6f833b779ef1a62d7321bc50dbab8c220f92a1d3`;
- build local PASS confirmado por Product Owner;
- prueba visual/end-to-end aprobada por Product Owner;
- tipos reales `PetDocument`;
- mocks `INITIAL_DOCS` y `PrivateDoc` retirados;
- `documentService.ts` y `DocumentsModal.tsx` reales;
- carga inicial, contador, F5, cambio de mascota y paginación reales;
- upload/preview/download/edit/delete reales;
- lifecycle recuperable `uploading/active/deleting`;
- migración base aplicada y registrada como `20261006090551 private_pet_documents`;
- hardening de políticas aplicado y registrado como `20261006090654 fix_private_document_storage_policies`;
- bucket privado `pet-documents` verificado con límite 10 MB y MIME PDF/JPEG/PNG/WEBP;
- wrappers públicos SECURITY INVOKER + helpers privilegiados en `document_private`;
- RLS/grants owner-only verificados;
- upload arbitrario sin reserva bloqueado;
- pruebas transaccionales DB/RLS aprobadas con `ROLLBACK`;
- aislamiento owner/non-owner aprobado;
- Security Advisor sin hallazgos nuevos atribuibles a 9B;
- prueba real de Storage API aprobada: upload, preview, download, edit, delete, F5 y multi-pet;
- bug visual de delete diferido corregido con reintentos de finalize + retiro inmediato de UI + reconciliación en background;
- compartir externamente permanece fuera del MVP.

Se separa de Agenda por mayor superficie de seguridad.

Alcance futuro:
- metadata persistente;
- Storage privado;
- upload;
- preview/descarga;
- categorías;
- URLs firmadas temporales;
- eliminación;
- aislamiento fuerte por propietario.

### No entra
- diagnóstico médico;
- telemedicina;
- recomendaciones clínicas automáticas.

---

## Fase 10 — Mensajería 1 a 1
**Estado: PLANIFICADA**

`MessagesModal` usa conversaciones mock.

### Objetivo
Mensajería persistente entre cuentas/mascotas.

### Alcance
- conversaciones;
- participantes;
- solicitudes;
- aceptar/rechazar;
- mensajes;
- unread;
- timestamps;
- RLS;
- Realtime después de persistencia estable;
- bloqueo básico de abuso.

### Regla
No almacenar mensajes como estado local como fuente de verdad.

---

## Fase 11 — Sistema general de notificaciones
**Estado: PLANIFICADA**

Fase 6 introduce la primera notificación real de rescate. Esta fase generaliza el sistema.

### Alcance
- Follow;
- comentarios;
- mensajes;
- comunidades;
- cuidados;
- rescate;
- unread;
- marcar leída;
- deep links internos;
- preferencias.

### Segunda etapa
- Push Web/PWA una vez estable la bandeja persistente.

---

## Fase 12 — Global Search / Explore
**Estado: COMPLETADA — GATE 8 CERRADO / GATE 9 MEDICIÓN**

### Objetivo
Que “Explorar” encuentre contenido real y navegue a entidades reales, sin prometer capacidades que todavía no existen.

**Sub-ruta activa:** `docs/PAZO_PHASE_12_EXPLORE_MASTER.md`

Gate 0 — auditoría real: CERRADO.  
Gate 1 — valor: CERRADO.  
Gate 2 — coste/dependencias: CERRADO.  
Gate 2.5 — Idea Bank: CERRADO.  
Gate 3 — experimento mínimo: CERRADO sin código adicional.  
Gate 5 — decisión: MVP REDUCIDO.  
Gate 6 — especificación: CERRADO.  
Gate 7 — CERRADO.  
Gate 8 — CERRADO.  
Gate 9 — MEDICIÓN.  
Supabase / build / runtime / Product Owner acceptance: PASS.

### Alcance
- mascotas;
- comunidades;
- lugares;
- eventos si ya existen;
- búsqueda;
- filtros;
- paginación;
- recomendación contextual;
- navegación a perfiles reales.

---

## Fase 13 — Rediseño visual y sistema de interfaz
**Estado: EN CURSO — auditoría visual enfocada autorizada por Product Owner (2026-10-12), sin cambios de UI aún**

### Objetivo
Elevar la calidad visual de PAZO sin alterar las funcionalidades ya aprobadas.

Esta fase permite rediseñar pantallas completas o componentes individuales manteniendo intactos sus contratos funcionales.

### Alcance
- auditoría visual completa de todas las pantallas;
- jerarquía visual;
- tipografía;
- espaciado;
- grid;
- márgenes;
- botones;
- inputs;
- tarjetas;
- contenedores;
- modales;
- navegación;
- header;
- tabs;
- estados seleccionados;
- estados vacíos;
- loaders;
- errores;
- feedback visual;
- iconografía;
- sombras;
- bordes;
- radios;
- densidad visual;
- responsive móvil/escritorio;
- microinteracciones y animaciones;
- consistencia entre módulos;
- creación o consolidación de design tokens;
- componentes UI reutilizables cuando reduzcan inconsistencias.

### Regla principal
**Rediseño visual ≠ cambio funcional.**

Durante esta fase:
- no cambiar reglas de negocio;
- no cambiar ownership ni RLS;
- no cambiar contratos de Supabase;
- no cambiar qué hace un botón;
- no eliminar funciones existentes;
- no introducir nuevas funcionalidades sin aprobación explícita;
- no modificar flujos UX funcionales solo porque “se verían mejor”.

Si una propuesta visual requiere cambiar comportamiento, navegación, información mostrada o estructura funcional, debe registrarse como **DECISIÓN PENDIENTE** y aprobarse por separado.

### Método de trabajo
El rediseño debe hacerse por bloques y no como cambio masivo ciego:

1. definir sistema visual base;
2. aprobar componentes principales;
3. rediseñar navegación y layout global;
4. rediseñar Feed;
5. perfiles;
6. Explore;
7. mapa/lugares;
8. cuidados;
9. mensajería;
10. modales y flujos secundarios;
11. estados vacíos/error/loading;
12. revisión responsive y accesibilidad.

Cada bloque se prueba antes de continuar para evitar propagar una dirección visual incorrecta a toda la app.

### Pendientes visuales heredados de Fase 6
- animación de un perrito en estado de alerta al activar/buscar una mascota perdida;
- títulos visuales personalizados para cada tipo de alerta/notificación;
- revisar la presentación final de etiquetas, encabezados y jerarquía visual del sistema de rescate.

Estos puntos son exclusivamente estéticos y no bloquean la funcionalidad de rescate.

### Definition of Done
- todas las pantallas incluidas en Beta siguen una misma línea gráfica;
- no quedan estilos claramente pertenecientes a prototipos anteriores;
- botones, inputs, cards y contenedores tienen reglas consistentes;
- mobile y desktop mantienen buena jerarquía;
- funcionalidades existentes siguen pasando las mismas pruebas;
- no aparecen regresiones de Feed, navegación, formularios o modales;
- Product Owner aprueba visualmente la interfaz final.

---

## Fase 14 — Confianza, moderación y privacidad
**Estado: OBLIGATORIA ANTES DE BETA PÚBLICA**

**Contrato canónico adicional:** `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md`

### Alcance
- reportar contenido;
- reportar perfil;
- bloquear usuario/mascota;
- ocultar contenido;
- moderación;
- eliminación/cierre de cuenta;
- borrado de mascota;
- manejo de contenido eliminado;
- procedimiento de contenido ilegal/abusivo;
- proceso para copyright/IP/UGC;
- límites básicos contra spam;
- revisión final de datos públicos vs privados vs sensibles;
- política de archivos;
- data inventory;
- retention/deletion matrix;
- procedimiento si PAZO obtiene conocimiento de una cuenta menor de edad;
- Privacy Policy real;
- Terms of Use reales;
- inventario de terceros/proveedores y datos enviados;
- auditoría de tracking/analytics;
- auditoría de RLS completa.

### Regla
No habilitar session replay/autocapture ni recolectar DOB/ID/GPS exacto para analytics por defecto. Cualquier excepción requiere una decisión explícita de privacidad/producto.

---

## Fase 15 — PWA, rendimiento y preparación de Beta
**Estado: PLANIFICADA**

### Alcance
- manifest;
- instalación;
- iconos;
- service worker según necesidad;
- estados offline seguros;
- lazy loading/code splitting;
- reducir bundle;
- imágenes;
- accesibilidad;
- errores y estados vacíos;
- responsive;
- performance;
- Leaked Password Protection cuando el plan/beneficio lo justifique;
- revisión de env/secrets;
- backups;
- restore drill no destructivo;
- logging/error monitoring;
- verificación de PostHog live ingestion/alerts;
- verificación de Vercel/Mapbox usage y spend controls;
- auditoría final de cookies/storage/client identifiers;
- pruebas de producción.

### Definition of Done
La aplicación puede entregarse a usuarios beta sin depender de mocks en el núcleo seleccionado para lanzamiento.

---

# 7. Gate — MVP/Beta

No llamar “MVP listo” hasta que:

- Fases 6 a 15 definidas como requeridas para Beta estén completadas o explícitamente descartadas por Product Owner;
- no existan mocks visibles en funcionalidades incluidas en Beta;
- RLS esté auditado;
- build de producción pase;
- flujo nuevo usuario → mascota → Feed → social → recuperación de cuenta funcione;
- manejo de errores básico exista;
- privacidad esté revisada;
- pruebas reales en móvil estén aprobadas.

---

# 8. Expansión posterior al MVP

Estas funciones pertenecen al concepto original de PAZO, pero no deben entrar automáticamente en una fase sin especificación funcional.

## Fase 16 — Monetización base
**Estado: BACKLOG**

**Decisiones de producto registradas (PO 2026-10-13):** membresía voluntaria **«Amigo de PAZO» de USD 2.99 al mes, con una sola periodicidad mensual y SIN plan anual por ahora**, manteniendo el núcleo de PAZO gratuito. Una opción anual futura requiere otra aprobación del PO. **Primera recompensa aprobada:** insignia «Amigo de PAZO» visible en el perfil social y miniinsignia sobre la foto/avatar del autor de publicaciones, **solo con membresía activa verificada en backend**. **Tres recompensas adicionales también aprobadas:** personalización cosmética de perfil; muro público voluntario «Gracias, Amigos de PAZO» con opt-in revocable; insignia con detalles conmemorativos por 3, 6 y 12 meses de apoyo acumulado, sin jerarquías. Implementación técnica/visual, tratamiento de historial/reembolsos, consentimiento, reglas de elegibilidad y cancelación/gracia continúan pendientes. **Visual de fondos cosméticos aceptado por PO (2026-10-13):** cinco temas, navegación directa desde Mi mascota, flotación ligera y tipografía de alto contraste en Cielo estrellado; implementación todavía preview local sin persistencia ni entitlement. Siguiente beneficio: muro opt-in «Gracias, Amigos de PAZO», con **opción 2 cuadrícula + pantalla dedicada + tabs Todos/Recientes/Más tiempo apoyando** aprobados y corrección PO **PET-ONLY** (foto y nombre de mascota; ningún nombre humano ni @usuario inventado). Acceso público actualizado por el PO: **Bienvenida A01 → «Conoce a los Amigos de PAZO» → muro dedicado**, incluso sin registrarse (implementación y apariencia de enlace A01 **aprobadas por PO en Vite 2026-10-13**), **NO en Explorar**. Desde **Mi mascota → Amigo de PAZO** permanece la selección privada simulada, sin persistencia. La navegación de lectura pública para usuarios ya autenticados queda pendiente. Las **reglas de consentimiento, elegibilidad y salida del muro fueron APROBADAS como producto por PO el 2026-10-13**; el consentimiento auténtico todavía no está implementado. Plan técnico READ ONLY disponible en `docs/PAZO_SUPPORTER_WALL_BACKEND_DESIGN_PREFLIGHT_20261013.md`. **Gate técnico de consentimientos base aplicado con autorización PO el 2026-10-13:** `supabase/migrations/20261013215221_f16_supporter_wall_consents_foundation.sql`, Supabase versión `20261013215221` (`f16_supporter_wall_consents_foundation`); CI previa PASS run `38473628996` y verificación alojada READ ONLY PASS: tabla privada, RLS forzada, 0 consentimientos, anon sin accesos ni RPC de lista pública, entitlement stub siempre false. Pruebas sintéticas conservadas en `supabase/tests/supporter/`. **Esto NO cambia F16 BACKLOG, no habilita consentimientos reales ni pagos, no publica mascotas, no autoriza PayPal, checkout, nuevos grants o despliegue.** **Decisión PO posterior:** el rediseño integral de la pantalla A01 Bienvenida queda en BACKLOG VISUAL separado; no tocar actualmente el enlace público «Conoce a los Amigos de PAZO» ni las rutas de inicio de sesión/registro durante la integración F16. Se definirán opciones visuales cuando el PO reactive el tema. Pendientes: aprobación de texto final ES/EN, retención/privacidad, verificación de pagos segura y acceso autenticado al muro, cada gate por separado. **Propuesta preparada 2026-10-13 (SIN ejecutar):** `docs/PAZO_F16_CONSENT_COPY_BILLING_VERIFICATION_GATE_20261013.md` contiene textos exactos de consentimiento por mascota ES/EN y contrato de verificación de pagos. PayPal es candidato, no elegido definitivamente; se requieren cotización real y aprobación del PO antes de habilitar cualquier plan/checkout. Bienvenida A01 conservada y rediseño de bienvenida sigue BACKLOG.

**Gate de COPY SUPERADO 2026-10-13:** el PO aprobó el aviso contextual ES/EN por mascota; se integró **únicamente en GratitudeParticipationPreview**, con botones «Autorizar a [mascota] · Simulación», «Ahora no» y «Quitar del muro · Simulación», sin ninguna persistencia, consulta de pago ni publicación. Commit `32551f5e`, CI `38476612061` SUCCESS. **Gate visual de esta pantalla en Vite pendiente del PO**; aceptación del copy no equivale a términos legales o aprobación del flujo final. Persisten restricciones de F16 y bienvenida A01 intacta.

- membresías;
- beneficios;
- PayPal o pasarela definitiva;
- estados de suscripción;
- entitlement backend;
- restaurar compras;
- cancelación;
- fundador/premium.

Antes de implementar, cerrar los demás detalles de producto y confirmar las condiciones de suscripción y tarifas vigentes de PayPal. El precio mensual USD 2.99 ya está decidido.

## Fase 17 — Parejas / Matches de mascotas
**Estado: BACKLOG**

Idea original:
- descubrir perfiles;
- match;
- pago/membresía para funciones premium.

### DECISIONES PENDIENTES
- propósito exacto del match;
- seguridad;
- filtros;
- consentimiento;
- qué parte es paga.

## Fase 18 — Adopciones
**Estado: BACKLOG**

- organizaciones/perfiles autorizados;
- animales disponibles;
- filtros;
- solicitudes;
- estados;
- moderación y verificación.

## Fase 19 — Servicios para mascotas
**Estado: BACKLOG**

- paseadores;
- grooming;
- veterinarias;
- perfiles de negocio;
- panel profesional;
- disponibilidad/citas;
- reseñas;
- verificación.

Debe dividirse en subfases antes de programar.

## Fase 20 — Tiendas / negocios / publicidad
**Estado: BACKLOG**

- tiendas;
- catálogo;
- negocio local;
- anuncios/promoted content;
- herramientas comerciales.

No mezclar e-commerce completo con el MVP social sin decisión explícita.

---

# 9. Deuda conocida / limpieza

No convertir esta lista en una fase automáticamente; resolver cuando corresponda.

- `README.md` sigue siendo el README genérico de Vite.
- `src/data/mockData.ts` todavía alimenta módulos incompletos.
- existe `CreateModal - copia.tsx`, probable archivo duplicado a retirar después de verificar uso.
- `INITIAL_PETS` sigue sirviendo como fallback inicial en memoria; revisar cuando se termine la eliminación de mocks.
- Agenda/Cuidados y Documentos privados son reales y persistentes.
- Messages son mock/local.
- algunos flujos del menú Crear anuncian “próximamente”.
- bundle ya ha mostrado warning de chunk >500 kB; atender en Fase 15.
- Leaked Password Protection pendiente en Supabase Auth.
- Fase 6 cerrada; PR #6 fusionado al completar esta actualización.

---

# 10. Regla de estado de fases

Usar únicamente:

- **COMPLETADA** — merged en main + backend aplicado + pruebas aprobadas.
- **EN CURSO** — se está implementando.
- **SIGUIENTE** — primera fase autorizada para comenzar.
- **PLANIFICADA** — definida pero no autorizada todavía.
- **PAUSADA** — trabajo existente, detenido conscientemente.
- **BACKLOG** — idea futura que requiere definición.
- **DECISIÓN PENDIENTE** — prohibido inventar comportamiento.

---

# 11. Próximo paso exacto

## Selección del siguiente módulo

Fase 12 está COMPLETADA y pasa a Gate 9 / medición.

No existe un siguiente módulo autorizado automáticamente.

Candidatos conocidos:
- Fase 13 — Rediseño visual y sistema de interfaz: PLANIFICADA;
- Fase 14 — Confianza, moderación y privacidad: OBLIGATORIA antes de Beta pública;
- Fase 10 — Mensajería: POSPONER / REEVALUAR;
- Fase 11 — Notificaciones generales: implementar por dependencia concreta.

### Exact next action
Seleccionar el siguiente módulo mediante `docs/PAZO_MODULE_LIFECYCLE.md` antes de implementar.

## Do not do
- no reabrir Fase 12 salvo regresión o nueva decisión de producto;
- no convertir datos de Gate 9 en features automáticamente;
- no iniciar Fase 13/14/10/11 por numeración sin decisión de producto.


---

# Production Hardening — infraestructura pre-Beta
**Estado: EN CURSO**

**PR #30 / tranche implementado:** MERGED to `main` at `c179182c79c587c7727277a966cc09704002ce10`; Architecture/Privacy Reconciliation PASS; Product Owner validation PASS; governance CI PASS.

Sub-ruta:
`docs/PAZO_PRODUCTION_HARDENING_MASTER.md`

Prioridad:
- P0 webhook PayPal + entitlement seguro;
- P0 retirar pitch prematuro;
- P1 Error Boundary + CI + observabilidad;
- P1 modernizar claves/Auth;
- P1 alertas de salud/costos;
- P2 anti-abuse, ruido operacional, restore drill y analytics.

Esta fase de infraestructura está autorizada por el Product Owner y no constituye autorización para decidir automáticamente precio o beneficios de la membresía.

---

## Checkpoint vigente — QA local del MVP 2026-10-09

**Evidencia posterior a los párrafos históricos de roadmap.** El PO abrió PR #36 commit `b49ecd3` en Antigravity/localhost (frontend local, Supabase alojado) y declaró PASS en login/pantalla de recuperación, Feed/paginación, mensajes honestos, publicación, interacciones y comentarios con F5, perfiles/follows; además confirmó funcionamiento general de todos los módulos. Ver `docs/PAZO_MVP_LOCAL_ACCEPTANCE_20261009.md` para alcance y límites. Esto **cierra el smoke funcional local, no Gate 8 de F14 ni el Release Gate público**.

**Ruta crítica ahora:** no repetir módulos; verificar PR #36/CI actual, gestionar merge solo con autorización PO, validar email real de Auth, resolver mínimo operacional F14 de reportes/eliminación y textos legales, evitar regresión de Mapa dev-only en PR #35 y obtener artefacto de release cuando sea viable sin upgrade Vercel. No abrir fases 10/11/13 por defecto.

**Regla visual firme:** cero contornos en componentes (única excepción justificada en fields de texto), incluso en estados de foco; espaciado login queda para revisión visual futura, no blocker funcional. El PO conserva modificaciones F14 sin commit en su carpeta local original; conservarlas.

**Situación GitHub al checkpoint:** `main` `ae7e63f`, PR #36 DRAFT (sin merge), PR #35 DRAFT (F14 pausada), PR #34 OPEN (rollout Lugares). La comprobación de funcionamiento local no implica que esos PRs estén listos para integrar ni que la beta pública esté autorizada.

## Actualización F14 — integración acotada hacia Beta, 2026-10-09

PR #37 (DRAFT) **no cierra Gate 8**. PR #36 fue aceptado funcionalmente en local y es base de integración. PR #37 reutiliza las RPC de reportes y colas moderadoras ya aplicadas a Supabase alojado para conectar cinco clases de denuncia a UI, sin fusionar PR #35 (F14 A2 avanzada) ni reintroducir su guard `import.meta.env.DEV` que altera el Mapa real. CI `37944094738` SUCCESS en commit `eda27bc`; QA real de reportes pendiente.

**Bloqueadores de release siguen**: retirada de medio físico/Storage/CDN D3-A; ruta íntegra de eliminación cuenta/mascota A3; matriz D3-B y textos públicos A4; confirmación/recovery email real; reconciliación de PR #34 de Lugares y PR #35 sin desactivar funciones históricamente aprobadas. No cambiar scope aprobado por llamarlo «mínimo» ni equiparar botones visibles con seguridad verificada. Ningún gasto, merge, migración ni despliegue autorizado por este checkpoint. Ver `docs/PAZO_F14_BETA_REPORTING_PILOT_20261009.md`.

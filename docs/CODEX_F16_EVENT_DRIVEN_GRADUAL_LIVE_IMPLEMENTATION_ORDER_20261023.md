# ORDEN DE EJECUCIÓN A CODEX — PAZO F16, apertura gradual automática PayPal Live

**Fecha:** 2026-10-23
**Orden del Product Owner:** «Excelente, que lo haga Codex».
**Estado:** TRABAJO AUTORIZADO **EN RAMA DE CÓDIGO**, NO habilitación de cobros ni despliegue a producción.
**Repositorio:** `DigitalAppcorp/pazo-app`
**Base actual de integración:** `f17/beta-final-mobile-support-admin-20261022`, PR #81 DRAFT; verificar HEAD en GitHub en el momento de arrancar, no asumir SHA histórico.
**Propósito:** implementar **todo el motor de apertura gradual**, frontend, backend, Supabase migration versionada, notificaciones, Administración y pruebas hasta estado `CODE_DONE / READY_FOR_HOSTED_GATE`. **No limitarse a planear; escribir código, probar, corregir y documentar.**

## 0. Lectura obligatoria y precedencia para resolver contradicciones

1. `AGENTS.md` (reglas permanentes de trabajo y seguridad).
2. `docs/PAZO_ACTIVE_HANDOFF.md` (leer el principio vigente y las secciones F16/F17).
3. `docs/PAZO_MASTER_ROADMAP.md` (gate y scope vigentes).
4. `docs/PAZO_F16_GRADUAL_LIVE_ROLLOUT_PRODUCT_SPEC_20261023.md` (**GR-01…GR-22**; flujo completo de usuario, PAZO, Administración).
5. `docs/PAZO_F16_EVENT_DRIVEN_LIVE_ROLLOUT_20261023.md` (**EV-01…EV-15 / EVT-01…EVT-19**, fuente vigente de los umbrales/eventos).
6. `docs/PAZO_FIRST_LIVE_SUPPORTER_AUTOMATED_PILOT_PROPOSAL_20261023.md` (historial de ideas a preservar: dos notificaciones y comprobación de excelencia).
7. `docs/PAZO_MODULE_LIFECYCLE.md`, `docs/PAZO_ARCHITECTURE_CONTRACT.md`, `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md`, `docs/PAZO_DATA_INVENTORY.md`.
8. `docs/CODEX_F16_BETA_LAUNCH_COMPLETION_ORDER_20261021.md` (orden histórica para completar beta y proteger Live; **muchos detalles de rama, claves y checkout han evolucionado** desde el 21-oct; auditar antes de ejecutar).
9. Migraciones y módulos F16/F17 reales; scripts de pruebas y GitHub Actions existentes.

**Precedencia:** el PO aprobó posteriormente las etapas **1→5→20→50** y expresamente **eliminó la espera de 24h**. Nunca codificar la propuesta anterior `1→5→20` como techo final, ni el requisito anacrónico de canary individual como condición para admitir el primer comprador real dentro del modo limitado. La compra del primer cliente no exige cancelarle la renovación. No borrar documentación histórica: indicar «superada» y enlazar la vigente.

## 1. Scope cerrado — lo que Codex DEBE construir

### 1A. Campaña / demanda (frontend + backend + Supabase)

- Invitación **inicial a cinco cuentas elegibles** dentro de la bandeja PAZO; **72h** para responder si todavía no iniciaron checkout. Elegibilidad desde permisos existentes; no inferir identidad PayPal por correo, IP ni señales invasivas.
- «Quiero participar» = interés; «Ahora no» = opt-out campaña, sin pérdida de PAZO gratis. Consentimiento al checkout separado y explícito con **USD 2.99/mes, renovación y cancelación**.
- **Captura de interés abierta** desde la pantalla Amigo de PAZO aun para usuarios que no recibieron invitación. Persistencia **cola FIFO por Auth user**, dedupe de cuentas/mascotas y campaña, retirar interés voluntariamente. Contemplar **25 o más interesados** sin perder filas.
- `waiting` / `slot_granted` / `paying` / `payment_verifying` / `benefits_active` / `issue` visibles al usuario. GET de estado propio en carga, foreground, retorno PayPal y reconexión; Realtime puede acelerar pero nunca sustituye servidor.
- Reserva de cupo atómica + bloqueo por revisión/lease, claim seguro, idempotency key por user+campaign/intento. El cliente no asigna cupos por su cuenta. Una reserva iniciada en proveedor o incierta **no se libera por reloj**; solo tras conciliación terminal confiable del intento PayPal. Conservar `resume` y `abandon_pending` existentes del checkout Live probados por PO.
- Frente a varios interesados y pocos cupos, **nadie es cobrado por estar en cola**; mostrar disponibilidad honesta, sin prometer fecha. La primera notificación puede cambiar el contenido/estado del **mismo hilo lógico** a «Tu cupo está disponible» (no spam/tercera notificación de campaña).

### 1B. Máquina de promociones totalmente automática POR EVENTO

| Etapa | Capacidad **acumulada de compradores distintos** | Gatillo exacto |
| --- | ---: | --- |
| `L1_FIRST_REAL` | **1** | Primer GO expreso del PO para activar campaña Live real, en fase posterior (NO Codex) |
| `L2_SMALL` | **5** | **1 comprador distinto** con primera venta real `COMPLETED`, evento firmado/GET confiable, plan/merchant/cantidad correctos, período pagado persistido y beneficios activos |
| `L3_BETA` | **20** | **3 compradores distintos** que cumplen lo anterior, sin incidentes financieros críticos abiertos |
| `L4_EXTENDED` | **50** | **10 compradores distintos** que cumplen lo anterior, sin incidentes financieros críticos abiertos |
| `LIMITED_COMPLETE` | **50** | 50 compradores distintos ya admitidos; nuevos interesados esperan |
| `PUBLIC` | ilimitado | **SOLO** nuevo GO PO explícito con MFA posterior, jamás automático |

- Autoabrir **en el evento de verificación backend/Supabase** que cumple el umbral, sin programar esperas por días/24h ni pedir clic al admin para L2/L3/L4. El motor asíncrono/outbox reintenta en caso de interrupción.
- Umbrales cuentan compradores distintos **con período Live acreditado + entitlement de pago proyectado**. No cuentan duplicados, renovaciones como compradores nuevos, cortesías admin, `ACTIVE` sin cobro, feedback humano, Sandbox, refunds/holds/anomalías.
- Los **cupos son acumulados**: cancelados **no** liberan una plaza histórica ya consumida. Un intento terminal SIN cobro y SIN proveedor pendiente puede liberar solo su reserva provisional. Las renovaciones no consumen cupos nuevos.
- Atomizar `stage_revision`, `max_capacity`, `admitted_distinct`, pending reservations y asignación FIFO; lock/CAS/unique constraints/RLS service-only. No sobrepasar el techo de 50 ni siquiera por carreras concurrentes.
- No depender solo de un listener efímero en navegador o Edge. Base durable es verdad, jobs recuperan efectos faltantes. Evitar loops de reintento financiero que creen doble suscripción.

### 1C. Integración PayPal y condiciones de STOP

- **Reusar** checkout Live, webhook firmado, ledger paid-periods, worker renovaciones/reembolsos/holds, generación original, secreto Vault, MFA/consent, rutas oficiales ya implementadas. Auditar el guard alojado existente (`canary` original vs `public` y restricciones previas) y preparar una migración `LIMITED` que **no quite** integridad de producción.
- Antes de crear una suscripción, backend revalida cliente autenticado, reserva/cupo y salud de webhook/worker; GET de readiness no concede permiso definitivo.
- Solo venta real `PAYMENT.SALE.COMPLETED` verificada y conciliada cuenta; no salida positiva por redireccionamiento, estado PayPal `ACTIVE` o simulación.
- Si firma/merchant/plan/importe/ledger/beneficios o worker están críticos: **pausa de NUEVOS checkouts**, conserva interés/cola y ALERTA admin; reintenta reconciliación segura. **No** pausar lecturas de membresía, cancelación de renovaciones, refund/disputa, webhook, pagos ya existentes ni acceso gratuito.
- Resolver primero el **intent Live abierto preexistente** cuando la rama migre el control, **sin borrarlo, duplicarlo ni atribuirle un pago**.
- Cuando evento financiero está pendiente/ambigüo, usar `REVIEW_REQUIRED` y `verificando`; conservar historial; no liberar plaza ni habilitar entitlements falsos.
- Umbrales requieren salud / ausencia de incidentes financieros críticos en cada transición. Feedback de «Todo funciona» es UX, nunca comprobante.

### 1D. Notificaciones, UI y Administración

- **Notificación 1:** invitación voluntaria de $2.99/mes con «Quiero participar» / «Ahora no», puede actualizarse al estado cupo disponible en mismo hilo. **Notificación 2:** agradecimiento una sola vez solo después de **pago firmado+período acreditado+beneficio verificable**, CTA de comprobación voluntaria.
- Comprobación beneficios existentes (insignia en perfil/publicaciones, acceso y gestión); botones «Todo funciona correctamente» / «Encontré un problema» / omitir; problema crea ticket privado y se ve en Administración. Respuesta/ausencia no cambia entitlement.
- UI ES/EN, mobile PWA, reglas visuales **cero contornos**, sin parpadeo falso de paga/beneficios, sin nuevos push/email/SMS por defecto.
- Admin responsive: capacidad por etapa, compras distintas admitidas, en reserva, pendientes y confirmadas, ingresos desde ledger **real** separados de concesiones de cortesía, cola y abandono, verificación de beneficios, notificaciones, opiniones, incidentes y salud del worker.
- Admin controla pausa/reanudación, estado de campaña, diagnósticos y auditoría con MFA/nonce/CAS. **No hacer botón público ilimitado operativo** por accidente. Mantener kill switch existente y modo mantenimiento aparte.
- Configurar privacidad/retención/borrado y accesos RLS conforme `PAZO_PRIVACY_DATA_GOVERNANCE.md` + inventario. Datos mínimos, sin payload PayPal, email, contenido de mensajes o PII adicional en telemetría.

## 2. Ruta de implementación y controles de trabajo (no detenerse tras escribir un plan)

**Paso 0 — Auditoría antes de tocar código.** Confirmar HEAD de PR #81 y git status limpio. Hay trabajo F17 simultáneo. Preparar **rama técnica propia derivada del HEAD F17 actual** (por ejemplo `f16/gradual-live-event-rollout-20261023`) y **PR hacia F17**; no sobrescribir ni resetear commits concurrentes. Si se trabaja en la misma rama por restricciones del entorno, comprobar SHA/estado y coordinar cambios. Evitar editar el resto de módulos PWA/Mapbox o rebase destructivo.

**Paso 1 — Modelo y pruebas DB.** Diseñar migración PostgreSQL para `LIMITED`, cuotas, cola, reservas, outbox, edición de notificación y auditoría; service-only RLS/FORCE/ACL, índices, cleanup sin purgar evidencia financiera. Escribir pruebas PG17 en laboratorio, primero ROLLBACK, luego COMMIT en DB de prueba; alojado apagado. Registrar migración exacta, qué reusa y nueva finalidad/retención.

**Paso 2 — Servidor y worker.** Integrar RPC de admisión y checkout Live sobre modos existentes, event-driven promotion durable, reintentos seguros, STOP de nuevos checkouts. Mantener cancelación/renovación/reconciliación históricas habilitadas.

**Paso 3 — UI.** Bandeja, invitación/cola/permiso, estado de oferta/checkout, notificación de agradecimiento, revisión de beneficios y tickets. Admin dashboard con lectura segmentada y controles con fresh MFA.

**Paso 4 — QA automático/reconciliación.** Ejecutar **GR-01…GR-22 y EVT-01…EVT-19** sin simplificar alcance. Además pruebas específicas: 25/50/51 usuarios simultáneos, umbrales 1/3/10, doble click, webhook duplicado/fuera de orden, PWA reconexión, fallo entre grant y stage update, PayPal abandonado/volvido y cancelación de cuenta pagada sin liberar la plaza histórica; pruebas de que pausa impide CREATE pero permite cancelación/renovación. Verificar CI, build Vite, tests PG17, regresión F17 y módulo de mapa; no repetir al PO QA Sandbox previamente aprobado.

**Paso 5 — Documentar evidencia concreta.** Crear `docs/PAZO_F16_GRADUAL_IMPLEMENTATION_EVIDENCE_20261023.md` y actualizar handoff + roadmap con commits y enlaces CI, artefactos, migración, tests, fallos y pendientes exclusivamente humanos. Mantener DRAFT hasta gates de producción. Cerrar brechas técnicas reales; no declarar módulo listo por solo CI PASS.

## 3. Condiciones de autoridad — respetar incluso si el usuario dice «no pares»

**Autorizado:** auditar; programar código en rama aislada; escribir migraciones SQL versionadas **SIN aplicar al Supabase hospedado**; tests locales/sintéticos y CI en ramas/PR; editar la documentación de la fase; preparar panel/controles apagados.

**NO autorizado sin nuevo GO preciso del PO:** ejecutar migraciones en Supabase alojado; activar/enviar notificaciones a usuarios reales; desplegar cambios Edge alojados o Vercel producción; crear cargos PayPal Live; alterar merchant/plan/credenciales reales; quitar `canary` en producción; fusionar a `main`; elevar gasto o crear servicios de pago. No pedir credenciales, tokens ni secretos por chat. Si hay un bloqueo que requiere aprobación de hospedado, terminar mientras tanto código/pruebas y solicitar **solo la acción autorizable**, claramente delimitada.

**No atribuir permisos implícitos al issue o a esta orden:** el issue es una orden de trabajo en GitHub, no un mecanismo de arranque automático del agente ni una autorización de release financiero.

**Fuente histórica:** `docs/CODEX_F16_BETA_LAUNCH_COMPLETION_ORDER_20261021.md` fue escrita cuando checkout/merchant/PR eran diferentes. Respetar sus exigencias de robustez, pero adoptar las últimas decisiones y no reabrir bloqueos YA resueltos. No afirmar que «faltan claves PayPal» sin auditar el estado real.

## 4. Formato de cierre que debe entregar Codex

Entregar reporte con **`GR/EVT | PASS/BLOCKED | prueba directa | commit | enlace CI`** y estados independientes `CODE_DONE`, `DB_MIGRATION_PREPARED`, `DB_HOSTED_APPLIED`, `EDGE_DEPLOYED`, `USER_UI_QA`, `PAYPAL_LIVE_E2E`, `LIVE_LIMITED_RELEASE`, `PUBLIC_RELEASE`. No marcar PASS donde falta despliegue/gate. Dejar nota clara de la **única operación manual del PO** siguiente cuando se necesite permiso. **No terminar declarando éxito solamente por haber documentado esta orden.**

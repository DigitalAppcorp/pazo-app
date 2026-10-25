## PRODUCT HANDOFF — Amigo de PAZO: invitación inteligente de dos contactos (24-oct-2026)

**Acuerdo del Product Owner, todavía NO codificado:** transición futura a suscripciones Live públicas (cuentas elegibles, sin cola/cuotas), preservando medidas financieras y notificaciones. Primera invitación a pantalla completa tras retorno+uso significativo en momento no invasivo. Segunda invitación **14 días** después **solo como notificación interna**; luego silencio comercial permanente para esa campaña. Pueden pagar usuarios sin invitación desde `Mi mascota`. La notificación de agradecimiento/revisión se envía tras **pago real conciliado Y beneficios verificables**, incluso sin invitación previa. **El PO eligió la opción G — Crecimiento de PAZO**, ilustración de brote luminoso que nace sobre una huella en tierra y fondo verde bosque. La elección viene del tablero de ocho opciones, NO de los antiguos A–D. Falta diseño móvil final y revisión de textos. **No modificar producción por leer esta nota.**

Documento canónico: [PAZO — UX de invitaciones y Live público](PAZO_SUPPORTER_PUBLIC_LIVE_INVITATIONS_UX_20261024.md). El `gradual` actual permanece vigente en producción hasta implementación y GO específico; la lógica histórica 1→5→20→50 no es la dirección futura de producto.

---

## F17 PR #99 — F14 one-time SQL protected in active migrations (23-oct-2026 PDT)

Code-only proposal: `supabase/migrations/20261010043307_f14_media_jwt_claim_compat_single_test.sql` now uses the previously-reviewed structural-only/redacted F14 source. Original hosted SQL checksums remain in audit manifests and Git history, **no target-specific DO mutation is executable** through the active migration folder. GitHub guard test requires exact safe source. **Still NO_GO_DB_PUSH** due unavailable initial schema/replay and no PO production authorization; PR #99 remains DRAFT and can cause host auto-deploy if merged. [Evidence](docs/PAZO_F17_F14_ONE_TIME_SAFETY_REVIEW_20261023.md).

---

## F17 — ARCHIVO DE PREHISTORIA PROPUESTO, NO REPRODUCCIÓN (23-oct-2026 PDT)
**Rama derivada de PR #98, SIN merge:** las ocho fuentes SQL anteriores al historial remoto (`20261005*`) se mueven con **Git blob SHA idéntico** a `supabase/history/pre_migration_untracked/` (fuera de migraciones ejecutables). En la rama, solo **122/122 versiones** aparecen bajo `supabase/migrations/`; las ocho siguen preservadas y controladas por pruebas. **Esta acción es archivado de fuente, NO prueba de que todas las instrucciones se aplicaron, NO reconstrucción desde cero ni autorización para `db push`**. Aún no existe baseline pre-Oct5. Quedan 24 diferencias editoriales con secuencia SQL equivalente y 2 descriptores intencionales. **NO_GO_DB_PUSH / NO_MIGRATION_REPAIR / NO_MAIN_MERGE / NO_HOSTED_WRITE**. Ver `docs/PAZO_F17_PREHISTORY_ARCHIVE_PROPOSAL_20261023.md`.

---

## ALERTA DE MIGRACIONES — F17 integridad histórica fase 3 (23-oct-2026 PDT)

Auditoría SELECT y Git blob SHA1 sobre **122/122** versiones alojadas: **96 SQL idénticos**, **24 SQL equivalentes léxicamente pero con diferencias editoriales/transaccionales**, **2 entradas intencionalmente descriptivas insertadas así por sus propios scripts Git** (ambos marcadores y postflight funcional alojado verificados). **8 SQL locales pre-5-oct sin versión remota**. Commit raíz 3-oct no contiene esquema base. El laboratorio de F14 posterior detecta el bloqueo F4/F5 esperado: **diagnóstico PASS, replay completo NO certificado**. PR #98 DRAFT apilado sobre #97/#95. **NO `db push`, NO `migration repair`, NO merge a `main`, NO SQL alojado.** Ver [auditoría fase 3](PAZO_F17_MIGRATION_HISTORY_CONTENT_AUDIT_20261023.md).

---

## ALERTA DE MIGRACIONES — F17 Replay histórico NO GO (23-oct-2026 PDT)

El PR #97 (DRAFT) recuperó todas las 122 versiones remotas. Aún hay **8 migraciones locales anteriores a la primera versión hospedada**. Auditoría read-only: 83/83 objetos presentes, 9 SECURITY DEFINER con search_path controlado y sin EXECUTE de anon/authenticated. **El replay de las ocho contra catálogo posterior F14 falló**, run #40060715328: F4 `security_stabilization` intenta alterar `follows.follower_id` pero el fixture posterior ya tiene trigger F5 `trg_validate_follow_relationship`; las tres primeras migraciones corrieron sobre PG17 desechable y las demás quedaron sin ejecutar. El origen pre-Oct5 no está en las migraciones Git: **no se puede certificar restauración 130/130** ni `db push`. Requiere baseline previo verificable, replay completo aislado y revisión/GO nuevo. No tocar producción, `main` ni registros de `schema_migrations`. Detalle en [fase 2](PAZO_HISTORICAL_MIGRATION_PHASE2_AUDIT_20261023.md).

---

## HANDOFF F17 — Segunda reconciliación de migraciones (23-oct-2026 PDT)

**PR #97 DRAFT (apila y depende de PR #95; NO fusionar):** recuperación Git, exclusivamente documental, de 20 migraciones remotas y corrección a texto SQL alojado idéntico de 5 variantes adicionales. Comparación de nombres de versiones **130 archivos Git / 122 registros Supabase: 122 parejas por versión; 0 remotas sin archivo; 8 locales sin versión remota**. Pruebas del commit `b2da806c9fdcaf5cf960fc0d4dd9e4cdf8b6f97f`: **9/9 workflows SUCCESS**, incluida la nueva prueba SHA-256. Auditado el catálogo de objetos que aparecen en las 8 migraciones históricas locales: **83/83 objetos únicos existen** (6 tablas, 15 índices, 22 funciones, 9 triggers, 31 policies); las 6 tablas RLS=true. No demuestra el replay histórico ni la equivalencia de definiciones. **Se mantiene bloqueo ABSOLUTO de `supabase db push`, `supabase migration repair` y SQL alojado; producción, PayPal y Vercel intactos**. Documento: `docs/PAZO_HISTORICAL_MIGRATION_PHASE2_AUDIT_20261023.md`.

---

## ACTUALIZACIÓN DE INGENIERÍA — Historial de migraciones y cierre F17 (23-oct-2026 PDT)

**F17 está fusionada en `main`:** PR #81, commit `5d4464f63a996bb8f58c1f41fe943a8be9eda3c6`, CI posterior 7/7 PASS; sitio oficial conserva la versión PAZO ya aprobada por el PO, PayPal Live L1 limitado activo. Las entradas históricas inferiores que dicen `PR81 DRAFT`, `main sin merge` o `L1 BLOCKED` están superadas.

**Migraciones — BLOQUEO ACTIVO de CLI contra producción:** auditoría read-only cruzada de `supabase_migrations.schema_migrations.statements` y las fuentes de GitHub: 110 locales, 122 remotas; 28 parejas por nombre con versiones diferentes. **23 fuentes SQL byte-idénticas se renombraron solo en rama aislada**, 5 fuentes requieren revisión adicional, 8 son exclusivamente locales y 20 exclusivamente remotas. La diferencia de versiones NO está totalmente resuelta. No ejecutar `supabase db push`, `migration repair` ni DDL sobre producción. No automatizar migraciones por el mero hecho de integrar GitHub. [Auditoría detallada](PAZO_HISTORICAL_MIGRATION_DRIFT_AUDIT_20261023.md). Los cambios de rama aún no están autorizados a `main`.

**Pagos:** no fabricar una compra para cubrir el primer E2E Live; la conciliación de una venta real exige firma, evidencia de proveedor, ledger/período y beneficio. Marketing lo gestiona otro agente.

---

## F17 — pre-merge de main: reconciliación de migraciones (23-oct-2026 PDT)

**PRECAUCIÓN DE BASE DE DATOS:** [PR #94](https://github.com/DigitalAppcorp/pazo-app/pull/94) alinea los nombres de **cuatro archivos L1** con las versiones instaladas en Supabase, preservando exactamente los SQL y agregando guard CI. La auditoría global halló otros prefijos históricos sin correspondencia exacta: **no ejecutar `supabase db push`, migration repair, reapply ni merge de Supabase a producción desde esta rama**, incluso después de fusionar `main`, sin reconciliación integral y GO explícito. El PO aprobó visualmente el frontend oficial `bf78b85`; L1 permanece limitado a un comprador y no hay primera venta real. El cierre F17 debe usar [la matriz canónica](PAZO_F17_SCOPE_CLOSURE_RECONCILIATION_20261023.md). El PR #81 sigue DRAFT: **NO merge a main sin GO nuevo del PO**.

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

## CODEX — Tarea F16 de implementación abierta (23-oct-2026)

**ORDEN DIRECTA PO:** «Excelente, que lo haga Codex». Orden de implementación (no plan) guardada en [`CODEX_F16_EVENT_DRIVEN_GRADUAL_LIVE_IMPLEMENTATION_ORDER_20261023.md`](CODEX_F16_EVENT_DRIVEN_GRADUAL_LIVE_IMPLEMENTATION_ORDER_20261023.md). **Issue de GitHub [#82](https://github.com/DigitalAppcorp/pazo-app/issues/82)** registra el encargo. Codex debe retomar desde HEAD actual F17/PR #81, crear rama de desarrollo separada si hay concurrencia, construir sistema completo front/backend/migraciones locales/worker/notificaciones/admin, probar con **GR-01…GR-22 + EVT-01…EVT-19**, documentar evidencia y PR hacia F17. El link de issue **NO significa ejecución de Codex iniciada ni que esté asignado automáticamente**; el usuario debe abrir la tarea en su entorno Codex, ya que no existe acción de ejecución Codex en el conector.

**Permiso PO:** implementar y probar en rama; **NO** instalar Supabase alojado, desplegar Edge/Vercel producción, mandar notificaciones reales, activar cobros PayPal ni fusionar `main`. La orden específica prevalece sobre instrucciones históricas incompatibles del 21-oct. Reusar generación/payments verificados existentes, recovery Live aprobada y diseño Mapbox sin alteración. Estado: `CODEX_ORDER_DOCUMENTED / ISSUE_OPEN / EXECUTION_NOT_CONFIRMED / PROD_UNCHANGED`.

---

## F16 — Cuarta etapa L4=50 APROBADA, promoción automática por décimo pago (23-oct-2026)

**ÚLTIMA DECISIÓN PO (PREVALECE SOBRE GATES HISTÓRICOS DE ESTE ARCHIVO):** el PO dijo **«sí»** a añadir `L4_EXTENDED=50 compradores acumulados`; el orquestador debe pasar de **L3=20 a L4=50** de manera **AUTOMÁTICA AL DÉCIMO COMPRADOR DISTINTO** con venta PayPal Live `COMPLETED` firmada y conciliada, período vigente y beneficios pagados `ACTIVE_VERIFIED`, siempre que no existan incidentes financieros críticos. La progresión completa acordada es **L1=1 (primer comprador validado) → L2=5 (1 venta/beneficio confirmado) → L3=20 (3 compradores distintos) → L4=50 (10 compradores distintos)**, sin esperas de 24h ni entrada administrativa entre fases. **El primer inicio de campaña Live sí requiere GO explícito del PO, y pasar de 50 a `public` también requiere nuevo GO/MFA.**

**EVIDENCIA Y PRESERVACIÓN:** ver [`PAZO_F16_EVENT_DRIVEN_LIVE_ROLLOUT_20261023.md`](PAZO_F16_EVENT_DRIVEN_LIVE_ROLLOUT_20261023.md), reglas `EV-01…EV-15`, pruebas `EVT-01…EVT-19`, y [`PAZO_F16_GRADUAL_LIVE_ROLLOUT_PRODUCT_SPEC_20261023.md`](PAZO_F16_GRADUAL_LIVE_ROLLOUT_PRODUCT_SPEC_20261023.md), `GR-01…GR-22`. Las menciones históricas de **«L4 pendiente»**, techo **20 final**, **«24h entre fases»** y **«1→5→20 propuesto»** en registros anteriores están SUPERADAS. No borrarlas ni interpretarlas como la versión vigente.

**OPERACIÓN:** cola FIFO duradera registra interesados sin límites de plazas; 5 invitaciones iniciales y 72h para contestar continúan aprobadas. El frontend refleja permisos de cupo, el backend verifica pago/beneficio y Supabase promociona/asigna bajo transacciones atómicas; actualizar la primera notificación a cupo disponible en su mismo hilo; enviar segunda notificación de agradecimiento + revisión solo tras venta+beneficios confirmados. Detener nuevas ventas ante evidencia de riesgo sin interrumpir renovaciones/cancelaciones de compradores previos. Al llegar a 50, conservar la cola sin cobros nuevos; no prometer conversión.

**ESTADO:** `PRODUCT_L4_APPROVED / F17_BRANCH_IMPLEMENTATION_AUTHORIZED / NOT_IMPLEMENTED / SUPABASE_HOSTED_UNCHANGED / PAYPAL_UNCHANGED / PRODUCTION_UNCHANGED`. **La aprobación de L4 no autoriza activar checkout Live, instalar SQL alojado, ni publicar código.** Continuar trabajo técnico en rama F17 solo dentro de las autorizaciones ya concedidas, sin reabrir QA Sandbox ni mapa aprobado. PR #81 DRAFT y `main` sin merge al redactar.

---

## F16 — Regla decisiva: promociones Live POR EVENTO, sin esperar días (23-oct-2026)

**NUEVA ORDEN PO, PREVALECE SOBRE PAQUETE PREVIO DE 24H.** El PO aprobó explícitamente 5 invitaciones, 72h de vigencia para responder, cola FIFO y cuotas acumuladas **1→5→20**; acto seguido rechazó esperar días o 24h entre fases. En cuanto se acredita **primer pago COMPLETED firmado + ledger/periodo + beneficio real**, el worker/orquestador promoverá L1→L2 (5); en cuanto se acredita el **tercer comprador distinto** igualmente verificado, promoverá L2→L3 (20), sin intervención PO por etapa. Leer especificación de eventos [`PAZO_F16_EVENT_DRIVEN_LIVE_ROLLOUT_20261023.md`](PAZO_F16_EVENT_DRIVEN_LIVE_ROLLOUT_20261023.md) **ANTES DE PROGRAMAR**; prevalece sobre los relojes de 24h en §5/§13/§15 del [documento de lanzamiento](PAZO_F16_GRADUAL_LIVE_ROLLOUT_PRODUCT_SPEC_20261023.md). El plazo **72h es únicamente para responder a la primera invitación sin checkout**, no para cambiar etapa.

**Problema planteado por PO:** 25 personas quieren apoyar y solo 1 puede comprar al inicio. Solución: **interés abierto a usuarios elegibles desde la propia pantalla de membresía**, además de las 5 invitaciones iniciales; 25 solicitudes se guardan en cola durable, cada slot liberado/siguiente fase se asigna automáticamente bajo RPC atómica. Usuario en cola NO paga, al habilitar cupo su **misma primera notificación** pasa a «Tu cupo está disponible» y el frontend se sincroniza por eventos + GET al volver a abrir PWA. **Segunda notificación** solo tras pago y beneficios verificados. Sin 24h ni clic administrativo, pero no es instantáneo cuando PayPal aún no envía/permite conciliar evidencia.

**SUPERADO POR DECISIÓN POSTERIOR PO (ver primera sección):** L4=50 y disparador de diez compradores distintos están APROBADOS. El techo final ahora es **50**, no 20. La cola sigue abierta; `public` y cantidades superiores a 50 mantienen GO PO/MFA. Pausas automáticas por salud/beneficios permiten seguir cobrando renovaciones y cancelar membresías existentes; las anomalías graves exigen intervención administrativa para reanudar. Ninguna etapa cancela la renovación de un comprador.

**Implementación:** el «sí listo» autorizó planear/programar en rama F17; **no** autorizó ejecutar migraciones en Supabase alojado, cambios PayPal/Edge/Vercel, ni cobros reales. Vigente en producción `canary`, 1 intent Live abierto/0 períodos pagados al último postflight. Mapa Standard y validaciones Sandbox/recovery ya aceptadas, no reabrir. Duplicados/colas/30+ simultáneos validados por EVT-01…EVT-15, conservar GR-01…GR-22. **Estado actual: `EVENT_SPEC_SAVED / NOT_INSTALLED / PROD_UNCHANGED / MAIN_UNMERGED`.**

---

## F16 — Paquete de parámetros de apertura gradual, listo para decisión PO (23-oct-2026)

La estrategia B gradual sí está aprobada, **pero no se infieren aprobaciones automáticas de sus parámetros**. Apéndice §15 del documento rector [`PAZO_F16_GRADUAL_LIVE_ROLLOUT_PRODUCT_SPEC_20261023.md`](PAZO_F16_GRADUAL_LIVE_ROLLOUT_PRODUCT_SPEC_20261023.md) consolida una propuesta concreta revisable: **5 notificaciones iniciales, 72h para declarar interés, FIFO, un solo checkout Live remoto abierto en L1, cupos acumulados 1→5→20, observación 24h, tres compradores distintos pagados/verificados antes de L3, dos CREATE remotos sin resolver como máximo en L2/L3**, pausa automática por anomalías y no promoción a `public` sin GO PO/MFA. Los dos mensajes en bandeja y reporte voluntario permanecen. **ESTADO `RECOMMENDED_FOR_PO_REVIEW`**, no implementado ni habilitado; solicitar aprobación explícita o correcciones de paquete antes de código/SQL. Reutilizar GR-01…GR-22 para cierre sin pérdida de alcance. No solicitar repetición de QA Sandbox ni alterar Mapbox.

---

## F16 — Nuevo diseño rector: apertura gradual automática Live, documentada (23-oct-2026)

**Última elección explícita PO:** **opción B = APERTURA GRADUAL Y AUTOMÁTICA** de Amigo de PAZO USD 2.99/mes. No implica «opción B» (múltiples invitados) de una propuesta anterior, que continúa pendiente. Fuente de verdad para retomar sin perder funcionalidades: [`docs/PAZO_F16_GRADUAL_LIVE_ROLLOUT_PRODUCT_SPEC_20261023.md`](PAZO_F16_GRADUAL_LIVE_ROLLOUT_PRODUCT_SPEC_20261023.md). Incluye flujos completos de **usuario / sistema / Administración**, estados ortogonales, errores/reintentos, consentimientos, **dos notificaciones bandeja**, revisión de beneficios, cuotas/autoavance, controles MFA/stop y **matriz GR-01…GR-22 para Scope Closure Reconciliation**. Se preserva la [propuesta anterior](PAZO_FIRST_LIVE_SUPPORTER_AUTOMATED_PILOT_PROPOSAL_20261023.md) como histórico íntegro, con enlace de prevalencia; **no borrar ni degradar funciones al implementar**.

**Dirección ya aceptada:** campaña voluntaria, cobros reales (no autocobros ni Sandbox fingido), cohortes restringidas, avance condicionado a venta/ledger/entitlement reales y salud del worker, feedback opcional y panel sin contacto manual. La segunda notificación solo se entrega tras beneficio acreditado. Si hay error financiero, pausa NUEVAS compras; continúa renovación/conciliación/cancelación/historial de miembros existentes. El modo público sin último límite conserva autorización PO/MFA. PAZO básico gratis y mapa Standard/UX previamente aprobados invariables.

**SIN decisión ni GO todavía:** límites numéricos propuestos **1→5→20**, ventanas 24h, forma de invitar (una persona vs lote+cola), criterios de selección/frecuencia, copy ES/EN final, retención y momento de mensaje «solo gracias». Esos números se guardan como **recomendaciones**, nunca como parámetros ya autorizados. No implementar ni habilitar cobros públicos a partir de una propuesta documental.

**Auditado en Supabase READ-ONLY al diseñar:** release alojado `canary` revision1, original canary_owner, 1 intent Live abierto, cero períodos pagados. El SQL `admin_private.pazo_live_control_admits` solo conoce `canary/public`; `pazo_f16_live_service_release_change` exige prueba/cancelación de primer canary antes de `public`; `public.notifications` restringe `type` a `sighting,system,community_join`. Requiere migración/versionado y autorización de datos/RLS, **NO** forzar `public` ni cancelar cliente para satisfacer gate de pruebas. Ninguna mutación SQL o llamada al proveedor en esta iteración.

**Validaciones previas conservadas:** PO confirmó múltiples reintentos exitosos de checkout Live abandonado en la aplicación oficial (NO venta real). Sandbox y cortesía admin estaban validados antes, no cuentan como prueba de webhook/beneficio de un cobro Live real. La app oficial ya aloja recuperación PayPal Live Edge v7/deploy `dpl_EXSgFZSQquSgvzk6qYMViu8GmEQV`; la nueva apertura gradual **aún no existe** en runtime.

**ESTADO DE ENTREGA ACTUAL:** `STRATEGY_APPROVED / SPEC_SAVED / IMPLEMENTATION_NOT_AUTHORIZED / PROD_UNCHANGED / FINANCE_UNCHANGED / PR81_DRAFT / MAIN_UNMERGED`. Siguiente conversación debe leer primero documento rector, solicitar solo decisiones de parámetros pendientes, después solicitar GO de código; no reiniciar el diseño de cero. Documentación se guarda en rama F17; no tocar Project Brain OS externo ni producción por la mera escritura.

---

## F16 — Propuesta guardada: piloto automático primer Amigo de PAZO (23-oct-2026)

**Petición actual del PO:** conservar propuesta completa en archivos de PAZO, **sin implementar**. Documento canónico: [`docs/PAZO_FIRST_LIVE_SUPPORTER_AUTOMATED_PILOT_PROPOSAL_20261023.md`](PAZO_FIRST_LIVE_SUPPORTER_AUTOMATED_PILOT_PROPOSAL_20261023.md). Estado **PROPUESTA / DECISIÓN PENDIENTE**; esta escritura NO concede permiso para notificar usuarios, habilitar compradores canary adicionales, efectuar cobros, crear tablas, lanzar el piloto ni desplegar código.

- **Solicitado:** dos notificaciones en la bandeja existente: invitación voluntaria para apoyar PAZO por **$2.99/mes** (aceptar/no); tras venta Live y beneficios **ambos verificados**, mensaje de excelencia y revisión opcional de insignia/beneficios, confirmación o ticket privado.
- **Automatización deseada:** selección, invitación, consentimiento PayPal, recuperación segura, conciliación, activación, segunda notificación, evaluación y panel; sin contacto manual del PO. Conservar modo `canary` y **prohibir promoción automática a `public`**.
- **No decidido:** invitación de uno en uno (A, recomendada) versus invitaciones múltiples/lista de espera con un solo comprador (B); elegibilidad, plazo (72h fue solo ejemplo), reintentos, límites y texto definitivo. No asumir aprobaciones futuras.
- **Confirmación PO previa a guardar:** probó personalmente múltiples abandonos y reintentos de PayPal Live en la web oficial y reportó que **funcionaron correctamente**. Eso valida recuperación/UX, **no** demuestra venta COMPLETED, periodo pagado ni beneficios Live. Mantener pendiente ese único E2E real.
- **Repositorio:** PR #81 DRAFT. Documento únicamente; no `main`, SQL, Edge, PayPal, Vercel, notificaciones, tablas ni datos de usuarios modificados.

---

## F16/F17 — Publicación oficial de recuperación Live verificada (23-oct-2026)

**PO autorizó publicar la corrección después de CI verde, sin pagos/cancelaciones y preservando el mapa.**

- **Código aprobado:** `37978965f250d34210f649e582c592a0c5f80961`: GitHub CI `40006602491` SUCCESS, F17 seguridad `40006602282` SUCCESS, F16 preflight `40006602290` SUCCESS. HEAD `3709ffcbad8a129aa58240ea34f0f1728006e954` tiene solamente cambios documentales respecto al código aprobado y GitHub CI `40006733564` SUCCESS.
- **Backend publicado:** Supabase proyecto `mrybvqdebbgcayuvgkkr`, Edge Function `pazo-paypal-live-account` **versión 7 ACTIVE / verify_jwt=true**. Se sustituyeron exactamente los 3 archivos de recuperación sobre la versión 6; entrypoint, secretos, proveedor PayPal y demás cinco dependencias no se alteraron. No DDL, DML, pagos, refunds, cancelaciones ni cambios de privilegios.
- **Frontend publicado:** Vercel proyecto `prj_nk61nr5ZVpxlp8qbIvRCsua36iXI`, deployment **`dpl_EXSgFZSQquSgvzk6qYMViu8GmEQV`** `READY`, `production`, SHA exacto **`3709ffcbad8a129aa58240ea34f0f1728006e954`**, alias **`pazo-app.vercel.app`** confirmado mediante `get_deployment` sobre dominio oficial.
- **Integridad:** comparación SHA previo de producción `3d649093b5e15a6842622ba326f800f1c0618060` vs publicación: 9 archivos afectados exclusivamente flujo PayPal Live, tests y docs. No se tocó mapa ni módulos ajenos.
- **Postflight read-only:** solicitud Live 1 total, 1 abierta, períodos pagados Live 0; fuente privada en Supabase. No se activaron beneficios ni checkout público.
- **Gate de aceptación de dispositivo:** el PO aún debe verificar en el PWA móvil que «Continuar con PayPal» aparece tras abandonar el login. No se afirma haber completado un nuevo E2E real PayPal ni pago. El usuario puede confirmar UX sin efectuar compra. Si el PWA cachea versión anterior, cerrar y volver a abrir o actualizar; no manipular la solicitud en base de datos.
- **GitHub:** PR #81 sigue DRAFT, `main` no se fusionó. La publicación fue despliegue directo de commit revisado; una actualización documental posterior del handoff no requiere redeploy.

---

## F16 — Complemento final: solicitud no enviada (23-oct-2026)

La continuidad de recuperación incluye también la ruta `pending` no reclamada: en la tarjeta Live, tras confirmación del usuario, `original.state==='pending'&&!original.needsReconciliation` invoca `abandon` (SQL solo si no hubo provider CREATE), mientras una solicitud `bound` usa `abandon_pending` con GET y cancelación PayPal verificados. Una solicitud `pending` reclamada no puede descartarse sin conciliar. Código `c9e35e40`; cobertura anti-regresión `37978965`. Este complemento no instala nueva Edge ni modifica el registro PayPal existente.

Última CI de código disponible al documentar: `ff954b86` CI `40006044745` SUCCESS, seguridad `40006044654` SUCCESS, F16 bootstrap `40006044657` SUCCESS. Los checks del HEAD más reciente `37978965` estaban en ejecución al consultar; revalidar antes de Gate de publicación. Release/merge siguen BLOQUEADOS sin GO del PO. Código no desplegado, producción original conservada.

---

## F16 — Paridad de recuperación Sandbox→Live, código listo; NO desplegado (23-oct-2026)

**Prevalece sobre el checkpoint anterior de CTA solamente.** El PO denunció que en Live, después de abandonar el login de PayPal, la invitación ocultaba el botón pese a haber validado la recuperación en Sandbox. Se auditó código y backend real antes de actuar.

- **Implementación PR #81 (código HEAD `ff954b865e51d5f0445920eb5fe3cf72b4a025e2`):** la tarjeta mantiene «Continuar con PayPal» cuando hay solicitud abierta; usa `resume` sobre el intento original, sin segundo CREATE. `liveOwnerRecovery.mjs` puede liberar en la misma acción estados originales `CANCELLED/EXPIRED` solo tras GET original y cierre SQL verificado. Si `APPROVAL_PENDING` persiste, el usuario puede elegir explícitamente cerrar ese intento, con confirmación separada `abandon_pending`; solo un PayPal POST de cancelación después de un claim SQL idempotente, GET independiente `CANCELLED`, finish de claim y `pazo_f16_live_service_terminal_checkout_close` que exige cero eventos pendientes y cero períodos pagados no vencidos. Errores de red y cambios de estado conservan el intento y no repiten acciones. `ACTIVE/APPROVED/SUSPENDED` no pueden pasar por esta ruta. No hay bypass del canary ni beneficios sin pago.
- **No se modificó Supabase alojado ni las Edge Live:** nuevo contrato del endpoint es código **NO DESPLEGADO**; el endpoint alojado anterior no reconoce todavía `abandon_pending`. No ejecutar en producción ni inferir E2E real de las pruebas sintéticas. Ninguna cancelación real, venta, cambio de credenciales, webhook, pricing, acceso público ni mutación de registros durante este trabajo.
- **Backend previo válido:** SQL `pazo_f16_live_service_cancel_claim`, `pazo_f16_live_service_cancel_finish` y `pazo_f16_live_service_terminal_checkout_close` ya instalado y auditado mediante `pg_get_functiondef` en modo solo lectura. 1 intent Live `bound` abierto, no había períodos pagados Live cuando se consultó; **estado remoto PayPal de ese intento desconocido**, no tratarlo como confirmado pendiente/cancelado sin GET.
- **Pruebas:** CI `40006044745` SUCCESS, seguridad F17 `40006044654` SUCCESS, F16 bootstrap `40006044657` SUCCESS para `ff954b86`. Contratos nuevos cubren CTA visible, confirmación explícita, original owner, estados prohibidos, cancelación una sola vez, timeout ambiguo, relectura `CANCELLED`, eventos/períodos pendientes y no duplicar la suscripción.
- **Gate abierto:** aceptación real de UX y recuperación en dominio oficial Android, después de deploy autorizado; NO crear ni cancelar la solicitud ya vinculada sin decisión explícita del usuario. Antes de publicar el endpoint, verificar código SHA, CI, contenido Edge existente y gates de producción. PR #81 DRAFT, `main` no fusionada. El mapa Standard ya está aprobado por el PO; no reabrir esa QA. PayPal Live primer ciclo pagado sigue pendiente de autorización y comprador externo elegible.

---

## F16 Live — CTA de recuperación de aprobación y QA mapa aprobado (23-oct-2026)

- **Aceptación PO:** Mapbox Standard del dominio oficial se ve y funciona en el teléfono. Gate visual del mapa cerrado por confirmación expresa del PO en este chat; no repetir el QA de cartografía.
- **Regresión identificada por screenshot:** al regresar del login de PayPal Live sin aprobar, `SupporterAccountManagement.tsx` escondía el CTA detrás de `accounts?.length===0`, sustituyéndolo por un aviso cuando había intento anterior. Sandbox tenía CTA de continuación y ruta `recover_retry` independiente; no era paridad de Live.
- **Supabase solo lectura, sin datos personales:** 1 Live intent `bound`, abierto, vinculado a PayPal; estado remoto aún no registrado en DB; 0 períodos pagados Live. No inferir cobro ni aprobación PayPal.
- **Corrección solo en rama PR #81:** `SupporterAccountManagement.tsx` muestra «Continuar con PayPal» directamente en tarjeta al encontrar intento Live anterior y llama al servidor mediante `recover(original.intentId,'resume')`. El backend consulta el registro original y, si existe aprobación válida, reabre esa misma sesión; no ejecuta una segunda creación de suscripción. El error de recuperación aparece junto al botón. Commits de código `da16b9fd`, guard de cuentas `922d4bdb`; prueba anti-regresión `fe492f92`.
- **Límite:** si PayPal mantiene `APPROVAL_PENDING` pero deja de devolver enlace válido, la recuperación Live continúa fail-closed y requiere conciliación/corrección acotada; no declararla E2E PASS por haber restaurado el botón. Ningún usuario normal ni el administrador tiene nueva autorización financiera.
- **Evidencia:** GitHub CI del commit `fe492f92` SUCCESS y F16 bootstrap SUCCESS; F17 seguridad seguía en progreso al consultar. Producción conserva `dpl_AGNfzTjyjy2BNMMh8rxQTrmACDgL`/SHA `3d649093`, sin esta corrección. No hubo deploy/merge, PayPal POST, activación de cobros, SQL DDL/DML ni cambios de secretos.
- **Siguiente gate:** CI/seguridad del HEAD documental, validar CTA y comportamiento de `resume` con sesión autorizada sin aprobar ni pagar, comprobar el caso sin enlace, y obtener GO explícito antes de publicación oficial. PR #81 sigue DRAFT.

---

## Publicación F17 al dominio oficial — 23-oct-2026

**GO del PO:** publicación explícita de la versión F17 con reparación de Mapbox Standard al dominio oficial `https://pazo-app.vercel.app/`. **PRODUCCIÓN ACTUAL:** Vercel deployment `dpl_AGNfzTjyjy2BNMMh8rxQTrmACDgL`, `READY`, Git SHA `3d649093b5e15a6842622ba326f800f1c0618060`; Vercel alias `pazo-app.vercel.app` **verificado** apuntando exactamente a ese deployment. Producción previa recuperada para rollback: `dpl_8uDfwTYrqYqGDfjeFwWg3W4KXTxT`, SHA `1b2340523b80234a41a0a6ffac489bc32f5a2937`.

**Mapbox Production:** antes del deploy se actualizó en Vercel `VITE_MAPBOX_ACCESS_TOKEN` (ID `kBHdGC8O32Uix5f5`, destinos Production/Preview) al valor del **token público ya existente** y probado en el override Preview F17 `AzBEYyCFGy2giJkN`. El token anterior rechazaba teselas/modelos con403; el valor nuevo había superado la prueba de Standard real y glTF del commit F17. No exponer ni almacenar tokens en Docs/Chat/GitHub. El override Preview de rama no fue alterado. No se crearon cuentas Mapbox, servicios facturables ni un plan nuevo. **Importante:** despliegue Vercel READY y alias verificado, pero no constituye una nueva captura de Android en el dominio oficial; el usuario debe confirmar físicamente el mapa.

**Gates:** CI `39997193835` SUCCESS, F16 bootstrap `39997193855` SUCCESS, F17 security `39997193940` SUCCESS para `3d649093`; PR #81 continúa DRAFT y `main` sin merge. Ningún cambio PayPal Live, Supabase/DDL, Edge, mantenimiento o entorno financiero. El código ya publicado coincide con el de la rama antes de esta nota documental. Ver historial anterior para corrección CSS `mapboxgl-map` y token. Prueba HTTP externa desde esta sesión no disponible, aunque Vercel dio READY. **Próximo único gate visual:** confirmar que se ven las calles Standard y las figuras 3D desde el sitio oficial; no pedir repetir QA sintética.

---

## F17 — Mapbox Standard: dos causas reales corregidas; Preview para validación PO (23-oct-2026)

**Código corregido:** `e6bf328d6bc474d0a621be428a157abbeea64f7d`; QA/evidencias `f839c933bdd0694480b7fb93a9211372fa4ef89d`, rama `f17/beta-final-mobile-support-admin-20261022`, PR #81 DRAFT sin merge. **Preview READY:** https://pazo-nu9vxf8rj-digitalapp.vercel.app/ — `dpl_Ayw4ZD7ZTFf2sz4Zt21VoYxirvzD`, SHA exacto `e6bf328d`, target Preview (`null` en API), proyecto `pazo-app` / `prj_nk61nr5ZVpxlp8qbIvRCsua36iXI`. Este checkpoint prevalece sobre los intentos históricos inferiores de preflight/reinicio/raster, que no solucionaron el lienzo gris.

**Causas demostradas antes de editar:** (1) el CSS externo de GL `.mapboxgl-map {position:relative}` fuera de layers sobrescribía `absolute` de Tailwind: padres844px, contenedor real **0px** y canvas de reserva300px, invisible incluso con teselas200; (2) el token público del bundle desplegado permitía estilo/fuentes/sprites200, pero teselas/modelos/DEM403. Una instancia GL real reprodujo lienzo vacío y31 rechazos; `loaded/isStyleLoaded/areTilesLoaded=true` eran falsos indicadores de éxito. El token público ya existente en este entorno, de la misma cuenta Mapbox, responde200 a los mismos recursos y renderiza Standard. No se generó token, cuenta, plan, servicio ni recurso facturable nuevo; no atribuir el motivo interno del403 a scopes/allowlist sin acceso a la cuenta.

**Solución efectiva:** contenedor absoluto y dimensiones100% explícitas resistentes a la cascada; único estilo oficial Standard con `theme:faded`, edificios/objetos3D, DEM y los seis glTF PAZO conservados. Eliminados preflight y sustitución silenciosa por Streets/OSM. Error real401/403 persistente más reintento; `load` no oculta denegaciones. Loader JS+CSS compartido, timeout15s y reintento tras tags fallidos. Datos GeoJSON tardíos, foco seleccionado tras reintentar y rol de botón de marcadores conservados. **Vercel cambió únicamente el override de Mapbox Preview de esta rama** al token público existente que pasó teselas; variable global Production/Preview anterior intacta. Carrusel, fotografías, controles, GPS voluntario y demás diseño F17 sin rediseñar.

**PASS comprobado:** TypeScript/Vite; gobernanza completa; cierre/UI/admin506/506; contratos F17+fotos+mapa+loader+mantenimiento22/22; F16 sintético1193/1193; guard release; dist4/4; Chromium390/1440 F17 sintético40 comprobaciones sin Auth/API alojados. **Mapa real22/22**: componentes reales `ImmersivePlacesStage`+`MapboxMap`, Standard importado, vector/DEM/fuentes/modelos del proveedor200, canvas390×844, calles visibles en captura, zoom/movimiento/inclinación, los seis glTF originales (`park`, `trail`, `restaurant`, `veterinarian`, `grooming`, `pet-store`)200 y features nativas correctas renderizadas al seleccionar cada tarjeta; ensayo adicional14/14 PASS, selección desde tarjeta/marcador y scroll de carrusel. Denegación vectorial403 inyectada conserva Standard y aviso, y reintento vuelve a calles reales; sin excepciones JS. Solo el catálogo de lugares es una fixture pública ya aprobada, la cartografía NO está simulada. Fuente reproducible: `scripts/f17-mapbox-browser.mjs` + `supabase/tests/f17/mapbox-browser-harness.html`. CI remoto del commit QA `f839c933`: **10/10 checks SUCCESS**, incluyendo verify/build/gobernanza, PG17 F14/F16/F17, navegador F17, bootstrap y smoke HTTPS/PWA. Runs `39996593794`, `39996593733`, `39996593715`. El código de aplicación es idéntico al Preview `e6bf328d`.

**Límite de acceso al Preview:** Vercel autenticado permite crear/consultar el deployment, pero el fetch protegido responde403 en `read_protection_bypass` por el alcance de la conexión. La revisión automática rechazó crear un acceso temporal de1h por cambiar la protección. **No se aplicó ese cambio ni se deshabilitó SSO**; no tratar READY o el PASS local de componentes como prueba de navegador remoto autenticado. **Decisión posterior del PO en esta conversación:** abrirá el Preview con su sesión Vercel, sin cambiar el acceso; no volver a solicitar autorización del enlace temporal. La CLI no tenía credenciales existentes y no se inició login.  Android Chrome/PWA instalada y aceptación visual final de este candidato siguen pendientes. No pedir secretos por chat. Si se necesita automatizar el Preview protegido, usar una sesión autorizada existente o pedir aprobación explícita del acceso temporal, sin eludir el rechazo.

**Producción/main:** oficial sigue restaurado en `dpl_8uDfwTYrqYqGDfjeFwWg3W4KXTxT`, SHA `1b2340523b80234a41a0a6ffac489bc32f5a2937`; no merge, promoción ni cambio de configuración Production. Antes de cualquier GO futuro de producción debe reconciliarse allí el token con acceso a teselas; el override es solo Preview. Ningún cambio SQL/Edge/PayPal ni cargo. **F17 NO COMPLETADA:** falta validación visual PO del candidato y autorización independiente de merge/publicación.

Detalle: `docs/PAZO_F17_MAPBOX_STANDARD_ROOT_CAUSE_20261023.md`. Evidencia saneada: `docs/evidence/PAZO_F17_MAPBOX_STANDARD_VALIDATION_20261023.json`; capturas antes/después/modelo en `docs/evidence/f17-mapbox-standard-20261023/`.

---

## F17 — Segunda captura Android gris + preflight Mapbox 23-oct-2026

**Incidencia confirmada por el PO:** el Preview post-cold-restart `https://pazo-k9qvbfm54-digitalapp.vercel.app/` (code `9404d7f497809363ade4c798325e5254560838ea`) sigue mostrando un lienzo gris de tono uniforme y 6 tarjetas, sin calles; el hecho de que ya no aparezca aviso no es PASS. No presentar como mapa resuelto ni atribuir la causa a imágenes o fotos.

**Nueva reparación experimental, sin producción:** `src/features/places/map/MapboxMap.tsx` comprueba por GET desde navegador `https://api.mapbox.com/styles/v1/mapbox/standard?access_token=<public_token>` antes de crear Mapbox GL. En respuesta sin 2xx, CORS, red o timeout4.5s se selecciona primero el estilo de emergencia raster en nuevo renderer, evitando contaminar la instancia GL con una denegación del estilo vectorial; en respuesta2xx se intenta Standard con `theme:faded,show3dObjects:true`. El `config.basemap` Standard no se envía al constructor raster; el raster espera `map.on('load')` para adjuntar los overlays, al igual que el sitio antiguo funcional, y el vector sigue usando `style.load`. Si la carga vectorial falla después del preflight conserva lógica de reinicio raster. **No declarar corrección visual verificada** antes de evidencia Android. Token público solo se envía a api.mapbox.com, no a GitHub/chat/logs, los tests no imprimen URL con token. No se cambiaron secretos ni permisos ni se adquirió servicio.

**Evidencia técnica provisional:** commit de código y pruebas `0b589d3f2b9751cbd36f1c8a84d0a813a05ad4fb`; CI run39991477883 y preflight39991477723 SUCCESS, F17 security run39991477772 debe corroborarse una vez termine. Nuevo Preview `dpl_aEctLcidVqfN8TL5JWQbW3JCMmMf` READY `https://pazo-fcpvlaea5-digitalapp.vercel.app/`. **Sitio oficial permanece restaurado** en deployment `dpl_8uDfwTYrqYqGDfjeFwWg3W4KXTxT`, SHA `1b2340523b80234a41a0a6ffac489bc32f5a2937`. El PO no aceptó el contraste de carreteras del mapa antiguo, pero éste permanece como salida funcional temporal. Nueva revisión debe distinguir calles raster atenuadas de Standard3D realmente autorizado y decidir si es necesario ajustar Mapbox `styles:read`/allowlist en la cuenta del proveedor (externo).

**Gate:** probar Preview nuevo en dispositivo. Si cartografía sigue ausente, no seguir haciendo releases de producción por CI: obtener HTTP status real de Styles API y del proveedor de teselas desde navegador autorizado, o autorización de Mapbox por operador; de no ser posible, mantener el mapa antiguo como recuperación temporal. Sin nuevo GO no fusionar `main`, no volver a publicar F17 ni activar cobros.

---

## F17 — Incidente del mapa y reversión segura (23-oct-2026)

**Evidencia del PO:** tras desplegar F17 a producción `dpl_9MzRnL1YzZ9GNWB5ttS4JS3tVcSi` (SHA `84251c5ecadbc04c061eb777f76cd0c748a5bc7b`), captura Android muestra **lienzo gris sin calles** y aviso «Mapbox no autorizó las capas 3D en este dominio. Mostrando el mapa de emergencia.» Este release visual es **FAIL** para Lugares; no inferir aprobación del mapa nuevo. El PO había confirmado que **el despliegue anterior sí mostraba calles y figuras 3D**, pero no aprobó su estilo de calles demasiado marcadas.

**Incidente mitigado:** se ejecutó `request_promote` del despliegue anterior `dpl_8uDfwTYrqYqGDfjeFwWg3W4KXTxT`, SHA `1b2340523b80234a41a0a6ffac489bc32f5a2937`, target producción READY. Verificación Vercel alias `pazo-app.vercel.app` = `dpl_8uDfwTYrqYqGDfjeFwWg3W4KXTxT` (no inferir verificación visual nueva sin PO). Rollback temporal recupera estilo de emergencia **no aceptado visualmente** y no resuelve requisito de mapa moderno 3D. No cambiar PayPal, DB, secrets, modo Live ni merge a main.

**Corrección preparada exclusivamente en rama F17:**
- `src/features/places/map/MapboxMap.tsx`: ante autorización vector denegada 401/403, `setMapAttempt('raster')` hace que React limpie el WebGL viejo y cree un nuevo `mapboxgl.Map` directamente con estilo OSM comprobado. Mantiene `Mapbox Standard` como primera opción **3D** cuando el token lo autorice; Streets v12 como intento ante fallo no autorizado; al fallar vuelve a raster mediante *cold restart*, ya no `map.setStyle(PAZO_STREETS_STYLE)` sobre instancia fallida. Conserva markers/modelos, UI y fallback de accesibilidad.
- `src/features/places/map/pazoBasemap.ts`: reduce contraste/saturación y opacidad de las calles en el fallback existente sin añadir terceros ni costos.
- Contratos F17 y closure-ui actualizados para verificar nueva recuperación y preservar preferencia 3D.
- Commit funcional `9404d7f497809363ade4c798325e5254560838ea`, CI [39989066619](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39989066619) SUCCESS, F17 security [39989066691](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39989066691) SUCCESS, preflight [39989066638](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39989066638) SUCCESS.
- Preview aislado `dpl_GQnM97tfLCB98sZD1LFGT9ccu9QD` READY, URL `https://pazo-k9qvbfm54-digitalapp.vercel.app/`, target null. **No evidencia todavía de Android real**; no publicarlo como PASS real ni subir F17 a producción de nuevo hasta que se vean las calles y el comportamiento sea aprobado.

**Limitación externa:** Vercel confirma `VITE_MAPBOX_ACCESS_TOKEN` en producción y Preview, token formato público `pk.`; esto NO prueba `styles:read`, `fonts:read` ni restricciones URL. Documentación Mapbox sobre token 403: `https://docs.mapbox.com/accounts/guides/tokens/` y Styles API `https://docs.mapbox.com/api/maps/styles/`. Un token limitado necesita permiso o allowlist desde la cuenta Mapbox original; no pedir ni publicar token por chat y no comprar nuevos servicios. Sin ese acceso, fallback raster suavizado NO equivale a Mapbox Standard 3D nativo.

**Próximo gate:** PO comprueba Preview corregido desde Android: calles, figuras 3D, zoom y que no haya lienzo gris; si funciona, validar calidad del estilo y obtener GO para publicación. Si se desea Standard 3D completo, corregir autorización del token Mapbox en cuenta legítima antes del GO. No bloquear beta por Soporte E2E pospuesto expresamente.

---

## F17 — Aceptación visual PO: cartografía y figuras 3D en sitio oficial (23-oct-2026)

**PASS visual confirmado en Android por el Product Owner:** `https://pazo-app.vercel.app/` muestra las **calles** y, al seleccionar/acercar un establecimiento, **las figuras 3D de PAZO**. Ambas observaciones del dominio oficial quedan aprobadas; no volver a pedir esta misma prueba ni afirmar que el mapa oficial está roto. Aprobación basada en prueba física reportada por PO, no en E2E automatizado. La prueba no distingue por sí sola la tecnología exacta de los objetos (modelo nativo vs representación 3D estilizada) ni certifica relieve DEM del terreno.

**Alcance separado:** el F17 Preview sigue reportado **en blanco**, por lo que NO se declara PASS su mapa. Producción usa un estilo raster de emergencia desde inicio, mientras la rama F17 prefiere primero Mapbox Standard 3D y luego Streets vector; conservar sin cambios el mapa **que ya funciona** en producción, diagnosticar/resolver solamente la regresión del Preview antes de integrarlo en el sitio oficial. No cambiar token/proveedor por hipótesis, ni tocar `main`/producción sin GO; sin nuevos cobros ni cambios PayPal.

**Próximo gate:** cerrar discrepancia del Preview sin regresión de calles/figuras 3D aprobadas. Después, canary PayPal Live de US$2.99 solo tras consentimiento financiero explícito y personal del PO, conciliación y cancelación.

---

## F17 — Prueba real Android: calles visibles en dominio oficial (23-oct-2026)

**Resultado comunicado por el PO:** al abrir **Mapa** en `https://pazo-app.vercel.app/`, **las calles sí aparecen**. Clasificación: **PASS solo para visualización de cartografía base del dominio oficial** (producción SHA `1b2340523b80234a41a0a6ffac489bc32f5a2937`, estilo de emergencia `PAZO_STREETS_STYLE` basado en teselas OSM). No volver a solicitar esta misma verificación de calles en el sitio oficial.

**Límites:** esta observación no demuestra edificios/relieve 3D ni modelos glTF; no valida F17 Preview, donde el PO reportó mapa blanco con la cadena distinta `Mapbox Standard → Streets v12 → raster`. La hipótesis de restricciones por dominio sigue sin confirmar; no alterar token/proveedor de mapas ni declarar mapa 3D PASS. Siguiente prueba focalizada: comprobar en el teléfono si aparecen figuras/marcadores 3D al seleccionar y acercar un lugar en la versión oficial y abordar por separado el Preview. Sin desplegar, fusionar, cobrar ni cambiar producción.

---

## F17 — Auditoría de gates beta 23-oct-2026: Mapbox vs producción y PayPal Live (SOLO RAMA)

**Mandato:** continuar únicamente bloqueos imprescindibles de beta; Soporte E2E queda expresamente POST-BETA. No crear compras, activar mantenimiento, tocar main ni publicar código visual sin GO.

**Mapbox, diagnóstico no conclusivo:** usuario confirmó que el mapa del Preview F17 se ve blanco, sin aprobarlo, e indicó posible diferencia por dominio. La comprobación de Vercel `pazo-app` confirma variable pública `VITE_MAPBOX_ACCESS_TOKEN` vinculada tanto a `preview` como a `production`, sin revelar valor. **Diferencia real de código:** producción exacta `1b2340523b80234a41a0a6ffac489bc32f5a2937` inicia `MapboxMap.tsx` con `style: PAZO_STREETS_STYLE` (raster OSM), mientras F17 PR #81 inicia `mapbox://styles/mapbox/standard`, luego intenta `streets-v12` y solo entonces `PAZO_STREETS_STYLE`. No inferir que las capas 3D funcionan en dominio oficial ni que el Preview falla específicamente por referer: faltan HTTP 401/403 y frames/tiles reales. Confirmar con captura Android del sitio oficial y/o diagnóstico verificable de token Mapbox (URL restrictions, `styles:read`, tile HTTP). No sustituir 3D por raster como solución definitiva, no crear API pagada ni credenciales adicionales sin decisión PO. Provider docs: `https://docs.mapbox.com/help/troubleshooting/token-errors/` y `https://docs.mapbox.com/help/troubleshooting/blank-tiles/`.

**PayPal canary hosted READ ONLY:** `admin_private.pazo_live_release_control.mode='canary'`, `revision=1`; `admin_private.pazo_paypal_new_checkout_switch.environment='live', live_enabled=true, kill_switch=false`; `admin_private.pazo_live_release_artifact.return_origin='https://pazo-app.vercel.app'`, certificado frontend `1b2340523b80234a41a0a6ffac489bc32f5a2937`; `supporter_private.pazo_paypal_live_checkout_intents=0`, `pazo_paypal_live_paid_periods=0`. No ventas/beneficios por pago todavía. **No repetir credenciales o recursos ya validados**. Primer cobro real de 2.99 USD requiere consentimiento específico del PO y aprobación PayPal personal desde **cuenta canary original**, no una cuenta normal; luego verificar webhook firmado, período, beneficios y cancelación, antes de modo público.

**Estado operativo:** proyecto Vercel `pazo-app`, dominio canónico `pazo-app.vercel.app` READY, producción SHA `1b234052...` intacta; GitHub F17 PR #81 draft sin merge, `mergeable=true`, CI + F17 security + F16 bootstrap preflight SUCCESS HEAD previo a esta nota `ecc74875f459b5ffdceb1668a8d977046f141111`. Cinco migraciones F17/canonical/onboarding instaladas, mantenimiento OFF, no modificaciones alojadas. Efecto cristal y geometría dock aprobados por PO en Android; PWA instalable según prueba real previa PO; inspección visual Admin Soporte/cortesías/mantenimiento aprobada, Soporte mensaje real pendiente POST-BETA. **Beta financiera pública no aprobada** y validación cartografía original/3D pendiente. No repetir gates ya aprobados ni interpretar documentación histórica anterior como estado vigente.

**Próximo paso real:** validar cartografía del sitio oficial en dispositivo; si está raster correcto pero no hay 3D, resolver Mapbox token/estilos para F17 antes de GO. Canary de 2.99 USD bajo autorización explícita independiente. Posteriormente Scope Closure/Reconciliation, aprobación PO de merge a `main` y despliegue visual final.

---

## Decisión del Product Owner — Soporte E2E pospuesto hasta después de beta (23-oct-2026)

**Prioridad:** POST-BETA; el PO decidió explícitamente que la prueba/corrección del envío real y la respuesta de Soporte no bloqueen el lanzamiento beta. En la comprobación alojada de hoy no se pudo confirmar la creación del mensaje de prueba: `public.pazo_support_tickets` mantenía 1 registro, del 22-oct; 0 solicitudes creadas el 23-oct y 0 coincidencias con «Prueba F17 de soporte». No declarar Soporte E2E PASS ni asumir que una pulsación creó la solicitud. La inspección visual de las secciones administrativas de Soporte, Beneficios y Mantenimiento sí fue aceptada por el PO; la prueba real del circuito usuario → admin → respuesta sigue pendiente.

**Guardarraíl de beta:** evitar depender del formulario de soporte como único canal de ayuda mientras la entrega siga sin confirmar; ya existe contacto por correo en ajustes. El aplazamiento NO autoriza cambios de backend, ocultar funciones unilateralmente ni publicar el PR F17. Priorizar los gates críticos: Mapbox/Lugares bajo origen autorizado y QA de navegación/instalación; PayPal Live canary solo si se abrirán cobros, con venta y cancelación firmadas antes de hacerlo público; aprobación de release/merge separada.

---

## F17 — Desenfoque alineado con la burbuja activa del dock (22-oct-2026; SOLO RAMA)

**Nueva captura y decisión PO:** el efecto cristal tipo blur y el espacio inferior compacto son satisfactorios, pero el desenfoque visible debe subir hasta la altura donde **termina por arriba la burbuja verde que se mueve** entre pestañas. No agrandar la zona segura, no pintar de blanco y no difuminar el menú. El diseño de la barra y el comportamiento de Lugares no cambian.

**Implementación:** `src/index.css` mantiene `blur(20px)`, altura física de `.pazo-scroll-soft-edge`, `bottom:0`, `pointer-events:none` y `z-20` bajo el dock `z-30`. Se reemplaza únicamente la máscara porcentual por `linear-gradient(to top)` anclada a distancias reales del borde inferior **+ safe-area**: cristal perceptible (alfa 0.48) a `6.4rem`, donde asoma la burbuja activa; suave hasta `7.35rem` y completamente transparente en `8.25rem`. Así la altura visual acompaña a la bolita en distintos teléfonos sin una franja abrupta ni desenfoque excesivo de controles distantes. El CSS se aplica solo a Feed, Comunidades y Mi mascota, no Mapa. La reserva de scroll de `6rem+safe-area` se conserva sin cambios.

**Gates pendientes:** CI exacto del HEAD y validación Android para verificar inicio alineado, dock nítido y último botón accesible. No main, producción, Supabase, PayPal, proveedores ni nuevos permisos. No declarar aprobado por CI solamente.

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

## F17 — FOTO REAL SIN GOOGLE API, SOLO RAMA, 22-oct-2026

PO descartó Google Places Photos como requisito. Se prepararon seis fotos
fotográficas diferentes con Wikimedia Commons sin costo: Runyon Canyon
corresponde al parque real; las otras cinco son ilustrativas por categoría
y tienen etiqueta “Ilustrativa”. Los créditos de fotógrafo y licencia
son enlaces accesibles en tarjeta, y el campo de backend `photo_url`
prevalece siempre. Nuevo tercero externo Wikimedia declarado en la
política de privacidad ES/EN y el inventario de datos. Se añadió test
`scripts/f17-curated-place-photos.test.mjs`, y documentación
`docs/PAZO_F17_PLACES_PHOTO_SOURCES_20261022.md`.
Sin API pagada, credenciales, migraciones ni cambio PayPal. CI y aceptación
visual en móvil pendientes. **No publicar en Vercel ni merge a main sin GO.**

---

## ACTUALIZACIÓN F17 — Lugares y Feed, 22-oct-2026 (RAMA, NO PRODUCCIÓN)

**Scope aprobado por PO y versionado en PR #81**, revisión de código anterior `a12579c1fd59`: contenedor exterior de búsqueda/filtros transparente, fade lateral en scroll de categorías, botón **Cómo llegar** desde detalle de lugar (iOS Apple Maps; Android/enlace web Google Maps), iconos circulares mayores para like/comentarios/guardado en Feed. Los handlers y métricas existentes se preservan. Foto genérica de carretera eliminada: cada tarjeta solo muestra `pet_places.photo_url` real o indica que todavía no hay foto. **Los 6 lugares alojados tienen `photo_url` vacío**: no declarar fotos de establecimientos ya resueltas.

**Google Places Photos NO activo:** Google Places API/Place IDs de esos establecimientos no están configurados en PAZO; requiere servicio con facturación y atribución/uso compatibles. Prohibido generar cargos, añadir claves cliente, copiar imágenes de Google Maps manualmente o fingir fotos sin autorización adicional del PO. Alternativa con costo fijo controlable: fotos autorizadas por negocio y Storage existente. Regla cero contornos respetada; ningún SQL/Edge/Vercel modificado. La versión publicada en `https://pazo-app.vercel.app/` **no incluye todavía estos cambios**. Validación requerida: CI exacto del último SHA, prueba móvil/Preview aprobada por PO, decisión sobre fotos; NO despliegue ni merge a `main` sin GO.

**Implementación y detalles:** `docs/PAZO_F17_PLACES_FEED_POLISH_20261022.md`. Mantener estado financiero previo en el historial inferior (sin alteraciones de PayPal).

---

# PAZO · PAYPAL LIVE — ESTADO HOSPEDADO AL 22-OCT-2026 (ACTUAL)

> Fuente de verdad vigente. El historial F17 visual debajo es anterior a la reparación de pagos y **no debe usarse** para decidir nuevos cambios financieros.

- **Producto:** https://pazo-app.vercel.app/ , proyecto Vercel `pazo-app` `prj_nk61nr5ZVpxlp8qbIvRCsua36iXI`, producción **READY** `dpl_8uDfwTYrqYqGDfjeFwWg3W4KXTxT`, SHA real frontend `1b2340523b80234a41a0a6ffac489bc32f5a2937`. PR #81 **DRAFT**, rama `f17/beta-final-mobile-support-admin-20261022`, main sin merge.
- **Supabase:** `mrybvqdebbgcayuvgkkr`. Instaladas migraciones **`20261022220000`** (origin canónico transaccional) y **`20261022222000`** (A03 onboarding completado tras mascota realmente creada). Ambas pasaron ensayos ROLLBACK y COMMIT, con postflight alojado. No reinstalar.
- **PayPal Live:** la configuración certificada y la única dirección de regreso válida ahora es `https://pazo-app.vercel.app`. El antiguo `pazo-app-t83r.vercel.app` ya no figura en las cinco funciones financieras en PostgreSQL. Artefacto con CHECK estricta y validación actual `true`; precio `299` centavos USD mensual, credenciales Vault válidas e INALTERADAS, webhook sin cambios, control `mode=canary` revisión 1, switch Live TRUE / kill FALSE, **0 intents/0 períodos pagados**. No activar público sin primera venta firmada, confirmación de cancelación y GO del PO.
- **Edge desplegado:** `pazo-paypal-live-account` v6 (JWT), `pazo-paypal-live-checkout` v4 (JWT), `pazo-admin-paypal-release` v2 (JWT); `pazo-admin-paypal-bootstrap` v7 (JWT), `pazo-admin-paypal-live-inspect` v5 (JWT), `pazo-admin-paypal-vault` v3 (JWT). Ajustadas CORS/guards de origen exacto sin wildcard, MFA permanece obligatorio, sin rotar credenciales. Webhook y worker financieros NO redeplegados.
- **Comprobaciones:** HTTP público real de 7 rutas oficiales incluidas `/paypal/return` y `/paypal/cancel` PASS en GitHub run **39856221792**. CI + F17 security PASS para la última implementación de onboarding `5fe2ea56e04be0f7cc8d2b9f6df07e4f4be3c3d3` (runs **39859246850**, **39859246887**); bootstrap preflight **39859246846** PASS. Artefacto certificado + worker activo/heartbeat reciente + canary original operator permitido = TRUE al último check SQL, pero **NO** hubo pago Live real.
- **Onboarding:** antes todos los 5 perfiles tenían `onboarding_completed=false` pese a existir mascotas; 4 perfiles con mascotas reales se reconciliaron a TRUE, el perfil sin mascota quedó FALSE; `public.create_pet_profile` ahora actualiza el propio perfil tras la creación satisfactoria sin modificar RLS/privilegios.
- **Panel Live:** frontend publicado ofrece pantalla limpia de estado/precio/retorno/webhook/MFA/control y herramientas avanzadas separadas. Esta iteración corrigió conexión y visibilidad, no implementó una **rotación completa** de plan/credenciales ni hizo editable un precio de una suscripción existente. PayPal requiere plan nuevo para otro importe; proteger generaciones históricas. No volver a pedir credenciales ya válidas.
- **Siguiente gate REAL:** la cuenta original del operador canary (no cuenta normal) debe iniciar desde la app, aprobar personalmente **una suscripción Live de $2.99** y regresar; el asistente verifica webhook firmado, período pagado, beneficios, conciliación y cancelación. NO fabricar transacciones ni poner `mode=public` hasta cumplir toda la evidencia y GO específico del PO. Una cuenta normal seguirá bloqueada correctamente en canary. No prometer que el flujo PayPal extremo-a-extremo está PASS solo por las pruebas HTTP.
- **Módulos no financieros:** F17 Soporte/cortesías/mantenimiento instalados con RLS; mantenimiento OFF. Mapa y corgi pendientes de aceptación visual final del PO en Android. No modificar main sin aprobación.

---

# PAZO · ACTIVE HANDOFF — 22-oct-2026 · visual F17

> **Source of truth:** remote GitHub branch + actual provider state. This concise live snapshot replaces the former 113 KB chronological handoff, recoverable **verbatim through Git history at commit `b1cbcd355ed33ce25602f2cb8531729afc13ed2c`**. Earlier statements about pending SQL or old production domain are historical.

## Identity, authority and controls
- **PO:** user; ChatGPT is primary implementer, per `DigitalAppcorp/project-brain-os` SKILL v1.4.1 and `AGENTS.md`. No Codex or other AI needed.
- **Repo:** `DigitalAppcorp/pazo-app`, base `main` `a99f05d2dab3baf5a4bc26b8fb64d790e7c4be2d`. Active F17 branch `f17/beta-final-mobile-support-admin-20261022`, PR **#81 DRAFT**. Code snapshot preceding this doc: `b1cbcd355ed33ce25602f2cb8531729afc13ed2c`. Do not merge to main without PO approval.
- **Canonical app URL:** `https://pazo-app.vercel.app/`, Vercel project **`pazo-app`** `prj_nk61nr5ZVpxlp8qbIvRCsua36iXI` (distinct from `pazo-app-t83r`). User-approved F17 beta UI fixes are **published technically**: production `dpl_CJ1vpxTdSQ5QBZ8w5GDSNPUnYCtr` READY, exact code `b1cbcd355ed33ce25602f2cb8531729afc13ed2c`. Domain alias was verified to point to that deployment. Prior production `dpl_7rPxM5BzSaz3YJrDDu6NMpY1bfWT` is rollback reference. **Physical Android/Mapbox visual acceptance is still NOT confirmed**.
- **Preview of visual corrections:** `dpl_ByL8WxEEQYkmrxMsNdPo1U95Gq93` READY, code `b1cbcd355ed33ce25602f2cb8531729afc13ed2c`, `https://pazo-52wyg1fcj-digitalapp.vercel.app/` (may require Vercel-authenticated browser; MCP bypass permission denied).
- **GitHub CI:** **PASS for production code SHA `b1cbcd355ed33ce25602f2cb8531729afc13ed2c`**: `CI` SUCCESS run 39800270518 and `F17 beta isolated backend security` SUCCESS run 39800270447. Prior CI failures were stale tests still demanding intrusive banner/Mapbox vector style; corrected without disabling protections. Newer commits modify only documentation and should not be mistaken for distinct published code. Do not claim physical browser validation from CI.

## Backend F17 hosted — ALREADY INSTALLED, not part of current visual patch
- Supabase `mrybvqdebbgcayuvgkkr`. Migrated with approved reversible preflight + one transactional COMMIT: `20261022103706` private support, `20261022103707` gifted benefits, `20261022103708` maintenance guards. 3 registered migrations, 5 FORCE RLS tables, daily `pazo_support_retention_daily` deletes resolved cases after 90 days. DO NOT reinstall.
- Edge `f16-paypal-supporter-v2-qa` v27 active with JWT verification. No further Edge changes needed for UI-only iteration. Mantenimiento OFF revision 0 last inspected; do not enable. PayPal Live **canary**, revision1, `live_enabled=true`, `kill_switch=false`, 0 Live paid periods last read. Credentials already valid in metadata. Do not request secrets or run a real sale. No changes to financial switch or main.
- Support, gifting and maintenance were code/runtime installed in previous release; do not accidentally invalidate them. Their operational physical QA remains independent from this visual ticket.

## PO screenshots / F17 visual task
Exact requested repairs after physical Android screenshots:
1. Welcome A01 excessive top/bottom gaps and internal scroll clipped corgi card: reduced paddings, hero flexible `min-h-0`, static footer actions; outer app shell now `h-full min-h-0` nested under `100dvh` rather than `h-screen`.
2. Preserve **same** smiling orange-white seated corgi, closed eyes, tongue out, green collar/yellow tag; SVG holds **one complete local WebP scene** (no separately animated head, tail, mouth). **IMPORTANT:** still raster 295×310; not a genuine hi-res redraw/vector; PO quality acceptance remains open. Do not silently replace with generic dog.
3. Removed intrusive Home install banner. Discreet opt-in `PazoInstallControl placement="welcome"` on A01 AND login; device display-mode installation detection; settings control persists.
4. Broken/blank real Mapbox streets: temporary Mapbox GL style using visible OSM raster tiles `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, existing PAZO places/3D-models and camera retained; attribution visible above place cards. **OSMF community tile endpoint only for very small beta**, best-effort/no SLA; must switch provider or resolve Mapbox API token/styles before scale/public ad campaign. Cannot claim real tile visibility on Android until PO screenshot.
5. Removed Comunidades intro subtitle and the overlines `PAZO · COMUNIDAD` / `PAZO · TU COMUNIDAD` from Messages/Notifications.
6. Geometrically centered titles Cuidados de mascota, Pasaporte de mascota, Crear y Compartir with matched 32px spacer/close grid. New regression tests in `scripts/closure-ui.test.mjs` plus aligned `scripts/f17-beta-extension-contract.test.mjs`.

## Evidence and next gate
- Vercel PREVIEW `dpl_ByL8WxEEQYkmrxMsNdPo1U95Gq93` and PRODUCTION `dpl_CJ1vpxTdSQ5QBZ8w5GDSNPUnYCtr` were READY for production code SHA `b1cbcd35`. Both are build/runtime deployment evidence, not physical device proof.
- GitHub synthetic/local past: 1,818 general, 16 extra, 40 mocked-browser checks for previous F17 baseline; not proof for this latest visual SHA.
- Policies updated ES/EN and `docs/PAZO_DATA_INVENTORY.md` to disclose OSMF direct tile requests/location-area technical metadata. See `docs/PAZO_F17_VISUAL_MAP_FIX_20261022.md`.
- **NEXT STEP:** user tests the already-published F17 beta at `https://pazo-app.vercel.app/` on the **actual Android phone**: A01 no scroll/clipping at 640–850px CSS, corgi quality/likeness, discreet PWA install on Welcome/Login and hidden in standalone, **real visible street tiles under pins in Lugares**, center-aligned modal titles and removed text. Evidence is a screenshot or a bug report; PO decides visual acceptance. If streets still gray, inspect real tile requests/token/network, do not invent a PASS. Before **formal beta sign-off or merging main**, obtain PO visual GO; public scale requires a paid/tile provider or Mapbox root-cause repair. Keep PayPal/DB unchanged.
- Local Antigravity working tree/unpushed commits: **unknown**; do not infer clean local state. Avoid duplicate tests and backend changes.

## Activation for new chat
"Activa Project Brain OS v1.4.1; lee `DigitalAppcorp/pazo-app/AGENTS.md`, `docs/PAZO_ACTIVE_HANDOFF.md`, `docs/PAZO_F17_VISUAL_MAP_FIX_20261022.md`; revalida PR #81 HEAD/CI, Vercel preview/production alias. Continúa aceptación visual del F17 publicado; no reimplementes SQL ni PayPal ni hagas más despliegues/merge a main sin el siguiente GO."

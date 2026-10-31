## Revisión transversal de criterio experto — EEP (29-oct-2026)

**Regla general para PAZO:** usar [Expert Evidence Protocol de Project Brain OS](https://github.com/DigitalAppcorp/project-brain-os/blob/main/patterns/EXPERT_EVIDENCE_PROTOCOL.md), vía skill local [`expert-evidence-review`](.agents/skills/expert-evidence-review/SKILL.md), en trabajos de ingeniería, producto, marketing, UI/UX y video. Cuatro cuestiones: estándar profesional aplicable, fuentes originales revisadas, método adecuado, prueba falsable/externa del resultado. Esfuerzo LIGHT / STANDARD / CRITICAL según riesgo; la evaluación interna del agente no constituye revisión independiente.

**Guardas:** no reemplaza `AGENTS.md`, gates de producto, seguridad/privacidad, Design OS, Video OS, Marketing Brain, autorizaciones de publicación ni condiciones de pago. Un cambio documental no aprueba mutaciones de aplicación, Supabase, Meta Ads, PayPal o producción. Distinguir `OBSERVED`, `SOURCED`, `INFERRED`, `UNKNOWN`, `NOT_TESTED`; declarar explícitamente fallos y límites. No transformar preguntas internas de trabajo en interfaz pública. No afirmar que actualizar una skill entrena el modelo o demuestra mejoras de calidad; probarlo con casos y resultados.

**Este cambio:** solo documentación y skill, sin nuevas funciones de PAZO ni activación de servicios. Los bloques históricos inferiores conservan sus autorizaciones y estado por fecha.

---

## Producción vigente — Administración visual y confiabilidad #161 (29-oct-2026)

GO explícito del PO: «sube todo a produccion». PR162 **merged**; runtime de producción `16b705d65e8de54afa2c1600a24e2bb23802b99a`, Vercel `dpl_BJ3xLUNFJf6HQJiQ5XydywM9pcHj` READY/production, alias `pazo-app.vercel.app`. [Acta de lanzamiento](docs/admin-visual/PRODUCTION_RELEASE_20261029.md) y [registro instalado](docs/admin-visual/PRODUCTION_RELEASE.json) son la referencia actual.

SQL ya instalado: fuente `20261029120000` → hospedada `20261029125959`; fuente `20261029121000` → hospedada `20261029130004`. **No reinstalar ni ejecutar `db push` global.** El manifiesto PREPARED y las actas de candidato son históricos. #153 también conserva su mapping previo. Los cuatro flags, fechas originales y retención14d quedaron intactos; no se borró historia.

Lecturas agregadas: administrador AAL1 sin autenticador adicional; operaciones sensibles/MFA/PayPal intactas. Exclusión de señales: opt-in local en Administración → Mi actividad en los informes; no se activa automáticamente ni se transfiere de staging a producción. Sin vínculo individual demostrado solicitud→cuenta; no inventar personas, conversiones Meta o abandonos. Postflight: Chromium público51, HTTP3lectoresdenegados, SQLadminAAL1/normaldenegado, parserreal y fingerprint sensible invariantes. No se afirma sesión humana de administrador (no había tab autenticada disponible).

Las notas inferiores de candidato pendiente/no GO describen el estado anterior a este lanzamiento. Cualquier cambio funcional posterior necesita su autorización correspondiente.

---

## Histórico del candidato — Administración visual y #161

Rama `feat/admin-visual-overview`, base `ee10cd98`. PR162 integra el rediseño y #161 en la misma rama, NO publicados en producción. #161 agrega preferencia local explícita sin identidad, guardas de vigencia y semántica de solicitudes; ver docs/admin-visual/ISSUE161_AUDIT.md. No tratar su GO de implementación como GO de release ni borrar historia anónima. Ver `docs/admin-visual/RELEASE_RUNBOOK.md`, revisión de diseño y manifiesto de exactamente dos migraciones pendientes. No confundir con los GO históricos de #147/#153. No hacer `db push` global ni reinstalar #153: su versión fuente/hospedada ya está conciliada. Los cuatro flags publicados siguen activos y sus fechas deben conservarse. Las operaciones sensibles mantienen MFA; solo las lecturas agregadas de administrador se preparan para AAL1.

Baseline de producción consultado sin escrituras el 29-oct-2026 09:48 UTC: 135 migraciones, gates/health de comportamiento e inteligencia activos, cron de retención #4 con ejecución exitosa 06:17:00Z después del SQL de #153. Este dato resuelve la incertidumbre histórica de cron, no autoriza un nuevo lanzamiento.
---

## Video Production OS: QA correctivo vigente (29-oct-2026)

El PO detectó una brecha material entre anuncios prometidos y material entregado. **Obligatorio leer** [auditoría de primera tanda](docs/marketing/PAZO_VIDEO_BATCH_01_CRITICAL_REVIEW_20261029.md) y el gate [CREATIVE_EVIDENCE_GATE](https://github.com/DigitalAppcorp/project-brain-os/blob/main/knowledge/video-production/CREATIVE_EVIDENCE_GATE.md) antes de guionar/renderizar/recomendar publicidad. Los 4 MP4 anteriores comparten plantilla stock/captions/música/endcard y no son una comparación válida de cuatro estilos; 3D, spot actuado y demo dinámica **no están validados**. Revisar medios reales, no solo CI. No implicar que editar documentos "entrenó" una IA, ni sugerir publicación en lote o nuevos gastos sin nueva evidencia/autorización.

---

## Nueva iniciativa — Video Creative Lab PAZO (28-oct-2026)

Para trabajos de contenido audiovisual, anuncios o narrativa de mascotas, consultar [docs/marketing/PAZO_VIDEO_CREATIVE_LAB_20261028.md](docs/marketing/PAZO_VIDEO_CREATIVE_LAB_20261028.md) y la habilidad reusable [Video Production OS](https://github.com/DigitalAppcorp/project-brain-os/blob/main/knowledge/video-production/SKILL.md). El PO decidió **explorar** cuatro rutas (comercial cotidiano real, caricatura 3D, video natural de mascotas y demostración real de PAZO) sin estilo ganador ni datos concluyentes. **Esta autorización cubre crear el método y el brief, no publicar, comprar servicios, gastar en anuncios, cambiar la aplicación ni fingir el resultado de un piloto.** Material ajeno en videos de referencia no implica derechos de reutilización. Preservar las funciones reales, las métricas #153 y el resto de las instrucciones vigentes.

---

## #153 — GO FINAL EJECUTADO: inteligencia global publicada (28-oct-2026, Los Ángeles)

**Fuente operativa vigente:** [postflight de #153](docs/product-intelligence/PRODUCTION_RELEASE_20261028.md) y [issue #153](https://github.com/DigitalAppcorp/pazo-app/issues/153). El PO aprobó la experiencia visual y autorizó el lanzamiento final. [PR #155](https://github.com/DigitalAppcorp/pazo-app/pull/155) integró la implementación, [PR #156](https://github.com/DigitalAppcorp/pazo-app/pull/156) publicó primero el aviso ES/EN con la nueva recogida OFF y [PR #157](https://github.com/DigitalAppcorp/pazo-app/pull/157) integró los flags activos tras **7/7 CI SUCCESS**. Dominio `pazo-app.vercel.app` READY: Vercel `dpl_6XNVw4afbDtim71jUPHjp76xDfiM` SHA `b70dff6c372b43d87389c5d5a0423a8f54455d3c`. Supabase: fuente SQL `20261029010000` instalada exactamente una vez como `20261029005231`; Edge landing v8 ACTIVE; `intelligence_enabled=true` desde `2026-10-29T01:09:01.761072Z`. #150, 14 días y sus fechas preservados; QA excluida.

**Las instrucciones inferiores de «candidato», «SIN GO» y «fase 7 pendiente» quedan superadas y son historial.** No reinstalar SQL, no reiniciar ventanas, no crear datos sintéticos en producción y no reactivar pagos/invitaciones ni cambiar el feed. El Cron #4 permanece activo, pero **aún no hay ejecución periódica observada posterior a la migración nueva**, ni flujo humano real E2E demostrado; comprobarlos antes de afirmarlos. Posibles retoques estéticos van a **otra iniciativa** y no son motivo para reabrir #153.

---

## Issue #153 — implementación autorizada, candidato de fases 0–6

La orden humana adjunta en la conversación de Codex (28-oct-2026, «Implementación integral del sistema global de inteligencia») autoriza implementar, probar, documentar y preparar staging del #153. Supera el estado anterior de solo planificación que se conserva abajo como histórico. [Contrato y evidencia](docs/product-intelligence/FINAL_CANDIDATE_REPORT.md). No interpretar este registro como un GO de publicación: **fase 7, producción y nueva recopilación siguen sin autorización**. Mantener los tres interruptores frontend/Edge/aviso y el nuevo gate SQL OFF. No reinstalar #150, reiniciar sus fechas, modificar ranking, fake doors, pagos o invitaciones. Verificar siempre el informe final y el estado vivo antes de retomar.

## Histórico de entrada — hoja maestra de analítica global (28-oct-2026)

**Lectura obligatoria antes de retomar esta iniciativa:** [docs/PAZO_GLOBAL_ANALYTICS_IMPLEMENTATION_MASTER_20261028.md](docs/PAZO_GLOBAL_ANALYTICS_IMPLEMENTATION_MASTER_20261028.md) → [decisión estratégica](docs/PAZO_GLOBAL_PRODUCT_INTELLIGENCE_DECISION_20261028.md) → [issue #153](https://github.com/DigitalAppcorp/pazo-app/issues/153). Define el inventario exhaustivo por pantalla y control, eventos de intención/resultado/error, reutilización de feed y fake doors, privacidad, costes, Design Intelligence OS + Marketing Brain OS, fases y criterios de éxito. **NO confundir cobertura integral con captura indiscriminada de clics.**

**ESTADO: HOJA MAESTRA DOCUMENTADA, SIN GO DE IMPLEMENTACIÓN.** Solo está autorizada la documentación/planificación de esta solicitud. No construir nuevas funciones, alterar ranking, crear migraciones, ampliar recogida, activar flags, fusionar PRs funcionales, contratar proveedores ni desplegar por leer este documento. Cuando haya un GO de implementación específico, ejecutar fases 0–6 y presentar candidato/único informe; **fase 7/publicación requiere GO final separado del PO**. No duplicar #150: ya publicado y activo. Verificar siempre main/producción y los permisos actuales.

---

## DECISIÓN VIGENTE DEL PO — analítica global de PAZO (28-oct-2026)

**Leer antes de proponer cualquier cambio de analítica, feed, Demo, fake doors, onboarding, UX o personalización:** [docs/PAZO_GLOBAL_PRODUCT_INTELLIGENCE_DECISION_20261028.md](docs/PAZO_GLOBAL_PRODUCT_INTELLIGENCE_DECISION_20261028.md).

El PO **aprueba la dirección estratégica** de un sistema global de inteligencia de producto: cobertura de **todas las pantallas y acciones relevantes**, con eventos que distingan exposición, intención, éxito, fallo y reintento, reutilizando mediciones actuales. **No aprueba capturar indiscriminadamente cada clic ni enlazar clics brutos a los algoritmos.** Feed/intereses y fake doors siguen independientes: observar y validar antes de cualquier cambio de ranking. Respetar privacidad, GPC/retirada, QA, muestra mínima, límites de 14 días, rendimiento y semántica honesta. **Esta decisión NO autoriza programar, añadir datos, migrar, fusionar ni desplegar.** El siguiente agente debe realizar primero una auditoría/inventario por pantalla y control cuando el PO lo ordene.

## Issue #150 — PUBLICADO, recopilación de comportamiento activa (28-oct-2026)

El encabezado anterior «candidato sin GO», y las afirmaciones de «OFF / migración no instalada» quedaron **superados por el GO explícito del PO**. [PR #151](https://github.com/DigitalAppcorp/pazo-app/pull/151) fusionado en `main`, merge SHA `3dcd2e2e978bd9ea833c10efad0573d56ad57231`; producción `dpl_9uXdNs5HAXmLZAaDd7r2z59uQw8K` READY y alias `pazo-app.vercel.app`. Migración preparada fuente `20261028210000`, instalada en Supabase como versión alojada `20261028215020`, sin repetir; Edge landing v6. `behavior_enabled=true` desde 2026-10-28 22:04:51 UTC, aviso ES/EN `pazo-behavior-notice-v1`, retención 14 días y cron previo activos. Marketing y primera utilidad previos preservados. [Postflight y límites](https://github.com/DigitalAppcorp/pazo-app/issues/150#issuecomment-6481866259).

**#150 ya no es una solicitud de publicar.** Las métricas iniciales carecen de muestra real y no se retroalimentan de forma automática al algoritmo. No crear QA artificial, no cambiar criterios de atribución, no reinstalar SQL, no reiniciar fechas ni extrapolar retroactividad. Los informes de #150 anteriores al GO son snapshots históricos de la fase de candidato, no el estado de producción. Las instrucciones antiguas de no-GO que aparezcan más abajo son históricas y no autorizan repetir operaciones.

---

## GO #147 ejecutado — publicación verificada (28-oct-2026)

Leer primero [informe de publicación](docs/PAZO_ISSUE147_RELEASE_20261028.md) y [GO del PO](https://github.com/DigitalAppcorp/pazo-app/issues/147#issuecomment-6477690521). PR148 y Brain13 integrados, producto4ce38450 publicado en canónico/dplGRz. Única SQL1B instalada por vía dirigida y mapeada `20261028075145`→`20261028185856`; utilidad activa desde2026-10-28T19:17:46.696036Z/noticev1, retención14d saludable. **No repetir instalación ni reiniciar utility_started_at.** Los «no GO/no publicado/OFF» inferiores son historia anterior a la autorización final. Mantener sin cambios flags de pagos/invitaciones y usar el rollback documentado ante un fallo crítico; no publicar nuevas mejoras por inferencia.

## Histórico: Issue147 — diseño autónomo y candidato aislado (28-oct-2026)

**Aclaración posterior expresa del PO:** carga/error son estados ilustrados de sus propias pantallas, nunca avisos flotantes. Solo la orientación inicial de herramientas usa aviso independiente, con acciones deliberadamente distribuidas. El cierre visual598 y el prototipo de error flotante están superados; usar el informe147 vigente y su evidencia `illustrated-states`. No interpretar la referencia a cookies como aplicable al error.

Orden vigente [147](https://github.com/DigitalAppcorp/pazo-app/issues/147): corregir primera experiencia y proceso Design OS. UI nueva dentro del alcance se decide/critica/corrige profesionalmente sin pedir elecciones ni microaprobaciones estéticas. Separar DESIGN_QA_PASS de PO_VISUAL_ACCEPTED (NOT_REQUESTED si no hubo revisión voluntaria) y release. Rediseños dirigidos sobre intención previamente aceptada conservan su gate. Preservar1A/1B y main; ningún merge final, producción ni instalación/activación SQL por inferencia. [Decisión y evidencia de diseño](docs/PAZO_ISSUE147_DESIGN_REVIEW_20261028.md). Los snapshots siguientes conservan historia, no son el estado actual.

## CONTINUIDAD DE PRODUCTO PAZO — MVP / activación real (28-oct-2026)

Antes de recomendar o ejecutar mejoras de primera sesión, feed, onboarding, medición o ads, leer [hoja maestra](docs/PAZO_MVP_ACTIVATION_MASTER_20261028.md): consenso entre PO, Codex, asistente IA y consultor. PR 1A [#140](https://github.com/DigitalAppcorp/pazo-app/pull/140) implementado en rama y en revisión; **no hay GO de merge/deploy**, ni autorización para implementar PR 1B/PR 2. Una consulta no autoriza preparar ni escribir; preparar, implementar, fusionar y desplegar tienen permisos separados. Verificar siempre estado actual, sin interpretar este snapshot como orden ejecutable.

---

## Lugares — UX aprobada publicada (27-oct-2026)

Propuesta02+idioma03 aprobada por PO, integrada PR138/merge8dbf4ef5fe7a926f1caee3a55ee3c60f31400c04, candidato3e6448f4 con9/9CI SUCCESS. VercelPROD dpl_3KrqGdJmijURjdirv1W1iwhkhSW7 READY/aliashttps://pazo-app.vercel.app, postflight público HTTP22PASS y demoMapa real ESEN sin erroresJS ni escrituras.12controladores y8archivosprotegidos intactos; sin SQL/Edge/Auth/pagos/marketing. [Cierre y límites](docs/PAZO_PLACES_APPROVED_UX_PRODUCTION_POSTFLIGHT_20261027.md). Cambios posteriores de documentación no requieren otro despliegue frontend.

---
## #130 — seguimiento del segundo Cron completado

Comprobado28oct00:19UTC (27oct18:19 Guatemala):5runsperiódicosSUCCESSjob4, incluido segundo27oct06:17UTC. Última salud14d/policyv1/retention_ready=true,trackingACTIVE,cron original17 */6 * * * UTC. CRON_REAL_RUNS_2=PASS;READY técnicoYES. La excepción de activación antes del segundo ciclo queda como historia; ya no existe este pendiente. No repetir release/QA/activación, no publicar ni gastar Meta. Ver postflight existente para timestamps y evidencia. Solo documentación actualizada, sin cambios de producto.

---
## #130 — cierre activo verificado, con segundo Cron bajo seguimiento

Tracking ACTIVE desde26oct19:09 Guatemala, producción9df24a1d/dpl_47U5Q21kxWGDiiyLh5hU62Yurp3c READY. Privacidad activa EN/ES, Siteverify humano, atribución automática por correo confirmado y primera mascota PASS; QA excluida/suprimida, reporte7/30/90, PWA/HTTP/DemoMapa y digest financiero PASS. [Postflight final y matriz](docs/PAZO_MARKETING_OFF_POSTFLIGHT_20261026.md). READY técnico YES bajo excepción PO a la espera previa de dos ciclos:1periódico SUCCESS+purga real adicional. Segundo run06:17UTC sigue pendiente, NO contado como PASS, bajo heartbeat pazo-130-completar-validaci-n-del-segundo-cron-y-cierre; verificar y retirar seguimiento al observarlo. No volver a desplegar/activar/crear QA ni repetir operaciones completadas. No publicar ni gastar Meta. Los HOLD/OFF inferiores son historia sustituida.

---
## #130 — cambio de criterio del PO: cierre ahora y segundo Cron bajo seguimiento

El PO, informado de que la espera de dos ciclos no es necesaria para registrar llegadas, ordena continuar ahora. Sustituye únicamente la espera previa de dos runs por una ejecución periódica exitosa más una prueba adicional real de purga; el segundo run periódico permanece bajo seguimiento. No se cuenta una llamada manual como run periódico ni se cambia el calendario de seis horas. Resto de privacidad, protecciones, CI y E2E permanece obligatorio. Esta decisión sustituye los HOLD históricos de dos runs de este documento; no autoriza publicar anuncios ni gastar en Meta. Fecha de publicación prevista26-oct según Guatemala, conservando fecha de términos financieros.

---
## #130 — CANDIDATO FINAL RETENIDO HASTA DOS RUNS REALES

Producción actual: SHA2ebc2f34, Verceldpl_HJL3YicGG56kgpBkWmuKbgMf6rC7 READY, avisoOFF/seguridad ESEN publicado. SQL14d/policyv1, Cron4 `17 */6 * * *`, primer run real27oct00:17UTC SUCCESS. Segundo06:17UTC pendiente. SQLsingleuseAPI20261027001529 y Edge landingv5 instalados: token real409(gateOFF), replay403, missing/invalid403. Colección y reporte cliente permanecenOFF en producción. AuthConfirmemail activado porGO específico, retorno canon corregido; C/Dcorreo confirmado real+primera mascota200. SaludfinancieraTRUE/digestab734013e83acb4e2880d50a35031da7 intacto.

Rama release/marketing-issue130-20261027 prepara flagsON, intakeconguardcorreoreal y avisoactivoESEN/fecha privacidad2026-10-27, preservando fecha/términosfinancieros. NO MERGE NI DEPLOY antes de comprobar2runs periódicos reales, latestSUCCESS/heartbeat≤7h, policy14/v1, Siteverify/replay y fuente/CIexactas. GO delPOya está delegado enissue130; no pedirlo de nuevo por operaciones ordinarias. No fake run/manual contado ni cambiarhorario paraacelerar. No publicar/gastarMeta.

Después del gate: publicar candidato en orden seguro conservando DB OFF hasta aviso válido/Edge listos; después enabled=true conhealthvigente. Probar C/Datribuciónpropia/verificadacon1mascota, duplicados, QAretroexclusión y solicitud de supresión; helperlocal5340 mantienecredencialessolomemoria. Luegoalta nuevaE automática de puntaapunta mediante helper5341 y fuenteURLcanónica, sin mocks externos; clasificarE comoQA y verificar reporteadminreal0. Capturar3llegadasUTMreales202 y eliminarúnicamentedeltaQAexactomedianteoperador,sinborrartráficoreal. D7soloensayocontroladoaislado. RevisarPWA/idiomas/MapaDemo/pagos/hashEdge ySHAfinal. Actualizar este registro/postflight existente, issue130 y entregar matriz obligatoria solamente con evidencia. Cerrar helpers/Dockerpropios y desactivar seguimiento al terminar.

---
## Orden vigente #130 — cierre integral autorizado (26-oct-2026)

El PO autoriza completar privacidad, Turnstile, retención14d/Cron, pruebas reales y medición propia tras sus controles; merge/deploy marketing incluidos. Esta orden sustituye los gates históricos de GO separado únicamente en ese alcance. No publicar anuncios ni gastar; no modificar PayPal/Auth/otros módulos. Fuente: https://github.com/DigitalAppcorp/pazo-app/issues/130.

Verificado: PR129 integrado50ed9c55 y avisoOFF publicado en dpl_CGcRQ8nCvzNDUUvMAGPtTws18yWg READY/alias oficial; seis casos EN/ES320/390/1440 PASS. Retención14d/versionv1 instalada con colecciónOFF; Cronjob4 `pazo-marketing-retention-v1`, `17 */6 * * *`, idempotencia comprobada; jobs1/3 intactos. Dos ejecuciones periódicas reales todavía PENDIENTES. Landing Edge se prepara para validar Siteverify real manteniendo gate DB OFF y frontend OFF. No afirmar colección activa ni readiness Meta antes del postflight final. PR127 se reconcilia preservando evidencia histórica.

---
## PRIORIDAD AGENTE — Marketing PAZO, 26-oct-2026

Antes de generar nuevos anuncios de PAZO, leer la primera sección de [docs/PAZO_ACTIVE_HANDOFF.md](docs/PAZO_ACTIVE_HANDOFF.md): el Product Owner ordenó corregir el sesgo de creativos centrados en redes sociales y **priorizar herramientas reales** (QR/pasaporte, agenda de cuidados, ayuda para mascota perdida; Lugares sujeto a QA visual). Guardar en GitHub **solo contexto y decisiones duraderas**, nunca diseños, vídeos, copies ni assets de anuncios. Tracking alojado instalado **OFF**; preparar borradores Meta sin gasto está permitido, publicación/recopilación/privacidad tienen gates independientes. La fuente de UTMs es `docs/marketing/traffic-pilot-urls.json` (no improvisar otras).

---

## GO instalación Marketing OFF recibido — 26-oct-2026

El PO autoriza integrar PR125 y exclusivamente dos migraciones, dos Edge y frontend OFF, retención0, sin Cron/proveedor/usuariosreales ni finanzas. Revalidar SHA/checks/producción. [Secuencia/contrato UTM corregido](PAZO_MARKETING_OFF_INSTALLATION_20261026.md). Esta autorización sustituye solo el gate de instalación anterior; privacidad, recopilación y presupuesto siguen separados.

## Encargo vigente — marketing E2E, 26-oct-2026

Seguir docs/PAZO_MARKETING_E2E_READINESS_20261026.md y la orden directa del PO. Código/pruebas/PR autorizados; instalación OFF, proveedores, recopilación y anuncios mantienen gates independientes. La instrucción histórica de responder solo Listo queda reemplazada por el informe verificable exigido ahora. No activar ni modificar PayPal con este encargo.

## Encargo vigente #121 — cierre público Live (26-oct-2026)

El PO autorizó directamente implementar, integrar y publicar lo necesario para
abrir Amigo de PAZO a todas las cuentas elegibles por USD2.99/mes, siguiendo
gates verificables. Leer issue121, incidente112, PR120 y
docs/PAZO_ISSUE121_PUBLIC_LIVE_RELEASE_20261026.md. Este permiso sustituye las
prohibiciones históricas de hosted/main solo dentro de este encargo. Mantener
invitaciones OFF. Apertura solo por acción admin oficial con MFA fresca,
revisión actual, salud verdadera y blocker NULL; no UPDATE directo, pagos de
prueba, cancelaciones externas, borrado de evidencias, db push ni migration repair.

## Encargo anterior F18

Leer docs/PAZO_F18_IMPLEMENTATION_REVIEW_20261025.md antes de continuar. Implementación de Amigo de PAZO autorizada en rama, sin activación pública alojada ni merge. Los antecedentes graduales no son la especificación comercial nueva. Conservar historia, ledger, protecciones y gates de producción.

---

## F17 PR #99 — F14 one-time SQL protected in active migrations (23-oct-2026 PDT)

Code-only proposal: `supabase/migrations/20261010043307_f14_media_jwt_claim_compat_single_test.sql` now uses the previously-reviewed structural-only/redacted F14 source. Original hosted SQL checksums remain in audit manifests and Git history, **no target-specific DO mutation is executable** through the active migration folder. GitHub guard test requires exact safe source. **Still NO_GO_DB_PUSH** due unavailable initial schema/replay and no PO production authorization; PR #99 remains DRAFT and can cause host auto-deploy if merged. [Evidence](docs/PAZO_F17_F14_ONE_TIME_SAFETY_REVIEW_20261023.md).

---

## F17 — ARCHIVO DE PREHISTORIA PROPUESTO, NO REPRODUCCIÓN (23-oct-2026 PDT)
**Rama derivada de PR #98, SIN merge:** las ocho fuentes SQL anteriores al historial remoto (`20261005*`) se mueven con **Git blob SHA idéntico** a `supabase/history/pre_migration_untracked/` (fuera de migraciones ejecutables). En la rama, solo **122/122 versiones** aparecen bajo `supabase/migrations/`; las ocho siguen preservadas y controladas por pruebas. **Esta acción es archivado de fuente, NO prueba de que todas las instrucciones se aplicaron, NO reconstrucción desde cero ni autorización para `db push`**. Aún no existe baseline pre-Oct5. Quedan 24 diferencias editoriales con secuencia SQL equivalente y 2 descriptores intencionales. **NO_GO_DB_PUSH / NO_MIGRATION_REPAIR / NO_MAIN_MERGE / NO_HOSTED_WRITE**. Ver `docs/PAZO_F17_PREHISTORY_ARCHIVE_PROPOSAL_20261023.md`.

---

## ALERTA DE MIGRACIONES — F17 integridad histórica fase 3 (23-oct-2026 PDT)

Auditoría SELECT y Git blob SHA1 sobre **122/122** versiones alojadas: **96 SQL idénticos**, **24 SQL equivalentes léxicamente pero con diferencias editoriales/transaccionales**, **2 entradas intencionalmente descriptivas insertadas así por sus propios scripts Git** (ambos marcadores y postflight funcional alojado verificados). **8 SQL locales pre-5-oct sin versión remota**. Commit raíz 3-oct no contiene esquema base. El laboratorio de F14 posterior detecta el bloqueo F4/F5 esperado: **diagnóstico PASS, replay completo NO certificado**. PR #98 DRAFT apilado sobre #97/#95. **NO `db push`, NO `migration repair`, NO merge a `main`, NO SQL alojado.** Ver [auditoría fase 3](docs/PAZO_F17_MIGRATION_HISTORY_CONTENT_AUDIT_20261023.md).

---

## ACTUALIZACIÓN F17 — Segunda reconciliación de migraciones (23-oct-2026 PDT)

**PR #97 DRAFT (apila y depende de PR #95; NO fusionar):** recuperación Git, exclusivamente documental, de 20 migraciones remotas y corrección a texto SQL alojado idéntico de 5 variantes adicionales. Comparación de nombres de versiones **130 archivos Git / 122 registros Supabase: 122 parejas por versión; 0 remotas sin archivo; 8 locales sin versión remota**. Pruebas del commit `b2da806c9fdcaf5cf960fc0d4dd9e4cdf8b6f97f`: **9/9 workflows SUCCESS**, incluida la nueva prueba SHA-256. Auditado el catálogo de objetos que aparecen en las 8 migraciones históricas locales: **83/83 objetos únicos existen** (6 tablas, 15 índices, 22 funciones, 9 triggers, 31 policies); las 6 tablas RLS=true. No demuestra el replay histórico ni la equivalencia de definiciones. **Se mantiene bloqueo ABSOLUTO de `supabase db push`, `supabase migration repair` y SQL alojado; producción, PayPal y Vercel intactos**. Documento: `docs/PAZO_HISTORICAL_MIGRATION_PHASE2_AUDIT_20261023.md`.

---

## ACTUALIZACIÓN DE INGENIERÍA — Historial de migraciones y cierre F17 (23-oct-2026 PDT)

**F17 está fusionada en `main`:** PR #81, commit `5d4464f63a996bb8f58c1f41fe943a8be9eda3c6`, CI posterior 7/7 PASS; sitio oficial conserva la versión PAZO ya aprobada por el PO, PayPal Live L1 limitado activo. Las entradas históricas inferiores que dicen `PR81 DRAFT`, `main sin merge` o `L1 BLOCKED` están superadas.

**Migraciones — BLOQUEO ACTIVO de CLI contra producción:** auditoría read-only cruzada de `supabase_migrations.schema_migrations.statements` y las fuentes de GitHub: 110 locales, 122 remotas; 28 parejas por nombre con versiones diferentes. **23 fuentes SQL byte-idénticas se renombraron solo en rama aislada**, 5 fuentes requieren revisión adicional, 8 son exclusivamente locales y 20 exclusivamente remotas. La diferencia de versiones NO está totalmente resuelta. No ejecutar `supabase db push`, `migration repair` ni DDL sobre producción. No automatizar migraciones por el mero hecho de integrar GitHub. [Auditoría detallada](docs/PAZO_HISTORICAL_MIGRATION_DRIFT_AUDIT_20261023.md). Los cambios de rama aún no están autorizados a `main`.

**Pagos:** no fabricar una compra para cubrir el primer E2E Live; la conciliación de una venta real exige firma, evidencia de proveedor, ledger/período y beneficio. Marketing lo gestiona otro agente.

---
## CODEX — ORDEN ACTIVA F17 MARKETING FIRST-PARTY (23-oct-2026)

El Product Owner delegó a **Codex** toda la programación restante del módulo de medición de campañas de PAZO; **no** delegó creativos ni compra de anuncios. Ejecutar de principio a fin **`docs/CODEX_F17_MARKETING_PROGRAMMING_FINISH_ORDER_20261023.md`** en la rama aislada `feat/f17-marketing-firstparty-20261023` / PR #91: antiabuso confiable, retención/cron preparado, E2E, panel admin, reconciliación F17 y CI verde. Comunicar al PO solamente «Listo» al finalizar de verdad y guardar evidencia en GitHub; si existe bloqueo de autorización humana, pedir exclusivamente esa autorización sin afirmar instalación. Los anteriores mandatos F16/PayPal siguen rigiendo como precauciones de seguridad, **no** son una orden de abrir compras, desplegar o alterar finanzas con esta delegación. **Sin GO independiente no tocar main, Supabase alojado, Vercel oficial, Cron alojado, secretos, medición activa ni anuncios.**

**Issue96 — cierre técnico autorizado (23-oct-2026 Guatemala):** F17 `19c0b659` conciliado en PR91 sin cambiar bytes financieros. Código antiabuso servidor, purga/calendario separado, E2E PG17/Chromium y validación del panel implementados; CI del código5cb0056f:13/13 jobs PASS;37 Node,26 PG17 y54 E2E. Cierre técnico documentado, sin fallos pendientes de programación. Todos los gates de marketing OFF, retención0 y sin instalación/activación alojada. [Matriz y evidencia](docs/PAZO_MARKETING_TECHNICAL_COMPLETION_ISSUE96_20261023.md), [runbook](docs/PAZO_MARKETING_INSTALLATION_RUNBOOK_20261023.md). La configuración/GO de proveedor, aviso, retención y despliegue son gates futuros, no autorización implícita en este cierre de programación.

## F17 — pre-merge de main: reconciliación de migraciones (23-oct-2026 PDT)

**PRECAUCIÓN DE BASE DE DATOS:** [PR #94](https://github.com/DigitalAppcorp/pazo-app/pull/94) alinea los nombres de **cuatro archivos L1** con las versiones instaladas en Supabase, preservando exactamente los SQL y agregando guard CI. La auditoría global halló otros prefijos históricos sin correspondencia exacta: **no ejecutar `supabase db push`, migration repair, reapply ni merge de Supabase a producción desde esta rama**, incluso después de fusionar `main`, sin reconciliación integral y GO explícito. El PO aprobó visualmente el frontend oficial `bf78b85`; L1 permanece limitado a un comprador y no hay primera venta real. El cierre F17 debe usar [la matriz canónica](docs/PAZO_F17_SCOPE_CLOSURE_RECONCILIATION_20261023.md). El PR #81 sigue DRAFT: **NO merge a main sin GO nuevo del PO**.

---

# ESTADO VIGENTE — PAZO F17 / PAYPAL LIVE L1 (23-oct-2026 18:50 PDT)

**Esta sección tiene prioridad temporal sobre las entradas históricas más abajo que aún dicen “L1 BLOCKED”, “canary/inactive” o exigen conciliar el checkout QA que ya fue eliminado.** Los límites permanentes de seguridad, privacidad, aprobaciones y no modificar main sin GO siguen vigentes.

- **L1 ACTIVADO POR EL PRODUCT OWNER (MFA):** registro alojado auditado en Supabase: release mode=limited, gradual_campaign.lifecycle=active, stage=L1_FIRST_REAL, capacity=1, campaign revision=2, hosted_gate_verified=true, gradual_health()=true y 1 certificado, desde 2026-10-24 01:45:25 UTC. No se activó modo public.
- **Limpieza QA #88:** 0 legacy checkout intents, 0 webhooks retenidos, 0 recibos Live operativos de esa prueba, 0 períodos pagados. Las 8 cuentas Auth anteriores conservan su clasificación QA y no pueden recibir invitación o figurar como comprador; administrador y MFA intactos. La purga DB no cancela por sí sola una obligación en PayPal externo (su referencia remota histórica devolvió 404).
- **Tecnología desplegada:** Edge checkout v6, worker v10, admin gradual v2 y webhook existente; sus bundles coinciden con el manifiesto #85. CI 12/12 PASS, flujo HTTPS/PWA sintético validado. La beta oficial publicada es https://pazo-app.vercel.app/.
- **Ausencia de transacción real:** aún 0 usuarios reales elegibles/admitidos, 0 invitaciones, 0 nuevos intents, 0 eventos de venta y 0 períodos pagados. El sistema está habilitado para admitir al primer comprador **siempre que esa persona consienta en PayPal**, pero no hay un E2E de venta real para dar por PASS. Worker sale/refund/cancel y concesión de beneficios están implementados y probados sintéticamente; cualquier anomalía real requiere revisión.
- **Código y cierre:** PR #81 permanece DRAFT sin merge en main. Mantener F17 como rama técnica activa; no declarar F16/F17 COMPLETADA hasta reconciliar el DoD y los gates de release aplicables. Marketing está fuera de este brazo técnico.
- **Evidencia y siguiente gate:** [auditoría técnica L1](docs/PAZO_L1_TECHNICAL_POST_ACTIVATION_20261023.md) y [issue #85](https://github.com/DigitalAppcorp/pazo-app/issues/85). Siguiente control: seguimiento del primer pago **real voluntario** y proyección de ledger/beneficios sin generar compras de prueba, más Scope Closure Review de PR #81.

---

## Issue #85 — GO L1 autorizado, ejecutar tras conciliación (23-oct-2026)

El PO autorizó activar solamente Live limitado L1, con crecimiento 1→5→20→50 por evidencia 1/3/10 y MFA reciente en PAZO. [Issue85](https://github.com/DigitalAppcorp/pazo-app/issues/85) prevalece sobre el NO-GO financiero histórico de #84. Primero resolver suscripción prebeta y CREATED firmado HELD sin borrar evidencias, excluir las ocho cuentas QA y conservar admin/MFA. No iniciar si hay legado incierto/held; no public ilimitado ni pagos sin consentimiento individual. Trabajo técnico en `f16/issue85-live-l1-activation-20261023`, base F17 `67fbf675`. Reporte: `docs/PAZO_ISSUE85_L1_ACTIVATION_EVIDENCE_20261023.md`. No llamar SQL start para evitar GoTrue/MFA.

**Resultado técnico #85 (24-oct-2026):** PR86 y PR87 integrados en F17 `2b63907b`; tres migraciones y Edge worker10/checkout6/admin2 instalados, frontend oficial `fbe6c751` READY. CI final 4 workflows/12 jobs PASS, Chromium51, QA8 excluidos/reales0/admin1/MFA1 conservados. **L1_ACTIVATED BLOCKED** por GET original PayPal404 RESOURCE_NOT_FOUND, aunque plan/evento originales sí corroborados. Inactive/canary/gatefalse/legacy1/HELD1, sin invitaciones ni nuevas compras. Única intervención pendiente: consultar el ID original en PayPal Business Live; después conciliación auténtica, certificado y MFA dentro de PAZO. No llamar SQL start ni borrar evidencia. [Registro](docs/PAZO_ISSUE85_L1_ACTIVATION_EVIDENCE_20261023.md).

**CODEX — ORDEN ACTUAL #84 (23-oct-2026):** el PO autorizó integrar #83 en F17, instalar SQL/Edge inactivos, validar y publicar beta oficial conforme [issue #84](https://github.com/DigitalAppcorp/pazo-app/issues/84). Main solo para ese release tras gates. Prohibidos nuevos CREATE PayPal, campaña limited/public, invitaciones y cambios al intent legado. Leer el registro `docs/PAZO_ISSUE84_BETA_RELEASE_EVIDENCE_20261023.md`; esta autorización prevalece sobre límites hospedados históricos de #82.

**CODEX — ORDEN ACTUAL F16 APERTURA GRADUAL 23-oct-2026:** el PO delegó a Codex la implementación completa en rama aislada de la apertura PayPal Live por etapas **1→5→20→50**, en base a evidencia real para 1/3/10 compradores. Leer primero `docs/CODEX_F16_EVENT_DRIVEN_GRADUAL_LIVE_IMPLEMENTATION_ORDER_20261023.md` (issue #82) y los documentos allí enlazados. La orden previa del 21-oct se conserva como fundamento histórico para robustez PayPal/beta, pero sus referencias antiguas de rama, pruebas individuales, «24h», `canary` o ausencia de credenciales NO prevalecen sobre el estado auditado y las decisiones actuales. PO autorizó desarrollo de código y pruebas en rama, NO SQL/Edge/Vercel alojados, cobros reales, `main` ni release `public` sin GO independiente. No pedir de nuevo aprobación de los parámetros de producto ya decididos; finalizar código verificable y no repetir QA Sandbox ya aprobado.

# PAZO — Reglas permanentes para agentes

**CODEX — ORDEN ACTIVA F16/BETA:** Antes de implementar o declarar finalizado cualquier cambio de monetización o lanzamiento, leer y ejecutar integralmente `docs/CODEX_F16_BETA_LAUNCH_COMPLETION_ORDER_20261021.md`. Esa orden concreta el mandato obligatorio del PO: terminar software, backend, QA y preparación antes de pedir claves Live en Administración; únicamente se reserva para el PO el ingreso privado de credenciales y autorización de la prueba/cobro real. No confundir CI PASS con beta lanzable ni posponer F16. 


**Project Brain OS version: 1.4.1**  
Canonical OS: `DigitalAppcorp/project-brain-os`.

Antes de cualquier modificación de código, base de datos, arquitectura o documentación de producto:

1. Leer `docs/PAZO_ACTIVE_HANDOFF.md`.
2. Leer `docs/PAZO_MASTER_ROADMAP.md`.
3. Trabajar únicamente en la fase marcada como **SIGUIENTE** o **EN CURSO**.
4. No inventar decisiones marcadas como **DECISIÓN PENDIENTE**.
5. No saltar fases sin aprobación explícita del Product Owner.
6. Para Supabase: auditar primero, versionar la migración, pedir autorización antes de aplicarla y verificar después.
7. No declarar una fase COMPLETADA hasta que esté merged en `main`, el backend correspondiente esté aplicado, las pruebas hayan sido aprobadas y se haya ejecutado **Scope Closure Reconciliation** contra todo el scope/DoD aprobado.
8. Después de cerrar una fase, actualizar `docs/PAZO_MASTER_ROADMAP.md` y `docs/PAZO_ACTIVE_HANDOFF.md`.
9. En fases de rediseño visual, preservar la funcionalidad y los contratos de datos existentes; cualquier cambio de comportamiento requiere aprobación explícita del Product Owner.
10. Si la fase activa tiene una sub-ruta maestra en `docs/`, leerla completa antes de modificar código, datos o arquitectura de esa fase. La sub-ruta gobierna las decisiones específicas y no puede contradecir la hoja maestra general.
11. Antes de diseñar o programar un módulo nuevo/incompleto, leer `docs/PAZO_MODULE_LIFECYCLE.md` y continuar desde el gate pendiente. Para experimentos/fake doors, además leer `docs/PAZO_FEATURE_VALIDATION_FRAMEWORK.md`.
12. Si existe un PR abierto para la fase activa, auditar ese PR y su branch antes de asumir que `main` contiene el estado más reciente.
13. Build/backend PASS no implica aprobación visual. La aprobación del Product Owner cubre únicamente lo que realmente vio/probó.
14. Fake doors, modelos 3D, assets visuales, instrumentación y estados UX cuentan como entregables reales cuando fueron incluidos en el scope aprobado; no convertirlos silenciosamente en trabajo futuro.
15. Ningún agente puede crear recursos pagados, subir de plan, habilitar add-ons facturables, aumentar límites de gasto o activar infraestructura con costo recurrente/por uso sin autorización explícita del Product Owner. Antes debe indicar proveedor, motivo, costo conocido o variable y alternativa gratuita/actual.
16. La arquitectura de código nuevo se rige por `docs/PAZO_ARCHITECTURE_CONTRACT.md`: nuevas funcionalidades de dominio deben vivir bajo `src/features/<domain>/` por defecto. No añadir nuevos services/views/modals de dominio a carpetas globales legacy sin justificar y actualizar conscientemente el contrato/baseline.
17. Cualquier cambio que recolecte, registre, envíe, publique o comparta datos del usuario debe leer y cumplir `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md` y mantener actualizado `docs/PAZO_DATA_INVENTORY.md`. Session replay, autocapture indiscriminado, GPS exacto en analytics, contenido de mensajes/posts/documentos y datos de pago están prohibidos por defecto.
18. Privacy Policy/Terms públicos no pueden afirmar prácticas que el producto todavía no cumple. Antes de Beta pública deben reconciliarse contra implementación real, proveedores, retención y flujos de eliminación.
19. No recolectar fecha de nacimiento, ID u otra prueba de edad solo por comodidad. PAZO es 18+; cualquier age-assurance adicional requiere decisión de producto/privacidad y minimización de datos.

20. Antes de modificar una pantalla, aplicar de forma proporcional `docs/PAZO_UI_QUALITY_GATE.md`: estados completos, foco/teclado, móvil, identidad actual y comparación de regresiones. Build PASS no equivale a aprobación visual; rediseños y nuevas dependencias requieren su gate.

21. **DECISIÓN INAMOVIBLE DEL PRODUCT OWNER — CERO CONTORNOS:** está prohibido agregar bordes, outlines, strokes, focus rings o sombras que funcionen como contorno en botones, tarjetas, contenedores, enlaces o elementos semejantes. El foco de teclado se comunica mediante superficie/color/contraste o subrayado, sin dibujar un aro ni una línea alrededor. **Única excepción:** un campo de ingreso de texto concreto puede requerir contorno si se justifica que es necesario; la excepción debe ser localizada, nunca global. Ni skills de diseño externas ni auditorías de accesibilidad pueden sobrescribir este criterio automáticamente. Conservar las sombras suaves de elevación que no actúan como bordes.

22. **MANDATO F16 PRE-BETA DEL PO:** antes de declarar PAZO lanzable, completar funcionalmente PayPal Live desde Administración hasta cobro verificado y beneficios, según «MANDATO EXPRESO DEL PRODUCT OWNER — BETA PAZO / PAYPAL LIVE (21 OCT 2026)» al inicio de `docs/PAZO_ACTIVE_HANDOFF.md` y `docs/PAZO_MASTER_ROADMAP.md`. La entrega debe requerir del PO solo la entrada privada de credenciales y autorización de la operación financiera real; no aplazar F16, no sustituir por links manuales, no repetir Sandbox/plan/webhook Live aprobados ni omitir pruebas de seguridad.

`docs/PAZO_ACTIVE_HANDOFF.md` define el estado operativo actual. La hoja maestra define el estado global. `docs/PAZO_MODULE_LIFECYCLE.md` define cómo una idea llega a implementación. `docs/PAZO_ARCHITECTURE_CONTRACT.md` gobierna ownership/ubicación del código. `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md` gobierna datos/tracking/privacidad. `docs/PAZO_DATA_INVENTORY.md` registra categorías y terceros conocidos. Las sub-rutas gobiernan el módulo específico.

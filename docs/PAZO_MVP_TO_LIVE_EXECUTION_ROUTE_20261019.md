# PAZO — Ruta de lanzamiento MVP Beta → PayPal Live

## Ruta ejecutiva — cinco etapas (PO: beta gratuita; Live posterior)

Esta sección es el orden vigente para el cierre. Ver dictamen de evidencia en docs/PAZO_MVP_LAUNCH_AND_LIVE_AUDIT_20261019.md. No reabrir módulos sociales ya aprobados salvo regresión demostrada.

### 01. Gateway financiero y administración
Preservar Sandbox Legacy y cancelaciones. Auditar y reconciliar sin duplicados los 26 eventos del inbox retenido. Implementar en rama gateway server-side con merchant, entorno, generación y plan inmutables; checkout Live independiente, webhook firmado e idempotente, período verificado, refund/disputa, beneficios y cancelación. Completar en admin un selector autenticado con preflight real, confirmación PO, auditoría, kill-switch y rollback. Versionar también el entrypoint alojado del diagnóstico Sandbox sale-review. DoD: pruebas PG17+CI de rutas negativas, sin despliegue/secret/Live activo. DDL hosted o Edge financiera requiere GO específico. Prueba real Live solo después de beta HTTPS.

### 02. Seguridad y operación de beta
Clasificar cuatro SECURITY DEFINER RPC públicas y su superficie expuesta; verificar protección de contraseñas filtradas en Supabase Auth; revisar rol admin/moderador, manual de reportes y bajas, medios/CDN, privacidad y retención, variables del build. No revocar funciones públicas útiles ni pedir repetir E2E Auth/F14 previamente aprobados. DoD: revisión de privilegios y SOP operativo documentados; sin hallazgos de seguridad críticos pendientes.

### 03. Cierre visual/producto
PO valida en localhost corrección del parpadeo en entrada Amigo de PAZO, limpieza de Mi membresía, cuatro beneficios (insignias, cinco fondos, muro por opt-in/out y medallas) y el panel admin responsive contra referencia aprobada. Usar datos Sandbox ya verificados, no exigir nueva venta artificial. DoD: capturas y aceptación específica; corregir solo regresiones nuevas.

### 04. Release candidate local
Ejecutar verify:prepreview, build, artefacto PWA, CI+6 PostgreSQL labs, smoke corto de módulos críticos sin reabrir QA aceptada. Para beta pública: QA Sandbox UI apagada, altas Sandbox desactivadas; no anunciar beneficios públicos como activos sin QA. No exponer cuentas demo o datos falsos como actividad real. DoD: SHA final inmutable, rollback y checklist firmados, PR candidato a Preview.

### 05. Único Preview de aceptación y beta pública
Solo tras cerrar 01–04, publicar un Preview privado del SHA final. Verificar HTTPS, version, Auth/recovery, PWA real instalada y navegador en Android/iOS, callback/return, refresh, navegación, acceso público sin autenticación Vercel, métricas/errores y rollback. Fijar fecha de vigencia legal al publicar. Pedir GO PO para merge/main/deploy. DoD: beta gratuita accesible, segura y aprobada.

### Activación Live posterior — verificación externa final
Ya con beta HTTPS oficial, PO configura credenciales, plan y webhook Live por Vault en panel (nunca secretos en chat), se valida merchant/plan/origen, firma y entrega webhook, cancelación/renovación y una transacción real supervisada con reconciliación de período. Tras un GO financiero independiente se cambia SOLO nueva alta Live por selector administrativo auditado. Ni publicar beta ni guardar claves activa cobros. Las suscripciones Sandbox anteriores conservan merchant y gestión originales. No prometer cero cambios si PayPal real descubre incompatibilidades.

Fuera del cierre: mensajería futura informativa, extensiones fake doors, mejoras de rendimiento sin impacto medido, cobertura de egress sin API del proveedor. Beta social y cobros Live son dos gates diferentes.

---
Fecha: 2026-10-19 · Product Owner: usuario · Ejecutor: ChatGPT / Project Brain OS 1.4.1
Estado: **EN CURSO / MVP_RELEASE_NO_GO / LIVE_NO_GO**.
Documento de ejecución, no certificación. Fuente: `AGENTS.md`, `docs/PAZO_ACTIVE_HANDOFF.md`, PR #44 y gates F14/F16. Los snapshots históricos pueden haber sido supersedidos.

## Decisiones invariables
1. PAZO y QR gratis; «Amigo de PAZO» opcional USD 2.99/mes, beneficios aprobados: insignias, cinco fondos, muro con consentimiento individual por mascota, medallas por 3/6/12 meses pagados completamente.
2. Desarrollo en `http://localhost:5173`, pagos exclusivamente PayPal Sandbox. Webhooks públicos HTTPS ya van a Supabase; retorno QA existente usa HTTPS. **No** registrar localhost como webhook público ni dominio oficial.
3. Beta futura en HTTPS público; dominio todavía no decidido. No pedirlo ahora ni fijar preview temporal como oficial.
4. Cambio Sandbox→Live desde administración: automático **solo en la mecánica posterior a una acción administrativa autorizada**, con preflight, segundo consentimiento explícito del Product Owner, versionado, registro, monitor y rollback. **NO** cambiar por detectar beta pública, por pegar claves o por desplegar frontend.
5. No usar `main`, deploy público, credenciales Live o modificaciones financieras hosted sin el gate correspondiente. No replicar pagos Sandbox ya probados, no falsificar ledger por retorno PayPal.
6. «Cero contornos» permanente. Conservar QA funcional ya aprobada, verificar exclusivamente integraciones que faltan y regresiones.

## Evidencia válida y estado
- **CODE** = programado. **CI** = pruebas automáticas, no backend listo.
- **HOSTED** = deploy/migración y postflight exactos.
- **E2E** = operación real, owner y webhook/payments verificados. **PO** = aprobación de capturas/comportamiento.
- **RELEASE** = publicación, monitoreo, rollback y merge aprobado. Ninguna columna implica la siguiente.

| Gate | Prioridad / salida requerida | Estado verificado | Próximo paso y DoD |
|---|---|---|---|
| R0 integridad | rama y build PR #44; revisar secretos/CI | PASS HEAD `0d3ac9c` con CI+6 labs 7/7. PR DRAFT | Cada SHA nuevo: CI+6 y source audit. |
| R1 membresía visual | «Mi mascota» sin parpadeo y «Mi membresía» limpia con cancelar/actualizar | CODE/CI PASS, **PO visual pendiente** | PO muestra dos pantallas con cuenta pagada sin debug; corregir diferencias y cerrar por captura. |
| R2 pagos Sandbox | intención/consentimiento idempotentes, abandono, status, venta firmada, período, refund/reversal, cancelación | OAuth de Edge Legacy real PASS; pago previo PASS; **conciliación venta más reciente no cerrada** | Ejecutor audit/reconcile sin nuevo cargo; casos negativos, historial, evitar doble cobro; una prueba genuina solo si falta evidencia indispensable. |
| R3 beneficios | insignia Feed/perfil, cinco fondos, muro opt-in/out, medallas 3/6/12 | backend/UI existen; flag público OFF; E2E y visual pendientes | QA de dueño pagado/no pagado, expiración y reversión, medallas solo con datos sintéticos. No encender beneficios públicos aún. |
| R4 gateway administrable | dos entornos, merchant+generación históricos, Vault, selector server-only, rollback | panel y OAuth PASS; contratos offline CI; **runtime conmutador no existe** | Ejecutor programar adaptadores reales y DDL versionado en PR, probar con PG17. Aplicar hosted solo con GO por migración/función. |
| R5 privacidad/moderación | retirada de media acotada, solicitudes/baja, textos legales/retención, atención real | baja de cuenta QA previa PASS; purge general OFF, prueba de medio y legal en beta pendientes | Test físico solo con nuevo objeto descartable/GO específico; SOP/ACL, publicación legal con fecha real. |
| R6 social MVP | Auth, mascotas/QR, Feed, cuidados, comunidades/eventos/lugares, denuncias/administración | múltiples QA locales aceptadas. Admin overview referencia no validada aún | Smoke del build definitivo móvil + visual admin y estados; no repetir E2E de Auth/Feed sin regresión. |
| R7 observabilidad | estadísticas veraces, backup/restore, costes, logs, alertas, incidentes | admin panel y métricas parciales; backups y monitor de release no certificados | Revisar retención/restore, egress y límites, alertas de fallos de pago, SOP; no inventar KPIs Live. |
| R8 hosting beta | HTTPS, versión exacta, dominio, Auth/links, PWA Android/iOS instalada/no instalada, rollback | **Lectura Vercel PASS** sin forzar teamId; Preview de rama READY en SHA `8569384`, distinto al HEAD actual. Dominio oficial beta pendiente; HTTPS PWA E2E no verificado | Ejecutor auditar build/deploy exacto y PWA/return; PO aprobar dominio/publicación más adelante. |
| R9 Live | app REST Live, credenciales Vault, plan Live USD2.99, webhook firmado, facturación+reversión, canary y selector | **NO-GO**: dominio/credenciales no dados, checkout Live/backend E2E no implementados | Preparar código/offline hoy; tras R8 verificar merchant, plan, webhook y un cobro REAL supervisado con GO separado. |

## Secuencia crítica sin microfases
**A — hoy, dominio no requerido:** fuente/CI, arreglar UI F16, conciliación Sandbox, conectar beneficios verificados y seguridad; implementar gateway server-only por versión/merchant y tests, preparar SQL no instalado, documentar rollback; corregir puntos reales de MVP en PR. Ninguna compra Live.
**B — beta HTTPS publicada:** resolver acceso Vercel; configuración URL estable y variables Auth/CORS, PWA instalada/no instalada, retorno/cancel de PayPal; usar panel admin para credenciales Live en Vault sin pegarlas al chat, validar app/merchant/plan/webhook Live por API, probar flujo de períodos, renovación/cancelación, privacidad, incidentes; aprobar canary único de dinero real bajo GO.
**C — primer cobro Live:** botón admin con preflight **del servidor** fresco + confirmación explícita, escritura transaccional con compare-and-swap, auditoría y rollback, solo **nuevas** altas Live. No convertir subs Sandbox en Live. No habilitar por fecha/domino/redirect.
**D — primeros siete días:** monitorear doble cobro, APPROVAL_PENDING, reintentos webhook, conciliación, pagos fallidos/reversos, bajas, errores, costos. En incidente, kill switch solo para nuevos checkouts; las suscripciones Live existentes retienen lectura/cancelación por su merchant original. Cerrar Scope Closure Reconciliation y merge solo con PO GO.

## Arquitectura exigida
App UI (localhost/beta HTTPS) → API Auth/owner/consent/limiter/idempotencia → selector de NUEVA compra administrado en backend → binding inmutable (entorno/merchant/app/generación/plan) → endpoint PayPal correspondiente → HTTPS webhook separado por entorno con firma, anti-replay e inbox idempotente → ledger real de períodos → beneficios.

Históricos:
- Sandbox Legacy: conservar secretos Edge y lectores/cancelación **inmutables**.
- Sandbox nuevo: configuración Vault versionada, tras GO de QA.
- Live: App REST, Vault y host PayPal Live independientes, tras GO final.
Un error leyendo un merchant NUNCA debe redirigir automáticamente a otro; tampoco dar premios por `ACTIVATED` o retorno de browser. Cambio de precio requiere nuevo plan/consentimiento versionado.

## Seguridad y riesgos
Supabase Advisor 19-oct: 29 RLS enabled/no policy principalmente esquemas privados, 4 SECURITY DEFINER anon, 38 authenticated; revisar riesgo/ACL, no revocar funciones públicas utilizadas por RLS/UI por reflejo. Performance: 16 FK sin índices y 1 índice duplicado, optimización P1 previa o posterior según carga. Vercel lectura directa de proyecto y Preview READY PASS sin forzar teamId; no afirmar que el Preview corresponda al último SHA o que producción esté lista para la beta. PayPal requiere webhook HTTPS con firma: https://developer.paypal.com/api/rest/webhooks/rest/ ; documentación Live https://developer.paypal.com/api/rest/production/ .

## Únicamente ayuda humana indispensable
**Ahora:** no se requiere reconexión Vercel; acceso de solo lectura conseguido sin forzar teamId. Pendiente verificar deploy del SHA final, banderas efectivas, protección de previews, PWA e instalar/rollback cuando el PO apruebe el release.
**QA visual:** dos capturas del nuevo «Mi membresía» y parpadeo «Amigo de PAZO» + referencia admin final. No repetir Auth/Feed ya aceptados.
**Gates sensibles:** autorización por DDL, Edge financiero o destrucción de medio descartable, indicando exactamente impacto y rollback.
**Solo con beta oficial:** dominio estable, credenciales Live guardadas en el panel (nunca aquí), merchant/plan Live comprobados y GO del primer cobro real supervisado.

No marcar ninguno de estos pendientes como completado por CI; ruta vigente **MVP_RELEASE_NO_GO / LIVE_NO_GO** hasta evidencias enumeradas.

## Primer adaptador real de comprobación Live — solo código, OFF
El módulo `supabase/functions/pazo-admin-paypal-validate/liveProviderReadOnly.mjs` se añadió como **lector de recursos PayPal Live**, sin integración HTTP ni despliegue: realiza OAuth con host fijo `api-m.paypal.com`, GET de Plan ACTIVE único USD2.99/mes ilimitado sin setup fee, GET de webhook registrado exactamente en `https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-paypal-live-webhook` y eventos necesarios. Solo emite resultado booleano/código seguro, **nunca tokens ni IDs privados**. `merchantIdentityVerified=false`, `webhookDeliveryVerified=false`, `mayCharge=false`, `mayActivate=false` aun en éxito: lectura de configuración NO acredita entrega de webhooks ni activa checkout. Integrarlo únicamente desde Edge autenticada admin con Vault y con GO exacto, cuando exista app/plan/webhook Live. El endpoint Live todavía NO está desplegado, así que el lector no puede informar PASS real.

## Auditoría incremental real (19-oct; solo lectura)
- `R0`: último código verificado `b75431c32eee995e194e46b134a3b969ecadc910`, **CI + seis labs SUCCESS (7/7)**. PR #44 DRAFT, no merge.
- `R2/R3`: Supabase tiene **2** períodos pagados de QA, **2** preferencias de temas, **2** consentimientos al muro, **0** entradas en `paypal_payment_entries`. Esto prueba existencia de registros, no que se hayan conciliado las ventas ni que toda la UX de beneficios esté aprobada.
- `R5`: **1** permiso de moderador, **1** denuncia y **1** solicitud de eliminación de cuenta. La operación real/retención y la prueba física de medio descartable requieren evidencia; no son cero como en snapshots más antiguos.
- `R8`: el 403 apareció únicamente al forzar teamId; la lectura de proyecto/deploy/alias/env metadata sin ese parámetro funciona. Preview READY antiguo, versión final de beta no certificada.
- `R9`: el lector PayPal Live `liveProviderReadOnly.mjs` es **solo código offline** y comprueba token OAuth, plan mensual exacto sin fee y webhook dedicado; aun en éxito devuelve `mayCharge=false` y `mayActivate=false`. No está desplegado ni conectado al panel administrativo todavía. Un intento de escribir esa conexión fue bloqueado por controles de la herramienta: **no hubo commit ni despliegue** de ese intento. No cambiar el checkout por fuera de un gate autorizado.
- Seguridad externa: Supabase advisor informó 29 RLS sin policy (mayormente privadas), 4 funciones SECURITY DEFINER accesibles a anon, 38 a authenticated, 16 FK sin índice y 1 índice duplicado. Auditar impacto antes de tocar ACL o índices.

## Vercel diagnóstico de acceso RESUELTO (19-oct-2026; solo lectura)
- PO confirmó visualmente en el dashboard autenticado workspace `digitalapp`, proyecto `pazo-app-t83r` y dominio `pazo-app-t83r.vercel.app`. Screenshot: Production Deployment READY desde rama `main` commit antiguo `5163c18`, por tanto NO es el nuevo RC F16.
- El conector puede fallar con **403** cuando se suministra explícitamente `teamId=team_02Ax5UcD1OlLzpDBYyNMi6KO`, pero **responde correctamente para este mismo proyecto al omitir teamId y usar su id exacto**. Lecturas REST reales: get_project, list_deployments, list_aliases, list_project_domains y filter_project_envs(`decrypt=false`) PASS. No solicitar reinstalar/reconectar Vercel ni tocar permisos; usar solo ids ya resueltos, acceso read-only sin forzar scope.
- Último Preview visto en `READY`: deployment `dpl_6TC1d3f2AHrBZSb6zUHoouSECinU`, commit `8569384c90b6cf4671d8348748621d64fbc1db80` rama `f13/section-titles-20261012`; su SHA no iguala el HEAD del PR #44. Alias de la rama existe. **Preview READY ≠ beta pública GO, ni QA visual/E2E PASS**.
- Dominio Vercel `pazo-app-t83r.vercel.app` verificado; NO confundirlo con un dominio definitivo aprobado de PAZO. Proyecto aplica SSO protection a despliegues excepto dominios personalizados; verificar acceso de usuarios externos e instalación de PWA antes de publicación. Env **metadata solo** revisada: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_MAPBOX_ACCESS_TOKEN`, flags F16 preview branch y observabilidad. No se han revelado ni validado valores de secretos ni cambiado variables.
- **R8 actualizado: ACCESO A VERCEL READ-ONLY PASS; beta/hosting RC y PWA E2E todavía PENDIENTE.** Requiere inspeccionar deploy del SHA final y build flags efectivos, y aprobación PO antes de publicar/merger. Sandbox activo y Live OFF.

## GATE PRE-PREVIEW — decisión PO: código y localhost primero
El PO decidió no crear más Previews mientras queden piezas por desarrollar. Un único Preview final servirá para QA HTTPS/PWA y autorización de beta, no para continuar construyendo.
- Nuevo `scripts/pazo-prepreview-local.ps1`: no hace pull, push, deploy, pagos ni SQL; comprueba rama y árbol limpio, corre `npm run verify:prepreview` (gobierno, guard financiero, F16 sintético, compilación y auditoría del artefacto `dist/`), y restaura los flags de QA del entorno original.
- CI ejecuta `test:prepreview:dist` tras la compilación para comprobar manifest, iconos, SW network-only, assets producidos y rutas de retorno/cancelación PayPal SPA.
- PASS de este control significa **solo CODE/BUILD**. No implica aprobación visual, beneficio E2E, PWA instalada, backend financiero listo ni autorización de producción.

## Auditoría pre-Preview financiera agregada (19-oct-2026)
- Consulta SQL read-only de QA: 2 períodos pagados, 2 `sale_id` distintos, 2 `event_id` distintos; **0** identidad obligatoria ausente, contrato USD 2.99/Sandbox correcto en ambos y fechas verificadas válidas.
- Buzón de webhooks: **26 pendientes**, desglosados en 13 CREATED, 5 ACTIVATED, 5 SALE.COMPLETED y 3 CANCELLED; 0 ligados a pago en el inbox. Worker financiero sigue OFF deliberadamente, no deducir 26 pagos no cobrados ni completar el ledger alternativo con inserciones artificiales.
- Gate R2 exige reconciliar contra PayPal las ventas y el inbox, incluyendo idempotencia, refund/dispute, checkout abandonado y mantenimiento de los períodos ya verificados. Conservar eventos retenidos hasta entonces; solo se permite preparación offline sin GO financiero PO.
- El nuevo gate pre-Preview code/build está verificado con CI + 6 labs **7/7 SUCCESS** en SHA `5bbeb6a`. No hay aceptación E2E ni visual, Preview y beta siguen NO-GO.

## Dictamen de auditoría — beta gratuita frente a PayPal Live
Ver informe canónico `docs/PAZO_MVP_LAUNCH_AND_LIVE_AUDIT_20261019.md`. Core social y panel: código/CI funcional avanzado, correcciones visuales recientes requieren aceptación PO; beta gratuita puede cerrarse separadamente sin habilitar cobros. Live desde panel **no está implementado** pese a los borradores Vault: faltan gateway server-side versionado, webhook/ledger/checkout Live, selector auditado y rollback. No reabrir Auth/Feed aprobados por viejos documentos. El inbox Sandbox contiene 26 eventos en pending; no inferir 26 cobros. Revisar protección contraseñas filtradas y cuatro RPC públicas SECURITY DEFINER antes de beta.

## F16 — Implementación de ingreso de webhook Live (rama solamente, etapa 1)
- `supabase/functions/pazo-paypal-live-webhook/index.ts` declara **`LIVE_WEBHOOK_RELEASED=false` en código**. Una llamada HTTP resulta 503, incluso si un operador define variables. No desplegado; no crea gastos, cuentas, planes ni pagos. **NO es webhook Live operativo aún**.
- `livePostback.mjs`: verificación en host fijo `api-m.paypal.com`; valida certificado PayPal Live, cabeceras y transmisión de cuerpo JSON sin reserializar, verifica OAuth + `verify-webhook-signature` firmado, jamás devuelve credenciales.
- `liveIngress.mjs`: cuerpo limitado a 64 KiB, validación estricta y firma, contrato externo `provePazoScope` para merchant+owner/intent+plan antes de cualquier inserción, interfaz `recordIfAbsent` para inbox persistente idempotente, respuesta no-ACK si proveedor/ownership/DB no verificables; solo almacena referencia mínima evento/tipo/entorno/generación. **Todavía NO existe implementación real de estos adaptadores para Live**, por eso bloqueado.
- Tests `adminPaypalLiveWebhookIngress.test.mjs` conectados a `test:closure`: certificados falsos, otra cuenta/ambiente, firma rechazada, doble evento, firma antes de persistencia, sin PII en inbox. El latch Live nunca cambia.
- Próximo tramo: adaptadores server-only de generación Vault, vinculación inmutable, ledger/retenciones Live y pruebas PG17. Instalación/aplicación/activación hosted exige nuevo GO PO específico.

## F16 — Candidato checkout Live (solo PR, no publicado)
- `pazo-paypal-live-checkout/index.ts` completamente apagado (`LIVE_CHECKOUT_RELEASED=false`), sin autorización runtime por env ni escritura alojada.
- `liveSubscriptionProvider.mjs`: proveedor REST real con origen fijo `api-m.paypal.com`, OAuth, `POST /v1/billing/subscriptions` idempotente con `PayPal-Request-Id` UUID, return/cancel origen beta HTTPS, validación URL de aprobación oficial y lectura GET independiente de la suscripción. No agrega cobro ni concede beneficios.
- `liveCheckoutCandidate.mjs`: consentimiento afirmativo ES/EN+digest/version, owner Auth server-only, admisión, registro privado inmutable, claim único **antes** de POST, binding owner/intent/merchantGeneration/plan verificado por GET. Un timeout deja la operación en revisión, nunca reintenta creando una segunda suscripción. Estado de respuesta solo `APPROVAL_PENDING` y `paymentVerified=false`.
- Contratos inyectados `consentStore`, `intentStore`, `resolveAuthenticatedOwner`, `admit` **TODAVÍA NO conectados a nuevas RPC Live**; no hay generación de claves ni conmutación. Tests sintéticos de fraude cruzado, doble claim, URLs y errores se ejecutan en `test:f16:synthetic`.
- Siguiente: esquema transaccional versionado y stores Live; integrar el endpoint Auth bajo gate backend y registrar origen definitivo luego. No presentar esta implementación como pagos Live disponibles.

## Draft de esquema privado para el gateway multientorno — sin instalación
`supabase/drafts/f16_live_gateway_generation_inbox_DISPOSABLE_ONLY.sql` modela siete tablas de laboratorio: versiones inmutables de merchant/plan/credenciales Vault, selección Live bloqueada con kill switch/revisión, auditoría, intención/consentimiento/claim por cuenta, inbox idempotente firmado, períodos cobrados y holds por reembolso/disputa. **Incluye guard obligatorio para BD `f14_synthetic` y usuario postgres; NO se puede aplicar al proyecto alojado PAZO, no tiene escritor RPC ni grants.** Tests estáticos agregados a CI. Antes del deploy real se requiere convertirlo en migración versionada, agregar RPCs privadas con ACL, validación anti-overlap, periodo de retención/borrado/backup, pruebas reales PG17 y gate PO por tabla y Edge. No usar este draft como indicio de Live READY.

## F16 Live existing-account management (rama, no Live operativo)
Se implementaron `liveAccountManagement.mjs` y `liveHistoricalProvider.mjs` con tests `f16LiveAccountManagement.test.mjs`. En lugar de depender del entorno de **nuevas altas**, la cuenta existente se consulta/cancela por su merchant+generation original de backend, owner Auth privado, intent y plan inmutables. Cancelación necesita solicitud expresa, claim idempotente previo y verificación posterior GET del proveedor; si el POST falla no repite mutación automática. `CANCELLATION_PENDING` no concede ni retira paidThrough. Los adaptadores no están conectados a Edge alojada ni tienen función de claims instalada, y **no habilitan cobros Live**.

## F16 — admin Live resource inspection wired but kept hidden (branch-only)
The authenticated `pazo-admin-paypal-validate` code now stages `inspect_live_resources`: GoTrue JWT + admin-grant Vault RPC → Live API GET plan and webhook, sanitized result with `mayCharge=false`, `mayActivate=false`, `changes_checkout=false`. Admin UI has a staged control behind `LIVE_RESOURCE_INSPECTION_RELEASED=false` because Supabase hosted admin Edge is **still v3**, without this action. No button visible in current beta, no checkout change, no production deployment, and NO Live verification claim. Deployment later requires specific PO GO and exact hosted postflight parity.

## F16 — Harden Live plan price preflight
The read-only PayPal Live plan check now rejects unapproved billing-cycle sequence, tiered prices, missing payment preferences, auto-billing outstanding balances, nonzero taxes and setup fees, in addition to non-monthly or non-US$2.99 plans. It remains a **configuration read, not merchant proof or charging authority**. Tests cover each rejection; Live OFF.

## F16 Live entitlement projection — disposable PG17 only
Read-only source `supabase/drafts/f16_live_entitlement_projection_DISPOSABLE_ONLY.sql` projects active paid-through and 3/6/12 completed cycles from *independently verified* Live sale periods, respects refund/reversal/dispute holds, strictly isolates the owner and fails closed on overlapping service windows. The signed inbox event used to support a paid period must now be `PAYMENT.SALE.COMPLETED` and cannot be reused for a second sale (composite FK and UNIQUE). PostgreSQL 17 lab checks these invariants. No hosted deployment, no grants to frontend/service_role, no entitlement production release; projection consumes verified source ONLY, not PayPal ACTIVE status.

## F16 cancellation claim — isolated SQL tested, still not installed
`f16_live_cancel_claim_DISPOSABLE_ONLY.sql`: private owner-scoped one-way cancellation claim, even if new purchases are OFF. Uniqueness prevents two cancellation POSTs for the same binding. No anon/auth/service_role EXECUTE; PostgreSQL 17 lab checks replay and wrong owner. Live account manager must later call this through a specifically PO-approved service-only RPC before touching PayPal. Never auto-retry ambiguous cancellation.

## F16 — staged server-side cutover and emergency pause (not operational)
`pazo-admin-paypal-validate/liveCutoverCoordinator.mjs` implements a server-only cutover coordinator as a **contract**, gated `releaseApproved=false` and `emergencyPauseApproved=false` by default. Requires GoTrue-derived admin, exact typed operator confirmation, fresh (<5min) server-only provider+webhook+PWA+rollback+ledger/owner proofs, immutable merchant generation and atomically audited DB compare-and-swap. Emergency stop of **new** checkouts is separate and NEVER falls back to Sandbox purchases or disables account cancellation. There is no deployed Edge route, active button, verified Live merchant, real proof store or SQL compare-and-swap implementation: tests use mocked backend and always expose `mayCharge=false`. Next require private SQL/RPC + hosted deployment gates to become operative after beta approval.

## F16 atomic Live activation + emergency stop SQL contract (DISPOSABLE ONLY)
`f16_live_cutover_atomic_DISPOSABLE_ONLY.sql`: finite server-approved evidence (5min), admin grant, immutable Live merchant generation, transactional compare-and-swap by runtime revision, consumed proof and append-only audit in one PostgreSQL transaction. Pausing new checkouts leaves `environment=live` + original merchant generation so historical Live owners can still cancel. Includes sandbox-protecting OFF check constraints and PG17 lab; positive activation is tested **only** after synthetic-only removal of constraints in disposable DB to simulate a future separately authorized release. Neither ALTER nor SQL routine has been applied to hosted PAZO; there are no browser/service grants, Live remains OFF in actual DB.

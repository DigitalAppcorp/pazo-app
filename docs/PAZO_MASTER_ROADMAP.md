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

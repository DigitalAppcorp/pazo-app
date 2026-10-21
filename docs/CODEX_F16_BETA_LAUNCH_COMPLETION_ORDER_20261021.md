# ORDEN EJECUTIVA PARA CODEX — TERMINAR BETA PAZO Y PAYPAL LIVE

**Fecha de handoff:** 2026-10-21. **Propietario del producto:** PO de PAZO. **Prioridad:** bloqueante de lanzamiento. **Estado:** trabajo pendiente, no declarar completo por pasar CI.

## 0. Orden innegociable del PO

> «Termina TODO lo necesario para lanzar la beta de PAZO. Debes entregar el sistema totalmente integrado y probado, para que mi única configuración rutinaria pendiente sea ingresar y guardar Client ID y Client Secret de PayPal Live **en el apartado de Administración** y, cuando el sistema confirme seguridad y preparación, autorizar personalmente la activación/prueba real de US$2.99. Después deben funcionar automáticamente el cobro, registro, renovación, cancelación, beneficios y panel. No quiero más programación después de guardar las credenciales. Si una intervención manual imprescindible te bloquea, pídemela exactamente y continúa con lo demás. No te detengas arbitrariamente ni cambies de objetivo».

**Precedencia:** leer `AGENTS.md`, `docs/PAZO_ACTIVE_HANDOFF.md`, `docs/PAZO_MASTER_ROADMAP.md` (allí figura el mandato textual y el DoD). Project Brain OS separado; no modificar `main` ni datos de producción por comodidad. No interpretar esto como permiso para crear pagos reales sin consentimiento del PO.

## 1. Punto exacto de recuperación (auditar antes de programar)

- Repositorio: `DigitalAppcorp/pazo-app`.
- Integración activa: `f13/section-titles-20261012`, PR #44 (DRAFT), último HEAD confirmado al crear este archivo: `5fff0e39875a71611a65c6170c505a652b4b81ab`. Verifica si avanzó y actualiza referencias; no hacer reset ni sobrescribir otro agente.
- Rama **ya creada**, recién abierta y sin modificaciones de esta fase al interrumpirse: `f16/live-signed-sale-reconciler-20261021`. Continúa aquí, y crea PR hacia F13. No tocar release o main sin GO.
- Clones locales conocidos: `C:\Users\osori\PAZO-F13-preview` (históricamente `package-lock.json` modificado; NO borrar); `$HOME\Downloads\Nuevo pazo app\pazo-beta-rc` (trabajo Codex preservado). Audita `git status` antes de operaciones destructivas.
- Supabase ref `mrybvqdebbgcayuvgkkr`. Vercel proyecto `pazo-app-t83r`, equipo `digitalapp`; ChatGPT connector Vercel devolvió 403 aun tras autorización del usuario. Codex puede usar su CLI/local autorizado, pero debe demostrar dominio HTTPS y estado real; no inferir desplegado por CI.
- Membresía: **Amigo de PAZO, US$2.99 mensual**; PAZO gratuito con badges 1/3/6/12 meses y ventajas previamente aprobadas. Conserva identidad visual F13 (sin contornos salvo inputs necesarios), responsive admin/mobile PWA.
- **Ya verificado:** PayPal Sandbox aprobó flujos y cancelación; plan + webhook Live de generación 1 leídos/verificados y registrados. NO exigir otra prueba Sandbox, recrear plan/webhook ni `reporting/balances/read` para saldos; ese gate artificial fue retirado. No enlaces PayPal manuales como solución.
- **Ya integrado a F13**:
  - PR #47: lector original Merchant (no se exige API de balances).
  - PR #46: entrada segura para provisión;
  - PR #48/#49: flujo privado temporal de Merchant ID y retirada del gate de balances;
  - PR #50: webhook firma/rutas Edge internas y públicas;
  - PR #51: preparación credenciales Live Admin+MFA en Vault;
  - PR #52: lector histórico **por generación inmutable** desde Vault para checkout, webhook y refunds;
  - PR #53, commit `5fff0e3`: migración `20261021060506_pazo_f16_live_vault_generation_backend.sql` versionada, formulario Admin habilitado en F13, Endpoint `pazo-admin-paypal-vault` **v1 ACTIVE JWT ON** desplegado para guardado no financiero.
  - Las suites correspondientes terminaron **9/9 GitHub Actions PASS** por PR; esto no demuestra finanzas Live E2E.
- **Base alojada postflight sin claves** (última lectura): merchant_generations=0, live paid periods=0, credenciales Live no guardadas; selector sandbox, `live_enabled=false`, `kill_switch=true`, `active_generation=null`. La migración Vault se aplicó; comprobado que `anon/authenticated` no pueden ejecutar RPC de secretos y `service_role` sí. Preservar.
- Checkout y webhook Live alojados **hard-OFF** (`RELEASE_APPROVED`, `LIVE_CHECKOUT_RELEASED`, `LIVE_WEBHOOK_RELEASED` en sus entrypoints); worker de venta no orquestado completamente, UI comprador todavía muestra PayPal deshabilitado salvo Sandbox QA. No habilitar cargo por solo guardar credenciales ni convertir return URL en prueba financiera.

## 2. Pendientes de programación, en orden de dependencias

### P1 — Conciliación Live real, firmada e idempotente (EMPEZAR AQUÍ)
1. Inspecciona `supabase/functions/pazo-paypal-live-webhook/`, contratos `liveSettlementReconciliationGate.mjs`, `liveVerifiedSettlementWriter.mjs`, `liveHistoricalReadPipeline.mjs`, `liveMerchantEvidence.mjs`, `liveHostedRefundWorker.mjs`, RPCs SQL existentes `pazo_f16_live_service_inbox_claim/finish`, `...verified_sale_record`, `...binding_read`, `...recorded_sale_read`. Usa su arquitectura, no la reemplaces.
2. Implementa el **trabajador privado durable** para eventos `PAYMENT.SALE.COMPLETED`: reclamar con lease una entrada real de inbox con firma previamente verificada; resolver el vínculo original de owner/intento/suscripción/generación; reconstruir `subscriptionId`, `saleId`, ventana de búsqueda y firma **solo desde evidencia persistida confiable**. El RPC de claim actual solo devuelve eventId/tipo/intento/owner y `financialEvidenceVerified=false`; no inventes `signatureVerified=true` ni transacciones o períodos.
3. Buscar evidencia de PayPal usando credenciales de Vault de **esa generación original**; GET de suscripción, plan, intentId y transacción COMPLETED de US$2.99, sin paginar a medias. Obtener un período pagado sustentado en una fuente oficial fiable; si no existe dato suficiente, estado `REVIEW_REQUIRED` y no grant, no inferir fechas de calendario ni retorno al navegador.
4. Persistencia SQL privada idempotente y conciliación de ledger/período; liberar el lease como processed **solo tras escritura confirmada**, sostener reintentos controlados y diagnóstico de casos inciertos, eventos fuera de orden, duplicados y cambios de merchant.
5. Worker de renovaciones, refunds completos, reversos/disputas, failed/suspended/expired/cancelled; parcial o evidencia ambigua = revisión segura, no revocar/grantar arbitrariamente.
6. Distinguir cuidadosamente huella SHA-256 de **Client ID** (vínculo a app PayPal) de identidad verificada del merchant/payee: no afirmar que son lo mismo. Validar destinatario/origen del cobro antes de crédito financiero y activar solo tras evidencia independiente suficiente.

### P2 — Checkout, consentimiento y retorno PWA
1. Integrar `pazo-paypal-live-checkout` con front de membresía `src/features/supporter/components/SupporterAccountManagement.tsx` (hoy botón deshabilitado excepto ruta Sandbox QA). Ofrecer consentimiento bilingüe verificable y versionado, única intención activa por dueño, checkout seguro por generación, idempotencia PayPal, un solo click/resume ante abandono y reintento tras cancelación sin falsa suscripción.
2. Hacer que aprobación/retorno funcione tanto desde navegador HTTPS como PWA instalada; no redirigir a vista mascota y perder contexto. App debe esperar verificación real, no declarar `ACTIVE`/pagado por retorno o `APPROVAL_PENDING`.
3. Cancelación/autogestión automática del dueño; evitar nuevas renovaciones en PayPal, mantener benefits hasta paidThrough realmente confirmado, mostrar feedback sin parpadeo ni errores de doble clic. Limpiar rutas y parámetros sensibles, con observabilidad mínima.
4. Eliminar flags de QA Sandbox en beta pública y preservar QA solo en entornos aislados; no mostrar botones de pruebas financieras a clientes.

### P3 — Beneficios e interfaz y panel admin
1. Proyectar paidThrough/estado desde períodos Live verificados y holds reales a la cuenta/mascotas, perfiles y publicación; badges Amigo de PAZO 1, 3, 6, 12 meses conforme contrato del PO. No otorgar beneficios por pago pendiente ni por suscripción ACTIVE sin venta COMPLETED.
2. Dashboard administrativo responsive: pagos/recaudación, miembros activos/cancelados, intentos abandonados, retención, uso/crecimiento, fake doors, telemetría y salud Supabase; métricas con fuente y permisos. Aprovechar dashboard existente y no romper moderación.
3. Cierre de alertas, autenticación, PWA, permisos, privacidad/retención, consentimiento, notificaciones, borrado cuenta, textos legales y funciones core beta; solo corregir hallazgos reales y respetar F13 aprobada.

### P4 — **Solo guardar credenciales en Administración** y preparar habilitación
1. Admin→Configuración→PayPal→Live debe admitir Client ID+Secret reales **solo dentro de PAZO** con JWT admin y MFA TOTP reciente, usando `pazo-admin-paypal-vault` y RPC service_role per-generation. Confirmar guardado seguro y recuperación de estado tras refresh; no compartir secretos con chat/GitHub/logs/analytics/frontend. Evitar reintentos automáticos ante resultado ambiguo.
2. Usar plan, webhook, generación 1 existentes; sin exigir API de saldos ni token de Management API. Preparación de claves debe desencadenar verificación de readiness y mostrar pendientes concretos en el panel; la activación es decisión explícita del PO, no side effect del guardado.
3. Quitar latches hard-OFF del circuito de forma **controlada**, sustituyéndolos por comprobación de configuración/readiness, permisos y kill-switch reversible, sin dejar ruta de bypass. La base actual contiene CHECKs que prohíben `live_enabled=true`, `kill_switch=false` y `environment='live'`; diseñar migraciones separadas con gate de release, ensayos rollback, y no abrir caja real sin verificar workflow completo y PO GO.
4. Habilitar Webhook público con verificación firma PayPal y anti-replay + colas privadas; sale/refund workers server-only con reintentos seguros, healthchecks y fallback seguro. No permitir suscripción real si worker/ingestión no disponibles, ni activar Live si PayPal webhook no entrega eventos firmados.
5. El objetivo UX es **mínima intervención final**: el PO entra en Administración, ingresa Client ID/Secret una vez, recibe confirmación de preparación y **autoriza personalmente el smoke de US$2.99/activación real**. El resto tiene que estar programado antes. No sostener que «solo guardar» garantiza seguridad: el cargo real supervisado no puede simularse antes de que haya credenciales.

### P5 — Release beta y operaciones
- Auditar Vercel, dominio HTTPS canónico, redirect PayPal, PWA instalada/no instalada, caché y service workers, refresh/routing y Auth; production deployment solo con GO. Si Vercel connector 403, utilizar Vercel CLI del usuario o pedir exactamente acceso que falta, sin declararlo verificado.
- CI: Node/TypeScript/build/PWA, PostgreSQL local PG17/migraciones, RLS/ACL, tests de webhook firmado, replay, idempotencia, expiración de leases, chargebacks, pagos fallidos, concurrency, leave/retry, retorno; E2E emulado + QA navegador mobile/desktop. Distinguir tests sintéticos, staging y prueba Live real.
- Canary real supervisado **con aprobación del PO tras configurar las claves**: cobrar US$2.99 a cuenta autorizada, confirmar firmado/venta/período y badge, cancelación/reembolso según políticas, reconciliación y rollback; no exponer pagos a público hasta PASS. Revisar políticas/retención/backups y alertas de costes/abuso.
- Antes de decir «BETA LISTA»: evidencias fechadas en `docs/PAZO_BETA_RELEASE_CANDIDATE_REPORT.md` y `docs/PAZO_ACTIVE_HANDOFF.md`; commits, enlaces CI, resultados Postgres, endpoint versions, Vercel deploy URL real, pruebas PWA y pasos exactos PO. Si no hay credenciales, declarar `READY_FOR_LIVE_CREDENTIALS_AND_PO_CANARY` solo cuando todo lo anterior que es comprobable sin claves esté completado. Nunca `LIVE_PAYMENT_PASS` sin venta real.

## 3. Reglas de ejecución de Codex

- Trabaja autónomamente, no detengas el desarrollo después de describir un plan ni devuelvas las tareas al PO. Continúa implementando, revisando PR/CI, corrigiendo y documentando. Si se necesita una acción exclusivamente humana, solicita **solo** el paso preciso sin claves en chat y continúa el trabajo independiente mientras espera.
- Primero `git status -sb`; preserva cambios existentes (incluido `package-lock.json` local y ramas de otros agentes). Pull/fetch sin force/reset; PR a F13; `main` intacto sin autorización explícita. Reusar código/SQL ya probado.
- No pongas claves PayPal, Merchant ID, DB passwords ni JWT en GitHub, scripts, respuestas, argumentos de consola, capturas, traces ni `.env` versionados. Solo formularios internos autenticados y Vault; test fixtures sintéticas.
- Cuando la prueba o permiso no esté disponible, mantener estado fail-closed y reportar el bloqueo preciso; no inventar evidencia, tiempos de PayPal ni supuestas ventas. No desactivar firma, MFA, RLS, idempotencia o kill-switch para «acabar más rápido».
- **No terminar** con un informe que solo enumere pendientes: completar cada pendiente técnico posible, ejecutar gates, arreglar errores y dejar la infraestructura lista para la acción final del PO. Documentar TODO en handoff y estado real de lanzamiento.

## 4. Check de aceptación / respuesta final de Codex

Entregar tabla `tarea | estado PASS/BLOCKED | prueba concreta | commit/PR`. Separar `CODE_DONE`, `DB_APPLIED`, `EDGE_DEPLOYED`, `HTTPS_E2E_PASS`, `READY_FOR_PO_CREDENTIALS`, `LIVE_CANARY_PASS`, `BETA_PUBLIC_RELEASE_GO`. Una etapa no implica las siguientes. Cuando esté realmente listo para recibir credenciales, una sola instrucción segura y precisa al PO desde Admin y confirmación final supervisada.

# PAZO — ACTIVE HANDOFF (estado operativo, 19-oct-2026)

**Este es el documento canónico de continuidad.** Estado técnico observado directamente en GitHub/Supabase el 19-oct-2026. Los checkpoints anteriores fueron archivados íntegramente en `docs/archive/PAZO_ACTIVE_HANDOFF_HISTORY_20261019.md` y `docs/archive/PAZO_ACTIVE_HANDOFF_HISTORY_20261018.md`. **No usar el archivo histórico como estado actual.**

## Identidad y reglas
- Product Owner: usuario. **Ejecutor técnico principal: ChatGPT Project Brain OS v1.4.1**, fuente `DigitalAppcorp/project-brain-os/SKILL.md` y `patterns/VERIFIABLE_HANDOFF.md`. No delegar programación a Codex/Gemini. El usuario usa Antigravity/Windows para Vite y aceptación visual, no para recibir código a programar.
- Producto PAZO: PWA social/utilitaria para mascotas, LA/18+, app y QR gratuitos, monetización opcional «Amigo de PAZO» **US$2.99/mes**, con niveles de insignia 1/3/6/12 meses. No introducir muro de pago. Tema actual verde `#204E4A`, lima `#E1E53F`, marfil `#FAF8F5`, **cero contornos** (salvo inputs necesarios), responsive mobile y panel admin también desktop. No reabrir decisiones aceptadas.
- Obligatorio: `AGENTS.md`, `docs/PAZO_MASTER_ROADMAP.md`, `docs/PAZO_UI_QUALITY_GATE.md`, especificaciones de módulo y privacidad cuando apliquen. Separar CODIFICADO / BUILD PASS / BACKEND APLICADO / PRUEBA EN RUNTIME / APROBACIÓN VISUAL PO / MERGED.

## Repositorio y comprobación
- Repo `DigitalAppcorp/pazo-app`; PR [#44](https://github.com/DigitalAppcorp/pazo-app/pull/44) **DRAFT, NO MERGED**.
- Rama activa `f13/section-titles-20261012` hacia `release/mvp-beta-fast-track-20261010`. HEAD de CÓDIGO validado `d5cfed87b5ff699e6855f999ae1ec90eaa77040b`; **CI + seis labs PostgreSQL = 7/7 SUCCESS** para ese SHA. Posteriores commits solo-docs pueden generar CI nuevo: verificar HEAD actual antes de afirmar verde. El commit y rama remotos prevalecen.
- `main` observado `ae7e63f46bd0150457df9ebb5c73da0aa2edbf90`; base release `f5f47b8ef10b38d89b4c4abb97320b24df0840a9` (snapshots, revalidar).
- El anterior fallo de `npm run build` (CI de 19-oct alrededor de 19:01 UTC) fue `TS6133: 'SupporterBadge' is declared but its value is never read` en `PetView.tsx`; ya corregido en HEAD más reciente con 7/7 PASS. **No volver a repararlo si el último HEAD continúa verde**.
- Clon de usuario `C:\Users\osori\PAZO-F13-preview` con Antigravity. Estado de trabajo local/no publicados **DESCONOCIDO** desde GitHub; no ejecutar `git pull` si `git status --short` muestra cambios.

## PRIORIDAD ACTUAL — F16: limpieza de UI de membresía y parpadeo (código + CI PASS; validación visual del PO PENDIENTE)
El PO mostró capturas de una cuenta Sandbox **con período verificado hasta 19/11/2026 y PayPal ACTIVE**:
1. `Mi membresía` expone múltiples botones técnicos («Descargar aceptación V2», «Verificar pago real Sandbox», «Consultar PayPal Sandbox», «Cancelar próxima renovación V2»), ejemplos de insignias y «Diagnóstico de beneficios · Solo QA». Decisión implícita en su pedido: **simplificar interfaz normal**, mantener gestión real de renovación/cancelación y ocultar diagnóstico sin desactivar verificación de backend.
2. En `Mi mascota`, entrada «Amigo de PAZO» cambiaba visiblemente («Consultando tu membresía…»/color/icono) al cargar estado.
**Corrección YA programada en PR #44 y probada CI:**
- `src/components/views/PetView.tsx`: entrada estable de apariencia y texto `Amigo de PAZO / Tu membresía y beneficios`, independientemente de estado; no pinta CSS/insignia provisional que produzca parpadeo. Click abre flujo existente. Estado verificado no se infiere del texto.
- `src/features/supporter/useSupporterMembershipStatus.ts`: estado de cuenta `petId=undefined` usa un solo RPC privado `pazo_supporter_my_account_status()`, autenticado con `auth.uid`, lectura server-derived. Menos consultas que N mascotas. Nunca confiar en localStorage/PayPal redirect; suscripciones pagadas se mantienen durante refresh same-scope, cambios de dueño limpian estado.
- `src/features/supporter/components/SupporterBenefitsHome.tsx`: al abrir «Mi membresía» monta `SandboxV2AccountPanel consumer`; controles técnicos solo en Vite DEV localhost/127.0.0.1 **con opt-in `?supporter_debug=1`**; «Diagnóstico de beneficios» también tras esa puerta. No exponerlos por defecto ni en Live.
- `SandboxV2AccountPanel.tsx`: modo `consumer` entrega fecha paid-through verificada, estado de proveedor, botón actualizar, cancelar futuras renovaciones con confirmación. Mantiene llamadas reales owner-scoped y no altera pagos, fechas ni proveedor.
- Tests nuevos `src/features/supporter/testing/f16MemberMenuCleanliness.test.mjs` y tests previos actualizados. Un import TypeScript no usado fue corregido; CI 7/7 PASS en `d5cfed...`.
**Siguiente paso exacto:** validar visualmente **ESTA VERSIÓN** en Vite real con la cuenta de prueba pagada (pantalla `Mi mascota`, luego `Amigo de PAZO` → `Mi membresía`). Observar sin parpadeo perceptible y sin herramientas QA expuestas. Pedir captura/feedback SOLO tras indicar los comandos si clon local está limpio. **No declarar aprobado por PO antes de verlo.** Si aún hay flash o faltan controles de cancelación, corregir directamente código sin reabrir diseño.

Comandos Windows en Antigravity (únicamente si rama correcta y `git status --short` limpio):
```powershell
cd C:\Users\osori\PAZO-F13-preview
git branch --show-current
git status --short
git pull --ff-only origin f13/section-titles-20261012
.\scripts\f16-run-real-sandbox-qa.ps1
```
Si `git status --short` muestra cambios, **detener pull** y preservarlos. URL normal `http://localhost:5173/`. No usar `supporter_debug=1` para validación de vista normal.

## Otro frente aprobado: panel admin PayPal — PREPARACIÓN FUNCIONAL, LIVE DESACTIVADO
- PO **aprobó implementar** `Configuración · PayPal` en panel admin para gestionar Sandbox/Live, credenciales, borradores de precio, plan, webhook y dominio de retorno en móvil y desktop. Implementado en `AdminDashboard.tsx`, `AdminPayPalSettings.tsx`. Doc: `docs/PAZO_ADMIN_PAYPAL_GATE_20261019.md`.
- Migración **aplicada** `supabase/migrations/20261019195500_pazo_admin_paypal_gateway_settings.sql`, tablas privadas `admin_private.paypal_gateway_settings`, audit y runtime; secretos cifrados en Supabase Vault; RPC de lectura admin sin secretos y RPC secret service_role-only. Edge `pazo-admin-paypal-validate` despliegue OAuth sin cobrar. Última lectura: **2 filas de configuración, 0 cambios administrativos, Live=false**; no afirmar que se pegaron credenciales. No repetir migración.
- `vercel.json` reescribe `/paypal/return` y `/paypal/cancel` a la SPA; no implica que un preview temporal sea el dominio oficial. Falta definir dominio público estable con PO y comprobar PWA instalada/no instalada.
- **CRÍTICO:** controles admin son configuración en borrador; **NO están conectados al motor legacy F16 para alternar cobros**. El botón Live está bloqueado. No prometer que pegar Client ID/Secret hoy activa Live sin programación o revisión. Gate futuro: conectar gateway administrable versionado + validación plan, webhook, precio, cancelación, renovaciones, callback estable y conciliación. No tocar main ni PayPal Live sin autorización específica.
- Vista admin «Resumen general» diseñada según referencia elegida guardada en Library `/Panel de Control PAZO en Tiempo Real (1)(1).png`; versiones iniciales rechazadas y tercera iteración en PR #44. `docs/PAZO_ADMIN_VISUAL_FIDELITY_GATE_20261018.md`. **Aprobación visual de iteración final aún pendiente**: comparar 1440px y 390px cuando retomen ese frente; no confundir primera captura rechazada con la versión actual ni usar valores simulados como KPIs.

## PayPal Sandbox: qué está verificado y qué falta
- Después de abandonar login varias veces, el POST de cancelación de `APPROVAL_PENDING` devolvía 404 `R5-04`; el fix de idempotencia (Request-ID 38 caracteres) por sí solo NO lo resolvió. Para **QA local únicamente** se implementó archivo de intentos no aprobados tras comprobaciones owner/signed CREATED/dos GET de PayPal/ausencia de pagos y nueva aceptación; **no cancela suscripciones viejas en PayPal**. Edge `f16-paypal-supporter-v2-qa` v26 fue desplegada; migración de repetición `20261019193000_f16_qa_repeat_abandonment_restart.sql` aplicada para eliminar espera artificial de 90s, límite 30/24h +500 lifetime. No trasladar recuperación a Live sin prevención de cobros cruzados.
- El PO reportó que completó un pago de prueba; capturas posteriores de una cuenta muestran período hasta **19/11/2026** y PayPal ACTIVE. Lectura DB **19-oct**: `supporter_private.f16_sandbox_qa_paid_periods` ahora **2 filas**, `supporter_private.paypal_payment_entries` **0 filas** (este último ledger distinto no implica ausencia de prueba pagada). Investigar conciliación de la última venta firmada / correspondencia owner antes de release; no declarar contabilidad global o Live-ready solo por eventos webhook.
- No hacer más pruebas/cargos por iniciativa propia sin gate; no activar beneficios por redirect; mantener permisos y entitlements detrás de evidencia verificada.

## Seguridad, alcance y continuación
- Supabase project ref `mrybvqdebbgcayuvgkkr` (solo identificador público), GitHub PR #44 DRAFT. Nunca compartir secrets, IDs de compradores ni payment tokens en handoff.
- F13 diseño aprobado: mapa full-bleed opción 3, barra blanca/isotipo verde, perfiles/mensajería/avisos y fake doors; F14 eliminación QA E2E con protecciones. No reabrir decisiones de módulos, no degradar «cero contornos».
- La app y QR son gratis; la suscripción opcional apoya PAZO. Insignias basadas en períodos server-verified; 4 niveles; fake doors deben medir interés sin datos invasivos.
- **Estado actual: `F16_MEMBER_UX_CODE_CI_PASS_PO_VISUAL_PENDING`.** Segundo gate: `ADMIN_PAYPAL_PREP_VAULT_APPLIED_UI_PO_REVIEW_PENDING_LIVE_OFF`. Tercero: `ADMIN_VISUAL_REFERENCE_FIDELITY_PO_PENDING`. No declarar PR listo para merge.
- Nuevo chat: leer **`docs/PAZO_NEXT_CHAT_ACTIVATE.txt`**, este snapshot, `AGENTS.md`, roadmap, specs F16/visual, fetch HEAD/CI/SQL read-only si procede; **continuar visual de membresía**. Si la evidencia externa cambió, reconciliar primero. Nunca reiniciar proyecto, solicitar decisiones cerradas o delegar Codex.

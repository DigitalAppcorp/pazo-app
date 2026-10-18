# ADMIN — Centro de control integral, backend Supabase instalado (2026-10-18)

**Orden explícita PO:** construir panel de administración completo para PAZO (cuentas, mascotas, pagos, recaudación, checkouts incompletos, uso frecuente, Supabase, fake doors y prioridades), conservando denuncias existentes; PO autorizó implementar. **PR #44 DRAFT** `f13/section-titles-20261012`, no tocar main/Live.

**Backend staging INSTALADO** con `mcp__Supabase__apply_migration`: versión **`20261018234721`**, `pazo_admin_observability_dashboard_20261018`; archivo exacto versionado `supabase/migrations/20261018234721_pazo_admin_observability_dashboard_20261018.sql`. `admin_private.admin_grants` separado de `moderation_private.moderator_grants` y seeded **solo porque había exactamente un moderador**. `app_activity_daily` registra usuario UUID/día/categoría de módulo por RPC idempotente, no contenido ni GPS. Cinco RPC de lectura: `pazo_admin_overview/users/experiments/voters/audience` y gate `pazo_is_admin`, sin grants directos a tablas. Postflight: 1 admin grant, anon EXECUTE false, authenticated direct SELECT false y ensayo identidad ajena bloqueada; respuestas verdaderas del administrador válidas (11 módulos catalogados), sin exponer correos/UID a logs.

**UI integrada** en `ModerationAccess` como «Centro de control» solo para cuenta admin: Resumen, Cuentas, Apoyo, Interés, Supabase. Denuncias y medios pendientes independientes y sin regresión al fallar nueva RPC. Se registran accesos a secciones principales una vez por usuario/día/sección, desde esta versión (no adivinar datos históricos). Fake doors de Comunidades y Lugares usan registro existente de views/interests, más opciones optativas de intención `use/create/explore`. Ranking por cuentas únicas y interés; muestra insuficiente <30. Usuarios/mascotas, Sandbox acreditado y checkouts sin período, actividad medida y bytes PG/Storage, con semántica honesta. Todos los cobros Sandbox simulados están separados de Live y las métricas oficiales de egress/factura NO están disponibles.

**Preflight**: 8 cuentas Auth, 5 mascotas, un período USD2.99 de Sandbox, 0 vistas/votos registrados en fake doors, 41 eventos Lugares, 40 Búsqueda, PG ~17.5MB. Estas cifras son un snapshot de pruebas, no métrica live permanente.

**Docs** `docs/PAZO_ADMIN_CONTROL_CENTER_20261018.md`, inventario privacidad actualizado. **BLOQUEO DE RELEASE**: QA de render Vite en cuenta administradora, gobernanza de privacidad (retención 90d u otra aprobada y actualización Política), datos oficiales Supabase e informe comercial Live requieren integraciones autorizadas adicionales. No declarar todo terminado ni visualmente aprobado solo por SQL/CI. F16 no se declara cerrado; no merge a main. La última auditoría de acceso SQL es PASS.

**Gate:** `ADMIN_CONTROL_CENTER_STAGING_BACKEND_INSTALLED_UI_CODE_REVIEW_PO_VISUAL_PRIVACY_PENDING`.

---

# Feed — Ubicación fija incorrecta «Los Ángeles, CA»: nuevo post FIX 7/7 PASS (2026-10-18)

PO mostró dos posts de mascotas distintas con ubicación «Los Ángeles, CA» aunque sus datos de zona de perfil podían variar. Raíz exacta: `CreatePostModal.tsx` escribía literalmente `location: 'Los Ángeles, CA'`. Auditoría **read-only** Supabase staging: 4 posts, los 4 con ese valor; 1 caso difiere de `pet_private_details.zone`, que es **privado**. DB tiene default residual `Los Ángeles • Local`. Por privacidad, **no** copiar zona privada al post público sin consentimiento ni inferir ubicaciones pasadas.

Código en PR #44 DRAFT `f13/section-titles-20261012`: nueva casilla explícita (OFF por defecto) para mostrar ubicación en publicación, con campo editable precargado desde zona privada **sólo para aprobación del propio autor**; si no se marca, se envía `posts.location=NULL`, sin ciudad fija. Aviso claro de visibilidad pública, no GPS ni domicilio. `HomeView` no pinta separador de ubicación vacía; mapeos Feed/perfil/servicio toleran null. Test en `scripts/closure-ui.test.mjs`. **Commit funcional `d8928e55ddc8103d9ddeedf4e1ce96af55bf50fc` 7/7 CI + seis PG labs SUCCESS**; sin cambios SQL ni datos, Live/main/PayPal intactos. Docs `docs/PAZO_FEED_POST_LOCATION_CORRECTION_20261018.md`; inventario privacidad actualizado.

**Pendiente explícito de GO PO:** quitar el default SQL falso y limpiar sólo las 4 filas anteriores con `Los Ángeles, CA` a NULL mediante migración acotada y validación pre/post, **nunca copiar zona privada**. Las 4 publicaciones viejas seguirán mostrando valor erróneo hasta reparación autorizada; no declarar bug totalmente resuelto. Antes del GO, sólo código para nuevos posts; validar Vite sin compartir ciudad y con ciudad introducida.

**Gate:** `FEED_LOCATION_NEW_POSTS_CODE_7_OF_7_PASS_LEGACY_DB_REPAIR_REQUIRES_PO_GO`.

---

# F16 — Insignia Amigo de PAZO visible en comentarios y posts de Comunidad (2026-10-18)

PO mostró captura de un comentario de `feliciano (perro)` sin mini-insignia aunque la mascota tenía una membresía verificada. Debe aparecer tanto al publicar como al comentar **sobre cualquier post**. Implementación directa en PR #44 DRAFT rama `f13/section-titles-20261012`:
- `PostComment`, `CommunityPostComment` y `CommunityPost` ahora llevan evidencia opcional `supporterBadge` verificada con RPC pública existente `pazo_supporter_public_badges_batch` por ID de **mascota autora del comentario** (nunca por la del post).
- Feed al expandir comentarios: carga/valida/predecodifica PNG **antes del primer render del hilo**; al enviar nuevo comentario: verifica el autor antes de pintar el optimista; en UI insignia oficial mini 20px sobre esquina inferior derecha del avatar del comentarista. También comentarios conservados de un post eliminado.
- Comunidades: misma mini-insignia para publicaciones y comentarios, incluidos hilos de posts eliminados. La consulta de badges nunca concede derechos, usa 48-ID batches con dedupe y validación estricta. El Feed revalida insignias de posts **y comentarios abiertos** cada 60s/visibilidad.
- Resiliencia: si RPC/imagen fallan, se oculta el badge sin prueba, **pero los comentarios siguen siendo una función gratuita**: se pueden leer y publicar; en ese caso una medalla puede faltar hasta que se pueda verificar de nuevo, sin fingir beneficios.

Commit funcional `46aca598a33a902e6c5b60d49b3bd0dbbedc2c8e` **CI y seis PG labs 7/7 SUCCESS**; docs `docs/F16_SUPPORTER_BADGES_ON_COMMENTS_20261018.md`. Sin cambios a PayPal, Supabase SQL, funciones Edge, entitlements, Live o `main`. **Gate:** `F16_SUPPORTER_COMMENT_BADGES_CODE_7_OF_7_PASS_VITE_PO_QA_PENDING`. Para PO: sincronizar clon, iniciar Vite, comprobar comentario de `feliciano` en post de `bretman`, comentar nuevo, probar Comunidades e hilo conservado; no hacer nuevos pagos. CI ≠ aceptación visual.

---

# F16 — PayPal CTA Card Central: opción 2 lime, logo azul legible (2026-10-18)

El PO eligió **opción 2** tras ver el botón verde oscuro con logo PayPal azul de poco contraste: cambiar solo botón de `SandboxCheckoutQaPanel.tsx` a **lima PAZO `#E1E53F` y texto verde `#204E4A`**, conservando los azules originales `#003087`/`#009CDE` del logo, agrandado a 25px. Variante deshabilitada usa lima pálido `#EEF1B7` SIN reducir opacidad del logo; nunca habilita checkout sin aceptación explícita. Hover/focus lima más claro, cero contornos. Tests estructurales actualizados. Commit funcional `bbde81a08ed417adcfe9b039156eca2933e9c092`, **CI + 6 PG Labs 7/7 SUCCESS**; PR #44 DRAFT en `f13/section-titles-20261012`. Ningún cambio de backend, consentimiento, cobros, planes o Live. Pendiente: Product Owner recarga Vite y valida contraste real, estado no consentido y activo SIN pagar.

**Gate:** `F16_CARD_CENTRAL_PAYPAL_LIME_CODE_PASS_VISUAL_PO_PENDING_LIVE_OFF`.

---

# F16 — Card Central PO-approved layout implemented in PR #44 (2026-10-18)

PO selected image option **4 / «Card Central»** and explicitly requested faithful implementation, not another copy-only change. Replaced the prior hero + vertical benefit list with an actual **floating official gold medal** centered over one white invitation card, centered approved title/copy/US$2.99, **forest-green «Quiero apoyar a PAZO» + «Continuar con PayPal»** CTA, legal checkbox and terms inside the card, then a separate compact **single horizontal row of four thank-you icons**. Cream outer canvas, discreet motifs, rounded cards without visual contours, PAZO-free promise below and voluntary exit maintained. Existing backend-verified rights, offer exactCopy/digest, consent, anti-duplicate charge protections, QA status and Live OFF are unchanged. UX CTA precedes checkbox visually but remains disabled until explicit affirmative consent.

Files changed: `SupporterOfferB.tsx`, `SandboxCheckoutQaPanel.tsx`, `SupporterAccountManagement.tsx`, and F16 product-experience tests. Functional commit **`06cb189e6ea1d088f7c5244a50122cb000acbe2b` → GitHub Actions 7/7 PASS** (CI + 6 PG laboratories), no migrations, no PayPal changes, no main merge. PR #44 remains DRAFT. Visual reference screenshot supplied by PO in current chat; design/handoff report `docs/F16_CARD_CENTRAL_PO_SELECTED_VISUAL_20261018.md`.

**Next gate:** Product Owner must pull clean local Antigravity repo, restart PAZO Vite QA and visually compare actual page to **option 4** (medal overlap, card/CTA, four-across thanks icons); no payment required. Do not declare pixel-exact or visually accepted on CI alone. Preserve approved exact invitation copy.

**Gate:** `F16_CARD_CENTRAL_CODE_7_OF_7_PASS_WAIT_PO_VITE_VISUAL_ACCEPTANCE`.

---

# F16 — Invitación Amigo de PAZO: copy aprobado e integrado, código 7/7 PASS (2026-10-18)

PO confirmó como **texto definitivo literal** de la invitación: título «Ayuda a que PAZO siga creciendo» y cuerpo «PAZO está dando sus primeros pasos y aún tenemos mucho por construir. Con tu apoyo podemos seguir cuidando este pequeño mundo, mejorándolo y creando nuevas experiencias para ti, tu mascota y toda nuestra comunidad.». Precio US$2.99/mes, CTA «Quiero apoyar a PAZO» (PayPal explícito), leyenda «PAZO seguirá siendo gratis para todos.» y sección secundaria «Como agradecimiento» con los cuatro reconocimientos. Medallas: «Tu apoyo merece reconocimiento» y texto cálido de agradecimiento elegido por el PO; las reglas 3/6/12 meses pagados/no revertidos no cambiaron. Mantener mensaje centrado en invitación voluntaria a contribuir, NO vender funcionalidades como producto principal. No reformular copy sin nuevo GO PO.

Código ajustado en `SupporterOfferB.tsx`, `SandboxCheckoutQaPanel.tsx`, `SupporterAccountManagement.tsx`, `SupporterBenefitsHome.tsx`, tests F16; sin tocar términos contractuales Sandbox V2, digest, consentimiento, lógica de cobro, Supabase, PayPal Live ni `main`. **Commit funcional `b651ea427cb3bfadfbcb4b281a921ae351ef29eb`: 7/7 GitHub Actions SUCCESS** (CI + 6 PG labs). PR #44 sigue **DRAFT**, sin merge. Reporte `docs/F16_SUPPORT_INVITATION_APPROVED_COPY_20261018.md`. **Pendiente Vite local + aceptación visual del PO**; no declarar F16 completa por copy/CI.

**Gate:** `F16_SUPPORT_INVITATION_COPY_CODE_7_OF_7_PASS_VISUAL_REVIEW_PENDING_LIVE_OFF`.

---

# F16 — Feed badge at FIRST visible render, directly implemented by ChatGPT (2026-10-18)

PO demonstrated that mini PAZO Friend badge appeared long after post while Sugerencia appeared at once; asked why delegate to Codex. ChatGPT directly fixed the problem in `f13/section-titles-20261012` PR #44 DRAFT.

**Root cause:** `HomeView` rendered posts first and then fetched `pazo_supporter_public_badges_batch` in a second useEffect, adding the badge late. **Fix:** `App.tsx` now awaits validated server badge evidence and decoded official PNG *before* committing feed posts, for both paginated loads and newly created posts. The Post typed payload contains `supporterBadge`; `HomeView` contains **no late badge RPC** and displays the prevalidated 20px mini on author avatar without moving `Sugerencia`. A strict 48-ID batch resolver rejects malformed/incomplete response and preserves retry/cursors; user is never falsely shown as nonpaying because badge response is pending. Short interval/tab return revalidation uses same authoritative RPC and clears the badge upon failure; no grants from client, localStorage entitlement, or fabricated values. Two network requests are awaited/coalesced **before first UI frame**; not yet a single SQL query. The profile public separate RPC remains out of this Feed scope.

Functional commit `08ce300b828ac50092d9873bd4a382ce0b5138df` **7/7 GitHub Actions SUCCESS (CI + six PG labs)**. No backend, live, main or financial records changed, no Codex required. Report `docs/F16_FEED_BADGE_SAME_FIRST_PAINT_FIX_20261018.md`. **Next:** PO sync clean Antigravity clone, run `scripts/f16-run-real-sandbox-qa.ps1`, cold-start Feed and test actual first visible paint/badge with own paid post (feliciano) and pending/other author, plus paginated feed; CI is NOT PO visual acceptance. Do not repeat PayPal payment.

**Gate:** `F16_FEED_BADGE_FIRST_RENDER_CODE_7_OF_7_PASS_WAIT_PO_BROWSER_COLD_LOAD`.

---

# F16 — Six PO-directed typography and visual corrections CODE PASS 7/7 (2026-10-18)

PO: UI scale was **too small** compared with PAZO; correction is to enlarge small typography, not shrink oversized titles. Implemented and verified in PR #44 DRAFT, branch `f13/section-titles-20261012`:
1. PAZO baseline 16px name/12px metadata applied; supporting copy increased in member screens.
2. Gratitude wall = compact 2-column portraits with 16px names, verified badges; existing RPC/sort preserved.
3. HomeView badge = server-verified 20px avatar overlay at bottom-right, eager asset, batch RPC lookup with stable visible pet signature (avoid cancellation on likes/comments), without displacing "Sugerencia".
4. Same mini avatar badge on public profile posts.
5. Original PAZO paw/bone/spark decorations are hidden when verified custom profile backdrop exists.
6. 3/6/12-month milestones explain PAZO's gratitude and verified months, not a cold list of Pending.

**Functional commit `97a6d5d3b776e05ccf9efe748e7164b48720aa34`: GitHub Actions CI + 6 PG labs 7/7 SUCCESS.** First checks caught a dated mural assertion and missing JSX closing brace; corrected before final PASS. Reports `docs/F16_PAZO_TYPOGRAPHY_WALL_BADGE_CORRECTIONS_20261018.md`; docs commits after functional PASS are not app code changes. No Supabase/PayPal changes, new charges, payments, entitlements, migrations, Live, merge or main. Still **NOT VISUAL-APPROVED** by PO; real Vite screenshots, initial avatar badge latency and multi-pet feed must be checked. Existing account eligibility and consent terms remain unchanged.

**Gate:** `F16_VISUAL_PO_CORRECTIONS_CODE_PASS_7_OF_7_VITE_REVIEW_PENDING_LIVE_OFF`.

---

# F16 — Correcciones PO sobre tipografía y cinco aspectos visuales (2026-10-18)

GO PO «ok go» tras aclarar: **Amigo de PAZO tenía letra demasiado pequeña**; había que igualar tamaños originales de PAZO, NO reducirlos. En PR #44 DRAFT rama `f13/section-titles-20261012` se amplió tipografía (PAZO Feed: nombre 16px, metadatos 12px; microcopy de panel 14px, títulos de ítems 16px); muro público rediseñado como grid 2 columnas con retratos/insignias compactas; mini-insignia oficial de 20px anclada a avatar de autor de Feed y publicaciones de perfil (no empuja `Sugerencia`); corrección de una dependencia de re-render que cancelaba consulta RPC de insignias y asset pequeño eager; arte de perfil original se oculta detrás de fondo personalizado verificado; sección 3/6/12 explica agradecimiento y recompensa en lugar de lista "Pendiente". Todos los derechos permanecen confirmados server-side, no se muestran insignias sintéticas. Cero contornos. No DB/PayPal/Live/main ni cobros nuevos. Regresiones en `f16SupporterProductExperience.test.mjs`; esperar último 7/7 y PO QA visual real antes de declarar PASS del diseño. Informe: `docs/F16_PAZO_TYPOGRAPHY_WALL_BADGE_CORRECTIONS_20261018.md`.

**Gate:** `F16_PO_TYPOGRAPHY_AND_FIVE_VISUAL_CORRECTIONS_IN_BRANCH_CI_REVIEW_PENDING`.

---

# F16 — UI visual pass Amigo de PAZO aprobado por PO e implementado en rama (2026-10-18)

**PO aprobó las 3 propuestas** de rediseño visual: inicio Amigo de PAZO, personalización de perfil, muro de agradecimiento. Se aplicaron en **PR #44 DRAFT rama `f13/section-titles-20261012`**, sin cambiar PayPal/Live, main ni finanzas.
- `SupporterBenefitsHome`: hero `Ya eres Amigo de PAZO`, acciones insignia, fondos, muro, medallas 3/6/12 basadas en proyección verificada; tarjeta de membresía y diagnósticos Sandbox ocultos en detalles secundarios.
- `SupporterThemePreviewPanel`, `SupporterProfileThemes`, `SupporterThemeSaveControl`: UI móvil coherente con PAZO, vista previa con datos reales, seis opciones originales, scroll horizontal, CTA `Guardar cambios`. La RPC write actual conserva verificación owner/entitlement y postflight; seleccionar no escribe.
- `SupporterWallConsentSettings`: tarjetas reales por mascota, consentimiento explícito revocable, acceso a `GratitudeWallLive` read-only. Se conservan exactamente `pazo_wall_consent_enable/disable` y verificación posterior. No opt-in automático.
- Sin fecha inventada en hero: el hook solo expone estado+hito; período real se ve en detalles de membresía. Cualquier fecha futura en hero requiere lectura segura específica y otro gate si necesario.
- Pruebas estructurales F16 añadidas; **CI pendiente de última ejecución**. No se han realizado pruebas visuales en Vite de esta versión ni aprobado resultado renderizado.
- Informe canónico: `docs/F16_PAZO_FRIEND_APPROVED_VISUAL_PASS_20261018.md`.
- Próximo gate: esperar CI, sincronizar clon Vite del PO con estado limpio, comprobar móviles/teclado/reduced-motion; QA real de guardar fondo, revocar/autorizar muro, visitante público y elegibilidad de cuenta no pagada. No hacer otro pago ni cancelar todavía.

**Gate:** `F16_APPROVED_VISUAL_PASS_BRANCH_IMPLEMENTED_RENDERED_PO_REVIEW_PENDING_LIVE_OFF`.

---

# F16 — PO grabación beneficios → checking → beneficios: salto UI corregido en PR #44 (2026-10-18)

PO mostró video corto donde el panel real `Tus beneficios están disponibles` aparece pero transitoriamente vuelve a `Comprobando tu membresía...` y luego recupera beneficios. Causa verificable: `useSupporterMembershipStatus` vaciaba todo estado verificado a `checking` al revalidar, desmontando `SupporterBenefitsHome` y sus apartados abiertos. Código corregido en rama: para relectura mismo alcance y miembro ya verificado mantiene el panel mientras consulta al backend, siempre reemplaza en `inactive/unavailable`; un cambio de cuenta Auth limpia el estado y fuerza nueva consulta, al igual que cambio de mascota. **No** se conceden beneficios por cliente ni PayPal `ACTIVE`; las RPC siguen siendo fuente de verdad. Añadida regresión al set F16. Solo código/documentación, sin DB/Live/main/cobros. El video NO ha probado aún fondos, muro, caducidad ni cancelación. Ver `docs/F16_AUTO_MEMBERSHIP_SANDBOX_QA_GATE_20261018.md`. CI de último HEAD debe comprobarse antes de pedir que PO actualice Vite local.

**Gate:** `F16_MEMBER_UI_REVALIDATION_FLICKER_FIXED_BRANCH_BROWSER_RETEST_PENDING`.

---

# F16 — Owner-only Sandbox membership RPC INSTALLED with PO GO (2026-10-18)

GO PO: «sí» a instalar exclusivamente la función de lectura de membresía asociada al dueño Auth, incluso sin mascotas. Se cotejó migración canónica `supabase/migrations/20261018213000_f16_sandbox_qa_owner_membership_read.sql` con PR #44 DRAFT y preflight hosted; `apply_migration` devolvió `success=true`, migration version alojada **20261018184603**, name `f16_sandbox_qa_owner_membership_read`. Postflight `public.pazo_supporter_my_account_status()` presente, SECURITY DEFINER owner postgres, sin parámetros, `auth.uid()`, `search_path=''`, acceso **authenticated sí / anon no / service_role no**, prueba de catálogo PASS.

Finanzas pre/post constantes: **1 período Sandbox pagado**, 0 holds, 2 QA owners habilitados, 0 fondos guardados, 0 consents, 0 legacy payment entries y 4 `PAYMENT.SALE.COMPLETED` inbox pendientes incluyendo histórico. **Sin pagos nuevos, DML financiero, cambios PayPal, otros deploys ni main/Live.** Código de UI automática está en rama `f13/section-titles-20261012` PR #44; falta sincronizar y probar Vite con cuenta pagada/gratuita/sin mascotas/pendiente; todavía no hay PASS del navegador ni aprobación del PO. Persisten redirección PayPal a preview protegido y diferencia visual insignia Feed.

Informe y gate: `docs/F16_AUTO_MEMBERSHIP_SANDBOX_QA_GATE_20261018.md` — `F16_QA_OWNER_ACCOUNT_READ_RPC_INSTALLED_ACL_PASS_FINANCIAL_ZERO_CHANGE_WAIT_BROWSER_E2E`.

---

# F16 — Cambio automático de oferta a panel tras pago verificado; código PR #44 (2026-10-18)

**PO GO:** corregir la integración de membresía en todas las cuentas Sandbox sin concesiones manuales; perfil no pagador ve botón de US$2.99/oferta; miembro pagado abre panel real. Se aplicó en **código de rama `f13/section-titles-20261012`**, no en main ni Live.

- `supporterUiRelease.ts` centraliza UI: local `DEV + VITE_PAZO_F16_SANDBOX_QA_UI=true + hostname loopback` o release público explícito. **NO concede** pagos ni beneficios; el servidor conserva la autoridad. Se conectó Hook + Feed + perfil público + temas + muro.
- `SandboxV2AccountPanel` obtiene `ACTIVE` desde PayPal para el intento ya vinculado, hace una sola verificación merchant `verify_payment` de la venta actual, y **solo con período acreditado** dispara refresco de cobertura server-side. Corrección de aviso aprobación antiguo tras pago. No POST begin ni segundo checkout.
- `PetView`: sin cobertura muestra US$2.99 mensuales y abre la oferta; con RPC verificada renderiza botón destacado y `SupporterBenefitsHome`; el estado vuelve a consultarse al regresar de PayPal o tras evento de confirmación sin PII.
- El lanzador `scripts/f16-run-real-sandbox-qa.ps1` usa `VITE_PAZO_F16_SANDBOX_QA_UI=true` y **mantiene `VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED=false`**, sin forzar release público.
- SQL de solo lectura `supabase/migrations/20261018213000_f16_sandbox_qa_owner_membership_read.sql` **PREPARADA NO INSTALADA**; RPC `pazo_supporter_my_account_status()` responde booleano activo+hito para la cuenta `auth.uid()`, sin exigir mascota. Auth solamente, ninguna DML financiera, sin exponer IDs. Debe recibir **GO PO separado de aplicación de migración**; hasta entonces cuenta sin mascotas falla cerrado.
- Snapshot anterior read-only: 8 Auth confirmados, **5 sin mascotas**, 2 QA owners enabled, 1 período pagado. Sin operaciones reales desde esta implementación. E2E en navegador con cuentas pagada/gratuita/pendiente **NO EJECUTADO** ni aprobado; hay que sincronizar la rama local y verificar el resultado.
- Sigue pendiente la redirección PayPal a Vercel protegido (el retorno manual a local provoca verificación automática sin un clic de pago, pero no arregla la URL externa); no declararlo listo para Live. Mini-insignia del Feed sigue junto al nombre vs avatar aprobado; se revisará dentro de pruebas de beneficios. Se conservan las reglas de consentimiento muro y sin badges falsos.

Informe: `docs/F16_AUTO_MEMBERSHIP_SANDBOX_QA_GATE_20261018.md`. CI/PG17 PASS solo del código cuando se verifique el último commit; NO significa UI aceptada. **GATE:** `F16_AUTO_MEMBER_SWITCH_CODE_READY_OWNER_RPC_INSTALL_GO_PENDING_E2E_PENDING_LIVE_OFF`.

---

# F16 — Auditoría cuatro beneficios reales, sin cambios financieros (2026-10-18)

La auditoría READ ONLY de Backend/PR #44 confirma **1 período pagado de prueba US$2.99 verificado y vigente hasta 18-nov-2026**, proyección QA `active=true` y **2 mascotas elegibles con `badge=true,milestone=0`** por RPC individuales y batch. El backend alojado tiene las RPC reales de insignias, fondos, muro y opt-in/out; RLS FORCE impide lectura directa privada. **0 temas guardados, 0 consentimientos, 0 entradas muro, 0 publicaciones de las mascotas pagadoras**: todavía falta QA E2E de cada beneficio.

**Gate clave:** `VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED=true` en Vite local (independiente de `VITE_PAZO_F16_SANDBOX_QA_UI=true`) es necesario para revelar la UI; valor local no verificado. La pestaña Vite inspeccionada en lectura pertenecía a la cuenta histórica del intento 404, **no** al titular del período pagado. Navegar mediante **Mi mascota → Amigo de PAZO** de la cuenta pagadora: `PetView` pasa `pet` y habilita personalización; la ruta directa `#/account/supporter` NO pasa mascota, deshabilitando el botón de personalización del hogar de beneficios. La mini-insignia de Feed está al lado del nombre y NO sobre avatar como aprobó PO; requiere ajuste. Mensaje `approval_not_payment` obsoleto persiste tras verificar pago. No probar cancelación hasta cubrir los cuatro beneficios; cero nuevas compras.

Ver informe exacto: `docs/F16_REAL_SANDBOX_FOUR_BENEFITS_AUDIT_20261018.md`. **NO se ha hecho prueba UI autenticada de guardado de fondos, opt-in/out del muro, visitantes, renovación/cancelación, expiración real ni tres hitos completos**. PR #44 DRAFT, Live/main intactos. Requiere gate local QA/PO antes de declarar F16 finalizada.

**Gate:** `F16_QA_VERIFIED_PERIOD_BENEFIT_BACKEND_REAL_UI_FLAG_AND_E2E_PENDING_LIVE_NO_GO`.

---

# F16 — Backend Sandbox V16 desplegado con GO PO; esperando verificar pago existente (2026-10-18)

PO concedió GO para instalar solo la corrección del verificador en `f16-paypal-supporter-v2-qa`. Preflight: PR #44 DRAFT con CI + seis laboratorios 7/7 SUCCESS; hosted v15 ACTIVE JWT true; 19 dependencias cotejadas y únicamente dos módulos modificados. Despliegue único confirmado a Supabase: **v16 ACTIVE / verify_jwt=true / 19 archivos**. Readback confirmó guardas para totales PayPal opcionales y códigos de diagnóstico fijos sin PII. El resto del checkout y funciones Live no se desplegaron. Histórico 404 pendiente aislado.

Postflight READ-ONLY: 4 `paypal_subscription_intents` totales, 0 pagos acreditados, 0 períodos QA acreditados, 4 webhooks `PAYMENT.SALE.COMPLETED` `pending` (incluye históricos). Ninguna compra o cancelación nueva, ningún registro financiero cambiado ni merge a main. `f16-paypal-webhook` v19, `f16-paypal-supporter` v8, `f16-paypal-supporter-account` v11 observados, sin mutaciones en ellos. PR #44 sigue DRAFT.

**Siguiente acción PO:** actualizar Vite local en la rama `f13/section-titles-20261012` (`git status --short` y `git pull --ff-only` si está limpio); regresar a la cuenta Auth **que posee la suscripción ACTIVE reciente**, no asumir que es `ba99883@gmail.com` (la auditoría anterior no encontró intentos asociados a esta). Presionar una vez `Verificar pago real Sandbox` en el panel de esa cuenta; compartir pantalla del período acreditado o diagnóstico. No volver a pagar, no cambiar cuenta, no cancelar antes de verificar el período. Retorno de PayPal a Vercel protegido sigue pendiente como defecto UX independiente.

Informe: `docs/F16_SANDBOX_V2_PAYMENT_VERIFIER_OPTIONAL_TOTALS_20261018.md`.

**Gate:** `F16_SANDBOX_V16_ACTIVE_NO_NEW_PAYMENT_WAIT_EXISTING_OWNER_VERIFICATION`.

---

# F16 — Verificador Sandbox V2 corregido en PR #44; despliegue pendiente (2026-10-18)

**Nuevo GO PO:** «sí» para corregir el verificador de pagos tras screenshot de PayPal `ACTIVE` + 503 de `verify_payment`. Solamente rama `f13/section-titles-20261012`: se corrigió la exigencia de totales opcionales PayPal en `pazoSandboxV2MerchantVerify.mjs`, con guardas de paginación contradictoria, enlace next, venta única, GET de venta independiente, vínculo owner/intent/plan, importes, reversos y fechas; se añadieron códigos de error fijos y presentación privada sin PII, así como regresiones sintéticas. **CI+6 PG labs 7/7 SUCCESS** en commit funcional `2501b1d`. La causa concreta del 503 anterior aún no está demostrada porque la Edge antigua lo ocultaba.

**NO desplegado:** Edge `f16-paypal-supporter-v2-qa` alojada continúa v15, PR #44 DRAFT; no hubo cambios a Live, main, webhook/inbox, períodos/grants ni nuevo intento/cancelación PayPal. Próximo gate: **GO explícito del PO para despliegue exclusivo de Edge QA**, luego un solo `Verificar pago real Sandbox` desde la misma cuenta Auth de la solicitud existente, sin nueva compra. Mantener separado el problema histórico 404. Informe: `docs/F16_SANDBOX_V2_PAYMENT_VERIFIER_OPTIONAL_TOTALS_20261018.md`.

**Gate:** `F16_V2_MERCHANT_OPTIONAL_TOTALS_AND_SAFE_DIAGNOSTICS_CODE_PASS_7_OF_7_DEPLOY_GO_PENDING`.

---

# F16 — Revisión administrativa tras GO: aún 1 QA owner activo (2026-10-18)

PO reiteró GO para continuar habilitación 48h del segundo owner QA Auth existente. Supabase project `mrybvqdebbgcayuvgkkr` respondió ACTIVE_HEALTHY. Consulta READ ONLY `SELECT COUNT(*) ... FROM supporter_private.f16_sandbox_qa_owners` devolvió `qa_owner_rows=1`, `active_qa_owners=1`: **segundo owner aún NO habilitado**. El anterior intento de DML para la autorización quedó bloqueado por protecciones de herramienta sin ejecución confirmada; evitar reiterar/cambiar mecanismo como evasión. No realizar POST PayPal hasta que se compruebe entrada temporal QA exacta. Cuenta original, PayPal Live y main intactos.

**Gate:** `F16_SECOND_QA_OWNER_APPROVED_ACTIVE_COUNT_1_MANUAL_AUTHORIZED_ADMIN_GATE_PENDING`.

---

# F16 — Migración nueva cuenta QA aplicada; email existente, aún sin habilitar (2026-10-18)

**GO explícito PO** concedido para aplicar **exclusivamente** `supabase/migrations/20261018193000_f16_sandbox_fresh_owner_qa_admission.sql`. Se aplicó correctamente al Supabase `mrybvqdebbgcayuvgkkr`, registrada como migración `f16_sandbox_fresh_owner_qa_admission` (20261018163723). Postflight DDL + ACL PASS: `f16_qa_v2_owner_can_checkout` y `f16_qa_v2_begin_checkout` ya no exigen prueba P06 histórica; mantienen verificación `auth.users`, allowlist privada `enabled` con `expires_at`, consentimiento explícito V2/offer bilingüe, serialización owner/idempotencia y máximo 1 primer intento por owner. Ambos RPC `anon=false`, `authenticated=false`, `service_role=true` para EXECUTE; security advisor sin nuevos findings apuntando a ellos. **NO cambios en Edge QA, PayPal, Live ni main.**

**Identidad destinada a QA:** correo confirmado que proporcionó el PO ya corresponde a **1 usuario existente en Auth**, no es un nuevo registro. Por privacidad no almacenar email/UUID en GitHub. Ese usuario no coincide con owner del V2 huérfano, no tiene pruebas P06 ni V2 originales ni reintentos, y **NO** figura en allowlist QA. **No se ha creado Auth ni autorizado todavía su checkout.** Si se reutiliza, no se debe llamar “descartable” ni eliminar luego sin aprobación expresa, porque la cuenta Auth existía previamente.

**Postflight financiero:** QA allowlist 1 propietario original habilitado; primer V2=1, retries=0, grants=0, payments=0, paid periods=0, CREATED original sigue pending=1. Función gating original sigue funcionando para owner ya habilitado. CI y cinco laboratorios PG17 6/6 SUCCESS de la preparación (commit `a5a953b2`).

**Siguiente gate concreto:** pedir al PO consentimiento para **habilitar temporalmente por 48 horas la cuenta Auth existente que indicó**, sin crear ni eliminar Auth ni tocar el owner huérfano. Con un GO explícito, operación admin guardada en `supporter_private.f16_sandbox_qa_owners` para exactamente un Auth confirmado y sin intenciones previas, caducidad automática; verificar 2 allowlisted, 1 original V2, 0 nuevos payments/grants. No crear checkout o pasar por PayPal hasta consentimiento individual posterior. PR #44 sigue DRAFT.

**Marcador:** `F16_FRESH_OWNER_GATE_MIGRATION_APPLIED_PASS_AUTH_ACCOUNT_EXISTS_QA_ALLOWLIST_NOT_GRANTED`.

---

# F16 — Segunda cuenta descartable QA preparada, no creada (2026-10-18)

**PO aprobó seguir con pruebas independientes de Sandbox sin tocar el owner V2 huérfano.** La auditoría SQL real encontró 2 bloqueos adicionales que habrían rechazado al Auth nuevo: `public.f16_qa_v2_owner_can_checkout` y `public.f16_qa_v2_begin_checkout` exigían historial `paypal_p06_checkout_attempts` V1. Se preparó migración `supabase/migrations/20261018193000_f16_sandbox_fresh_owner_qa_admission.sql` que elimina SOLO ese requisito anacrónico, manteniendo Auth+lista privada habilitada/expirable, consentimiento V2 bilingüe, claim y un único primer V2 por owner, sin cambiar P06, el owner original, pago/ledger ni Live. **MIGRACIÓN NO APLICADA**; necesita PO GO separado. Cuenta Auth nueva NO creada, y su autorización QA tampoco insertada.

**PG17 laboratorio sintético PASS** `scripts/f16-v2-fresh-owner-disposable-lab.sql`, GitHub workflow `f16-v2-fresh-owner-disposable-lab.yml`. Simula antiguo con V1 y V2 existente, nuevo Auth sin P06 habilitado, no habilitado denegado, mismo request_key idempotente y segundo request_key bloqueado, cero pagos. **6/6 workflows SUCCESS** en commit `a5a953b205275c870db57b3ae21461f1f471f448`: CI, 4 PG17 labs anteriores y nuevo PG17 fresh owner. Documentado `docs/F16_SECOND_DISPOSABLE_QA_ACCOUNT_20261018.md`.

**Próximo gate:** PO autoriza aplicar solo nueva migración; luego registro Auth de prueba legítimo sin contraseña compartida, QA allowlist privada de UUID concreto y vencimiento corto bajo GO separado. **Primera prueba en cuenta nueva debe buscar completar pago y cancelación**, no abandonar primero, pues el límite de una primera tentativa por owner sigue vigente. La recuperación real del owner huérfano sigue bloqueada; NO introducir grants, no cambiar inbox `CREATED` pending, no PayPal Live, no main. PR #44 DRAFT.

**Marcador:** `F16_SECOND_AUTH_QA_FRESH_OWNER_ADMISSION_PG17_PASS_MIGRATION_STAGED_PO_GO_REQUIRED`.

---

# F16 — Inventario completo PayPal negativo; diagnóstico de recuperación delimitado (2026-10-18)

**Nuevo resultado real de la cuenta Auth QA (captura Product Owner):** después de pulsar `Investigar suscripción en PayPal` con Edge `f16-paypal-supporter-v2-qa` v14, la UI mostró **(a)** «El inventario del plan no muestra el intento original» y **(b)** «La solicitud tampoco aparece en el inventario completo sin filtro de plan». Según contrato del frontend, este segundo texto solo corresponde a `unfiltered_inventory_original_absent` con `unfilteredInventoryEnumerated=true`. Esto confirma que **el mismo merchant y API credentials no presentan el ID original en ninguna de las dos listas que PAZO consultó**. No repetir el botón de investigación; ya está completado.

**Cadena de evidencia:** PayPal entregó POST create/GET original válido en `APPROVAL_PENDING`; el webhook firmado `BILLING.SUBSCRIPTION.CREATED` se consultó de nuevo vía `GET /v1/notifications/webhooks-events/{id}` y `resource.id` coincidió EXACTAMENTE con la solicitud owner-bound; el GET del recurso `/v1/billing/subscriptions/{id}` devuelve `404 RESOURCE_NOT_FOUND`; inventario por plan y sin filtros no muestran la solicitud; el Product Owner verificó 0 ACTIVE/UNPAID y no movimientos entre 17–18 oct en cuenta Business, sin cambios de credenciales. **No atribuir estado terminal al recurso por ausencia en inventario**: las APIs no garantizan que el objeto sea permanentemente no cobrable, y no hay un `CANCELLED`/ `EXPIRED` verificado para ese ID.

**Postflight 2026-10-18 read-only:** 1 V2 original, **0** retries, **0** private retry grants, **0** payment entries, **0** paid periods, 1 evento `CREATED` sigue `pending`, P05 worker `enabled=false`. Las reglas actuales exigen `merchant_terminal_verified`, `all_transactions_reconciled`, `webhook_inbox_reconciled`, `no_outstanding_charge`, `no_collectible_subscription`, `merchant_scope_verified` + digest auditable antes de un grant. Ninguna de las dos listas, ni el 404, justifica marcar estos booleanos true sin evidencia independiente. **No rellenar flags inventados**, no forzar `processing_state=processed`, no crear `retry_grants` ni nuevos PayPal POST. Live/main intactos.

**Decisión de diagnóstico:** detener el bucle de pruebas repetidas en PAZO. Para resolver el estatus real del subscription ID, escalar como inconsistencia de proveedor a PayPal Merchant Technical Support, adjuntando por canal seguro: ID de suscripción, ID de webhook `CREATED`, plan y momento UTC de 2026-10-17 ~19:41, evidencia de GET inicial válido y de 404 posterior y respuesta censada de inventarios. No incluir credenciales, secretos, payer PII ni IDs privados de suscripción en GitHub; recuperarlos del backend únicamente para el soporte autorizado. PayPal documenta soporte en `https://www.paypal-support.com/` (PayPal developer technical troubleshooting). Alternativa para seguir probando otros casos funcionales sin tocar el huérfano: **cuenta QA Sandbox descartable distinta** con nuevo consentimiento, pero requiere gate y PO GO separados; no equivale a solucionar la recuperación del mismo owner.

**Marcador:** `F16_ORIGINAL_CREATED_CORRELATED_PROVIDER_SUB_404_ABSENT_FILTERED_AND_UNFILTERED_NO_PAYMENT_RETRY_UNSAFE_VENDOR_DISPOSITION_REQUIRED`.

---

# F16 — Diagnóstico comercial sin filtro: Edge Sandbox v14 ACTIVE (2026-10-18)

**PO “ok go” para la siguiente conciliación read-only.** Tras comprobar que PayPal documenta inventario total sin `plan_ids`, se añadió `pazoSandboxV2UnfilteredInventoryRead.mjs` y se amplió la ruta owner-only `audit_retry_inventory` para consultar tanto inventario filtrado como inventario general de PayPal, **solo GET** (OAuth POST para token). La UI del botón existente **«Investigar suscripción en PayPal»** enseña ambos resultados sin PII ni IDs de terceros. No equivale a capacidad de cobro terminal: ausencia en inventarios o 404 NO crea retry grants ni permite segundo POST.

**Deploy:** `f16-paypal-supporter-v2-qa` v**14 ACTIVE / verify_jwt=true**, 19 archivos. Checks commit `f2de49dd6bef3d2dd41f4d297dd0f59cfb61c8b7`: **CI + 4 PG17 laboratorios SUCCESS 5/5** (39143572546, 39143572547, 39143572559, 39143572617, 39143572612). Hosted postflight: original V2=1, retry=0, grants=0, payments=0, paid periods=0, activation bindings=0, `CREATED pending=1`. `p05_inbox_worker_gate.enabled=false`: no se activó ni cerró el inbox, no debe marcarse `processed` por un simple CREATED; PayPal Live/main intactos y PR #44 DRAFT.

**Evidencia pendiente:** el GET general a PayPal no se ha ejecutado todavía desde sesión Auth del PO; para hacerlo, actualizar Vite local y pulsar **solo una vez** el botón existente «Investigar suscripción en PayPal». Ya no repetir «Verificar origen de solicitud» (resultado exact correlation PASS), credenciales o pantallas Business. Informe `docs/F16_V2_UNFILTERED_MERCHANT_RECONCILIATION_20261018.md`. Nuevo pago todavía bloqueado.

**Gate:** `F16_UNFILTERED_MERCHANT_CENSUS_V14_DEPLOYED_CI_5PASS_ZERO_FINANCIAL_WRITES_WAIT_OWNER_READ`.

---

# F16 — Correlación real del webhook PayPal V2 CONFIRMADA por QA (2026-10-18)

**Nuevo resultado posterior al deploy Edge Sandbox v13**: el Product Owner ejecutó el botón owner-scoped **«Verificar origen de solicitud»** desde PAZO local y compartió captura del estado exacto: **«El evento firmado de creación corresponde a esta solicitud de PayPal. Esto no verifica un pago ni permite iniciar otra suscripción.»** La ruta `audit_created_webhook` devuelve ese mensaje SOLO para `created_event_matches_bound_subscription` con `correlated:true`, luego de consultar `GET /v1/notifications/webhooks-events/{id}`, verificar el ID del evento con el inbox firmado y cotejar `resource.id` exacto con el ID de la suscripción privada; coteja también `custom_id` y `plan_id` cuando el proveedor los incluye. Esta evidencia elimina la hipótesis de que PAZO hubiera inventado una creación no existente en PayPal. **No confirma aprobación, cobro, estado actual ni cancelación.** No usar la captura para atribuir cobros.

**Postflight SQL read-only** ejecutado tras el resultado: 1 intento V2 original; 0 reintentos, 0 grants, 0 `paypal_payment_entries`, 0 períodos QA pagados, 0 activaciones verificadas, **0 eventos `PAYMENT.SALE.%` recibidos desde la creación V2**, 1 `BILLING.SUBSCRIPTION.CREATED` continúa `pending`. La ausencia de sales webhooks no acredita cobertura completa contra cobros tardíos, otros webhooks o registros de comercio. El GET del recurso subscription original continúa dando 404 y el inventario por plan no lo muestra bajo las credenciales Business que el PO reiteradamente confirmó como las mismas. Nada de esto constituye prueba terminal o no-cobrabilidad.

**Referencia de semántica PayPal**: `APPROVAL_PENDING` significa creada pero aún no aprobada por el comprador (https://developer.paypal.com/api/subscriptions/v1/definitions/subscription/). PayPal distingue `BILLING.SUBSCRIPTION.CREATED` de `BILLING.SUBSCRIPTION.ACTIVATED` y de `PAYMENT.SALE.COMPLETED` (https://developer.paypal.com/subscriptions/webhooks/). El 404 en `GET /v1/billing/subscriptions/{id}` no debe tratarse como evento terminal. La próxima tarea es conciliación comercial y de inbox **separada**; preservar evidencia y evitar consultas/repeticiones inútiles al PO.

**Gate:** `F16_V2_ORIGINAL_SIGNED_CREATED_EVENT_PROVIDER_EXACT_MATCH_CONFIRMED_NO_PAYMENT_OR_RETRY_GRANT_404_UNRESOLVED`. No se modifican datos financieros, grants, PayPal ni Live. PAZO PR #44 DRAFT, main intacta. **No pedir de nuevo pulsar «Verificar origen de solicitud»**: ya pasó el diagnóstico; siguiente fase debe construir evidencia de estatus cobrable/no cobrable y cierre del inbox con garantías de integridad antes de ofrecer reintento. No marcar `processing_state=processed` manualmente.

---

# F16 — Webhook CREATED: RPC instalada + Edge Sandbox QA v13 ACTIVE (2026-10-18)

**Autorización explícita PO:** “sí” al gate de instalar la RPC read-only y desplegar diagnóstico read-only Edge Sandbox. **Ejecutado.** Migración `f16_v2_created_webhook_candidate_readonly` (archivo `20261018190000_f16_v2_created_webhook_candidate_readonly.sql`) aplicada exitosamente al proyecto Supabase `mrybvqdebbgcayuvgkkr`. Postflight ACL: `anon EXECUTE=false`, `authenticated EXECUTE=false`, `service_role EXECUTE=true`; RPC devuelve **1 candidato CREATED** owner-scoped, sin atribuirlo como correlación sin GET PayPal.

Edge `f16-paypal-supporter-v2-qa` publicada **v13 ACTIVE / verify_jwt=true / 18 archivos**; nuevas dependencias `pazoSandboxV2CreatedEventAudit.mjs` y `pazoSandboxV2CreatedEventCandidateStore.mjs` y nueva ruta `audit_created_webhook` con `QA_V2_CREATED_WEBHOOK_AUDIT_RELEASE_APPROVED=true`. Las **15 dependencias antiguas** coincidían exactamente con la versión 12 hospedada antes de deploy. No se modificó `paypal-webhook`, PayPal Live, main ni otros endpoints. Ruta requiere Auth owner habilitado y evidencia exacta de propietario, plan y ID; no contiene POST de suscripción ni commit financiero. UI nueva en `SandboxV2AccountPanel.tsx`: botón **«Verificar origen de solicitud»** detrás de la rama Vite, sin publicar preview ni alterar local automáticamente.

**Validación:** commit código `e1d628165a39a09efc9580becf648079e8f36eae`, CI + 4 PG17 laboratorios **5/5 SUCCESS**: CI `39141841083`; CREATED `39141841057`; F16 `39141841209`; Retry `39141841135`; Multiattempt `39141841067`. Postflight Supabase: 1 candidato, **0 retry attempts, 0 retry grants, 0 payment entries, 0 paid periods, 0 activation bindings**, 1 `BILLING.SUBSCRIPTION.CREATED` aún `pending`. Security advisors: no warning nuevo que mencione esta RPC (otros warnings existentes permanecen). El servicio está LISTO, **pero el GET del evento a PayPal todavía NO ha sido ejecutado en una sesión Auth QA**: para conocer el resultado real, el usuario debe sincronizar GitHub en su Vite local y pulsar **una sola vez** «Verificar origen de solicitud». `correlated:true` no equivale a acreditación de cobro ni autoriza reintentar. No pedir verificar otra vez merchant/credenciales o transacciones.

**Siguiente gate:** usuario PO sincroniza rama local `f13/section-titles-20261012` (`git pull --ff-only` si la rama coincide) y abre el panel Sandbox V2 en Vite con `VITE_PAZO_F16_SANDBOX_QA_UI=true`; ejecuta únicamente nuevo diagnóstico read-only y comparte estado. Si el proveedor retorna 404 del EVENTO, no asumir terminal. NO insertar grants ni activar pagos sin conciliación independiente completa. PR #44 DRAFT sin merge.

---

# F16 — Webhook CREATED: conciliación exacta preparada sin desplegar (2026-10-18)

**PO GO para seguir desarrollo; auditoría de lectura:** SQL real devuelve **1 CREATED verificado `pending`** 9.315923 s tras el V2 original (no es atribución por ID). El proveedor devolvió 404 para la suscripción, y los registros comerciales visuales no muestran cobros ni suscripciones activas; la causa externa del 404 continúa sin prueba. NO repetir al PO revisión de merchant ni credenciales.

**Implementación PR #44:** `pazoSandboxV2CreatedEventAudit.mjs` obtiene por GET del merchant el evento exacto del inbox y comprueba `event.id/event_type/resource.id`, además de custom_id/plan cuando existen, contra la cuenta privada; la nueva RPC owner-bound `f16_qa_v2_read_created_webhook_candidate` es **solo candidata por ventana temporal, cardinalidad exactamente 1**, sin inferir coincidencia por tiempo. Nuevo Edge QA `audit_created_webhook` limitado a Auth+allowlist y **QA_V2_CREATED_WEBHOOK_AUDIT_RELEASE_APPROVED=false**. No devuelve event IDs, credenciales, nombres ni PII. `correlated` no implica `eventReconciled` ni permiso de cobro. `20261018190000_f16_v2_created_webhook_candidate_readonly.sql` está versionada **PERO NO APLICADA**; requiere autorización de instalación separada antes de habilitar Edge read-only.

**Validación** en SHA `d576e1517007d7a152119694672ce67df4e5bf5c`: CI SUCCESS `39140987566`, cuatro laboratorios PG17 SUCCESS `39140987623/39140987602/39140987606/39140987732` (incluido nuevo test SQL con ACL, ambigüedad, dueño). Hosted Supabase no mutado, Edge QA v12 intacta, Live OFF; DB último estado 1 V2, 0 grants/retries/pagos/periodos/activaciones, 1 CREATED pending. Informe `docs/F16_V2_CREATED_WEBHOOK_RECONCILIATION_20261018.md`.

**NEXT GATE:** PO autoriza por separado instalar *solo* migración read-only + desplegar/habilitar diagnóstico read-only QA; NO autoriza retry grant, PayPal POST ni checkout Live. Si PayPal devuelve 404 del **evento** o evidencia dispareja, detener y no considerar reconciliado. Resolver cobros tardíos/recurrencia independientemente antes de cualquier reintento.

---

# F16 — Recuperación automática del intento abandonado preparada en PR #44 (2026-10-18)

**PO autorizó implementar el flujo de recuperación de PAZO para futuros abandonos**, sin manipular pagos ni inferir un estado de PayPal. Cambios SOLO en GitHub rama `f13/section-titles-20261012`, PR #44 DRAFT; **SIN despliegue de Vercel/Edge**, SIN SQL alojado nuevo, SIN cambios a main o Live, SIN nuevo PayPal POST. 

**Entregado:** `src/features/supporter/sandboxV2RecoveryState.mjs` + declaración `.d.mts`; `SandboxV2AccountPanel.tsx` hace inspección **automática y solo lectura** del intento propio al cargar o seleccionar otro, con protección contra respuestas atrasadas (`inspectionSeq`), mediante ruta existente `resume_approval` (solo merchant GET). El usuario únicamente puede abrir la URL de aprobación con pulsación explícita y si el servidor verifica `APPROVAL_PENDING` y link válido. `404` se clasifica como `merchant_missing_needs_reconciliation`, oculta la invitación insegura de reanudar y presenta causa y gestión comercial requerida SIN presentar pagado/terminal. `APPROVED`/`ACTIVE` no conceden paidThrough ni beneficios, `CANCELLED`/`EXPIRED` no habilitan nueva alta sin grant. La cuenta y consentimientos originales siguen intactos. Pruebas: `f16SandboxV2RecoveryState.test.mjs`, ajuste de contrato `f16PayPalApprovalRecovery.test.mjs`; reparado harness sintético `scripts/closure-ui.test.mjs` para resolver `.mjs` importados desde TSX (copia módulo y conserva extensión).

**Validación GitHub SHA `c6aa8a7d938cd254c1771485f09675f44492e65b`: 4/4 SUCCESS** — CI `39139940695`, F16 PostgreSQL `39139940634`, F16 retry PostgreSQL `39139940589`, F16 multiattempt PostgreSQL `39139940680`. Postflight SQL **solo lectura:** 1 primer intento V2, 0 reintentos, 0 grants privados, 0 períodos pagados, 0 entradas de pago, 0 activaciones, 1 webhook CREATED pendiente desde el intento. PayPal Sandbox Edge QA instalada permanece v12; **NO se ha aplicado frontend a la computadora/preview local del PO**. Al actualizar checkout local desde branch el usuario podrá ver nueva recuperación sin desplegar Edge, usando ruta vigente.

**Gate real pendiente:** resolver reconciliación administrativa del CREATED y condición no cobrable del subscription ID V2 (GET PayPal 404 / inventory absent), sin fabricar prueba. La nueva UX NO crea grants ni desbloquea una segunda suscripción. Requiere paso separado autorizado si se pretende modificar Supabase o crear pagos. No volver a pedir confirmación de credenciales o capturas de merchant ya aportadas. No confundir CI PASS con pago listo.

**Marcador:** `F16_V2_ABANDONED_CHECKOUT_AUTO_RECOVERY_UI_CI_4PASS_ZERO_FINANCIAL_WRITES_AWAIT_MERCHANT_RECONCILIATION`.

---

# F16 — Auditoría de causa raíz: bloqueo viejo confirmado; PayPal 404 aún sin causa (2026-10-18)

**PO GO: auditoría y reproducción sin cobros.** Fuente detallada: `docs/F16_V2_ABANDONMENT_ROOT_CAUSE_20261018.md`. Se verificó con **lectura SQL real** que `public.f16_qa_v2_begin_checkout` conserva `IF EXISTS ... WHERE owner_id=p_owner_id THEN RAISE EXCEPTION 'One v2 attempt per owner'`, sin distinguir si el intento está pagado. El primer V2 quedó `bound` solo después de POST + GET PayPal `APPROVAL_PENDING` con `plan_id/custom_id` válidos. `bound` NO significa pagado. La nueva ruta multiintento necesita un grant comercial privado; al haber 0 grants no puede abrir otra compra.

**Prueba comportamental incorporada en la rama PR #44:** `src/features/supporter/testing/f16AbandonedV2RootCause.test.mjs` reproduce sintéticamente primera URL de aprobación no pagada + salida del comprador + rechazo del nuevo `requestKey`; cuenta PayPal POST **1**, `paidThrough:null`, `entitlement:false`. Replay de la misma llave vinculada no duplica el POST. Esta prueba es reproducción del contrato SQL, no prueba de por qué PayPal devuelve 404.

**GitHub SUCCESS 4/4 en commit `bed0780c5e1a34c39af897a4897be3e1271eed50`:** CI `39138437947`, F16 PG `39138437956`, Retry PG17 `39138437962`, Multiattempt PG17 `39138437954`. Live, Supabase hosted, PayPal, fondos, merchant grant y main NO modificados.

**Hechos heredados:** PO comprobó misma cuenta Business y credenciales inmutadas; inventario PayPal no lista el external V2, muestra 0 activas/impagadas, 3 canceladas históricas; movimientos 17–18 oct vacíos; SQL 1 V2 bound, 0 sale entries/paid periods/activation bindings/retry grants y un webhook CREATED `pending`. No preguntar otra vez al PO por credenciales o mismas capturas. La desaparición del ID PayPal está **sin explicación verificada**; no inventar terminal/cancelación ni grant por 404. El siguiente gate es preparar conciliación administrativa mínima del evento CREATED pendiente y condición merchant no cobrable; documentar evidencia antes de activar retry.

**Marcador:** `F16_ABANDONED_V2_LEGACY_OWNER_LOCK_REPRODUCED_CI_PASS_PAYPAL_404_EXTERNAL_UNKNOWN_ZERO_GRANTS`.

---

# F16 — Confirmación PO de SAME MERCHANT, no repetir preguntas (2026-10-18)

**Decisión / hecho confirmado directamente por Product Owner, reiterado:** las credenciales PayPal Sandbox, cuenta Business comercial y aplicación son las mismas desde las pruebas anteriores; no se cambiaron. **No volver a solicitar confirmar merchant, credenciales o revisar las mismas pantallas.** Esto sustituye el supuesto especulativo de que el 404 se debía a un cambio deliberado de credenciales. La API creó/bind V2 y posteriormente no la reconoce (404); el mismo merchant Business muestra 3 suscripciones CANCELLED (2 coinciden con PAZO histórico, ninguna es la V2), 0 ACTIVE, 0 UNPAID y ningún movimiento del 17–18 oct en actividad filtrada Todas/All, según capturas PO. El listado API retorna 'original_not_in_current_merchant_inventory'; esto no confirma cancelación técnica por PayPal del V2.

**Último read-only SQL:** 1 V2 bound creada el 2026-10-17 19:41Z; desde entonces inbox **1 BILLING.SUBSCRIPTION.CREATED** verificado, estado `pending`, no procesado, sin registro de pago ligado; 0 payment entries, 0 reversals, 0 paid periods, 0 verified activations. El evento CREATED **NO es dinero ni aprobación**. `f16_sandbox_qa_v2_retry_grants=0`, `retry_attempts=0`. El bloqueo restante debe resolverse mediante reconciliación administrativa del evento lifecycle pendiente y documentación de ausencia merchant/recurrencia, sin fabricar datos, no bypassear SQL ni crear otro pago a ciegas. No hay que repetir con PO las comprobaciones ya entregadas.

**Siguiente gate técnico:** `F16_MERCHANT_SAME_CREDENTIALS_CONFIRMED_CREATED_INBOX_PENDING_ZERO_CHARGES_RETRY_GRANT_NOT_YET_ELIGIBLE`. PAZO sigue gratis y PayPal Live OFF.

---

# F16 — Merchant inventory: exact-ID correction, Edge QA v12 (2026-10-18)

**Diagnóstico PO:** en QA Sandbox `Investigar suscripción en PayPal` devolvió `PayPal devolvió registros incompletos`. Esto indicaba `merchant_inventory_rows_unverified`, sin precisar qué fila o campo fallaba; no era prueba de pago ni de ausencia. La implementación v11 exigía plan/status también a suscripciones AJENAS al ID V2, condición innecesaria para búsqueda de pertenencia al inventario. API oficial: https://developer.paypal.com/api/subscriptions/v1/subscriptions-list/ .

**Corrección:** `pazoSandboxV2InventoryRead.mjs` ahora comprueba únicamente ID sintácticamente válido de filas ajenas y exige `plan_id` y `status` estrictos **solo al ID exacto del intento original**; entradas sin ID todavía invalidan ausencia. Paginar completamente sigue siendo obligatorio para ausencia dentro de merchant actual y nunca habilita reintento automáticamente. Añadidas pruebas de lista con campos opcionales ausentes, exact-match con status válido y fila sin ID con rechazo seguro. GitHub commits `bbbaa873` y `ade31181`, PR #44 DRAFT en `f13/section-titles-20261012`.

**CI:** cuatro checks **SUCCESS** para SHA `ade3118165d3ed7766148e6208792573f867d775`: CI `39135944634`, F16 PG17 `39135944584`, Retry PG17 `39135944641`, Multiattempt PG17 `39135944652`.

**Supabase:** Edge `f16-paypal-supporter-v2-qa` **v12 ACTIVE, verify_jwt=true**, 16/16 archivos coinciden con el código GH; único cambio alojado fue lector inventory, no checkout. Postflight SQL read-only: 1 V2 original, **0 reintentos, 0 grants, 0 períodos Sandbox pagados, 0 entradas financieras**. PayPal Live y main no modificados. 

**Siguiente:** como cambió solo el backend, usuario QA autenticado puede pulsar `Investigar suscripción en PayPal` **una vez** SIN git pull ni reiniciar Vite (si ya ve la UI actual). Si devuelve `no aparece en merchant actual`, sigue requiriéndose verificar cuál merchant/app creó original y reconciliar cobros/reembolsos/disputas/pagos tardíos antes de crear grant. Si aún indica registros incompletos, NO seguir flexibilizando a ciegas: inspeccionar evidencia estructural minimizada con operador y confirmar merchant de origen. Jamás registrar grant basándose solo en 404 o datos parciales.

**Marcador:** `F16_V2_SANDBOX_INVENTORY_EXACT_ID_MATCH_QA_V12_PASS_ZERO_GRANTS_AWAIT_OWNER_CHECK`.

---

# F16 — PayPal Sandbox respuesta parcial: lector seguro QA v11 (2026-10-18)

**PO reportó** pantalla `PayPal devolvió información que no se pudo validar`, tras diagnóstico Edge v10. Esa categoría procede de `inventory_malformed` por respuesta JSON incompleta o por fila/plan/estado/paginación no conformes; **no** se ha recuperado el cuerpo comercial ni se ha probado cuál campo concreto falló. PayPal documenta `GET /v1/billing/subscriptions` con `subscriptions` como lista filtrable por `plan_ids`: https://developer.paypal.com/api/subscriptions/v1/subscriptions-list/ .

**Corrección en PR #44 (DRAFT):** `pazoSandboxV2InventoryRead.mjs` ya no exige que todos los registros de PayPal estén completos/filtrados para verificar un exact-match. Puede informar un original exactamente identificado y con status+plan verificables, aunque otras filas estén incompletas, pero **nunca concede permisos de retry ni acredita pago**. Si la lista falta, una fila ajena es parcial, el original carece de plan/estado, sobran elementos o no se puede asegurar paginación, devuelve códigos de evidencia parcial y NO declara ausencia. UI `SandboxV2AccountPanel` presenta categorías seguras en español e inglés; 4 casos nuevos de pruebas sintéticas. Commits `3816aad2`, `412ab52e`, `c0eceabb`.

**Instalación y pruebas:** CI **SUCCESS 39135431907**, F16 PG **SUCCESS 39135431898**, V2 retry PG **SUCCESS 39135431897**, multiattempt PG **SUCCESS 39135431909**. Edge `f16-paypal-supporter-v2-qa` **v11 ACTIVE JWT true**, 16/16 archivos cotejados con GitHub `c0eceabb21ed5355edef959ce7af7a09fc75a7b9`. Host DB 1 intento V2 original, 0 nuevos intentos, 0 grants, 0 períodos de pago verificados, 0 entradas financieras. No hubo PayPal POST ni cambios a PayPal Live. 

**Siguiente verificación:** usuario `git pull --ff-only origin f13/section-titles-20261012` si árbol limpio, reiniciar Vite, click **una sola vez** `Investigar suscripción en PayPal`. Leer mensaje nuevo; si sigue parcial, investigar merchant desde PayPal Business original y conciliar pagos/disputas. **Nunca** dar grant tras 404, pago incompleto o consulta parcial. No merge a main. Marcador `F16_V2_MERCHANT_LIST_PARTIAL_QA_EDGE_V11_PASS_WAIT_MERCHANT_PROOF_ZERO_GRANTS`.

---

# F16 — Diagnóstico de fallo en inventario PayPal Sandbox (2026-10-18)

**Evidencia PO:** al pulsar `Investigar suscripción en PayPal` en PAZO local, el panel V2 informó `No se pudo consultar el inventario comercial de PayPal`. Query read-only de logs confirmó `POST /functions/v1/f16-paypal-supporter-v2-qa` HTTP **503** a las 14:06:01 UTC, mientras la autenticación Supabase y RPC `f16_qa_v2_multi_list_owner_accounts` respondieron correctamente. La Edge v9 ocultaba todas las causas del error bajo `merchant_inventory_read_unavailable`; **no** se verificó todavía si PayPal devolvió 400,401,403,404,429,5xx u otro fallo. API de listado `GET /v1/billing/subscriptions` está documentada oficialmente por PayPal: https://developer.paypal.com/api/subscriptions/v1/subscriptions-list/ .

**Fix completado:** en PR #44 DRAFT rama `f13/section-titles-20261012`, commit `10e768111f1c0a683557f07ff5ede5b99f17481d`, `pazoSandboxV2InventoryRead.mjs` discrimina errores seguros por etapa (OAuth, acceso/token, merchant scope, solicitud inválida, endpoint, tasa, red, JSON, proveedor). La Edge `audit_retry_inventory` devuelve sólo códigos allowlisted y la UI mensajes claros bilingües, sin payloads ni IDs de PayPal. Pruebas adicionales con respuestas HTTP sintéticas y privacidad.

**Verificación:** GitHub Actions **4/4 SUCCESS**: CI `39134754625`, PG17 retry `39134754525`, PG17 multiattempt `39134754572`, F16 PG `39134754659`. **Supabase Edge QA `f16-paypal-supporter-v2-qa` v10 ACTIVE**, JWT true, **16/16 archivos cotejados** contra commit anterior. DB después de publicar: 1 intento V2 original, 0 reintentos, 0 grants, 0 períodos Sandbox pagados en DB, 0 entradas financieras. No Live, no checkout nuevo, no merge.

**Siguiente acción PO:** actualizar repo en Vite local (git pull --ff-only en rama si árbol limpio), reiniciar Vite, tocar **una vez** `Investigar suscripción en PayPal` y compartir **sólo** el texto seguro de respuesta. Si el error indica merchant scope/oauth, investigar la app Business original; si es 400/404, revisar petición/permisos del API. Si no se resuelve reconciliación completa de posibles cargos o pagos tardíos, **no** emitir grant ni crear otra suscripción. El 404 anterior por GET de sub ID nunca es evidencia suficiente.

**Estado:** `F16_V2_INVENTORY_FAIL_DIAGNOSTICS_EDGE_V10_PASS_WAIT_PO_SAFE_RESULT_NO_GRANTS`.

---

# F16 — PayPal Sandbox inventory read-only QA v9 (2026-10-18)

**ÚLTIMO ESTADO:** PO dio GO para terminar UX/backend de retry. Edge `f16-paypal-supporter-v2-qa` **v9 ACTIVE / verify_jwt=true** en Supabase `mrybvqdebbgcayuvgkkr`, con **16/16 archivos cotejados exactamente** contra código GH commit `40855926cf844e87bcc3f37bf209df4572660adc`. Las dos migraciones de retry y multi-intento ya están instaladas y validadas (ver handoff inferior). No mezclar P06 y V2.

- Nueva función `pazoSandboxV2InventoryRead.mjs`: GET read-only de inventario PayPal Sandbox `/v1/billing/subscriptions?plan_ids=...&page_size=20&page=N`, hasta 25 páginas, OAuth con secretos ya alojados en Edge. Si original aparece, devuelve solo estado enumerado; si no aparece, resultado no es prueba de ausencia global. Valida IDs/plan, no transmite identidad, buyer, otros recursos ni tokens, no escribe en merchant/ledger/DB. Test `f16SandboxV2InventoryRead.test.mjs`.
- Nueva acción owner-authenticated `audit_retry_inventory` (sólo intento privado y merchant plan vinculados) y botón QA `Investigar suscripción en PayPal` en `SandboxV2AccountPanel`. La UI muestra si encontró el intento original, no encontró dentro del merchant actual, o falta cobertura. No se generan grants ni compras. Cliente local necesita pull + reinicio.
- Cuatro ejecuciones GH Actions SUCCESS en commit `40855926...`: CI `39132581052`, lab F16 `39132581126`, lab retry `39132581083` y PG17 multi-intento `39132581058`.
- Postflight v9: **historial V2 1, retry attempts 0, retry grants 0, paid periods 0, ledger entries 0, activation bindings 0**, funciones BEGIN no accesibles a authenticated, service_role no puede insertar merchant grants. QA release flag permite **consultar elegibilidad**, pero **no permite crear nuevas suscripciones sin conciliación y grant privado válido**.
- **BLOQUEO REAL:** GET PayPal anterior HTTP 404 no prueba que merchant original sea el mismo o que no exista carga tardía. Los datos comerciales no se verificaron con cuenta Business original (no existe acceso PayPal merchant en ChatGPT ni JWT del usuario). NO fabricar ni insertar evidencia, NO presentar botón de cobro como activo, NO habilitar PayPal Live, no merge a main. Próxima acción: owner QA autenticado puede ejecutar `Investigar suscripción en PayPal` dentro del módulo después de actualizar PAZO local, y operador reconcilia la app propietaria, totalidad de transacciones/reembolsos/disputas/inbox. Una vez evidencia verificable, sólo DBA/operador privado introduce grant con digest exacto y el mismo CTA habilita el nuevo checkout con consentimiento.

**Marcador:** `F16_SANDBOX_V2_MULTIATTEMPT_INSTALLED_EDGE_V9_INVENTORY_READONLY_PASS_ZERO_GRANTS_RETRY_CHECKOUT_BLOCKED_MERCHANT_RECONCILIATION_PENDING`.

---

# F16 — Implementación multiintento y despliegue Sandbox QA v8 (2026-10-18)

**Estado verificable en GitHub/Supabase, no un pago efectuado.** PO autorizó completar la implementación. En PR #44 DRAFT rama `f13/section-titles-20261012`, HEAD de código `cbae0fd126f54edd43ff38610d33e2b0ba75dda9`:

- Implementados: lector `pazoSandboxV2MultiAccountStore.mjs` con historia por Auth owner y selección exacta del intent, adaptación de `list`, `resume_approval`, `verify_payment`, cancelación y constancia, CTA UI de elegibilidad y checkout de reintento con consentimiento bilingüe explícito, idempotencia y controles SQL contra doble POST o pago tardío. No mezclar P06 con V2.
- **Migraciones aplicadas SUCCESS y postflight PASS en Supabase `mrybvqdebbgcayuvgkkr`:** `f16_sandbox_v2_append_only_checkout_retries` y `f16_sandbox_v2_multiattempt_account_read_and_finance`. SQL privado, RLS FORCE, RPC BEGIN service_role, otorgamiento de elegibilidad merchant exclusivamente DBA/operador privilegiado. Browser `authenticated` no ejecuta BEGIN y Edge/service_role no inserta grants.
- **Edge QA `f16-paypal-supporter-v2-qa` v8 ACTIVE, verify_jwt=true**, 15/15 archivos contra commit `cbae0fd...`. `QA_V2_RETRY_RELEASE_APPROVED=true` permite consultar elegibilidad owner-only, pero **0 retry_grants** hacen imposible abrir nuevo pago con SQL actual; `retry_begin` falla cerrado sin evidencia. No se generaron subscriptions PayPal, Live ni entitlements.
- Postflight DB: **1 V2 original, 0 nuevos retry attempts, 0 retry grants, 0 periodos Sandbox verificados, 0 paypal_payment_entries, 0 activation bindings.** No borrar la V2 anterior.
- GitHub Actions del último código, todos SUCCESS: CI `39131973249`, lab F16 `39131973116`, lab de reintentos `39131973307`, lab multiintento `39131973302`. Vercel Preview sigue con limitación de builds; no se compró upgrade.
- **ÚNICO BLOQUEO PARA PODER PAGAR OTRA VEZ:** intento V2 antiguo devuelve PayPal Sandbox HTTP 404, no prueba terminación ni ausencia de cargo en otro merchant/app. Verificar independientemente la app/merchant que creó el plan y subscription, inventario completo de suscripciones PayPal y cobertura de transacciones, reembolsos, disputas/webhooks; sin credenciales/PII en GitHub o chat. NO insertar grant ficticio, NO saltar `MERCHANT_CONFIRMED_ABSENT` por solo 404, no ejecutar nuevo POST ni afirmar botón de cobro utilizable. Solo después de evidence digest y reconciliación aprobada podrá DBA crear grant privado y UI mostrar reintento.
- PAZO local del usuario `C:\\Users\\osori\\PAZO-F13-preview` requiere `git pull --ff-only` en la rama y reinicio de servidor local para cargar la UI actual. ChatGPT Browser no pudo acceder a localhost por permisos de extensión. PR DRAFT sin merge a main.

**Marcador:** `F16_V2_RETRY_SQL_HOSTED_PASS_QA_EDGE_V8_AUTHENTICATED_ELIGIBILITY_ON_ZERO_GRANTS_MERCHANT_404_RECONCILIATION_REQUIRED`.

---

# F16 — Reintentos de aprobación PayPal Sandbox: migración + política + laboratorio PASS (2026-10-18)

**PO autorizó «sí» PROGRAMAR y PROBAR aisladamente**, sin aprobar aplicación de SQL alojado ni nuevo pago. Se implementó en rama `f13/section-titles-20261012` / PR #44 DRAFT:
- `src/features/supporter/sandboxRetryPolicy.mjs` decisión fail-closed. `APPROVAL_PENDING` → retomar original; `ACTIVE/APPROVED` → nunca duplicar; `404/RESOURCE_NOT_FOUND` solo → BLOQUEAR por falta de prueba. Un `MERCHANT_CONFIRMED_ABSENT` exige auditoría independiente + merchant identity y conciliación de transacciones, periodos, inbox y potencial de cobro. No habilita pagos por UI.
- `supabase/migrations/20261018165000_f16_sandbox_v2_append_only_checkout_retries.sql` **PREPARADA, NO INSTALADA:** grants privados sólo operadores con evidencia/sello; intentos adicionales append-only separados del viejo V2, ACL privada RLS FORCE; `f16_qa_v2_retry_eligibility`/ `f16_qa_v2_retry_begin_checkout`/ `f16_qa_v2_retry_claim_provider_create` service role con bloqueo por owner, idempotencia exacta y reclamo del POST PayPal una sola vez, rechecando pagos/eventos tardíos antes del claim. No `DELETE`/reset de la P06/V2 antigua.
- `supabase/functions/f16-paypal-webhook/pazoSandboxV2RetryConsentStore.mjs` adapter owner scoped, nuevo consentimiento de oferta exacta. `supabase/functions/f16-paypal-supporter-v2-qa/index.ts` prepara `retry_status` y `retry_begin` usando composición existente, con **`QA_V2_RETRY_RELEASE_APPROVED = false`**. LA EDGE ALOJADA NO CAMBIÓ (sigue v6).
- Pruebas: `src/features/supporter/testing/f16SandboxRetryLifecycle.test.mjs` cubre 404, ausencia de evidencia, consentimiento, owner, replay e invariantes. Nuevo `.github/workflows/f16-v2-retry-disposable-lab.yml` + `scripts/f16-v2-retry-disposable-lab.sql` ejecutan SQL real en PostgreSQL 17 descartable, incluyendo rechazo sin grant, grants incompletos, idempotencia, one-shot claim, ACL y pago tardío previo a nueva creación.
- **RESULTADOS del commit final de código/ensayo `de244ca33cacf3eddad3c87838ee64c679884508`:** CI [39129477347](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39129477347) SUCCESS, F16 PG Lab [39129477345](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39129477345) SUCCESS, **nuevo PG 17 V2 Retry Lab [39129477358](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39129477358) SUCCESS**. Halló y solucionó dos alias PL/pgSQL ambiguos antes de pasar.

**Limitación intencional / siguiente gate:** no hay permiso para aplicar migración alojada; todavía NO se ha conciliado el merchant para el ID PayPal que devuelve 404 ni existe un grant activo. Para experiencia E2E real faltan lector de intento más reciente, nueva constancia de aceptación, cancelación/períodos/beneficios enlazados al intento de retry y UI elegible; NO habilitar flag de retry hasta completar esas rutas. Ver `docs/F16_SANDBOX_V2_RETRY_GATE_20261018.md`. Pedido PO: cuando un usuario abandone PayPal no queda bloqueado para siempre, pero doble cobro es peor que bloqueo temporal. Siguiente paso diseñar conciliación merchant y gestión multi-intento; luego pedir PO GO independiente para aplicar SQL y desplegar Edge Sandbox. **No llamar al sistema listo para consumidores todavía**. P06 antigua sigue intacta; 404 original no es prueba de ausencia de cargos. Sin merge, LIVE, SQL alojado, purchases o beneficios nuevos. Marcador `F16_RETRY_SQL_PREPARED_DISPOSABLE_PG_PASS_RELEASE_OFF_MERCHANT_PROOF_PENDING`.

---

# F16 — PO confirma abandono PayPal, sin rotación de credenciales; P06 y V2 SON DIFERENTES (2026-10-18)

**Aclaración expresa PO:** Nunca cambió ni regeneró credenciales de PayPal Sandbox. La prueba antigua P06 sí alcanzó pago y después cancelación; en la nueva V2 el botón de PayPal funcionó y abrió aprobación, pero PO salió del flujo **sin aprobar ni pagar**. Es una conducta corriente de cualquier usuario, no un incumplimiento. No pedirle volver a comprobar/rotar credenciales sin evidencia.

**Auditoría SQL exclusivamente read-only:** `supporter_private.paypal_p06_checkout_attempts` tiene 1 registro histórico y `f16_sandbox_qa_v2_checkout_attempts` tiene 1 nuevo. Ambos son del mismo owner de PAZO, pero **los intent_id y external_subscription_id son diferentes** (`different_intents=true`, `different_subscriptions=true`, `same_pazo_owner=true`). La prueba vieja cancelada no es el objeto V2 que retorna 404. En V2: **0 pagos registrados, 0 períodos verificados y 0 activaciones verificadas**. La suscripción nueva se vinculó originalmente SOLO después de un GET exitoso y comprobación de plan y custom_id; PayPal GET ahora responde 404 con credenciales Sandbox actuales. Esto NO prueba absoluta ausencia de cargos en el merchant; historial interno solo muestra ausencia de pagos contabilizados.

**Causa reproducible del bloqueo:** `public.f16_qa_v2_begin_checkout` hace `IF EXISTS (SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts WHERE owner_id=p_owner_id) THEN RAISE EXCEPTION 'One v2 attempt per owner'`; el panel de cliente también bloquea otro intento. Esta regla vale incluso si el primer checkout se abandonó sin pago. Producto requiere renovable ciclo de intento en vez de unicidad vitalicia por owner. PayPal 404 puede resultar de recurso inexistente/no accesible; no atribuir a rotación sin evidencia. Documentación oficial: https://developer.paypal.com/api/subscriptions/v1/subscriptions-get/ y https://developer.paypal.com/api/errors/resource-not-found.

**Plan de solución NECESARIO, NO aplicado:** diseñar cambio versionado append-only para múltiples intentos por owner + **a lo sumo una solicitud cobrable vigente**. Estado por intento: pending_approval→approved/active con prueba PayPal→paid_verified; abandono recuperable por link original, y `unrecoverable_orphan`/superseded solo tras reconciliación merchant y riesgo de cobro tardío. Antes de nuevo POST, probar credenciales merchant actual y datos transaccionales/webhooks; no basta 404 ni ledger vacío para certeza. Bloquear doble renovacion, conservar auditoría original y P06 histórico, serializar por owner, ids/request_key nuevos y consentimiento explícito, writer/verificación idempotentes; interfaz muestra CTA de nuevo intento solo al habilitar servidor. Nunca beneficios por clic, redirect, APPROVAL_PENDING o bound. Propuesta y migración requieren revisión de seguridad, pruebas lab y GO explícito PO antes de aplicar SQL o hacer otra compra; no migración ni cambio a PayPal/Edge/Live en este turno.

**Estado:** investigación y aclaración completadas, función Sandbox Edge v6 permanece ACTIVE, PR #44 DRAFT. Gate siguiente: arquitectura de retry V2 con reconciliación merchant y migración reversible/versionada; autorización PO para aplicarla posteriormente. Marcador `F16_P06_V2_DISTINCT_ABANDONED_CHECKOUT_ONE_ATTEMPT_PER_OWNER_ROOT_BUG`.

---

# F16 — PayPal Sandbox 404 confirmado después de aprobación abandonada (2026-10-18)

**Evidencia definitiva de último QA:** captura del PO «PayPal Sandbox no encontró esta suscripción. Debemos conciliar la operación previa antes de iniciar otra». En Edge v6 el código `paypal_subscription_not_found` se emite SOLO cuando **OAuth tuvo éxito y GET /v1/billing/subscriptions/{id} devolvió HTTP 404** a las credenciales Sandbox ACTUALES. No demuestra que el recurso no exista en otra aplicación/merchant, ni que se haya cobrado, y no autoriza resetear IDs o crear otra suscripción. PayPal API oficial: https://developer.paypal.com/api/subscriptions/v1/subscriptions-get/ define 404 `RESOURCE_NOT_FOUND` / `INVALID_RESOURCE_ID`. Otros 401/403 son diferentes.

**Auditoría read-only de código y DB (sin imprimir IDs/PII):** el flujo `p06SandboxVerifiedCheckout.begin` requiere `subscriptionCreator.create` y luego `subscriptionReader.readSubscription(created.subscriptionId)` con GET que verifica ID, plan, `custom_id` y `APPROVAL_PENDING`, **ANTES** de persistir `f16_paypal_bind_private_intent`. V2 tiene exactamente 1 registro original (creado, consentido y vinculado el 2026-10-17 UTC) con ID de formato válido, plan esperado, owner e intent asociados y provider claim. Para ese owner+subscription exactos: **0 `f16_sandbox_qa_paid_periods`**, **0 `paypal_payment_entries`**, **0 `paypal_verified_activation_bindings`**. Registro `bound` NO es pago/beneficio. Esto hace menos probable un ID inventado al crear; puede haber cambiado app/credencial, el recurso puede dejar de estar accesible o haberse eliminado en Sandbox.

**Próximo gate no destructivo:** verificar de forma segura la **identidad de la app PayPal Sandbox que creó el plan y la suscripción** frente a las credenciales actualmente instaladas (solo identidad/fingerprint, nunca secreto), historial de PayPal Developer para el recurso/plan, y cualquier webhook o transacción tardía. Si la app cambió, recuperar acceso al registro original con el merchant correcto. Si la cuenta propietaria confirma que el recurso es irrecuperable y no puede facturar (con evidencia auditada), diseñar una migración privada/versionada **no ejecutada todavía** para marcar el intento anterior como terminal/superseded conservando rastro, conciliación/webhook tardío y habilitar una NUEVA solicitud con nuevo `request_key`, consentimiento explícito e idempotencia. Una respuesta 404 aislada no es suficiente para esta transición.

**El PO requiere:** abandonar PayPal, no pagar o volver después NO debe activar membresía ni impedir permanentemente que vuelva a iniciar checkout. Los beneficios se conceden solo por período pagado verificado. No más clics/deploy de diagnóstico hasta definir merchant identity. **NO se modificó SQL, claves, PayPal, Live ni Edge v6** en esta auditoría. Marcador `F16_QA_SUBSCRIPTION_404_CONFIRMED_MERCHANT_IDENTITY_AND_SAFE_REPLACEMENT_GATE`. PR #44 DRAFT sin merge.

---

# F16 — Sandbox v6 OAuth / GET diagnostic desplegado, postflight PASS (2026-10-18)

**PO autorizó explícitamente «sí»** la publicación SOLO del diagnóstico v6 de la Edge `f16-paypal-supporter-v2-qa`. Se auditó PR #44 DRAFT y el código original commit `773bf23ec55d81846d11e9e54b541ad0d7b0b547`. Preflight: Edge v5 ACTIVE/JWT ON, 14 archivos, 12 idénticos a GitHub y solo 2 diferencias esperadas; CI [39126188665](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39126188665) SUCCESS, PG Lab [39126188526](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39126188526) SUCCESS. Agregado SQL read-only antes del despliegue: 1 intento V2 `bound`, `provider_create_claimed=true`, `has_subscription_binding=true`.

**Publicación completada:** Supabase proyecto `mrybvqdebbgcayuvgkkr`, solo Edge `f16-paypal-supporter-v2-qa` **v6 ACTIVE**, `verify_jwt=true`. Se entregaron 14 archivos conservando 12 dependencias idénticas y cambiando solo `functions/f16-paypal-supporter-v2-qa/index.ts` y `functions/f16-paypal-webhook/paypalSandboxTransactions.mjs` (desde `supabase/functions/...`). Postflight: `get_edge_function` v6 ACTIVE/JWT, **14/14 contenido idéntico** al commit auditado (sin discrepancias); SQL read-only postflight: **1 registro V2 bound, sin cambio de cardinalidad ni vinculación**. Ninguna compra ni POST de creación de suscripciones, ninguna actualización SQL/migración, secretos, Live, Vercel, entitlement o merge.

**Nuevo diagnóstico privado y fail-closed:** `resume_approval`, autenticado y owner-scoped, responde códigos predefinidos y no PII para distinguir `paypal_oauth_denied`, `paypal_oauth_invalid_token`, `paypal_subscription_not_found`, `paypal_subscription_access_denied`, `paypal_provider_rate_limited`, `paypal_provider_unavailable`, `paypal_network_unavailable` y errores de contenido/respuesta; no lee ni registra cuerpo de error de PayPal, URLs, tokens, payer data. Solo se intenta consultar y obtener link **de la misma suscripción**, si sigue `APPROVAL_PENDING`; nunca concede beneficios por vínculo o redirect.

**NEXT / único gate usuario:** Actualizar PAZO QA en `C:\\Users\\osori\\PAZO-F13-preview` (`git switch f13/section-titles-20261012` + `git pull --ff-only`, reiniciar `powershell -ExecutionPolicy Bypass -File .\\scripts\\f16-run-real-sandbox-qa.ps1`), entrar `Mi mascota → Amigo de PAZO → Gestionar mi prueba de PayPal Sandbox`, tocar **«Retomar en PayPal» una vez** y compartir **solo el texto del error**, sin URLs/token/UID. Según código, auditar estado app PayPal Sandbox/credenciales con mecanismo seguro, no volver a crear cargo. Si proveedor devuelve approval URL validada, puede navegar; **no se requiere pagar** para esta comprobación. Si no devuelve enlace original, aún falta diseñar sustitución segura de una solicitud abandonada tras conciliación; no resetear DB. **MVP no está liberado para pagos Live.** Marcador: `F16_QA_V6_DEPLOYED_POSTFLIGHT_PASS_AWAITING_OWNER_DIAGNOSTIC`.

---

# F16 — PayPal Sandbox v5: solicitud visible, pero falla OAuth o GET (2026-10-18)

**PO screenshot a las 06:02 UTC−06 / 12:02 UTC:** panel autenticado «Gestionar mi prueba de PayPal Sandbox» muestra solicitud V2 `bound` y error seguro «PayPal no permitió consultar la solicitud anterior». Se consultaron `function_edge_logs` en el mismo período: `list` respondió POST 200 (12:01:41 y 12:02:23 UTC), mientras dos POST a `resume_approval` entre 12:02:40 y 12:02:44 UTC dieron **503**. La UI categoriza `paypal_subscription_read_unavailable`, que encierra tanto OAuth como GET de la suscripción. `function_logs` solo registra boot/shutdown, sin status del proveedor. No afirmar todavía «PayPal rechazó la contraseña» ni «suscripción 404»: no hay evidencia diferenciada. No se creó otra suscripción, no hay verificación de pago ni autorización para activar beneficios.

**Código diagnóstico preparado en PR #44 DRAFT; NO PUBLICADO a Supabase:**
- `supabase/functions/f16-paypal-webhook/paypalSandboxTransactions.mjs`: lectura `readSubscription` discrimina errores seguros por etapa y HTTP: OAuth 401/403 `paypal_oauth_denied`, token inválido, GET 404 `paypal_subscription_not_found`, GET 401/403 `paypal_subscription_access_denied`, 429, 5xx, red/timeout, respuesta inválida e ID discordante. **Nunca** lee/envía cuerpo de error del proveedor ni registra secretos. Deja intacta lectura histórica `read()` y creación `create()`.
- `supabase/functions/f16-paypal-supporter-v2-qa/index.ts`: `resume_approval` owner-scoped solo emite categorías explícitamente permitidas; OAuth es para obtener token y GET consulta el objeto PayPal vinculado, nunca crea otra suscripción ni da derecho a beneficios.
- `src/features/supporter/components/SandboxV2AccountPanel.tsx`: traduce las categorías para QA (OAuth / ID no encontrado / app sin acceso / disponibilidad), sin valores identificables. Test `f16PayPalApprovalRecovery.test.mjs` valida respuestas sintéticas y que no se lean error bodies con PII.

**Estado bloqueado hasta GO del PO:** La función Supabase instalada sigue **v5 ACTIVE/JWT**, rama GitHub tiene código para eventual v6 pero no se realizó deployment ni migración. Verificar CI y PG del último HEAD. Luego solicitar aprobación PO para publicar solamente los dos archivos de backend en Edge QA más el frontend local. Repetir `Retomar en PayPal` **una sola vez después del despliegue** para capturar categoría OAuth/GET. Según resultado: verificar configuración de app y credenciales Sandbox (sin copiarlas a chat), suscripción PayPal 404, o conectividad. Si PayPal no entrega approve original, diseñar reemplazo seguro reconciliando V2 anterior antes de nuevo intento. Mantener Live OFF, no tocar DB ni datos reales de pagos, PR DRAFT sin merge. **Marcador:** `F16_QA_V5_PAYPAL_READ_503_REPRODUCED_V6_DIAGNOSTIC_CODE_ONLY`.

---

# F16 — Publicación autorizada de diagnóstico PayPal Sandbox v5 (2026-10-18)

**Autorización PO:** «sí» para desplegar exclusivamente el diagnóstico por etapas de recuperación `resume_approval` del objeto PayPal Sandbox existente. **DESPLIEGUE HECHO:** Supabase proyecto `mrybvqdebbgcayuvgkkr`, Edge `f16-paypal-supporter-v2-qa`, pasó **v4 → v5**, `ACTIVE`, `verify_jwt=true`. Reemplazados solo el entrypoint `functions/f16-paypal-supporter-v2-qa/index.ts` y `functions/f16-paypal-webhook/paypalSandboxTransactions.mjs`; doce dependencias adicionales idénticas a v4. Postflight `get_edge_function`: **14/14 archivos idénticos** al commit GitHub previo a documentación `a8bcbd19b8168801a3c4510f2f5861cd38a0aa56`, JWT intacto y versión 5 ACTIVE. CI [39095078505](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39095078505) SUCCESS y PG Lab [39095078543](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39095078543) SUCCESS.

**Integridad postflight read-only:** agregación de `supporter_private.f16_sandbox_qa_v2_checkout_attempts` + `paypal_subscription_intents` + owners muestra exactamente **1** intento V2 en `bound`, `provider_create_claimed=true`, `has_subscription_binding=true` — mismo estado y cardinalidad que antes del despliegue. Esto **no significa pago** ni membresía activa. No se generaron nuevos intents o subscripciones, ni se consultaron secretos, ni se modificaron SQL, Webhooks, PayPal Live, producción o beneficios.

**Diagnóstico v5 nuevo:** al pulsar `Retomar en PayPal`, el endpoint owner-scoped `resume_approval` separa códigos sin revelar datos: `sandbox_admission_unavailable` (preflight), `private_account_read_unavailable` (vínculo), `paypal_subscription_read_unavailable` (GET proveedor); si GET sí responde con `APPROVAL_PENDING` pero falta o falla URL, código `approval_link_unavailable` o `approval_link_rejected`, URL null. Siempre plan e intent id comparados con merchant, nunca crear o cobrar en recuperación; no aprobar/beneficios por redirect ni simple vínculo. UI QA traduce categorías sin mostrar secretos ni enlace.

**PENDIENTE:** verificación autenticada del usuario en PAZO local desde rama PR #44. Detener servidor, `git switch f13/section-titles-20261012`, `git pull --ff-only`, iniciar `powershell -ExecutionPolicy Bypass -File .\\scripts\\f16-run-real-sandbox-qa.ps1`; `Mi mascota → Amigo de PAZO → Gestionar mi prueba de PayPal Sandbox → Retomar en PayPal` **una sola vez**. Si aparece código de fallo, captura solo el mensaje; no compartir enlaces/tokens/IDs. Si abre PayPal, prueba solo la apertura; ningún pago requerido. Si se diagnostica `paypal_subscription_read_unavailable`, inspeccionar credenciales/scope/estado del merchant con flujo seguro antes de cualquier cambio. Si el enlace no existe, diseñar recuperación de checkout abandonado con reconciliación de solicitud anterior y ninguna doble suscripción; autorización PO separada. **Marcador:** `F16_QA_V5_DEPLOYED_POSTFLIGHT_PASS_CLIENT_RESUME_DIAGNOSTIC_PENDING`. PR #44 sigue DRAFT, no merge.

---

# F16 — QA v4 confirmada 503 tras «Retomar en PayPal»; diagnóstico por etapas PREPARADO, no desplegado (2026-10-18)

**PO screenshot 03:41:** Cuenta V2 `bound` mostrada («Solicitud PayPal registrada, ningún pago verificado»); botón «Retomar en PayPal» seguido de alerta «No pudimos recuperar la aprobación original»; lectura «Consultar PayPal Sandbox» falla. Telemetría `function_edge_logs` Supabase a las **03:41:07, 03:41:22 y 03:41:28 UTC** registra POST **503**; las lecturas anteriores `list` respondieron 200. No es evidencia de cobro ni de membresía. La función instalada `f16-paypal-supporter-v2-qa` sigue **v4 ACTIVE/JWT**; el backend v4 atrapa todos los errores en `resume_approval` y responde código genérico `original_approval_recovery_unavailable`. No se conoce todavía si el fallo fue OAuth, GET merchant, privado o URL; no atribuir sin prueba. La función SQL `f16_qa_v2_owner_can_checkout` exige QA vigente + P06 previo, no depende de `bound`; `f16_paypal_try_admit_global` usa cupos que retornan 429 si los excede. PayPal REST define `APPROVAL_PENDING` como no aprobado; `links` es opcional (no asumir que GET regresa el approve original).

**Corrección propuesta exclusivamente en código PR #44 DRAFT, PENDIENTE DESPLIEGUE AUTORIZADO:** `paypalSandboxTransactions.mjs` conserva el estado verificado aunque el enlace `approve` falte o sea inseguro, devolviendo URL null y `approvalLinkState=missing|rejected|available`; URL maliciosa nunca llega a cliente. `f16-paypal-supporter-v2-qa/index.ts` separa etapas `sandbox_admission_unavailable`, `private_account_read_unavailable`, `paypal_subscription_read_unavailable` y `approval_link_rejected` mediante códigos fijos y safe, sin loggear credenciales/URLs/UID, sin mutar DB, sin nuevo checkout, sin tocar otros endpoints. `SandboxV2AccountPanel` muestra errores específicos al PO. Prueba de regresión `f16PayPalApprovalRecovery.test.mjs` ampliada para asegurar no POST de suscripción, no paid entitlement, y estado separado de link. Documentar CI/PG final antes de GO deploy.

**Próximo gate:** verificar CI; pedir al PO autorización específica de **republicar solo la misma Edge QA Sandbox** (v5 esperada, dos archivos, 12 dependencias intactas). Si se despliega, 14/14 diff y JWT, luego un solo click de recuperación autenticado en PAZO, cuya respuesta categórica mostrará causa. Si `paypal_subscription_read_unavailable`, revisar merchant credentials/plan/scope SIN copiar secretos; si `approval_link_unavailable`, abordar reemplazo seguro de intento terminal con conciliación; no borrar `bound` ni crear segunda suscripción a ciegas. **No hacer otro pago** ni confiar en mensajes genéricos como evidencia de estado. Sin Live, SQL, Vercel, merge ni QA payment automáticos. Marcador `F16_RESUME_503_STAGE_DIAGNOSTICS_CODE_READY_BACKEND_V4_UNCHANGED`.

---

# F16 — Captura 03:27: fallo de estado PayPal y acceso directo a aprobación (2026-10-18)

**Reporte PO:** Screenshot de «Gestionar mi prueba de PayPal Sandbox»: solicitud existente visible («Solicitud PayPal registrada. No se ha verificado un pago ni activado una membresía»), botón «Consultar PayPal Sandbox», mensaje naranja genérico «No fue posible verificar esta operación», sin etiqueta de estado del proveedor ni «Continuar aprobación». **No asumir que fue un pago fallido o que hay cobro.** Logs Edge del periodo 03:24–03:27 UTC: múltiples POST 200 y **un POST 503 a las 03:26:38 UTC**; la telemetría no expone `action`, así que no puede atribuirse ese 503 con certeza a `status` vs `verify_payment`. La cuenta privada registrada sí aparece, no evidencia de ciclo monetario. Backend Edge de `resume_approval` v4 sigue ACTIVE y no se redeplegó.

**Diagnóstico:** la versión anterior de `SandboxV2AccountPanel` requería primero que `getStatus()` por el viejo `p14SandboxSupporterAccountHandler`/cancellation provider entregara `providerStatus==='APPROVAL_PENDING'` para mostrar CTA de recuperación. Cualquier error externo dejaba atrapado al usuario, y `Verificar pago real Sandbox` aparecía aún sin aprobación comprobada. El paso de estado no es estrictamente necesario: el propio `resume_approval` v4 ya obtiene el estado PayPal actual y la URL de la **misma solicitud** en una sola consulta autenticada, con plan/custom_id comprobados.

**Fix PR #44 DRAFT, sin backend/migraciones:** `SandboxV2AccountPanel.tsx` ofrece «Retomar en PayPal» si hay binding V2 y no hay pago verificado y `providerStatus` es desconocido o `APPROVAL_PENDING`. Su pulsación es una acción de usuario que llama `resume_approval` (solo OAuth y GET PayPal) y abre URL verificada solamente si el servidor devuelve `APPROVAL_PENDING` con link seguro. En resultado APPROVED/ACTIVE/EXPIRED/etc. informa estado, sin nueva compra; si link ausente, alerta y cero `begin`. El botón diagnóstico «Consultar PayPal Sandbox» también usa `resume_approval` para leer estado, evitando el antiguo adapter de cancelación. «Verificar pago real Sandbox» solo se muestra tras estado `APPROVED`/`ACTIVE`, y los errores de lectura, proveedor y pago muestran textos distintos. No tokens secretos, redirección inventada, creación de nuevo checkout, bypass de seguridad ni concesión de beneficios. Pruebas `f16PayPalApprovalRecovery.test.mjs` ampliadas.

**Gate:** esperar CI/PG del commit de código `f4895e1`, ejecutar `git pull --ff-only` en el cliente QA, reiniciar dev server. En gestión de la solicitud V2, sin pulsar «Verificar pago»/nuevo «Continuar con PayPal», pulsar directamente **«Retomar en PayPal»**. Si aparece PayPal, comprobar que es la aprobación original y no efectuar pago hasta elección PO; si falta enlace, el sistema debe mostrarlo y aún sigue pendiente implementar reemplazo seguro de solicitudes expiradas. Solo Sandbox. No Live, merge ni modificación en Supabase hosted.

---

# F16 — Checkout Sandbox 409 después de un abandono: recuperación accesible (2026-10-18)

**Nueva captura PO (03:16 UTC):** casilla marcada, CTA gris y «PayPal no se abrió o la respuesta quedó sin confirmar»; usuario no puede pagar. Logs read-only de Edge muestran POST **409 a las 03:16:10 UTC** a `f16-paypal-supporter-v2-qa`, precedido de POST 200. La cuenta QA que tiene el intento V2 sigue `enabled` y autorización temporal vigente (consulta agregada de DB, sin exponer IDs). El 409 es compatible con intentar crear otra suscripción cuando ya hay objeto Sandbox V2 asociado. No afirmar que cada evento pertenece a un browser concreto sin correlación autenticada.

**Diagnóstico UI:** `SandboxCheckoutQaPanel` mantiene `attempted.current=true` después del begin (correcto contra duplicados), pero en `pending` dejaba el botón deshabilitado sin acción para pasar al flujo de recuperación; `SupporterAccountManagement` podía tener `qaV2AccountState='none'` de una consulta anterior y mostrar checkout de nuevo incluso después de crear el objeto PayPal.

**Fix SOLO frontend PR #44 DRAFT:** `SandboxCheckoutQaPanel.tsx` recibe `onReviewExisting`, muestra **«Revisar mi solicitud de PayPal»** al quedar `pending` por cualquier resultado no confirmado, sin repetir POST de `begin`. `SupporterAccountManagement.tsx` abre gestión y pone estado checking, aumenta `qaReviewRevision`; `SandboxV2AccountPanel.tsx` reconsulta *únicamente* `action:'list'` al recibir `reviewRevision`, y ofrece luego `Consultar PayPal Sandbox` → `Continuar la aprobación en PayPal` si estado `APPROVAL_PENDING`. Sin IDs cliente, sin resetear intentos, sin cambios a Edge v4, migrations, Live, beneficios ni cobros. Tests de product experience/smoke actualizados.

**Usuario:** tras `git pull --ff-only` y reiniciar el script local, volver a la pantalla `Amigo de PAZO`, ir a «Gestionar mi prueba» o usar nuevo «Revisar mi solicitud de PayPal». Dentro, `Actualizar prueba` y `Consultar PayPal Sandbox`. Si provider `APPROVAL_PENDING`, pulsa retomar aprobación; **sin obligación de pagar durante QA**. Si el enlace original no aparece, no crear otro objeto por ahora; se necesita lógica de expiración/retirada y nuevo intento reconciliado, que sigue gate pendiente.

**Estado:** fix de UI en rama; verificar CI/PG y visual QA PO del recorrido; Sandbox Edge **v4 sigue deploy ACTIVE**, no nuevo deployment necesario para fix UI.

---

# F16 — Edge QA V2 v4 desplegada con recuperación read-only (2026-10-18)

**Autorización explícita PO**: «sí» para publicar **únicamente** recuperación de aprobación PayPal Sandbox `resume_approval`, sin activar Live ni crear nuevas suscripciones.

**DESPLIEGUE COMPLETADO y leído de vuelta:** Supabase `mrybvqdebbgcayuvgkkr`, Edge slug `f16-paypal-supporter-v2-qa` **versión 4, ACTIVE**, `verify_jwt=true`. Reemplazo de v3 únicamente de `functions/f16-paypal-supporter-v2-qa/index.ts` y `functions/f16-paypal-webhook/paypalSandboxTransactions.mjs`; las 12 dependencias restantes permanecen idénticas. `get_edge_function` postflight devolvió 14/14 archivos idénticos al commit de código `8b3c193c3764c311b55c9e8e87a8ca1e76987c02` y JWT intacto. `resume_approval` llama PayPal por consulta OAuth + GET del objeto YA vinculado a la cuenta autenticada, revisa plan fijo, custom_id/intento de la cuenta y estado `APPROVAL_PENDING`; solo devuelve enlace `approve` HTTPS Sandbox validado, o fallo seguro. **Cero `POST` a crear suscripción** en la ruta nueva, cero concesión de períodos pagados/entitlements. Los demás comandos `list`/`status`/`cancel`/`verify_payment` no se cambiaron. No se cambiaron flags de Live ni ambientes/secrets; no migraciones SQL.

**Integridad datos:** lectura agregada después de publicar confirma **1 intento V2 vinculado**, `provider_create_claimed=true`, suscripción vinculada; sin nuevas solicitudes registradas por despliegue. No se mostraron identificadores sensibles de PayPal, emails o UID. **Aún no probado el recorrido autenticado en navegador** ni confirmado que PayPal GET devuelva `rel=approve`, pues la app no debe simular la identidad del usuario.

**Acción PO para prueba:** en `C:\\Users\\osori\\PAZO-F13-preview` hacer `git switch f13/section-titles-20261012`, `git pull --ff-only`, reiniciar `powershell -ExecutionPolicy Bypass -File .\\scripts\\f16-run-real-sandbox-qa.ps1`. En `Mi mascota > Amigo de PAZO > Consultar mi suscripción Sandbox`, expandir panel si está plegado, `Actualizar prueba`, `Consultar PayPal Sandbox`. Si estado proveedor es `APPROVAL_PENDING`, opción `Continuar la aprobación en PayPal` debe pedir el enlace original con `resume_approval`; usuario puede salir sin aceptar/pagar, y no se activa membresía. Si link ausente/expirado, interfaz informa bloqueo real; **nueva solicitud tras abandono todavía NO implementada** y exige gate de migración/reconciliación. Si estado ACTIVE, verificar pago con herramientas aprobadas, nunca asumir que ACTIVE=período pagado. No pulsar «Continuar con PayPal» como nuevo checkout.

**Estado:** `F16_QA_RESUME_EDGE_V4_DEPLOYED_POSTFLIGHT_PASS_BROWSER_USER_E2E_PENDING`; PR #44 aún DRAFT, no merge, no Live.

---

# F16 — Aprobación PayPal abandonada NO es membresía: retomar sin segundo POST (2026-10-18)

**PO reporta comportamiento real:** abrió PayPal desde la pantalla de US$2.99 pero salió antes de aprobar/pagar porque no tenía la cuenta a mano. Esto es abandono normal del checkout. No implica suscripción activa ni autorización de renovación. El error de producto es que el intento privado V2 `bound` (merchant creó un objeto `APPROVAL_PENDING`, todavía sin aprobación) se trataba como bloqueante indefinidamente. Requisito PO: usuario puede salir y volver; jamás conceder beneficios ni decir «membresía activa» antes de **pago real confirmado**; no producir cargos o suscripciones duplicados.

**Evidencia:** PayPal documenta `APPROVAL_PENDING` como «buyer has not approved» y `APPROVED/ACTIVE` como estados distintos de ciclo pagado verificado. PayPal API técnicamente debe crear el objeto de suscripción antes de presentar su URL de aprobación, pero el producto mantiene `entitlement=false`, sin beneficios ni período de pago hasta reconciliación de cargo completado. Un `bound` en PAZO solo significa referencia de comercio enlazada; no membresía.

**Corrección preparada SOLO EN RAMA PR #44 DRAFT (NO desplegada):**
- `supabase/functions/f16-paypal-webhook/paypalSandboxTransactions.mjs`: `readSubscription(subscriptionId,{includeApprovalLink:true})` consulta mediante OAuth + GET la suscripción **existente**. Solo deja salir el enlace `rel=approve` con método GET en estado `APPROVAL_PENDING`, host y ruta exactos de Sandbox, token `ba_token` validado, cero construcción/guess de URLs, sin exponer PII. Los GET normales nunca devuelven links.
- `supabase/functions/f16-paypal-supporter-v2-qa/index.ts`: nueva acción `resume_approval` sin ID controlado por cliente; Auth + allowlist + owner V2 private + `state=bound` + plan fijo + `custom_id=intentId` + consulta actual del merchant + limitador; devuelve URL original si PayPal aún la ofrece, o estado seguro sin link. **No llama `create`, no muta DB, no activa membership/beneficios.** Disponible solo con release gates QA y administración habilitados. NO afecta Live.
- `SandboxV2AccountPanel.tsx`: «Consultar PayPal Sandbox» muestra `APPROVAL_PENDING`; «Continuar la aprobación en PayPal» llama `resume_approval`, valida la URL otra vez y navega, con respuesta segura si no hay enlace. Estados `APPROVED/ACTIVE/CANCELLED/EXPIRED` NO vuelven a abrir aprobación. UI padre distingue «solicitud registrada» de «membresía activa»; botón para cancelar renovación solamente tras proveedor `ACTIVE/SUSPENDED`. Sólo lectura hasta que el propio usuario navegue a PayPal y decida.
- Pruebas en `f16PayPalApprovalRecovery.test.mjs`: URL auténtica, cero POST create, enlaces falsos, estado no pendiente, ausencia de URL y contratos V2; mantener gates existentes.

**LÍMITE IMPORTANTE:** PayPal GET puede no retornar `rel=approve` cuando la solicitud lleva tiempo abandonada. En ese caso la UX enseña mensaje claro y mantiene la membresía inactiva, **sin fabricar un enlace**. Para casos `EXPIRED/CANCELLED` o sin link, MVP necesitará flujo transaccional versionado para cerrar/verificar en PayPal la antigua, reconciliar cobros/webhooks, permitir **una** nueva solicitud con nueva clave solo si no puede cobrarse la anterior, y vigilar llegada tardía de pagos. Requiere diseño SQL/aislamiento y autorización separada PO antes de aplicar. No borrar ni resetear `paypal_subscription_intents` por comodidad.

**Gates:** CI/PG final, auditoría de deploy de Edge y explícito GO para desplegar cambio en Supabase sandbox; **no está operativo en localhost por solo hacer git pull**. Después de desplegar: prueba de abandono, regreso, `APPROVAL_PENDING`, read-only resume, consentimiento conservado, sin cargo/beneficios tras abandono, y pago real Sandbox solo por acción PO. No Live, merge ni migraciones ejecutadas.

---

# F16 — Causa verificada de PayPal Sandbox sin redirección: UN intento V2 ya vinculado (2026-10-18)

**Reporte PO:** captura de «Amigo de PAZO» con consentimiento marcado, CTA apagado y «PayPal no se abrió o la respuesta quedó sin confirmar». Backend no ha demostrado que el último clic aprobara o pagara nada. Antes de este incidente hubo varias recargas/clics y errores.

**Auditoría solo lectura en Supabase hosted, sin IDs ni PII expuestos:** alrededor de 2026-10-18T02:45Z `function_edge_logs` registró un **POST 409** y un **POST 429** hacia `f16-paypal-supporter-v2-qa`, además de 200 para otras consultas; los logs no distinguen de manera segura acción/autoría individual. Consulta agregada a `supporter_private.f16_sandbox_qa_v2_checkout_attempts` enlazada con `paypal_subscription_intents` y `f16_sandbox_qa_owners`: **1** registro V2 `bound`, con `provider_create_claimed=true` y `external_subscription_id` no nulo. `public.f16_qa_v2_begin_checkout` garantiza **solo un intento V2 por owner** y rechaza nuevos `request_key`; por eso volver a pulsar checkout NO puede generar otra URL nueva. No se leyó ni se imprimió el identificador de suscriptor. Aún se desconoce estado actual del proveedor / cobro/activación; `bound` NO significa cobro.

**Corrección solo frontend rama PR #44 DRAFT:** `SandboxV2AccountPanel` comunica `checking/none/pending/bound/unavailable` a la pantalla padre después de `action:'list'` verificada. `SupporterAccountManagement` ofrece `SandboxCheckoutQaPanel` **únicamente cuando la respuesta de lista es verificada y `none`**. Con `pending/bound` muestra explicación y botón «Consultar mi suscripción Sandbox» que abre el panel de administración; errores/espera mantienen pago bloqueado. Evita consultas duplicadas de lista por el doble efecto React StrictMode en QA. Esto NO construye un enlace de aprobación original ni crea una suscripción nueva. La seguridad de cliente/servidor y el consentimiento siguen intactos. Sin desplegar Edge, sin llamar PayPal y sin mutaciones SQL/Live.

**Siguiente paso operativo read-only:** PO refresca app después de CI, abre «Consultar mi suscripción Sandbox» → «Actualizar prueba» → «Consultar PayPal Sandbox» y comparte **solo la etiqueta de estado** (p. ej., `APPROVAL_PENDING`, `ACTIVE`, `CANCELLED`), sin token/UID/link. Si `APPROVAL_PENDING`, diseñar y solicitar GO explícito para recuperación read-only del enlace PayPal de la **misma** suscripción, autenticado/owner-scoped, validado contra plan/custom_id/host y sin segundo POST. Si `ACTIVE`, proceder a conciliación de pago existente sin nueva autorización. No realizar checkout nuevo hasta resolver. CI/PG del último HEAD pendiente. **Marcador:** `F16_EXISTING_V2_BOUND_NO_SECOND_CHECKOUT_PROVIDER_STATUS_PENDING`.

---

# F16 — Revisión de botón PayPal Sandbox intermitente; UX segura sin duplicar (2026-10-17)

**Reporte PO:** pulsó «Continuar con PayPal», aparentemente no ocurrió nada; al recargar apareció tarjeta naranja «Esta oferta de prueba no está disponible» y desapareció después de otra recarga, reapareciendo el CTA. Captura real suministrada. **No está confirmado un pago nuevo ni que el clic llegara a PayPal. No iniciar otro checkout por inercia.**

**Evidencia disponible, sin atribución de cada solicitud a la cuenta del PO:** consulta read-only a Supabase `function_edge_logs` alrededor del incidente mostró respuestas a `f16-paypal-supporter-v2-qa` con HTTP **429**, **409** y **403**, junto con 200 posteriores. El 429 indica límite transitorio, 409 puede significar conflicto/ya vinculada y 403 denegación de acceso. La pantalla de cuenta QA mostró estado **suscripción Sandbox vinculada y pago todavía no verificado** (confiar en la verificación del backend, no en una etiqueta aislada). Endpoint `begin` opera one-shot, y `ALREADY_LINKED_NOT_PAYMENT_VERIFIED` nunca genera una segunda suscripción. No atribuir un cargo a una respuesta HTTP.

**Bug UX hallado:** `SandboxCheckoutQaPanel.tsx` transformaba TODOS los errores del `offer` en «oferta no disponible» sin reconsulta, y tragaba silenciosamente la causa de un `begin` fallido/ya vinculado, dejando un estado `pending` genérico hasta recarga. La ausencia de redirección no significa que se pueda repetir `begin` con una clave nueva.

**Fix solo en PR #44 DRAFT:** clasifica 429/rate limit, 403/QA no permitida, 409/ALREADY_LINKED y fallos desconocidos; explica que no debe repetirse el pago y remite a «Gestionar mi prueba de PayPal Sandbox»/consulta de estado. Permite reconsultar **solamente** la oferta publicada, manualmente y sin `begin`; cero reintentos automáticos de pago, `attempted.current` irreversible mientras el panel esté montado, y `approveUrl` solo para PayPal Sandbox validado. Sin cambios al Edge remoto ni a DB/payments/PayPal o Live. Test de regresión añadido en `f16SupporterProductExperience.test.mjs`.

**Gates:** CI/PG del último SHA, reabrir PAZO en QA local, comprobar mensaje de estado cuando ya haya cuenta vinculada y reconsulta de oferta sin disparar compra. Para confirmar dinero pagado/ciclo, usar proceso existente de lectura/verificación explícita en panel de prueba; no confundir `APPROVAL_PENDING`/vínculo con período pagado. Sin autorizar cobros Live, nueva solicitud Sandbox, Vercel ni merge.

---

# A01 — Fix animación de cola sin recorte de césped (2026-10-17)

**Reporte PO con captura ampliada:** al girar la cola del perrito de A01 aparecía un círculo/máscara que desplazaba césped y parte del fondo. **Causa verificada en `public/onboarding/welcome-approved-art.svg`:** capa `tail` duplicaba la *escena WebP completa* bajo `clipPath(#tailClip)`, y la capa `body` restaba `tailShape`, produciendo agujeros visibles al rotar. El propio fondo tenía animación `pazoRefBreathe`, causando desplazamiento de pasto.

**Corrección autorizada por PO y aplicada solo al PR #44 DRAFT:** regenerado el **mismo recurso** SVG autocontenido desde la ilustración oficial aprobada. La capa `sceneWithoutTail` es el paisaje estático con el área del rabo restaurada; `onlyTail` contiene únicamente el rabo RGBA sin pasto/hojas/fondo, extraído por segmentación de color + silueta y con unión al cuerpo suavizada; `scene` mantiene el original para cabeza. La capa `body` quedó totalmente inmóvil; `tail` solo mueve `onlyTail` con punto de pivote `121px 177px`, arco de ±1.5° y 3.8s. Se conservan movimiento suave de cabeza y `prefers-reduced-motion`. **No usar recortes SVG que reproduzcan la imagen completa en una máscara rotatoria** ni mover pasto. Se probaron offline fotogramas de ángulo -1.5°/0/+1.5° y no se observó el círculo. Prueba de regresión estática actualizada `scripts/closure-ui.test.mjs`: tres escenas autocontenidas, máscara antigua ausente, paisaje inmóvil, pivote y amplitud restringidos.

**Pendiente:** CI/PG del SHA más reciente y captura real del PO tras `git pull --ff-only` y reiniciar Vite / recarga dura; no confundir imagen offline con aceptación visual en navegador. No PayPal, Supabase, SQL, despliegues, pagos ni merge. **Marcador:** `A01_TAIL_ISOLATED_NO_MOVING_GRASS_QA_VISUAL_PENDING`.

---

# A01 — Revisión visual rechazada: corrección del perrito con arte de referencia (2026-10-17)

**Evidencia del PO:** dos capturas comparativas: izquierda PAZO real tras commit `578ef8e`; derecha diseño visual previamente aprobado. **NO ACEPTADO** por notable pérdida de fidelidad. El perrito SVG improvisado era de estilo plano, postura rígida, ojos/rostro distintos, cuerpo más geométrico y hojas/sombras inferiores simplificadas. Tamaños generales y copy estaban más cerca; error principal era haber *redibujado* el arte aprobado sin conservarlo.

**Corrección implementada solo en PR #44 DRAFT, rama `f13/section-titles-20261012`:** la ilustración usada ahora procede de la referencia aprobada enviada por el PO, recortada al área decorativa sin textos ni botones, optimizada como WebP y empaquetada en `public/onboarding/welcome-approved-art.svg` para usarla de forma autocontenida/offline. El SVG reutiliza la misma imagen en tres máscaras/grupos separados de cuerpo, cabeza y cola; CSS interno añade respiración sutil, ligera inclinación de cabeza y meneo de cola, con `prefers-reduced-motion`. El arte no contiene texto visible de producto ni enlaces: el título aprobado ES/EN, botones Comenzar/A02, Iniciar sesión, Demo, idioma, muro público y versión siguen siendo DOM normal. `WelcomeAnimatedCompanion.tsx` dejó de dibujar un perro diferente y ahora sirve el recurso aprobado. `OnboardingView.tsx` sitúa el recurso al fondo del hero, con escalado limitado en alturas reducidas, y adapta el verde de la tarjeta a los tonos de la referencia. Animaciones decorativas exteriores preservadas y desfasadas; **no afirmar que tiene parpadeo auténtico de ojos**, porque la ilustración fuente ya los representa sonrientes/cerrados.

**Pruebas:** `scripts/closure-ui.test.mjs` protege que la ilustración aprobada se use, que el SVG tenga capas y `prefers-reduced-motion`, que no contenga título/CTA rasterizados y que registro, login, Demo, idioma y muro sigan operativos. **CI, PostgreSQL Lab y QA visual deben verificarse sobre HEAD definitivo**. En particular, no declarar fidelidad aprobada hasta recibir nueva captura a 390–430 px y verificar ausencia de huecos en las máscaras al animarse, y que texto/CTA no se corten en 667 px de alto. No SQL, migraciones, PayPal/Supabase/Vercel, pago, Live ni merge por este cambio.

**Marcador:** `A01_APPROVED_ART_REUSED_VISUAL_REVIEW_PENDING`.

---

# PAZO A01 — Bienvenida refinada ilustrada con motion aprobado (2026-10-17)

**Autorización del PO:** pantalla A01 basada en referencia verde salvia con ilustración de perrito, paleta PAZO verde/crema/lima, **texto sin cambios de la propuesta refinada** «Hecho con amor para las mascotas» y «Únete y descubre la mejor app social para mascotas». Mantener Comenzar, Ya tengo una cuenta, Demo, idioma y enlace público «Conoce a los Amigos de PAZO». PO autorizó expresamente animación independiente del perro (respiración, cola, parpadeo, leve gesto/cabeza) y de adornos (corazones, líneas, hojas), baja amplitud, elegante y reducida si la configuración del usuario lo solicita.

**Cambios branch PR #44 DRAFT:** solo A01 en `src/components/views/OnboardingView.tsx`, sin tocar estados ni handlers A02–A04, auth, demo o muro; nuevo `src/features/onboarding/components/WelcomeAnimatedCompanion.tsx`, vector original por capas con animación real independiente (no captura estática ni placeholder de imagen externa); `src/index.css` añade `pazoWelcomeDogEnter`, `pazoWelcomeBreathe`, `pazoWelcomeTail`, `pazoWelcomeHeadTilt`, `pazoWelcomeEyes/WelcomeBlink`, `pazoWelcomeHeart`, `pazoWelcomeLine`, etc. `prefers-reduced-motion` cancela todo el movimiento de A01 y deja los ojos abiertos y el perrito visible. Header idioma y logo; hero verde centrado; tarjeta ilustrada; link Amigos no comercial a muro; botones existentes persistentes y centro desplazable en móviles cortos. Footer conserva versión de compilación discretamente.

**Gate pendiente:** CI/PG del commit final, captura real usuario con altura 667/860 y 360–430px, test manual ES/EN, retorno de muro, navegación hacia A02, login y Demo. La ilustración en SVG está construida en código como interpretación del perrito aprobado: **requiere comparación visual del PO**, no afirmar pixel-perfect por CI. No pagos, migraciones, nuevos datos/eventos, servicios externos o Live; PR DRAFT sin merge.

---

# F16 — Muro de agradecimiento Opción D aprobado por PO, implementado en rama (2026-10-17)

**GO del PO:** «Opción D» (timeline / vista cronológica), con objetos ilustrados que reutilicen **la misma animación suave de personalización de perfil**; implementar **pantalla vacía y pantalla con mascotas** como en las dos imágenes referenciales aprobadas. Sin badges, nombres, meses ni fotos simulados en vistas públicas.

**Código, PR #44 DRAFT, rama `f13/section-titles-20261012`:** Nuevo `GratitudeWallScene.tsx` es UI compartida con cabecera «Gracias, Amigos de PAZO», explicación clara de autorización + cobertura, filtros Todos/Recientes/Más tiempo apoyando, lista cronológica visual para mascotas reales, estado vacío ilustrado, carga/error/reintento, ES/EN, foco y Escape. SVG original `public/supporter/gratitude-empty-pets.svg` muestra perro y gato **solo como ilustración decorativa**, no miembros inventados. Corazones/huellas/estrellas flotan con `pazo-supporter-float` y el CSS canónico `pazoSupporterGentleFloat`, desactivado por `prefers-reduced-motion`; no animar nombres, retratos, filtros ni tarjetas.

**Integridad:** `GratitudeWallLive.tsx` conserva `supabase.rpc('pazo_supporter_public_wall',{p_limit:48})` + validación de UUID/nombre/foto HTTPS/hito, solo muestra filas cuyo backend confirma consentimiento por mascota no revocado y cobertura pagada vigente. `GratitudeWallPreview.tsx` bajo release flag OFF muestra **el mismo diseño vacío** sin RPC ni cuenta, para bienvenida A01 pública. La función SQL existente ordena por `wall_consents.granted_at ASC`: filtro Recientes invierte ese orden; Más tiempo apoyando usa **hitos verificados** 0/3/6/12 y no inventa fechas o tiempo exacto de apoyo. El backend actual no devuelve mensajes por mascota ni raza, por lo que cada tarjeta usa una frase de agradecimiento genérica, sin atribuir texto inventado al dueño.

**QA:** `scripts/closure-ui.test.mjs` actualizado para estado vacío (sin cuadrícula fantasma) y pruebas de orden real, filtros ES/EN, error distinto de cero filas, decoraciones / accesibilidad reducida, SQL contractual. CI y PostgreSQL Lab del HEAD deben verificarse después. **Aún falta captura visual/aceptación PO** en localhost para 360–430 px y estado de lista con datos reales autorizados (no generar test records automáticamente). No migraciones SQL, ninguna modificación en consentimientos reales, Supabase hosted, Vercel o PayPal, ni GO Live, ni merge. **Marcador:** `F16_GRATITUDE_WALL_OPTION_D_CODE_BRANCH_QA_VISUAL_PENDING`.

---

# F16 — REVISIÓN VISUAL PO: Opción B no fiel; corrección de proporciones en rama (2026-10-17)

**Evidencia:** usuario compartió dos capturas lado a lado de la maqueta elegida B frente al PAZO real. La implementación anterior no cumplía: cabecera extra «Entorno de prueba / Volver a PAZO», titular dividido en cuatro líneas por insignia en el mismo flex, hero excesivamente alto, filas sobredimensionadas y consentimiento/CTA PayPal fuera de la primera pantalla. **PO NO ACEPTÓ** ese resultado. Priorizar fidelidad visual al diseño aprobado, no «parecido razonable».

**Corrección acotada, rama PR #44 DRAFT:** `SupporterOfferB.tsx` deja de reservar una columna al arte; fija título de 3 líneas con ancho controlado y coloca `amigo-pazo-inicio.png` decorativamente en posición absoluta en hero compacto. Filas cuatro beneficios de altura mínima ~49px, icono 36px y separación 6px; sigue copy ES/EN, precio US$2.99. `SupporterAccountManagement.tsx` elimina subtítulo QA invasivo en cabecera y botón ancho, crea flecha de regreso y título centrado, reduce espaciado exterior, elimina botón secundario masivo. `SandboxCheckoutQaPanel.tsx` conserva consulta de oferta publicada V2+digest, `offer.exactCopy` en disclosure expandible, checkbox inicialmente desmarcado, bloqueo de compra one-shot, validación de URL PayPal Sandbox y mensajes de fallo; presenta copy de consentimiento conciso, botón amarillo y nota de dinero ficticio compactos después de beneficios. **No modificar contratos/PayPal, no activar Live, no usar cobros.** Pruebas específicas apuntan a proporciones y safety, pero **no sustituyen captura visual real**.

**Siguiente gate:** CI/PG del HEAD más reciente; después operador actualiza localhost, compara screenshot 360–390px del mismo flujo incluyendo el CTA. Si la UX aún difiere, no declarar aprobado. El mockup muestra status bar iOS simulado; no insertar status bar falso en PWA. Para 320px o alturas cortas se permite scroll sin ocultar CTA permanentemente. Los controles técnicos QA continúan colapsados y no forman parte de experiencia Live. Aviso automático OFF. P42/Live OFF, PR DRAFT sin merge.

---

# F16 — Oferta Amigo de PAZO, diseño Opción B aprobado e implementado en rama (2026-10-17)

**Autorización expresa del Product Owner:** implementar la Opción B elegida de cuatro maquetas: titular «Pequeñas acciones, grandes historias», diseño minimalista cálido verde/crema, insignia oficial aprobada como ilustración *decorativa* (no estado concedido), precio US$2.99/mes, cuatro filas horizontales: insignia perfil/Feed, cinco fondos, muro por autorización individual y medallas tras 3/6/12 meses pagados, casilla desmarcada y botón amarillo «Continuar con PayPal», «Ahora no».

**Código en PR #44 DRAFT:** nuevo `SupporterOfferB.tsx` (composición e iconografía no interactiva, ES/EN) reemplaza la pantalla comercial antigua en `SupporterAccountManagement.tsx`. El mismo `SandboxCheckoutQaPanel.tsx` recibe `inline` para presentar el consentimiento y CTA dentro del diseño sin un botón intermedio; **NO hay segundo flujo de cobro**. Mantiene oferta publicada V2 versionada, digest exacto, casilla inicialmente FALSE, invocación `begin` autenticada one-shot y URL PayPal Sandbox validada. La oferta del usuario sin membresía usa `SupporterScreenPortal`; membresía verificada sigue a `SupporterBenefitsHome`. El PayPal público/Live conserva botón **deshabilitado**, sin planificación de checkout público en este cambio. La gestión de pruebas sigue plegada. No se modificaron PayPal, Supabase/SQL, Edge, Vercel ni datos; no hubo pagos.

**Calidad pendiente:** pruebas CI/PG para HEAD definitivo, revisión real en marco móvil 360–430 px y desktop, screenshot/aceptación visual del Product Owner; confirmación real Sandbox V2/beneficios aún no completada. La elección del diseño B autoriza implementación, NO marca revisión en navegador ni GO Live. **Marcador** `F16_OPTION_B_IMPLEMENTED_BRANCH_QA_VISUAL_REQUIRED_LIVE_OFF`.

---

# F16 — Captura real del PO: gate visual NO aprobado; corrección de layout en PR #44 (2026-10-17)

El usuario aportó captura móvil de la pantalla real «Amigo de PAZO» sin membresía. **Hallazgos visuales:** sección superior parcialmente fuera de vista, tarjetas 2x2 demasiado estrechas que cortaban el texto del cuarto beneficio, navegación inferior y botón flotante superpuestos con la oferta, demasiado texto técnico visible. Captura = evidencia de problema; NO evidencia de aceptación visual.

**Causa auditada:** `SupporterAccountManagement` estaba anidado dentro de `PetView` y del `main` con `overflow-y-auto` bajo HeaderBar y BottomNav; `grid gap-2 sm:grid-cols-2` cambiaba a dos columnas según el viewport desktop aunque PAZO ocupa un marco `sm:max-w-[430px]`. No arreglar con fuentes más pequeñas.

**Correcciones solo de código/QA en rama:** `App.tsx` identifica el contenedor `data-pazo-app-shell`; `SupporterScreenPortal.tsx` monta ambos destinos (invitación y beneficios pagados) sobre ese contenedor, fuera del scroll de Mi mascota, manteniendo el ancho del dispositivo y ocultando navegación subyacente; acceso directo `#/account/supporter` sin shell sigue usando document.body. Tarjetas de beneficios de la oferta a **una columna** con texto `min-w-0`/`break-words`, padding menor y confirmación de pagos con copy no técnico. Se conserva la prueba QA y gestión de suscripciones, sin modificar contratos/beneficios o cobros. Nueva prueba de regresión estática para panel estrecho, portal y navegación. **CI del último HEAD, captura posterior del PO y prueba de miembro con cobertura pendiente**. No se ha controlado el navegador del usuario ni desplegado vista previa manual.

Sin Supabase, PayPal Live/Sandbox, Vercel, SQL, compras ni merge por este cambio. Gate siguiente: refresh en equipo local `git pull --ff-only`, volver a abrir desde Mi mascota y enviar nueva captura móvil con la tarjeta y botones visibles; contrastar miembro pagado solamente tras período verificado en Sandbox. **Marcador:** `F16_MOBILE_LAYOUT_CAPTURE_FAIL_PORTAL_FIX_PENDING_REVIEW`.

---

# F16 — Gate de QA visual en PAZO local: preview disponible, aceptación pendiente (2026-10-17)

GO del PO para continuar QA. GitHub CI y PostgreSQL Lab GREEN para el conjunto UI inicial y QA explícito (commit `811c9fdf`, [CI #39062155504](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39062155504), [PG #39062155514](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39062155514)). El último commit de prueba de cuenta completa requiere CI independiente. **No declarar QA visual en navegador aprobado.**

Hallazgo en pestaña PAZO localhost del usuario, inspeccionada solo en modo lectura: todavía cargaba la versión antigua con tres accesos separados «Amigo de PAZO» / «Personalizar perfil» / «Participar en el muro». El equipo local debe detener servidor Vite y hacer `git switch f13/section-titles-20261012`, `git pull --ff-only`, reiniciar `powershell -ExecutionPolicy Bypass -File .\\scripts\\f16-run-real-sandbox-qa.ps1`. Verificar nuevo botón único bajo Mi mascota y oferta sin membre­sía. No se controló ni modificó remotamente el PC; no hay screenshot/aceptación visual actualizados.

Cambio dirigido para evitar upsell incorrecto: `PetView` y `SupporterAccountManagement` consumen `useSupporterMembershipStatus()` a nivel **cuenta**, comprobando mascotas del mismo owner y RPC servidor; cambiar mascota no debe volver a ofrecer pago si existe cobertura verificada. No se infiere cobertura por redirect, PayPal ACTIVE o estado local. La gestión QA V2 queda bajo sección opcional/colapsable en pantalla de oferta para no mezclar marketing con diagnósticos. Sin membresía, oferta y botón «Ahora no»; con prueba pagada real verificada, centro de beneficios.

Se habilitó exclusivamente una vista previa manual/visual del aviso compacto en **QA local** (no automático ni producción): arrancar script localhost y abrir `http://localhost:5173/?supporter_preview=1#`, entrar a Mi mascota de una cuenta sin cobertura verificada. El aviso se superpone discretamente y permite «Conocer Amigo de PAZO» o «Ahora no», sin crear eventos, sin retención de rechazo y sin cobros. Está protegido por `import.meta.env.DEV`, flag QA, query explícita y estado no-miembro; fuera de esta URL queda OFF. **NO significa elegibilidad automática activa:** 7/3/5/2/30 permanece por conectar a fuente de actividad minimizada + cooldown persistente revisado por privacidad.

Sin nuevas compras Sandbox, sin cambios a Supabase/PayPal/Vercel/Live, sin merge. Próximo gate: usuario actualiza localhost y facilita captura o revisión visual; luego Sandbox V2 E2E con consentimiento separado, bajo nueva autorización antes de cobro.

---

# F16 — UX de Amigo de PAZO aprobada (2026-10-17)

El PO aprobó un único botón bajo Mi mascota: sin membresía verificada abre la invitación (US$2.99/mes voluntario); con cobertura pagada verificada usa estilo decorado y abre Mis beneficios. El área del miembro reúne la insignia 0/3/6/12, los cinco fondos, permisos del muro por mascota y gestión/cancelación. Compra de diseños adicionales de insignias: idea futura, no implementada.

Implementado en PR #44 DRAFT: hook de estado mediante mascotas propias y RPC de beneficios, botón condicional en PetView, SupporterBenefitsHome y rutas condicionales en SupporterAccountManagement. Aviso automático compacto implementado solo como presentación y SIN activar; requiere datos elegibles verificados y rechazo de 30 días persistido con revisión de privacidad. No se ejecutaron compras, migraciones ni cambios PayPal Live.

Pendiente: CI/PG17 del HEAD nuevo, QA visual real, vinculación de elegibilidad y E2E Sandbox V2. No fusionar el PR ni activar Live hasta gates.

---

# F16 — EXPERIENCIA DE PRODUCTO «AMIGO DE PAZO» IMPLEMENTADA EN PR #44; QA VISUAL PENDIENTE (2026-10-17)

**GO PO «de acuerdo, go» después de auditoría UX:** convertir el checkout administrativo en recorrido natural de apoyo voluntario, mantener precio US$2.99/mes, cuatro recompensas, PAZO gratuito, cierre sin penalizaciones, y separación explícita de pruebas/Live. Se adoptó como **política de invitación futura**: ≥7 días de cuenta, ≥3 días activos/14, ≥5 acciones significativas en ≥2 superficies y 30 días de silencio tras «Ahora no», sin onboarding, primera sesión, rescate o interacción ocupada. **No inferir actividad sin fuente comprobada.**

**Implementación GitHub en la misma rama:** `SupporterAccountManagement.tsx` muestra oferta simple ES/EN, cuatro beneficios y «Ahora no»; mantiene la compra pública DESHABILITADA y el checkout únicamente bajo flag QA existente. El panel QA V2 funciona mediante los mismos endpoints autenticados; comprobación/cancelación quedan en «Mi membresía», separados de la oferta. `SandboxCheckoutQaPanel.tsx` conserva términos exactos publicados accesibles en <details>, casilla obligatoria inicialmente sin marcar, `begin` idempotente y redirección validada; se retiró panel V2 anidado. `SandboxV2AccountPanel.tsx` coloca muestras de insignias bajo detalle voluntario y no informa «pago aún no verificado» tras `paidThrough` confirmado. Entrada de `PetView.tsx` explica apoyo voluntario. `supporterPitchEligibility.mjs` define **evaluador puro fail-closed**, sin rastreo ni almacenamiento. Pruebas de regresión `f16SupporterProductExperience.test.mjs` para copy, flags, requisitos y privilegios.

**NO completado / gates:** no existe todavía el origen aprobado y verificado de los contadores 14d, acciones y rechazos; por privacidad **NO se integró disparador de invitación ni recolección nueva de actividad**, ni cooldown persistente. No declarar pitch automático en funcionamiento. Para ello: diseño de señales mínimas y retención, revisión de gobernanza e inventario, pruebas que verifiquen 30 días sin mostrar la invitación y exclusión de rescates. La UI requiere prueba en dispositivo/navegador con evidencia 360-390px y escritorio, estados pendiente/éxito/error/renovación/cancelación, retroalimentación y aprobación visual PO. **Código confirmado en commit `286390d167b6d7c1a7a993bbdc1dc7354dab244f`: [CI SUCCESS #39059256106](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39059256106) y [PostgreSQL Lab SUCCESS #39059256043](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39059256043)**. Incluye typecheck/build, test de flujo corregido y puerta V2. No se declara E2E Sandbox ni aceptación visual. Controles de backend permanecen sin cambios; no se solicitó PayPal Sandbox de nuevo ni se activó Live, migraciones o recursos pagados. PR #44 DRAFT, no merge.

**Siguiente gate:** verificar CI para commits de UI/test, realizar capturas QA locales, presentar cambios visuales PO, luego cerrar señales de elegibilidad con minimización antes de habilitar invitaciones. **No repetir P42/P43 ni crear otra compra Sandbox antes del gate UX.**

**Marcador:** `F16_NATURAL_SUPPORT_UI_BRANCH_ONLY_QA_AND_ELIGIBILITY_TRIGGER_PENDING`.

---

# F16 — SANDBOX V2 QA LOCALHOST CORREGIDO Y DESPLEGADO (2026-10-17)

**Retomado tras petición PO «vuelve a trabajar en donde te quedaste».** No crear cuenta nueva ni alterar la anterior. CI del commit previo `be5d5e89914436e714fd88952ba0fef513fc6168`: [CI SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39054377142) y [PG Lab SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39054377186).

**Estado real Supabase verificado:** allowlist QA `enabled` y no vencida para 1 cuenta existente; 2 ofertas V2 publicadas ES/EN; 0 intentos de compra V2, 0 períodos de pago, 0 holds. No aprobación PayPal efectuada aún. PayPal Live OFF, P06 v1 histórico intacto.

**Bug bloqueante localizado y corregido:** el Edge dedicado permitía `localhost:5173`, pero los constructores anidados `p14SandboxSupporterAccountHandler` y `p06SandboxCancellationHandler` rechazaban todos los orígenes HTTP y lanzaban 503 en `compose()`. Corregido con parámetro `allowLoopbackQa=false` por defecto. Solo `f16-paypal-supporter-v2-qa/index.ts` lo activa mediante `QA_LOCAL_ORIGINS.has(origin)`, con dos orígenes exactos `http://localhost:5173` y `http://127.0.0.1:5173`; todo otro HTTP rechazado, los endpoints legacy conservan HTTPS-only. Tests `src/features/supporter/testing/f16SandboxExactLocalOrigin.test.mjs` verificaron default deny, local opt-in y rechazo de port alternativo. Commit `2fae8e693f3531712bdd8bdffd7907490b672b17`: [CI SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39055648194) y [PG Lab SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39055648208). **Edge redeployed** `f16-paypal-supporter-v2-qa` **ACTIVE v3**, JWT obligatorio. No redeploy del viejo Edge, no Live.

**Siguiente paso humano REAL, no simulable por el asistente:** en Windows, dentro del clon PAZO de rama `f13/section-titles-20261012`, hacer `git pull --ff-only` y `powershell -ExecutionPolicy Bypass -File .\\scripts\\f16-run-real-sandbox-qa.ps1` (usa config pública y flags QA solo para Vite), abrir `http://localhost:5173/#/account/supporter` e iniciar sesión con la cuenta de pruebas existente. `Abrir prueba Sandbox`, revisar términos cuatro beneficios, aceptar checkbox y presionar `Probar suscripción en PayPal Sandbox` **UNA VEZ**. PayPal redirige temporalmente al viejo HTTPS Preview porque su URL de retorno debe ser HTTPS; después el comprador regresa manualmente a localhost, pulsa `Actualizar prueba` y `Verificar pago real Sandbox`. NO repetir el botón de compra tras respuesta desconocida, pues PayPal POST está one-shot. Comprobar en PAZO insignias originales, 5 fondos, muro consentido/desconsentido y futura cancelación de solo la V2. **Vercel no admite preview nuevo actualmente: cuota API diaria HTTP 402; NO pagar ni cambiar plan para QA.**

**Limitación explícita:** no se afirma E2E final hasta que el usuario apruebe con cuenta buyer PayPal Sandbox y el GET merchant acredite USD 2.99. `f16_qa_v2_record_verified_first_cycle` y QA UI están preparados; el verificador es intencionalmente estricto y ante historial incompleto/sale/fechas faltantes rechaza sin conceder beneficios. Investigar logs y proveedor si falla antes de reintentar checkout.

**Marcador:** `F16_SANDBOX_V2_EDGE_V3_LOCALHOST_CI_PG_PASS_AWAIT_HUMAN_APPROVAL`.

---

# F16 — PAYPAL SANDBOX V2 LOCAL QA READY FOR HUMAN BUYER, NO LIVE (2026-10-17)

**Product Owner directive:** work without stopping until a real, executable Sandbox test of the **four approved benefits** is possible. Reuse the owner's existing test Auth + pet; no new account; no prototypes; not PayPal Live.

**Actual server state verified:**
- New dedicated Supabase Edge function `f16-paypal-supporter-v2-qa` **ACTIVE v2, JWT required**. Previous `f16-paypal-supporter` P06 remains statically OFF, and public Live remains OFF. V2 accepts ONLY an exact stable QA Vercel branch-preview origin, `http://localhost:5173`, or `http://127.0.0.1:5173`. Every new checkout also requires authenticated Auth user + expiring private allowlist check in `public.f16_qa_v2_owner_can_checkout`, and server-owned consent+subscription IDs.
- New sandbox-paid-period verifier `pazoSandboxV2MerchantVerify.mjs`: re-GET PayPal **SANDBOX** subscription with exact `custom_id` (new V2 intent) and plan; require a complete single-page subscription transaction list, exactly one `COMPLETED` USD 2.99 payment; independently GET the sale (completed, amount) and read the verified first paid service dates `subscription.start_time` + `billing_info.next_billing_time`. No browser-supplied sale/amount/interval, no reward on approve/redirect/ACTIVE. A refunded or partially refunded sale is held. **This is a first-cycle QA verifier, NOT Live-wide reconciler.**
- Owner-only `verify_payment` action is wired from the REAL `SandboxV2AccountPanel.tsx` to merchant GET and private `pazoSandboxV2ProofStore.mjs`; DB writer and hold funcs installed as Supabase migration **`20261017170437_f16_qa_v2_merchant_verified_first_cycle`** and versioned in GitHub; buyer eligibility gate installed as **`20261017171146_f16_qa_v2_checkout_owner_service_gate`**, GitHub migration included. Both RPCs service-only; anon/auth forbidden, QA data private.
- Offer `pazo-supporter-sandbox.benefits-v2` **ES/EN PUBLISHED on hosted Supabase** in migration **`20261017172411_f16_sandbox_qa_v2_bilingual_offer_publication`**; historical v1 ES/EN published rows and P06 old checkout/intent unchanged. New Supabase Auth owner selected by PO privately (DO NOT copy email/UID to GitHub) now has `status='enabled'` for remaining expiring QA allowlist. Postflight: **1 authorized owner**, correct new offer read in ES/EN, **0 new checkout intents, 0 QA periods, 0 holds, 1 old checkout, 0 financial entries**.
- `f16-paypal-supporter-v2-qa` redirects PayPal Sandbox approval/cancel to stable known HTTPS Vercel branch alias; for **LOCAL QA** browser user must **manually return** to `http://localhost:5173/#/account/supporter` afterward to verify subscription and period. Local browser origin is explicitly allowed by the server; foreign origins and accounts denied.
- UI on QA branch: `SandboxCheckoutQaPanel` and `SandboxV2AccountPanel` call new Edge, not old P06; account screen hides old V1 subscription cards in QA mode. Real badge/theme/wall components use server RPCs, not browser fake state. Original four PNG medals are inspectable as **visual samples only** (no paid claim); actual first badge and save/wall require verified paid period. Launch `scripts/f16-run-real-sandbox-qa.ps1` after `git pull --ff-only` and `npm ci` if dependencies missing; PowerShell script sets **PUBLIC** Supabase config + two QA-only UI flags and runs Vite on port 5173. No merchant secret stored locally.
- Vercel: added the two QA UI flags ONLY to branch-scoped Preview env on `pazo-app-t83r`. HOWEVER `mcp__Vercel__create_deployment` returned **HTTP 402, quota `api-deployments-free-per-day`, wait 24h**; a scoped attempt also got 403. **Do not upgrade plan or promise new Preview**. Existing Preview is older than QA code. Local Vite is the immediate workaround for actual Sandbox testing.
- PayPal Live remains OFF. No PayPal subscription creation was requested by the assistant; the human buyer must click in PAZO and approve PayPal Sandbox. CI and PG17 must be checked for the last QA commits before marking code PASS. Last pre-Preview release commit `a9851204b26b611d2895d3219ef8565f66559920` CI SUCCESS #39052535101, PG17 SUCCESS #39052535216; more recent checks on branch pending.

**Next human-in-the-loop step (now actionable):** use existing Windows PAZO branch checkout, run `git pull --ff-only` then `powershell -ExecutionPolicy Bypass -File .\\scripts\\f16-run-real-sandbox-qa.ps1`, log in with the account PO already selected, open `http://localhost:5173/#/account/supporter`, click **Abrir prueba Sandbox**, review V2 terms and tick explicit consent, press **Probar suscripción en PayPal Sandbox** once. Approve with PayPal Sandbox buyer, return manually to localhost (PayPal redirect is the HTTPS branch alias), press **Actualizar prueba**, then **Verificar pago real Sandbox**. Inspect original badge in profile/Feed, save five backgrounds, consent/withdraw wall, cancel NEW V2 (not the prior V1) and check period after cancellation. If the server returns 503, do not repeat purchase or fabricate rewards: review Edge logs/merchant config and continue within this gate. This requires human browser authorization and is NOT yet completed.

**After QA**: close checkout gate on dedicated QA Edge but keep owner cancellation reachable; disable owner allowlist and clean QA data at MVP release, preserving financial audit evidence as legally appropriate. No permanent paid benefits from Sandbox data.

**Marker:** `F16_SANDBOX_V2_QA_ENDPOINT_ACTIVE_OFFER_PUBLISHED_ONE_OWNER_ENABLED_LOCAL_UI_READY_PAYMENT_APPROVAL_PENDING`.

---

# F16 — CHECKOUT SANDBOX Y CANCELACIÓN V2 CON COMPuERTAS INDEPENDIENTES (2026-10-17)

**PO «ok go» activo:** avanzar exclusivamente integración **Sandbox** con los cuatro beneficios originales, sobre la cuenta PAZO de prueba existente y su mascota. **No PayPal Live, no nuevas cuentas, no maquetas.**

**Corrección de seguridad de esta tanda:** el nuevo `f16-paypal-supporter/index.ts` ahora usa DOS gates estáticos OFF independientes: `QA_CHECKOUT_RELEASE_APPROVED=false` y `QA_V2_MANAGEMENT_RELEASE_APPROVED=false`. Cuando se autorice el experimento se pueden activar ambos para una única compra Sandbox, y **después cerrar compras sin impedir consultar/cancelar la suscripción V2 ya existente**. La administración valida getUser, origen exacto HTTPS, `pazoSandboxV2AccountStore` V2-only, PayPal GET `subscription.id + plan_id + custom_id` y confirmación posterior a cancelación. La V1 histórica jamás puede encontrarse ni cancelarse mediante V2. La nueva UI en `SandboxV2AccountPanel.tsx` está bajo el panel real PAZO y solo aparece en modo DEV/QA, con confirmación explícita y aceptación V2 descargable. Ninguno de los dos gates se habilitó ni se desplegó Edge.

**Estado Supabase hospedado desde migración `20261017165014_f16_sandbox_qa_v2_owner_account_read_only`:** lectura V2 únicamente service_role, deny anon/auth; 0 intentos V2, 1 P06 histórico y dos intenciones totales, 0 períodos QA, 0 compradores QA enabled, V2 oferta ES/EN todavía sin publicar, cero grants financieros y ningún nuevo pago. No repetir esas migraciones.

**Pruebas a comprobar antes de dar GO:** el CI y PG17 tras el último cambio de tests `406c453a806c443b5856d3b9fd8060476d59070d`. Las pruebas de release guard añaden la segunda compuerta, comprobando que ambas inician OFF. `f16SandboxV2ManagementIndependentGate.test.mjs` exige que una compra cerrada no quite cancelación al propietario.

**Siguiente única dependencia real para prueba E2E:** conectar una venta **`PAYMENT.SALE.COMPLETED` verificada en PayPal Sandbox** a un período QA privado de V2 asociado al propietario, jamás por ACTIVE/redirect. Cubrir holds y fechas contractuales. Luego activar solo owner QA, nueva oferta v2 ES/EN y el Edge Sandbox de ensayo aislado para ejecutar una compra con el PO y ver los cuatro beneficios en PAZO. No ampliar P42/Live.

**Marcador:** `F16_SANDBOX_V2_OWNER_CANCEL_INDEPENDENT_CHECKOUT_OFF_PERIOD_PROOF_PENDING`.

---

# F16 — GESTIÓN DE LA SEGUNDA SUSCRIPCIÓN SANDBOX V2: CI/PG PASS, NO PAYMENT (2026-10-17)

**Prioridad PO:** ejecutar UNA compra **PayPal Sandbox** con los cuatro beneficios reales, en la cuenta PAZO de prueba ya existente, y revisar UI/perfil/Feed/muro/cancelación en la app. **NO** crear cuenta nueva, no Live/P42, no repetir P06 histórico ni inventar premios. PR #44 DRAFT, rama `f13/section-titles-20261012`.

**Entregado y comprobado en este turno:**
1. Se corrigió el error de sintaxis del `p06CheckoutConsentStore.mjs` que bloqueaba la ruta V2: commit `c296a1df03f7b4053532e908c01097f70a1ff5dc`, CI y PG17 **SUCCESS**.
2. `supabase/drafts/f16_qa_v2_owner_scoped_account_READ_ONLY.sql`, **migración instalada en Supabase** `20261017165014_f16_sandbox_qa_v2_owner_account_read_only` (rehearsal con ROLLBACK PASS antes). Versionada en `supabase/migrations/20261017165014_f16_sandbox_qa_v2_owner_account_read_only.sql`. RPC `public.f16_qa_v2_read_owner_account(uuid,text)` solo service_role, liga owner+intent a `f16_sandbox_qa_v2_checkout_attempts` y copy aceptado V2, nunca al checkout P06 v1. `NULL` intent lee únicamente la propia segunda cuenta (índice UNIQUE owner); con ID exige coincidencia exacta. No devuelve paidThrough ni concede beneficios, sí constancia exacta de consentimiento. Lectura continúa accesible al propietario luego de que la autorización QA expire, para permitir futura cancelación.
3. `pazoSandboxV2AccountStore.mjs`: verifica respuesta SQL, propietario autenticado, V2, plan Sandbox, estado y aceptación; métodos `readForOwner`, `load` solo owner+intent y `readAcknowledgementForOwner`. `p06SandboxCancellationHandler.mjs` ahora pasa el owner autenticado también a `privateIntentStore.load`, sin romper proveedor original.
4. `f16-paypal-supporter/index.ts` compone `createPazoSandboxSupporterAccountHandler` con **store V2 únicamente**, habilita rutas de `list/status/cancel/acknowledgement` a nivel de código. `p06SandboxCancellationProvider.mjs` realizará PayPal GET por ID + plan + custom_id y confirmación posterior antes de reportar cancelación. **El latch `QA_CHECKOUT_RELEASE_APPROVED=false` sigue cerrado**, ni cancelación ni checkout desplegados. `SandboxV2AccountPanel.tsx` está integrado dentro del panel de suscripción **solo Vite DEV + QA flag**, con listado/estado/cancelación explícita/descarga de constancia, sin maquetas.
5. Test `src/features/supporter/testing/f16QaV2OwnerScopedAccount.test.mjs` prueba cancelación V2, intento P06 antiguo no cancelable, owner ajeno, recibo ligado a V2 y confirmación necesaria. `supabase/tests/supporter/f16-qa-v2-private-account-read-pg17.sql` prueba permisos, v1 aislado, owner ajeno, null list, cambio pending->bound y lectura después de QA disabled. Workflow PG17 ampliado. Se corrigió la regex UUID y un error mecánico en SQL detectados por CI (nunca desplegados).
6. **Evidencia commit `92d2ac0b102f1a274c64ffbf0e08074f4d14ba2b`: [CI #39051184016](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39051184016) SUCCESS y [PostgreSQL Lab #39051184063](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39051184063) SUCCESS.** No QA browser end-to-end, no pago. Postflight Supabase: nueva RPC sólo servicio, anon/auth denegados, V2 intentos 0, P06 intentos 1, intents históricos 2, QA periods 0, compradores QA habilitados 0, V2 oferta sin publicar ES/EN 2, consulta de owner desconocido devuelve null.

**Gates RESTANTES PARA PRIMER CLICK SANDBOX, SIN LIVE:** Primero conectar y probar la acreditación **solo en Sandbox** de `PAYMENT.SALE.COMPLETED` vinculado al **nuevo** intent+owner+aceptación V2 con comprobación merchant Sale/Subscription/Transactions y fechas reales de servicio; reversals bloquean períodos; nunca por approval/redirect. También garantizar que consultar/cancelar V2 siga accesible **aunque se cierre el gate para nuevas compras** (hoy la compuerta top-level también bloquea administración, no se debe desplegar así). Después probar contra local QA, publicar solamente v2 para la cuenta autorizada, habilitar allowlist privada por tiempo breve y el checkout QA (requiere revisión específica), desplegar Edge Sandbox y hacer UNA compra con el PO; verificar pantalla y cuatro beneficios, cancelación, opt-out y fallos. No publicar preview público ni plan PayPal Live.

**Estados de seguridad actuales:** P06 anterior intacto, sin segunda compra, credenciales no publicadas, QA owner staging disabled, periodos QA 0, P42/Live OFF, PR DRAFT.

**Marcador:** `F16_V2_OWNER_ACCOUNT_READ_INSTALLED_CI_PG_GREEN_SANDBOX_PAYMENT_PROOF_PENDING`.

---

# F16 — EXISTING TEST OWNER V2 EDGE ADAPTER WIRED, ALL MONEY STILL OFF (2026-10-17)

**Latest code after same-owner QA schema deployed:** `p06CheckoutConsentStore.mjs` now accepts opt-in `qaV2:true`, routes `beginForOwner` to `f16_qa_v2_begin_checkout` and provider one-time claim to `f16_qa_v2_claim_provider_create`, refuses a V1 terms version. `f16-paypal-supporter/index.ts` passes `qaV2:true`. Its checkout release `QA_CHECKOUT_RELEASE_APPROVED=false` remains OFF. The old account-management cancel/status implementation can target the previously bound P06 subscription, **so V2 status/cancel are deliberately blocked 503** until a new bound-intent-scoped V2 management handler is complete. Recovery/acknowledgement helpers in V2 mode also fail closed pending new V2-specific reads. New contract test `src/features/supporter/testing/f16SameOwnerQaV2CheckoutWiring.test.mjs`, commit `28617617dee41e01118e433609f1f77ff98ef270`, verify GitHub CI/PG checks after this handoff.

**What remains:** create V2-scoped recovery, receipt, status and provider cancellation; verify webhook and merchant payment with own V2 intent; register QA-only paid period with correct full service window/refunds; authorize temporarily one already staged owner, publish V2 offer and deploy ONLY Sandbox QA Edge + local preview with right origin; let PO approve Sandbox buyer and inspect all four real benefits. User does NOT need to create account or pet or provide secret. No new payment/benefits attempted.

---

# F16 SANDBOX — SAME EXISTING QA USER SELECTED, NEW CHECKOUT V2 PRIVATE HOSTED (2026-10-17)

**PO explicit choice:** use the already existing test PAZO account+pet, not create a new Auth. Never place actual email, internal Auth UUID, passwords or test credentials in this public GitHub file. Preflight private DB: exactly 1 Auth account matched, 1 owned pet, 1 P06 historical bound checkout and 1 bound subscription intent, 0 credited payments; existing P06 `p06_one_checkout_per_owner` prevents a new attempt through the old API. P06 v1 accepted terms without perks; must not change or credit them.

**Host actions completed with prior Sandbox-only PO authorization and choice of account:** manually registered precisely that account in `supporter_private.f16_sandbox_qa_owners`, `status='disabled'`, `expires_at=clock_timestamp()+7 days` at insert time; postflight 1 staged disabled owner, 0 enabled owners, 0 QA credits, 0 badges, old 1 checkout intact. **NO user membership, checkout, provider POST or live**.

**Second distinct checkout code and installed schema:** `supabase/drafts/f16_qa_v2_same_owner_second_checkout_PG17_ONLY.sql` uses private `f16_sandbox_qa_v2_checkout_attempts` (own unique account+request key), `public.f16_qa_v2_begin_checkout` and `public.f16_qa_v2_claim_provider_create` restricted to `service_role`, owner must be temporarily allowlisted `enabled` and have separate immutable V2 offer ES/EN published with digest. Own V1 historical checkout is unchanged. Verified disposable PostgreSQL lab and CI on commit `73250af92bd9da30634348959e36e73521b4814d`: CI `39049267379` SUCCESS, PG17 `39049267416` SUCCESS. After successful hosted dry-run ROLLBACK, applied migration `20261017162650_f16_sandbox_qa_v2_second_checkout_same_owner`, versioned exactly at `supabase/migrations/20261017162650_f16_sandbox_qa_v2_second_checkout_same_owner.sql` (commit `da4edff42f970caabf6890d1f4edcb346e6e41cd`). Hosted postflight: 0 V2 attempts, 1 historical V1 attempt, 2 historical intents, 0 payments, 0 QA periods/holds, 2 unpublished V2 language rows, 1 disabled QA owner, 0 enabled; `service_role` may call V2 RPC, client roles may not. No provider create claim executed.

**Next actual coding before Sandbox purchase:** connect *server* `p06CheckoutConsentStore` and `f16-paypal-supporter` composition to V2 begin/claim RPCs with Auth owner proof, never to legacy V1 store, and route cancellation/status to the V2 bound intent (legacy P06 cancel could target wrong subscription). Then integrate verified Sandbox SALE.COMPLETED into QA period ledger and refund reconciliation, release V2 terms on the QA-only private allowlist, enable existing owner with short expiry, deploy Sandbox-only Edge to an authorized test origin and supervised buyer. DO NOT enable UI flags publicly. Never treat approval/redirect as payment. Run browser E2E of all four rewards and cancellation. PO requests to see/test inside PAZO, no stand-alone prototyping and no PayPal Live.

**Current next result:** `F16_V2_EXISTING_OWNER_STAGED_WITH_NEW_HOSTED_CHECKOUT_RPC_DISABLED_NO_PROVIDER_CALL`.

---

# F16 — REUTILIZAR CUENTA YA EXISTENTE PARA PRUEBA SANDBOX (2026-10-17)

**Última decisión del PO:** usar su cuenta PAZO de pruebas existente y su mascota; **NO crear una cuenta nueva**. El PO confirmó que esos datos son de QA y serán descartados al lanzamiento MVP. No escribir el correo ni UID en código, docs o logs.

**Preflight real Supabase, lectura acotada por la cuenta aportada en chat:** exactamente 1 Auth, 1 mascota, 1 checkout P06 histórico y 1 intent vinculado (bound); 0 pagos. El checkout anterior tiene una aceptación v1 SIN beneficios. Un índice único `p06_one_checkout_per_owner` y `f16_p06_begin_checkout` impiden legítimamente iniciar otra compra con el mismo dueño si se reutiliza ese circuito. **NO borrar/reasignar/modificar checkout ni términos antiguos, ni tratar esa compra como v2.**

**Acción real autorizada y ya aplicada:** insertar solo ese Auth propietario en `supporter_private.f16_sandbox_qa_owners` con `status='disabled'`, `expires_at=clock_timestamp()+interval '7 days'`, usando búsqueda por email solo en SQL privado en Supabase. Postflight: 1 propietario QA preparado/desactivado, 0 habilitados, 0 períodos pagos, 0 temas, 0 holds, 1 checkout anterior intacto, 0 entries contables, 0 insignias públicas. **Sin compras ni cambios a PayPal, Vercel, Edge o Live.** No registrar correo de cuenta de prueba en GitHub.

**Solución de código para la segunda suscripción:** `supabase/drafts/f16_qa_v2_same_owner_second_checkout_PG17_ONLY.sql`, nueva tabla `f16_sandbox_qa_v2_checkout_attempts` privada con RLS forzado y dos RPC `f16_qa_v2_begin_checkout` / `f16_qa_v2_claim_provider_create`, solamente service_role. Mantiene P06 v1 intacto, requiere owner QA habilitado temporalmente y aceptación independiente v2 publicada ES/EN, y solo permite una solicitud PayPal idempotente v2. **Sólo PG17 por ahora, NO INSTALADA HOSTED.** Fixture y pruebas en `supabase/tests/supporter/f16-qa-v2-owner-fixture-pg17.sql` y `f16-qa-v2-existing-owner-checkout-synthetic.sql`; workflow `.github/workflows/f16-postgres-inbox-lab.yml` commit `73250af92bd9da30634348959e36e73521b4814d`, verificar su CI/PG Lab antes de autorizar instalación de esa ruta. Los servicios Edge P06 todavía llaman RPC antigua, por lo que quedan OFF hasta conectar el adaptador V2, consulta de status/cancelación V2 y el webhook+período Sandbox verificados.

**Siguiente acción técnica:** confirmar PG17 V2 sin alterar historial, integrar Edge QA servidor/consentimiento V2 con lease PayPal; instalar v2 solo tras validación + permiso QA, habilitar owner temporal y offer v2 sin tocar v1, efectuar **una** compra Sandbox supervisada y verificar la activación de los cuatro beneficios reales dentro de PAZO. Nunca pedir nueva cuenta al PO ni hacer migraciones de Live o P42.

**Marcador:** `F16_EXISTING_QA_OWNER_STAGED_DISABLED_V2_SEPARATE_CHECKOUT_PG17_PENDING`.

---

# F16 — Sandbox QA backend de CUATRO BENEFICIOS instalado e INERTE (2026-10-17)

**Segundo paso completado después del GO del PO «sí»:** Supabase proyecto `mrybvqdebbgcayuvgkkr`, nueva migración aplicada **`20261017161221_f16_sandbox_qa_verified_benefits_reads`** y versionada en `supabase/migrations/20261017161221_f16_sandbox_qa_verified_benefits_reads.sql`. Procede del borrador `supabase/drafts/f16_sandbox_qa_benefits_read_and_theme_hosted_PO_APPROVED_20261017.sql`, comprobado **antes** con ejecución y ROLLBACK contra el esquema alojado (PASS). El control PO actual solo autoriza Sandbox aislado, NO Live ni creación de pago.

**Postflight real:** `public.pazo_supporter_public_pet_benefits`, `pazo_supporter_public_badges_batch`, `pazo_supporter_set_pet_theme`, `pazo_supporter_public_wall` INSTALADAS; `supporter_private.wall_has_verified_entitlement` ahora verifica única y exclusivamente una cuenta QA `status=enabled`, `expires_at>clock_timestamp()` y período QA privado sin hold. Otros usuarios no reciben beneficios. `supporter_private.f16_sandbox_qa_projection` sin EXECUTE `service_role`; guardas de owner/Auth para temas y opt-in. Comprobado: cuentas QA=0, períodos QA=0, fondos QA=0, holds QA=0, muro consensuado/publicado=0, mascotas con insignia=0; los lectores del perfil, Feed y muro existen; público no puede acceder a esquema privado, roles no pueden registrar dinero ni editar fondos ajenos. v2 ES/EN continúa **UNPUBLISHED** (dos filas) y V1 publicada intacta. Ledger financiero real permanece 0. **No hay E2E PayPal todavía**, no se envió ninguna solicitud a PayPal, no hay comprador descartable identificado, checkout EDGE sigue apagado.

**Próximo bloqueo realmente accionable:** el usuario debe crear o identificar **UNA nueva cuenta PAZO descartable y una mascota** que no haya participado en pruebas P06 pasadas. Nunca pedir contraseña ni credenciales de pago. Cuando confirme que está lista: localizar UID Auth privado en Supabase con consentimiento, asociar exclusivamente esa cuenta a `f16_sandbox_qa_owners` con expiración, completar el adaptador privado de verificación merchant / registro del período/holds desde un nuevo contrato v2 y habilitar la oferta/checkout solamente en la ruta QA tras verificación de guardas. Entonces ejecutar compra Sandbox humana y revisar en PAZO insignia, 5 fondos, muro y cancelación. **No usar documento ni período P06 antiguo: excluía beneficios.**

**Cuidado:** solo instalar datos de usuario/términos en QA con política de retención acotada; toda señal PayPal debe firmarse, correlacionarse al owner y verificarse independientemente, sin conceder por redirect o status ACTIVE. PayPal Live, P42 y funciones públicas siguen OFF. PR #44 DRAFT. `F16_HOSTED_SANDBOX_QA_BENEFIT_READS_PASS_AWAIT_DISPOSABLE_BUYER`.

---

# F16 — Sandbox V2 instalada como QA privado NO PUBLICADO en Supabase (2026-10-17)

**Autorización PO explícita:** «sí» a instalar únicamente entorno de pruebas PayPal Sandbox con propietario descartable, sin alterar pagos históricos ni habilitar Live. **Aplicado** con Supabase `apply_migration`: versión exacta **`20261017160619_f16_sandbox_benefits_v2_private_qa_staging`**, proyecto `mrybvqdebbgcayuvgkkr`. SQL idéntico al versionado en `supabase/migrations/20261017160619_f16_sandbox_benefits_v2_private_qa_staging.sql`, originado en borrador `supabase/drafts/f16_sandbox_benefits_v2_hosted_qa_staging_PO_APPROVED_20261017.sql`. Antes se ejecutó el mismo SQL en transacción con **ROLLBACK** contra la misma DB (PASS), sin dejar artefactos.

**Postflight HOSTED real y verificado**: v2 `pazo-supporter-sandbox.benefits-v2` tiene **dos textos ES/EN, ambos `published_at IS NULL`**; oferta histórica v1 conservada publicada ES/EN (2); un checkout histórico permanece igual (1); `paypal_payment_entries=0`; tabla de owners autorizados QA=0, períodos QA=0, holds QA=0, fondos QA=0; **4/4 tablas nuevas con RLS FORCE** y **0 accesos SELECT a anon/authenticated/service_role**. La lectura `public.f16_p06_read_published_offer` sigue devolviendo **v1**, no v2. Checkout Edge `QA_CHECKOUT_RELEASE_APPROVED=false` sigue cerrado, sin despliegue Edge/Vercel, claves, suscripciones nuevas ni pagos. Panel visual de QA real compilable en PR #44, flag desactivado. **No afirmar E2E Sandbox realizado.**

**Seguridad**: nueva zona de QA en `supporter_private.f16_sandbox_qa_owners` (lista privada inicialmente VACÍA), `f16_sandbox_qa_paid_periods` (venta/evento únicos, owner con FK al allowlist, USD 299, contrato v2, períodos 1-32 días, Sandbox obligatorio), `f16_sandbox_qa_holds` y `f16_sandbox_qa_pet_themes`. Sin funciones `GRANT` de escritura, sin RPC público nuevo. Los asesores de seguridad reportan `RLS sin policies` para esas cuatro tablas privadas; es **deliberado: RLS deny-all + REVOKE ALL** (no dar políticas de lectura). P42/Live siguen OFF.

**SIGUIENTE ACCIÓN PARA E2E REAL**: antes de publicar v2 o activar el checkout, crear/identificar **UNA cuenta Supabase Auth descartable y UNA mascota de QA**, ajenas a los dos intentos Sandbox anteriores. PO no debe compartir contraseña, correo privado ni tokens. Obtener su UUID de manera privada autorizada, revisar entorno/origin y que no exista intento anterior, insertar en allowlist QA limitada en tiempo SOLO con autorización ya existente y preflight, configurar/deplegar EDGE Sandbox (actual latch OFF) y publicar la nueva oferta solo cuando la ruta de evidencia merchant/periodos + cuatro beneficios esté conectada. Entonces usar buyer PayPal Sandbox supervisado para nueva aprobación y pago, cancelación, wall opt-in/out y QA móvil real. Nunca migrar documentos `DISPOSABLE_ONLY` ni cambiar flags Live para pruebas. PR #44 sigue DRAFT.

**Marcador operativo:** `F16_SANDBOX_V2_HOSTED_EMPTY_STAGING_PASS_BUYER_NOT_SELECTED_CHECKOUT_OFF_LIVE_OFF`.

---

# F16 — SANDBOX REAL CON CUATRO BENEFICIOS: CÓDIGO V2 LISTO, COMPRA NUEVA PENDIENTE (2026-10-17)

**Objetivo PO re-confirmado:** «por fin, muy bien vamos a ello» = realizar **en PAZO** compra PayPal **Sandbox** con cuatro beneficios auténticos, corregir allí las pantallas que el PO vea, cancelar y verificar expiración/reembolsos; **NO** más maquetas separadas, P43, PayPal Live ni nuevo despliegue público.

**Entregado en PR #44 DRAFT, código y laboratorio, sin tocar hosted:**
- `src/features/supporter/sandboxBenefitsOfferV2.mjs`: nueva oferta ES/EN **Sandbox beneficio real QA**, versión `pazo-supporter-sandbox.benefits-v2`, precio USD 2.99/mes simulado, cuatro beneficios exactos. `mayPublish=false` y `mayCreateCheckout=false` mientras no haya publicación separada. Original P06 `pazo-supporter-sandbox.qa20261016-v1` decía explícitamente SIN beneficios, por lo que **NUNCA** autoriza perks retroactivamente.
- `src/features/supporter/components/SandboxCheckoutQaPanel.tsx`: fail-closed si server ofrece vieja versión sin beneficios; nuevo copy acepta los 4 beneficios y sigue casilla desmarcada. `supabase/functions/f16-paypal-supporter/index.ts` también bloquea `begin` v1 y `offer` v1 aunque browser sea modificado. **Latch servidor QA_CHECKOUT_RELEASE_APPROVED=false INTACTO**, no checkout abierto.
- `SupporterSandboxBenefitsStatus.tsx` integrado en `SupporterAccountManagement.tsx` SOLO cuando `import.meta.env.DEV && VITE_PAZO_F16_SANDBOX_QA_UI==='true' && VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED==='true'`: examina los RPC reales para mascota propia, insignia original, fondo persistido, consentimiento individual y vista pública del muro, sin mentir sobre pagos ni conceder por redirección PayPal.
- `scripts/f16-sandbox-benefits-v2-disposable-offer-sql.mjs`: reproduce publicación de v2 en PG17 solo `f14_synthetic`, manteniendo intactos dos términos históricos; test en workflow PG17. No es migración hosted.
- `src/features/supporter/testing/f16SandboxFourBenefitsOfferV2.test.mjs` + `scripts/closure-ui.test.mjs`: comprueba copy nuevo/antiguo, bloqueo browser/backend de versión v1, y componente real de estado con RPC sintética/verificada, incluyendo fallos/casos negativos. `supabase/tests/supporter/f16-mvp-four-benefits-pg17-synthetic.sql`: cinco temas individualmente, guardado/restauración, milestones 3/12 y degradación por refund, wall/consent y denegación gratis. **CI SUCCESS #39047189109** y **PG Lab SUCCESS #39047189112**, commit `7926bdf89690593fcb8dde84d472edb8e6024fa7`.
- Nueva prioridad aclarada en `docs/PAZO_F16_UI_AND_SANDBOX_BEFORE_LIVE_GATE_20261017.md`, commit `71f692c5fb6dd496014f17180142fe08569013dc`.

**Hosted estado REAL (read-only verificado):** 2 filas de ofertas Sandbox v1 `pazo-supporter-sandbox.qa20261016-v1`, 1 intento de compra histórico y 0 ofertas v2. El sitio no puede comprar v2 ni demostrar beneficios mientras la nueva versión y un ledger Sandbox QA no estén instalados y el checkout no esté habilitado de manera aislada. Sin información de secretos divulgada.

**Siguiente gate es OPERATIVO, no más visualizaciones:** preparar arquitectura/migración **SOLO Sandbox QA** con allowlist de nueva cuenta Auth descartable, nueva oferta v2 inmutable, recibos PayPal Sandbox firmados + Merchant GET + fechas de período, fuente de acreditación QA privada y proyección de 4 beneficios, cancelación PayPal Sandbox. Contrastar ACL/RLS, pedir GO específico al PO antes de insertar ofertas o activar Edge/desplegar hosted. Ejecutar primer E2E real, mostrar pantallas auténticas al PO para corregir. No reutilizar la compra P44 antigua, no conceder por aprobación o PayPal `ACTIVE`, no hacer 12 pagos para probar 12 meses (usar laboratorios PG17), no tocar P42/Live.

**CI del nuevo handoff es documental y por confirmar.** PR #44 DRAFT, no merge/preview/payments. **Marcador `F16_SANDBOX_BENEFITS_V2_DEVELOPED_LIVE_OFF_REAL_SANDBOX_BUY_PENDING`.**

---

# F16 — ORDEN ACTUAL DEL PRODUCT OWNER: UI Y BENEFICIOS SANDBOX ANTES DE LIVE (2026-10-17)

**Corrección expresa del PO:** detener el salto a PayPal Live. Aunque los cuatro PNG originales están versionados y CI/PG17 pasa, **NO se han aprobado visualmente** las insignias dentro de las pantallas reales, los cinco fondos, el muro de agradecimiento ni la pantalla final de pago/cancelación; **NO se ha ejecutado E2E Sandbox del nuevo contrato con los cuatro beneficios**. El comprador Sandbox anterior de P44 aceptó una oferta de QA que explícitamente no concedía recompensas. No reutilizarlo como demostración de beneficios.

**PRIORIDAD 1 ACTIVA (sustituye los pasos Live anteriores):** `docs/PAZO_F16_UI_AND_SANDBOX_BEFORE_LIVE_GATE_20261017.md`, creado commit `705509b363f59b09a8a8e08eb66a0914e67714ab`. Presentar al PO capturas/QA navegable de **(a)** oferta y botón PayPal en la posición discreta aprobada, **(b)** cuatro insignias sobre avatar/perfil/Feed, **(c)** cinco fondos en perfil real, **(d)** muro/opt-in/opt-out y **(e)** pantalla gestión/cancelación; elegir los ajustes visuales y programarlos. Seguidamente probar compra Sandbox nueva con oferta que sí incluye recompensas, acreditación privada, beneficios, revocaciones, expiración y cancelación. Evitar test histórico repetido P42/43.

**Bloqueo Live:** NO solicitar crear/activar plan Live, ID Live, app/secrets/webhook Live, cambios en Supabase alojado ni cobros hasta aprobar **UX + E2E Sandbox + GO del PO**. Confirmación previa «PayPal Business» se conserva como hecho, pero **NO hace falta ninguna acción allí ahora**. `docs/PAZO_F16_PAYPAL_BUSINESS_LIVE_PLAN_SETUP_20261017.md` queda POSPUESTO y NO es el siguiente gate. PR #44 continúa DRAFT; flags de beneficios públicos OFF; no nuevos deployments. PAZO gratis, Supporter voluntario $2.99 mensual, cuatro beneficios originales.

**Distinción de evidencias:** Codex QA de cuatro PNG en tamaños 32/66 = assets y componentes cargan, **no equivale a aceptación visual de la integración**; tests SQL/JS/PG17 = infraestructura, **no E2E con PayPal y pantallas reales**. Solicitar captura y revisión humana antes de pasar de gate. **Estado:** `F16_UX_REVIEW_SANDBOX_E2E_PENDING_LIVE_HOLD`.

---

# F16 LIVE — PayPal Business CONFIRMADO; plan de producción en preparación (2026-10-17)

**PO confirmó explícitamente «sí bussines++»:** la cuenta comercial para recibir los ingresos PAZO **YA ES PAYPAL BUSINESS**. No volver a pedir si la cuenta es Personal/Business. **Todavía NO se ha verificado app REST Live, Plan ID Live, Webhook ID Live ni credenciales Live**; ni el titular ni Codex los han aportado a esta fase. No inferir que Sandbox es Live.

**Paso más rápido:** la guía PayPal Business actualizada 2026-10-01 permite crear directamente el plan comercial desde `Sales > Subscriptions > Create plan`, sin desarrollar un catálogo adicional. El PO/Codex pueden dejar un **borrador**: `Amigo de PAZO`, USD 2.99 por mes, recurrente indefinido, sin trial/setup, con cuatro beneficios aprobados y descripción exacta; NO activar el plan ni checkout público sin autorización adicional. Recuperar únicamente el `Plan ID` público `P-...` y confirmar estado/merchant; jamás compartir Client Secret ni token. Operativa exacta `docs/PAZO_F16_PAYPAL_BUSINESS_LIVE_PLAN_SETUP_20261017.md`, creada en commit `4856b09088e3e9a4b5c485e0e67e029c4a6b6c6c`. Los aspectos fiscales/aviso recurrente y URL real de retorno no están decididos; no inventarlos.

**Estado técnico:** PR #44 DRAFT, cuatro PNG originales publicados en `77708dd0c1e34e164161c12305b57cbdbc05b690`, CI y PG Lab del handoff `4d374e3a013fbe5bce52d63e88237f6e6ae69b9b` **SUCCESS** (runs 39042913272/39042913281). Código de períodos privados/entitlements solo probado offline/PG17, aún no instalado hosted ni relacionado con un cobro Live; todos los beneficios públicos y pagos siguen OFF. No reabrir P42 histórico.

**Siguiente paso de integración:** una vez identificado el Plan ID Live, validar read-only el plan contra el contrato `pazoPaypalLivePlanContract.mjs`, preparar app/webhook Live separados y completar ciclo conciliado -> cuatro beneficios, cancelación online y acuse. Requerir GO específico antes de cualquier cargo/activación de usuarios reales.

**Marcador:** `F16_PAYPAL_BUSINESS_CONFIRMED_LIVE_PLAN_ID_PENDING_NO_LIVE_PAYMENT`.

---

# F16 MVP — cuatro insignias PNG originales incorporadas y QA local PASS (2026-10-17)

**Orden expresa del Product Owner:** incorporar únicamente las cuatro insignias aprobadas desde `pazo-supporter-insignias-4.zip`, comprobar componentes existentes, pruebas/build y publicar en la misma rama; sin rediseño ni activaciones. Rama `f13/section-titles-20261012`, PR #44 DRAFT. Checkout sincronizado por fast-forward a `1bbd216411cdedd6a39d2fdc3a9cfb4b5b0a08ff` y limpio antes de instalar.

**Commit de arte:** `77708dd0c1e34e164161c12305b57cbdbc05b690`, exclusivamente cuatro PNG en `public/supporter/`:

- `amigo-pazo-inicio.png`
- `amigo-pazo-3-meses.png`
- `amigo-pazo-6-meses.png`
- `amigo-pazo-12-meses.png`

Ejecutado `scripts/f16-stage-approved-supporter-badges.ps1` sin modificarlo. SHA256 del ZIP `281503c0638d1d9e3ea752263f9e2a72be5a584f172af73d17358a6c970182b5` y hashes de los cuatro originales idénticos al contrato del instalador. PNG RGBA **543×545**, sin recomprimir, generar ni rediseñar. El manifiesto del ZIP no se incorporó al repositorio. Copias del build en `dist/supporter/` verificadas byte a byte por hash.

**Integración comprobada sin cambios de runtime:** rutas y etiquetas de `SupporterBadge.tsx` coinciden con los cuatro archivos; `PublicProfileView.tsx` y `HomeView.tsx` ya consumen ese componente detrás de prueba RPC y `VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED`. El flag de la compilación de producción permanece **OFF**. No fueron necesarias correcciones de código ni tests nuevos.

**Validación local:** 11/11 pruebas existentes `f16MvpServerBenefits.test.mjs` y 1/1 prueba UI dirigida `F16 approved supporter themes`: PASS. `npm run build`: PASS, con advertencia de tamaño de chunks; no se ejecutó manualmente la suite histórica completa. Verificación aislada adicional del componente real: 16 combinaciones ES/EN y pequeño/grande, ocultación de estado inactivo o milestone inválido, ocho archivos originales/build y sus dimensiones: PASS. Navegador local: ocho imágenes cargadas, cuatro variantes a **32×32 y 66×66**, tamaño natural 543×545. Arte revisado visualmente. La galería QA usó datos sintéticos y archivos del build, con conexiones externas bloqueadas; **no es una sesión de beneficios públicos ni un E2E con Supabase**. Captura y evidencias conservadas localmente; servidor y pestaña QA cerrados.

**Publicación:** commit de arte separado del registro documental. Verificar CI/PG Lab del HEAD publicado antes de afirmar SUCCESS remoto; los resultados locales anteriores sí fueron observados. No desplegar Vercel ni fusionar PR #44.

**Alcance restante intacto:** ningún acceso ni modificación de Supabase alojado, PayPal, checkout, beneficios públicos, flags financieros, pagos o períodos acreditados por esta tarea. Las fases de conciliación y autorización financiera conservan sus gates anteriores. Este cambio solo incorpora los recursos originales y no habilita la membresía Live.

---
# F16 MVP — escritura privada de períodos idempotente probada en PG17 (2026-10-17)

**GO PO «ok go»:** continuar acelerando la membresía voluntaria **Amigo de PAZO US$2.99 al mes**, los cuatro beneficios originales, app gratuita; sin activar pagos Live, desplegar ni tocar DB alojada. Rama `f13/section-titles-20261012`, PR #44 DRAFT. **No más rondas P42** para avanzar interfaz comercial.

**Nuevo código de esta tanda, ya probado en aislado:**
- `supabase/drafts/f16_mvp_operator_period_writer_DISPOSABLE_ONLY.sql`: función operadora en esquema privado para crear un período pagado ya conciliado, con owner `auth.users` y bloqueo de fila, replay de la misma venta estrictamente idempotente, bloqueo de replays alterados, duplicados/solapamientos, precio único 299 USD centavos, términos digeridos y prohibición de `merchant_verified_at` futuro. Una segunda función registra un bloqueo por disputa/reembolso, con replay idempotente **sin poder quitar holds**. Solo DB invoker `postgres` y `f14_synthetic`; **no invocable por anon/authenticated/service_role**.
- `supabase/tests/supporter/f16-mvp-private-period-writer-synthetic.sql` prueba insert, replay, venta adulterada, solapamiento, owner desconocido, merchant timestamp imposible, disputa, repetición y ACL; rollback completo. `.github/workflows/f16-postgres-inbox-lab.yml` añade este gate solo a PG17 descartable.
- **Evidencia:** commit `4202a279d8cca2c731f45f5c7f79ea144b3c76b2`, [CI #39041408100](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39041408100) **SUCCESS** y [PG Lab #39041408102](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39041408102) **SUCCESS**.
- Procedimiento y límites: `docs/PAZO_F16_MVP_IDEMPOTENT_PERIOD_WRITER_GATE_20261017.md`, commit `c28d0dc8ba12065ef2581f32170a23b1a0eedf7a`. **La firma de PayPal, merchant real, reversals, consentimiento, fechas exactas y atribución Auth siguen siendo responsabilidad de un lector autorizado antes de conectar escritor**. La nueva función no está en Supabase alojado, no admite transacciones reales, y no concede beneficios por sí sola.

**Arte original auditado, todavía no incorporado a GitHub:** `pazo-supporter-insignias-4.zip` extraído en el entorno de trabajo; SHA256 `281503c0638d1d9e3ea752263f9e2a72be5a584f172af73d17358a6c970182b5`, cuatro PNG RGBA originales 543×545 con hashes idénticos a `scripts/f16-stage-approved-supporter-badges.ps1`. Los cuatro originales están listos para Codex local: ejecutar script desde el checkout y commitear cuatro `public/supporter/*.png`, pruebas/build y QA visual. Se probaron versiones web optimizadas para estudio, pero **NO reemplazar el arte aprobado por versiones reducidas sin revisar con PO**. No afirmar archivos publicados.

**Siguiente operación necesaria:** incorporar esos PNG a PR #44 a través de Codex; construir el reconciliador merchant autorizado que produzca períodos contractuales correctos y gestione refunds/disputas; preparar checkout Live separado con cancelación online, avisos y acuse. Solo una vez acreditada la nueva ruta completa Sandbox solicitar GO supervisado para primer cobro Live; mantener flag `VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED` apagado.

**Resultado hasta ahora:** pruebas aisladas PASS, P42/worker/checkout Live OFF, 0 pagos/0 claves P42 en última lectura hospedada; no ejecutar migraciones `DISPOSABLE_ONLY` allí. `F16_MVP_PRIVATE_WRITER_DISPOSABLE_PASS_HOSTED_LIVE_NO_GO`.

---

# F16 MVP — medallas tras período completo; venta PayPal comprobada con transacciones (2026-10-17)

**GO Product Owner:** «ok go» continuar cierre acelerado de **Amigo de PAZO $2.99 USD al mes con los cuatro beneficios originales**. PR #44 DRAFT rama `f13/section-titles-20261012`. Este GO autoriza trabajo de código, repositorio y ensayos aislados, **NO** habilitar PayPal Live, migrar hosted, crear claves ni cobrar dinero real. No reabrir P42 histórico.

**Corregido y comprobado:**
- Las medallas 3/6/12 requieren **períodos reales completamente transcurridos y acreditados** (`service_end <= as_of`), no se anticipan por 3.º pago si el período sigue en curso. Implementado en `supabase/drafts/f16_mvp_verified_paid_period_source_DISPOSABLE_ONLY.sql` y `pazoSupporterBenefitsV1.mjs`, pruebas SQL y JS actualizadas. Commit `b33d0502a343fa122ed569fae2e47a32816cb7be`; **CI #39040388115 SUCCESS**, **PG Lab #39040388110 SUCCESS**.
- Nuevo `pazoPaypalLiveSubscriptionTransactionsProof.mjs` valida PayPal Subscriptions v1 Transactions (COMPLETED exacto, gross US$2.99, id/tiempo del evento, sin refund, sin truncamiento de páginas); `pazoPaypalLiveSaleEvidenceReader.mjs` ahora exige 4 GET PayPal: Sale, Subscription, Plan y Subscription Transactions, todo en modo **disabled**. `merchantSaleCandidate` solo `REVIEW_REQUIRED`, jamás `mayCreatePaidPeriod`, `mayGrantBenefits` ni `mayCheckout`. Pruebas `f16MvpPaypalSubscriptionTransactionsProof.test.mjs` y `f16MvpPaypalLiveSaleEvidenceReader.test.mjs`; commit `fe450aeca3187db52facfcc03fff3db961536e4b`, **CI #39040660793 SUCCESS**, **PG Lab #39040660795 SUCCESS**.
- Nota de límites: consulta de transacciones por ventana ±48h no sustituye historial de reversals posterior; no demuestra fechas del período ni merchant identity final. Falta writer privado ligado a evidencia de cobro, intervalos contractuales, refunds/disputas y prueba Live.
- `docs/PAZO_F16_MVP_COMPLETED_PERIODS_AND_PAYPAL_TRANSACTIONS_GATE_20261017.md` es el gate completo. Se verificó el ZIP auténtico con cuatro insignias y SHA256; **los binarios PNG originales todavía NO se subieron a GitHub** porque el canal en este chat no transfiere directamente sus bytes. Codex local debe ejecutar `scripts/f16-stage-approved-supporter-badges.ps1` contra el ZIP original, hacer commit **solo** de los cuatro PNG y comprobar QA visual. El script/hashes están listos, así como los componentes de insignia en Feed/perfil detrás del flag disabled.
- El CI del último HEAD con actualización de docs/handoff debe verificarse después de escribir este bloque; no atribuirle resultados no vistos.

**Siguiente acción sin nuevos experimentos P42:** Codex importa badges, se integra el reconciliador privado de pagos/servicio en un entorno aislado con revisión de seguridad y rollback; se prepara un endpoint Live cerrado por defecto y cancelación digital con confirmación. Solicitar GO específico antes de Supabase alojado y primer pago real. PR #44 DRAFT, sin nuevas publicaciones.

**Marcador:** `F16_MVP_COMPLETED_PERIOD_MEDALS_AND_PAYPAL_TRANSACTION_CROSSCHECK_CI_PASS_LIVE_NO_GO`.

---

# F16 MVP — ORIGINAL INSIGNIAS EN PERFIL/FEED + MERCHANT LIVE LECTURA AISLADA PASS (2026-10-17)

**Product Owner «ok go»:** continuar cierre más rápido de Amigo de PAZO mensual **$2.99**, con los cuatro beneficios aprobados; jamás habilitar Live sin confirmación del comercio y entrega de beneficios. PR #44 DRAFT, rama `f13/section-titles-20261012`. No incrementar alcance P42.

**Implementación de esta tanda en GitHub:**
- `src/features/supporter/components/SupporterBadge.tsx`: selección solo de cuatro insignias **originales** (inicio/3/6/12 meses) desde `public/supporter/amigo-pazo-*.png`, sin inventar íconos en su lugar. El componente solo aparece cuando el backend verifica entitlement y la insignia existe.
- `PublicProfileView.tsx`: insignia en avatar principal y publicaciones del perfil, distintivo de fundador independiente. Se conservan los cinco fondos aprobados, sujetos a RPC.
- `HomeView.tsx`: insignia junto al autor del Feed, consultas únicas por lotes de 48 mascotas a `pazo_supporter_public_badges_batch`, no una por tarjeta. Revalida cada 60 segundos y al devolver foco a pestaña; antes de la respuesta limpia caché para no mantener beneficios caducados.
- `supabase/drafts/f16_mvp_four_benefits_backend_DISPOSABLE_ONLY.sql`: función pública solo lectura y acotada `pazo_supporter_public_badges_batch(uuid[])` añadida sobre el backend **SOLO PG17 sintético**. Seguridad ACL igual, sin IDs de dueño ni pagos. `supabase/tests/supporter/f16-mvp-four-benefits-pg17-synthetic.sql` prueba mascotas gratuitas/pagadas, rechazo batch >48 o null, refund/disputa y anonimato. Nunca ejecutar estos drafts en Supabase alojado.
- `scripts/f16-stage-approved-supporter-badges.ps1` valida ZIP exacto SHA256 `281503c0638d1d9e3ea752263f9e2a72be5a584f172af73d17358a6c970182b5` y cada PNG, instala cuatro PNG originales localmente en `public/supporter`. **Todavía no están commiteados los binarios**; Codex local Windows debe importar desde el ZIP descargado de la conversación, verificar CI/visual y hacer commit con esas cuatro imágenes SIN activar Live ni flag. ZIP original `pazo-supporter-insignias-4.zip` adjunto ya compartido; NO usar arte improvisado.
- `supabase/functions/f16-paypal-webhook/pazoPaypalLiveSaleEvidenceReader.mjs` + `src/features/supporter/testing/f16MvpPaypalLiveSaleEvidenceReader.test.mjs`: por defecto **disabled**, consulta solo vía lectura privada y una claimed verified webhook previamente autenticada. Tres GET PayPal **Live** separados Sale/Subscription/Plan, valida dueño/consentimiento/plan del merchant, estado COMPLETED, $2.99 USD. Incluso PASS = `REVIEW_REQUIRED`, `mayRecordPayment=false`, `mayCreatePaidPeriod=false`, `mayGrantBenefits=false`, `mayCheckout=false`, `paidThrough=null`. No se llamó a PayPal real; siempre falta una fuente temporal de períodos y reversals. Ver `docs/PAZO_F16_MVP_BADGES_AND_LIVE_SALE_READ_GATE_20261017.md`.
- TODOS los nuevos elementos visuales permanecen ocultos por `VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED === 'true'` (no definida/activada). No confundir código compilable con funciones ya instaladas en hosted. El backend PG17 solo vive en Actions.

**EVIDENCIAS**: commit `a268ca29dcd965f1d30c8be52fe23e6e8d404bf0` CI **SUCCESS #39039494841** y PG Lab **SUCCESS #39039494756**; refresco Feed `9b5646cf23caa345dc398011412aaa1b3cd35eb9` CI **SUCCESS #39039567220**, PG Lab **SUCCESS #39039567262**; límites API batch `8ec7d4c95903cdcf3e59265e218083a3a6f11c63` CI **SUCCESS #39039675090** y PG Lab **SUCCESS #39039675086**. Docs en commit `8061373a0e11424306b96d4908f72d8848cb4ef1`, su workflow fue iniciado, comprobar resultado del HEAD/handoff posterior.

**SIGUIENTE PASO MÁS CORTO:** 
1. Codex local importa cuatro PNG originales desde paquete validado y los commitea (solo binarios originales) en rama PR #44. Ejecutar build/QA visual.
2. Diseñar e implementar migración alojada aprobable desde drafts **sin la guarda desechable** tras auditoría y verificación de owner/payments/retention/ACL. Integrar servicio Live revisor con períodos reales: signature verified webhook + Sale GET + Subscription/Plan GET + owner/terms + refunds/disputes/lease + vencimiento del ciclo. No se ha autorizado aplicar hosted todavía.
3. Preparar oferta exacta ES/EN (cuatro beneficios), consentimiento renovaciones automáticas y acuse descargable, Webhook ID/plan Live con merchant del PO, cancelación PayPal Live online real. Probar esta ruta E2E Sandbox (sin repetir Sandbox histórico ajeno).
4. Revisión legal/comercial, QA visual y GO expreso PO de una operación Live supervisada. **NO poner botón de pago activo aún**.

**Controles según último query hosted de solo lectura:** P42 keys 0, P42 writer OFF, P21 worker OFF, ledger rows 0; nuevas tablas/funciones de beneficios **no existen** en proyecto real. No deployments, nuevos secretos ni compras. P42 one-shots consumidos; PR #44 DRAFT.

**Marcador:** `F16_MVP_ORIGINAL_BADGES_PUBLISHED_ONLY_AFTER_ASSET_IMPORT_LIVE_SALE_READER_DISABLED_CI_GREEN_NO_LIVE`.

---

# F16 FAST TRACK — CUATRO BENEFICIOS CONECTADOS EN LAB/FRONT; LIVE TODAVÍA NO (2026-10-17)

**PO «ok go»:** seguir programación acelerada de Amigo de PAZO $2.99 mensual con insignia perfil/Feed, cinco fondos, muro consentimiento y medallas 3/6/12, manteniendo PAZO gratis. PR #44 DRAFT, rama `f13/section-titles-20261012`. Sin autorización para merchant Live, pago real, migración hosted, publicación ni despliegue manual. No reabrir P42 como bloqueo para desarrollar.

**Backend completado SOLO EN PG17 DESCARTABLE:**
- `supabase/drafts/f16_mvp_four_benefits_backend_DISPOSABLE_ONLY.sql`: amplía períodos privados ya ensayados; theme por mascota con RLS, RPC Auth/owner de guardar/resetear, proyección pública limitada de badge/tema/hito, muro consentido + cobertura verificada. Solo dentro de `f14_synthetic` (guarda explícita anti-hosted). El stub hosted `wall_has_verified_entitlement` **permanece `SELECT false`** y no hay períodos pagados reales.
- `supabase/tests/supporter/f16-mvp-four-benefits-pg17-synthetic.sql`: prueba lado usuario gratis, owner pagado, bloqueos de cross-owner, permiso revocable, muro de anon, disputa y expiración. Funciones/tables no filtraron datos financieros. Resultados **PG Lab #39038470241 SUCCESS** para revisión frontend subsecuente; corrección de pruebas de ACL/RPC + setup JWT previamente incluida.
- Reutilizó `f16_mvp_verified_paid_period_source_DISPOSABLE_ONLY.sql` y proyección server-only `pazoSupporterBenefitsV1.mjs`.

**Front-end default-off:**
- `SupporterThemeSaveControl.tsx` y panel `SupporterThemePreviewPanel.tsx`: guardado propietario autenticado, DB verifica período y relectura confirma persistencia; conserva preview PO aprobado cuando flag OFF.
- `PublicProfileView.tsx`: fondo desde `pazo_supporter_public_pet_benefits`, nunca desde localStorage, fallback seguro sin cobertura, contraste marfil para Cielo estrellado. Sin PNG de badge todavía.
- `GratitudeWallLive.tsx`: galería real basada exclusivamente en `pazo_supporter_public_wall` sin mascotas fake; componente preview A01 permanece cuando el flag OFF.
- `SupporterWallConsentSettings.tsx`: ya integrado en cuenta, permiso individual por mascota del dueño con relectura; backend y UI deniegan opt-in sin entitlement.
- Todos los caminos nuevos dependen de `VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED === 'true'`, **OFF por defecto**. **No activar** hasta backend alojado, merchant y assets completos, QA visual.
- **CI integral** con TypeScript/build y reglas de UI, **SUCCESS #39038470240**; PG lab correspondiente **SUCCESS #39038470241** en commit `4fbec595a1fe10615f6ff757b2a0c57a497a458b`. Las correcciones no debilitaron guardas: solo aceptan theme desde servidor y preservan preview predeterminado.

**Configuración PayPal Live preparada SIN conexión:** `pazoPaypalLivePlanContract.mjs` y test `f16MvpPaypalLivePlanContract.test.mjs`: rechaza plan con trial, precio distinto de 2.99 USD, otra cadencia, periodos finitos, impuestos/setup no revisados; nunca devuelve permiso de checkout ni beneficios. Documentación `docs/PAZO_F16_MVP_LIVE_FAST_TRACK_20261017.md`, actualización commit `326704f5906c5a467a298f56f5d805a9c1339e16`; workflow de documentos/HEAD final por verificar.

**PENDIENTE INMEDIATO:** (1) insertar assets PNG originales elegidos desde Biblioteca en GitHub y colocarlos en perfil, Feed y 3/6/12 medallas; (2) implementar backend real de reclamo de pago PayPal/merchant + período autoritativo + webhook de refunds/disputas en una migración separada, jamás promocionar fixture; (3) preparar oferta ES/EN, consentimiento durable, comprobante, cancelación online, plan/credenciales MERCHANT Live privadas; (4) probar única ruta Sandbox E2E completa con las cuatro recompensas y visual QA PO, y solo entonces solicitar GO de una transacción Live supervisada. Sin claves/checkout/ledger reales creados ahora.

**Controles históricos:** P42/P21 siguen OFF, P42 signing keys 0 y pagos registrados 0 según último preflight real. P42 one-shots consumidos, EDGE read local pendiente; NO repetir ni convertir QA en Live. PR #44 sigue DRAFT; no se fusionó ni se tocó Supabase alojado.

**Marcador:** `F16_MVP_FOUR_PERKS_PG17_AND_GATED_UI_PASS_LIVE_PROOF_INTEGRATION_PENDING`.

---

# F16 FAST TRACK — PERÍODOS PRIVADOS EN PG17 PASS; HOSTED/Live NO-GO (2026-10-17)

**Continuación de la prioridad PO:** Amigo de PAZO $2.99 USD mensual con los cuatro beneficios aprobados, sin anual ni quitar funciones gratuitas. Enfoque de entrega comercial mínima en vez de ampliar P42. PR #44 DRAFT, rama `f13/section-titles-20261012`.

**Hecho nuevo en código, SIN hosted:**
- `supabase/drafts/f16_mvp_verified_paid_period_source_DISPOSABLE_ONLY.sql`: primer esquema mínimo privado de pagos/servicio: id de venta, owner, subscription, términos inmutables, precio 299 USD centavos, ventana exacta, unicidad de ciclos; bloqueos de refunds/disputas; lectura privada de períodos activos e hitos; RLS FORCED, roles API sin SELECT/WRITE/EXECUTE. Incluye guarda contra ejecutarlo fuera de base desechable `f14_synthetic`; **NO ES MIGRACIÓN DE PRODUCCIÓN**.
- `supabase/tests/supporter/f16-mvp-private-paid-periods-synthetic.sql`: pruebas de período pagado, expiración, segundo mes futuro, reembolso parcial, hold, duplicación de intervalos y permisos; todas las inserciones dentro de ROLLBACK.
- `.github/workflows/f16-postgres-inbox-lab.yml`: PG17 disposable ejecuta nuevo SQL+test, sin conectar PAZO hosted.
- **Evidencia** commit `65089ddb6e1de5fc8d56f10b2cbf98d3f36209e9`: workflow **PG Lab #39037033412 SUCCESS**, **CI #39037033348 SUCCESS**.
- Road map detallado y contraste QA/Live en `docs/PAZO_F16_MVP_LIVE_FAST_TRACK_20261017.md`, actualizado mediante commit `151e810b36c8b39fc009cf7ab15ce0da0dd43350`. El último commit documental requiere confirmar checks.
- Beneficios en frontend y proyección servidor anteriores siguen rama/CIs PASS; **no están conectados a cobros reales**. Cuatro recortes PNG del arte original recuperado de Biblioteca disponibles como ZIP de conversación, aún NO están en GitHub.

**Siguiente trabajo ya delimitado, no otra auditoría P42:** conectar fuente privada a un reconciliador PayPal Live verificado/identity bound y preparar una migración versionada con criterios de entorno. Completar UI de badge perfil/Feed, persistencia de 5 temas, muro público consentido y 3/6/12 badges, luego consentimiento/acuse/cancelación Live; Sandbox E2E y un GO explícito Live. Antes de insertar cualquier período real requiere evidencia externa merchant y protección contra reembolso/disputa. No usar `BILLING.SUBSCRIPTION.ACTIVATED` como prueba de pago ni tratar cancelación como refund.

**NINGUNA** migración/credencial/clave/checkout/función Live/pago/beneficio fue activado por este fast track. P42/P21 OFF, DB signing keys P42 0 conforme último preflight. PR #44 DRAFT, F16 Live NO-GO.

**Marcador:** `F16_FAST_TRACK_WALL_UI_AND_SERVER_PROJECTION_CI_PASS_PG17_PERIOD_SOURCE_PASS_LIVE_PENDING`.

---

# F16 — FAST TRACK AMIGO DE PAZO con cuatro beneficios; código inicial validado (2026-10-17)

**Nueva prioridad aprobada por el PO:** lanzar lo antes posible la suscripción voluntaria **$2.99/mes**, con los **cuatro beneficios ya aprobados**, sin plan anual ni retirar funciones gratuitas. No interpretar el deseo de rapidez como GO para cobrar en Live sin pagos y beneficios verificables. Se prioriza `docs/PAZO_F16_MVP_LIVE_FAST_TRACK_20261017.md` (nuevo contrato de ruta crítica) sobre nuevas exploraciones no bloqueantes de P42.

**Código nuevo PR #44 DRAFT**:
- `src/features/supporter/components/SupporterWallConsentSettings.tsx`, conectado en `SupporterAccountManagement.tsx` bajo `VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED === 'true'`, **desactivado por defecto**. Usa RPC hosted previamente auditadas `pazo_wall_my_consents`, `pazo_wall_consent_enable`, `pazo_wall_consent_disable`: Auth/getUser, mascota propia, revisión explícita de permiso, confirmación server-side por nueva lectura y retirada incluso tras cancelación. La RPC `supporter_private.wall_has_verified_entitlement` alojada es aún `SELECT false`: NO indica una capacidad de inscribir mascotas real hasta fuente de períodos pagados.
- `supabase/functions/f16-paypal-webhook/pazoSupporterBenefitsV1.mjs`: **proyección server-only**, no desplegada ni conectada a datos hosted. Calcula badge perfil/autor, 5 temas aprobados, muro solo opt-in y medallas 3/6/12 de períodos únicos conciliados y ya iniciados; no auto-extiende por status PayPal ni readmitir refunds/fallos/disputas. Nuevos casos negativos `src/features/supporter/testing/f16MvpServerBenefits.test.mjs`.
- Los PNG originales para las cuatro medallas se localizaron en Biblioteca (fuente `Insignias brillantes Amigo de PAZO.png`); se generaron **cuatro recortes transparentes originales** en ZIP de entrega de conversación. Esos binarios todavía **no están subidos a GitHub ni integrados en UI**. No recrear otra gráfica. Confirmar elección del arte exacto contra lo aprobado antes de integrar.

**Validación:** commit frontend `1f669517d89fe4796282fdccc7c6535a4c35f407`, CI #39035845862 **SUCCESS** y PG Lab #39035846015 **SUCCESS**. Código servidor y tests revisados en commit `d5bb852b39804830b3859d5dff35bcb7bdd1f5eb`, CI #39036348503 **SUCCESS** y PG Lab #39036348527 **SUCCESS**. Documento fast-track `cb16082f7be5094fd198c1ecd2e86e422ab2da64`, CI #39036583471 **SUCCESS** y PG Lab #39036583528 **SUCCESS**. El commit solo documental de este handoff necesita checks propios. No se ha desplegado ni migrado nada alojado, creado un PayPal Live plan, cobrado dinero ni concedido beneficio.

**BLOQUEOS REALES de un pago público HOY:** la función de checkout desplegable `f16-paypal-supporter/index.ts` y gestión `f16-paypal-supporter-account` son **Sandbox QA** con allowlist/guardas, no Live; los términos actuales de QA no conceden beneficios. Hosted `supporter_private.paypal_payment_entries` carece de `service_start/service_end`, sus estados son `uncredited|blocked_reversal`; no hay período real acreditado. `wall_has_verified_entitlement` responde siempre false. Hacen falta modelo mínimo de períodos pagados comprobados, creación/renovación segura, P06 consentimiento Live y cancelación online real + recibo/retención, presentación de 4 beneficios con assets y pruebas Sandbox integrales. **No basta** activar un botón; nunca transformar suscripción Sandbox en una compra Live o premiar tras redirección.

**PRÓXIMO GATE DE IMPLEMENTACIÓN:** diseñar e implementar **fuente servidor autoritativa mínima de períodos** (reciclar P05/P06/P22/P24/P29/P32), conectarla a badge/tema/muro/medallas en QA, y construir checkout/cancel Live separado con términos ES/EN revisados. Sin reabrir los one-shot P43/P43B/P42-WRITE ni iniciar otro ciclo de pruebas P42 para avanzar UI. La migración/activación PayPal Live/cobro requiere control PO explícito y evidencia E2E. PR #44 permanece DRAFT, PAZO gratis. No ejecutar P42-EDGE-GET en este gate.

**Marcador:** `F16_FAST_TRACK_CODE_CI_PASS_FOUR_BENEFITS_NOT_LIVE_PROVISIONING_NO_GO`.

---

# F16-P42 — Edge Secrets READ ONLY preparado, ejecución privada pendiente (2026-10-17)

**Autorización PO:** «sí» para una sola consulta privada READ ONLY de presencia del nombre `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX`. No hay autorización de POST/DELETE, generación de secretos P42, nuevo token, escrituras DB, pagos o despliegues. PR #44 DRAFT, rama `f13/section-titles-20261012`.

**Preparación:** `scripts/f16-p42-edge-secrets-readonly-once.mjs` (Windows/Node 22, intento único `P42-EDGE-GET-20261017-01`, lock distinto, HTTPS GET con token **preexistente** si se encuentra en entorno local o `supabase secrets list --project-ref` desde CLI ya autenticada), proyección de nombre **exacto** y salida exclusivamente sanitizada. La respuesta oficial GET puede incluir valores secretos; nunca enviarla al chat/terminal/CI, ni copiar digests o nombres ajenos. `src/features/supporter/testing/f16P42EdgeSecretsReadonlyOnce.test.mjs` añade pruebas de entradas adversariales y no repetición. Procedimiento: `docs/PAZO_F16_P42_EDGE_SECRETS_READ_ONLY_GATE_20261017.md`.

**Evidencia verificada:** código `10c4264c4dcc6e454008fdc38cbf79ce8c6400e3`, pruebas `78ccc53fc6dcf555460f9f7de7b2114018a9004f` **CI #39034540800 SUCCESS** y **PG Lab #39034540752 SUCCESS**; documento `23ccfbb59aba3bb70e9e8a5158f3798c3e463996`. CI del commit final documental/handoff debe comprobarse aparte. **El canal remoto de Secrets NO se ejecutó desde ChatGPT; no afirmar READ PASS.** El conector Supabase no expone list/secrets de Management API.

**Siguiente paso único:** Codex en la computadora Windows del PO verifica HEAD/CI, sesión Supabase CLI existente, Node 22, ausencia del lock nuevo y ejecución privada sin grabaciones, y corre **una sola vez**:
`node .\\scripts\\f16-p42-edge-secrets-readonly-once.mjs --execute-approved-readonly --attempt-id P42-EDGE-GET-20261017-01 --private-one-shot`
Publica **únicamente** los marcadores `P42_EDGE_READ_ONLY_PASS_TARGET_NAME_ABSENT` o `P42_EDGE_READ_ONLY_PASS_TARGET_NAME_PRESENT_REVIEW_REQUIRED`, `P42_EDGE_SECRETS_READ_VERIFIED_WRITE_UNVERIFIED` y `P42_NO_KEY_GENERATION_NO_PROVISION_NO_PAYMENT` (o error sanitizado). No repetir ante error; lock consumido. Si aparece P42 presente, revisar sin proceder a escritura. P43/P43B/P42-WRITE previos CONSUMIDOS.

**Estado conservado:** canal PG efímero WRITE cero filas PASS informado por Codex y en handoff anterior; PostgreSQL keys 0, P42 writer/P21 worker OFF, bindings/ledger 0 según último preflight. **Edge WRITE UNVERIFIED, P42 provisioning y F16 financiero NO-GO**. T0 no elegido; custodio único PO, ventana 24h y revocación MANUAL futuros.

---

# F16-P42 — Windows ephemeral zero-row WRITE PASS; intento consumido (2026-10-17)

**Ejecución verificada por Codex en la computadora Windows del Product Owner**, bajo su autorización expresa para `P42-WRITE-EPHEMERAL-20261017-01`. Checkout sincronizado por fast-forward a `0b011104f84f4e12d7bfe738ffc9ecce1df6f6f2`, limpio antes de ejecutar; ejecutor, parser importado y SQL coincidentes con ese commit. CI `39033226251` y PostgreSQL Lab `39033226233`: **SUCCESS observado** para ese HEAD. PR #44 permanece OPEN/DRAFT. Cinco pruebas offline dirigidas del nuevo gate: **5/5 PASS**; no se repitió localmente la suite histórica ni compras.

**Preflight:** Supabase CLI `2.121.0`, psql `17.11` con hash validado, CA oficial vigente comparada por bytes con el endpoint público HTTPS, sesión CLI y acceso al proyecto confirmados por metadatos privados read-only. No se publicaron ruta CA, certificados, hosts, credenciales ni salida privada. Lock nuevo ausente antes de iniciar; sin clientes PostgreSQL activos ni transcripción obligatoria detectada.

**Una única ejecución** de `scripts/f16-p42-ephemeral-zero-row-write-once.mjs`, SQL inmutable `supabase/queries/f16_p42_ephemeral_zero_row_write_probe_ONCE.sql` (blob `cdd7bc9033671fea01263d55e05510d7e82a6cdc`): una invocación de credencial CLI temporal oficial, un psql con TLS `verify-full`, identidad `session_user` efímera y `current_user=postgres`, INSERT protegido por `WHERE false` (**0 filas, sin bytes secretos**), **ROLLBACK** y postflight READ ONLY. Exit code **0** y marcadores exactos:

```text
P42_EPHEMERAL_ZERO_ROW_WRITE_PASS
P42_EPHEMERAL_ZERO_KEYS_GATES_OFF_POSTFLIGHT_PASS
P42_EDGE_SECRET_WRITE_UNVERIFIED_NO_PROVISIONING_NO_PAYMENT
```

**Postflight del SQL aprobado:** claves P42 **0**, writer P42 **OFF**, worker P21 **OFF**, bindings **0** y ledger **0**. La guarda previa también confirmó RPC P42 sin EXECUTE para `service_role`. La solicitud CLI puede crear/renovar el rol temporal administrado; ese efecto acotado estaba autorizado. No se observó un TTL concreto. Salidas CLI/psql capturadas en memoria privada; solo marcadores sanitizados registrados. Sin contraseña permanente, reintentos, borrado de locks, claves reales, Edge Secrets, activaciones financieras ni despliegues.

**Intento CONSUMIDO:** lock `p42-write-ephemeral-20261017-01.lock` preservado; no relanzar este ID ni P43/P43B. Informes operativos sanitizados y bloqueos históricos conservados localmente. El PASS acredita únicamente el INSERT cero filas y el canal temporal probado; **no** acredita inserción de material criptográfico ni permisos de escritura Edge. **Edge Secrets WRITE sigue UNVERIFIED; provisión P42 y F16 financiero NO-GO.** Codex se detuvo en Supabase tras PASS; cualquier siguiente operación requiere autorización independiente.

---
# F16-P42 — hosted PostgreSQL zero-row WRITE rolled back; ephemeral login pending (2026-10-17)

**GO PO:** permiso para acreditar canal administrativo con operación inocua y delimitada, **sin claves ni cobros**. PR #44 DRAFT, rama `f13/section-titles-20261012`, Brain OS 1.4.1.

**REAL alojado Supabase `mrybvqdebbgcayuvgkkr`, ejecutado por ChatGPT:**
- `cli_login_postgres` existe y tiene `pg_has_role(...,'postgres','SET')=true`. Conector usa `postgres`, que **no** puede `SET ROLE cli_login_postgres`; esto no simula autenticación efímera real.
- `postgres` ejecutó `INSERT ... SELECT NULL::bytea ... WHERE false` bajo `BEGIN; ... ROLLBACK`, **0 filas**. Postflight read-only independiente: P42 keys 0, writer OFF, P21 OFF, bindings 0, ledger 0, `service_role` sin EXECUTE. No secretos generados ni escrituras persistentes.
- 8 Edge Functions alojadas inspeccionadas por fuente: ninguna contiene referencia textual directa a `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX`. No demuestra inexistencia de consumidores indirectos ni privilegios de Edge Secrets. El conector **no tiene** Management Secrets API.
- Detalle y limitaciones: `docs/PAZO_F16_P42_HOSTED_PRIVILEGE_ZERO_ROW_GATE_20261017.md`.

**Preparación P42 solo para estación Windows privada (NO ejecutada):**
- SQL fijo `supabase/queries/f16_p42_ephemeral_zero_row_write_probe_ONCE.sql`, código `scripts/f16-p42-ephemeral-zero-row-write-once.mjs`, pruebas `src/features/supporter/testing/f16P42EphemeralZeroRowWriteOnce.test.mjs`.
- Gate único nuevo `P42-WRITE-EPHEMERAL-20261017-01`: solo emisión CLI efímera separada (puede actualizar rol), TLS verify-full + CA, `session_user` temporal y `SET ROLE postgres`, INSERT de 0 filas/ROLLBACK y postflight; lock `p42-write-ephemeral-20261017-01.lock`. No relanzar P43/P43B ni borrar locks.
- CI inicial `#39032977127` FAILURE **solo test de regex que emparejó patrón defensivo**, 985/986 tests PASS y PG lab SUCCESS `#39032977155`; corregido por commit `840c573ee2cfb0e351bc50228211121debf8215a`. **CI del commit corregido por confirmar**; no pedir ejecutar script hasta PASS del HEAD.
- Edge Secrets READ/WRITE permisos **sin verificar**; ningún GET/POST/DELETE de secrets, ningún token extraído, ninguna provisión `P42_V1`, `T0` no fijado.
- El PO continúa custodio único para futura clave 24h y revocación manual. F16 financiero **NO-GO**.

**Siguiente paso concreto:** verificar CI de `840c573`; si PASS, el PO ejecuta **una sola vez** el script nuevo en su Windows privado usando la CA previamente descargada, sin compartir credenciales ni rutas sensibles, y devuelve SOLO los tres marcadores sanitizados. Si BLOCKED, no reintentar. Después determinar método privado de verificación de permisos Edge sin crear secreto; el GO actual no autoriza probar POST/DELETE.

**Marcador:** `P42_POSTGRES_ZERO_ROW_HOSTED_ROLLBACK_PASS_EPHEMERAL_OPERATOR_PENDING_EDGE_WRITE_UNVERIFIED`.

---

# F16-P42 — transporte privado simulado verificado; hosted NO-GO (2026-10-17)

**Autoridad PO:** «ok go» para preparación y pruebas sin credenciales reales. **No** autoriza claves P42, nuevo acceso efímero al DB, Edge Secrets hosted, SQL WRITE, activación financiera ni despliegues. **Rama:** `f13/section-titles-20261012`; **PR #44 DRAFT**; Brain OS 1.4.1.

**Implementación acotada:**
- `scripts/f16-p42-private-transport-lab.mjs`: transportes simulados en memoria `POST/GET/DELETE` y `pg.query({text,values})`, únicamente bytes sintéticos `a7`. Sin llamadas de red, SQL real, secretos productivos, CLI, logs, `.env`, generar claves o tocar Supabase.
- `src/features/supporter/testing/f16P42PrivateTransportLab.test.mjs`: 12 casos sobre orden de operaciones, ventana 24 h heredada del contrato, compensación de fallo DB, timeouts tras mutación, revocación manual simulada, ausencia independiente y salidas sanitizadas.
- `docs/PAZO_F16_P42_PRIVATE_TRANSPORT_SIMULATION_GATE_20261017.md`: diseño, evidencia y límites. Los documentos P42 previos se reutilizaron, no reemplazaron.
- **Commits:** código `9bbc73c92dec9f36d7d099eea1b53ff1422dd0e2`; tests `afe2b5a3ca67464588b65c606d67a866abe2627f`; gate doc `dc2df940ece77e4599dffbec3664193788693fc7`.
- **Verificación:** prueba del prototipo local 12/12 PASS; workflow **CI SUCCESS #39032204533** y **F16 Disposable PostgreSQL Lab SUCCESS #39032204576** en commit de tests. Workflow del commit documental: **PG Lab SUCCESS #39032275290**, CI **in_progress** al registrar este checkpoint. No declarar HEAD final CI PASS hasta consultarlo. Fallos ajenos Vercel por límite de builds no equivalen a fallo del laboratorio P42.

**Límites:** P43B read-only anterior PASS (informe PO), lock consumido. Permisos WRITE hosted, TLS/CA operator, Management API autenticada, revocación real, consumidores Edge, backup/snapshots y T0 **NO verificados**. 0 claves P42 según el último preflight anterior, sin nueva consulta alojada por este gate. P42 writer OFF, P21 OFF, ledger/beneficios/checkout/PayPal Live **NO-GO**. PO custodio único, vigencia 24h desde futuro T0 UTC y revocación manual siguen vigentes.

**Siguiente gate único:** comprobar CI del HEAD actualizado, luego preparar protocolo **separado** de auditoría de privilegios WRITE con petición de **GO explícito nuevo** antes de cualquier acceso hosted. Un GO todavía posterior será necesario para generar y entregar una clave real; **no** inferirlo de este «ok go».

**Marcador:** `P42_SYNTHETIC_TRANSPORT_CODE_CI_PASS_HOSTED_UNTOUCHED_FINANCIAL_NO_GO`.

---

# F16-P42 — preparación de dos canales privados completada en laboratorio, hosted NO-GO (2026-10-17)

**GO limitado por PO:** «ok go» tras `P43B_EPHEMERAL_DB_READ_ONLY_PASS` autorizó **PREPARAR/AUDITAR SOLO EN LABORATORIO** el canal PostgreSQL parametrizado + Supabase Edge Secrets privado. Se reutilizó el diseño de `docs/PAZO_F16_P42_24H_CUSTODY_EXPIRY_REVOCATION_GATE_20261016.md`, `docs/PAZO_F16_P42_SINGLE_CUSTODIAN_SAFE_ALTERNATIVE_20261016.md` y pruebas backup PG17. No usar el GO para otra conexión PAZO, emisión de nuevo `cli_login_postgres`, escritura hosted, secreto, modificación de seguridad, pagos o despliegue.

**Implementación en PR #44 DRAFT:**
- `scripts/f16-p42-private-dual-channel.offline.mjs` (sin red/DB/CLI/env/llaves reales) y `src/features/supporter/testing/f16P42PrivateDualChannelOffline.test.mjs` (contrato de `$1`–`$4` con parámetro BYTEA, TTL 24h exactas UTC y descriptores HTTP `POST/GET/DELETE /v1/projects/{ref}/secrets`, solo nombre Edge `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX`; rechazo de material productivo; simulación de compensación fail-closed).
- `scripts/f16-p42-backup-exclusion-pg17-lab.sh` extendido dentro de PG17 desechable para `PREPARE/EXECUTE` INSERT sintético `P42_V2` (bytes fijos `a7`), DELETE exacto `P42_V2`, 24 horas, ROLLBACK y conservación de `P42_V1` ficticia; no es prueba de protocolo client-side `pg`, roles WRITE hosted ni Edge real.
- Diseño/limitaciones `docs/PAZO_F16_P42_PRIVATE_DUAL_CHANNEL_OFFLINE_GATE_20261017.md`. Management API verificada contra documentación Supabase: `POST/GET/DELETE https://api.supabase.com/v1/projects/{ref}/secrets` por HTTPS; body privado vs CLI `NAME=VALUE` (argv) o `--env-file` (fichero). Necesita OWNER/ADMIN + permiso `edge_functions_secrets_write/read` y token privado; NO pedir ni exponerlos ahora. El nuevo secret sería de alcance proyecto y disponible inmediatamente, no exclusivamente de función.

**Evidencia pruebas:** último commit técnico `93000826218ae470ee0e2d9816e676b91cfd6997`: workflow **CI #39031383944 SUCCESS**, **F16 Disposable PostgreSQL Lab #39031383885 SUCCESS**, ambos con datos sintéticos y sin hosted. El commit documental posterior `0c2ba15e602d0064d47208bf73357c14e3fa75e5` no altera scripts/test; sus nuevos workflows se deben comprobar antes de declarar ese HEAD PASS. **No se ha ejecutado el flujo HTTP ni un SQL de escritura real**.

**Estado de autoridad:** P43B PASS de lectura, su lock consumido, nueva credencial NO emitida en este gate; P42 clave real 0, T0 aún sin fijar, `enabled=false`/P42 writer OFF/P21 worker OFF/RPC EXECUTE denegado según último preflight, ninguna provisión Edge, ledger/checkout/pagos/beneficios NO-GO. Contrato futuro P42_V1 vigencia 24h con PO custodio ÚNICO y revocación MANUAL; riesgo humano y copias físicas todavía pendientes. El backup lógico excluye key_bytes pero no acredita snapshots alojados.

**Próximo gate lógico:** diseñar cliente privado real con bind parameters + transporte HTTPS sin logs de body, CI con mocks, guardas de proyecto/roles; después obtener **GO NUEVO específico para acreditar únicamente permiso WRITE hospedado de forma inocua/limitada** y disponibilidad Edge, sin generar clave. Un GO ulterior para P42 provisionamiento real/compensación y otro para activar finanzas. No relanzar scripts P43/P43B ni reutilizar IDs/locks.

**Marcador:** `P42_PRIVATE_DUAL_CHANNEL_SYNTHETIC_PASS_HOSTED_WRITE_AND_EDGE_UNVERIFIED`; F16 FINANCIAL NO-GO; PR #44 DRAFT.

---

# F16-P43B — PASS de acceso temporal CLI, avance a diseño canal privado WRITE (2026-10-17)

**Resultado comunicado por el Product Owner desde Codex Windows**, después del GO exclusivo `P43B-EPHEMERAL-20261017-01`:

```text
P43B_EPHEMERAL_DB_READ_ONLY_PASS
P42_STRUCTURAL_PASS_NO_PROVISIONING_AUTHORITY
P43B_NO_REAL_KEY_NO_CHECKOUT_NO_PAYMENT
```

**Interpretación restringida:** se ejecutó satisfactoriamente el nuevo procedimiento `scripts/f16-p43b-ephemeral-readonly-preflight.mjs` para autenticarse usando el rol temporal `cli_login_postgres` vía Supabase CLI y efectuar el SQL estructural P42 fijado por hash, con `PGSSLMODE=verify-full` y transacción SQL `READ ONLY`. Marcadores reportados por Codex; **no es una segunda auditoría de registros privados por ChatGPT**. El GO y lock `P43B-EPHEMERAL-20261017-01` quedan **CONSUMIDOS**, nunca relanzar el script ni borrar locks. Éxito NO significa que exista sesión/contraseña efímera vigente para siguientes operaciones; futuras emisiones requieren nuevo GO y protocolo propio. No usar contraseña PostgreSQL permanente para avanzar ni activación de JIT.

**Resolución:** desbloqueado el **canal de lectura administrativa temporal**; NO validado **canal de escritura privada parametrizada** para `supporter_private.p42_activation_signing_keys` ni entrega/retiro seguro del secreto Edge `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX`. **NO se generó/provisionó clave P42 ni se habilitó writer P42, worker P21, checkout, cobros, contabilidad o beneficios.** PR #44 DRAFT. Hosted P42 absoluto-expiry patch ya instalado anteriormente; no repetir.

**Próximo gate recomendado (SOLO DISEÑO/AUDITORÍA OFFLINE, SIN GENERAR CLAVES):**
1. **Reusar documentos existentes**: `docs/PAZO_F16_P42_24H_CUSTODY_EXPIRY_REVOCATION_GATE_20261016.md`, `docs/PAZO_F16_P42_OPERATOR_CHANNEL_DRY_RUN_NO_PROVISION_20261016.md`, `docs/PAZO_F16_P43_SANDBOX_KEY_PROVISIONING_SECURE_HANDOFF_20261016.md` y contrato `supabase/queries/f16_p42_provisioning_structural_preflight_READ_ONLY.sql`. No duplicar el diseño.
2. Auditar **sin conectarse** si el rol efímero de Supabase CLI con `SET ROLE postgres` puede respaldar futuras sesiones de escritura solo cuando se apruebe explícitamente, y cómo se pasará material por **bind parameters** sin SQL literal/logs/argv ni GitHub. Un READ ONLY PASS no demuestra WRITE. Diseñar pequeño laboratorio PG17 desechable para validar transacción parametrizada, compensación y bloqueo antes de probar hosted.
3. Validar un canal **secreto Edge de escritura/retirada en memoria** mediante interfaz oficial soportada (Dashboard/API/CLI) sin `NAME=VALUE` en argumentos, archivos `.env`, historial, chat o transcripciones. Exigir que ambos destinos estén disponibles y cuenten con operador/custodio verificado antes de crear bytes.
4. Mantener la política PO ya elegida de `T0` UTC futuro, `not_after=T0+24h` y revocación manual supervisada; verificar capacidad real de `unset` y `DELETE` supervisados y riesgos de backups/Edge secrets compartidos. Necesita custodio disponible durante vencimiento y decisión de riesgo residual.
5. Preparar postflight **metadata-only** para una fila `P42_V1` `enabled=false`, gate OFF, sin `EXECUTE`, y secret Edge presente, distinto del SQL P43B que exige **cero** filas. También preparar procedimiento compensatorio Edge/DB; no prometer atomicidad entre almacenes.
6. Tras revisión y tests offline, solicitar GO NUEVO e independiente para cualquier prueba hosted de permisos/write; un GO aún posterior para generar/provisionar misma clave en Edge + DB. Ningún GO implícito para compras/PayPal/live.

**Estado del hito:** `P43B_EPHEMERAL_DB_READ_ONLY_PASS_REPORTED_AND_CONSUMED`; **P42 PRIVATE WRITE + EDGE SECRET CHANNEL UNVERIFIED**; **F16 FINANCIAL NO-GO**.

---

# F16-P43B — GO explícito del Product Owner: único acceso temporal CLI READ ONLY (2026-10-17)

**GO inequívoco recibido:** «Autorizo P43B». Se concede **exactamente UN intento** `P43B-EPHEMERAL-20261017-01` usando el script `scripts/f16-p43b-ephemeral-readonly-preflight.mjs` preparado en la rama `f13/section-titles-20261012`, PR #44 DRAFT, según `docs/PAZO_F16_P43B_EPHEMERAL_CLI_READONLY_PREPARATION_20261017.md`. **Preparación CI validada previamente:** commit `5b7afe615eecffaf07f59c7cf8676a83191dcf1a`, workflow CI `39030040038` SUCCESS y laboratorio PostgreSQL desechable `39030039986` SUCCESS; el procedimiento del script y el lock `p43b-ephemeral-readonly-one-attempt-20261017-01.lock` revisados sin drift. Este commit de documentación posterior sólo registra el GO; no altera código ejecutable. **No hay ejecución desde este chat.**

**Autorización técnica concreta:** Codex en estación Windows privada de PO verifica estado local, versiones de CLI `2.121.0`, psql `17.11`, CA oficial y hash de SQL `ac9246a0106ebefd6d425a549d9f207242760eec`; **si falla preflight, STOP sin credencial ni conexión**. Confirmar lock P43B ausente sin borrar bloqueos históricos; no pasar contraseñas ni exportaciones crudas por chat/CLI history/GitHub. En una ejecución desde consola confiable sin capturas, invocar `node .\scripts\f16-p43b-ephemeral-readonly-preflight.mjs --execute-approved-readonly --attempt-id P43B-EPHEMERAL-20261017-01 --ca <CA local verificada>` después de resolver ruta privada no secreta. El mecanismo oficial `supabase db dump --linked --project-ref mrybvqdebbgcayuvgkkr --dry-run --agent no` **PUEDE CREAR/ACTUALIZAR** rol temporal `cli_login_postgres`, aunque no hace dump real ni escribe datos de negocio. Esta limitada mutación de credencial administrada por Supabase está aprobada SOLO para este intento. Capturar respuesta CLI y psql exclusivamente en memoria privada, sin stdout/stderr crudos. Ejecutar **UNA única consulta SQL estructural READ ONLY** del archivo versionado, TLS `verify-full` y transacción de solo lectura con `ROLLBACK`. Emitir sólo PASS/BLOCKED sanitizado; ante error o resultado ambiguo, **no repetir y no borrar lock**.

**No autorizado:** acceso JIT/Temporary Access, cambio o reintento de password permanente, P43 histórico consumido, SQL Editor, migraciones/DDL/DML de negocio, nuevo script alternativo ni host alterno, HMAC/signing keys, Edge Secrets, grants, P21/P42 worker/writer, PayPal Sandbox/Live, checkout, ledger, pagos, beneficios o despliegues. PASS sólo valida acceso temporal **READ ONLY**, no permiso de escritura ni provisión P42.

**Estado:** `P43B-EPHEMERAL-20261017-01_APPROVED_NOT_EXECUTED`. En cuanto Codex reporte, actualizar handoff con únicamente marcador sanitizado y detenerse para otro GO. PR #44 permanece DRAFT y F16 financiera NO-GO.

---

# F16-P43B — acceso efímero Supabase CLI, preparación offline sin conexión (2026-10-17)

**GO recibido:** «ok go» autorizó solo **PREPARAR Y AUDITAR** alternativa CLI efímera al fallo P42 de contraseña nueva. **NO autoriza otra conexión, solicitud de credencial temporal que cree/renueve `cli_login_postgres`, uso de contraseña privada, JIT, DDL/DML, P42 secret ni finanzas.** Histórico `P43_EPHEMERAL_DB_READ_ONLY_PASS` documentado; el intento viejo P43 y `P42-NEW-PASSWORD-20261017-01` siguen consumidos.

**Hallazgo oficial 2026-10-17:** mecanismo `cli_login_postgres` por Supabase CLI *sin contraseña de base* es DIFERENTE del Temporary Access/JIT Dashboard; la CLI puede crear/refrescar rol y contraseña temporal al operar sin `SUPABASE_DB_PASSWORD` (doc: `https://supabase.com/docs/guides/troubleshooting/permission-denied-when-deleting-the-cli_login_postgres-role-808bae`), **por ello una ejecución futura no sería estrictamente read-only en metadatos de autenticación aunque el SQL esté en READ ONLY**. JIT requiere opt-in, SSL enforcement y mapeo usuario→rol; NO activarlo ni cambiar password actual.

**Nuevo gate P43B, INERTE:** `docs/PAZO_F16_P43B_EPHEMERAL_CLI_READONLY_PREPARATION_20261017.md`; `scripts/f16-p43b-ephemeral-readonly-preflight.mjs`; `src/features/supporter/testing/f16P43BEphemeralReadOnlyPreflight.test.mjs`. El script hereda flujo de P43 histórico, valida blob SQL `ac9246a0106ebefd6d425a549d9f207242760eec`, pin Supabase CLI `2.121.0` y psql `17.11`; obliga ID `P43B-EPHEMERAL-20261017-01`, bandera de GO y lock **nuevo** `p43b-ephemeral-readonly-one-attempt-20261017-01.lock`, sin borrar lock P43/P42. CLI `db dump --linked ... --dry-run` (NO dump real) en proceso local privado y con credenciales efímeras stdout nunca impresas, valida host/usuario/role, invoca UN `psql` TLS `verify-full` y PGOPTIONS default READ ONLY, usando SOLO SQL estructural preflight; emite solo PASS/BLOCKED sanitizado. Tests offline nuevos incluidos en `npm run test:f16:synthetic`; CI `node --check` explícito.

**Estado CI:** comprobar conclusiones concretas de los workflows del commit final ANTES de declararlo listo para revisión; al preparar handoff, CI estaba en ejecución. **No se hizo** invocación CLI, SQL hosted, prueba TLS remota, PAT/JIT, escritura, secret, checkout, compra ni deploy; PR #44 DRAFT; F16 NO-GO. Tampoco se ha validado permiso WRITE: próximo gate tras un READ ONLY PASS debe resolver Edge Secret + PostgreSQL admin parametrizado, backups y revocación.

**Próximo paso:** revisar nuevo script/test y CI; pedir GO único *para la emisión potencial del rol temporal CLI y la única consulta READ ONLY*; si no hay GO, detenerse. No emitir credencial desde este chat; ejecutar solo en equipo privado con Codex y sin capturar CLI crudo. El PO no necesitaría introducir la contraseña DB, si CLI sigue autenticado. Si el host/pooler falla, no repetir ni inferir que password nueva es errónea.

---

# F16-P42 — intento nueva contraseña consumido: PSQL_EXIT_NONZERO (2026-10-17)

**Resultado reportado por el PO después del GO expreso:** `P42_TLS_READ_ONLY_ONCE_BLOCKED_AFTER_CONNECTION_ATTEMPT_PSQL_EXIT_NONZERO`. Corresponde al intento único `P42-NEW-PASSWORD-20261017-01`, con script revisado `0adfa50dd5fac3adf05a3e36674dd834b262b704`, lanzado por Codex de modo privado con password PostgreSQL NUEVA introducida únicamente por PO. PSQL arrancó, devolvió código de salida no cero y el script saneó la causa. **No existe PASS**. Sin evidencia de autorización, rechazo exacto de password, error TLS o conectividad; stdout/stderr privados deliberadamente descartados. **GO one-shot CONSUMIDO; NO repetir, borrar locks, usar P43 previo, resetear password ni abrir conexiones improvisadas**. Ninguna clave P42, Edge secret, DDL/DML, pagos, ledger, worker o checkout autorizado.

**Verificación independiente read-only desde ChatGPT:** Supabase `get_project` devolvió PAZO **ACTIVE_HEALTHY** (DB PostgreSQL 17.11). Consulta de agregación (sin texto crudo, últimos 24h por defecto) sobre Supabase logs: `supavisor_logs` contó 11 eventos, **3** con patrón genérico de rechazo de autenticación; `pgbouncer_logs` 11633 con 0 de ese patrón; `postgres_logs` 52 con 0 de ese patrón. **NO ES CORRELACIÓN INDIVIDUAL NI PRUEBA de causa de nuestro intento**; puede existir ruido histórico u otros clientes. Documentación oficial confirma que Supavisor puede conservar temporalmente cache de contraseña anterior después de una rotación, rechazando una contraseña nueva CORRECTA: `https://supabase.com/docs/guides/troubleshooting/supavisor-error-password-authentication-failed-after-password-rotation`. También podría haber otra causa de psql `exit!=0`, no se ha verificado el certificado ni la autenticación de esta sesión por separado.

**Recomendación operativa:** dejar de consumir intentos one-shot a ciegas. Mantener P42 sin aprovisionar; **investigar/migrar a canal oficial de credenciales temporales** que antes obtuvo `P43_EPHEMERAL_DB_READ_ONLY_PASS`, preparando un **NUEVO** plan read-only diagnosticable con etapas sanitizadas, alcance/permiso/grants, custodia y revocación; no reutilizar P43 consumido ni activar acceso/SSL enforcement sin nuevo GO. Otra alternativa documentada por Supabase es diagnóstico directo (sin pooler) para diferenciar password vs cache, pero requeriría conectividad IPv6 y **nueva autorización** tras análisis, además de evitar extraer la contraseña. No realizar ninguna de estas conexiones ahora. La rotación ya está hecha y no se revierte. Puede haber caché transitoria del pooler. PR #44 sigue DRAFT y F16 financiera NO-GO.

---

# F16-P42 — GO EXPLÍCITO PO: único intento PostgreSQL privado READ ONLY (2026-10-17)

El PO respondió **«Autorizo P42»** inmediatamente después de la revisión del commit `0adfa50dd5fac3adf05a3e36674dd834b262b704` y de la pregunta inequívoca para **UNA prueba privada READ ONLY**. Esta es autorización de ejecución **exclusivamente** del intento `P42-NEW-PASSWORD-20261017-01`, según `docs/PAZO_F16_P42_NEW_PASSWORD_PRIVATE_READONLY_ONCE_PROCEDURE_20261017.md` y `scripts/f16-p42-session-pooler-tls-readonly-once.ps1` del commit revisado. **NO se ha ejecutado por ChatGPT**; el ejecutor será Codex en la computadora Windows del PO.

Codex debe seguir el procedimiento exacto: sincronización segura conservando cambios locales, chequeos offline de `pwsh`, `psql`, CA oficial y hostname del Session Pooler PAZO ya confirmado, verificar ausencia del lock/resultado de ese ID, abrir **una** ventana privada fuera de grabaciones; apartarse de esa ventana antes del prompt. PO teclea personalmente su nueva password PostgreSQL en entrada oculta. **No leer/recibir/transcribir/registrar contraseña, PGPASSWORD, conexiones URI, stdout/stderr privados, logs crudos o pantalla del prompt.** `PGSSLMODE=verify-full` y contrato SQL READ ONLY + ROLLBACK. Codex solo consulta el archivo local del resultado de marcador estático, sin inspeccionar secretos, y comunica PASS/BLOCKED. Un intento consumido NO se repite, aunque resulte BLOCKED o ambiguo; no borrar lock. Si hay desajuste de versión/código, abortar antes de conexión y solicitar revisión; no modificar el script aprobado.

Esta autorización **NO** incluye P43, acceso temporal, cambio de password, SQL Editor, DDL/DML, provisionamiento de clave P42, Edge Secrets, permisos, pagos, PayPal, workers, checkout, ledger, beneficios ni despliegues. PR #44 continúa DRAFT y finanzas NO-GO. Un PASS demuestra solo autenticación y TLS cliente→pooler y transacción read-only; no habilita escrituras ni secretos.

**Estado:** `P42-NEW-PASSWORD-20261017-01_APPROVED_NOT_EXECUTED`. Al completarse, registrar únicamente marcador sanitizado en handoff y detenerse a la espera de siguiente GO.

---

# F16-P42 — TLS cliente corregido y procedimiento de contraseña nueva preparado (2026-10-17)

**GO vigente: integrar correcciones locales, pruebas offline y procedimiento; NO conectar ni pedir contraseña.** El parche de Windows fue preservado y el clon sincronizado por fast-forward hasta 98fd59e9054a7cedfad1052c97ee90c969c34191 antes de integrar. La contraseña nueva informada por PO sigue SIN VERIFICAR; no atribuir el fallo histórico a password incorrecta.

**Cambio de contrato:** scripts/f16-p42-session-pooler-tls-readonly-once.ps1 exige TLS cliente→Session Pooler por libpq verify-full, CA/hostname, GSS desactivado y TLS1.2–1.3. El SQL solo verifica base postgres y transacción READ ONLY, con ROLLBACK; se eliminó pg_stat_ssl como evidencia de ese enlace. El TLS pooler→PostgreSQL es otro tramo y no se declara validado por este gate. Se conservan la clasificación sanitizada y limpieza corregidas del parche local.

**Preparación verificable:** autorización explícita por switch e ID, lock CreateNew antes del prompt y resultado estático exclusivo en estado privado local. Pruebas offline incorporadas (27 checks aislados); el workflow CI ahora comprueba TLS cliente y ejecuta esas pruebas, sin conexión alojada. No se publicaron certificados, contraseñas, backups ni informes privados. Revisar las conclusiones CI del nuevo commit antes de declarar SUCCESS.

**Siguiente paso único, BLOQUEADO hasta GO nuevo:** PO revisa el commit y autoriza UNA conexión con la contraseña NUEVA por el procedimiento [P42 privado](PAZO_F16_P42_NEW_PASSWORD_PRIVATE_READONLY_ONCE_PROCEDURE_20261017.md), intento P42-NEW-PASSWORD-20261017-01. Codex prepara rutas/host ya confirmado, abre ventana privada, deja de capturar/interactuar y lee solo marcador sanitizado. Ningún prompt, lock de ese intento o conexión se ha iniciado durante esta integración. No repetir ni borrar locks consumidos; no ejecutar P43/P44 ni reutilizar credenciales históricas.

**Alcance excluido:** reset de password, cambios Supabase/SQL Editor, signing keys P42, DDL/DML, checkout, worker/writer, ledger, cobros, beneficios o despliegues. PASS futuro será acceso READ ONLY, no permisos de escritura ni provisión. PR #44 sigue DRAFT y F16 financiera NO completada.

---

# F16-P42 — PO confirma restablecimiento de password PostgreSQL (2026-10-17)

**Nuevo dato de PO:** "ya la cambié, muy tarde". El operador **ya restableció la contraseña del rol PostgreSQL desde Supabase Dashboard**, siguiendo una instrucción anterior. **La nueva contraseña NO se recibió ni se inspeccionó**, y su autenticación contra Session Pooler continúa SIN VERIFICAR. No solicitarla por chat ni registrar en GitHub, logs o scripts. No repetir restablecimiento ni probar el password anterior. Este evento revoca la recomendación previa de "pausar rotación si aún no se ejecutó": la rotación YA se realizó.

**Postflight remoto de solo lectura, 2026-10-17:** Supabase Management API consultada y PostgreSQL SQL executor ejecutó exclusivamente `select current_database() = 'postgres' as correct_database, current_setting('server_version_num')::integer >= 170000 as postgres_17_or_newer, now() is not null as select_works;`: los tres valores `true`. **Esto demuestra que la DB responde por la ruta administrada, NO que la contraseña nueva autentique por pooler, que PAZO frontend/end-to-end funcione, ni que backups privados no se afecten.** Auditoría previa indica bajo riesgo app Vercel/Edge, pero clientes persistentes `psql/pg_dump` con contraseña antigua necesitarían actualizarse.

**Acción siguiente segura:** Codex local termina auditoría offline y guarda bajo revisión los cambios de clasificación/TLS aún NO COMMIT/PUSH. Preparar conexión privada a PostgreSQL con contraseña NUEVA introducida por PO en prompt oculto, sin captura ni registro; verificar TLS cliente→pooler vía `sslmode=verify-full`, y SQL `SELECT` READ ONLY sin tratar `pg_stat_ssl` del backend como prueba TLS cliente→pooler. Cualquier intento remoto requiere **GO nuevo y explícito**. No generar/provisionar clave P42, no duplicar P43 consumido, no activar worker, checkout, cobros, beneficios, ni modificar DB bajo un mero GO de verificación. PR #44 DRAFT, F16 NO-GO.

---

# F16-P42 — auditoría offline Codex sobre falso bloqueo TLS (2026-10-17)

**Evidencia reportada por el PO, no inspeccionada en disco por este chat:** Codex informó auditoría local sin nuevas conexiones PostgreSQL, PowerShell/`psql`/2 CA correctos, 12 pruebas offline PASS, y modificaciones LOCALES SIN COMMIT/PUSH a `scripts/f16-p42-session-pooler-tls-readonly-once.ps1` para clasificación de fallos, limpieza de proceso y preferencia TLS. Informe solo disponible en Windows del PO: `continuidad/RESULTADO_P42_AUDITORIA_LOCAL_OFFLINE_20261017.md`; **no se ha leído el archivo íntegro**. El reporte no valida contraseña ni handshake remoto. No atribuir fallo a autenticación.

**Corroboración técnica independiente:** en GitHub remoto el script AÚN contiene `pg_stat_ssl WHERE pid=pg_backend_pid()` y `ssl = true` como condición de éxito, aunque `PGSSLMODE=verify-full` verifica el tramo **cliente→pooler**. Supavisor establece otra conexión **pooler→PostgreSQL**, que es la medida por `pg_stat_ssl` del backend. Por ello ese SQL puede rechazar el intento aun si el cliente verificó SSL del pooler y se autenticó. Fuente Supabase `https://supabase.com/docs/guides/troubleshooting/supavisor-and-connection-terminology-explained-9pr_ZO`; PostgreSQL `https://www.postgresql.org/docs/17/monitoring-stats.html`; Supabase `https://supabase.com/docs/guides/database/psql`. Ni esta observación ni los 12 PASS offline determinan por sí mismos la causa real del intento previo.

**Recomendación:** **pausar rotación** de password Postgres (si el PO no la hizo aún). Mantener pruebas y provisiones bloqueadas. Para auditar las mejoras locales: Codex debe preparar diff sanitizado, ejecutar verificaciones offline y subir únicamente la corrección bajo revisión a la rama activa sin incluir secretos, claves, certificados ni informes privados; entonces ChatGPT puede revisar el patch remoto. Evaluar después un **nuevo procedimiento** para credenciales EFÍMERAS oficiales basado en P43 (no reutilizar one-shot P43 consumido), separación explícita de acceso read-only vs autorización administrative-write y custodia de P42. Todo intento remoto necesita GO nuevo. El estado de rotación de la contraseña permanente **no fue informado por el PO** al comunicar el reporte; confirmar antes de planificar nueva autenticación.

**Gates sin cambios:** segundo intento password candidata BLOCKED, GO consumido; sin escrituras Hosted, key real 0, P21/P42 OFF, ningún checkout/beneficio/ledger autorizado, PR #44 DRAFT.

---

# F16-P42 — intento privado con contraseña candidata BLOCKED tras conexión (2026-10-17)

**Resultado reportado por Codex/Product Owner:** `P42_TLS_READ_ONLY_ONCE_BLOCKED_AFTER_CONNECTION_ATTEMPT`. Las precondiciones locales fueron declaradas PASS (PowerShell 7, `psql`, verificación de CA/canal); script `scripts/f16-p42-session-pooler-tls-readonly-once.ps1` alcanzó una única ejecución de `psql` y finalizó BLOCKED. El script sanitiza por diseño todas las causas posteriores a `$process.Start()`: **no se puede atribuir** a password incorrecto, TLS/certificado, red/pooler, tiempo de espera, ni a una condición de script. **No hubo retries, escrituras o cambios Supabase.** El PO tecleó personalmente contraseña candidata desde Google Password Manager sin revelar el valor a Codex ni chat.

**Verificación independiente NO MUTADORA:** Management API Supabase `get_project` reportó `ACTIVE_HEALTHY` us-east-1. Agregaciones de logs de Postgres/pooler de últimas 24h no contienen suficiente contexto/correlación para atribuir causa a la ejecución individual (no exponer mensajes crudos ni IP/usuario). No inventar diagnóstico de fallo.

**Gate:** segundo GO one-shot otorgado 2026-10-17 **CONSUMIDO** por el intento. `P42_CANDIDATE_PASSWORD_NOT_VALIDATED_SESSION_POOLER_READONLY_BLOCKED_NO_RETRY`. **No** repetir `psql`, ni P43, probar variantes de contraseña, resetear DB, ejecutar SQL con secreto, habilitar JIT, generar/provisionar signing key, activar P21/P42, ledger, beneficios, suscripciones o cobros sin autorización adicional con alcance preciso. CA instalado en computadora no prueba handshake `verify-full` correcto.

**Próximo paso permitido:** análisis estático local *sin red y sin secreto* de `pwsh`/`psql` (versiones/rutas), formato/cadena de certificados CA (fechas, huella SHA-256 para comparación con origen oficial, validación offline), y argumentos/compatibilidad del script; no leer ni compartir valores de password, `PGPASSWORD`, archivos de credenciales, capturas de consola con prompt, mensajes crudos del error. Diseñar error reporting FUTURO mediante categorías generales verificables sin exponer IP/host/usuario/credenciales; solicitar nuevo GO antes de una conexión. Ruta de restablecimiento por Dashboard o acceso temporal aún **sin aprobación**. PR #44 DRAFT, F16 NO-GO.

---

# F16-P42 — nuevo GO puntual para prueba privada PostgreSQL READ ONLY (2026-10-17)

**PO aprobó literalmente «sí»** a realizar **UN** nuevo intento de conexión PostgreSQL **solo lectura** con contraseña candidata de origen privado en Google Password Manager (entrada sitio `supabase.com`, usuario `DigitalAppcorp's Project`; NO se conoce si es la password DB). Nunca extraer, copiar a chat, código, logs, SQL Editor, GitHub o agentes. Esta autorización nueva y específica sustituye solamente el NO-RETRY del intento P42 anterior por **un intento adicional**, sin autorizar repetición ilimitada, reset de la contraseña, CLI/JIT temporal, creación de claves P42, Edge secret, SQL de escritura, activación de worker o cobros.

**Ejecución pendiente en computadora local por el PO**, NO hecha desde ChatGPT: utilizar el script existente `scripts/f16-p42-session-pooler-tls-readonly-once.ps1` (no modificar ni recrear) con `pwsh` PowerShell 7 en terminal privada, CA certificado oficial descargado en su equipo, Host obtenido en Dashboard Connect → Session pooler, puerto 5432 y `postgres.mrybvqdebbgcayuvgkkr`; el script fuerza SSL `verify-full`, sesión `READ ONLY` y único `psql` con password por entrada oculta. Nunca aceptar Connection URI completa; evitar capturas de contraseña y consola grabada. Primero verificar localmente rutas y herramientas, sin adivinar. En ausencia de CA, host validado, PowerShell 7 o psql, **detenerse antes de intentar autenticarse**. No confiar en el nombre de entrada del gestor como prueba de pertenencia a este proyecto. El resultado de éxito esperado es `P42_SESSION_POOLER_TLS_VERIFY_FULL_READ_ONLY_PASS` + `P42_HOSTED_WRITE_PERMISSION_NOT_VERIFIED` + `P42_NO_PROVISIONING_NO_PAYMENTS`; cualquier `BLOCKED` consume el intento y requiere nueva evaluación. No reintentar automáticamente ni cambiar credenciales.

**Estado:** `P42_NEW_CANDIDATE_PASSWORD_READONLY_ATTEMPT_AUTHORIZED_NOT_EXECUTED`. Hosted P42 expiración absoluta instalado; claves 0, P21/P42 OFF y finanzas NO-GO. Handoff de resultado solo con código de estado sanitizado; PR #44 DRAFT.

---

# F16 — auditoría de impacto de rotación de contraseña PostgreSQL (2026-10-17)

**Petición PO:** investigar exhaustivamente impacto antes de restablecer password `postgres`; permitir SQL Editor solo si es seguro. **Se realizó exclusivamente lectura** en Vercel, repo, Edge desplegado, catálogo PostgreSQL y documentación oficial. **NO se rotó contraseña, no se hizo ALTER ROLE, no se generó/provisionó clave P42, no se usó SQL Editor con secreto.**

**Conclusión:** app Vercel/Edge de PAZO tiene **BAJO riesgo de ruptura directa** por rotación: 2 proyectos Vercel, 14 variables en total revisadas por **nombres/metadatos sin decrypt**, sin variables de credencial Postgres directa ni conectores; 8 Edge functions desplegadas examinadas, APIs Supabase, sin referencias detectadas a `SUPABASE_DB_URL/PGPASSWORD/DATABASE_URL/pg`; app usa publishable/anon keys. DB sin cron, servidores FDW, subscriptions ni Vault secret, sesión activa solo instantánea con clientes internos. **No garantiza ausencia de consumidores desconocidos:** equipos Windows, VPS/Hostinger, IDE/PSQL, conexiones esporádicas y trabajos locales no fueron accesibles.

**Riesgo operacional identificado:** `scripts/backup-database.ps1` usa conexión PG directa `psql/pg_dump/pg_dumpall`; alternativa A `%LOCALAPPDATA%/PAZO/CodexOps/connection.json` + credencial privada DPAPI `database.credential.xml`, potencial obsolescencia al rotar, alternativa B Supabase CLI admin temporal. No se constató si la opción A está configurada, ni tarea programada; **no rotar hasta comprobar**. Script de conexión P42 anterior no completó por no poseer contraseña. Tests CI utilizan PG17 sintético independiente.

**Recomendación:** no cambiar password simplemente para destrabar P42. Estudiar acceso temporal documentado de Supabase como camino alternativo (disabled por defecto, requiere SSL enforced, mapping rol y nuevo GO para cualquier cambio). Reset, si finalmente necesario, SOLO Dashboard `Database > Settings`, no SQL Editor ni `ALTER ROLE` improvisado. SQL Editor válido para DDL sin secretos como expiración P42 ya instalada; **NO** pegar `key_bytes` HMAC en SQL Editor por historial/logs. P42 doble almacén y revocación aún NO-GO. **Documento íntegro:** `docs/PAZO_F16_DB_PASSWORD_ROTATION_IMPACT_AUDIT_20261017.md`.

**Siguiente intervención humana segura, solo metadatos locales:** PO puede confirmar existencia (no abrir/capturar contenido) de `%LOCALAPPDATA%/PAZO/CodexOps/connection.json` y `database.credential.xml` y si se ejecuta respaldo automático desde esa máquina, además de confirmar cualquier conector no gestionado en VPS/IDE. Sin pedir credenciales al PO, sin reintentar scripts históricos one-shot o P43. Continuar desde ese dato o estudiar estado SSL/JIT de forma no mutadora. PR #44 permanece DRAFT, worker/writer/ledger y beneficios OFF.

---

# F16-P42 — Edge Secrets: ausencia del nombre P42 confirmada visualmente (2026-10-17)

**Evidencia visual aportada por el Product Owner:** Dashboard Supabase de PAZO > Edge Functions > **Secrets** > lista de **Custom secrets**, búsqueda exacta por nombre `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX` mostró `No results found`. Resultado: **no hay entrada visible con ese nombre en Custom secrets, bajo el filtro mostrado**. Esto NO es una exportación integral del inventario ni prueba de aislamiento físico de variables de otras funciones; no confundir con una consulta en la lista de Edge Functions que se había realizado anteriormente. No se pulsó `Save`, no se estableció valor y ningún byte secreto se compartió.

**Reconciliación con el postflight previo de PostgreSQL:** `supporter_private.p42_activation_signing_keys=0`, P42 writer OFF, P21 worker OFF, RPC con expiración absoluta y sin EXECUTE para roles de aplicación, ledger y P40 en cero. **Se comprobó ausencia nominal en los dos destinos; esto NO da GO de provisión.** Permanecen bloqueantes: canal administrativo privado PostgreSQL de escritura con TLS `verify-full` y tratamiento parametrizado sin registros de secretos (en el intento anterior no estuvo disponible la contraseña existente); validación de revocación real Edge sin secretos; inventario y retención de backups/administradores; riesgo de custodio único y horario T0/Texp; consentimiento explícito PO de generación/provisión. No intentar otro `P43` ni regenerar contraseñas por inferencia, no usar SQL Editor para pegar material de clave, no activar checkout/worker/grants/ledger. Próximo paso: preguntar al PO solo si dispone de la contraseña **existente** en un gestor privado, sin solicitar que la comparta en chat. PR #44 sigue DRAFT y F16 pagos NO-GO.

---

# F16-P42 — custodia 24h: preflight privado READ-ONLY, provisión NO-GO (2026-10-16)

**Siguiente gate autorizado por `ok go`: auditar custodia/revocación P42 tras instalación del parche absoluto.** Se completó auditoría solo lectura alojada y escaneo del código desplegado de **8** Edge Functions, SIN nueva clave ni ejecución de procedimientos de borrado; resultado `P42_CUSTODY_READONLY_AUDIT_PASS_BUT_PROVISIONING_NO_GO`.

**Postflight:** función P42 en hosted mantiene cutoff `v_key_end IS NULL` y `clock_timestamp()>=v_key_end`; 0 signing keys, P21/P42 OFF, 0 P40, 0 ledger, 0 reversals, RLS+FORCE RLS en signing_keys, `anon/authenticated/service_role/PUBLIC EXECUTE=false`. `pg_stat_ssl.ssl=true` en sesión del conector, pero canal administrativo local `verify-full` + WRITE del Product Owner **NO VERIFICADO**. SQL config observada `log_statement=ddl`, `log_parameter_max_length=-1`, `log_parameter_max_length_on_error=0`, `log_min_error_statement=error`; no afirmar ausencia de logs. Nunca pegar bytes de clave en SQL Editor o chat. Nunca reejecutar parche P42 instalado.

**Superficie Edge:** `list_edge_functions` mostró 8 funciones `ACTIVE`, inspeccionados los contenidos desplegados de las 8 con `get_edge_function`, ninguna referencia literal a `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX` o RPC/tabla P42. **Esto NO demuestra aislamiento de secrets compartidos del proyecto ni ausencia de lectores dinámicos**, y la integración no dispone de gestión/listado de secretos Edge. Inventario NAME-ONLY requiere verificación del PO en Dashboard (jamás valores). Backup lógico del script versionado ya excluye key_bytes y PG17 restore PASS histórico; no volver a hacerlo. Otros backups/snapshots/accesos no certificados.

**Dependencia pendiente que realmente bloquea:** intento local one-shot previo Session Pooler/TLS `P42_TLS_ONE_SHOT_EXISTING_PASSWORD_UNAVAILABLE_BLOCKED_NO_HOSTED_CHANGE`; no repetir ni reciclar P43 ephemeral, no resetear password ni crear un login adicional por inferencia. Custodia elegida PO único, revocación manual 24h SIN garantía física si PO está ausente; requiere aceptación expresa del riesgo y confirmación de disponibilidad futura `T0/Texp`, ambos destinos bajo control privado, canal DB de escritura sin secreto en logs, mecanismo de `unset` verificable, backups/retención y GO nuevo e inequívoco. **No generar `P42_V1`**. Aprobación futura de custodia es distinta de grants/worker/checkout/contabilidad y beneficios.

**Documento actualizado:** `docs/PAZO_F16_P42_MANUAL_OPERATOR_PREFLIGHT_20261016.md` sección 12. **Único paso humano ahora:** abrir Supabase Dashboard → Edge Functions → Secrets y comprobar **solo presencia/ausencia del nombre exacto** `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX`. Si presenta valor o un secreto desconocido, no copiarlo ni borrar nada; reportar únicamente presente/ausente. PR #44 DRAFT y F16 financiero NO-GO.

---

# F16-P42 — INSTALACIÓN ADMINISTRATIVA CONFIRMADA + POSTFLIGHT SQL (2026-10-16)

**ÉXITO verificado directamente después de ejecución por el Product Owner en el SQL Editor oficial de Supabase** (captura de 1 fila `p42_operator_postflight`). Script ejecutado: `supabase/drafts/f16_p42_absolute_expiry_PO_SQL_EDITOR_OPERATOR_PENDING_EXECUTION.sql`, versión validada en commit `444b3cdd97a7cb996d85663fc2c26f35087ed499`. ChatGPT **NO** usó `apply_migration` ni intentó sortear un control mediante otra herramienta: el PO ejecutó con su sesión administrativa en el Dashboard. **NO EJECUTAR DE NUEVO.**

**Postflight independiente (solo SELECT vía Supabase conectado, posterior a la captura):** función `public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)` tiene `absolute_expiry_guard=true` y `null_end_guard=true`; owner `postgres`, `SECURITY DEFINER=true`, `search_path=""`; `p42_signing_keys=0`, `p42_writer_enabled=false`, `p21_worker_enabled=false`, `p40_bindings=0`, `ledger=0`, `reversals=0`; `anon/authenticated/service_role/PUBLIC EXECUTE=false`. Estado de pagos **NO-GO**. No se suministró clave, no se activó P42/P21, no PayPal GET ni nuevo checkout; el firmador Edge sigue apagado.

**Diferencia de historial importante:** ejecutar por SQL Editor realiza el cambio de función pero NO crea una fila en `supabase_migrations.schema_migrations`. La última versión listada sigue `20261016234350_f16_p37_service_only_claimed_activation_read`. Este es un **desfase de procedencia de migraciones**, no evidencia de que el parche faltó. NO aplicar otra vez el SQL ni insertar a mano una fila en migration history. En un futuro gate de reconciliación de schema, conservar evidencia del script ejecutado, comparar definición exacta en hosted, consultar método oficial de baseline/repair y documentar procedimiento sin doble aplicación ni permisos extra.

**El bloqueo técnico de vencimiento absoluto P42 queda RESUELTO en hosted**; no declarar F16 completada ni activar secretos. El incidente GitHub #45 (safety del conector) ahora es un antecedente: la vía administrativa oficial del PO instaló el parche, pero **no se probó que haya cambiado la seguridad del conector ChatGPT**. Gate siguiente separado: revalidar custodia/revocación manual 24h, conexión segura Edge+PG, backup residual, oferta prospectiva ES/EN, evidencia PayPal merchant/facturación/reversos y ledger idempotente. PO debe aprobar por separado cualquier nueva provisión, grants, worker, checkout y beneficios. PR #44 DRAFT, F16 NO-GO financiero.

---

# F16-P42 — PO SQL Editor operator packet prepared; NOT installed (2026-10-16)

**PO autorizó proceder con ruta administrativa oficial** después de bloqueo del conector Supabase. No reintentar la acción de escritura bloqueada por ChatGPT; PO ejecutará personalmente dentro de SQL Editor del Dashboard bajo su cuenta Owner, no mediante ChatGPT ni por un servicio o acceso de terceros. **Todavía NO se ejecutó** script y la base alojada no cambió. El issue #45 de revisión del conector permanece abierto para el conector, no constituye éxito de instalación.

**Paquete exacto para revisión y ejecución humana única:**
`supabase/drafts/f16_p42_absolute_expiry_PO_SQL_EDITOR_OPERATOR_PENDING_EXECUTION.sql`, commit final `444b3cdd97a7cb996d85663fc2c26f35087ed499`. Basado íntegramente en candidato original P42 blob `2961f9a8933d2e342cb04c681e8adbb8fae82046`, comparado byte-a-byte en cuerpo de función con `20261016062849_f16_p42_keys_and_writer_inert.sql` cambiando solo protección `v_key_end IS NULL` y `clock_timestamp()>=v_key_end`. El script agrega GUC PO `pazo.f16_p42_expiry_patch_go=specific_po_sql_gate` dentro del mismo `BEGIN..COMMIT`, restricción de definición anterior `md5(pg_get_functiondef(...))='a18502d4798d9bdce72b50ff98cd50a9'`, preflight original, postflight estricto y SELECT resumen después de COMMIT. Un test de sintaxis read-only corrigió el reporte de `pg_catalog.position(... IN ...)` a `pg_catalog.strpos(haystack, needle)`. La CREATE OR REPLACE preserva permisos; NO hay GRANT, UPDATE de gate, clave, checkout ni insert inmediato en P40. El cuerpo existente contiene INSERT condicionado pero la RPC sigue sin EXECUTE ni gate habilitado.

**Read-only preflight fresco:** `current_user=session_user='postgres'`, `current_database='postgres'`, PostgreSQL `17.11`, pgcrypto `extensions`, function owner `postgres`, `p42_absolute_expiry=false`, P42 key_count 0, gate P42 OFF, worker P21 OFF, P40 bindings 0, ledger 0, reversals 0 y permisos EXECUTE anon/auth/service/PUBLIC todos false. El PG17 del candidato original antes pasó CI #38983466691 y F16 Lab #38983466647; el nuevo wrapper administrativo tiene un SELECT de sintaxis validado y guards de autorrevocación pero **no se ha ejecutado** completo en hosted ni en PG17 con la misma firma del snapshot real.

**Operación:** abrir `https://supabase.com/dashboard/project/mrybvqdebbgcayuvgkkr/sql`; copiar íntegro desde GitHub `supabase/drafts/f16_p42_absolute_expiry_PO_SQL_EDITOR_OPERATOR_PENDING_EXECUTION.sql` (Raw); pegar todo en una nueva consulta en SQL Editor; verificar que el proyecto indicado es `mrybvqdebbgcayuvgkkr`, ejecutar **una sola vez**. No seleccionar solo líneas ni reemplazar nombres/valores. Si ERROR/rollback, STOP, no insistir. **Éxito no confirmado hasta ver SELECT final `p42_absolute_expiry=true`, keys/bindings/ledger/reversals=0, P21/P42=false, EXECUTE false, y una post-auditoría independiente**. Resumen verificado por ChatGPT a continuación; no reclamar instalación por abrir Dashboard o guardar borrador. Direct SQL Editor no registra automáticamente una entrada nueva en historial de migraciones CLI: reconciliar con proceso oficial tras resultado confirmado, sin insertar a mano en `supabase_migrations.schema_migrations`.

**Siguientes gates separados NO aprobados por este script:** provisión `P42_V1` real de 24h, Edge Secret, revocación manual, enabled/grants, worker P21, escritura contable, derechos, PayPal o Live. No publicar preview ni merge PR #44 por este paso. F16 NO-GO hasta evidencia autorizada auténtica.

---

# F16-P42 — incidente #45 de revisión del bloqueo de seguridad (2026-10-16)

**NO-GO para instalar el parche alojado y NO eludir el bloqueo del conector.** PO `ok go` confirma seguir el desbloqueo legítimo de P42. Read-only Supabase: el cuerpo hosted de `f16_p42_register_authenticated_activation` todavía carece de `clock_timestamp() >= v_key_end`, última migración P37 `20261016234350`, función owner postgres SECURITY DEFINER `search_path=''`, `anon/authenticated/service_role EXECUTE=false`; P21/P42 OFF, P42 keys 0, P40 bindings 0, ledger 0, reversals 0. La instalación específica del mismo SQL ya fue **rechazada por controles de seguridad de la herramienta**, no por un error SQL demostrado. **No reintentar a través de otro canal para esquivar ese control.**

La comprobación de permisos de la app conectada `Supabase` devolvió **app-specific `Allow all actions`**; por tanto, el rechazo no se explica por `Always ask` ni falta de permiso de ese ajuste. La documentación OpenAI confirma que app permissions NO cancelan safety protections y remite estos casos a soporte. Se creó [GitHub issue #45](https://github.com/DigitalAppcorp/pazo-app/issues/45) con candidato SQL inmutable (`supabase/drafts/f16_p42_absolute_key_expiry_patch_REVIEW_ONLY_DO_NOT_APPLY.sql`, Git blob `2961f9a8933d2e342cb04c681e8adbb8fae82046`), preflight metadata, CI `38983466691` PASS, PG17 `38983466647` PASS, alcance de un solo cuerpo `CREATE OR REPLACE FUNCTION`, evidencia solo lectura, solicitud de revisión y postflight. El mensaje literal/request ID del rechazo **no están disponibles**: no inventarlos.

**Única intervención humana externa que queda para el bloqueo de ChatGPT:** PO abre [OpenAI Support](https://help.openai.com/en/articles/6614161-how-can-i-contact-support) mediante la burbuja de chat y solicita revisión del control de seguridad del conector Supabase; puede citar issue #45 y adjuntar captura saneada/ID si lo tiene. No se envió ticket automáticamente. No reclamar que soporte haya aprobado o que el SQL esté instalado.

**Gate posterior condicionado:** solo cuando el control se resuelva por vía autorizada, instalar UNA migración del SQL ya auditado (sin claves ni grants, worker/checkout/ledger OFF), comprobar postflight SQL y registrar historial; siguen requeridos autorización separada de custodia 24h, provisión real y posterior integración comercial. **No retrasar MVP gratuito por P42 si se puede avanzar en paralelo**, pero no confundir CI sintético con cobro funcional.

---

# F16-P42 — 24h signer preflight before HMAC and RPC (2026-10-16)

**Avance de código en rama; hosted sin cambios.** Se auditó P42 tras el probe read-only P22 y se confirmó que `scripts/backup-database.ps1` YA incluye `--exclude-table-data=supporter_private.p42_activation_signing_keys`, con PG17 restore ampliado previamente PASS. NO repetir ese trabajo ni atribuir garantía sobre copias físicas/preexistentes.

El firmador Edge privado `supabase/functions/f16-paypal-webhook/p42HostedContractRecorder.mjs` ahora exige **dos límites UTC de segundos exactos**, `keyNotBefore` y `keyNotAfter`, con diferencia exactamente `86400000` ms (24 horas). Sin ambos valores o con reloj fuera de `[not_before,not_after)`, no firma ni envía RPC. Tras `subtle.sign` asíncrono vuelve a consultar reloj y bloquea POST al llegar `not_after` o ante retroceso del reloj. Las marcas deben provenir de custodia interna y coincidir con las de DB en un futuro GO separado; jamás del request o UI. El SQL de P42 también DEBE aplicar expiración absoluta y serialización/atomicidad: el guard Edge es defensa en profundidad y no demuestra eliminación física del secreto. Firmador `enabled=false` por defecto y NO importado en receiver alojado.

**Commits:** `19342387589eb9848de7280235af7a844678bbe8` código; `b542d8d1b885d7708c231447f784eb6d9d480a1e` cinco pruebas nuevas: ventanas faltantes/no-UTC/no-24h, llamada antes/después del límite, llamada dentro de ventana, vencimiento durante HMAC y retroceso del reloj. CI general [38988921740](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38988921740) **SUCCESS**; F16 Disposable PostgreSQL Lab [38988921774](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38988921774) **SUCCESS**.

**Comprobación alojada READ ONLY:** `p42_absolute_expiry_hosted=false` (la RPC instalada TODAVÍA carece de `clock_timestamp()>=v_key_end`); P21/P42 `enabled=false`, P42 claves 0, P40 0, ledger 0, reversals 0, `service_role` sin `EXECUTE` P42. Continúa **BLOQUEADO POR CONTROL DE SEGURIDAD** aplicar `supabase/drafts/f16_p42_absolute_key_expiry_patch_REVIEW_ONLY_DO_NOT_APPLY.sql`; el PO ya autorizó este SQL de manera puntual pero la herramienta bloqueó la operación y la base alojada no cambió. NO eludir por otro canal sin resolución autorizada. Sin secreto, T0/Texp real, Edge deploy, checkout, lease nuevo ni merchant GET. F16 NO-GO, PR #44 DRAFT.

**Decisión operativa:** NO avanzar a `P42_V1` en doble almacén ni tratar un claim/lease sintético como real. Para desbloquear ejecución autenticada hace falta resolver el bloqueo de la instalación P42, verificar el canal seguro y la disponibilidad de revocación manual del único custodio (PO), términos prospectivos y alcance merchant/refunds/disputes; **ninguno** se cubre por este PASS de código.

---

# F16-P22 — existing-lease-only Sandbox merchant read probe, CI PASS (2026-10-16)

**Implementado en rama, no alojado:** `createP22ExistingLeaseReadOnlyComposition` se añadió al módulo EXISTENTE `supabase/functions/f16-paypal-webhook/p22SandboxReviewWorker.mjs`, en lugar de inventar otra ruta. A diferencia del worker P22 normal, este probe **no llama** `f16_p05_draft_claim_next_verified_event`, `f16_p05_draft_finish_claimed_event` ni ningún RPC de ledger: solo lee un evento firmado que YA tuviera lease mediante `f16_p05_draft_read_claimed_event`, verifica evento + suscripción + venta original por PayPal Sandbox (los lectores P05/P29 YA EXISTENTES) y resuelve intención bound vía `f16_p22_resolve_bound_under_claim` (lectura service-role). Repite `readClaimedEvent` después de GETs para rechazar stale/expired lease. No captura lease nuevo ni marca processed. `scope='DISABLED'` por defecto, `OFFLINE_SYNTHETIC_TEST_ONLY` requiere `fetchImpl` inyectado, credential setup limitado a server-only; no importa en Edge/frontend/cron. Ninguna consulta PayPal real se realizó. El resultado sigue `REVIEW_REQUIRED` y `sourceAttestedByThisCode=false`, cero pagos, períodos ni beneficios; si prueba de venta es correlacionada se devuelve solo `merchantCorrelationCandidateOnly=true`.

**Pruebas:** seis tests dirigidos de zero-network disabled, transport con endpoint REST RPC exacto y PayPal GETs, ausencia de claim/finish/payment calls, claim inexistente, sale refunded, lease que expira después de GETs, y setup sin transporte. Commit código `8662fbfd875f1df642286c448f9f914b72d715a3`; tests `96a68db0a7ca4dff6f5e6ab305d55295b0664237`. **CI SUCCESS** [38988528941](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38988528941); **F16 Disposable PostgreSQL Lab SUCCESS** [38988528975](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38988528975). La documentación oficial actual de PayPal enumera GET `/v1/billing/subscriptions/{id}` y GET `/v1/billing/subscriptions/{id}/transactions`; esto NO sustituye cobertura retrospectiva de disputas y refunds.

**READ-ONLY estado alojado:** P21 OFF, P42 OFF, signing keys 0, P40 bindings 0, ledger 0, reversals 0; P25/P26 no instaladas. Con P21 apagado no existe lease activo utilizable; este probe no es ejecutable con éxito contra hosted ni puede crearlo. No se desplegó código, no se hizo merchant GET real, ni compra, ni cambio a secretos, ni migraciones/privilegios, ni merge; PR #44 DRAFT. P42 absolute expiry patch sigue bloqueado por seguridad de herramienta: no eludir. **Siguiente gate real** requiere autorización diferenciada para consulta comercial autenticada y lease ya activo, términos prospectivos publicados y cobertura de historial/reversos, además de resolver el bloqueo P42 por canal autorizado. No confundir CI sintético PASS con proveedor real verificado. F16 NO-GO para cobro y beneficios.

---

# F16-P22/P29 — independent sale GET required before private owner binding (2026-10-16)

**Implementación exclusivamente de rama y pruebas sintéticas, sin ejecución PayPal/Supabase hosted.** El P22 worker antes permitía `sale_correlated_candidate` tras un evento PayPal firmado y GET subscription, pero SIN requerir el GET original `v1/payments/sale/{saleId}` del lector existente P29. Cerrado mediante reutilización del `createP29MerchantSaleReader`: `p05SandboxClaimScopedMerchantReaders.mjs` lo ensambla internamente con su propia comprobación del evento reclamado P21 y su propio cierre OAuth sandbox, sin exponer bearer tokens. Ofrece `getIndependentMerchantSale` (solo server-side, transport injected). `p05OfflineMerchantClaimBridge.mjs` ahora REQUIERE este método, coteja venta/subscription/monto/estado exactos y deniega candidatos antes de resolver propietario privado ante una venta ausente, ajena o refunded. `p22SandboxReviewWorker.mjs` entrega el método al bridge, en el scope `OFFLINE_SYNTHETIC_TEST_ONLY` y disabled por defecto, sin import de Edge activo.

**Commits técnicos:** P05+P29 `1566645c58dc83dd8acc0c4934fbda24982c074b`, P05 bridge `a0987d015d7376cf3a67228dcb27e62a43b34183`, P22 `ca7ae1c88959466f6f3e285d69affca4675dba15`; pruebas adaptadas en `bca39a12`, `d7c64542` y `6101ea21`. El PG17 `38988053261` pasó y CI anterior `38988053262` falló SOLO por un conteo OAuth synthetic=4 esperado vs 5 real; test corregido `278560600abc56192dd846b2bc083a48b0902527`. **Verificación final confirmada:** CI `38988140811` SUCCESS y F16 Disposable PostgreSQL Lab `38988140944` SUCCESS para SHA `278560600abc56192dd846b2bc083a48b0902527`.

**Sin activación financiera ni ventas nuevas:** el worker P22 permanece inerte, no se instaló ni modificó P25/P26 ni P42; P21/P42 OFF, P42 claves 0, P40 0, ledger/reversos 0 según SELECT Supabase. Ningún checkout, merchant GET real, Edge deploy, grants, cron, cobro Live, paidThrough, derecho ni PR merge. P42 patch expiry continúa bloqueado por seguridad herramienta y NO eludirlo. Esta verificación de SALE original NO demuestra período prospectivo, historia completa, refunds ni disputas. F16 NO-GO, PR #44 DRAFT.

---
# F16-P27 — Fencing tras consultas externas (TOCTOU) 2026-10-16

**Trabajo técnico OFFLINE, no activado en hosted:** en `p27OfflineProvenanceReview.mjs` el contexto privado P26/P25 (identidad de evento+lease P21, propietario/intención BOUND, consentimiento prospectivo publicado P06 y reserva ordinal 0) ahora se captura como proyección estable ANTES de GETs de PayPal Sandbox. Tras `inspectHistory`, `inspectRefunds` y `inspectDisputes`, se compara contra esa proyección para detectar incluso mutación de un mismo objeto retornado por callback. Después de P05 atribución de primer cargo y P24 comprobación de refunds, se vuelve a leer el contexto privado con exactamente evento, lease, subscription e intent y se exige identidad estable y nuevo PASS de P26. En cambios o errores: `REVIEW_REQUIRED`, nada de `paidThrough`, ledger o beneficios.

**Importante:** esta doble lectura es un guardrail contra TOCTOU de un orquestador SIMULADO, no reemplaza la revalidación `FOR UPDATE` de lease/fencing + owner/contrato + invariantes contables en la misma transacción de escritura. Los componentes de atomicidad y concurrencia en PostgreSQL desechable `scripts/f16-lease-bound-finance-concurrency.mjs`, `scripts/f16-p26-blocked-ledger-concurrency.mjs` y sus tests YA EXISTÍAN y no se rehacen. Fuente PayPal autenticada y reversos completos sin probar; F16 NO-GO.

**Evidencia exacta:** cambio `f56a78b3b2b76e857a6bd5854c4445680e717c64`, cinco pruebas de cambios a mitad de consultas `c931caf5a2364919cac8a92ed42dd08d34c72d27`; una CI intermedia falló por motivo distinto en una fixture de objeto compartido que igualmente bloqueó con `live_prospective_claim_required`; se corrigió para detectar el cambio ANTES del segundo P26 en `7149852d8320d37900eeb2000f1df6969a30ce0b`. Resultado técnico **CI SUCCESS #38986600380** y **F16 Disposable PostgreSQL Lab SUCCESS #38986600391**.

**Estado alojado verificado READ ONLY al finalizar:** P21 OFF, P42 OFF, signing keys 0, P40 0, ledger 0, refunds/reversals 0, P25 y P26 tablas no instaladas. **P42 expiración sigue BLOQUEADA por seguridad de herramienta:** no intentar eludir. NO hubo compras, merchant GET reales, Edge deploy, SQL de escritura, grants, merge ni derechos concedidos. PR #44 DRAFT. Siguiente gate auténtico: ejecución server-only con fuentes verificadas, contrato prospectivo y cobertura de reversos; GO financiero/worker/Live independiente.

---
# F16-P05/P24/P27 — first regular obligation + refund lineage integrated in offline review (2026-10-16)

**Código implementado SOLO en rama, ninguna fuente comercial auténtica ni SQL alojado:** se endureció el validador EXISTENTE `p05FirstRegularObligationLab.mjs` para rechazar más de una activación o más de una `PAYMENT.SALE.COMPLETED` diferente dentro del journal prospectivo, incluso cuando el GET de transacciones reporta una sola venta. No rechaza cancelación no ambigua. La regla no inventa `+30 días`, ni ciclo provisto por PayPal; el intervalo autorizado en contrato sigue activación→próxima fecha de facturación observada, sin acreditación por este laboratorio.

`p27OfflineProvenanceReview.mjs` ahora reutiliza AMBOS validadores existentes: `assessF16P05FirstRegularObligation` y `assessP24RefundLineage`, después del preflight P26, la venta independiente P29 y los lectores de historia/refunds/disputes. Dos callbacks server-side de solo laboratorio (`readFirstObligationEvidence`, `readRefundLineageEvidence`) deben entregar evidencia cruda compatible; se exige matching estricto sale/intent/subscription y SHA/tiempo del P06 original, luego se valida primer cargo P05; la línea P24 debe corresponder a exactamente la misma venta y timestamp del primer cargo. Cualquier refund parcial, total, inconsistente, ambiguo, pago tardío, intento recuperado, segunda venta, conflicto de journal o falta de cobertura **solo** genera REVIEW_REQUIRED sin reservar un período ni habilitar ledger/beneficios. Un expediente sintético limpio también retorna REVIEW_REQUIRED por no tener fuente autenticada/contabilidad/reversos globales.

Commits: `f9b5c17dab67f92ad7d1a12dac7047b74f38ff39` (P05 journal), `a41ac424aea379e9e86274b567012904b97c6a58` (tests P05), `925c27a78a5bc8d755ac25f2a0d273073aada5d3` (P27 compone P05 y P24), `5ccba7aa1f540f3acd9f722631fed3a2c42dfa1b` (fixtures y seis nuevas regresiones de primer ciclo y reversos). F16 PG17 run `38985729338` SUCCESS. CI run `38985729337` **SUCCESS** y F16 Disposable PostgreSQL Lab run `38985729338` **SUCCESS**, ambos confirmados para commit técnico `5ccba7aa1f540f3acd9f722631fed3a2c42dfa1b`.

**Scope y restricciones:** ningún nuevo módulo duplicado ni tabla, solo código offline `OFFLINE_SYNTHETIC_TEST_ONLY`; no nuevas compras, auth real PayPal, writer, Edge deploy, merge o escrituras Supabase. P42 parche de expiración sigue BLOCKED BY TOOL SAFETY y no se sortea. P21 y P42 OFF, P25/P26 hosted no instalados, P40/ledger sin evidencia de ingresos. F16 NO-GO para cargos/beneficios; PR #44 DRAFT. Siguiente paso real sigue siendo una fuente server-side autenticada, con alcance financiero, contrato prospectivo publicado, cobertura histórica y orden transaccional/concurrencia antes de cualquier crédito.

---
# F16-P27/P29 — Independent original SALE before refund/history (2026-10-16)

**Trabajo concluido solo en rama y con datos sintéticos.** P27 exige el lector independiente de la venta original P29 después del preflight de identidad y consentimiento P26/P06/P25, antes de consultar historial, reembolsos y disputas. El GET de PayPal Sandbox original queda sujeto a la misma referencia del evento y lease. Deben coincidir sale_id, billing_agreement_id/subscription_id, estado completed/COMPLETED, USD y 2.99. Sin esa correlación se responde REVIEW_REQUIRED y no se inspeccionan reversos. También se corrige estado 'completed' minúsculo retornado por lector P05 hacia el gate interno P26 que esperaba mayúsculas. Esta corrección NO cambia la autorización financiera: mayRecordPayment=false, mayGrantBenefits=false, paidThrough=null.

**Commits:** P27 d9c864ddf60518d7de25e77c345b2d536b129574; cinco tests 5d3048e1b12154e62b58c7e01950aa32296823f8; integración mock real con createP29MerchantSaleReader 27d5e62c3e4c8c592f0c9b1ca7f63223a5eeaab8. El nuevo test verifica GET /v1/payments/sale/{saleId} exacto, proyección sin PII del pagador, ref/lease/cancelación y ausencia de consultas de historial cuando falla la venta. **RESULTADOS CONFIRMADOS:** CI SUCCESS run 38984767652 y F16 Disposable PostgreSQL Lab SUCCESS run 38984767719 para SHA 27d5e62c3e4c8c592f0c9b1ca7f63223a5eeaab8. Scope OFFLINE_SYNTHETIC_TEST_ONLY; reader P29 disabled por defecto. No contiene fuente PayPal autenticada ni compromiso comercial de primer ciclo.

**Estado bloqueado vigente:** P21/P42 OFF; sin claves P42, P25/P26 hosted ausentes, P40/ledger sin crédito; P42 expiración absoluta aprobada en laboratorio pero bloqueada para modificación alojada por seguridad de herramienta. Sin nuevas compras PayPal, seller OAuth, Edge deploy, SQL de escritura o beneficios. F16 NO-GO, PR #44 DRAFT. Evitar duplicar lectores existentes. Siguiente tramo: demostrar atestiguación de merchant/contrato y reversos con permisos específicos; el código sintético no la aporta.

---
# F16-P25/P26/P27 — revisión privada antes de historia comercial, laboratorio PASS (2026-10-16)

**Se continúa F16 sin intentar sortear bloqueo P42.** P25 (reserva única ordinal 0 review-only), P26 (comprobador de procedencia offline + ledger candidato siempre bloqueado) y P27 (puente merchant offline) **ya existían** y NO se han recreado. Se cerró una brecha de orden en `p27OfflineProvenanceReview.mjs`: ahora valida evento/UUID claim, compara evento+token exactos con contexto privado, llama a `assessP26FirstObligationEvidence` para exigir evento firmado, owner/intent BOUND, consentimiento P06 y reserva P25 coherente **antes** de leer historial, refunds o disputas. Si falla alguna condición, bloquea antes de hacer inspecciones adicionales. El camino positivo sintético sigue `REVIEW_REQUIRED`, `mayRecordPayment=false`, `mayGrantBenefits=false`, `paidThrough=null`.

**Nueva barrera contractual P26:** un consentimiento P06 **QA-only** (versión `pazo-supporter-sandbox.qa20261016-v1`) nunca se admite como acuerdo de **servicio pagado**. El gate offline exige `offerPurpose='PAID_SERVICE_PROSPECTIVE'`, `firstPeriodContractAttested=true`, `qaOnly=false`, versión no-QA para continuar a comprobación de historia. Estos son **inputs esperados de una futura fuente autenticada**, no evidencia atestiguada por el gate offline. El contrato prospectivo ES/EN aún está sin publicar; no hay condiciones para atribuir servicio a la compra pasada. Tests dirigidos P26/P27 negativos frente a consentimientos QA, leases y propietarios falsos.

**Evidencia:** commits técnicos `344fd0347a9ebd867e81ca02243dc91cfede4513` (fencing P27), `2d462b1a4c1155c9d2a14861c4a3a3a4e8f32121` (protección QA P26) y suites dirigidas hasta `28e509384d7031082abcdf05969a0e8079879a2e` — CI `38984326066` SUCCESS, F16 Disposable PostgreSQL Lab `38984325976` SUCCESS. Documento P26 corregido en `docs/PAZO_F16_P26_MERCHANT_PROVENANCE_LEDGER_GATE_20261015.md`.

**Estado alojado (consulta read-only):** P25/P26 tablas/RPC **ausentes**; P21 y P42 OFF; P40, claves P42, ledger y reversos en cero. No hubo otra compra, PayPal merchant GET, escritura SQL, despliegue ni privilegio financiero. El parche P42 de vencimiento sigue `BLOCKED BY TOOL SAFETY`; no solicitar a operador eludir ese control. **Siguiente camino habilitado:** continuar integración contractual y conciliación prospectiva sin confundir QA con servicio; cualquier migration, Edge deploy, seller read alojado, key provision, checkout o ledger requiere gate concreto. PR #44 DRAFT, F16 NO-GO para cobros/beneficios. No repetir pruebas previas que ya pasaron.

---

# F16-P42 — APPLY BLOCKED BY TOOL SAFETY (2026-10-16)

**PO GO específico:** el PO autorizó aplicar solo `supabase/drafts/f16_p42_absolute_key_expiry_patch_REVIEW_ONLY_DO_NOT_APPLY.sql`, sin generar claves, sin Edge secrets, sin activar gates o conceder permisos. El candidato (blob Git `2961f9a8933d2e342cb04c681e8adbb8fae82046`) había pasado CI `38983466691` y PG17 `38983466647`; comparación exacta con migración P42 inicial `ceb24e4b` confirmó que el único cambio del cuerpo era rechazar `not_after IS NULL` y `clock_timestamp() >= not_after`.

**Intento real:** una comprobación estática local demasiado amplia abortó antes de emitir cualquier SQL; al corregir la validación estática y llamar al conector de Supabase para instalar el cambio, la operación fue **bloqueada por controles de seguridad de la herramienta**. No hay registro de migración aplicada ni respuesta de ejecución. **NO reintentar ni usar otro canal para eludir el bloqueo** sin que se resuelva apropiadamente el control de seguridad. No crear una migración marcada instalada en GitHub mientras no exista en hosted.

**Postflight alojado independiente de solo lectura:** función P42 existe **pero sigue SIN** el predicado de vencimiento absoluto `clock_timestamp()>=v_key_end`; última migración sigue siendo `20261016234350_f16_p37_service_only_claimed_activation_read`. Claves P42 0, writer P42 OFF, worker P21 OFF, P40 0, ledger 0, reversals 0; `anon/authenticated/service_role EXECUTE=false`. Ninguna clave se generó, ningún webhook desplegado, ningún cobro ni beneficio acreditado.

**Estado:** `P42_HOSTED_ABSOLUTE_EXPIRY_PATCH_BLOCKED_BY_TOOL_SAFETY`; `P42_PROVISIONING_NO_GO`; `F16_NO_GO`; PR #44 continúa DRAFT. La prueba de laboratorio PASS no equivale al parche alojado instalado. Continuar solo con trabajo no bloqueado hasta resolución del control por canal autorizado; no activar el writer ni usar P42 antes del cutoff corregido.

---

# F16-P42 — vencimiento absoluto de 24h ensayado (2026-10-16)

**Trabajo técnico entregado, NO aplicado a hosted:** el parche `supabase/drafts/f16_p42_absolute_key_expiry_patch_REVIEW_ONLY_DO_NOT_APPLY.sql` se basa en la función P42 **ya instalada** y cambia exclusivamente su validación de ventana para rechazar `not_after IS NULL`, rechazar `issued_at >= not_after` y rechazar cualquier llamada recibida cuando `clock_timestamp() >= not_after`. Corrige la brecha documentada de una MAC emitida antes de vencer la clave pero entregada hasta 120 segundos después. No modifica grants, tablas, secretos, writer ni P21. El parche verifica gates OFF, cero filas P42/ledger/P40 y RPC existente; en laboratorio `f14_synthetic` valida rol, y en hosted está expresamente **NO-GO**, exigiendo aprobación SQL independiente.

**Pruebas dirigidas añadidas al fichero EXISTENTE:** `supabase/tests/supporter/p42-hosted-disabled-writer-pg17-rehearsal.sql`. Antes del vencimiento permite la firma sintética legítima con `not_after` finito; después, incluso con emisión previa, rechaza; `not_after=NULL` rechaza; conserva revocación, intent binding, idempotencia, ausencia de pagos y reversión ROLLBACK. CI ensaya el candidato en PostgreSQL desechable **sin usar bytes auténticos**. Commit con ensayo final `70c9e6c7151ddd09f83e2e2c218066ef306ea3d4`: **F16 Disposable PostgreSQL Lab SUCCESS** (run `38983466647`) y **CI SUCCESS** (run `38983466691`).

**Estado alojado posterior leído sin mutación:** `p42_activation_signing_keys=0`, P42 writer OFF, P21 worker OFF, P40 bindings 0, ledger 0, P42 RPC sin EXECUTE para `service_role`/`anon`/`authenticated`. La RPC **alojada aún tiene el cuerpo anterior**: no afirmar que cutoff fue corregido en hosted.

**Decisiones PO que se conservan:** futura clave `P42_V1` de **24h exactas** `T0..T0+24h`, **revocación manual** por un solo custodio (PO), no automación y no segundo administrador. NO se definió T0, NO se probó la doble provisión Edge+DB; no generar secreto ni habilitar grants/worker/checkouts. `scripts/f16-p42-session-pooler-tls-readonly-once.ps1` y los ensayos CA/backup/revocación ya existentes deben reutilizarse, no duplicarse.

**Siguiente gate más corto:** obtener GO separado para instalar **exclusivamente el parche P42 de rechazo tras expiración** con writer/gates OFF y ninguna key, ejecutar solo una migración versionada y comprobar body/grants/gates por SELECT. **Eso no autoriza provisionar claves, cambiar Edge Secrets, T0, desplegar funciones ni activar pagos.** Después de ese parche, la provisión privada de los dos almacenes continúa BLOCKED hasta que PO apruebe canal seguro y disponibilidad de revocación manual.

---

# F16-P37 — Hosted read-only RPC INSTALLED (2026-10-16)

**PO GO recibido únicamente para instalación SQL P37:** en Supabase `mrybvqdebbgcayuvgkkr`, migración alojada versión `20261016234350` / nombre `f16_p37_service_only_claimed_activation_read` aplicada **SUCCESS**. Versionada idéntica en SQL ejecutable (encabezado documental adaptado) como `supabase/migrations/20261016234350_f16_p37_service_only_claimed_activation_read.sql`. Source audited: `supabase/drafts/f16_p37_hosted_private_claim_read_REVIEW_ONLY_DO_NOT_APPLY.sql` sha `1d951f89927d0e5faf48e37f87d03c29e8386518`. El draft con nombre DO_NOT_APPLY sigue como referencia; **NO ejecutar de nuevo**.

**Postflight en Supabase READ ONLY confirmado:** `public.f16_p37_read_claimed_activation(text,uuid)` existe, LANGUAGE SQL STABLE SECURITY DEFINER propietario `postgres`, `search_path=''`, devuelve jsonb mínimo. Privilegios: `service_role EXECUTE=true`, `anon=false`, `authenticated=false`, `PUBLIC=false`. Tabla privada P40 `FORCE RLS=true` y `service_role` sin `SELECT` directo. Con evento inexistente y lease nulo/hipotético, la función devuelve `NULL`. **P21 enabled=false, P42 writer enabled=false, signing keys P42 0, P40 bindings 0, payment ledger 0, reversals 0.** Sin invocación PayPal, sin Edge/cron deploy, sin provisión criptográfica ni acreditación de beneficios. Advisor seguridad ejecutado: ningún nuevo finding de P37; hallazgos F14 existentes siguen fuera de scope.

**No extender el GO de P37 a P42:** El reader `p37PrivateActivationClaimReader.mjs` permanece `enabled=false`; instalar la RPC NO crea un `activation` verificado real. P42/HMAC, custodia y ventana `not_before/not_after`, ingress de evento firmado, P21 worker, reversos/disputas y términos de servicio prospectivos siguen gates separados. P44 histórico permanece REVIEW_REQUIRED. PR #44 permanece DRAFT. No afirmar F16 completo.

**Verificación CI:** tests del candidato previos PASS `38982618775` (PG17) y `38982618786` (CI); comprobar los workflows del commit que añadió la migración `55e59c50` y código de comentario `018dc9a1` antes de declarar PASS de la sincronización posterior.

---

# F16-P37 — hosted-compatible private read candidate 2026-10-16

**Technical preparation, NOT deployed:** Existing PG17 P37 lab contract was advanced to a hosted-compatible **read-only SQL candidate** `supabase/drafts/f16_p37_hosted_private_claim_read_REVIEW_ONLY_DO_NOT_APPLY.sql` (must NOT apply yet). It uses existing P21 worker lease and existing private P40 binding; **no new tables**, no keys, no payments, no worker gate or entitlements. Function proposed: `public.f16_p37_read_claimed_activation(text,uuid)` with SECURITY DEFINER, empty search_path, REVOKE from PUBLIC/anon/authenticated, scoped EXECUTE to service_role, and preflight demanding disabled worker, empty binding/ledger, P40 FORCE RLS and separate hosted specific SQL GO. Read projection limited to `id,type,processingState,subscriptionId,source,leaseCurrent`; **never** signatures, payer PII, owner identifiers, payment proof or paidThrough. New predicate also checks `attempt_count BETWEEN 1 AND 5`, unique bound subscription intent, binding timestamp >= event verification and P21 cutoff, nonexpired claim and retained event.

Dormant `p37PrivateActivationClaimReader.mjs` and its Node fixtures now use the exact `f16_p37_read_claimed_activation` route, still **enabled=false** by default, not referenced by deployed webhook/cron/browser. PG17 rollback-only `p37-p40-claimed-activation-read-pg17-synthetic.sql` tests the exact SQL candidate (lease, owner association, wrong token, non-activation, absent binding, timeout, hold/cutoff, no finance). GitHub workflow executes SQL only against disposable PG17; no hosted DDL. The candidate has no installed `public.f16_p37_read_claimed_activation` RPC until separately approved and migrated. **P42 event-signing/verified ingress remains not provisioned**; P40 association never equals standalone PayPal signature verification.

CI checks for commit `13890701454703de82359e4fc525de1c5355ffe1`: **PG17 run `38982618775` SUCCESS** and **CI run `38982618786` SUCCESS**. Both confirmed directly on GitHub after completion.

**Next installation gate (not given):** PO must explicitly approve this exact reviewed hosted read-only DDL/ACL. If approved, run a single reviewed versioned migration with postflight `anon/auth=false, service_role execute=true, P21/P42 OFF, keys/bindings/ledger 0`; then separately approve a trusted P42 custody/ingress activation with backup/retention controls and an end-to-end Sandbox experiment. No default GO for keys, payments, webhooks, live checkout, ledger or benefits. P44 historical REVIEW_REQUIRED; PR #44 DRAFT.

---

# F16-P37 — P40 leased activation read (LAB ONLY) 2026-10-16

**Ruta P37 preparada exclusivamente en rama para PG17 y Node sintéticos.** Reutiliza tabla P40 `supporter_private.paypal_verified_activation_bindings` ya instalada (actualmente **0 filas**) y gate P21 (OFF). No duplica tablas ni modifica P42. Nueva SQL `supabase/drafts/f16_p37_p40_claimed_activation_read_PG17_ONLY_DO_NOT_APPLY.sql` crea, **solo en la BD desechable `f14_synthetic`**, RPC de SELECT `f16_p37_lab_read_claimed_activation(event_id,lease_token)` restringida a `service_role`. Comprueba evento ACTIVATED en inbox, firma/verificación inicial confiada al receptor, lease/token vigentes, cutoff prospectivo, `retention_hold`, binding P40 exacto y owner/intent BOUND. No confundir validez de P40 con firma criptográfica emitida directamente por PostgreSQL: la custodia/ingesta HMAC P42 sigue BLOQUEADA y no provista. La salida es mínima, sin owner ni `signatureVerified:true` inventado.

La interfaz privada `p37PrivateActivationClaimReader.mjs` queda **enabled=false** por defecto, NO importada por receiver/worker/frontend; P37 `p37ActivationEventReader.mjs` ahora exige el indicador de asociación SQL real `p40_inbox_binding_claim` y `leaseCurrent:true`, luego GET PayPal firmado/autenticado por OAuth inyectado que verifica que `resource.id` coincida con la subscription ID. **Importante:** esto es *cotejo de fuentes bajo frontera de confianza*, nunca firma autónoma, cargo regular, `paidThrough`, ledger o beneficio. No usar con secretos alojados mientras RPC solo existe en laboratorio.

Pruebas nuevas `p37-p40-claimed-activation-read-pg17-synthetic.sql` se ejecutan con `ROLLBACK` en CI después del P40 schema lab; acceso service-only, gate OFF, token falso, vinculación ausente, tipo SALE incorrecto, lease expirado, retention hold y cutoff. Se añadieron `f16P37PrivateActivationClaimReader.test.mjs` y ajustes de `f16P37ActivationEventReader.test.mjs`. **Ejecución validada:** commit técnico `ce8c2b47c46c938bd97b5c4c1e1efee8765cb4de` pasó **CI SUCCESS** (GitHub run 38982150897) y **F16 Disposable PostgreSQL Lab SUCCESS** (run 38982150842). Inicialmente falló un regex UUID de lease incompleto en `p37PrivateActivationClaimReader.mjs`; corregido en `6f84d44` y cubierto por un test positivo/negativo en `ce8c2b47`. Las pruebas ya validaron roles/lease/binding P40 y el bloqueo del lector cuando el token es inválido. Diagnóstico temporal eliminado.

**El blocker de ejecución alojada se mantiene:** P42 firma/despliegue real sigue sin claves, RPC P37 únicamente `lab`; se necesita GO específico para SQL Hosted (con revisión de DDL/retención/grants), preparación/seguridad/activación P42, Edge deploy, claim cutoff, fuentes reales y pruebas E2E. No corresponde GO financiero por `ok go`. P21/P42 OFF, ledger 0; P44 histórico REVIEW_REQUIRED; F16 NO-GO y PR #44 DRAFT.

---

# F16 — Cierre técnico P22 (composición aislada de revisión) 2026-10-16

**Avance de integración (no otro laboratorio financiero):** commit `6424dc265409b3fcefcb29e7be5ba69bc693cb91` añade `createP22SandboxPrivilegedReviewComposition` en `supabase/functions/f16-paypal-webhook/p22SandboxReviewWorker.mjs`. Reutiliza literalmente (sin tablas ni endpoints nuevos) `p22PrivateLeaseRpcAdapter.mjs` (RPC P21 claim/read/finish + P22 owner/intent) y `p05SandboxClaimScopedMerchantReaders.mjs` (PayPal OAuth Sandbox + GET evento y suscripción) a través de `createP22SandboxReviewWorker`. El resultado más favorable **solo cuarentena REVIEW** por ciclo no probado, nunca `processed` ni pago/entitlement. Importante: simula llamadas de mutación claim/finish por mocks; no ejecutar contra Supabase alojado sin gate específico. **Gate defecto DISABLED**, alcance alternativo exclusivo `OFFLINE_SYNTHETIC_TEST_ONLY`, requiere `fetchImpl` inyectado; no lo importa ningún Edge activo/cron/frontend. No autoriza usar credenciales reales con el seam sintético.

Commit `d8fa77785dd0c745d27a85f989f9f1f7ae221fcb` añade cuatro tests dirigidos al archivo P22 existente: default sin red, solo RPC privados + OAuth/GET merchant (fixture sintética), inbox idle sin PayPal, y falla de RPC bloquea proveedor. Consultar CI/PG17 de ese SHA antes de declarar PASS; no repetir transacciones ni 889 tests manuales. Seguridad alojada comprobada READ ONLY: `P21=false`, `P42=false`, ledger 0, bindings 0 y signing keys 0. Sin PayPal invocado, sin SQL de escritura, sin despliegue, sin compra.

**Trabajo técnico siguiente con GO separado** (no autorizado por «ok go» general): revisión de fuente atestiguada de activación P37 (contrato SQL todavía incompleto), período contractual con consentimiento real y reversos/disputas; política jurídica P02/P03; aprobación para migraciones/Edge y custodia de secret P42. El P22 del repositorio **NO está conectado a un worker alojado**, y la presente composición simulada **NO prueba** marcha real. P44 es histórico REVIEW_REQUIRED, no repetir. PAZO gratuita no depende de habilitar esta oferta, PR #44 continúa DRAFT.

---

# F16 — Términos prospectivos ES/EN y alcance de disputas: gate de revisión 2026-10-16

**Entregado solo en rama, ningún release:** `src/features/supporter/offerCopyDraftP13.mjs` ahora incorpora en español e inglés la condición P05 aprobada `[activación PayPal validada, siguiente facturación merchant observada en activación)`, sujeta a cargo regular y primera obligación auténticos; no usa `COMPLETED+30 días`. Las recompensas aún no están operativas. Se añadieron **dos tests** en `f16P13OfferCopyDraft.test.mjs`; status de borrador y todos los flags de checkout/benefits continúan en `false`. Documentado en `docs/PAZO_F16_P13_BILINGUAL_OFFER_AND_RETENTION_REVIEW_20261015.md`. No reusar como oferta P06 publicada, ni alterar `pazo-supporter-sandbox.qa20261016-v1` ya aceptada sin beneficios.

**No recrear trabajo P03:** existe diseño y código offline de scope de disputas `p05SandboxDisputeMerchantReaders`, `p05OfflineDisputeScopeResolver`, `p05ServerOnlyDisputeLedgerReaders`, y RPC read-only en `f16_p05_dispute_private_ledger_read_DO_NOT_APPLY.sql`. Ledger alojado = 0 => no se puede corroborar que una disputa corresponda a PAZO; `unknown`, no ACK `outside_pazo`. El receptor alojado aún no conserva eventos `CUSTOMER.DISPUTE.*` y no debe deployarse sin política+gate. Reglas P06-A–E **ya aprobadas**, inbox 90d **solo conciliados sin hold**, CA ARL §17602(a)(6) consentimiento (si aplica) 3 años desde aceptación o 1 tras término, plazo mayor. P02/P03 ledger/disputas/backup y retención fiscal **sin plazo aprobado**. El registro de decisiones JSON y firmas siguen pendientes, no se cambiaron.

**Checklist consolidado, NO autorizado:** `docs/PAZO_F16_P05_RETENTION_DECISION_PACKET_20261015.md`. La corrección útil fue precisar copy y próximos gates de firma de G1; **no activar captura, borrado, PayPal Live, P21/P42, transacciones ni beneficios**. El siguiente paso operativo no es código duplicado: (1) confirmar revisión legal/contable y producto de términos/retención; (2) disponibilidad técnica de beneficios/cancelación/acuse; (3) solo con GO específico revisar migración RPC mínima P03 y captura Sandbox ya diseñadas. P44 permanece `REVIEW_REQUIRED`; PR #44 DRAFT.

---

# PAZO F16 — Gate de ejecución prospectiva (2026-10-16)

**Hallazgo central:** la suscripción histórica excluida por P05 no es idéntica a la compra QA de P44. El entorno alojado **sí** contiene 2 ofertas ES/EN publicadas `pazo-supporter-sandbox.qa20261016-v1` y 1 aceptación P06 con SHA y provider-create claim. Pero **los términos QA aceptados excluyen cualquier período pagado o beneficio**, no adoptan la fórmula prospectiva de servicio. No negar el consentimiento QA; conservarlo como evidencia de seguridad y PayPal, sin acreditar `paidThrough`.

**Contrato de ejecución documentado y fuente prioritaria:** `docs/PAZO_F16_P44_MERCHANT_COVERAGE_REUSE_GATE_20261016.md`, sección `Gate de ejecución prospectiva P44→P26` añadida en commit `8a74e522`. Reutilizar `p05ProspectiveEvidenceContractLab.mjs`, `p26OfflineProvenanceGate.mjs`, `p27OfflineProvenanceReview.mjs` y suites existentes; no recrearlos. Son laboratorios NO autenticadores. La prueba P44 v2 `merchant_refs_correlated_pagination_incomplete` conserva evidencia de sale/intent, pero nunca crea período ni contrato prospectivo.

**Inventario confirmado read-only en Supabase:** P22 RPC instalada; P28 audit RPC instalada; P42 RPC instalada pero no habilitada; P24/P25/P26 RPC y tablas P25/P26 ausentes. P21 worker OFF; P42 writer OFF; ledger/reversals/P40/P42 keys = 0. Webhook v18 carece de eventos `CUSTOMER.DISPUTE.*`. 2 intents bound, 12 eventos inbox, 2 ofertas publicadas QA, 1 checkout con consentimiento/hashing. No hubo PayPal GET nuevos, compras, Edge deploy, SQL de escritura, ni alteración financiera.

**Punto pendiente realmente bloqueante:** fuente auténtica `provider plan/activation/sale/transaction window` y manejo de refunds/disputas **as-of + compensación futura** bajo retención/scope aprobados; aceptación de términos **de servicio** previo a primer cargo prospectivo. Una ausencia de disputas futuras es imposible de certificar en el presente: documentada propuesta de ventana `coverageAsOf` + monitoreo y reversos idempotentes, **NO aprobada**. No aceptar snapshot vacío como certificación global. La función diagnóstica v2 expira el 2026-10-17T00:00:00Z; no repetirla ni extenderla.

**Siguiente gate:** preparar política de retención/alcance de disputas y contrato ES/EN prospectivo antes de cualquier integración financiera alojada, y validar adaptadores existentes mediante ensayos dirigidos. Se precisa GO separado para cualquier SQL, captura/Edge, worker, prueba nueva, ledger, beneficios o Live. PR #44 DRAFT, F16 NO-GO.

---

# F16-P44 — Auditoría de fuentes y cobertura 2026-10-16

**Resultado:** `REVIEW_REQUIRED` conservado; no nuevos lectores, no nuevos tests duplicados, no nuevos GET PayPal, no invocar P44 otra vez. **Informe canónico actual:** [`docs/PAZO_F16_P44_MERCHANT_COVERAGE_REUSE_GATE_20261016.md`](PAZO_F16_P44_MERCHANT_COVERAGE_REUSE_GATE_20261016.md).

Se revisaron los componentes reales P05, P23, P24, P29, P32 y sus pruebas existentes, y la fuente de la función Edge P44 v2. La correlación comercial del diagnóstico proviene de una consulta que cubrió solamente `2026-10-16T00:00:00Z` hasta su momento de ejecución: **no es historia total**. Los totales de paginación ausentes no permiten certificar cobertura. No hay evidencia independiente de ciclo REGULAR, ancla contractual o cobertura reembolsos/disputas. El `core.mjs` de `f16-paypal-webhook` alojada v18 tampoco reconoce `CUSTOMER.DISPUTE.CREATED/UPDATED/RESOLVED`, confirmando brecha de alcance. Reglas originales P05 de primer período y pagos tardíos se conservan.

SQL READ ONLY post-auditoría: **ledger 0, reversals 0, P40 0, signing keys P42 0, P21 OFF, writer P42 OFF**. PR #44 continúa DRAFT; no se desplegó, no se compró nada, no hubo writes ni invocaciones. Cualquier futura consulta alojada necesita contrato concreto de procedencia/cobertura y GO específico del PO. **No se permite evadir la expiración del diagnóstico P44 v2.** Siguiente trabajo: diseño documental/validación offline de evidencia faltante, no recrear infraestructura.

---

# PAZO F16 — QA local publicada y verificada (2026-10-16)

**Integración QA P06/P18 CERRADA — reutilización, no recreación.** HEAD verificado en GitHub `bb1d57c01ff01092ef3c7bd96df2d35240150ce6` (rama `f13/section-titles-20261012`, PR #44 sigue OPEN/DRAFT). Este último commit publica **únicamente** `src/features/supporter/testing/f16P06QaAccountOrigin.test.mjs`, con **10** casos. La salida local de Codex reporta 19/19 PASS en suite dirigida y clon limpio, 11 archivos candidatos equivalentes tras imports, 3 casos previamente cubiertos por P18 y 1 conservado como evidencia histórica. El informe detallado local `RESULTADO_F16_QA_TEST_PUBLICATION_20261016.md` no está montado en el repositorio; no afirmar que se leyó íntegro. La verificación independiente en GitHub del commit `bb1d57c` confirmó que **CI = SUCCESS** y **F16 Disposable PostgreSQL Lab = SUCCESS**. NO repetir ejecución local o tests de compra.

**Código QA reconciliado:** helper `supabase/functions/f16-paypal-supporter-account/p06QaAccountOrigin.mjs` y gestión de cuenta `index.ts` coinciden en lógica con runtime v10, conservando imports canónicos en GitHub. El checkout `supabase/functions/f16-paypal-supporter/index.ts` en GitHub mantiene `QA_CHECKOUT_RELEASE_APPROVED = false`; la función QA alojada v7 se había desplegado con latch restringido `true` durante pruebas; divergencia **intencional** hasta gate separado y nunca motivo de redeploy automático. No se desplegó código, no se modificaron datos SQL/financieros.

**Siguiente fase técnica: F16-P44 REVIEW_REQUIRED.** En una única ejecución previa `review` HTTP 200 hubo correlación entre venta Sandbox y evento original, pero `merchant_refs_correlated_pagination_incomplete`: las transacciones por ventanas, períodos contractuales y evidencia de reembolsos/disputas NO están exhaustivamente acreditados. Los componentes P05/P23/P24/P29/P31/P32 ya existen para reutilizar, en gran parte OFFLINE/SYNTHETIC; distinguir tests sintéticos de prueba merchant real. No volver a llamar P44 ni repetir pagos. La función aislada `f16-paypal-sandbox-sale-review` v2 tiene caducidad `2026-10-17T00:00:00Z`; su vencimiento NO autoriza ampliación/redeploy. Resolver por análisis contractual y diseño de cobertura independiente de solo lectura, con nueva aprobación específica si requiere una operación alojada. Mantener P21 OFF, P42 OFF, ledger/paidThrough/beneficios sin habilitar, PayPal Live OFF.

---

# PAZO F16 — Reconciliación QA de prueba aislada (2026-10-16)

**GO vigente:** PO aprobó consolidar únicamente trabajo ya verificado de QA y evitar duplicados. NO autoriza despliegue, nueva compra, habilitar P21/P42, ledger, Live ni beneficios.

**Evidencia local remitida por operador:** `LOCAL_COMPARE_COMPLETED`: clon principal limpio, HEAD local `870ea27d2cd80757585e0973f07e60e9df146c90`; baseline de aquel inventario `e8a56d8b20cf77ccaefd3f4e8dbbbc3f96120202`. **883 archivos idénticos; 3 diferencias F16 eran actualizaciones remotas**, no código local nuevo. Directorios operativos fuera de Git contienen helper `p06-live-qa/account-qa-candidate/p06QaAccountOrigin.mjs`, pruebas `account-qa-origin.test.mjs` con 14 casos, fuentes de gestión/checkout QA y seis informes P06/P43/P44. NO se revisó aquí el texto completo de esos archivos locales: no inferir equivalencia total ni recrear las 14 pruebas. Una única ejecución previa del auditor; NO repetirla.

**Intervención en rama posterior al baseline:**
- `8de00b08`: guard `supabase/functions/f16-paypal-supporter-account/p06QaAccountOrigin.mjs` recuperado de la Edge Function alojada v10, con import reubicado al guard canónico existente `../f16-paypal-supporter/p06SandboxQaGate.mjs`. El contenido lógico coincide con runtime; no duplica el guard.
- `f04f6572`: `f16-paypal-supporter-account/index.ts` versiona la lógica QA de selección de origen y autenticación de único propietario ya desplegada; preserva imports canónicos del repositorio.
- `e99b7ab2`: actualiza el test P18 para reconocer la nueva firma de `createRuntime`. No sustituye ni repite los 14 tests aislados.
- **NO se cambió** `supabase/functions/f16-paypal-supporter/index.ts`: el checkout en GitHub conserva `QA_CHECKOUT_RELEASE_APPROVED=false`; en runtime Sandbox v7 está `true` por la prueba restringida. No sincronizar esos flags sin GO específico.
- Código de rama exclusivamente: **NO se desplegaron** funciones ni se ejecutaron pagos o pruebas E2E. CI del HEAD `e99b7ab2` se vio queued/in_progress, consultar conclusión antes de declarar PASS.

**Gate local siguiente y único:** en PC/Codex, verificar `git status --porcelain` vacío, rama `f13/section-titles-20261012`, HEAD local esperado `870ea27d2cd80757585e0973f07e60e9df146c90` y remoto aprobado; entonces `git fetch origin f13/section-titles-20261012` + `git merge --ff-only origin/f13/section-titles-20261012`. Si hay drift, STOP. Después comparar exactos `p06-live-qa/account-qa-candidate/` y `account-qa-origin.test.mjs` con nuevos archivos remotos, deduplicar esos 14 tests y adaptar rutas/imports solamente si hace falta; hacer tests dirigidos SOLO tras verificar la diferencia. Preservar informes operativos P06/P43/P44 sanitizados. **No ejecutar scripts de compra, no redeploy, no escribir DB, no push automático de fuentes QA con latch true.** Si el contenido local difiere del guard alojado, clasificar REVIEW_REQUIRED y documentar before/after antes de mezclar.

---

# PAZO — F16-P44 correlación comercial (actualización 2026-10-16)

**Resultado de ejecución único reportado por operador:** `REVIEW_REQUIRED — merchant_refs_correlated_pagination_incomplete`, HTTP 200, una llamada `review` sin reintentos; venta Sandbox y evento original correlacionados. Se conserva la distinción: sin cobertura completa del historial, períodos, refund/dispute, ni permiso de ledger/beneficios.

**Corrección branch-only, NO desplegada:** `87d42357` añade evidencia explícita de paginación opcional y marca revisión independiente cuando PayPal omite `total_pages`/`total_items`; `5fe0bcc5` incorpora dos tests offline para metadatos ausentes y totales coherentes. **No eleva evidencia incompleta a PASS**. CI/PostgreSQL estaban queued al observarse; comprobar resultados antes de declarar validación. Función alojada v2 no cambiada; cero compras nuevas, cero nuevas invocaciones, P21/P42/ledger/beneficios/Live OFF. Siguiente paso: verificar CI y preparar un procedimiento independiente de cobertura histórica y reembolsos/disputas sin saltarse controles. La ventana diagnóstica de v2 expira el 2026-10-17 00:00 UTC: no repetirla.

---

# PAZO — ACTIVE HANDOFF | punto de recuperación F16-P44
**Última verificación:** 2026-10-16, Supabase/GitHub leídos directamente en esta conversación.  
**Product Owner:** usuario; autoriza ejecución técnica por ChatGPT/Codex dentro de gates aprobados.  
**Project Brain OS:** `DigitalAppcorp/project-brain-os`, v1.4.1.  
**Repositorio:** `DigitalAppcorp/pazo-app`. **Rama:** `f13/section-titles-20261012`. **PR:** [#44](https://github.com/DigitalAppcorp/pazo-app/pull/44) OPEN/DRAFT.  
**Último HEAD de rama inspeccionado ANTES de escribir este handoff:** `870ea27d2cd80757585e0973f07e60e9df146c90`. **main observado:** `ae7e63f46bd0150457df9ebb5c73da0aa2edbf90`. Después de leer este archivo, obtener el HEAD remoto actual; no inferir que este SHA sea el último.

## INSTRUCCIÓN PRIORITARIA para quien retoma

**Continuar EXACTAMENTE en F16: comprobación privada, autenticada y de SOLO LECTURA de la primera venta de la suscripción PayPal Sandbox que el PO acaba de aprobar y cancelar.** El PO dijo **«sí»** al plan de **preparar, desplegar y ejecutar una función privada de diagnóstico read-only** sobre esa venta específica. Este GO no autoriza credenciales nuevas, pagos adicionales, reconciliación con escrituras, activar workers P21, escritor/keys P42, beneficios, PayPal Live, despliegues Vercel, cambiar la oferta ni repetir el buyer E2E.

**¡Hallazgo nuevo y de precedencia máxima!** En Supabase ya aparece `f16-paypal-sandbox-sale-review` **v2 ACTIVE, verify_jwt=true**. Se leyó el archivo `index.ts` directamente desde el runtime alojado; contiene un diagnóstico restringido a **un único Auth UID allowlisted**, origen QA exacto, plan Sandbox `P-14V25407JP6850922NLHMDKI`, `PAZO_F16_P06_QA_ENABLE`, consulta al servicio merchant Sandbox y contrato de salida `REVIEW_REQUIRED`, sin escrituras financieras ni beneficios. Tiene un **evento de venta fijado en fuente** (NO divulgarlo) y ventana de diagnóstico limitada a `2026-10-17T00:00:00Z`. **Su código NO figura en el HEAD GitHub inspeccionado**: fuente de runtime y rama divergen. No atribuir autoría ni inferir fecha de despliegue/ejecución; tampoco re-desplegar esta función ni crear una segunda antes de auditar runtime y registros. **No se ha verificado una ejecución autenticada que correlacione venta y PayPal.** El último informe Codex anterior decía `REVIEW_REQUIRED — LOCAL_PAYPAL_CREDENTIALS_UNAVAILABLE`; se detuvo sin GET PayPal ni P22–P29. Ese informe NO prueba que el runtime v2 haya fallado ni pasado.

**Paso siguiente único:** revisar la función alojada v2, límites temporales y logs/metadatos de ejecución **sin secretos**, y confirmar si ya existe resultado read-only de merchant. Si no lo hay, ejecutar **una vez** el diagnóstico owner-only previamente aprobado por canal autenticado adecuado, sin transmitir JWT/cookies en chat ni exponer datos de pago; exigir confirmación de identidad server-side y de origen HTTPS. Si el endpoint expira, está roto, no puede invocarse con seguridad o no existe canal autorizado, clasificar `REVIEW_REQUIRED` y proponer la corrección mínima dentro del GO del PO, sin declarar verificada la venta. Las herramientas en chat Supabase/GitHub normalmente leen fuente y SQL pero NO extraen secretos ni JWT del navegador. Codex local tiene acceso a la computadora, pero el informe constató ausencia de credenciales comerciales PayPal LOCALES; deben usarse de manera privada las credenciales **ya configuradas en Supabase**, sin copiarlas.

## Estado REAL de la prueba PayPal Sandbox (última comprobación)

- PO usó frontend QA local servido mediante **enlace HTTPS temporal Cloudflare Tunnel** `https://titanium-strategy-lead-singh.trycloudflare.com/#/account/supporter` (enlace efímero; puede expirar o variar). El panel `Abrir prueba Sandbox` mostró términos ES/EN del plan simulado **US$2.99/mes** y consentimiento opt-in.
- PO aceptó personalmente en PayPal Sandbox **UNA** suscripción. La pantalla PAZO informó `ACTIVE` tras consultar proveedor y luego `CANCELLED`, mostrando que PayPal confirmó la cancelación de **renovaciones futuras**. Esas capturas prueban el flujo de gestión, NO un ciclo pagado.
- Supabase SQL READ ONLY, sobre la única cuenta QA autorizada (sin publicar su UID): **1 Auth QA**, **1 consentimiento/intento**, **1 intent `bound`** al plan correcto, **4 eventos verificados** en ventana de prueba `2026-10-16 20:38–20:48 UTC`: `BILLING.SUBSCRIPTION.CREATED`, `ACTIVATED`, `PAYMENT.SALE.COMPLETED`, `CANCELLED`. Todos **4 `pending`**, **0 claims**, **0 eventos procesados/vinculados a ledger**. Hay **8 eventos históricos** previos de otras pruebas; deben excluirse sin reinterpretarlos como pagos nuevos.
- **Ledger `supporter_private.paypal_payment_entries`: 0 registros en TODO el proyecto.** **P21 `p05_inbox_worker_gate.enabled=false`** y cutoff `not_before=NULL`; **P42 writer OFF** y **0 claves P42**. Prohibido inferir paidThrough/periodStart/periodEnd, premium, beneficios, badges o cobros reales de SALE/ACTIVE/CANCELLED.
- En este chat se comprobaron `public.f16_p05_draft_claim_next_verified_event`, `f16_p05_draft_read_claimed_event`, `f16_p05_draft_finish_claimed_event` y `f16_p22_resolve_bound_under_claim`: `service_role EXECUTE=true`, `authenticated EXECUTE=false`. Tener RPCs instaladas **NO significa** procesamiento completo ni permiso de encender el gate.
- Funciones Supabase observadas ACTIVE: `f16-paypal-webhook` **v18** JWT false (recepción verificada), `f16-paypal-supporter-account` **v10** JWT true (estado/cancelación), `f16-paypal-operator-read` **v6** JWT false (código **enabled=false**, no usar como sustituto), `f16-paypal-supporter` **v7** JWT true (checkout QA de un owner), `f16-paypal-sandbox-sale-review` **v2** JWT true (diagnóstico comercial SOLO LECTURA). Reinspeccionar versiones por posible actividad concurrente.
- El lector v2 puede comparar `subscription`, `custom_id`, `sale`, `inbox event`, importe/moneda y paginación. Incluso `merchant_refs_correlated_review_only` deja `cycleVerified=false`, `refundsCoverageComplete=false`, `disputesCoverageComplete=false`, `mayRecordPayment=false`, `mayGrantBenefits=false`: **NO es autorización financiera**.
- CI/QA: Codex reportó previamente **889 tests PASS** y build normal/QA PASS **en copia local aislada**; NO demuestra conciliación merchant de esta venta. Branch GitHub y runtime Supabase pueden divergir. No repetir 889 pruebas salvo modificación de código que realmente lo exija.

## Gates no completados (sin saltos ni atajos)

- Prueba mercantil autenticada pendiente de resultado verificable: evento GET original + sale GET + subscription/transactions GET, propietario `owner` e intent `bound`, condiciones P06, plan fijo 2.99 USD, historial de reembolsos/disputas y cobertura de historial. PayPal `PAYMENT.SALE.COMPLETED` recibido no basta.
- Ruta financiera P21–P30: reclamo con fencing/cutoff prospectivo, obligaciones contractuales y período de cobertura probado, reembolsos/reversos/disputas, idempotencia, ledger ACID, retención/privacidad y autorización explícita de PO para escritor/entitlements. `P42` provisión criptográfica sin comenzar: NO generar ni depositar clave para simplificar este diagnóstico.
- Código de revisión P28 v6 está estáticamente deshabilitado; **NO** activarlo o reciclarlo de forma oportunista. No mezclar 8 eventos históricos con el nuevo buyer.
- PR #44 sigue DRAFT, `main` sin merge de esta fase; F16 **NO COMPLETADA** ni autorizada para cobros reales. No crear gasto, hosting nuevo ni previews Vercel; PO pidió evitar retrasos/despliegues. El Vercel team `digitalapp` ha devuelto 403 a este conector y varios commits dispararon previews automáticos/rate limiting. Para diagnosticar Sandbox se reutiliza Supabase; mantener la app gratis.
- **Documentos técnicos del gate:** `docs/PAZO_F16_PAYPAL_RECONCILIATION_MODEL_20261013.md`, `docs/PAZO_F16_P27_HOSTED_SANDBOX_MERCHANT_READ_PREFLIGHT_20261015.md`, `docs/PAZO_F16_P28_LAUNCH_DEPENDENCY_RECONCILIATION_20261015.md`, `docs/PAZO_F16_P30_FINANCIAL_GATE_RECONCILIATION_20261015.md` y `docs/PAZO_F16_P42_MANUAL_OPERATOR_PREFLIGHT_20261016.md`. Leer `AGENTS.md` y `docs/PAZO_MASTER_ROADMAP.md` al retomar.

## Autorización, criterios para cierre y evidencia

**Autorizado por PO:** preparar, desplegar y ejecutar diagnóstico PRIVADO `Sandbox` de la venta probada **solo lectura**; no repetir compra. El usuario pidió ahora exclusivamente crear el **handoff y continuar en otro chat**, así que en la presente conversación no volver a invocar nada con efectos de pago o despliegue. Siguiente chat debe comprobar primero runtime v2, evidencia de GET comerciante e invocación, y pedir nueva autorización solo si la siguiente acción excede el GO definido. No solicitar passwords, JWT, keys ni IDs de compradores en chat. Sin logs crudos, PII, datos de pago ni secretos en GitHub/CI.

**Estado para retomar:** `F16_P44_HOSTED_SINGLE_OWNER_SANDBOX_SALE_REVIEW_V2_PRESENT_EXECUTION_UNVERIFIED_LEDGER_ZERO_P21_P42_OFF`.

## Historia conservada (NO reemplaza estado actual)

El archivo `docs/PAZO_ACTIVE_HANDOFF.md` anterior (195 KB de historia) se conserva íntegro por Git en el commit `870ea27d2cd80757585e0973f07e60e9df146c90`: [archivo histórico](https://github.com/DigitalAppcorp/pazo-app/blob/870ea27d2cd80757585e0973f07e60e9df146c90/docs/PAZO_ACTIVE_HANDOFF.md). Los archivos técnicos y las migraciones permanecen en la rama. Este snapshot prevalece sobre los checkpoints cronológicos antiguos, sin borrar decisiones históricas.

## Mensaje recomendado para nuevo chat

> Activa Project Brain OS desde `DigitalAppcorp/project-brain-os` y retoma PAZO en `DigitalAppcorp/pazo-app`. Lee `AGENTS.md`, `docs/PAZO_ACTIVE_HANDOFF.md` y `docs/PAZO_MASTER_ROADMAP.md`. Continúa **F16-P44**: función alojada `f16-paypal-sandbox-sale-review` v2 ya existe; verifica si se ejecutó el diagnóstico privado de lectura mercantil Sandbox, y si falta, ejecuta el control owner-only dentro del GO previamente aprobado. Sin credenciales en chat, nuevas compras, ledger, P21/P42, beneficios, PayPal Live ni Vercel. No repitas los 889 tests ni pasos concluidos. Antes de actuar compara branch HEAD, runtimes y las cuatro evidencias QA `pending`. Dame siguiente gate real y avanza solo si es seguro.

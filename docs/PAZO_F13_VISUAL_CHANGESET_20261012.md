# PAZO F13 — Visual refinement approved by Product Owner (2026-10-12)

## Authority and execution
- Source: Product Owner screenshots 1–21 supplied in chat, not the previously rejected generic Figma.
- Work directly in React/TSX. AI Project Brain is implementer; **no Codex handoff**.
- GitHub working branches from `release/mvp-beta-fast-track-20261010`, draft PR to RC, **never `main` without explicit acceptance**.
- Visual validation in local Vite; Vercel not used for visual review or deliberate deployment.
- No Supabase schema/data/RLS mutations without separate authorization; no repeated approved F14/T08, T05, T06, T07/T10, T09, T11 QA.
- Match PO colors/Quicksand, zero borders/outline rings (except justified text input), and preserve functional behavior and glass-like surfaces.
- **Restricción PO prioritaria:** NO CAMBIAR LA PANTALLA DEL MAPA / LUGARES hasta que el PO lo autorice. La autorización anterior del diseño del mapa quedó expresamente suspendida.
- PO local working tree contains existing changes: avoid overwriting it; use a clean independent clone/branch after permission issue is resolved.

## Ordered delivery (independent gates)
1. **Section title labels:** PO rejected even plain replacement titles. Remove ALL category title labels (including plain replacements) entirely; retain meaningful page headings. Implemented on F13 branch.
2. **Top controls / Home feed:** after PO's 2026-10-12 feedback that even 10/9 px selector labels remain visually too large, `8c1da435` applies a deliberately MINOR reduction **10→9.5 px** for `Para ti`, **9→8.5 px** for `Cerca · Próximamente`, and selector **178×44→170×42 px**. Title placement/grid and handlers unchanged; this specific visual adjustment is pending PO approval. Do not increase all typography blindly.
3. **Pazo native icon family:** ocho símbolos principales ya personalizados + 15 iconos secundarios redibujados en `6c103d58`, en total 23; los iconos visibles en Lugares no fueron tocados. CI PASS; aceptación visual PO pendiente.
4. **MAPA/LUGARES CONGELADO POR PO (2026-10-12):** prohibido modificar pantalla Lugares, MapView, MapboxMap, superposiciones, tarjetas, controles, iconos específicos y comportamiento del mapa hasta nueva autorización explícita del Product Owner. Se revierte el rediseño de MapView introducido en `ee14658e` y se restaura desde `5016395e`: se conserva únicamente la eliminación de etiqueta superior que el PO ya solicitó. No incluir MapView en bloques de F13.
5. **My Pet missing value:** weight and diet are optional; hide blank chips and show neutral missing-value message when both absent. Implemented; visual acceptance pending.
6. **Typography:** escala nominal Tailwind +3px y +3px a 227 ocurrencias de `text-[Npx]` en 22 archivos UI sin mapa (`9ebdb5e`, `8fc837e`, `5b21d56`). CI PASS, validación visual/responsive y desbordes pendiente.
7. **Interests:** READ-ONLY audit: production public schema contains pets.interests but no interests catalog table; onboarding currently hard-codes four options (one cat-specific). Species-based DB-sourced catalog requires explicit schema/data authorization, not implemented.
8. **Profile metrics whitespace:** no ghost FollowButton slot for owned pet, and `91f640f8` reduces metrics to 23px numbers / 10–11px labels, less vertical padding, 3 columns without title collisions, local exception to broad +3px typography. Rejected previous oversized metrics screenshot 1; visual acceptance pending.
9. **Profile tab gap:** compact accessible active tabs without fake borders. Implemented; visual acceptance pending.
10. **Social profile card:** avatar+identity row, metrics nearby, translucent card, post feed full width for singleton posts. Implemented; visual acceptance pending.
11. **Glass surfaces:** `pazo-glass-card` y `pazo-glass-modal` en `src/index.css` (sin contornos, con preferencia de transparencia reducida), aplicados a 30 tarjetas de 6 vistas y 13 paneles de 11 modales. CI PASS, aprobación visual pendiente.

## F13 — Ambient Feed + exhaustive yellow heading pills audit (2026-10-12)

- **SUPERSEDED BY PO VISUAL REJECTION (2026-10-12):** The previous three animated orbs in Home/Feed were rejected as visually unattractive. Commit `a1e3ad47` restores `src/components/views/HomeView.tsx` byte-for-byte to pre-orbs state `a7ad3d84` (blob `5e9dcca2357f5f8207854ccacac4696f4daaee84`). **DO NOT restore/add Feed orbs without renewed explicit PO approval**. Public profile orbs remain unchanged.
- Audited **all 43 `src/**/*.tsx` files** and all three `src/**/*.css` files for hard-coded yellow/coral pills, uppercase eyebrows and title-like badges. The eight remaining decorative yellow title pills removed in commit `63090d44`:
  - `src/App.tsx`: Pazo Acceso / login eyebrow.
  - `src/components/modals/MessagesModal.tsx`: Mensajería 1 a 1 eyebrow.
  - `src/components/views/OnboardingView.tsx`: promo hero badge Identidad/Comunidad/Cuidado; Tu cuenta; Agregar mascota; Privacidad; Tu comunidad (5).
  - `src/components/views/CommunityDetailView.tsx`: Ayúdanos a priorizar promotional title pill.
- Kept real page headings (e.g. `Iniciar Sesión`, `Hablemos.`, `Comencemos.`), instructional steps, event handlers, badges with **functional semantics** (Admin/Founder/Perro, new/unread, recommended, active check-in, archived, privacy status) and yellow primary action buttons; removing these would misrepresent product state.
- **PO freeze exception:** `src/components/views/MapView.tsx` contains an `Ayúdanos a priorizar` yellow/transparent mini-label in future-place-feature area; deliberately **not edited** because **ALL changes to Lugares/Mapa remain unauthorized**. MapboxMap/PlaceFeatureExperiment unchanged.
- This is a code audit and branch implementation only. CI/build and Product Owner's visual comparison are separate gates; do not assert no yellow pixels anywhere.

## F13 — Onboarding species selector refinement (2026-10-12)

- PO screenshot of `Especie` selector rejected old four buttons as disproportionate. Commit `a1e3ad47` updates **only the selector in `src/components/views/OnboardingView.tsx`**: four equal-width 74px-high mini-cards, responsive grid, centered 23px PAZO animal glyphs, 12px labels, 18px corner radius, translucent idle surface, dark green/lime selected state, soft shadow and `aria-pressed` selection. Preserve `setPetSpecies` behavior and existing species IDs; no backend/data changes.
- Validation: CI pending or verified separately; actual PO visual acceptance pending. **Map remains frozen.**

## F13 — Consolidación del registro y aviso de privacidad (PO aprobado, 2026-10-12)

- **Decisión PO:** eliminar la pantalla A04 «Tú decides» como paso independiente: era meramente informativa y el botón «Guardar y continuar» no guardaba ajustes.
- **Implementado:** A02 registro cuenta (paso 1/3) → A03 agregar mascota (paso 2/3, con resumen bilingüe de privacidad y acción real `Consultar privacidad` que abre la política existente) → A04 zona/intereses (paso 3/3, antes A05). Back: A04 → A03. Bienvenida A01 sin numerar; al iniciar sesión una cuenta sin mascota entra en A03 como antes.
- El nuevo resumen advierte que nombre/especie/foto de mascota pueden ser visibles y que no se incluyan datos privados. Wording conservador según `PublicProfileView`, `petService` y `legalCopy`; sin prometer privacidad configurable que no existe.
- Se conserva la persistencia real **solo al pulsar el botón final** `Crear perfil y entrar`: llama al `handleFinishOnboarding`/RPC existente, con datos previos de mascota/zona/intereses intactos; ningún contrato de DB/Storage cambia.
- El formulario A03 admite scroll vertical y el resumen puede abrir el modal de privacidad preexistente; verificar teclado/móvil/ES+EN y validación visual PO.
- **Impacto de datos:** ninguna nueva captura, colección, evento, tabla o política; `docs/PAZO_DATA_INVENTORY.md` sin cambio de categorías.
- **Map/Lugares congelado**; no modificar `MapView`/Mapbox. CI de código y aceptación visual constituyen gates independientes.

## F13 — Publicaciones Feed: acciones compactas (2026-10-12, PO)

- PO mostró captura de desborde de «Seguir» y «Denunciar» en cabecera PostCard, y autorizó menú de 3 puntos para «Denunciar» y «Ocultar».
- Código `71f44cb7` en `src/components/views/HomeView.tsx`: distribución horizontal de cabecera con `min-w-0`, información de mascota truncable y etiqueta de recomendación adaptativa; `Seguir` permanece visible si corresponde y `Denunciar` se mueve al menú `···`. No alterar acciones de comentario/like/save.
- «Ocultar publicación» no existía como contrato de backend. Se implementa **solo para este feed en memoria React**, sin escribir Supabase ni fingir preferencia permanente: quita la tarjeta de la lista en la vista actual, muestra aviso «Publicación oculta en este feed» y permite **Deshacer**. Se reinicia al montar otra vez el feed. Reportar mantiene el flujo real `ReportDialog` y los checks `canReport`/no propias.
- Menú `role=menu` con nombres ES/EN, `aria-expanded`, cierre por botón, fuera o Escape; se evita `overflow-hidden` del artículo para que el panel no se corte en los bordes; foto conserva su recorte propio.
- Prueba `scripts/closure-ui.test.mjs` `50a0a1f1` ejercita aparición del menú, Report condicional, ocultamiento local y deshacer.
- No se modificó ningún servicio, SQL, esquema Supabase, mapa/Lugares o rama `main`. **CI de HEAD y aceptación visual PO son gates independientes.**

## F13 — Feed «Seguir» transparente (PO 2026-10-13)

- PO screenshot validated three-dot action menu but rejected dark-green solid **Seguir** in feed header.
- Add an explicit `variant="feed"` to the existing `FollowButton` component, used **only in HomeView PostCard**. This variant renders a fully transparent resting background and dark-green text (`#204E4A`), no shadow or border, with a subtle translucent hover. Keep current click handling, visibility, text, dimensions, follow API and loading state unchanged.
- **Do not modify** the styling of follow buttons in the public profile or other UI, or the three-dot menu.
- Map/Places frozen; no data/database changes. CI does not constitute PO visual approval.

## Stage acceptance
- Each block: code diff review, TS build/affected checks, browser comparison with supplied screenshots and Product Owner visual acceptance.
- A GitHub push/CI pass is not visual approval or F13 completion.
- Next action: PO revisa en Vite local el diseño, tipografía móvil, iconos, perfiles, modales glass y desbordes. CI PASS no implica visual PASS.
- Intereses por especie: NO hay catálogo DB. Queda bloqueado en Gate de modelo de datos y autorización independiente; no inventar semillas ni modificar esquema.

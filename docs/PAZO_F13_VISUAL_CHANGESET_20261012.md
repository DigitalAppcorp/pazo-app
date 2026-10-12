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

- PO expressly requested Home/Feed ambient animated blurred orbs as in the public profile: implemented **within HomeView.tsx only** (three green/lime/sage diffuse orbs, decorative and pointer-events-none beneath feed cards, existing profile-style `animate-pulse`, respects `prefers-reduced-motion`).
- Audited **all 43 `src/**/*.tsx` files** and all three `src/**/*.css` files for hard-coded yellow/coral pills, uppercase eyebrows and title-like badges. The eight remaining decorative yellow title pills removed in commit `63090d44`:
  - `src/App.tsx`: Pazo Acceso / login eyebrow.
  - `src/components/modals/MessagesModal.tsx`: Mensajería 1 a 1 eyebrow.
  - `src/components/views/OnboardingView.tsx`: promo hero badge Identidad/Comunidad/Cuidado; Tu cuenta; Agregar mascota; Privacidad; Tu comunidad (5).
  - `src/components/views/CommunityDetailView.tsx`: Ayúdanos a priorizar promotional title pill.
- Kept real page headings (e.g. `Iniciar Sesión`, `Hablemos.`, `Comencemos.`), instructional steps, event handlers, badges with **functional semantics** (Admin/Founder/Perro, new/unread, recommended, active check-in, archived, privacy status) and yellow primary action buttons; removing these would misrepresent product state.
- **PO freeze exception:** `src/components/views/MapView.tsx` contains an `Ayúdanos a priorizar` yellow/transparent mini-label in future-place-feature area; deliberately **not edited** because **ALL changes to Lugares/Mapa remain unauthorized**. MapboxMap/PlaceFeatureExperiment unchanged.
- This is a code audit and branch implementation only. CI/build and Product Owner's visual comparison are separate gates; do not assert no yellow pixels anywhere.

## Stage acceptance
- Each block: code diff review, TS build/affected checks, browser comparison with supplied screenshots and Product Owner visual acceptance.
- A GitHub push/CI pass is not visual approval or F13 completion.
- Next action: PO revisa en Vite local el diseño, tipografía móvil, iconos, perfiles, modales glass y desbordes. CI PASS no implica visual PASS.
- Intereses por especie: NO hay catálogo DB. Queda bloqueado en Gate de modelo de datos y autorización independiente; no inventar semillas ni modificar esquema.

# PAZO F13 — Visual refinement approved by Product Owner (2026-10-12)

## Authority and execution
- Source: Product Owner screenshots 1–21 supplied in chat, not the previously rejected generic Figma.
- Work directly in React/TSX. AI Project Brain is implementer; **no Codex handoff**.
- GitHub working branches from `release/mvp-beta-fast-track-20261010`, draft PR to RC, **never `main` without explicit acceptance**.
- Visual validation in local Vite; Vercel not used for visual review or deliberate deployment.
- No Supabase schema/data/RLS mutations without separate authorization; no repeated approved F14/T08, T05, T06, T07/T10, T09, T11 QA.
- Match PO colors/Quicksand, zero borders/outline rings (except justified text input), and preserve functional behavior and glass-like surfaces.
- PO local working tree contains existing changes: avoid overwriting it; use a clean independent clone/branch after permission issue is resolved.

## Ordered delivery (independent gates)
1. **Section title labels:** remove yellow/coral category pills at top of Communities, Places, My Pet, Notifications, Alert, Care, Passport, Add Pet and Create, render contextual heading as plain centered text above content in the style of «PERFIL». Do not alter action handlers. **Implementation branch `f13/section-titles-20261012`; visual review pending.**
2. **Top controls:** align language/search/messages/notifications and tab group according to screenshots 14–15, without introducing actions.
3. **Pazo native icon family:** own SVG/vector designs covering active screens; include states, semantics, sizing. Preserve the 3D map models; avoid emojis added by app UI.
4. **Map presentation:** existing Mapbox canvas full visual background, existing search at top, existing Places list horizontally scrollable at bottom; keep check-in/detail/search/privacy controls/actions, permission rules and mobile/desktop responsive.
5. **My Pet missing value:** investigate actual blank source, distinguish not-provided from loading error, do not invent data or modify DB.
6. **Typography:** +3 px to text across PAZO with per-component containment/wrapping, mobile bottom nav, tabs, fields and modal overflow; avoid destructive blanket CSS transforms.
7. **Interests:** inspect existing data source and species mapping for selectable interests; read-only schema inspection before any proposed backend changes. Do not create fabricated catalog or change data contracts.
8. **Profile metrics whitespace:** remove dead space shown screenshot 18 while keeping counters and user-visible data.
9. **Profile tab gap:** reduce spacing moderately per screenshot 19; no functional changes.
10. **Social profile card:** redesigned compact glass profile block from screenshot 20, retain photo/identity/counters/follow interactions.
11. **Glass surfaces:** consistent translucent card treatment based on screenshot 21, preserve legibility, semantics and touch targets.

## Stage acceptance
- Each block: code diff review, TS build/affected checks, browser comparison with supplied screenshots and Product Owner visual acceptance.
- A GitHub push/CI pass is not visual approval or F13 completion.
- Next action: CI + local visual review of block 1; if accepted continue block 2.

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
1. **Section title labels:** PO rejected even plain replacement titles. Remove ALL category title labels (including plain replacements) entirely; retain meaningful page headings. Implemented on F13 branch.
2. **Top controls:** compact 40px translucent actions for ES/search/chat/bell, home feed tabs centered below header, small-screen containment. Implemented; visual acceptance pending.
3. **Pazo native icon family:** own SVG/vector designs covering active screens; include states, semantics, sizing. Preserve the 3D map models; avoid emojis added by app UI.
4. **Map presentation:** existing Mapbox canvas full visual background, existing search at top, existing Places list horizontally scrollable at bottom; keep check-in/detail/search/privacy controls/actions, permission rules and mobile/desktop responsive.
5. **My Pet missing value:** weight and diet are optional; hide blank chips and show neutral missing-value message when both absent. Implemented; visual acceptance pending.
6. **Typography:** standard Tailwind named text sizes increased +3px with line-heights; mobile nav/header + home tabs adjusted. Arbitrary pixel utilities still require view-by-view audit; NOT fully complete.
7. **Interests:** inspect existing data source and species mapping for selectable interests; read-only schema inspection before any proposed backend changes. Do not create fabricated catalog or change data contracts.
8. **Profile metrics whitespace:** remove ghost FollowButton area for own pet and tighten metric layout. Implemented; visual acceptance pending.
9. **Profile tab gap:** compact accessible active tabs without fake borders. Implemented; visual acceptance pending.
10. **Social profile card:** avatar+identity row, metrics nearby, translucent card, post feed full width for singleton posts. Implemented; visual acceptance pending.
11. **Glass surfaces:** consistent translucent card treatment based on screenshot 21, preserve legibility, semantics and touch targets.

## Stage acceptance
- Each block: code diff review, TS build/affected checks, browser comparison with supplied screenshots and Product Owner visual acceptance.
- A GitHub push/CI pass is not visual approval or F13 completion.
- Next action: CI + local visual review of block 1; if accepted continue block 2.

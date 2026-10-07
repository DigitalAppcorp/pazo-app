# PAZO — ACTIVE HANDOFF

**Project Brain OS:** v1.3.0  
**Canonical OS:** `DigitalAppcorp/project-brain-os`  
**Product Owner:** Brandon  
**Active module:** Fase 8 — Lugares / Mapa / Check-ins  
**Gate:** Gate 8 REABIERTO — closure correction  
**Active branch:** `fix/phase-8-fake-doors-3d-markers`  
**Active PR:** #22 — Draft / currently mergeable  
**Main baseline before correction:** `0ce5c20bc6d075012e119c7f117d5e43ad26ffd2`

## Startup protocol for a new ChatGPT chat

Do NOT reconstruct PAZO from conversational memory.

Before acting:
1. activate/read Project Brain OS v1.3.0 from `DigitalAppcorp/project-brain-os`;
2. read `AGENTS.md`;
3. read this file;
4. read `docs/PAZO_MASTER_ROADMAP.md`;
5. read `docs/PAZO_PHASE_8_PLACES_MASTER.md`;
6. inspect PR #22 and its current HEAD;
7. inspect the active branch files before changing code;
8. continue from the exact unresolved verification below.

Do not use `main` alone as current truth while PR #22 is open.

## Working model

- Brandon is Product Owner.
- ChatGPT is the technical executor/brain: product reasoning, architecture, code, Supabase, security, migrations, tests, docs, Git/PR and regression prevention.
- Do not delegate implementation/debugging to Gemini or another AI unless Brandon explicitly asks.
- Antigravity/local machine is execution + visualization only.
- Ask Brandon only for real product decisions, required production authorization, local build/runtime output, and visual acceptance.
- Never mutate Supabase without explicit Product Owner authorization.
- Use forward migrations; never rewrite applied migration history.
- Preserve behavior already approved.

## Current truth

### Fase 8 real core
The real Places/Map/Check-ins core is already implemented and merged through PR #20.

Merge commit:
`ca3fedd977e0720839a420f2e3673942871b7a61`

Validated real core:
- Mapbox runtime: PASS;
- explicit `Usar mi ubicación`: PASS;
- exact device GPS is not persisted;
- curated real Places catalog: PASS;
- search/filter/detail: PASS;
- private check-in: PASS;
- optional visible pet identity: PASS;
- 2-hour expiration: PASS;
- move between places closes previous presence: PASS;
- manual checkout: PASS;
- F5 persistence: PASS;
- second-account privacy/isolation: PASS;
- place suggestion flow: PASS.

Applied Supabase migrations:
- `20261007052747 phase_8_places_map_core`;
- `20261007052749 phase_8_places_initial_catalog`;
- `20261007053859 fix_place_checkin_checkout_rls`.

### Why Gate 8 was reopened
Fase 8 was closed prematurely even though two already-approved deliverables were still missing/unvalidated:
1. contextual fake doors for future Place capabilities;
2. reusable caricature/low-poly 3D category markers.

Under Project Brain OS v1.3.0 Scope Closure Reconciliation, Fase 8 must remain open until both are validated and PR #22 is merged.

## Fake doors — current state

Implemented inside a real Place detail:
- `places_reviews` — Reseñas y calificaciones;
- `places_favorites` — Guardar/Listas;
- `places_user_photos` — Fotos de la comunidad;
- `places_events` — Eventos en el lugar;
- `places_routes` — Rutas y caminatas;
- `places_business_offers` — Ofertas del negocio.

Behavior:
- clearly labeled **En desarrollo**;
- view records only after >=50% viewport visibility;
- interest is unique per account + experiment;
- source segmented as `place_detail_<category>`;
- no fake reviews/photos/events/routes/offers.

Product Owner:
- local build before experiment apply: PASS;
- explicit authorization to apply experiments: RECEIVED.

Repo migration:
`20261007073500_place_extension_experiments.sql`

Supabase registry:
`20261007072355 place_extension_experiments`

Backend QA:
- all 6 module keys registered;
- view + interest transactional test: PASS;
- duplicate protection: PASS;
- QA used ROLLBACK;
- 0 QA Place views/interests persisted immediately after backend QA;
- Community experiment modules remained intact;
- Security Advisor unchanged from baseline.

Product Owner runtime validation:
- `Me interesa`: PASS;
- F5 persistence of `Interés registrado`: PASS.

Do NOT reapply the experiment migration.

## 3D category markers — current state

Assets exist:
- `public/models/places/park.gltf`;
- `trail.gltf`;
- `restaurant.gltf`;
- `veterinarian.gltf`;
- `grooming.gltf`;
- `pet-store.gltf`.

Structural preflight:
- 6/6 parse as glTF 2.0;
- embedded buffers;
- reusable by Place category.

### Latest Product Owner visual evidence
Brandon sent a screenshot of **Los Feliz Small Animal Hospital**.

Observed:
- Mapbox loads correctly;
- selected veterinary Place is on the map;
- blue 2D fallback circle is visible;
- **3D veterinary model is NOT perceptible**.

That screenshot was the pre-fix failure evidence.

After the forward visibility fix, the Product Owner completed the requested runtime/visual QA and reported success.

Therefore:
**3D VISUAL VALIDATION = PASS.**

### Root cause / forward fix already prepared
Current active-branch `MapboxMap.tsx` has a visibility correction:
- `model-scale: [12,12,12]`;
- `model-type: location-indicator`;
- `slot: top`;
- `minzoom: 13.25`;
- `model-translation: [0,0,1]`;
- `model-emissive-strength: 0.12`;
- selected Place flyTo zoom >=16.2;
- selected pitch 58°;
- 2D circle fades to opacity 0 by zoom 16;
- Mapbox basemap `show3dObjects=false`;
- `antialias=true`.

This fix was prepared **after** the screenshot that showed only the blue circle.

Product Owner follow-up validation on the latest branch:
- local build: PASS;
- veterinary 3D marker: PASS;
- park/trail visual check: PASS;
- fake-door interest: PASS;
- F5 persistence: PASS.

## Exact next action

All Product Owner runtime/visual checks for this correction are PASS.

Remaining closure sequence:
1. mark PR #22 ready;
2. merge PR #22;
3. verify `main`;
4. finalize canonical docs on top of verified `main`;
5. only then mark Fase 8 COMPLETADA and move it to Gate 9.

## Scope closure checklist

- real core implementation: PASS / merged;
- real core backend: PASS / applied;
- real core E2E: PASS;
- fake-door implementation: PASS;
- fake-door backend registration: PASS;
- fake-door runtime + F5: PASS;
- glTF assets: IMPLEMENTED;
- 3D model layer: IMPLEMENTED;
- 3D visual Product Owner acceptance: PASS;
- PR #22 merge: PENDING;
- main verification after PR #22: PENDING;
- Scope Closure Reconciliation: VALIDATION PASS / awaiting merge + main verification.

Fase 8 remains **EN CURSO** only until PR #22 is merged and `main` is verified.

## Do not do

- Do not advance to Explore/Search.
- Do not mark Fase 8 COMPLETADA.
- Do not reapply already-applied Supabase migrations.
- Do not infer visual success from technical preflight.
- Do not remove the 2D fallback until the 3D behavior is proven stable.
- Do not add Three.js or another renderer unless current Mapbox native model-layer path is proven insufficient.
- Do not change check-in/privacy/location contracts while debugging 3D.
- Do not invent new Product Owner decisions.

## Global PAZO state summary

Completed and merged:
- F0 Foundation;
- F1 Public profile + Follow;
- F2 Feed interactions;
- F3 Pet registration/edit/privacy;
- F4 Security/stabilization;
- F5 Multi-pet;
- F6 QR passport/lost/sightings;
- F7 Communities real core + contextual extension experiments;
- F9A Agenda/Care;
- F9B Private Documents;
- F8 real core is merged, but F8 phase closure is REOPENED until PR #22 passes remaining scope validation.

Known global debt:
- Supabase Auth Leaked Password Protection remains disabled.
- Messaging remains postponed/re-evaluate because of network/moderation cost.
- Events/general notifications remain incomplete/planned.

## Canonical references

- `AGENTS.md`
- `docs/PAZO_MASTER_ROADMAP.md`
- `docs/PAZO_MODULE_LIFECYCLE.md`
- `docs/PAZO_PHASE_8_PLACES_MASTER.md`
- `docs/PAZO_PHASE_8_PLACES_MVP_SPEC.md`
- `docs/PAZO_PHASE_8_PLACES_ARCHITECTURE.md`
- PR #22

Repository docs + current open PR are the source of truth. Conversation memory is secondary.

## CURRENT ACTIVE WORK — PHASE 8 CLOSURE CORRECTION

- Product Owner correctly identified missing approved scope after the original Phase 8 merge.
- Fase 8 is REOPENED until the missing pieces are validated and merged.
- original implementation PR #20 remains valid for the real core.
- correction branch: `fix/phase-8-fake-doors-3d-markers`.
- missing piece 1: contextual fake doors.
- missing piece 2: reusable caricature/low-poly 3D category markers.
- prepared fake doors:
  - `places_reviews`;
  - `places_favorites`;
  - `places_user_photos`;
  - `places_events`;
  - `places_routes`;
  - `places_business_offers`.
- fake-door migration prepared: `20261007073500_place_extension_experiments.sql` / NOT APPLIED.
- 3D assets prepared:
  - park.gltf;
  - trail.gltf;
  - restaurant.gltf;
  - veterinarian.gltf;
  - grooming.gltf;
  - pet-store.gltf.
- Mapbox model layer prepared from zoom 13.5 with 2D marker fallback.
- no new Supabase mutation has been authorized/applied for this correction.
- next: local build, then request authorization for experiment module keys, then Product Owner runtime/visual validation.
- do NOT advance to Explore/Search before this closes.

## Read first

Before making any code, database, architecture or roadmap change, read:

1. `AGENTS.md`
2. `docs/PAZO_MASTER_ROADMAP.md`
3. `docs/PAZO_MODULE_LIFECYCLE.md`
4. the active module sub-roadmap
5. `docs/PAZO_PRODUCT_VISION.md` when making strategic/product-scope decisions
6. this file

## Working model

- Product Owner: Brandon.
- ChatGPT directly owns implementation work across GitHub + Supabase.
- Product Owner makes product decisions and performs requested local/visual tests.
- Never mutate Supabase without explicit Product Owner authorization.
- Read-only Supabase inspection is allowed.
- Prefer durable project decisions in repository docs over conversational memory.
- Do not invent decisions marked pending.
- Use the two-lane roadmap:
  - Validation lane for optional/network-effect modules.
  - Implementation lane for approved/core-utility modules.
- Do not let a module in validation block an approved implementation module.

## Long-term vision

- PAZO is intended to become a broader pet ecosystem/platform if the MVP proves traction and economic viability.
- The social/pet identity layer may later support vertical systems for groomers, vets, trainers, walkers/caregivers, adoption/rescue organizations, pet businesses and other pet-related services.
- E-commerce and physical product selling are explicitly future work.
- This vision is NON-EXECUTABLE and does not authorize current implementation.
- Canonical document: `docs/PAZO_PRODUCT_VISION.md`.

## Current global product strategy

- Communities: COMPLETADA in `main`; advanced extensions continue under contextual validation.
- Fase 8 Places/Map/Check-ins is now the next active product area.
- Future fake-door / "Me interesa" tracking must be one generic system reusable by Communities, Map, Matches and future modules.
- Map/Lugares must be audited from current repo + Supabase reality before any implementation; legacy fake-door behavior is not trusted as evidence.
- Agenda/Care 9A is complete in `main`.
- Documents 9B is complete in `main`; external sharing remains outside the MVP.
- Messaging is postponed/re-evaluate due network effect/moderation cost.

## Current implementation status

**Phase 9A — Agenda/Cuidados: COMPLETADA**

- PR #12 merged to `main`;
- merge commit: `1876f7f02a452e58597a1c8151af77bc26c519f2`;
- Product Owner approved the focused visual/end-to-end test;
- backend, build, RLS/security and persistence checks passed.

Agenda MVP contracts already decided:

- utility works for a single user; no network dependency;
- care belongs to one pet;
- private owner-only;
- categories: veterinarian, vaccine, medication, hygiene, feeding, other;
- due date required;
- due time optional;
- notes optional;
- recurrence: none/daily/weekly/monthly/yearly;
- reminder offsets: none/same day/1 day/2 days/7 days;
- visual states derived: upcoming/today/overdue/completed-history;
- overdue never auto-completes;
- completion is explicit;
- recurrent completion records history and advances next due date;
- next recurrence is based on actual completion date, not the stale overdue date;
- active deletion uses archive behavior rather than destructive history deletion;
- history is paginated;
- timezone stored as IANA timezone;
- push notifications are NOT required for 9A;
- reminders work in-app first;
- Documents/Storage are NOT part of 9A.

Technical architecture:

- tables reales: `care_items`, `care_completions`;
- completion history uses snapshots so future edits do not rewrite the past;
- complete/undo are atomic;
- owner/non-owner isolation enforced in backend;
- no direct public/anon access;
- migración 9A aplicada a Supabase con autorización explícita del Product Owner;
- migración registrada en Supabase como `20261006054510 care_agenda`;
- pruebas SQL/RLS transaccionales con `ROLLBACK` aprobadas;
- Advisors revisados: sin hallazgos nuevos de seguridad atribuibles a 9A.

## Current repository state

`main` includes completed 9A and 9B implementations.

### Phase 9A — Agenda/Cuidados
- PR #12 merged;
- backend/build/security/visual validation passed.

### Phase 9B — Documentos privados
- COMPLETADA;
- PR #14 merged to `main`;
- merge commit: `6f833b779ef1a62d7321bc50dbab8c220f92a1d3`;
- Product Owner approved final visual/end-to-end validation;
- build local passed;
- backend migrations applied:
  - `20261006090551 private_pet_documents`
  - `20261006090654 fix_private_document_storage_policies`
- `pet-documents` is private, 10 MB, PDF/JPEG/PNG/WEBP;
- metadata RLS/grants and Storage policies verified;
- owner/non-owner isolation passed;
- arbitrary Storage insert without reservation blocked;
- upload/preview/download/edit/delete/F5/multi-pet validated;
- delayed delete-finalization UX bug fixed and retested;
- Security Advisor has no new 9B finding.

## Immediate next action

No implementation lane is currently authorized.

Recommended next decision:
- audit **Fase 12 — Explore/Search unificado** through Gate 0–2;
- compare its value/cost against remaining candidates;
- do not start code until Product Owner approves the resulting investment decision.

Why Explore/Search is now a strong candidate:
- real pets exist;
- Communities is real;
- Places/Map is real;
- discovery can now connect multiple real entity types instead of mostly mocks.

Messaging remains postponed/re-evaluate due network effect, moderation and operating cost.

## Important continuity note

A new ChatGPT conversation should NOT attempt to reconstruct PAZO from memory.

It should read the repository docs above and continue from this handoff. Repository docs are the canonical source of truth.

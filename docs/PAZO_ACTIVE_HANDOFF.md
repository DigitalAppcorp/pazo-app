# PAZO — Active Handoff

**Purpose:** durable context for resuming PAZO work in a new ChatGPT conversation without relying on the previous chat transcript.

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

- Communities: EXPERIMENTO ACTIVO, validation lane.
- Do not build Communities backend/roles/feed/moderation yet.
- Future fake-door / "Me interesa" tracking must be one generic system reusable by Communities, Map, Matches and future modules.
- Map has a legacy fake-door implementation, but its current write is incompatible with the real interactions schema and must not be treated as reliable data.
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

Active product work: **Fase 7.0A — Experimento de Comunidades**.

Canonical source:
`docs/PAZO_PHASE_7_COMMUNITIES_MASTER.md`

Current state:
- Communities remains **EXPERIMENTO ACTIVO**;
- 7.0A experiment is APPROVED by Product Owner;
- full Communities product/backend is blocked by data;
- the original lost Gemini `Me interesa` implementation will not be recovered;
- generic validation tracking is still the intended technical solution, but it must be implemented only after the Communities experiment itself is closed;
- PR #15 was closed without merge because it jumped to implementation too early;
- no Supabase validation-instrumentation migration was applied;
- Map/Radar is not automatically bundled into the first Communities experiment.

Implementation state:
- branch: `feat/communities-validation-instrumentation`;
- generic `validationService.ts` prepared;
- reusable `ValidationInterestPanel.tsx` prepared;
- Communities preview now represents the five approved pillars;
- simulated Join/Joined and fake member counts removed from Explore;
- migration `20261006124500_communities_validation_instrumentation.sql` prepared but NOT applied;
- private module/intent registry + three RLS-protected signal tables;
- no SECURITY DEFINER added by this architecture;
- Supabase preflight confirms no conflicting validation tables;
- Security Advisor baseline recorded before apply: 3 anon SD, 6 authenticated SD, 1 leaked-password warning.

Visual correction after Product Owner review:
- Explore is the umbrella discovery hub, not a Communities-only screen;
- Communities now lives inside the Communities category of Explore;
- entering Explore alone must not count as a Communities view;
- Communities view is emitted only when its preview is intentionally opened;
- the preview now explains what Communities is before asking for interest;
- unified Explore search remains future Phase 12 and is not faked in 7.0A.

Backend state:
- local build PASS confirmed by Product Owner;
- Supabase migration applied with explicit authorization;
- RLS/dedup/ownership/intent tests PASS;
- invalid intent, intent-without-interest, foreign user_id, anon access and private registry access correctly blocked;
- test rows rolled back; signal tables remain empty before real use;
- Security Advisor unchanged from baseline;
- two validation indexes retained because they cover foreign keys; they may show as unused until real traffic exists.

Next action:
1. Product Owner runs the branch and visually validates Communities 7.0A;
2. verify interest persists after F5;
3. verify intent persists and can be changed;
4. verify no Join/Joined or fake member counts remain;
5. verify demo mode does not persist a fake vote;
6. after Product Owner approval, finalize PR and merge to main.

## Important continuity note

A new ChatGPT conversation should NOT attempt to reconstruct PAZO from memory.

It should read the repository docs above and continue from this handoff. Repository docs are the canonical source of truth.

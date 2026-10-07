## CURRENT ACTIVE WORK — COMMUNITIES MVP REAL

- branch: `feat/communities-mvp`;
- Gate 6 product: CLOSED / approved;
- Gate 7 architecture: CLOSED;
- Gate 8 implementation: IN PROGRESS;
- product: `docs/PAZO_PHASE_7_COMMUNITIES_MVP_SPEC.md`;
- architecture: `docs/PAZO_PHASE_7_COMMUNITIES_ARCHITECTURE.md`;
- migration prepared: `20261007013000_communities_mvp_core.sql`;
- backend migrations are applied to Supabase;
- real frontend/service layer is implemented on branch;
- Explore preserves Product Owner's approved discovery hierarchy;
- Community core implemented on branch: discovery, create, detail, Join/Leave, posts/photos, likes, comments, members, admin edit/moderation/archive;
- global Feed persistence remains untouched;
- demo mode does not call real Communities backend;
- local `npm run build` PASS confirmed by Product Owner;
- Product Owner explicitly authorized backend apply;
- Supabase registry: `20261007014214 communities_mvp_core`;
- Supabase registry: `20261007014624 fix_community_storage_policies`;
- first Storage policy version had an ambiguous `name` reference; corrected forward-only by qualifying `objects.name`;
- transactional RLS/ownership/counter tests PASS;
- Storage INSERT/RLS tests PASS;
- Security Advisor: no new Communities findings;
- Communities visual/end-to-end validation: PASS;
- Product Owner caught missing agreed fake-door layer before merge;
- Community extension fake doors prepared for Events/Walks, Challenges, Badges/Recognition, Q&A, and Admin Tools;
- fake doors are contextual: members only; Admin Tools owner-only; views tracked only on real viewport visibility;
- Product Owner build PASS + explicit authorization received for Community extension experiments;
- `20261007023800 community_extension_experiments` APPLIED;
- `20261007023927 harden_community_extension_experiment_eligibility` APPLIED;
- eligibility hardened server-side: member-only general experiments, Owner-only Admin Tools;
- transactional experiment tests PASS; no test signals persisted;
- pending Product Owner visual review of fake doors;
- real Storage API DELETE validated through the app/UI: PASS;
- visual QA found unclear unlabeled fields in Community edit form;
- Community edit form labels/placeholders/required-vs-optional states fixed in commit `9fdfb7f`; Product Owner local review PASS;
- generic validation backend remains for advanced extension experiments;
- existing Communities validation test rows (2 views, 1 interest, 0 intents) remain untouched pending authorized cleanup.

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

- Communities: MVP REAL approved, Gate 8 implementation in progress.
- Build the approved minimum useful core; validate only advanced extensions contextually.
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

Next action:
1. implement the smallest generic validation infrastructure with Communities as first consumer;
2. prepare versioned migration but do not apply Supabase yet;
3. preflight build/security;
4. request explicit Product Owner authorization before backend mutation;
5. do not build Communities backend/roles/feed/moderation;
6. after validation instrumentation is stable, let Communities collect data while the implementation lane remains free for another approved module.

## Important continuity note

A new ChatGPT conversation should NOT attempt to reconstruct PAZO from memory.

It should read the repository docs above and continue from this handoff. Repository docs are the canonical source of truth.

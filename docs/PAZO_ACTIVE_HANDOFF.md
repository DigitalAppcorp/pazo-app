# PAZO — Active Handoff

**Purpose:** durable context for resuming PAZO work in a new ChatGPT conversation without relying on the previous chat transcript.

## Read first

Before making any code, database, architecture or roadmap change, read:

1. `AGENTS.md`
2. `docs/PAZO_MASTER_ROADMAP.md`
3. `docs/PAZO_MODULE_LIFECYCLE.md`
4. the active module sub-roadmap
5. this file

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

Active implementation: **Generic Validation Instrumentation**.

**Gate:** 8 — Implementation  
**Branch:** `feat/generic-validation-instrumentation`

Current state:
- type: I — infrastructure;
- Gates 0–7 closed;
- Gate 5 result: **BUILD NOW**;
- Gate 6 approved in `docs/PAZO_VALIDATION_INSTRUMENTATION_MASTER.md`;
- Gate 7 closed in `docs/PAZO_VALIDATION_INSTRUMENTATION_ARCHITECTURE.md`;
- dependency is real now because Communities lacks reliable signals and Map's current fake door writes an incompatible payload to `interactions`;
- `interactions` remains reserved for social behavior and must not be reused;
- only 2 real `pet_places` currently exist, so full Map implementation is not justified yet.

Implementation state:
- reusable validation service/panel prepared;
- Communities now shows transparent concept examples instead of fake Join/Leave;
- Radar no longer writes fake-door data to `interactions`;
- generic migration prepared and NOT applied;
- read-only Supabase preflight passed with no naming collisions;
- direct client access to validation signals is intentionally not part of the design.

Next action:
1. Product Owner pulls `feat/generic-validation-instrumentation`;
2. run `npm run build`;
3. if build passes, final migration review;
4. request explicit Product Owner authorization before applying Supabase;
5. after apply, run auth/ownership/dedup/privacy tests;
6. then Product Owner visual/end-to-end validation.

## Important continuity note

A new ChatGPT conversation should NOT attempt to reconstruct PAZO from memory.

It should read the repository docs above and continue from this handoff. Repository docs are the canonical source of truth.

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
- Documents are separated from Agenda as 9B because private Storage/signed URLs increase security scope.
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

`main` includes the complete 9A implementation via PR #12.

Verified closure evidence:
- build local passed;
- Product Owner visual/end-to-end test passed;
- create/edit/archive/complete/undo persisted correctly;
- F5 persistence passed;
- multi-pet isolation/switching passed;
- full-field date/time pickers passed;
- reminder timing and disappearance after completion passed;
- backend migration and SQL/RLS tests passed;
- Advisors reviewed.

## Immediate next action

9A is closed. Do not reopen it unless a regression is reported.

Active implementation: **9B — Documentos privados**.

**Gate:** 8 — Implementation  
**Branch:** `feat/phase-9b-documents`

Current state:
- Gates 0–7 closed;
- result: **MVP REDUCIDO**;
- Gate 6 approved in `docs/PAZO_PHASE_9B_DOCUMENTS_MASTER.md`;
- Gate 7 closed in `docs/PAZO_PHASE_9B_DOCUMENTS_ARCHITECTURE.md`;
- private upload/list/preview/download/edit/delete are in scope;
- external sharing/signed links for third parties are out of MVP;
- real audit found no documents table, no document RPC and no private document bucket;
- existing `pet-avatars` and `post-photos` buckets are public and must not be reused.

Implementation state:
- frontend/service/types prepared;
- legacy document mocks removed;
- private bucket + metadata + lifecycle RPC migration prepared;
- Supabase read-only preflight passed with no 9B collisions;
- migration is NOT applied;
- existing Security Advisor warnings are baseline rescue/Auth findings, not 9B;
- local `npm run build` passed and was confirmed by the Product Owner.

Immediate next action:
1. final migration review;
2. request explicit Product Owner authorization to apply 9B backend;
3. after apply, run DB/Storage security tests;
4. then Product Owner runs focused visual/end-to-end validation;
5. merge only after all checks pass.

Communities remains in the Validation Lane and does not block this evaluation.

## Important continuity note

A new ChatGPT conversation should NOT attempt to reconstruct PAZO from memory.

It should read the repository docs above and continue from this handoff. Repository docs are the canonical source of truth.

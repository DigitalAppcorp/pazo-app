# PAZO — Active Handoff

**Purpose:** durable context for resuming PAZO work in a new ChatGPT conversation without relying on the previous chat transcript.

## Read first

Before making any code, database, architecture or roadmap change, read:

1. `AGENTS.md`
2. `docs/PAZO_MASTER_ROADMAP.md`
3. `docs/PAZO_MODULE_LIFECYCLE.md`
4. the active module sub-roadmap
5. this file

For the current module also read:

- `docs/PAZO_MVP_MODULE_PRIORITY.md`
- `docs/PAZO_PHASE_9A_CARE_MASTER.md`
- `docs/PAZO_PHASE_9A_CARE_ARCHITECTURE.md`

## Working model

- Product Owner: Brandon.
- ChatGPT / AI Project Brain directly owns the technical process end-to-end across GitHub + Supabase: audit, architecture, implementation, migrations, security, tests, docs, PR and merge when authorized by the gate.
- Product Owner makes product decisions and performs requested local/visual tests.
- Antigravity is only the Product Owner's local execution/review environment. ChatGPT supplies exact commands when local execution is required; the Product Owner returns terminal output/screenshots and ChatGPT continues the implementation.
- Do not delegate programming/debugging to Gemini or another AI unless the Product Owner explicitly requests that exception.
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
- Agenda/Care is the next implementation-lane module.
- Documents are separated from Agenda as 9B because private Storage/signed URLs increase security scope.
- Messaging is postponed/re-evaluate due network effect/moderation cost.

## Active implementation

**Module:** Phase 9A — Agenda/Cuidados  
**Gate:** 8 — Implementation  
**Branch:** `feat/phase-9a-care`

Product Gate 6 and technical Gate 7 are closed.

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

Branch `feat/phase-9a-care` exists and tracks origin.

The Product Owner ran:

```powershell
git fetch origin
git switch feat/phase-9a-care
git pull
npm ci
npm run build
```

NPM install:
- 196 packages installed;
- 0 vulnerabilities.

Build status:
- the five legacy CareItem/handler integration errors were fixed in subsequent commits;
- Product Owner previously confirmed `npm run build` passed before the latest UX/state corrections;
- a fresh local build is required after the newest fixes before merge;
- Vercel deployment status is not usable as build evidence because deployment is rate-limited, not because of a code failure.

## Immediate next action

Backend 9A is applied and the SQL/RLS post-apply suite passed.

Latest Product Owner visual feedback was incorporated in code:
- date and time fields open their native picker from the full field;
- Agenda state is loaded on cold start, not only after opening the modal;
- changing active pet clears stale Agenda state and immediately loads that pet's care data;
- create/edit/archive/complete/undo refresh from server truth immediately;
- the global Agenda banner was removed; the header-level alert area remains reserved for rescue/lost-pet/sighting flows;
- the compact “Próximo cuidado” preview is now driven only by the selected care item's `Recordarme` window;
- “Sin recordatorio” means the compact preview never appears;
- after completing a reminder-qualified care item, the preview disappears unless the next occurrence already falls inside its reminder window.

Next:
1. Product Owner pulls latest `feat/phase-9a-care`;
2. run `npm run build` again after these UX/state fixes;
3. repeat the focused visual test: create/save → summary refresh, F5 persistence, pet switching, full-field date/time picker, reminder preview timing, complete → preview disappearance, history/undo;
4. keep Documents isolated for 9B;
5. if the focused visual/end-to-end test passes, move PR #12 out of draft, merge to `main`, verify `main`, and update the roadmap;
6. do not mark 9A COMPLETADA before merge + Product Owner visual approval.

## Important continuity note

A new ChatGPT conversation should NOT attempt to reconstruct PAZO from memory.

It should read the repository docs above and continue from this handoff. Repository docs are the canonical source of truth.

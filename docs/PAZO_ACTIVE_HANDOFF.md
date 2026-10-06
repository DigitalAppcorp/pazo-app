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
- Map has an old Gemini fake-door implementation, but its current write is incompatible with the real interactions schema and must not be treated as reliable data.
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

- planned tables: `care_items`, `care_completions`;
- completion history uses snapshots so future edits do not rewrite the past;
- complete/undo must be atomic;
- owner/non-owner isolation enforced in backend;
- no direct public/anon access;
- no Supabase schema migration for 9A has been authorized/applied yet.

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

Current build fails with exactly 5 TypeScript errors:

1. `src/App.tsx:1681`
   - `handleToggleCompleteCare` no longer exists.
   - `handleCompleteCare` exists at approximately line 1081.
   - CareModal prop wiring still references the old handler name.

2. `src/App.tsx:1682`
   - `docs` is referenced but no longer defined in App state.

3. `src/components/views/PetView.tsx:73`
   - old field `CareItem.completed` is referenced, but the new CareItem type no longer has that field.

4. `src/components/views/PetView.tsx:561`
   - old field `CareItem.date` is referenced; new care model uses the new date contract.

5. `src/components/views/PetView.tsx:561`
   - old field `CareItem.time` is referenced; new care model uses the new optional time contract.

## Immediate next action

Do NOT mutate Supabase yet.

First:
1. fix the 5 TypeScript integration regressions;
2. inspect all remaining references to the legacy CareItem shape;
3. ensure Documents mock remains isolated from 9A and does not block build;
4. run build/preflight locally;
5. inspect branch diff;
6. prepare/version 9A migration without applying it;
7. only after clean build + reviewed migration, ask Product Owner for explicit Supabase authorization.

## Important continuity note

A new ChatGPT conversation should NOT attempt to reconstruct PAZO from memory.

It should read the repository docs above and continue from this handoff. Repository docs are the canonical source of truth.

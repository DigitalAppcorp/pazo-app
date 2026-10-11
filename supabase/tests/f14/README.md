# F14 — structural PostgreSQL laboratory

This is a **test fixture, never a hosted migration or user-data backup**. All
runners connect only to `127.0.0.1:55441`, database `f14_synthetic`, administrator
`f14_admin`. `F14_PSQL` selects an official psql executable, not a remote host.
Do not forward that port to hosted PostgreSQL. Restore only in a disposable PG17
cluster. No Storage HTTP requests, binaries, hosted credentials or secrets.

`catalog-baseline.sql` reuses the successful local restoration of the project's
2026-10-10 READ ONLY pg_catalog snapshot, including **already-applied** F14.
Do not replay history or apply the fixture with db push. Original snapshot
SHA256: `2fbac99e885458998cba7611362121849cb0532a32f6bfe147a3eafe03f3f45e`.
Definitions were reviewed before publication: no user rows, private UUIDs, role
passwords, tokens or private connection strings. The only project hostname is
the public Storage endpoint already versioned in F14.
Five historical end-of-line spaces inside source function bodies are preserved
for exact fingerprints; .gitattributes scopes that whitespace exception to this
fixture only. Application code and pending migrations have no such exception.

## Fidelity

`catalog-queries.json` contains the original structural queries;
`catalog-expected-hashes.json` fingerprints source semantic projections;
`scripts/f14-postgres-catalog.mjs` compares them before and after migrations:
15 roles, 12 schemas, 76 tables, 646 columns including column ACL, 10 enums,
345 constraints/96 FK, 243 indexes, 96 policies, 46 historical triggers,
2 sequences, 12 default ACL, 25 membership options, 116 unchanged functions.
Two replaced functions, three new private helpers and six new triggers are
excluded from old hashes and tested separately with actual SQL.

Declared differences: extra local superuser f14_admin; membership **grantors**
(ADMIN/INHERIT/SET exact); compacted dropped-column slots in oauth_clients,
saml_relay_states and pet_places (names/types/defaults/ACL exact); ordering two
function definitions for their default arguments; the constraint trigger's
pseudo-constraint is recreated by its trigger, not added twice. The sequence
owner ACL was corrected to source USAGE-only; database owner remains postgres.
Windows/Linux locales and ICU versions differ; F14 identities are ASCII/exact.
CI requests ICU en-US/en_US.UTF-8.

Extensions schema ACL is restored; pgcrypto/uuid-ossp installed. Managed DDL
event triggers, Vault, pg_stat_statements, provider role/database settings and
Auth/Storage/HTTP services are **not reproduced**. No F14 dependency on omitted
extensions was found in catalog dependencies or recovered bodies. This is a
faithful F14 SQL lab, not a complete Supabase service clone or production PASS.

## Execution

`.github/workflows/ci.yml`, job `f14-postgres`, specifies the full setup. Locally
use the preserved lab or initialize a disposable PG17 cluster with f14_admin
and database f14_synthetic. Invoke psql with `-X -h 127.0.0.1 -p 55441 -U
f14_admin -d f14_synthetic -v ON_ERROR_STOP=1`:

1. Restore `catalog-baseline.sql`; run `node scripts/f14-postgres-catalog.mjs`.
2. `SET ROLE postgres`; apply pending 20261010222006 then 20261011022000;
   repeat the pair; `RESET ROLE`. The restored postgres role is **not superuser**.
3. Run `metadata.sql` and `synthetic-cases.sql` (42 results, ROLLBACK).
4. Set `pazo.test.prepare_claims='false'`; run `concurrency-fixture.sql`,
   `alias-before-claim.sql` (300 checks, ROLLBACK), then `cleanup.sql`.
5. Run `node scripts/f14-postgres-concurrency.mjs` (12 real scenarios; lock waits
   observed via pg_stat_activity rather than inferred from elapsed sleeps).
6. `npm run test:f14`, then build.

Concurrency fixtures commit **only synthetic rows**. Cleanup requires the exact
lab database/admin and synthetic actors/Storage paths. Its local TRUNCATE
CASCADE is not a product cleanup procedure. No RLS/FK/trigger is disabled.
Metadata deletion simulates the Storage API using its own allow_delete_query
switch and a checked service_role claim; no binary object is deleted.

## Meaning of PASS

The historical query-string avatar bug, reference-after-preflight race, and
DELETE using a pre-claim RLS snapshot were reproduced. Fixed SQL rejects those
schedules. Held claims protect references and object versions across RPCs;
expiry never releases quarantine. Higher isolation levels reject writes rather
than trust stale snapshots. SHARE locks can block writers; timeout/deadlock
must abort safely. No bypass or automatic invalidation is introduced.

External/custom proxy hosts remain outside URL identity matching. Known signed,
render, HTTP and browser aliases conservatively block a purge even if their
HTTP behavior is unknown. Hosted Storage's transaction role, metadata updates,
deletion ordering, binaries, HTTP/CDN and real moderator JWT execution require
a separate authorized **one disposable object** gate. Edge/global purge OFF.

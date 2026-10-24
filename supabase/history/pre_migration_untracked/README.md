# Historical PAZO SQL sources BEFORE recorded hosted migrations

**DO_NOT_EXECUTE_ARCHIVED_SQL** / **SOURCE_BASELINE_PRE_20261005_UNAVAILABLE** / **NO_GO_DB_PUSH**

These eight SQL files are immutable archived originals from Git. Their version IDs were not present in the 122 hosted `supabase_migrations.schema_migrations` records when audited.
Their DDL describes capabilities already represented in the live catalog, but existence does not certify an exact historical execution. Restoring the project from an empty database by applying the 122 hosted versions alone remains unsupported without an initial schema baseline.

Never move these back into `supabase/migrations` or run `supabase migration repair` to mimic application without an independently approved forensic gate. No hosted execution and no financial changes are authorized by this archival proposal.

Sources: `docs/PAZO_F17_PREHISTORY_ARCHIVE_MANIFEST_20261023.json`, `docs/PAZO_F17_MIGRATION_HISTORY_CONTENT_INTEGRITY_20261023.json`, PR #95 → PR #97 → PR #98.

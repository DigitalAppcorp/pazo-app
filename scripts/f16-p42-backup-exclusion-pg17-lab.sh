#!/usr/bin/env bash
# PAZO P42: isolated GitHub Actions PG17 export/restore regression.
# Fixed placeholder bytes are public test data, NOT a usable signing key.
set -euo pipefail
fail() { echo "P42_BACKUP_LAB_BLOCKED: $1" >&2; exit 1; }
[[ "\${GITHUB_ACTIONS:-}" == "true" ]] || fail "NOT_CI"
[[ "\${PGPASSWORD:-}" == "f14_synthetic_ci_only" ]] || fail "WRONG_LOGIN"
[[ -z "\${DATABASE_URL:-}" && -z "\${SUPABASE_DB_URL:-}" &&
   -z "\${SUPABASE_ACCESS_TOKEN:-}" && -z "\${PAZO_SUPABASE_PROJECT_ID:-}" &&
   -z "\${PGSERVICE:-}" ]] || fail "REMOTE_CONFIG_PRESENT"
for cmd in pg_dump pg_restore psql grep mktemp; do
  command -v "$cmd" >/dev/null || fail "MISSING_TOOL"
done
export PGHOST=127.0.0.1 PGPORT=55441 PGUSER=f14_admin PGDATABASE=f14_synthetic
[[ "$(psql -XAtq -v ON_ERROR_STOP=1 -c "SELECT current_database() || '|' || session_user;")" == "f14_synthetic|f14_admin" ]] || fail "WRONG_DATABASE"
[[ "$(pg_dump --version)" == *"PostgreSQL) 17."* ]] || fail "WRONG_CLIENT_VERSION"
scratch="$(mktemp -d)"
trap 'rm -rf -- "$scratch"' EXIT
chmod 700 "$scratch"
[[ "$(psql -XAtq -v ON_ERROR_STOP=1 -c "SELECT to_regclass('supporter_private.p42_activation_signing_keys') IS NULL;")" == "t" ]] || fail "NOT_EMPTY_LAB"
psql -X -q -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA supporter_private;
CREATE TABLE supporter_private.p42_activation_signing_keys(
 key_id text PRIMARY KEY, key_bytes bytea NOT NULL CHECK(octet_length(key_bytes)>=32),
 enabled boolean NOT NULL DEFAULT false,
 not_before timestamptz NOT NULL, not_after timestamptz
);
ALTER TABLE supporter_private.p42_activation_signing_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.p42_activation_signing_keys FORCE ROW LEVEL SECURITY;
CREATE TABLE supporter_private.p42_backup_benign_control(id int PRIMARY KEY,label text NOT NULL);
INSERT INTO supporter_private.p42_activation_signing_keys(key_id,key_bytes,enabled,not_before,not_after)
VALUES('P42_V1',decode(repeat('a1',32),'hex'),false,
       '2026-10-17T12:00:00Z'::timestamptz,
       '2026-10-18T12:00:00Z'::timestamptz);
INSERT INTO supporter_private.p42_backup_benign_control
VALUES(1,'synthetic-business-data-survives');
SQL

# Control: the original unrestricted pg_dump includes key material.
pg_dump --format=custom --create --file="$scratch/unfiltered.dump"
pg_restore --list "$scratch/unfiltered.dump" > "$scratch/unfiltered.toc"
grep -Eq '[[:space:]]TABLE DATA[[:space:]]supporter_private[[:space:]]p42_activation_signing_keys[[:space:]]' \
  "$scratch/unfiltered.toc" || fail "NEGATIVE_CONTROL_MISSING"

# Exact candidate: exclude only rows of P42 key table; retain table schema.
pg_dump --format=custom --create \
  --exclude-table-data=supporter_private.p42_activation_signing_keys \
  --file="$scratch/filtered.dump"
pg_restore --list "$scratch/filtered.dump" > "$scratch/filtered.toc"
grep -Eq '[[:space:]]TABLE[[:space:]]supporter_private[[:space:]]p42_activation_signing_keys[[:space:]]' \
  "$scratch/filtered.toc" || fail "KEY_SCHEMA_MISSING"
if grep -Eq '[[:space:]]TABLE DATA[[:space:]]supporter_private[[:space:]]p42_activation_signing_keys[[:space:]]' \
  "$scratch/filtered.toc"; then fail "KEY_DATA_EXPOSED"; fi
grep -Eq '[[:space:]]TABLE DATA[[:space:]]supporter_private[[:space:]]p42_backup_benign_control[[:space:]]' \
  "$scratch/filtered.toc" || fail "BENIGN_DATA_MISSING"

# Restore into a DIFFERENT disposable database; never reuse live PAZO.
psql -X -q -v ON_ERROR_STOP=1 -d postgres -c "CREATE DATABASE f14_p42_filtered_restore;"
pg_restore --exit-on-error --no-owner --no-acl \
  -d f14_p42_filtered_restore "$scratch/filtered.dump" >/dev/null
actual="$(psql -XAtq -v ON_ERROR_STOP=1 -d f14_p42_filtered_restore <<'SQL'
SELECT (SELECT count(*) FROM supporter_private.p42_activation_signing_keys)::text
 || '|' || (SELECT count(*) FROM supporter_private.p42_backup_benign_control)::text
 || '|' || (SELECT label FROM supporter_private.p42_backup_benign_control WHERE id=1)
 || '|' || (SELECT (relrowsecurity AND relforcerowsecurity)::text FROM pg_class
              WHERE oid='supporter_private.p42_activation_signing_keys'::regclass)
 || '|' || (SELECT CASE WHEN EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema='supporter_private'
   AND table_name='p42_activation_signing_keys' AND column_name='key_bytes'
 ) THEN 't' ELSE 'f' END);
SQL
)"
[[ "$actual" == "0|1|synthetic-business-data-survives|true|t" ]] || fail "RESTORE_FAILED"
echo "P42_BACKUP_EXCLUSION_PG17_LAB_PASS_ONLY"
echo "P42_HOSTED_SCRIPT_UNCHANGED_NO_PROVISIONING"

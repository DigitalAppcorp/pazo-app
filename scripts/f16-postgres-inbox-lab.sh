#!/usr/bin/env bash
# PAZO F16 — isolated PostgreSQL test gate, NOT a Supabase migration/deployment.
# Requires existing F14 catalog fixture + F16 consent foundation in the
# disposable GitHub Actions service. Refuses arbitrary databases and credentials.
set -euo pipefail

if [[ "${GITHUB_ACTIONS:-}" != "true" ]] ||
   [[ "${PGPASSWORD:-}" != "f14_synthetic_ci_only" ]] ||
   [[ -n "${DATABASE_URL:-}" || -n "${SUPABASE_DB_URL:-}" ||
      -n "${PAZO_SUPABASE_PROJECT_ID:-}" ]]; then
  echo 'BLOCKED: F16 SQL gate needs the disposable CI PostgreSQL only' >&2
  exit 2
fi
PSQL=(psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 55441 -U f14_admin -d f14_synthetic)
DB_INFO="$("${PSQL[@]}" -Atq -c "SELECT current_database() || '|' || session_user || '|' || current_setting('server_version_num')")"
if [[ "$DB_INFO" != f14_synthetic\|f14_admin\|17* ]]; then
  echo 'BLOCKED: F16 disposable database identity check failed' >&2
  exit 2
fi

# Fail unless F16 consent schema baseline was already set up inside THIS service.
if [[ "$("${PSQL[@]}" -Atq -c "SELECT to_regprocedure('supporter_private.wall_has_verified_entitlement(uuid)') IS NOT NULL")" != t ]]; then
  echo 'BLOCKED: F16 consent foundation missing from disposable database' >&2
  exit 2
fi

# Scope: precisely three SQL scripts, one concurrency test, no external network.
"${PSQL[@]}" -c "SET ROLE postgres;" -f supabase/tests/supporter/f16-payment-inbox-lab-draft.sql
"${PSQL[@]}" -f supabase/tests/supporter/f16-payment-inbox-metadata.sql
"${PSQL[@]}" -f supabase/tests/supporter/f16-payment-inbox-synthetic.sql
node scripts/f16-postgres-inbox-concurrency.mjs

echo 'PASS F16: disposable PostgreSQL inbox permissions, idempotency and concurrency'

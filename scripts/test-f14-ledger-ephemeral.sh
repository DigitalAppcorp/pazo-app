#!/usr/bin/env bash
# F14 D3-A: validate unapplied SQL DRAFT in disposable PostgreSQL.
# Never connect to Supabase or consume application env credentials.
set -euo pipefail
if [[ "$GITHUB_ACTIONS" != "true" ]]; then
  echo "This SQL smoke can run only on isolated GitHub CI."
  exit 2
fi
if [[ ! -f supabase/drafts/f14_media_purge_v2/20261009_privileged_attempt_ledger_PROPOSAL_ONLY.sql ]]; then
  echo "Missing proposed private ledger SQL."
  exit 2
fi
name="pazo-f14-ledger-ephemeral-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT"
cleanup(){
  status=$?
  if [[ $status -ne 0 ]]; then
    echo "Ephemeral PostgreSQL container diagnostics (no project data):"
    docker logs "$name" --tail 35 2>&1 || true
  fi
  docker rm -f "$name" >/dev/null 2>&1 || true
}

trap cleanup EXIT
echo "Starting private disposable PostgreSQL only in GitHub CI"
docker run -d --rm --name "$name" \
  -e POSTGRES_PASSWORD="f14-throwaway-only" \
  -e POSTGRES_DB="postgres" postgres:16-alpine >/dev/null
for iteration in $(seq 1 40); do
  if docker exec "$name" pg_isready -U postgres -d postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$name" pg_isready -U postgres -d postgres >/dev/null
echo "Disposable PostgreSQL is accepting connections"

# Minimum structural stubs, no application/user tables or live credentials.
docker exec -i "$name" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA moderation_private;
CREATE TABLE moderation_private.media_claims (claim_id uuid PRIMARY KEY);
SQL

# Apply ONLY to this disposable container and exercise adversarial SQL cases.
docker exec -i "$name" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  < supabase/drafts/f14_media_purge_v2/20261009_privileged_attempt_ledger_PROPOSAL_ONLY.sql
docker exec -i "$name" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  < supabase/drafts/f14_media_purge_v2/privileged_attempt_ledger_ephemeral.test.sql

echo "F14 private ledger DRAFT: disposable PostgreSQL smoke PASS (no live DB writes)"

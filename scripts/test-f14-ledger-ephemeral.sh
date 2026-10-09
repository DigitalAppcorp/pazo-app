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
# The official Postgres image briefly starts a temporary server during
# initdb, then shuts it down and starts the final server. pg_isready alone
# can incorrectly pass during that transient first server.
ready=false
for iteration in $(seq 1 45); do
  if docker logs "$name" 2>&1 | grep -q "PostgreSQL init process complete; ready for start up." &&
     docker exec "$name" psql -X -U postgres -d postgres -Atqc 'SELECT 1' >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done
if [[ "$ready" != "true" ]]; then
  echo "Final disposable PostgreSQL did not become ready"
  exit 2
fi
echo "Final disposable PostgreSQL is accepting connections"

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

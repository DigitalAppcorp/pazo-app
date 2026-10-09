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
CREATE TABLE moderation_private.media_claims (claim_id uuid PRIMARY KEY, status text NOT NULL DEFAULT 'held');
SQL

# Apply ONLY to this disposable container and exercise adversarial SQL cases.
docker exec -i "$name" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  < supabase/drafts/f14_media_purge_v2/20261009_privileged_attempt_ledger_PROPOSAL_ONLY.sql
docker exec -i "$name" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  < supabase/drafts/f14_media_purge_v2/privileged_attempt_ledger_ephemeral.test.sql

# Private state transitions deliberately return no permission to send HTTP.
docker exec -i "$name" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  < supabase/drafts/f14_media_purge_v2/20261009_attempt_transitions_SIMULATION_ONLY.sql
docker exec -i "$name" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  < supabase/drafts/f14_media_purge_v2/attempt_transitions_ephemeral.test.sql
echo "F14 private journal transitions: PostgreSQL rollback QA PASS (no HTTP)"

# Two real, separate PostgreSQL connections. Still NO Storage HTTP or live data.
docker exec -i "$name" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  < supabase/drafts/f14_media_purge_v2/attempt_concurrency_ephemeral.setup.sql

worker_a_log="$(mktemp)"
docker exec -i "$name" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  < supabase/drafts/f14_media_purge_v2/attempt_concurrency_worker_a.sql \
  >"$worker_a_log" 2>&1 &
worker_a_pid=$!

# Wait until session A has COMPLETED its journal UPDATE and is sleeping
# *inside the still-open transaction*. Poll server-side status, not clocks.
holding=false
for iteration in $(seq 1 100); do
  count=$(docker exec "$name" psql -X -U postgres -d postgres -Atqc \
    "SELECT count(*) FROM pg_stat_activity WHERE state='active' AND query LIKE 'SELECT pg_sleep(6)%' AND pid <> pg_backend_pid()" 2>/dev/null || echo 0)
  if [[ "$count" == "1" ]]; then holding=true; break; fi
  sleep 0.05
done
if [[ "$holding" != "true" ]]; then
  echo "Could not witness first session holding journal row locks"
  cat "$worker_a_log"
  wait "$worker_a_pid" || true
  rm -f "$worker_a_log"
  exit 3
fi
docker exec -i "$name" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  < supabase/drafts/f14_media_purge_v2/attempt_concurrency_worker_b.sql
if ! wait "$worker_a_pid"; then
  cat "$worker_a_log"
  rm -f "$worker_a_log"
  exit 3
fi
rm -f "$worker_a_log"
docker exec -i "$name" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  < supabase/drafts/f14_media_purge_v2/attempt_concurrency_after.sql
echo "F14 two-connection journal race: PostgreSQL PASS (no Storage HTTP)"


echo "F14 private ledger DRAFT: disposable PostgreSQL smoke PASS (no live DB writes)"

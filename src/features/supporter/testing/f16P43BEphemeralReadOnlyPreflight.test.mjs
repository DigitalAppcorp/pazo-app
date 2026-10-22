import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extractCliCredentials } from '../../../../scripts/f16-p43b-ephemeral-readonly-preflight.mjs';

const host = 'db.mrybvqdebbgcayuvgkkr.supabase.co';
const password = 'synthetic-test-secret-123456789';

function makeOutput(overrides = {}) {
  const fields = {
    PGHOST: host,
    PGPORT: '5432',
    PGDATABASE: 'postgres',
    PGUSER: 'cli_login_postgres',
    PGPASSWORD: password,
    ...overrides,
  };
  return Object.entries(fields).map(([key, value]) =>
    'export ' + key + '="' + value + '"').join('\n') +
    '\npg_dump --role=postgres --schema-only\n';
}

test('P43B parses only one private CLI output and verifies target/role', () => {
  const result = extractCliCredentials(makeOutput());
  assert.equal(result.ok, true);
  assert.equal(result.mode, 'DIRECT');
  assert.equal(result.fields.PGPASSWORD, password);
});

test('P43B accepts only PAZO session pooler identity', () => {
  const result = extractCliCredentials(makeOutput({
    PGHOST: 'aws-0-us-west-1.pooler.supabase.com',
    PGUSER: 'cli_login_postgres.mrybvqdebbgcayuvgkkr',
  }));
  assert.equal(result.ok, true);
  assert.equal(result.mode, 'SESSION_POOLER');
});

test('P43B fails closed on project mismatch, altered role, weak password, quotes', () => {
  const cases = [
    makeOutput({ PGHOST: 'db.wrong.supabase.co' }),
    makeOutput({ PGUSER: 'postgres' }),
    makeOutput({ PGUSER: 'cli_login_postgres.malicious' }),
    makeOutput({ PGPASSWORD: 'short' }),
    makeOutput({ PGPASSWORD: "bad'quote" }),
    makeOutput({ PGPASSWORD: 'bad\\escape' }),
    makeOutput({ PGPORT: '6543' }),
    makeOutput().replace('pg_dump --role=postgres', 'pg_dump --role=anon'),
    makeOutput() + 'export PGHOST="' + host + '"\n',
    'not parseable output',
  ];
  for(const input of cases) {
    const result = extractCliCredentials(input);
    assert.equal(result.ok, false);
    assert.equal(JSON.stringify(result).includes(password), false);
  }
});

test('P43B never runs provider during parser import; no command line args means no execution', () => {
  assert.deepEqual(extractCliCredentials(''), { ok: false, category: 'MISSING_FIELD' });
});

test('P43B new GO guard, unique lock, temporary login isolation and TLS are static-only', () => {
  const text = readFileSync(fileURLToPath(new URL('../../../../scripts/f16-p43b-ephemeral-readonly-preflight.mjs', import.meta.url)), 'utf8');
  assert.match(text, /const ATTEMPT = 'P43B-EPHEMERAL-20261017-01'/);
  assert.match(text, /args\.length !== 5/);
  assert.match(text, /args\[2\] !== ATTEMPT/);
  assert.match(text, /p43b-ephemeral-readonly-one-attempt-20261017-01\.lock/);
  assert.doesNotMatch(text, /p43-ephemeral-readonly-one-attempt-20261016\.lock/);
  assert.match(text, /flag: 'wx'/);
  assert.match(text, /delete cliEnv\[key\]/);
  assert.match(text, /PGGSSENCMODE = 'disable'/);
  assert.match(text, /PGSSLMODE = 'verify-full'/);
  assert.match(text, /PGSSLNEGOTIATION = 'postgres'/);
  assert.match(text, /default_transaction_read_only=on/);
  assert.match(text, /'db', 'dump', '--linked'/);
  assert.match(text, /'--dry-run', '--agent', 'no'/);
  assert.match(text, /SQL_BLOB = 'ac9246a0106ebefd6d425a549d9f207242760eec'/);
  assert.match(text, /P43B_EPHEMERAL_DB_READ_ONLY_PASS/);
});

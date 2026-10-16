import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCliCredentials } from '../../../../scripts/f16-p43-ephemeral-readonly-preflight.mjs';

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

test('P43 parses only one private CLI output and verifies target/role', () => {
  const result = extractCliCredentials(makeOutput());
  assert.equal(result.ok, true);
  assert.equal(result.mode, 'DIRECT');
  assert.equal(result.fields.PGPASSWORD, password);
});

test('P43 accepts only PAZO session pooler identity', () => {
  const result = extractCliCredentials(makeOutput({
    PGHOST: 'aws-0-us-west-1.pooler.supabase.com',
    PGUSER: 'cli_login_postgres.mrybvqdebbgcayuvgkkr',
  }));
  assert.equal(result.ok, true);
  assert.equal(result.mode, 'SESSION_POOLER');
});

test('P43 fails closed on project mismatch, altered role, weak password, quotes', () => {
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

test('P43 never runs provider during parser import; no command line args means no execution', () => {
  assert.deepEqual(extractCliCredentials(''), { ok: false, category: 'MISSING_FIELD' });
});

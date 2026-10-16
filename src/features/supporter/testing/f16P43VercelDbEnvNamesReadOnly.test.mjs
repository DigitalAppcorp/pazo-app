import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyVercelEnvTable } from '../../../scripts/f16-p43-vercel-db-env-names-readonly.mjs';

test('P43 emits only allowlisted DB variable names and enum targets', () => {
  const raw = [
    'Name               Value                       Environments                Created',
    'DATABASE_URL       Encrypted sensitiveValue!   Production, Preview        3d ago',
    'SUPABASE_URL       https://masked.example       Production                 4d ago',
    'POSTGRES_PASSWORD  Encrypted sensitiveValue2   Development                7d ago',
    'SOME_OTHER_SECRET  Encrypted topsecret3         Production                 9d ago',
  ].join('\n');
  const result = classifyVercelEnvTable(raw);
  assert.equal(result.state, 'PARSED');
  assert.deepEqual(result.dbNames, ['DATABASE_URL','POSTGRES_PASSWORD']);
  assert.deepEqual(result.targets[0].targets, ['preview','production']);
  assert.deepEqual(result.targets[1].targets, ['development']);
  const emitted = JSON.stringify(result);
  for(const secret of ['sensitiveValue','topsecret','https://masked.example']) {
    assert.equal(emitted.includes(secret), false);
  }
});

test('P43 avoids claiming no variables from unrecognized output', () => {
  const outputs = [
    'Unauthorized, please log in with token=redacted',
    'Unexpected raw string TOP_SECRET=bad',
    'Name Value Creation Date\nfoo secret',
    '',
  ];
  for(const output of outputs) {
    assert.equal(classifyVercelEnvTable(output).state, 'UNRECOGNIZED');
  }
});

test('P43 handles explicitly empty list separately', () => {
  const value = classifyVercelEnvTable('No Environment Variables found.');
  assert.equal(value.state, 'EMPTY');
  assert.deepEqual(value.dbNames, []);
});

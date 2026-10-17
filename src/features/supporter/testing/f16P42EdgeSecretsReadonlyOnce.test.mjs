import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
  P42_PROJECT_REF,P42_SECRET_NAME,P42_EDGE_READ_ATTEMPT,
  approvedP42EdgeReadArgs,projectSecretPresenceFromJson,
  projectSecretPresenceFromCliOutput,
} from '../../../../scripts/f16-p42-edge-secrets-readonly-once.mjs';

const target=P42_SECRET_NAME;
test('P42 exact project and secret name are fixed',()=>{
  assert.equal(P42_PROJECT_REF,'mrybvqdebbgcayuvgkkr');
  assert.equal(target,'PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX');
  assert.equal(P42_EDGE_READ_ATTEMPT,'P42-EDGE-GET-20261017-01');
});
test('P42 official HTTPS JSON with sensitive values projects only target presence',()=>{
  const result=projectSecretPresenceFromJson(JSON.stringify([
    {name:'OTHER_SECRET',value:'DO_NOT_SHOW_FOREIGN_SECRET'},
    {name:target,value:'DO_NOT_SHOW_P42_VALUE'},
  ]));
  assert.deepEqual(result,{present:true});
  assert.deepEqual(Object.keys(result),['present']);
  assert.doesNotMatch(JSON.stringify(result),/DO_NOT_SHOW|OTHER_SECRET/);
});
test('P42 HTTP JSON empty or unrelated is absent',()=>{
  assert.deepEqual(projectSecretPresenceFromJson('[]'),{present:false});
  assert.deepEqual(projectSecretPresenceFromJson(JSON.stringify([
    {name:target+'_OLD',value:'private'},
    {name:'ANOTHER_NAME',value:'secret'}])),{present:false});
});
test('P42 malformed and duplicate HTTPS inventories fail closed',()=>{
  for(const raw of ['{}','null','""','',JSON.stringify([{value:'X'}]),
    JSON.stringify([{name:'../../foo',value:'X'}]),
    JSON.stringify([{name:target},{name:target}]),'{invalid json',
    ' '.repeat(262145)]) assert.throws(()=>projectSecretPresenceFromJson(raw));
});
test('P42 CLI table with unicode separator yields presence without digest leak',()=>{
  const raw='    NAME      │ DIGEST\n  ───────────┼────────\n'+
    '  OTHER_SECRETS │ sensitive-other-digest\n'+
    '  '+target+' │ sensitive-target-digest\n';
  const result=projectSecretPresenceFromCliOutput(raw);
  assert.deepEqual(result,{present:true});
  assert.doesNotMatch(JSON.stringify(result),/digest|OTHER_SECRETS/);
});
test('P42 CLI ASCII table supports absent and target exact match',()=>{
  const raw='NAME | DIGEST\n-----+------\n'+target+'_BACKUP | abc123\n';
  assert.deepEqual(projectSecretPresenceFromCliOutput(raw),{present:false});
  assert.deepEqual(projectSecretPresenceFromCliOutput('NAME | DIGEST\n---+---\n'),
    {present:false});
});
test('P42 CLI malformed, warning, duplicates, escape and excessive output block',()=>{
  for(const raw of ['irrelevant',target,'', 'NAME | DIGEST\ngarbage',
    'NAME | DIGEST\n'+target+' | digest\n'+target+' | digest2',
    'NAME | DIGEST\nBLAH | \n','NAME | DIGEST\n\x1b[31mTEST | abc\x1b[0m',
    'NAME | DIGEST\n../SECRET | abc','NAME | DIGEST\n'+('A'.repeat(130))+' | abc',
    'NAME | DIGEST\n'+('A | DIGEST\n'.repeat(24000))])
    assert.throws(()=>projectSecretPresenceFromCliOutput(raw));
});
test('P42 exact user GO cannot be substituted for previous P43B/P42 write gate',()=>{
  const args=['--execute-approved-readonly','--attempt-id',P42_EDGE_READ_ATTEMPT,
    '--private-one-shot'];
  assert.equal(approvedP42EdgeReadArgs(args),true);
  for(const bad of [
    [],args.slice(0,3),[...args,'--print'],
    ['--execute-approved-write-check',...args.slice(1)],
    [args[0],args[1],'P42-WRITE-EPHEMERAL-20261017-01',args[3]],
    [args[0],args[1],'P43B-EPHEMERAL-20261017-01',args[3]],
  ]) assert.equal(approvedP42EdgeReadArgs(bad),false);
});
test('P42 source contains a single GET and no POST/DELETE/secret generators',()=>{
 const source=readFileSync(fileURLToPath(
  new URL('../../../../scripts/f16-p42-edge-secrets-readonly-once.mjs',import.meta.url)),'utf8');
 assert.match(source,/method:'GET'/);
 assert.match(source,/hostname:'api\.supabase\.com'/);
 assert.match(source,/rejectUnauthorized:true/);
 assert.match(source,/ENDPOINT_PATH = '\/v1\/projects\/' \+ P42_PROJECT_REF \+ '\/secrets'/);
 assert.match(source,/\['secrets','list'/);
 assert.match(source,/--project-ref',P42_PROJECT_REF/);
 assert.doesNotMatch(source,/method:'(?:POST|DELETE|PUT|PATCH)'/);
 assert.doesNotMatch(source,/\['secrets','(?:set|unset)'/);
 assert.doesNotMatch(source,/randomBytes\s*\(|gen_random_bytes|CREATE ROLE|ALTER ROLE/);
});
test('P42 source locks before its one authorized remote operation, no retries',()=>{
 const source=readFileSync(fileURLToPath(
  new URL('../../../../scripts/f16-p42-edge-secrets-readonly-once.mjs',import.meta.url)),'utf8');
 assert.match(source,/p42-edge-readonly-once-20261017-01\.lock/);
 assert.match(source,/flag:'wx'/);
 assert.ok(source.indexOf('writeFileSync(join(localDir') <
     source.indexOf("const listed=privateChild('supabase',['secrets','list'"));
 assert.match(source,/process\.platform!=='win32'/);
 assert.match(source,/P42_EDGE_READ_BLOCKED_ATTEMPT_ALREADY_CLAIMED/);
 assert.match(source,/P42_EDGE_READ_BLOCKED_PRIVATE_RESULT_UNVERIFIED_NO_RETRY/);
 assert.doesNotMatch(source,/\.env['"]|console\.log\([^\n]*(?:stdout|stderr|existingToken|result\.value|listed\.stdout)/);
});

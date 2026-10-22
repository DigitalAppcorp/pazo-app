// PAZO F16-P42 — ONE authorized ephemeral PostgreSQL role capability probe.
// ONLY zero-row INSERT + ROLLBACK + READ ONLY postflight. Never an Edge/secret client.
// Do not print CLI credentials, psql stdout/stderr, host, CA path or errors.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractCliCredentials } from './f16-p43b-ephemeral-readonly-preflight.mjs';

const PROJECT = 'mrybvqdebbgcayuvgkkr';
const ATTEMPT = 'P42-WRITE-EPHEMERAL-20261017-01';
const ROOT = resolve(fileURLToPath(new URL('../',import.meta.url)));
const REL_SQL = 'supabase/queries/f16_p42_ephemeral_zero_row_write_probe_ONCE.sql';
const SQL = resolve(ROOT,REL_SQL);
const SQL_BLOB = 'cdd7bc9033671fea01263d55e05510d7e82a6cdc';
const EXPECTED = [
  'P42_EPHEMERAL_ROLE_ZERO_ROW_INSERT_PASS',
  'P42_EPHEMERAL_ZERO_KEYS_GATES_OFF_POSTFLIGHT_PASS',
].join('\n');

function child(cmd,args,{env=process.env,timeout=20000,shell=false}={}) {
  try {
    const p=spawnSync(cmd,args,{cwd:ROOT,env,timeout,encoding:'utf8',
      maxBuffer:131072,windowsHide:true,shell});
    return {ok:p.status===0&&!p.error&&!p.signal,stdout:p.stdout||'',
      stderr:p.stderr||''};
  } catch {return {ok:false,stdout:'',stderr:''};}
}
function validateCA(path) {
  try {
    if (!existsSync(path) || !statSync(path).isFile() ||
        statSync(path).size < 100 || statSync(path).size > 65536) return false;
    const cert=new X509Certificate(readFileSync(path));
    const now=Date.now();
    return cert.ca===true && Date.parse(cert.validFrom)<now && Date.parse(cert.validTo)>now;
  } catch {return false;}
}
export function acceptedOperatorArguments(args) {
  return Array.isArray(args) && args.length===5 &&
    args[0]==='--execute-approved-write-check' &&
    args[1]==='--attempt-id' && args[2]===ATTEMPT &&
    args[3]==='--ca' && typeof args[4]==='string' && args[4].length>0;
}
export function staticOnlySqlContract(sql) {
  return typeof sql==='string' &&
    sql.includes('session_user NOT IN') &&
    sql.includes("current_user <> 'postgres'") &&
    sql.includes('WHERE false') &&
    sql.includes('ROLLBACK;') &&
    sql.includes('BEGIN TRANSACTION READ ONLY;') &&
    !/\b(GRANT|REVOKE|CREATE ROLE|ALTER ROLE|DELETE FROM|UPDATE supporter_private)\b/i.test(sql) &&
    !/random_bytes\s*\(|gen_random_bytes\s*\(|decode\s*\(/i.test(sql);
}
function executeGate(args) {
  if (!acceptedOperatorArguments(args)) {
    console.log('P42_WRITE_EPHEMERAL_BLOCKED_USAGE');return 2;
  }
  if (process.platform !== 'win32' || !process.env.LOCALAPPDATA ||
      process.env.GITHUB_ACTIONS==='true' || process.env.CI==='true') {
    console.log('P42_WRITE_EPHEMERAL_BLOCKED_PRIVATE_WINDOWS_ONLY');return 2;
  }
  const ca=resolve(args[4]);
  if (!validateCA(ca) || !existsSync(SQL) ||
      !staticOnlySqlContract(readFileSync(SQL,'utf8'))) {
    console.log('P42_WRITE_EPHEMERAL_BLOCKED_INPUTS');return 2;
  }
  const hash=child('git',['hash-object','--path',REL_SQL,SQL]);
  if (!hash.ok || hash.stdout.trim()!==SQL_BLOB) {
    console.log('P42_WRITE_EPHEMERAL_BLOCKED_SQL_DRIFT');return 2;
  }
  const cliVersion=child('supabase',['--version'],{shell:true});
  const pgVersion=child('psql',['--version']);
  if (!cliVersion.ok || !/(^|\s)2\.121\.0(\s|$)/.test(cliVersion.stdout.trim()) ||
      !pgVersion.ok || !/\b17\.11\b/.test(pgVersion.stdout)) {
    console.log('P42_WRITE_EPHEMERAL_BLOCKED_TOOL_DRIFT');return 2;
  }
  // Claim BEFORE any remote credential issuance. Existing P43/P43B locks untouched.
  const lockDir=join(process.env.LOCALAPPDATA,'PAZO','CodexOps');
  mkdirSync(lockDir,{recursive:true});
  try {
    writeFileSync(join(lockDir,'p42-write-ephemeral-20261017-01.lock'),
      'P42_ONE_ATTEMPT_CONSUMED_NO_SECRET\n',
      {flag:'wx',mode:0o600});
  } catch {
    console.log('P42_WRITE_EPHEMERAL_BLOCKED_LOCK_ALREADY_CLAIMED');return 2;
  }

  const cliEnv={...process.env};
  for(const key of ['SUPABASE_DB_PASSWORD','PGPASSWORD','PGPASSFILE','PGSERVICE',
    'PGSERVICEFILE','PGHOST','PGHOSTADDR','PGPORT','PGUSER','PGDATABASE',
    'DATABASE_URL','SUPABASE_DB_URL']) delete cliEnv[key];
  const login=child('supabase',['db','dump','--linked','--project-ref',PROJECT,
    '--dry-run','--agent','no'],{env:cliEnv,shell:true,timeout:30000});
  if (!login.ok) {
    console.log('P42_WRITE_EPHEMERAL_BLOCKED_CLI_CREDENTIAL_ISSUE');return 3;
  }
  const parsed=extractCliCredentials(login.stdout);
  if (!parsed.ok) {
    console.log('P42_WRITE_EPHEMERAL_BLOCKED_LOGIN_FORMAT');return 3;
  }
  const env={...process.env};
  for(const key of ['SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','DATABASE_URL',
    'SUPABASE_DB_URL','PGPASSWORD','PGPASSFILE','PGSERVICE','PGSERVICEFILE',
    'PGHOSTADDR','PGCHANNELBINDING','PGSSLMODE','PGSSLROOTCERT','PGOPTIONS',
    'PGHOST','PGPORT','PGUSER','PGDATABASE','PGTARGETSESSIONATTRS']) delete env[key];
  env.PGHOST=parsed.fields.PGHOST;
  env.PGPORT='5432';
  env.PGDATABASE='postgres';
  env.PGUSER=parsed.fields.PGUSER;
  env.PGPASSWORD=parsed.fields.PGPASSWORD;
  env.PGGSSENCMODE='disable';
  env.PGSSLMODE='verify-full';
  env.PGSSLROOTCERT=ca;
  env.PGSSLMINPROTOCOLVERSION='TLSv1.2';
  env.PGSSLMAXPROTOCOLVERSION='TLSv1.3';
  env.PGSSLNEGOTIATION='postgres';
  env.PGCONNECT_TIMEOUT='10';
  env.PGAPPNAME='pazo_p42_write_ephemeral_zero_row_probe';
  env.PGOPTIONS='-c role=postgres -c statement_timeout=15000';
  const probe=child('psql',['-X','-qAt','-w','-v','ON_ERROR_STOP=1','-f',SQL],
    {env,timeout:45000});
  delete env.PGPASSWORD;
  delete cliEnv.SUPABASE_ACCESS_TOKEN;
  if (!probe.ok || probe.stdout.trim().replace(/\r/g,'')!==EXPECTED) {
    console.log('P42_WRITE_EPHEMERAL_BLOCKED_PSQL_OR_POSTFLIGHT');
    console.log('P42_NO_REAL_KEY_NO_FINANCIAL_CHANGES');return 4;
  }
  console.log('P42_EPHEMERAL_ZERO_ROW_WRITE_PASS');
  console.log('P42_EPHEMERAL_ZERO_KEYS_GATES_OFF_POSTFLIGHT_PASS');
  console.log('P42_EDGE_SECRET_WRITE_UNVERIFIED_NO_PROVISIONING_NO_PAYMENT');
  return 0;
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {process.exitCode=executeGate(process.argv.slice(2));}
  catch {
    console.log('P42_WRITE_EPHEMERAL_BLOCKED_UNEXPECTED_NO_RETRY');
    process.exitCode=5;
  }
}

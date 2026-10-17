// PAZO F16-P42 — one-shot READ ONLY Edge Secrets inventory, never provision.
 // Private Windows operator only. No tokens, response bodies, digests or CLI output in logs.
import https from 'node:https';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const P42_PROJECT_REF = 'mrybvqdebbgcayuvgkkr';
export const P42_SECRET_NAME = 'PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX';
export const P42_EDGE_READ_ATTEMPT = 'P42-EDGE-GET-20261017-01';
const ENDPOINT_PATH = '/v1/projects/' + P42_PROJECT_REF + '/secrets';
const MAX_BYTES = 262144;
const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;

// Supabase API response may contain value fields. NEVER return full entries or values.
export function projectSecretPresenceFromJson(raw) {
  if (typeof raw !== 'string' || raw.length > MAX_BYTES) throw new Error('UNRECOGNIZED_RESPONSE');
  const inventory = JSON.parse(raw);
  if (!Array.isArray(inventory) || inventory.length > 1000) throw new Error('UNRECOGNIZED_RESPONSE');
  let matches = 0;
  for (const entry of inventory) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) ||
        typeof entry.name !== 'string' || !NAME_PATTERN.test(entry.name))
      throw new Error('UNRECOGNIZED_RESPONSE');
    if (entry.name === P42_SECRET_NAME) matches++;
  }
  if (matches > 1) throw new Error('DUPLICATE_P42_NAME');
  return { present: matches === 1 };
}

// Existing logged-in Supabase CLI performs the documented read-only "secrets list".
// Its table can contain digests: consume privately and return ONLY target-name presence.
export function projectSecretPresenceFromCliOutput(raw) {
  if (typeof raw !== 'string' || raw.length > MAX_BYTES || /\x1b/.test(raw))
    throw new Error('UNRECOGNIZED_CLI_OUTPUT');
  const lines = raw.replace(/\r/g,'').trim().split('\n').map(line=>line.trim()).filter(Boolean);
  if (!lines.length || !/^NAME\s*[│|]\s*(DIGEST|VALUE)$/.test(lines[0]))
    throw new Error('UNRECOGNIZED_CLI_OUTPUT');
  let matched = 0;
  for (const line of lines.slice(1)) {
    if (/^[─━┼┬┴┤├┐└┘┌┍┑+\-|│\s]+$/.test(line)) continue;
    const fields = line.split(/[│|]/);
    if (fields.length !== 2 || !NAME_PATTERN.test(fields[0].trim()) ||
        !fields[1].trim() || fields[1].trim().length > 1024)
      throw new Error('UNRECOGNIZED_CLI_OUTPUT');
    if (fields[0].trim() === P42_SECRET_NAME) matched++;
  }
  if (matched > 1) throw new Error('DUPLICATE_P42_NAME');
  return { present: matched === 1 };
}

export function approvedP42EdgeReadArgs(args) {
  return Array.isArray(args) && args.length === 4 &&
    args[0] === '--execute-approved-readonly' &&
    args[1] === '--attempt-id' &&
    args[2] === P42_EDGE_READ_ATTEMPT &&
    args[3] === '--private-one-shot';
}

function privateChild(command, args, timeout = 15000) {
  try {
    const run = spawnSync(command,args,{
      encoding:'utf8',timeout,maxBuffer:MAX_BYTES,windowsHide:true,
      shell:process.platform==='win32',
      env:{...process.env,NO_COLOR:'1',TERM:'dumb',SUPABASE_DEBUG:'false'},
    });
    return {ok:!run.error && !run.signal && run.status===0,
      stdout:run.stdout||'',stderr:run.stderr||''};
  } catch {
    return {ok:false,stdout:'',stderr:''};
  }
}

// Only one hardcoded HTTPS GET, no redirects, requests to other hosts or request bodies.
async function privateApiGet(token) {
  if (typeof token !== 'string' || token.length < 12 || token.length > 4096 ||
      /[\r\n\x00-\x1f\x7f]/.test(token)) throw new Error('PRIVATE_TOKEN_INVALID');
  return await new Promise((resolvePromise,rejectPromise)=>{
    let settled=false,buf='',received=0;
    const finish=(error,value)=>{
      if (settled) return;
      settled=true;
      if (error) rejectPromise(error); else resolvePromise(value);
    };
    const req=https.request({
      protocol:'https:',hostname:'api.supabase.com',port:443,
      path:ENDPOINT_PATH,method:'GET',
      headers:{Authorization:'Bearer '+token,Accept:'application/json'},
      timeout:12000,
      rejectUnauthorized:true,
    },res=>{
      if (res.statusCode !== 200) {
        res.resume();
        finish(new Error(res.statusCode===401 || res.statusCode===403
          ? 'AUTH_OR_SCOPE_BLOCKED' : 'HTTP_STATUS_BLOCKED'));
        return;
      }
      const type=String(res.headers['content-type']||'');
      if (!/^application\/json(?:\s*;|$)/i.test(type)) {
        res.resume();finish(new Error('CONTENT_TYPE_BLOCKED'));return;
      }
      res.on('data',chunk=>{
        received+=chunk.length;
        if (received>MAX_BYTES) {
          req.destroy();
          finish(new Error('RESPONSE_LIMIT_BLOCKED'));return;
        }
        buf+=chunk.toString('utf8');
      });
      res.on('end',()=>{
        try {finish(null,projectSecretPresenceFromJson(buf));}
        catch {finish(new Error('UNRECOGNIZED_RESPONSE'));}
      });
      res.on('error',()=>finish(new Error('PRIVATE_READ_FAILED')));
    });
    req.on('timeout',()=>req.destroy(new Error('PRIVATE_READ_TIMEOUT')));
    req.on('error',()=>finish(new Error('PRIVATE_READ_FAILED')));
    req.end();
  });
}

async function executeGate(args) {
  if (!approvedP42EdgeReadArgs(args)) {
    console.log('P42_EDGE_READ_BLOCKED_USAGE');return 2;
  }
  if (process.platform!=='win32' || process.env.CI==='true' ||
      process.env.GITHUB_ACTIONS==='true' || !process.env.LOCALAPPDATA ||
      !/^v22\./.test(process.version)) {
    console.log('P42_EDGE_READ_BLOCKED_PRIVATE_WINDOWS_ONLY');return 2;
  }
  // No new credential. API uses ONLY an existing environment token;
  // otherwise CLI uses its already-established private user session.
  const existingToken=process.env.SUPABASE_ACCESS_TOKEN;
  const viaApi=typeof existingToken==='string' && existingToken.length>0;
  if (!viaApi) {
    const version=privateChild('supabase',['--version']);
    if (!version.ok || !/(^|\s)2\.121\.0(\s|$)/.test(version.stdout.trim())) {
      console.log('P42_EDGE_READ_BLOCKED_LOCAL_CLI_PREFLIGHT');return 2;
    }
  }
  // The durable attempt is consumed BEFORE the first remote action; no retries.
  const localDir=join(process.env.LOCALAPPDATA,'PAZO','CodexOps');
  mkdirSync(localDir,{recursive:true});
  try {
    writeFileSync(join(localDir,'p42-edge-readonly-once-20261017-01.lock'),
      'P42_EDGE_READ_ATTEMPT_CONSUMED_NO_SECRETS\n',
      {flag:'wx',mode:0o600});
  } catch {
    console.log('P42_EDGE_READ_BLOCKED_ATTEMPT_ALREADY_CLAIMED');return 2;
  }
  try {
    let result;
    if (viaApi) {
      result=await privateApiGet(existingToken);
    } else {
      const listed=privateChild('supabase',['secrets','list',
        '--project-ref',P42_PROJECT_REF],25000);
      if (!listed.ok) throw new Error('CLI_READ_FAILED');
      result=projectSecretPresenceFromCliOutput(listed.stdout);
    }
    console.log(result.present
      ? 'P42_EDGE_READ_ONLY_PASS_TARGET_NAME_PRESENT_REVIEW_REQUIRED'
      : 'P42_EDGE_READ_ONLY_PASS_TARGET_NAME_ABSENT');
    console.log('P42_EDGE_SECRETS_READ_VERIFIED_WRITE_UNVERIFIED');
    console.log('P42_NO_KEY_GENERATION_NO_PROVISION_NO_PAYMENT');
    return 0;
  } catch {
    // Never print provider errors, raw response, token, digest or any secret name other than fixed P42.
    console.log('P42_EDGE_READ_BLOCKED_PRIVATE_RESULT_UNVERIFIED_NO_RETRY');
    console.log('P42_NO_KEY_GENERATION_NO_PROVISION_NO_PAYMENT');
    return 3;
  }
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  executeGate(process.argv.slice(2)).then(code=>{process.exitCode=code;})
    .catch(()=>{console.log('P42_EDGE_READ_BLOCKED_UNEXPECTED_NO_RETRY');process.exitCode=4;});
}

// PAZO F16-P43 — one authorized ephemeral CLI login and one P42 READ-ONLY SQL.
// NEVER print raw CLI/psql output or a password. Never execute CLI output.
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT = 'mrybvqdebbgcayuvgkkr';
const SQL_BLOB = 'ac9246a0106ebefd6d425a549d9f207242760eec';
const REL_SQL = 'supabase/queries/f16_p42_provisioning_structural_preflight_READ_ONLY.sql';
const ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const SQL = resolve(ROOT, REL_SQL);
const EXPECTED = 'P42_STRUCTURAL_PASS_NO_PROVISIONING_AUTHORITY|f|f|f|f|f';

export function extractCliCredentials(privateOutput) {
  if (typeof privateOutput !== 'string' || privateOutput.length > 131072) {
    return { ok: false, category: 'OUTPUT_SIZE_OR_TYPE' };
  }
  const fields = {};
  // Never evaluate commands or source the returned shell script.
  for (const line of privateOutput.split(/\r?\n/)) {
    const match = line.match(/^export (PGHOST|PGPORT|PGDATABASE|PGUSER|PGPASSWORD)=(["'])(.*)\2\s*$/);
    if (!match) continue;
    const name = match[1], value = match[3];
    if (name in fields) return { ok: false, category: 'DUPLICATE_FIELD' };
    if (!value || value.length > 4096 || /[\r\n\x60"'\\]/.test(value)) {
      return { ok: false, category: 'UNSAFE_FIELD_FORMAT' };
    }
    fields[name] = value;
  }
  for (const name of ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD']) {
    if (!(name in fields)) return { ok: false, category: 'MISSING_FIELD' };
  }
  const direct = fields.PGHOST === 'db.' + PROJECT + '.supabase.co' &&
    fields.PGUSER === 'cli_login_postgres';
  const pooled = /^aws-[a-z0-9-]+\.pooler\.supabase\.com$/.test(fields.PGHOST) &&
    fields.PGUSER === 'cli_login_postgres.' + PROJECT;
  if ((!direct && !pooled) || fields.PGPORT !== '5432' ||
    fields.PGDATABASE !== 'postgres' || fields.PGPASSWORD.length < 16 ||
    !/--role(?:=|\s+)["']?postgres["']?(?:\s|$)/m.test(privateOutput)) {
    return { ok: false, category: 'WRONG_TARGET_OR_PRIVILEGE' };
  }
  return { ok: true, mode: direct ? 'DIRECT' : 'SESSION_POOLER', fields };
}

function execute(cmd, args, options = {}) {
  // No output from the provider is ever forwarded to stdout or stderr.
  try {
    const run = spawnSync(cmd, args, {
      encoding: 'utf8', timeout: options.timeout || 20000,
      maxBuffer: 131072, windowsHide: true,
      shell: Boolean(options.shell),
      cwd: ROOT, env: options.env || process.env,
    });
    return {
      ok: run.status === 0 && !run.error && !run.signal,
      stdout: run.stdout || '', stderr: run.stderr || '',
      error: Boolean(run.error),
    };
  } catch {
    return { ok: false, stdout: '', stderr: '', error: true };
  }
}

function run() {
  const args = process.argv.slice(2);
  if (args.length !== 3 || args[0] !== '--execute-approved-readonly' ||
    args[1] !== '--ca' || !args[2]) {
    console.log('P43_BLOCKED_USAGE');
    return 2;
  }
  const caPath = resolve(args[2]);
  if (!existsSync(caPath) || !statSync(caPath).isFile() || !existsSync(SQL)) {
    console.log('P43_BLOCKED_LOCAL_FILES');
    return 2;
  }
  // Only the exact reviewed SQL Git blob is authorized. Verify the
  // working-tree file contents using Git checkout filters.
  const sqlHash = execute('git', ['hash-object', '--path', REL_SQL, SQL]);
  if (!sqlHash.ok || sqlHash.stdout.trim() !== SQL_BLOB) {
    console.log('P43_BLOCKED_SQL_BLOB_MISMATCH');
    return 2;
  }
  // Exactly ONE authorized provider credential request, possibly creating
  // temporary cli_login_postgres role. No retries and NO actual db dump.
  const cli = execute('supabase', [
    'db', 'dump', '--linked', '--project-ref', PROJECT,
    '--dry-run', '--agent', 'no',
  ], { shell: process.platform === 'win32', timeout: 30000 });
  if (!cli.ok) {
    console.log('P43_EPHEMERAL_CLI_REQUEST_FAILED_NO_DB_SQL');
    return 3;
  }
  const parsed = extractCliCredentials(cli.stdout);
  if (!parsed.ok) {
    console.log('P43_EPHEMERAL_CREDENTIAL_FORMAT_BLOCKED_' + parsed.category);
    return 3;
  }
  const fields = parsed.fields;
  const env = { ...process.env };
  for(const name of ['PGSERVICE','PGSERVICEFILE','PGPASSFILE','PGHOSTADDR',
    'PGCHANNELBINDING','PGSSLMODE','PGSSLROOTCERT','PGOPTIONS']) delete env[name];
  env.PGHOST = fields.PGHOST;
  env.PGPORT = '5432';
  env.PGDATABASE = 'postgres';
  env.PGUSER = fields.PGUSER;
  env.PGPASSWORD = fields.PGPASSWORD; // Child process environment only.
  env.PGSSLMODE = 'verify-full';
  env.PGSSLROOTCERT = caPath;
  env.PGCONNECT_TIMEOUT = '10';
  env.PGAPPNAME = 'pazo_f16_p43_ephemeral_read_only_probe';
  env.PGOPTIONS = '-c default_transaction_read_only=on -c statement_timeout=15000 -c role=postgres';
  const psql = execute('psql', ['-X', '-qAt', '-w', '-v', 'ON_ERROR_STOP=1',
    '-f', SQL], { env, timeout: 45000 });
  delete env.PGPASSWORD;
  // Even psql output is not echoed, except a hardcoded static marker.
  if (!psql.ok || psql.stdout.trim() !== EXPECTED) {
    console.log('P43_EPHEMERAL_PSQL_READONLY_FAILED_NO_P42_WRITES');
    return 4;
  }
  console.log('P43_EPHEMERAL_DB_READ_ONLY_PASS');
  console.log('P42_STRUCTURAL_PASS_NO_PROVISIONING_AUTHORITY');
  console.log('P43_NO_REAL_KEY_NO_CHECKOUT_NO_PAYMENT');
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = run();
  } catch {
    console.log('P43_EPHEMERAL_PROBE_ABORTED_NO_P42_WRITES');
    process.exitCode = 5;
  }
}

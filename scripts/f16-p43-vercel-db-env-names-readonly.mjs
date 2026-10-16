// PAZO F16-P43 — Read-only Vercel environment variable metadata inspection.
// Supported data: CLI "vercel env ls" table only. NEVER print original CLI
// stdout/stderr, unparsed rows, env values, auth tokens, URLs or debug output.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const TEAM = 'digitalapp';
const PROJECTS = Object.freeze([
  ['pazo-app', 'prj_nk61nr5ZVpxlp8qbIvRCsua36iXI'],
  ['pazo-app-t83r', 'prj_K40UBOjEcIpvUMYy1A2SdRHlG0IH'],
]);

const DB_KEY_RE = /^(?:(?:DATABASE|POSTGRES|POSTGRESQL|PG|DB|DIRECT|POOLER|PRISMA)_|(?:SUPABASE_)?(?:DB_URL|DATABASE_URL)|(?:SUPABASE_)?(?:PGHOST|PGUSER|PGPASSWORD|PGPORT|PGDATABASE)|(?:SUPABASE_)?(?:POSTGRES_URL|POSTGRES_PRISMA_URL|POSTGRES_URL_NON_POOLING))|^(?:DATABASE_URL|DIRECT_URL|POSTGRES_URL|SUPABASE_DB_URL)$/i;

export function classifyVercelEnvTable(source) {
  if (typeof source !== 'string' || source.length > 1024 * 1024) {
    return { state: 'UNRECOGNIZED', dbNames: [], targets: [] };
  }
  const stripped = source.replace(/\x1b\[[0-9;]*m/g, '');
  const lines = stripped.split(/\r?\n/);
  // A successful Vercel CLI listing is a tabular listing with a name/key
  // column and environment column, or an explicit "No Environment Variables".
  const formatOk = lines.some((line) =>
    /\b(?:name|key)\b/i.test(line) &&
    /\b(?:environment|target)\b/i.test(line));
  const empty = /no environment variables (?:found|set|defined)/i.test(stripped);
  if (!formatOk && !empty) return { state: 'UNRECOGNIZED', dbNames: [], targets: [] };
  if (empty && !formatOk) return { state: 'EMPTY', dbNames: [], targets: [] };

  const relevant = new Map();
  let parsed = 0;
  for (const line of lines) {
    // Do not use raw line for display; only a FIRST-column identifier
    // matching the PostgreSQL-connection variable allowlist can be emitted.
    const m = line.match(/^\s*[│|]?\s*([A-Z][A-Z0-9_]{1,127})(?=\s{2,}|\s*[│|]\s*|\s+(?:Encrypted|Sensitive|Plaintext)\b)/);
    if (!m || /^(NAME|KEY|VALUE|TARGET|ENVIRONMENT|ENVIRONMENTS|CREATED|UPDATED)$/i.test(m[1])) continue;
    parsed++;
    const key = m[1];
    if (!DB_KEY_RE.test(key)) continue;
    const targets = new Set();
    if (/\bproduction\b/i.test(line)) targets.add('production');
    if (/\bpreview\b/i.test(line)) targets.add('preview');
    if (/\bdevelopment\b/i.test(line)) targets.add('development');
    relevant.set(key, Array.from(targets).sort());
  }
  if (!parsed && !empty) return { state: 'UNRECOGNIZED', dbNames: [], targets: [] };
  if (!parsed && empty) return { state: 'EMPTY', dbNames: [], targets: [] };
  const dbNames = Array.from(relevant.keys()).sort();
  return {
    state: 'PARSED',
    dbNames,
    targets: dbNames.map(key => ({ key, targets: relevant.get(key) })),
  };
}

function runCli(args) {
  // All arguments are hardcoded constants; no credentials or user input.
  // Windows Vercel CLI is a .cmd launcher; shell is needed for .cmd.
  try {
    return spawnSync('vercel', args, {
      encoding: 'utf8',
      shell: process.platform === 'win32',
      timeout: 30000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
      env: { ...process.env, NO_COLOR: '1', CI: '1' },
    });
  } catch {
    return { status: -1, stdout: '', stderr: '' };
  }
}

export function inspectCli() {
  let blocked = 0;
  for (const [projectName, projectId] of PROJECTS) {
    // --project ensures the scoped project is selected even when local
    // directory contains a link to another Vercel project.
    const result = runCli(['env', 'ls', '--scope', TEAM, '--project', projectId, '--no-color']);
    if (result.status !== 0 || result.error) {
      blocked++;
      console.log(projectName + '=BLOCKED_OR_UNRECOGNIZED');
      continue;
    }
    const parsed = classifyVercelEnvTable(result.stdout);
    if (parsed.state !== 'PARSED' && parsed.state !== 'EMPTY') {
      blocked++;
      console.log(projectName + '=UNRECOGNIZED_CLI_FORMAT');
      continue;
    }
    console.log(projectName + '=METADATA_' + parsed.state);
    console.log(projectName + '_DB_CONNECTION_KEY_COUNT=' + parsed.dbNames.length);
    for (const entry of parsed.targets) {
      // Emit only a whitelisted env KEY and normalized target enums.
      console.log(projectName + '_DB_KEY=' + entry.key + ';TARGETS=' +
        (entry.targets.length ? entry.targets.join(',') : 'UNKNOWN'));
    }
  }
  console.log(blocked ? 'P43_VERCEL_METADATA_INCOMPLETE_NO_SECRETS'
    : 'P43_VERCEL_METADATA_REVIEW_ONLY_NO_SECRETS');
  return blocked ? 2 : 0;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = inspectCli();
}

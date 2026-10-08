import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  COLD_VERIFY_WORKDIR,
  DEFAULT_LOCAL_WORKDIR,
  prepareLocalSupabase,
} from './prepare-local-supabase.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workdir = COLD_VERIFY_WORKDIR
const cliTemp = join(workdir, 'cli-temp')
const portOffset = 1000 + (process.pid % 200)
const apiPort = 54321 + portOffset
const projectId = `pazo-verify-${process.pid}`

const redact = (value) =>
  value
    .replace(
      /("?(?:ANON_KEY|PUBLISHABLE_KEY|SECRET_KEY|SERVICE_ROLE_KEY|JWT_SECRET|S3_PROTOCOL_ACCESS_KEY_ID|S3_PROTOCOL_ACCESS_KEY_SECRET)"?\s*[:=]\s*"?)[^",\r\n}]+/gi,
      '$1[redacted]',
    )
    .replace(/\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g, '[redacted-jwt]')
    .replace(/\bsb_(?:secret|publishable)_[a-zA-Z0-9_-]+\b/g, '[redacted-key]')

const excerpt = (value) => {
  const clean = redact(value || '').trim()
  if (clean.length <= 8000) return clean
  return `${clean.slice(0, 4000)}\n... output truncated ...\n${clean.slice(-4000)}`
}

const run = (command, args, label, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
    timeout: options.timeout || 600_000,
    env: { ...process.env, ...options.env },
  })

  if ((result.error || result.status !== 0) && !options.allowFailure) {
    const diagnostic = [
      excerpt(result.stderr),
      excerpt(result.stdout),
      result.error?.message || '',
    ].filter(Boolean).join('\n')
    throw new Error(`${label} failed${diagnostic ? `: ${diagnostic}` : ''}`)
  }

  return result
}

const runSupabase = (args, label, options) => {
  if (process.platform === 'win32') {
    if (args.some((value) => /[\s"&|<>^%]/u.test(String(value)))) {
      throw new Error('Supabase verification argument is not safe for cmd.exe.')
    }
    const commandLine = ['npx', '--no-install', 'supabase', ...args].join(' ')
    return run('cmd.exe', ['/d', '/s', '/c', commandLine], label, options)
  }
  return run('npx', ['--no-install', 'supabase', ...args], label, options)
}

let failure = null
let dailyWasRunning = false
try {
  const dailyStatus = runSupabase(
    ['--workdir', DEFAULT_LOCAL_WORKDIR, 'status'],
    'daily Supabase status',
    { allowFailure: true },
  )
  dailyWasRunning = dailyStatus.status === 0
  if (dailyWasRunning) {
    runSupabase(
      ['--workdir', DEFAULT_LOCAL_WORKDIR, 'stop'],
      'daily Supabase pause',
      { timeout: 300_000 },
    )
  }

  prepareLocalSupabase({ workdir, projectId, portOffset })
  rmSync(cliTemp, { recursive: true, force: true })
  mkdirSync(cliTemp, { recursive: true })
  const isolatedEnvironment = { TEMP: cliTemp, TMP: cliTemp }
  runSupabase(
    ['--workdir', workdir, 'start'],
    'isolated Supabase start',
    { env: isolatedEnvironment },
  )
  runSupabase(
    [
      '--workdir',
      workdir,
      'test',
      'db',
      '--local',
      join(workdir, 'supabase', 'tests', 'database', 'local_dev_contract.test.sql'),
    ],
    'isolated database contract',
    { env: isolatedEnvironment },
  )
  run(
    process.execPath,
    [join(repoRoot, 'scripts', 'verify-local-flow.mjs')],
    'isolated API flow',
    {
      env: {
        ...isolatedEnvironment,
        PAZO_LOCAL_SUPABASE_WORKDIR: workdir,
        PAZO_LOCAL_SUPABASE_PORT: String(apiPort),
      },
    },
  )
} catch (error) {
  failure = error
} finally {
  try {
    runSupabase(
      ['--workdir', workdir, 'stop', '--project-id', projectId, '--no-backup'],
      'isolated Supabase cleanup',
      { timeout: 300_000 },
    )
  } catch (error) {
    if (!failure) failure = error
  }
  try {
    rmSync(workdir, { recursive: true, force: true })
  } catch (error) {
    if (!failure) failure = error
  }
  if (dailyWasRunning) {
    try {
      runSupabase(
        ['--workdir', DEFAULT_LOCAL_WORKDIR, 'start'],
        'daily Supabase restart',
        { timeout: 600_000 },
      )
    } catch (error) {
      if (!failure) failure = error
    }
  }
}

if (failure) throw failure
console.log('PAZO cold-start PASS: isolated stack rebuilt, tested and removed.')

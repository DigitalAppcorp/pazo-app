import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = resolve(dirname(scriptPath), '..')
export const DEFAULT_LOCAL_WORKDIR = resolve(repoRoot, '.local-supabase')
export const COLD_VERIFY_WORKDIR = resolve(DEFAULT_LOCAL_WORKDIR, 'cold-verify')

const isWithin = (child, parent) => {
  const path = relative(parent, child)
  return path !== '' && path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path)
}

const assertSafeGeneratedWorkdir = (workdir) => {
  const resolvedWorkdir = resolve(workdir)
  const temporaryRoot = resolve(tmpdir())
  const isDefault = resolvedWorkdir === DEFAULT_LOCAL_WORKDIR
  const isColdVerificationWorkdir = resolvedWorkdir === COLD_VERIFY_WORKDIR
  const isVerificationWorkdir =
    isWithin(resolvedWorkdir, temporaryRoot)
    && basename(resolvedWorkdir).startsWith('pazo-supabase-verify-')

  if (!isDefault && !isColdVerificationWorkdir && !isVerificationWorkdir) {
    throw new Error(`Refusing to generate an unexpected Supabase workdir: ${resolvedWorkdir}`)
  }

  return resolvedWorkdir
}

const migrationVersion = (name) => {
  const match = name.match(/^(\d{14})_.+\.sql$/)
  if (!match) throw new Error(`Invalid migration filename: ${name}`)
  return match[1]
}

const copyDirectoryIfPresent = (source, target) => {
  if (existsSync(source)) cpSync(source, target, { recursive: true })
}

export const prepareLocalSupabase = ({
  workdir = process.env.PAZO_LOCAL_SUPABASE_WORKDIR || DEFAULT_LOCAL_WORKDIR,
  projectId = process.env.PAZO_LOCAL_SUPABASE_PROJECT_ID || 'pazo-app',
  portOffset = Number(process.env.PAZO_LOCAL_SUPABASE_PORT_OFFSET || 0),
} = {}) => {
  const resolvedWorkdir = assertSafeGeneratedWorkdir(workdir)
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    throw new Error('Local Supabase project id contains unsupported characters.')
  }
  if (!Number.isInteger(portOffset) || portOffset < 0 || portOffset > 5000) {
    throw new Error('Local Supabase port offset must be an integer between 0 and 5000.')
  }

  const sourceSupabase = resolve(repoRoot, 'supabase')
  const localMigrations = join(sourceSupabase, 'local_migrations')
  const canonicalMigrations = join(sourceSupabase, 'migrations')
  const targetSupabase = join(resolvedWorkdir, 'supabase')

  if (existsSync(targetSupabase)) {
    rmSync(targetSupabase, { recursive: true, force: true })
  }
  mkdirSync(targetSupabase, { recursive: true })

  let config = readFileSync(join(sourceSupabase, 'config.toml'), 'utf8')
  config = config.replace(
    /^project_id\s*=\s*"[^"]+"/m,
    `project_id = "${projectId}"`,
  )

  if (portOffset > 0) {
    config = config.replace(
      /^(\s*(?:port|shadow_port|inspector_port)\s*=\s*)(\d+)(\s*)$/gm,
      (_line, prefix, port, suffix) => {
        const shifted = Number(port) + portOffset
        if (shifted > 65535) throw new Error(`Port offset exceeds valid range: ${shifted}`)
        return `${prefix}${shifted}${suffix}`
      },
    )
  }

  writeFileSync(join(targetSupabase, 'config.toml'), config, 'utf8')
  copyFileSync(join(sourceSupabase, 'seed.sql'), join(targetSupabase, 'seed.sql'))
  copyDirectoryIfPresent(join(sourceSupabase, 'functions'), join(targetSupabase, 'functions'))
  copyDirectoryIfPresent(join(sourceSupabase, 'tests'), join(targetSupabase, 'tests'))

  const targetMigrations = join(targetSupabase, 'migrations')
  mkdirSync(targetMigrations, { recursive: true })

  const localFiles = readdirSync(localMigrations)
    .filter((name) => name.endsWith('.sql'))
    .sort()
  if (localFiles.length === 0) throw new Error('No local baseline migrations were found.')

  const baselineVersion = migrationVersion(localFiles[0])
  const selected = new Map()
  for (const name of localFiles) selected.set(name, join(localMigrations, name))

  for (const name of readdirSync(canonicalMigrations).filter((file) => file.endsWith('.sql')).sort()) {
    if (migrationVersion(name) <= baselineVersion) continue
    if (selected.has(name)) throw new Error(`Duplicate local/canonical migration: ${name}`)
    selected.set(name, join(canonicalMigrations, name))
  }

  for (const [name, source] of [...selected.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    copyFileSync(source, join(targetMigrations, name))
  }

  console.log(
    `PAZO local: workdir preparado con ${selected.size} migraciones; historia canónica intacta.`,
  )
  return {
    workdir: resolvedWorkdir,
    migrationCount: selected.size,
  }
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  prepareLocalSupabase()
}

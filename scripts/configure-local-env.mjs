import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const localWorkdir = process.env.PAZO_LOCAL_SUPABASE_WORKDIR || '.local-supabase'
const expectedPort = process.env.PAZO_LOCAL_SUPABASE_PORT || '54321'
const cliArgs = [
  '--no-install',
  'supabase',
  '--workdir',
  localWorkdir,
  'status',
  '-o',
  'env',
]
const command = process.platform === 'win32' ? 'cmd.exe' : 'npx'
if (process.platform === 'win32' && /[\s"&|<>^%]/u.test(localWorkdir)) {
  throw new Error('El workdir local contiene caracteres no compatibles con cmd.exe.')
}
const args = process.platform === 'win32'
  ? ['/d', '/s', '/c', `npx ${cliArgs.join(' ')}`]
  : cliArgs
const result = spawnSync(command, args, {
  encoding: 'utf8',
  shell: false,
})

const parseCliEnv = (value) => {
  const entries = new Map()

  for (const line of value.split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
    if (!match) continue

    let parsed = match[2].trim()
    if (parsed.startsWith('"') && parsed.endsWith('"')) {
      parsed = JSON.parse(parsed)
    }
    entries.set(match[1], parsed)
  }

  return entries
}

const local = parseCliEnv(result.stdout || '')
const apiUrl = local.get('API_URL')
const publishableKey = local.get('PUBLISHABLE_KEY') || local.get('ANON_KEY')

if (!apiUrl || !publishableKey) {
  throw new Error(
    'Supabase local no devolvió API_URL y PUBLISHABLE_KEY/ANON_KEY. Ejecuta `npx supabase start` primero.'
  )
}

const parsedUrl = new URL(apiUrl)
if (!['127.0.0.1', 'localhost'].includes(parsedUrl.hostname) || parsedUrl.port !== expectedPort) {
  throw new Error('La configuración detectada no corresponde al Supabase local de PAZO.')
}

const envPath = resolve('.env.local')
let content = existsSync(envPath) ? readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '') : ''

const setVariable = (name, value) => {
  const nextLine = `${name}=${value}`
  const pattern = new RegExp(`^${name}=.*$`, 'm')

  if (pattern.test(content)) {
    content = content.replace(pattern, nextLine)
  } else {
    content = `${content.trimEnd()}${content.trim() ? '\n' : ''}${nextLine}\n`
  }
}

setVariable('VITE_SUPABASE_URL', apiUrl)
setVariable('VITE_SUPABASE_PUBLISHABLE_KEY', publishableKey)
setVariable(
  'VITE_ENABLE_LOCAL_POSTHOG',
  process.env.PAZO_ENABLE_LOCAL_POSTHOG === '1' ? 'true' : 'false',
)
writeFileSync(envPath, content.replace(/^\uFEFF/, ''), 'utf8')

console.log(
  'PAZO local: .env.local apunta a Supabase local; PostHog localhost está desactivado; valores no mostrados.',
)

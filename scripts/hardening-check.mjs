import fs from 'node:fs'

const read = (path) => fs.readFileSync(path, 'utf8')
const fail = (message) => {
  console.error(`HARDENING CHECK FAILED: ${message}`)
  process.exitCode = 1
}

const assertIncludes = (content, needle, label) => {
  if (!content.includes(needle)) fail(`${label} is missing "${needle}"`)
}

const assertExcludes = (content, needle, label) => {
  if (content.includes(needle)) fail(`${label} must not contain "${needle}"`)
}

const app = read('src/App.tsx')
const main = read('src/main.tsx')
const supabaseClient = read('src/services/supabaseClient.ts')
const paypalWebhook = read('supabase/functions/paypal-webhook/index.ts')
const packageJson = JSON.parse(read('package.json'))
const observability = read('src/services/observability.ts')

for (const forbidden of [
  'PayPalButtons',
  'showFounderModal',
  'pitch_seen_',
  'Círculo de Fundadores',
  '$2 al mes',
  'is_founder: true',
]) {
  assertExcludes(app, forbidden, 'src/App.tsx')
}

assertExcludes(
  supabaseClient,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'browser Supabase client'
)
assertExcludes(
  supabaseClient,
  'SUPABASE_SERVICE_ROLE_KEY',
  'browser Supabase client'
)
assertIncludes(
  supabaseClient,
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'browser Supabase client'
)

assertIncludes(main, '<ErrorBoundary>', 'src/main.tsx')
assertIncludes(main, 'initializeObservability()', 'src/main.tsx')

for (const required of [
  'verify-webhook-signature',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_WEBHOOK_ID',
  'PAYPAL_PLAN_ID',
  'subscription.plan_id !== expectedPlanId',
]) {
  assertIncludes(paypalWebhook, required, 'PayPal webhook')
}

if (packageJson.dependencies?.['@paypal/react-paypal-js']) {
  fail('inactive PayPal frontend SDK must not be bundled')
}

for (const required of [
  '[redacted-email]',
  '[redacted-jwt]',
  'window.addEventListener(\'unhandledrejection\'',
]) {
  assertIncludes(observability, required, 'observability service')
}

if (!process.exitCode) {
  console.log('Hardening regression checks: PASS')
}

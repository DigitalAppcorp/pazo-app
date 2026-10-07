import fs from 'node:fs'
import path from 'node:path'

const fail = (message) => {
  console.error(`PRIVACY CHECK FAILED: ${message}`)
  process.exitCode = 1
}

const read = (file) => fs.readFileSync(file, 'utf8')

const walk = (directory) => {
  const files = []

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...walk(target))
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(target)
    }
  }

  return files
}

const packageJson = JSON.parse(read('package.json'))
const dependencies = {
  ...(packageJson.dependencies || {}),
  ...(packageJson.devDependencies || {}),
}

const trackingDependenciesRequiringReview = [
  'posthog-js',
  '@fullstory/browser',
  'rrweb',
  'mixpanel-browser',
  '@sentry/replay',
]

for (const dependency of trackingDependenciesRequiringReview) {
  if (dependencies[dependency]) {
    fail(
      `Tracking dependency "${dependency}" requires explicit privacy review before it can be added.`
    )
  }
}

const forbiddenPatterns = [
  { regex: /autocapture\s*:\s*true/g, label: 'autocapture enabled' },
  { regex: /capture_pageview\s*:\s*true/g, label: 'automatic pageview capture enabled' },
  { regex: /startSessionRecording\s*\(/g, label: 'session replay recording' },
  { regex: /session[_-]?recording/gi, label: 'session recording configuration' },
  { regex: /\brrweb\b/gi, label: 'rrweb/session replay library' },
  { regex: /\bhotjar\s*\(/gi, label: 'Hotjar tracking' },
  { regex: /\bFullStory\s*\(/g, label: 'FullStory tracking' },
  { regex: /\bmixpanel\./g, label: 'Mixpanel direct tracking' },
  { regex: /\bgtag\s*\(/g, label: 'direct Google Analytics tracking' },
  { regex: /\bfbq\s*\(/g, label: 'direct Meta Pixel tracking' },
]

for (const file of walk('src')) {
  const content = read(file)

  for (const { regex, label } of forbiddenPatterns) {
    regex.lastIndex = 0
    if (regex.test(content)) {
      fail(`${label} found in ${file}. Privacy review is required first.`)
    }
  }
}

const onboarding = read('src/components/views/OnboardingView.tsx')
if (!onboarding.includes('const [isOver18, setIsOver18] = useState(false)')) {
  fail('18+ attestation must not be preselected.')
}

const observability = read('src/services/observability.ts')
for (const required of [
  'SAFE_EVENT_PROPERTY_ALLOWLIST',
  "sendEvent('$exception'",
  '[redacted-email]',
  '[redacted-jwt]',
]) {
  if (!observability.includes(required)) {
    fail(`Observability privacy control missing: ${required}`)
  }
}

if (!fs.existsSync('docs/PAZO_PRIVACY_DATA_GOVERNANCE.md')) {
  fail('docs/PAZO_PRIVACY_DATA_GOVERNANCE.md is missing.')
}

if (!process.exitCode) {
  console.log('Privacy/data-governance checks: PASS')
}

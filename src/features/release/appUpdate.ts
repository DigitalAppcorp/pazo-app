// Replaced by Vite at build time; tests and the dev server run without it.
declare const __PAZO_BUILD_ID__: string

export const currentBuildId: string = typeof __PAZO_BUILD_ID__ === 'string' ? __PAZO_BUILD_ID__ : 'development'

export type UpdateTrigger = 'resume' | 'interval'
export type UpdateAction = 'none' | 'reload' | 'offer'

const RELOADED_KEY = 'pazo_update_reloaded_v1'
const CHECK_EVERY_MS = 30 * 60 * 1000
const RESUME_GAP_MS = 60 * 1000
const BUILD_PATTERN = /^[a-z0-9-]{4,64}$/i

/**
 * A newer release reloads on its own only when the person comes back to the app with nothing
 * half done, and only once per release. Otherwise the app offers the update and waits.
 */
export function decideUpdate(input: {
  current: string
  latest: string | null
  trigger: UpdateTrigger
  busy: boolean
  reloadedFor: string | null
}): UpdateAction {
  if (!input.latest || input.current === 'development' || input.latest === input.current) return 'none'
  if (input.trigger === 'resume' && !input.busy && input.reloadedFor !== input.latest) return 'reload'
  return 'offer'
}

export function readBuildStamp(value: unknown): string | null {
  const build = value && typeof value === 'object' ? (value as { build?: unknown }).build : null
  return typeof build === 'string' && BUILD_PATTERN.test(build) ? build : null
}

const TEXT_FIELDS = 'textarea, input:not([type]), input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input[type="number"], input[type="date"], input[type="time"], input[type="password"], input[type="search"]'

/** Open dialogs, typed text, chosen files and payment returns all count as work in progress. */
export function pageIsBusy(doc: Document, place: { pathname: string; hash: string }): boolean {
  if (/^\/paypal\//.test(place.pathname) || /paypal=/.test(place.hash)) return true
  if (doc.querySelector('[aria-modal="true"], [contenteditable="true"]')) return true
  for (const field of Array.from(doc.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(TEXT_FIELDS))) {
    if (field.value.trim()) return true
  }
  for (const picker of Array.from(doc.querySelectorAll<HTMLInputElement>('input[type="file"]'))) {
    if (picker.files?.length) return true
  }
  return false
}

async function fetchLatestBuild(): Promise<string | null> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store', signal: controller.signal })
    return response.ok ? readBuildStamp(await response.json()) : null
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

function readReloadedFor(): string | null {
  try { return window.sessionStorage.getItem(RELOADED_KEY) } catch { return null }
}

function rememberReload(build: string) {
  try { window.sessionStorage.setItem(RELOADED_KEY, build) } catch { /* Without storage a second reload only offers. */ }
}

export function reloadForUpdate() {
  window.location.reload()
}

/** Checks quietly when the person returns to PAZO and every 30 minutes while it is on screen. */
export function watchForUpdates(options: { isBusy: () => boolean; onOffer: () => void }): () => void {
  if (currentBuildId === 'development' || typeof window === 'undefined') return () => undefined
  let lastCheck = Date.now()
  let checking = false
  let reloadedThisPage = false

  const check = async (trigger: UpdateTrigger) => {
    if (checking || navigator.onLine === false) return
    checking = true
    lastCheck = Date.now()
    const latest = await fetchLatestBuild()
    checking = false
    const action = decideUpdate({
      current: currentBuildId,
      latest,
      trigger,
      busy: options.isBusy(),
      reloadedFor: reloadedThisPage ? latest : readReloadedFor(),
    })
    if (action === 'reload' && latest) {
      reloadedThisPage = true
      rememberReload(latest)
      reloadForUpdate()
    } else if (action === 'offer') {
      options.onOffer()
    }
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible' && Date.now() - lastCheck >= RESUME_GAP_MS) void check('resume')
  }
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) void check('resume')
  }
  const timer = window.setInterval(() => {
    if (document.visibilityState === 'visible') void check('interval')
  }, CHECK_EVERY_MS)

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pageshow', onPageShow)
  return () => {
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pageshow', onPageShow)
  }
}

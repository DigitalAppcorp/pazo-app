import { excludeBrowserAnalytics } from './analyticsPreference'

/** PO order 8-nov-2026: a browser where a test or administrator account signs in
 * stops sending usage signals, including later visits without a session.
 * It happens once per browser. If the administrator turns signals back on in
 * Administration → My activity, that choice is respected. */
export const AUTO_EXCLUSION_KEY = 'pazo_analytics_auto_excluded_v1'

type AccountLike = { id?: string; app_metadata?: Record<string, unknown> } | null | undefined

export function isTestAccount(user: AccountLike): boolean {
  return user?.app_metadata?.pazo_marketing_qa === true || user?.app_metadata?.pazo_marketing_qa === 'true'
}

function alreadyApplied(): boolean {
  try { return window.localStorage.getItem(AUTO_EXCLUSION_KEY) === '1' } catch { return true }
}

// Accounts already checked in this page load: a session refresh does not ask again.
const checked = new Set<string>()

export async function autoExcludeInternalBrowser(user: AccountLike, isAdmin: () => Promise<boolean>): Promise<boolean> {
  if (typeof window === 'undefined' || !user?.id || alreadyApplied()) return false
  let internal = isTestAccount(user)
  if (!internal) {
    if (checked.has(user.id)) return false
    try {
      internal = await isAdmin()
      if (!internal) checked.add(user.id)
    } catch { internal = false }
  }
  if (!internal || alreadyApplied()) return false
  if (!excludeBrowserAnalytics(true)) return false
  try { window.localStorage.setItem(AUTO_EXCLUSION_KEY, '1') } catch { /* The exclusion itself is saved. */ }
  return true
}

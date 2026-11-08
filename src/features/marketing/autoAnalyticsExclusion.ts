import { excludeBrowserAnalytics } from './analyticsPreference'

/** PO order 8-nov-2026: a browser where a test account signs in stops sending
 * usage signals, including later visits without a session. The flag travels in
 * the session itself, so this makes no request. It happens once per browser; if
 * the browser is included again from Administration → My activity, that choice
 * is respected. Administrator browsers keep the existing manual switch. */
export const AUTO_EXCLUSION_KEY = 'pazo_analytics_auto_excluded_v1'

type AccountLike = { id?: string; app_metadata?: Record<string, unknown> } | null | undefined

export function isTestAccount(user: AccountLike): boolean {
  return user?.app_metadata?.pazo_marketing_qa === true || user?.app_metadata?.pazo_marketing_qa === 'true'
}

function alreadyApplied(): boolean {
  try { return window.localStorage.getItem(AUTO_EXCLUSION_KEY) === '1' } catch { return true }
}

export function autoExcludeTestAccountBrowser(user: AccountLike): boolean {
  if (typeof window === 'undefined' || !user?.id || !isTestAccount(user) || alreadyApplied()) return false
  if (!excludeBrowserAnalytics(true)) return false
  try { window.localStorage.setItem(AUTO_EXCLUSION_KEY, '1') } catch { /* The exclusion itself is saved. */ }
  return true
}

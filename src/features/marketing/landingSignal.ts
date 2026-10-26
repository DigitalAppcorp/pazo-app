// A modest same-tab repeat suppression; not bot prevention or unique visitors.
// No generated tracking ID, persistent cookie or device fingerprint.
export const LANDING_SIGNAL_REPEAT_MS = 24 * 60 * 60 * 1000
const creatives = new Set([
  'perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en',
])
export function shouldSendLandingSignal(
  previous: unknown,
  creative: string,
  now: number,
): boolean {
  if (!creatives.has(creative) || !Number.isSafeInteger(now) || now < 0) return false
  if (!previous || typeof previous !== 'object') return true
  const p = previous as {creative?:unknown;sentAt?:unknown}
  if (p.creative !== creative || !Number.isSafeInteger(p.sentAt) || (p.sentAt as number) < 0) return true
  const elapsed = now - (p.sentAt as number)
  return elapsed >= LANDING_SIGNAL_REPEAT_MS || elapsed < 0
}

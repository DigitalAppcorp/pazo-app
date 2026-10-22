// PAZO F16 — pure, fail-closed product rule; NEVER grants payment entitlement.
// Inputs must be derived from approved, privacy-reviewed activity sources.
// This module neither collects events nor schedules/shows a pitch itself.
export const SUPPORTER_PITCH_POLICY = Object.freeze({
  minimumAccountDays: 7,
  minimumActiveDaysIn14: 3,
  minimumMeaningfulActions: 5,
  minimumActionSurfaces: 2,
  dismissalCooldownDays: 30,
})

const DAY_MS = 24 * 60 * 60 * 1000
const nonNegativeInteger = n => Number.isSafeInteger(n) && n >= 0

export function evaluateSupporterPitchEligibility(input, nowMs) {
  const blocked = reason => ({eligible: false, reason})
  if (!input || typeof input !== 'object' || !Number.isFinite(nowMs) || nowMs < 0)
    return blocked('unknown_state')
  // An unknown or unverified subscription state is not a basis for a pitch.
  if (input.isSupporter !== false)
    return blocked('supporter_state_unverified')
  if (input.isFirstSession !== false || input.inOnboarding !== false ||
      input.inRescueFlow !== false || input.isBusy !== false)
    return blocked('sensitive_or_unknown_context')
  if (!Number.isFinite(input.accountCreatedAtMs) ||
      input.accountCreatedAtMs < 0 || input.accountCreatedAtMs > nowMs)
    return blocked('account_age_unverified')
  if (nowMs - input.accountCreatedAtMs < SUPPORTER_PITCH_POLICY.minimumAccountDays * DAY_MS)
    return blocked('account_too_new')
  if (!nonNegativeInteger(input.activeDaysInLast14) || input.activeDaysInLast14 > 14 ||
      !nonNegativeInteger(input.meaningfulActions) ||
      !nonNegativeInteger(input.distinctActionSurfaces))
    return blocked('activity_unverified')
  if (input.activeDaysInLast14 < SUPPORTER_PITCH_POLICY.minimumActiveDaysIn14 ||
      input.meaningfulActions < SUPPORTER_PITCH_POLICY.minimumMeaningfulActions ||
      input.distinctActionSurfaces < SUPPORTER_PITCH_POLICY.minimumActionSurfaces)
    return blocked('insufficient_product_value')
  if (input.lastDismissedAtMs !== null) {
    if (!Number.isFinite(input.lastDismissedAtMs) ||
        input.lastDismissedAtMs < 0 || input.lastDismissedAtMs > nowMs)
      return blocked('dismissal_unverified')
    if (nowMs - input.lastDismissedAtMs < SUPPORTER_PITCH_POLICY.dismissalCooldownDays * DAY_MS)
      return blocked('dismissal_cooldown')
  }
  return {eligible: true, reason: 'eligible'}
}

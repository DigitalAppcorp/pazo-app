const blockers = new Set([
  null,
  'hosted_gate_required',
  'health_requires_review',
  'merchant_requires_review',
])
// Requested and effective states differ during a safety stop. A requested
// checkout always offers Pause, even if health currently blocks new charges.
export function publicSupporterControls(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    [
      'checkoutsRequested',
      'checkoutsEnabled',
      'invitationsEnabled',
      'healthy',
      'certified',
    ].some((k) => typeof value[k] !== 'boolean') ||
    !blockers.has(value.openBlocker) ||
    (value.checkoutsEnabled &&
      (!value.checkoutsRequested ||
        !value.healthy ||
        !value.certified ||
        value.openBlocker !== null)) ||
    (value.openBlocker === null && (!value.healthy || !value.certified))
  )
    return { financial: null, promotion: null }
  return {
    financial: value.checkoutsRequested
      ? 'pause_checkouts'
      : value.openBlocker === null
        ? 'open_checkouts'
        : null,
    promotion: value.invitationsEnabled
      ? 'pause_invitations'
      : 'resume_invitations',
  }
}

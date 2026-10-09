// PAZO F14 A2 — SIMULATION ONLY: privileged Storage-attempt journal protocol.
// Pure deterministic state transitions; NOT deployed, NOT a lock, not a ledger.
// The future backend must durably journal BEFORE HTTP, fence every privileged
// writer, enforce compare-and-swap/fencing generation, and recover uncertain
// outcomes before any path is released. None of those capabilities exists yet.
// No function here authorizes/executes DELETE, mutates a claim or marks purged.
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const VERSION = /^[a-zA-Z0-9_-]{8,128}$/
const reasons = Object.freeze({
  INVALID: 'invalid_or_untrusted_attempt',
  FENCE: 'missing_durable_privileged_writer_fence',
  STALE: 'stale_attempt_fence',
  TRANSITION: 'unsafe_or_duplicate_transition',
})

const safe = (s, rejection = null) => Object.freeze({
  ...s, rejection,
  mayDelete: false,
  shouldSendHttp: false,
  mayFinalizePurge: false,
  canReleaseHold: false,
  cdnAbsentVerified: false,
})
const deny = reason => safe({ phase: 'manual_review', reason })

/**
 * Model an attempted, separately authorized and durable backend operation.
 * A UI, client-provided boolean, or this return value NEVER establishes a
 * real durable writer fence. It must not be used to invoke Storage HTTP.
 */
export function beginSimulatedAttempt({ claimId, objectId, fenceToken, generation, selector } = {}) {
  if (!UUID.test(claimId || '') || !UUID.test(objectId || '') ||
      !UUID.test(fenceToken || '') || !Number.isSafeInteger(generation) ||
      generation < 1 || !selector ||
      !['post-photos', 'community-post-photos'].includes(selector.bucket) ||
      typeof selector.path !== 'string' || !selector.path ||
      selector.path.startsWith('/') || selector.path.includes('..') ||
      selector.path.includes('//') || !/^[A-Za-z0-9_./-]+$/.test(selector.path) ||
      !VERSION.test(selector.versionId || ''))
    return deny(reasons.INVALID)

  return safe({
    phase: 'prepared_unverified', claimId, objectId, fenceToken, generation,
    selector: Object.freeze({
      bucket: selector.bucket, path: selector.path, versionId: selector.versionId,
    }),
    reason: 'requires_external_durable_writer_fence',
    dispatchCount: 0,
    originAbsentObserved: false,
  })
}

/**
 * Events are hypothetical inputs from a future trusted orchestrator.
 * The booleans below ONLY exercise safety logic; they are NOT evidence that
 * PAZO has registered all service_role writers or persisted a real ledger.
 */
export function stepSimulatedAttempt(state, event) {
  if (!state || !event || state.phase === 'manual_review' ||
      !UUID.test(state.claimId || '') || !UUID.test(state.fenceToken || '') ||
      !Number.isSafeInteger(state.generation) ||
      typeof event !== 'object')
    return deny(reasons.INVALID)

  if (event.fenceToken !== state.fenceToken ||
      event.generation !== state.generation ||
      (event.claimId !== undefined && event.claimId !== state.claimId) ||
      (event.objectId !== undefined && event.objectId !== state.objectId))
    return safe(state, reasons.STALE)

  switch (event.type) {
    case 'JOURNAL_DISPATCH':
      if (state.phase !== 'prepared_unverified') return safe(state, reasons.TRANSITION)
      if (event.ledgerWriteAcknowledged !== true ||
          event.allPrivilegedWritersFenced !== true ||
          event.fenceStillOwned !== true)
        return safe(state, reasons.FENCE)
      // A safe ledger would only *record* that a request may be in flight.
      // This simulation NEVER returns permission to actually send it.
      return safe({
        ...state, phase: 'possibly_in_flight', dispatchCount: 1,
        reason: 'remote_delete_dispatch_not_implemented',
      })
    case 'HTTP_TIMEOUT':
    case 'HTTP_ERROR':
      if (state.phase !== 'possibly_in_flight') return safe(state, reasons.TRANSITION)
      return safe({
        ...state, phase: 'unknown_after_dispatch',
        reason: 'must_reconcile_remote_attempt_before_retry_or_release',
      })
    case 'HTTP_SUCCESS':
      if (state.phase !== 'possibly_in_flight') return safe(state, reasons.TRANSITION)
      return safe({
        ...state, phase: 'awaiting_origin_check',
        reason: 'transport_success_is_not_origin_or_cdn_absence',
      })
    case 'OBSERVE_ORIGIN':
      if (!['awaiting_origin_check','unknown_after_dispatch'].includes(state.phase))
        return safe(state, reasons.TRANSITION)
      if (event.bucket !== state.selector.bucket ||
          event.path !== state.selector.path ||
          event.checkedAfterDispatch !== true ||
          event.infoStatus !== 404 ||
          event.listStatus !== 'absent' ||
          event.observedObjectId != null)
        return safe({
          ...state, phase: 'unknown_after_dispatch',
          reason: 'origin_identity_or_absence_unverified',
        })
      return safe({
        ...state, phase: 'origin_absent_observed',
        originAbsentObserved: true,
        reason: 'cdn_retention_and_writer_quiescence_unverified',
      })
    case 'REQUEST_MANUAL_REVIEW':
      if (state.phase === 'prepared_unverified' ||
          state.phase === 'origin_absent_observed' ||
          state.phase === 'unknown_after_dispatch')
        return safe({
          ...state, phase: 'manual_review',
          reason: 'requires_privileged_operator_reconciliation',
        })
      return safe(state, reasons.TRANSITION)
    default:
      // In particular, there is NO RELEASE_HOLD, RETRY_DELETE, MARK_PURGED,
      // or bare-path DELETE transition, even with an expired lease.
      return safe(state, reasons.TRANSITION)
  }
}

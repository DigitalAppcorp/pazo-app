/**
 * F14 A3: final Auth deletion adapter, server-side candidate ONLY.
 * NOT WIRED to the public Edge endpoint and NOT DEPLOYED.
 *
 * The approved, authoritative backend must provide the private durable
 * auth-final intent and each revalidation. No browser-provided boolean,
 * JWT user_metadata, or environment variable can authorize a deletion.
 * This module NEVER logs identifiers/tokens.
 */
export interface A3AuthAdmin {
  auth: {
    admin: {
      getUserById(id: string): Promise<{
        data: { user: { id: string } | null } | null
        error: unknown
      }>
      deleteUser(id: string, shouldSoftDelete: false): Promise<{ error: unknown }>
    }
  }
}

export interface A3AuthFinalPorts {
  /** Fresh, exclusive authorized operator lease for this specific subject. */
  verifyExclusiveLease(subjectId: string): Promise<boolean>
  /** No media owned or referenced anywhere; confirmed via Storage API + DB. */
  verifyStorageAndUrlsGone(subjectId: string): Promise<boolean>
  /** All FK, legacy media references, care, rescues and PII are reconciled. */
  verifyPersonalDataGone(subjectId: string): Promise<boolean>
  /** No other author's posts/replies disappeared due to cascading FK. */
  verifyOtherUsersPreserved(subjectId: string): Promise<boolean>
  /** No live Auth sessions/refresh tokens or sensitive outstanding JWT use. */
  verifySessionsRevoked(subjectId: string): Promise<boolean>
  /** Backup, logs and lawfully retained content explicitly reviewed. */
  verifyRetentionReviewed(subjectId: string): Promise<boolean>
  /**
   * Transactional, server-only CAS. Persist irreversible final intent before
   * calling Auth API, to support crash recovery after Auth.deleteUser succeeds.
   */
  stageFinalIntent(subjectId: string): Promise<boolean>
  /** True only if the persisted intent remains valid for this subject. */
  verifyFinalIntent(subjectId: string): Promise<boolean>
  /** Durable idempotent status transition, AFTER Auth absence is verified. */
  markCompleted(subjectId: string): Promise<boolean>
}

export class A3AuthFinalBlocked extends Error {
  constructor() { super('Account deletion finalization unavailable') }
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function checkGate(value: Promise<boolean>): Promise<void> {
  if (await value !== true) throw new A3AuthFinalBlocked()
}

type AdminUserResult = Awaited<ReturnType<A3AuthAdmin['auth']['admin']['getUserById']>>

function userMissing(result: AdminUserResult): boolean {
  // A null/empty user without explicit Auth 404 is NOT verified erasure.
  return result.data?.user == null
    && typeof result.error === 'object'
    && result.error !== null
    && 'status' in result.error
    && result.error.status === 404
}

async function requireAuthAbsence(admin: A3AuthAdmin, subjectId: string): Promise<void> {
  const result = await admin.auth.admin.getUserById(subjectId)
  if (!userMissing(result)) throw new A3AuthFinalBlocked()
}

async function requirePreflight(
  ports: A3AuthFinalPorts,
  subjectId: string,
): Promise<void> {
  await checkGate(ports.verifyExclusiveLease(subjectId))
  await checkGate(ports.verifyStorageAndUrlsGone(subjectId))
  await checkGate(ports.verifyPersonalDataGone(subjectId))
  await checkGate(ports.verifyOtherUsersPreserved(subjectId))
  await checkGate(ports.verifySessionsRevoked(subjectId))
  await checkGate(ports.verifyRetentionReviewed(subjectId))
}

/**
 * Server-only, injectably testable candidate.
 *
 * Permanent Auth deletion (shouldSoftDelete=false) is deliberately the LAST
 * destructive step. If a retry sees Auth already absent, it requires a durable
 * final-intent receipt, then rechecks all independent invariants. Auth API
 * 401/403/429/5xx/network errors NEVER qualify as a successful removal.
 */
export async function finalizeA3AuthUser(
  admin: A3AuthAdmin,
  ports: A3AuthFinalPorts,
  subjectId: string,
  releaseApproved: boolean,
): Promise<{ completed: true }> {
  if (releaseApproved !== true || !UUID.test(subjectId)) {
    throw new A3AuthFinalBlocked()
  }

  try {
    await requirePreflight(ports, subjectId)
    const before = await admin.auth.admin.getUserById(subjectId)
    if (userMissing(before)) {
      // Crash-safe retry of a previously authorized Auth deletion.
      await checkGate(ports.verifyFinalIntent(subjectId))
    } else {
      if (before.error || before.data?.user?.id !== subjectId) {
        throw new A3AuthFinalBlocked()
      }
      await checkGate(ports.stageFinalIntent(subjectId))
      await checkGate(ports.verifyFinalIntent(subjectId))
      await requirePreflight(ports, subjectId)
      const result = await admin.auth.admin.deleteUser(subjectId, false)
      if (result.error) throw new A3AuthFinalBlocked()
    }

    await requireAuthAbsence(admin, subjectId)
    await checkGate(ports.verifyFinalIntent(subjectId))
    // Do not complete on expired leases or newly visible dependencies.
    await requirePreflight(ports, subjectId)
    await checkGate(ports.markCompleted(subjectId))
    return { completed: true }
  } catch {
    // Never leak Auth/DB internal errors to a caller.
    throw new A3AuthFinalBlocked()
  }
}

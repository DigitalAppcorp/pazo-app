import {
  inspectMediaManifest,
  inspectMediaRemovalVerification,
  type MediaInventoryEntry,
  type MediaRemovalVerification,
} from '../../../src/features/account/mediaManifest.ts'

/**
 * F14 A3: dependency-injected candidate for a human-supervised deletion run.
 *
 * NO LIVE ADAPTER is installed. Endpoint index.ts is immutably disabled (503).
 * All ports MUST be implemented by a privileged server that independently
 * enforces identity, durable leases, row locks, write fences, third-party
 * preservation, exact Storage generations and retries.
 * This TS interface is not a security boundary. Never expose it to the browser.
 */
export type A3RejectCode =
  | 'not_approved' | 'not_authorized' | 'lease_invalid' | 'writes_not_frozen'
  | 'third_party_unverified' | 'media_unverified'
  | 'data_unverified' | 'sessions_unverified'
  | 'retention_unverified' | 'auth_unverified'

export class A3Rejected extends Error {
  readonly code: A3RejectCode
  constructor(code: A3RejectCode) {
    super(code)
    this.code = code
  }
}

export interface A3ReviewPorts {
  /** Verified request, approved human operator AND recent subject reauth. */
  authorize(): Promise<boolean>
  /** Atomic server-side CAS lease check. Called before every irreversible step. */
  verifyLease(): Promise<boolean>
  /** Freeze ALL app and privileged writers before any owned data is removed. */
  freezeAccountWrites(): Promise<boolean>
  verifyWritesFrozen(): Promise<boolean>
  /** Archive and hide third-party contributions (do not delete their authors). */
  preserveOthers(): Promise<boolean>
  verifyOthersPreserved(): Promise<boolean>
  /** Must query the actual Storage object identity and all app references. */
  manifest(): Promise<readonly MediaInventoryEntry[]>
  /** Must enforce the SAME object generation/version and lease server-side. */
  removeExactObject(row: Readonly<MediaInventoryEntry>): Promise<void>
  /** Independent origin/URL checks; not a promise about all global CDN caches. */
  verifyMediaRemoved(row: Readonly<MediaInventoryEntry>): Promise<MediaRemovalVerification>
  /** Idempotent DB cleanup respecting FK order, archived owners and rescues. */
  cleanAccountData(): Promise<boolean>
  verifyDataGoneAndOtherUsersIntact(): Promise<boolean>
  /** Revoke sessions and verify outstanding JWT/session constraints. */
  revokeSessions(): Promise<boolean>
  verifySessionsRevoked(): Promise<boolean>
  /** Independently attest backup, moderation and legal retention policy. */
  verifyRetention(): Promise<boolean>
  /** Auth admin deletion MUST be the last destructive operation. */
  deleteAuthUser(): Promise<void>
  verifyAuthUserAbsent(): Promise<boolean>
  /** Completed status only after verified Auth deletion. */
  markCompleted(): Promise<void>
}

async function requireLease(ports: A3ReviewPorts): Promise<void> {
  if (await ports.verifyLease() !== true) throw new A3Rejected('lease_invalid')
}

/**
 * Internal candidate only. Caller MUST supply immutable, separately approved
 * server-side activation; never accept approval from an HTTP body or JWT custom
 * user_metadata. The shipped endpoint does not call this function.
 */
export async function runSupervisedA3Candidate(
  ports: A3ReviewPorts,
  releaseApproved: boolean,
): Promise<{ completed: true }> {
  if (releaseApproved !== true) throw new A3Rejected('not_approved')
  if (await ports.authorize() !== true) throw new A3Rejected('not_authorized')
  await requireLease(ports)

  if (await ports.freezeAccountWrites() !== true
      || await ports.verifyWritesFrozen() !== true) {
    throw new A3Rejected('writes_not_frozen')
  }
  await requireLease(ports)

  if (await ports.preserveOthers() !== true
      || await ports.verifyOthersPreserved() !== true) {
    throw new A3Rejected('third_party_unverified')
  }
  await requireLease(ports)
  if (await ports.verifyWritesFrozen() !== true) throw new A3Rejected('writes_not_frozen')

  const objects = await ports.manifest()
  const review = inspectMediaManifest(objects)
  if (review.blocked.length > 0 || review.safeCandidates.length !== objects.length) {
    throw new A3Rejected('media_unverified')
  }
  for (const object of objects) {
    await requireLease(ports)
    if (await ports.verifyWritesFrozen() !== true) throw new A3Rejected('writes_not_frozen')
    await ports.removeExactObject(object)
    const evidence = inspectMediaRemovalVerification(await ports.verifyMediaRemoved(object))
    if (!evidence.passed) throw new A3Rejected('media_unverified')
  }

  await requireLease(ports)
  if (await ports.verifyWritesFrozen() !== true) throw new A3Rejected('writes_not_frozen')
  if (await ports.cleanAccountData() !== true
      || await ports.verifyDataGoneAndOtherUsersIntact() !== true) {
    throw new A3Rejected('data_unverified')
  }

  await requireLease(ports)
  if (await ports.revokeSessions() !== true
      || await ports.verifySessionsRevoked() !== true) {
    throw new A3Rejected('sessions_unverified')
  }

  await requireLease(ports)
  if (await ports.verifyRetention() !== true) throw new A3Rejected('retention_unverified')
  if (await ports.verifyWritesFrozen() !== true) throw new A3Rejected('writes_not_frozen')
  if (await ports.verifyOthersPreserved() !== true) {
    throw new A3Rejected('third_party_unverified')
  }

  // There are NO further user-data deletes after this point.
  await requireLease(ports)
  await ports.deleteAuthUser()
  if (await ports.verifyAuthUserAbsent() !== true) throw new A3Rejected('auth_unverified')
  await ports.markCompleted()
  return { completed: true }
}

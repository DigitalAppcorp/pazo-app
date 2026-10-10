import {
  inspectMediaManifest, inspectMediaRemovalVerification,
  type MediaInventoryEntry,
  type MediaRemovalVerification,
} from '../../../src/features/account/mediaManifest.ts'

/**
 * Candidate Storage API adapter. NOT DEPLOYED. Invoked only from the
 * separately-approved server executor AFTER an exhaustive DB + Storage
 * write fence has been installed, tested and verified.
 *
 * The supplied inventory is NEVER a browser/body-supplied object. It must
 * be created from a DB transaction that proves version and reference counts.
 * Storage.remove(path) is not itself a conditional versioned DELETE.
 */
export interface A3StorageBucket {
  exists(path: string): Promise<{data: boolean | null; error: unknown}>
  remove(paths: string[]): Promise<{error: unknown}>
}
export interface A3StorageService {
  storage: {from(bucket: string): A3StorageBucket}
}
export interface A3StorageProofs {
  /** Both operations must read authoritative, current server state. */
  verifyLease(): Promise<boolean>
  verifyWriteFence(): Promise<boolean>
  verifyExactGenerationAndReferences(object: Readonly<MediaInventoryEntry>): Promise<boolean>
  /** Durable server-side checkpoint of a prior successful remove call; no client values. */
  verifyPreviouslyRemoved(object: Readonly<MediaInventoryEntry>): Promise<boolean>
  /** Persist exact-object deletion checkpoint; independent job journal on server. */
  checkpointRemoved(object: Readonly<MediaInventoryEntry>): Promise<boolean>
  /**
   * HEAD + ranged GET of OLD public URL, plus cache-busting fetch, must yield
   * 403/404/410. False for unknown/failed checks, never treat 5xx as missing.
   * Private objects require independent signed-URL expiration evidence.
   */
  verifyOldUrlAndCdn(object: Readonly<MediaInventoryEntry>): Promise<boolean>
}

export class A3StorageBlocked extends Error {
  constructor() { super('Storage cleanup verification unavailable') }
}

const ensure = (ok: unknown) => {
  if (ok !== true) throw new A3StorageBlocked()
}

/**
 * Returns proof of one exact path's removal; NEVER a blanket approval for
 * account deletion or arbitrary paths. If any check fails, throws to stop
 * the coordinator and leaves the job retryable.
 */
export async function removeVerifiedA3Object(
  admin: A3StorageService,
  row: Readonly<MediaInventoryEntry>,
  proofs: A3StorageProofs,
): Promise<MediaRemovalVerification> {
  const review = inspectMediaManifest([row])
  if (review.blocked.length || review.safeCandidates.length !== 1) {
    throw new A3StorageBlocked()
  }
  await ensure(await proofs.verifyLease())
  await ensure(await proofs.verifyWriteFence())
  await ensure(await proofs.verifyExactGenerationAndReferences(row))

  const bucket = admin.storage.from(row.bucket)
  const pre = await bucket.exists(row.path)
  if (pre.error) throw new A3StorageBlocked()
  if (pre.data === false) {
    // A previous attempt may have already removed the object. A persisted
    // server-side checkpoint is required; absence alone isn't enough.
    await ensure(await proofs.verifyPreviouslyRemoved(row))
  } else if (pre.data === true) {
    // Explicit exact path only. NEVER bulk-delete bucket or SQL DELETE
    // storage.objects. Concurrent uploads must be frozen beforehand.
    await ensure(await proofs.verifyLease())
    await ensure(await proofs.verifyWriteFence())
    await ensure(await proofs.verifyExactGenerationAndReferences(row))
    const result = await bucket.remove([row.path])
    if (result.error) throw new A3StorageBlocked()
    const after = await bucket.exists(row.path)
    if (after.error || after.data !== false) throw new A3StorageBlocked()
    // Journal persists evidence BEFORE returning. If checkpointing fails,
    // the retry must be manually reconciled instead of blindly deleting.
    await ensure(await proofs.checkpointRemoved(row))
  } else throw new A3StorageBlocked()

  const after = await bucket.exists(row.path)
  if (after.error || after.data !== false) throw new A3StorageBlocked()
  await ensure(await proofs.verifyLease())
  await ensure(await proofs.verifyWriteFence())

  const urlChecked = await proofs.verifyOldUrlAndCdn(row)
  const verification: MediaRemovalVerification = {
    originObjectMissing: true,
    oldPublicUrlUnavailable: urlChecked,
    storageNoLongerReferencesObject: true,
    cdnResponseVerified: urlChecked,
  }
  if (!inspectMediaRemovalVerification(verification).passed) {
    throw new A3StorageBlocked()
  }
  return verification
}

/** One-object F14 trial safeguard. Never authorizes a release or a Storage mutation. */
export const F14_TRIAL_SCOPE = Object.freeze({
  kind: 'feed_post',
  id: '140d3769-cde2-47dc-998a-dcb3238b6f17',
  bucket: 'post-photos',
  storageObjectId: 'b9ef7bf4-9d86-4168-b124-a8b0b272d0c8',
} as const)

export function trialRequestAllowed(kind: unknown, id: unknown): boolean {
  return kind === F14_TRIAL_SCOPE.kind && id === F14_TRIAL_SCOPE.id
}

export function trialTargetAllowed(target: {kind: string; id: string; bucket: string}): boolean {
  return trialRequestAllowed(target.kind, target.id) && target.bucket === F14_TRIAL_SCOPE.bucket
}

/** A path or public URL alone cannot identify the exact original object.
 * If Storage.info() omits the immutable object ID, stop rather than guessing.
 */
export function assertTrialStorageIdentity(result: unknown): void {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('trial_storage_identity_unverified')
  }
  const response = result as { data?: unknown; error?: unknown }
  if (response.error != null || !response.data || typeof response.data !== 'object'
      || Array.isArray(response.data)
      || (response.data as {id?: unknown}).id !== F14_TRIAL_SCOPE.storageObjectId) {
    throw new Error('trial_storage_identity_unverified')
  }
}

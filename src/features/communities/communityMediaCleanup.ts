export const COMMUNITY_MEDIA_BUCKET = 'community-post-photos'

export class CommunityMediaPendingError extends Error {
  readonly storagePath: string
  constructor(storagePath: string) {
    super('Publication could not be confirmed; media needs review.')
    this.name = 'CommunityMediaPendingError'
    this.storagePath = storagePath
  }
}

interface DeletedPost {
  id: string
  community_id: string
  photo_storage_path: string | null
}

export const prepareCommunityPostCleanup = async (
  postId: string,
  deleteRow: () => Promise<DeletedPost[]>,
) => {
  // RLS can reject DELETE by returning zero rows without a database error.
  const rows = await deleteRow()
  if (rows.length !== 1 || rows[0].id !== postId) {
    throw new Error('Post deletion was not confirmed.')
  }
  const row = rows[0]
  const path = row.photo_storage_path
  if (!path) return { mediaCleanupPending: false, storagePath: null }
  // A frontend RLS view cannot prove there are no hidden/shared references or
  // moderation holds. Retain the object for the operator's full-schema review.
  // The durable queue is storage.objects, filtered by the audited inventory SQL.
  return { mediaCleanupPending: true, storagePath: path }
}

export const retainUnconfirmedUpload = (storagePath: string | null, originalError: unknown): never => {
  // A lost insert response may have committed. Never delete its photo blindly.
  // storage.objects retains the exact reference for the operator's read-only inventory.
  if (storagePath) throw new CommunityMediaPendingError(storagePath)
  throw originalError
}

export type AccountDeletionStatus =
  | 'requested' | 'reviewing' | 'blocked' | 'archiving'
  | 'media_pending' | 'deleting_data' | 'deleting_auth'
  | 'completed' | 'failed' | 'cancelled'

export interface AccountDeletionSnapshot {
  status: AccountDeletionStatus
  requestedAt: string
  updatedAt: string
}

export interface AccountDeletionPreflight {
  pets: number
  posts: number
  communitiesOwned: number
  foreignCommunityPosts: number
  foreignFeedComments: number
  documents: number
  careItems: number
  requiresManualReview: boolean
}

export const deletionStatuses: ReadonlySet<string> = new Set([
  'requested', 'reviewing', 'blocked', 'archiving', 'media_pending',
  'deleting_data', 'deleting_auth', 'completed', 'failed', 'cancelled',
])

export function parseDeletionSnapshot(value: unknown): AccountDeletionSnapshot | null {
  if (value === null) return null
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid account deletion result')
  const row = value as Record<string, unknown>
  if (typeof row.status !== 'string' || !deletionStatuses.has(row.status)
    || typeof row.requested_at !== 'string' || typeof row.updated_at !== 'string') {
    throw new Error('Invalid account deletion status')
  }
  return { status: row.status as AccountDeletionStatus, requestedAt: row.requested_at, updatedAt: row.updated_at }
}

export function parseDeletionPreflight(value: unknown): AccountDeletionPreflight {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid account deletion preflight')
  }
  const r = value as Record<string, unknown>
  const count = (name: string) => {
    const n = r[name]
    if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0) {
      throw new Error('Invalid account deletion count')
    }
    return n
  }
  if (typeof r.requires_manual_review !== 'boolean') {
    throw new Error('Invalid account deletion review status')
  }
  return {
    pets: count('pets'),
    posts: count('posts'),
    communitiesOwned: count('communities_owned'),
    foreignCommunityPosts: count('foreign_community_posts'),
    foreignFeedComments: count('foreign_feed_comments'),
    documents: count('documents'),
    careItems: count('care_items'),
    requiresManualReview: r.requires_manual_review,
  }
}

export function canCancelDeletion(status: AccountDeletionStatus): boolean {
  return status === 'requested'
}

export function canRequestDeletion(status?: AccountDeletionStatus | null): boolean {
  return status === null || status === undefined || status === 'cancelled'
}

export function getDeletionStatusMessage(status: AccountDeletionStatus, es: boolean): string {
  const m: Record<AccountDeletionStatus, [string, string]> = {
    requested: ['Solicitud recibida. Tu cuenta no se ha eliminado.', 'Request received. Your account has not been deleted.'],
    reviewing: ['Solicitud en revisión.', 'Request under review.'],
    blocked: ['Solicitud pausada: necesitamos revisar dependencias.', 'Request paused while dependencies are reviewed.'],
    archiving: ['Preparando datos y contribuciones ajenas.', 'Preparing data and contributions from others.'],
    media_pending: ['Pendiente de verificar archivos y enlaces.', 'Waiting for file and link verification.'],
    deleting_data: ['Eliminación de datos en proceso.', 'Data removal in progress.'],
    deleting_auth: ['Finalizando cierre de cuenta.', 'Finishing account closure.'],
    completed: ['Solicitud completada y verificada.', 'Request completed and verified.'],
    failed: ['Se necesita revisión manual; no se completó la eliminación.', 'Manual review needed; deletion was not completed.'],
    cancelled: ['Solicitud cancelada.', 'Request cancelled.'],
  }
  return m[status][es ? 0 : 1]
}

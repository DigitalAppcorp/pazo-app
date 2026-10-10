export type DeletionStatus = 'requested'|'cancelled'|'processing'|'completed'
export type DeletionReceipt = { status: DeletionStatus; requested_at: string }
const allowed = new Set<DeletionStatus>(['requested','cancelled','processing','completed'])
export function parseDeletionReceipt(value: unknown): DeletionReceipt | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const status = (value as Record<string,unknown>).status
  const requestedAt = (value as Record<string,unknown>).requested_at
  if (typeof status!=='string'||!allowed.has(status as DeletionStatus)
     || typeof requestedAt!=='string'||!Number.isFinite(Date.parse(requestedAt)))
    return null
  return {status:status as DeletionStatus,requested_at:requestedAt}
}
export function mayCancelDeletion(status: DeletionStatus|null): boolean {
  return status==='requested'
}
// Intake RPCs are installed and tested, but final deletion remains unavailable.
// Dev UI can request/cancel only; production entry stays gated by environment.
export const DELETION_EXECUTOR_ENABLED = false as const

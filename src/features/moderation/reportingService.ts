import { supabase } from '../../services/supabaseClient'

export type ReportTarget = 'feed_post' | 'feed_comment' | 'pet_profile' | 'community_post' | 'community_comment'
export type ReportReason = 'spam' | 'harassment' | 'unsafe' | 'other'
export interface PendingReport {
  id: string
  target_kind: ReportTarget
  target_id: string
  reason: ReportReason
  details: string
  created_at: string
}

export async function submitReport(targetKind: ReportTarget, targetId: string, reason: ReportReason, details: string) {
  const { error } = await supabase.rpc('f14_submit_report', {
    p_kind: targetKind, p_target: targetId, p_reason: reason, p_details: details.trim(),
  })
  if (error) throw error
}

export async function isModerator(): Promise<boolean> {
  const { data, error } = await supabase.rpc('f14_is_moderator')
  if (error) throw error
  return data === true
}

export async function getModerationQueue(offset = 0): Promise<PendingReport[]> {
  const { data, error } = await supabase.rpc('f14_moderation_queue', { p_limit: 20, p_offset: offset })
  if (error) throw error
  if (!Array.isArray(data)) throw new Error('La cola no devolvió una lista válida.')
  return data as PendingReport[]
}

export async function reviewReport(reportId: string, action: 'dismiss' | 'remove', note = ''): Promise<string> {
  const { data, error } = await supabase.rpc('f14_review_report', {
    p_report: reportId, p_action: action, p_note: note,
  })
  if (error) throw error
  return String(data)
}

export interface PendingMedia {
  target_kind: 'feed_post' | 'pet_profile' | 'community_post'
  target_id: string
  applied_at: string
}

export async function getPendingModerationMedia(): Promise<PendingMedia[]> {
  const { data, error } = await supabase.rpc('f14_pending_media', { p_limit: 20 })
  if (error) throw error
  if (!Array.isArray(data)) throw new Error('Respuesta inválida del backend.')
  return data as PendingMedia[]
}

export async function purgeModerationMedia(kind: PendingMedia['target_kind'], id: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('f14-moderation-purge', {
    body: { targetKind: kind, targetId: id },
  })
  if (error) throw error
  if (!data || typeof data.message !== 'string') throw new Error('No se pudo confirmar la limpieza.')
}

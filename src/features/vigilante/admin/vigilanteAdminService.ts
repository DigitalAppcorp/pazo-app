import { supabase } from '../../../services/supabaseClient'

export type DraftKind = 'heat' | 'smoke' | 'recall' | 'outbreak'
export type DraftPriority = 'high' | 'medium' | 'low'
export type RejectReason = 'not_relevant' | 'doubtful_source' | 'duplicate' | 'tone'

export interface AudienceCounts {
  pets: { expired: number; unregistered: number; no_date: number; applies: number; current: number; unknown: number; insufficient: number }
  notified_users: number
  push_users: number
  feed_species: string[] | null
  feed_postal_codes: string[] | null
}

export interface VigilanteDraft {
  id: string
  kind: DraftKind
  priority: DraftPriority
  status: string
  title_es: string
  body_es: string
  title_en: string
  body_en: string
  vaccine_type: string | null
  source_name: string
  source_url: string
  source_published_at: string
  expires_at: string | null
  review_needed: boolean
  edited: boolean
  created_at: string
  counts: AudienceCounts
}

export interface RecentDraft {
  id: string
  title_es: string
  title_en: string
  status: string
  priority: DraftPriority
  decided_at: string | null
  notified_count: number | null
  push_count: number | null
}

export interface VigilanteSource {
  key: string
  name: string
  enabled: boolean
  last_success_at: string | null
  consecutive_failures: number
  trust: number
}

export interface VigilanteInbox {
  enabled: boolean
  drafts: VigilanteDraft[]
  recent: RecentDraft[]
  sources: VigilanteSource[]
}

// A function declaration, not a generic arrow: some test loaders compile .ts files as TSX.
async function call<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw error
  return data as T
}

export const fetchVigilanteInbox = () => call<VigilanteInbox>('pazo_vigilante_inbox')
export const fetchVigilanteSummary = () => call<Record<string, number>>('pazo_vigilante_monthly_summary')
export const fetchVigilanteResults = (draftId: string) => call<Record<string, unknown> | null>('pazo_vigilante_results', { p_draft_id: draftId })
export const decideDraft = (draftId: string, decision: 'approve' | 'feed_only' | 'reject', rejectReason?: RejectReason) =>
  call<Record<string, unknown>>('pazo_vigilante_decide', { p_draft_id: draftId, p_decision: decision, p_reject_reason: rejectReason ?? null })
export const sendDraftTest = (draftId: string) => call<boolean>('pazo_vigilante_test', { p_draft_id: draftId })
export const cancelDraft = (draftId: string) => call<Record<string, number>>('pazo_vigilante_cancel', { p_draft_id: draftId })
export const setVigilanteEnabled = (enabled: boolean) => call<boolean>('pazo_vigilante_set_enabled', { p_enabled: enabled })
export const editDraft = (draftId: string, changes: Record<string, unknown>) =>
  call<boolean>('pazo_vigilante_edit', { p_draft_id: draftId, p_changes: changes })
export const createManualDraft = (kind: DraftKind, url: string, sourceName: string, publishedOn: string, params: Record<string, unknown>) =>
  call<string>('pazo_vigilante_manual', { p_kind: kind, p_url: url, p_source_name: sourceName, p_published_on: publishedOn, p_params: params })

// Editing needs a second factor from the last five minutes; the server checks it again.
export const verifySecondFactor = async (code: string) => {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw error
  const factor = data?.totp?.find((item) => item.status === 'verified')
  if (!factor) throw new Error('no_verified_factor')
  const verified = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code })
  if (verified.error) throw verified.error
}

export { isQuietHours } from '../quietHours'

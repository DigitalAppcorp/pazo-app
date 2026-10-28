import { supabase } from '../../services/supabaseClient'

export type QrOutcome = 'qr_visible' | 'qr_download_initiated' | 'qr_share_confirmed'
const accepted = new Set<QrOutcome>(['qr_visible', 'qr_download_initiated', 'qr_share_confirmed'])
const sent = new Set<string>()
const pending = new Set<string>()

/** First-party enum only. Never await this from a user's tool operation. */
export async function recordFirstUtility(event: QrOutcome, petId: string, ownerId?: string): Promise<void> {
  if (!ownerId || !petId || !accepted.has(event)) return
  const key = `${ownerId}:${petId}:${event}:${new Date().toISOString().slice(0, 10)}`
  if (sent.has(key) || pending.has(key)) return
  pending.add(key)
  try {
    const { data } = await supabase.auth.getSession()
    const session = data.session
    if (!session || session.user.id !== ownerId) return
    // Supabase's fetchWithAuth preserves this explicit header. An account
    // switch cannot silently substitute a newer session during the request.
    const result = await supabase.rpc('pazo_marketing_record_utility_v1', {
      p_pet: petId, p_event: event,
    }).setHeader('Authorization', `Bearer ${session.access_token}`)
    if (!result.error && result.data === true) {
      // Bound local deduplication; never write identity or tokens to storage.
      if (sent.size >= 256) sent.clear()
      sent.add(key)
    }
  } catch { /* Optional measurement cannot interrupt a free utility. */ }
  finally { pending.delete(key) }
}

export const utilityMetrics = [
  'verified_registrations', 'first_pet_accounts', 'matured_first_pet_accounts',
  'first_utility_accounts', 'qr_visible_accounts', 'qr_download_initiated_accounts',
  'qr_share_confirmed_accounts', 'care_created_accounts', 'd7_matured_accounts', 'd7_return_accounts',
] as const
export type UtilityGroup = Record<typeof utilityMetrics[number], number> & { segment: string }
export interface UtilitySummary {
  status: 'paused' | 'collecting'
  period_days: 7 | 30 | 90
  effective_days: number
  coverage_since: string | null
  as_of: string
  minimum_observational_sample: number
  groups: UtilityGroup[]
}
const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const segments = new Set(['organic','perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en'])
export function parseUtilitySummary(value: unknown): UtilitySummary {
  const fail = () => { throw Error('PAZO_INVALID_UTILITY_AGGREGATE') }
  if (!object(value) || !['paused','collecting'].includes(String(value.status)) ||
    ![7,30,90].includes(value.period_days as number) || value.effective_days !== Math.min(value.period_days as number,14) ||
    value.minimum_observational_sample !== 10 || typeof value.as_of !== 'string' || !Number.isFinite(Date.parse(value.as_of)) ||
    !(value.coverage_since === null || (typeof value.coverage_since === 'string' && Number.isFinite(Date.parse(value.coverage_since)))) ||
    !Array.isArray(value.groups) || value.groups.length > 7 ||
    Object.keys(value).some(k => !['status','period_days','effective_days','coverage_since','as_of','minimum_observational_sample','groups'].includes(k))) return fail()
  const seen = new Set<string>()
  for (const row of value.groups) {
    if (!object(row) || !segments.has(String(row.segment)) || seen.has(String(row.segment)) ||
      Object.keys(row).length !== utilityMetrics.length+1 ||
      !utilityMetrics.every(k => typeof row[k] === 'number' && Number.isSafeInteger(row[k]) && (row[k] as number) >= 0 && (row[k] as number) <= (row.verified_registrations as number)) ||
      (row.first_utility_accounts as number) > (row.first_pet_accounts as number) ||
      (row.matured_first_pet_accounts as number) > (row.first_pet_accounts as number) ||
      (row.d7_return_accounts as number) > (row.d7_matured_accounts as number)) return fail()
    seen.add(String(row.segment))
  }
  return value as unknown as UtilitySummary
}
export async function firstUtilitySummary(days: 7 | 30 | 90): Promise<UtilitySummary> {
  const { data, error } = await supabase.rpc('pazo_admin_first_utility_summary', { p_days: days })
  if (error) throw error
  return parseUtilitySummary(data)
}

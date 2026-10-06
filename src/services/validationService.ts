import { supabase } from './supabaseClient'

export type ValidationModuleKey = 'communities' | 'map_radar'

export interface ModuleValidationState {
  interested: boolean
  intentKey: string | null
}

const SESSION_STORAGE_KEY = 'pazo_validation_session_id'

const createSessionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
}

export const getValidationSessionId = () => {
  const existing = sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (existing) return existing

  const sessionId = createSessionId()
  sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId)
  return sessionId
}

const validationContext = (
  moduleKey: ValidationModuleKey,
  source: string,
  activePetId?: string | null
) => ({
  p_module_key: moduleKey,
  p_session_id: getValidationSessionId(),
  p_source: source,
  p_active_pet_id: activePetId || null,
})

export const recordModuleValidationView = async (
  moduleKey: ValidationModuleKey,
  source: string,
  activePetId?: string | null
) => {
  const { error } = await supabase.rpc(
    'record_module_validation_view',
    validationContext(moduleKey, source, activePetId)
  )

  if (error) throw error
}

export const recordModuleValidationInterest = async (
  moduleKey: ValidationModuleKey,
  source: string,
  activePetId?: string | null
) => {
  const { error } = await supabase.rpc(
    'record_module_validation_interest',
    validationContext(moduleKey, source, activePetId)
  )

  if (error) throw error
}

export const saveModuleValidationIntent = async (
  moduleKey: ValidationModuleKey,
  intentKey: string,
  source: string,
  activePetId?: string | null
) => {
  const { error } = await supabase.rpc('save_module_validation_intent', {
    ...validationContext(moduleKey, source, activePetId),
    p_intent_key: intentKey,
  })

  if (error) throw error
}

export const getMyModuleValidationState = async (
  moduleKey: ValidationModuleKey
): Promise<ModuleValidationState> => {
  const { data, error } = await supabase.rpc(
    'get_my_module_validation_state',
    { p_module_key: moduleKey }
  )

  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data

  return {
    interested: Boolean(row?.interested),
    intentKey: row?.intent_key || null,
  }
}

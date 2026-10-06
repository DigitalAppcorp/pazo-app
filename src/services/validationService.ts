import { supabase } from './supabaseClient'

const VALIDATION_SESSION_KEY = 'pazo_validation_session_id'

export interface ModuleValidationState {
  interested: boolean
  intentKey: string | null
}

const createSessionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0'))
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-')
}

const getValidationSessionId = () => {
  const existing = sessionStorage.getItem(VALIDATION_SESSION_KEY)
  if (existing) return existing

  const sessionId = createSessionId()
  sessionStorage.setItem(VALIDATION_SESSION_KEY, sessionId)
  return sessionId
}

const isDuplicate = (error: { code?: string } | null) => error?.code === '23505'

export const recordModuleValidationView = async (
  moduleKey: string,
  source: string
) => {
  const { error } = await supabase
    .from('module_validation_views')
    .insert({
      module_key: moduleKey,
      session_id: getValidationSessionId(),
      source,
    })

  if (error && !isDuplicate(error)) throw error
}

export const recordModuleValidationInterest = async (
  moduleKey: string,
  source: string
) => {
  const { error } = await supabase
    .from('module_validation_interests')
    .insert({
      module_key: moduleKey,
      source,
    })

  if (error && !isDuplicate(error)) throw error
}

const updateExistingIntent = async (
  moduleKey: string,
  intentKey: string,
  source: string
) => {
  const { data, error } = await supabase
    .from('module_validation_intents')
    .update({
      intent_key: intentKey,
      source,
    })
    .eq('module_key', moduleKey)
    .select('intent_key')
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

export const saveModuleValidationIntent = async (
  moduleKey: string,
  intentKey: string,
  source: string
) => {
  if (await updateExistingIntent(moduleKey, intentKey, source)) return

  const { error } = await supabase
    .from('module_validation_intents')
    .insert({
      module_key: moduleKey,
      intent_key: intentKey,
      source,
    })

  if (!error) return

  if (isDuplicate(error)) {
    await updateExistingIntent(moduleKey, intentKey, source)
    return
  }

  throw error
}

export const getMyModuleValidationState = async (
  moduleKey: string
): Promise<ModuleValidationState> => {
  const [interestResult, intentResult] = await Promise.all([
    supabase
      .from('module_validation_interests')
      .select('module_key')
      .eq('module_key', moduleKey)
      .maybeSingle(),
    supabase
      .from('module_validation_intents')
      .select('intent_key')
      .eq('module_key', moduleKey)
      .maybeSingle(),
  ])

  if (interestResult.error) throw interestResult.error
  if (intentResult.error) throw intentResult.error

  return {
    interested: Boolean(interestResult.data),
    intentKey: intentResult.data?.intent_key ?? null,
  }
}

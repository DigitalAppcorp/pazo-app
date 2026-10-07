import { supabase } from './supabaseClient'
import type { PlaceCategory, PlaceUsageEventType } from '../types/pazo'

const SESSION_KEY = 'pazo_places_session_id'

const getSessionId = () => {
  const existing = sessionStorage.getItem(SESSION_KEY)
  if (existing) return existing

  const sessionId = crypto.randomUUID()
  sessionStorage.setItem(SESSION_KEY, sessionId)
  return sessionId
}

export const recordPlaceUsageEvent = async ({
  eventType,
  placeId,
  category,
}: {
  eventType: PlaceUsageEventType
  placeId?: string
  category?: PlaceCategory
}) => {
  const { error } = await supabase.from('place_usage_events').insert({
    session_id: getSessionId(),
    event_type: eventType,
    place_id: placeId || null,
    category: category || null,
  })

  if (error && error.code !== '23505') throw error
}

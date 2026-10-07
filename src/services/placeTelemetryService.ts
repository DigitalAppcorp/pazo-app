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
  const sessionId = getSessionId()
  const mapOpenDedupeKey = `pazo_places_map_open_recorded_${sessionId}`

  if (
    eventType === 'map_open'
    && sessionStorage.getItem(mapOpenDedupeKey) === 'true'
  ) {
    return
  }

  const { error } = await supabase.from('place_usage_events').insert({
    session_id: sessionId,
    event_type: eventType,
    place_id: placeId || null,
    category: category || null,
  })

  if (error) {
    if (error.code === '23505' && eventType === 'map_open') {
      sessionStorage.setItem(mapOpenDedupeKey, 'true')
      return
    }
    throw error
  }

  if (eventType === 'map_open') {
    sessionStorage.setItem(mapOpenDedupeKey, 'true')
  }
}

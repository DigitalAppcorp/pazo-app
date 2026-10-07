import { supabase } from '../../services/supabaseClient'
import type { SearchEntityType, SearchFilter } from './types'

const SESSION_KEY = 'pazo_search_session_id'

export type SearchUsageEventType =
  | 'search_open'
  | 'search_execute'
  | 'search_result_open'
  | 'search_filter_change'

interface SearchUsageEventInput {
  eventType: SearchUsageEventType
  resultType?: SearchEntityType
  filterType?: SearchFilter
  hadResults?: boolean
}

const getSessionId = () => {
  const existing = sessionStorage.getItem(SESSION_KEY)
  if (existing) return existing

  const id = crypto.randomUUID()
  sessionStorage.setItem(SESSION_KEY, id)
  return id
}

export const recordSearchUsageEvent = async ({
  eventType,
  resultType,
  filterType,
  hadResults,
}: SearchUsageEventInput) => {
  const { error } = await supabase.from('search_usage_events').insert({
    session_id: getSessionId(),
    event_type: eventType,
    result_type: resultType || null,
    filter_type: filterType || null,
    had_results:
      typeof hadResults === 'boolean' ? hadResults : null,
  })

  if (error) throw error
}

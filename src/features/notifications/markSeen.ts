import { supabase } from '../../services/supabaseClient'

// Sightings and Friend of PAZO notices stay unread until opened: the lost-pet
// reminder and the supporter flow depend on the person actually seeing them.
export const SEEN_ON_CLOSE_TYPES = ['system', 'community_join', 'care_reminder', 'admin_new_pet', 'admin_new_account', 'new_follower'] as const

export const markNotificationsSeen = async (): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)
    .in('type', [...SEEN_ON_CLOSE_TYPES])

  if (error) throw error
}

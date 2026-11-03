import { supabase } from '../../services/supabaseClient'
import { mapOfficialPostRow, type OfficialPost } from './officialPosts'

export const fetchOfficialFeed = async (petId: string): Promise<OfficialPost[]> => {
  const { data, error } = await supabase.rpc('get_official_feed', { p_actor_pet_id: petId, p_limit: 10 })
  if (error) throw error
  return (data || []).map(mapOfficialPostRow).filter((post: OfficialPost | null): post is OfficialPost => post !== null)
}

export const toggleOfficialPostLike = async (postId: string): Promise<{ liked: boolean; likes: number }> => {
  const { data, error } = await supabase.rpc('toggle_official_post_like', { p_post_id: postId })
  if (error) throw error
  return { liked: Boolean(data?.liked), likes: Number(data?.likes) || 0 }
}

// Pets whose owner is a founder. The same fact is already shown on each public profile.
export const fetchFounderPetIds = async (petIds: string[]): Promise<Set<string>> => {
  if (petIds.length === 0) return new Set()
  const { data, error } = await supabase.rpc('pazo_founder_pets_batch', { p_pet_ids: petIds.slice(0, 100) })
  if (error) throw error
  return new Set((data || []).map((row: string | { pazo_founder_pets_batch?: string }) =>
    typeof row === 'string' ? row : row.pazo_founder_pets_batch || ''))
}

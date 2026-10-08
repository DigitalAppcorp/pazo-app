import { supabase } from '../../services/supabaseClient'

export type SafetySnapshot = { blockedIds: string[]; ownBlockIds: string[]; hiddenIds: string[] }
export const getSafety = async (): Promise<SafetySnapshot> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!user) return { blockedIds: [], ownBlockIds: [], hiddenIds: [] }
  const [blocked, own, hidden] = await Promise.all([
    supabase.rpc('f14_my_blocked_accounts'),
    supabase.from('account_blocks').select('blocked_user_id'),
    supabase.from('hidden_posts').select('post_id'),
  ])
  if (blocked.error) throw blocked.error
  if (own.error) throw own.error
  if (hidden.error) throw hidden.error
  return {
    blockedIds: (blocked.data || []).map((r: { user_id: string }) => r.user_id),
    ownBlockIds: (own.data || []).map((r: { blocked_user_id: string }) => r.blocked_user_id),
    hiddenIds: (hidden.data || []).map((r: { post_id: string }) => r.post_id),
  }
}
const currentUserId = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!user) throw new Error('Authentication required')
  return user.id
}
export const block = async (target: string) => {
  const actor = await currentUserId()
  if (actor === target) throw new Error('Self-block forbidden')
  const { error } = await supabase.from('account_blocks').insert({ blocker_user_id: actor, blocked_user_id: target })
  if (error && error.code !== '23505') throw error
}
export const unblock = async (target: string) => {
  const actor = await currentUserId()
  const { error } = await supabase.from('account_blocks').delete().eq('blocker_user_id', actor).eq('blocked_user_id', target)
  if (error) throw error
}
export const hide = async (postId: string) => {
  const actor = await currentUserId()
  const { error } = await supabase.from('hidden_posts').insert({ user_id: actor, post_id: postId })
  if (error && error.code !== '23505') throw error
}
export const unhide = async (postId: string) => {
  const actor = await currentUserId()
  const { error } = await supabase.from('hidden_posts').delete().eq('user_id', actor).eq('post_id', postId)
  if (error) throw error
}

import { supabase } from '../../services/supabaseClient'

/**
 * A retained Auth account may be missing its public profile after fixture cleanup.
 * Only the authenticated server-side RPC can restore its minimal row.
 * This never accepts a user ID or privileged profile fields from the client.
 */
export async function ensureOwnAccountProfile(): Promise<void> {
  const { error } = await supabase.rpc('pazo_ensure_my_profile')
  if (error) throw error
}

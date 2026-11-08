import { supabase } from '../../services/supabaseClient'

/** PO order 8-nov-2026: an administrator classifies an account as a test account,
 * so it stops counting as a real user in every report. Returns false when the
 * account no longer exists. */
export async function setTestAccount(userId: string, test: boolean): Promise<boolean> {
  const { data, error } = await supabase.rpc('pazo_admin_set_test_account', { p_user_id: userId, p_test: test })
  if (error) throw new Error('test_account_update_failed')
  return data === true
}

/** The Users list carries the flag only after the 8-nov migration is installed. */
export function testAccountFlag(row: unknown): boolean | null {
  if (!row || typeof row !== 'object' || !('test_account' in row)) return null
  return (row as { test_account: unknown }).test_account === true
}

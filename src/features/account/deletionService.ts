import { supabase } from '../../services/supabaseClient'
import {
  parseDeletionPreflight, parseDeletionSnapshot,
  type AccountDeletionSnapshot, type AccountDeletionPreflight,
} from './deletionFlow'

// All privileged work is server-side. These three RPCs are not deployed by this PR.
// Never use service_role, auth.admin, or direct writes to private tables from the browser.
export async function getAccountDeletionStatus(): Promise<AccountDeletionSnapshot | null> {
  const { data, error } = await supabase.rpc('f14_a3_deletion_status')
  if (error) throw error
  return parseDeletionSnapshot(data)
}

export async function getAccountDeletionPreflight(): Promise<AccountDeletionPreflight> {
  const { data, error } = await supabase.rpc('f14_a3_deletion_preflight')
  if (error) throw error
  return parseDeletionPreflight(data)
}

export async function requestAccountDeletion(): Promise<AccountDeletionSnapshot> {
  const { data, error } = await supabase.rpc('f14_a3_request_deletion')
  if (error) throw error
  const snapshot = parseDeletionSnapshot(data)
  if (!snapshot) throw new Error('No account deletion request returned')
  return snapshot
}

export async function cancelAccountDeletion(): Promise<AccountDeletionSnapshot> {
  const { data, error } = await supabase.rpc('f14_a3_cancel_deletion')
  if (error) throw error
  const snapshot = parseDeletionSnapshot(data)
  if (!snapshot) throw new Error('No account deletion status returned')
  return snapshot
}

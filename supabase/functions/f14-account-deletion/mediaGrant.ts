import { inspectMediaManifest, type MediaInventoryEntry } from '../../../src/features/account/mediaManifest.ts'
import type { A3PrivilegedClient } from './reviewAdapter.ts'

/** No browser import: privileged server-only candidate, endpoint stays OFF. */
export class A3MediaGrantDenied extends Error {
  constructor() {super('Exact media authorization unavailable')}
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export interface A3ProcessingLease {
  token: string
  revision: number
  phase: 'remove_media'
}

/**
 * Grants one object generation's DELETE to the Storage API for two minutes.
 * An authenticated, privately enrolled operator and live processing lease
 * must be rechecked within the SQL RPC. No destructive call is made here.
 */
export async function authorizeA3MediaGrant(
  admin:A3PrivilegedClient,
  operatorJwt:string,
  subjectUserId:string,
  lease:Readonly<A3ProcessingLease>,
  object:Readonly<MediaInventoryEntry>,
):Promise<boolean> {
  if(typeof operatorJwt!=='string'||operatorJwt.length<20||operatorJwt.length>8192
    ||typeof subjectUserId!=='string'||!UUID.test(subjectUserId)
    ||!lease||lease.phase!=='remove_media'||!UUID.test(lease.token)
    ||!Number.isSafeInteger(lease.revision)||lease.revision<1
    ||inspectMediaManifest([object]).blocked.length>0) {
    throw new A3MediaGrantDenied()
  }
  const result=await admin.auth.getUser(operatorJwt).catch(()=>{throw new A3MediaGrantDenied()})
  const reviewer=result.data?.user?.id
  if(result.error||typeof reviewer!=='string'||!UUID.test(reviewer)
    ||reviewer===subjectUserId) throw new A3MediaGrantDenied()

  const grant=await admin.rpc('f14_a3_allow_exact_media_remove',{
    p_subject_user_id:subjectUserId,
    p_reviewer_user_id:reviewer,
    p_lease_token:lease.token,
    p_revision:lease.revision,
    p_bucket:object.bucket,
    p_path:object.path,
    p_object_version:object.objectVersion,
  }).catch(()=>{throw new A3MediaGrantDenied()})
  if(grant.error||grant.data!==true) throw new A3MediaGrantDenied()
  return true
}

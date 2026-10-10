import type {A3PrivilegedClient} from './reviewAdapter.ts'

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class A3OwnedActivityBlocked extends Error {
  constructor() {super('Owned activity cleanup unavailable')}
}

export interface A3CleanupLease {
  token:string
  revision:number
  phase:'clean_private_data'
}

/**
 * Candidate for a privileged server ONLY; not wired to the Edge endpoint.
 * SQL is solely responsible for atomic writer/lease checks, cleanup scope,
 * counter reconciliation, and checking exact foreign contribution identity.
 * Never infer permission from caller-supplied booleans or metadata.
 */
export async function removeA3OwnedActivity(
  admin:A3PrivilegedClient,
  operatorJwt:string,
  subjectId:string,
  lease:Readonly<A3CleanupLease>,
):Promise<{reviewed:true;accountDeleted:false;destructiveExecutionAllowed:false}> {
  if(typeof operatorJwt!=='string'||operatorJwt.length<20||operatorJwt.length>8192
    ||!UUID.test(subjectId)||!lease||lease.phase!=='clean_private_data'
    ||!UUID.test(lease.token)
    ||!Number.isSafeInteger(lease.revision)||lease.revision<1) {
    throw new A3OwnedActivityBlocked()
  }
  try {
    const result=await admin.auth.getUser(operatorJwt)
    const operator=result.data?.user?.id
    if(result.error||typeof operator!=='string'||!UUID.test(operator)
      ||operator===subjectId) throw new A3OwnedActivityBlocked()

    const response=await admin.rpc('f14_a3_remove_owned_activity',{
      p_subject_user_id:subjectId,p_reviewer_user_id:operator,
      p_lease_token:lease.token,p_revision:lease.revision,
    })
    const row=response.data
    if(response.error||!row||typeof row!=='object'||Array.isArray(row)) {
      throw new A3OwnedActivityBlocked()
    }
    const report=row as Record<string,unknown>
    if(report.owned_replies_removed_for_review!==true
      ||report.third_party_survival_rechecked!==true
      ||report.account_deleted!==false
      ||report.destructive_execution_allowed!==false) {
      throw new A3OwnedActivityBlocked()
    }
    return {reviewed:true,accountDeleted:false,destructiveExecutionAllowed:false}
  } catch {
    throw new A3OwnedActivityBlocked()
  }
}

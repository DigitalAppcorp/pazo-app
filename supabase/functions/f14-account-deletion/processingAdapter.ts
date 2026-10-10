import {
  verifyA3RecentSignin,
  type A3PrivilegedClient,
  type A3LeaseReceipt,
} from './reviewAdapter.ts'

export class A3ProcessingBlocked extends Error {
  constructor() {super('Account deletion processing unavailable')}
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Candidate only. Atomic REQUESTED->PROCESSING + target snapshots must happen
 * inside the private SQL RPC, never in a client-side sequence of requests.
 * This method cannot be reached from the shipped disabled Edge endpoint.
 */
export async function beginA3Processing(
  admin:A3PrivilegedClient,
  operatorJwt:string,
  subjectUserId:string,
  lease:Readonly<A3LeaseReceipt>,
):Promise<{processing:true;revision:number;destructiveExecutionAllowed:false}> {
  if(!lease || lease.destructiveExecutionAllowed!==false || lease.stage!=='review_request'
    ||!UUID.test(lease.leaseToken)||!Number.isSafeInteger(lease.revision)
    ||lease.revision<2) throw new A3ProcessingBlocked()

  // The existing verifier authenticates JWT, operator grant, and verifies the
  // request's fresh owner login for the SAME lease. It authorizes no delete.
  try {await verifyA3RecentSignin(admin,operatorJwt,subjectUserId,lease)}
  catch {throw new A3ProcessingBlocked()}

  // Operator identity is recovered from verified Auth; never accepted from
  // the HTTP body. The SQL RPC repeats all authorizations under row locks.
  const auth=await admin.auth.getUser(operatorJwt)
    .catch(()=>{throw new A3ProcessingBlocked()})
  const operator=auth.data?.user?.id
  if(auth.error||typeof operator!=='string'||!UUID.test(operator)
      ||operator===subjectUserId) throw new A3ProcessingBlocked()

  const {data,error}=await admin.rpc('f14_a3_start_processing',{
    p_subject_user_id:subjectUserId,p_operator_user_id:operator,
    p_lease_token:lease.leaseToken,p_revision:lease.revision,
  }).catch(()=>{throw new A3ProcessingBlocked()})

  if(error||!data||typeof data!=='object'||Array.isArray(data))
    throw new A3ProcessingBlocked()
  const row=data as Record<string,unknown>
  if(row.status!=='processing'||row.frozen!==true||row.revision!==lease.revision
    ||row.destructive_execution_allowed!==false) throw new A3ProcessingBlocked()
  return {processing:true,revision:lease.revision,destructiveExecutionAllowed:false}
}

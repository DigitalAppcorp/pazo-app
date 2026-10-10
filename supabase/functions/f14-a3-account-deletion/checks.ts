import type { A3ServerRpc, A3ServerGateChecks } from './adapter.ts'

/** Narrow, server-only facts. No gate here authorizes deleting anything. */
export function createA3ReadOnlyChecks(db:A3ServerRpc):A3ServerGateChecks {
  return {
    worker_lease_valid:async(jobId,claim)=>{
      const {data,error}=await db.rpc('f14_a3_worker_validate_lease',{
        p_job_id:jobId,p_token:claim.token,p_version:claim.version,
      })
      return !error && data===true
        ? {passed:true} : {passed:false,issue:'missing_evidence'}
    },
    legacy_authorship_reconciled:async(jobId)=>{
      // True only if PostgreSQL finds NO legacy embedded comments.
      // Nonempty or malformed JSON requires a separate human reconciliation.
      const {data,error}=await db.rpc('f14_a3_worker_legacy_clear',{
        p_job_id:jobId,
      })
      return !error && data===true
        ? {passed:true} : {passed:false,issue:'unsafe_dependency'}
    },
  }
}

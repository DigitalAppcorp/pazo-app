import type { A3Checkpoint, A3LeaseClaim, A3ReviewGate, A3ReviewPort, A3ReviewProof } from './worker.ts'

// Server-only adapter: caller MUST supply a Supabase client created with a
// secret/service key, inside a trusted worker, NEVER an Auth user/browser client.
// Real checks remain deliberately absent until each gate is deployed and tested.
interface RpcResponse { data: unknown; error: unknown }
export interface A3ServerRpc {
  rpc(name: string, params: Record<string, unknown>): Promise<RpcResponse>
}
export type VerifiedGateCheck = (jobId: string, claim: A3LeaseClaim) => Promise<A3ReviewProof>
export type A3ServerGateChecks = Partial<Record<A3ReviewGate,VerifiedGateCheck>>

function unwrap(result: RpcResponse): unknown {
  if (result.error) throw new Error('A3 server RPC unavailable')
  return result.data
}
function asRevision(value: unknown): number {
  if(typeof value!=='number' || !Number.isSafeInteger(value) || value<0) {
    throw new Error('A3 invalid server revision')
  }
  return value
}

/**
 * Only server-supplied checks qualify. Browser/request bodies cannot contribute
 * a success bit. Missing gates always block. No delete/storage APIs exposed.
 */
export function createA3ReviewPort(
  db: A3ServerRpc, checks: Readonly<A3ServerGateChecks> = {},
): A3ReviewPort {
  return {
    async readJob(jobId) {
      const raw=unwrap(await db.rpc('f14_a3_worker_job_status',{p_job_id:jobId}))
      return typeof raw==='string' ? {status:raw} : null
    },
    async leaseIsCurrent(jobId,claim:A3LeaseClaim) {
      const raw=unwrap(await db.rpc('f14_a3_worker_validate_lease',{
        p_job_id:jobId,p_token:claim.token,p_version:claim.version,
      }))
      return raw === true
    },
    async readRevision(jobId) {
      return asRevision(unwrap(await db.rpc('f14_a3_worker_review_revision',{p_job_id:jobId})))
    },
    async inspectGate(jobId,gate,claim) {
      const check=checks[gate]
      if(!check) return {passed:false,issue:'missing_evidence'}
      const p=await check(jobId,claim)
      if(p?.passed===true) return {passed:true}
      return {
        passed:false,
        issue: p?.issue==='unsafe_dependency' || p?.issue==='unverified_media'
          || p?.issue==='stale_session' || p?.issue==='requires_human_review'
          ? p.issue : 'missing_evidence',
      }
    },
    async saveCheckpoint(c:A3Checkpoint) {
      const raw=unwrap(await db.rpc('f14_a3_worker_review_checkpoint',{
        p_job_id:c.jobId,p_token:c.claim.token,p_version:c.claim.version,
        p_expected_revision:c.expectedRevision,p_gate:c.gate,
        p_outcome:c.outcome,p_issue:c.issue,
      }))
      if(raw===null) return null
      return asRevision(raw)
    },
  }
}

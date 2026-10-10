import type {A3PrivilegedClient} from './reviewAdapter.ts'

/**
 * F14 A3 - candidate independent post-cleanup verification.
 * No endpoint imports this file yet; no SQL has been installed.
 * A verified count is only one narrow gate and CANNOT authorize erasure.
 */
export interface A3SurvivalLease {
  token: string
  revision: number
  phase: 'preserve_others' | 'remove_media' | 'clean_private_data'
    | 'revoke_sessions' | 'await_auth_final'
}
export interface A3SurvivalResult {
  expectedContributions: number
  missingContributions: 0
  survivalVerified: true
  destructiveExecutionAllowed: false
}
export class A3ThirdPartySurvivalBlocked extends Error {
  constructor() { super('Third-party contribution verification unavailable') }
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function verifyA3ThirdPartySurvival(
  admin: A3PrivilegedClient,
  reviewerJwt: string,
  subjectId: string,
  lease: Readonly<A3SurvivalLease>,
): Promise<A3SurvivalResult> {
  if (!lease || typeof lease !== 'object'
      || !UUID.test(subjectId)
      || typeof reviewerJwt !== 'string'
      || reviewerJwt.length < 20 || reviewerJwt.length > 8192
      || !UUID.test(lease.token)
      || !Number.isSafeInteger(lease.revision) || lease.revision < 1
      || !(['preserve_others','remove_media','clean_private_data',
        'revoke_sessions','await_auth_final'] as string[]).includes(lease.phase)) {
    throw new A3ThirdPartySurvivalBlocked()
  }
  try {
    const auth = await admin.auth.getUser(reviewerJwt)
    const reviewer = auth.data?.user?.id
    if (auth.error || typeof reviewer !== 'string'
        || !UUID.test(reviewer) || reviewer === subjectId) {
      throw new A3ThirdPartySurvivalBlocked()
    }
    // SQL validates enrolled reviewer, exact active lease, revision, phase,
    // processing status and existence of EVERY frozen foreign contribution.
    const {data,error} = await admin.rpc('f14_a3_verify_other_users_survived',{
      p_subject_user_id:subjectId,p_reviewer_user_id:reviewer,
      p_lease_token:lease.token,p_revision:lease.revision,
    })
    if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
      throw new A3ThirdPartySurvivalBlocked()
    }
    const report=data as Record<string,unknown>
    if (typeof report.expected_contributions !== 'number'
        || !Number.isSafeInteger(report.expected_contributions)
        || report.expected_contributions < 0
        || report.missing_contributions !== 0
        || report.survival_verified !== true
        || report.destructive_execution_allowed !== false) {
      throw new A3ThirdPartySurvivalBlocked()
    }
    return {
      expectedContributions:report.expected_contributions,
      missingContributions:0,survivalVerified:true,destructiveExecutionAllowed:false,
    }
  } catch {
    throw new A3ThirdPartySurvivalBlocked()
  }
}

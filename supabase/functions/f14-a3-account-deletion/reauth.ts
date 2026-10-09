/**
 * PAZO F14 A3 — SERVER-ONLY PASSWORD REAUTHENTICATION INTAKE.
 *
 * Does not enable account deletion or make its evidence active. The caller's
 * JWT is validated by Supabase Auth (getUser + verified claims) by an adapter;
 * password is checked with a separate, nonpersistent Auth session. The service
 * stores only account/job/session IDs and timestamps in the private database.
 * Do not expose this module's port to browser-side code or telemetry.
 */
export interface A3VerifiedCaller {
  userId: string
  email: string
  sessionId: string
}
export interface A3PasswordResult {
  userId: string
}
export interface A3PasswordReauthPort {
  /** Network-validated current JWT + verified session claims, never decoded-only. */
  verifyCurrentSession(accessToken: string): Promise<A3VerifiedCaller | null>
  /** Authenticated server RPC restricted to service role, requested jobs only. */
  readRequestedJobOwner(jobId: string): Promise<string | null>
  /** Fresh password challenge using an isolated, throwaway Supabase Auth client. */
  verifyPassword(email: string, password: string): Promise<A3PasswordResult | null>
  /** Server-only RPC: verifies auth.sessions owner and persists a brief receipt. */
  recordProof(jobId: string, userId: string, sessionId: string): Promise<boolean>
}
export interface A3PasswordReauthResult {
  status: 'recorded_for_review' | 'rejected' | 'retryable'
  accountDeletionAllowed: false
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const outcome=(status:A3PasswordReauthResult['status']):A3PasswordReauthResult =>
  ({status,accountDeletionAllowed:false})

export async function verifyA3PasswordForJob(
  jobId: string,
  accessToken: string,
  password: string,
  port: A3PasswordReauthPort,
): Promise<A3PasswordReauthResult> {
  // Tokens/passwords never appear in return payloads, exceptions or telemetry.
  if(!uuid.test(jobId)
    || typeof accessToken!=='string' || accessToken.length<40 || accessToken.length>8192
    || typeof password!=='string' || password.length===0 || password.length>1024) {
    return outcome('rejected')
  }
  try {
    const user=await port.verifyCurrentSession(accessToken)
    if(!user || !uuid.test(user.userId) || !uuid.test(user.sessionId)
      || !user.email || user.email.length>320) return outcome('rejected')
    const owner=await port.readRequestedJobOwner(jobId)
    if(owner!==user.userId) return outcome('rejected')
    const confirmed=await port.verifyPassword(user.email,password)
    if(!confirmed || confirmed.userId!==user.userId) return outcome('rejected')
    const recorded=await port.recordProof(jobId,user.userId,user.sessionId)
    return recorded===true ? outcome('recorded_for_review') : outcome('retryable')
  } catch {
    // Never emit auth provider exception messages (they may contain identity).
    return outcome('retryable')
  }
}

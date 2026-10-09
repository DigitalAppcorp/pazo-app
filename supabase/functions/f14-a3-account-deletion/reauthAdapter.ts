import type { A3ServerRpc } from './adapter.ts'
import type { A3PasswordReauthPort, A3VerifiedCaller, A3PasswordResult } from './reauth.ts'

interface A3AuthUser { id: string; email?: string | null }
interface A3AuthClaims { sub?: unknown; session_id?: unknown }
interface A3AuthClient {
  auth: {
    getUser(accessToken: string): Promise<{
      data: {user: A3AuthUser | null}, error: unknown
    }>
    getClaims(accessToken: string): Promise<{
      data: {claims: A3AuthClaims | null}, error: unknown
    }>
    signInWithPassword(args: {email: string; password: string}): Promise<{
      data: {user: A3AuthUser | null; session: {access_token: string} | null}
      error: unknown
    }>
    signOut(args: {scope:'local'}): Promise<{error: unknown}>
  }
}

/**
 * Use a NEW Supabase Auth client with persistSession=false, autoRefreshToken=false,
 * detectSessionInUrl=false for each verification operation. Never pass a shared
 * browser client or a service-role auth instance to signInWithPassword.
 */
export function makeA3SupabaseReauthPort(
  newIsolatedAuthClient: () => A3AuthClient,
  db: A3ServerRpc,
): A3PasswordReauthPort {
  return {
    async verifyCurrentSession(accessToken):Promise<A3VerifiedCaller|null> {
      const auth=newIsolatedAuthClient().auth
      const {data:identity,error:idError}=await auth.getUser(accessToken)
      if(idError || !identity?.user?.id || !identity.user.email) return null
      const {data:token,error:claimsError}=await auth.getClaims(accessToken)
      const claims=token?.claims
      if(claimsError || !claims || claims.sub!==identity.user.id
        || typeof claims.session_id!=='string') return null
      return {
        userId:identity.user.id,
        email:identity.user.email,
        sessionId:claims.session_id,
      }
    },
    async readRequestedJobOwner(jobId) {
      const {data,error}=await db.rpc('f14_a3_service_job_owner',{p_job_id:jobId})
      if(error || typeof data!=='string') return null
      return data
    },
    async verifyPassword(email,password):Promise<A3PasswordResult|null> {
      const auth=newIsolatedAuthClient().auth
      const {data,error}=await auth.signInWithPassword({email,password})
      if(error || !data?.user?.id || !data.session?.access_token) return null
      // The password check generates an ephemeral Auth session. Revoke only
      // THAT session; default/global signOut would revoke unrelated devices.
      const {error:logoutError}=await auth.signOut({scope:'local'})
      if(logoutError) return null
      return {userId:data.user.id}
    },
    async recordProof(jobId,userId,sessionId) {
      const {data,error}=await db.rpc('f14_a3_service_record_reauth',{
        p_job_id:jobId,p_user_id:userId,p_session_id:sessionId,
      })
      return !error && data===true
    },
  }
}

// PAZO F16: One server-only factory for the actual privileged admin proof.
// GoTrue verifies the bearer, the signed-user RPC checks the current admin
// grant, then the SAME validated bearer must prove recent Supabase TOTP.
// This alone NEVER creates or stores a PayPal credential.
import {createPazoLiveVerifiedAdmin} from './liveVerifiedAdmin.mjs'
import {createPazoFreshMfaProof} from './liveFreshMfaProof.mjs'

export function createPazoLivePrivilegedAdmin({
 supabaseUrl,publishableKey,fetchImpl=fetch
}={}){
 return createPazoLiveVerifiedAdmin({
  supabaseUrl,publishableKey,fetchImpl,
  proveFreshReauthentication:createPazoFreshMfaProof()
 })
}

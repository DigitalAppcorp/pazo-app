// PAZO F16 — narrow Supabase Management API token accessor.
// No PAT values in source, tests, browser, database, audit, or logs.
// Token must be scoped to project mrybvqdebbgcayuvgkkr and Edge Function
// Secrets read-write only, created and saved manually by the Product Owner.
const KEY='PAZO_F16_SCOPED_MANAGEMENT_TOKEN'
const TOKEN=/^sbp_fc[A-Za-z0-9_-]{12,500}$/
export const MANAGEMENT_TOKEN_SECRET_NAME=KEY
export function createPazoScopedManagementTokenReader({getEnv}={}){
 if(typeof getEnv!=='function')throw Error('management_token_accessor_unavailable')
 return ()=>{
  let token
  try{token=getEnv(KEY)}catch{throw Error('scoped_management_token_unavailable')}
  if(typeof token!=='string'||!TOKEN.test(token))
   throw Error('scoped_management_token_unavailable')
  return token
 }
}

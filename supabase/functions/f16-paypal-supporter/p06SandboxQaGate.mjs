// PAZO F16 P06: Sandbox ONLY checkout testing. Never authorizes Live.
 // Default denied; a verified Supabase Auth user must match ONE private test UID.
 // No client headers, query params or JWT claims can opt into checkout.
const UID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const QA_GATE_BLOCKED='P06_SANDBOX_QA_DISABLED'
export function isP06SandboxQaAuthorized({getEnv,verifiedOwnerId}={}){
  if(typeof getEnv!=='function'||!UID.test(verifiedOwnerId||''))return false
  try{
    return getEnv('PAZO_F16_PAYPAL_ENV')==='sandbox'&&
      getEnv('PAZO_F16_P06_QA_ENABLE')==='true'&&
      UID.test(getEnv('PAZO_F16_P06_QA_OWNER_ID')||'')&&
      verifiedOwnerId.toLowerCase()===
       getEnv('PAZO_F16_P06_QA_OWNER_ID').toLowerCase()
  }catch{return false}
}

// F16 SERVER-ONLY: independently query Supabase Auth for owner existence.
// Auth ADMIN token must remain server-side. This validates active user identity,
// NOT who clicked a PayPal browser button, NOT payment or paid coverage.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function createF16AuthOwnerExistenceGuard({authClient}={}) {
 if(typeof authClient?.auth?.admin?.getUserById!=='function')
  throw Error('f16_admin_auth_client_required')
 return async function verifyBoundOwner(ownerId){
  if(typeof ownerId!=='string'||!UUID.test(ownerId))return false
  try {
   const r=await authClient.auth.admin.getUserById(ownerId)
   return !r?.error&&r?.data?.user?.id===ownerId&&
     r.data.user.is_anonymous!==true&&
     r.data.user.deleted_at==null
  }catch {return false}
 }
}

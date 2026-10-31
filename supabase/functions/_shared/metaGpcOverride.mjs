// #169: server-verified GPC opt-out persistence, isolated and NOT deployed.
// A browser GPC signal may veto Meta transmission, but rejecting its request
// alone does NOT persist withdrawal across sessions or server workers.
// Only trusted Supabase Auth + the privileged owner-scoped withdrawal RPC
// can record it. Never treat a failed write as a successful opt-out.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOKEN=/^Bearer ([A-Za-z0-9._~+=-]{12,4096})$/

export async function persistAuthenticatedMetaGpc({
  request,authenticate,withdraw,
}={}) {
  if(request?.method!=='POST'
     ||request.headers?.get('sec-gpc')!=='1'
     ||typeof authenticate!=='function'
     ||typeof withdraw!=='function')return 'unavailable'
  const match=TOKEN.exec(request.headers.get('authorization')||'')
  if(!match)return 'unauthorized'
  let user
  try{user=await authenticate(match[1])}
  catch{return 'unauthorized'}
  if(typeof user?.id!=='string'||!UUID.test(user.id)
     ||user.is_anonymous===true)return 'unauthorized'
  try{
    return await withdraw(user.id)===true?'persisted':'unavailable'
  }catch{return 'unavailable'}
}

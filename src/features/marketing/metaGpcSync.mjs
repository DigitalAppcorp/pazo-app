// #169 — isolated AUTHENTICATED first-party GPC withdrawal synchronizer.
// Never imported by the production app. No Pixel/CAPI, network or grant
// is permitted unless an explicitly released, trusted withdrawal transport
// was injected by the caller. The service-only RPC is authoritative.
// Reuse after approved integration during authenticated session bootstrap,
// independently of displaying the optional Meta consent screen.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function syncMetaGpcWithdrawal({
  withdrawalReleased=false,browser=null,ownerId=null,accessToken=null,
  getSessionSnapshot=()=>null,requestWithdraw=null,
}={}) {
  if(withdrawalReleased!==true)return {status:'disabled'}
  let gpc=false,session=null
  try{
    gpc=browser?.navigator?.globalPrivacyControl===true
    if(!gpc)return {status:'no_gpc'}
    session=getSessionSnapshot()
  }catch{return {status:'unconfirmed'}}
  if(typeof ownerId!=='string'||!UUID.test(ownerId)
    ||typeof accessToken!=='string'||accessToken.length<12
    ||session?.id!==ownerId||session?.accessToken!==accessToken
    ||typeof requestWithdraw!=='function')
    return {status:'unconfirmed'}
  let result
  try{
    result=await requestWithdraw({accessToken,body:{action:'withdraw'}})
  }catch{return {status:'unconfirmed'}}
  // If the user changes identity while the RPC is running, do not report
  // confirmation for a different session. The server RPC still owns the
  // withdrawal outcome for its originally authenticated account.
  try{
    session=getSessionSnapshot()
    if(session?.id!==ownerId||session?.accessToken!==accessToken)
      return {status:'unconfirmed'}
    return result?.status==='withdrawn'
      ? {status:'withdrawn'} : {status:'unconfirmed'}
  }catch{return {status:'unconfirmed'}}
}

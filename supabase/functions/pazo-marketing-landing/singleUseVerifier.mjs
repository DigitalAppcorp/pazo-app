// Raw tokens stay in request memory. Only a non-reversible digest reaches SQL.
export function createMarketingSingleUseVerifier({verifyProvider,claimDigest,cryptoImpl=crypto}={}){
 if(typeof verifyProvider!=='function'||typeof claimDigest!=='function'||!cryptoImpl?.subtle)throw Error('marketing_replay_not_configured')
 return async token=>{
  try{
   if(await verifyProvider(token)!==true)return false
   const bytes=await cryptoImpl.subtle.digest('SHA-256',new TextEncoder().encode(token))
   const digest=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')
   return await claimDigest(digest)===true
  }catch{return false}
 }
}

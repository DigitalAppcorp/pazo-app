// #169: isolated worker-to-worker authentication; NOT deployed.
// META_WORKER_DISPATCH_SECRET is a different secret from the Meta CAPI token.
// No secret is placed in URLs, logs or response data.
const FORMAT=/^[A-Za-z0-9_~.\-]{32,256}$/
const encoder=new TextEncoder()
export function createMetaWorkerAuthenticator({readSecret=()=>undefined,cryptoImpl=crypto}={}){
  if(typeof readSecret!=='function'||!cryptoImpl?.subtle?.digest)
    return async()=>false
  return async incoming=>{
    if(typeof incoming!=='string'||!FORMAT.test(incoming))return false
    let expected
    try{expected=readSecret('META_WORKER_DISPATCH_SECRET')}
    catch{return false}
    if(typeof expected!=='string'||!FORMAT.test(expected))return false
    // Hash fixed-size inputs before comparing; don't do early-exit matching.
    let hashA,hashB
    try{
      [hashA,hashB]=await Promise.all([
        cryptoImpl.subtle.digest('SHA-256',encoder.encode(incoming)),
        cryptoImpl.subtle.digest('SHA-256',encoder.encode(expected)),
      ])
    }catch{return false}
    const a=new Uint8Array(hashA),b=new Uint8Array(hashB)
    if(a.length!==32||b.length!==32)return false
    let diff=0
    for(let i=0;i<32;i++)diff|=a[i]^b[i]
    return diff===0
  }
}

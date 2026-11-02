// Web Push with no dependency: RFC 8291 payload encryption and RFC 8292 VAPID.
const encoder=new TextEncoder()

export function fromBase64Url(value){
  const binary=atob(value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'='))
  return Uint8Array.from(binary,c=>c.charCodeAt(0))
}
export function toBase64Url(bytes){
  let binary=''
  for(const byte of new Uint8Array(bytes))binary+=String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
}
const concat=(...parts)=>{
  const out=new Uint8Array(parts.reduce((sum,part)=>sum+part.length,0))
  let offset=0
  for(const part of parts){out.set(part,offset);offset+=part.length}
  return out
}
async function hkdf(salt,ikm,info,length){
  const key=await crypto.subtle.importKey('raw',ikm,'HKDF',false,['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},key,length*8))
}
const publicJwk=raw=>({kty:'EC',crv:'P-256',x:toBase64Url(raw.slice(1,33)),y:toBase64Url(raw.slice(33,65))})

export async function encryptPayload({plaintext,p256dh,auth,serverKeys,salt}){
  const uaPublic=fromBase64Url(p256dh),authSecret=fromBase64Url(auth)
  const keys=serverKeys??await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits'])
  const asPublic=new Uint8Array(await crypto.subtle.exportKey('raw',keys.publicKey))
  const uaKey=await crypto.subtle.importKey('raw',uaPublic,{name:'ECDH',namedCurve:'P-256'},false,[])
  const shared=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:uaKey},keys.privateKey,256))
  const usedSalt=salt??crypto.getRandomValues(new Uint8Array(16))
  const ikm=await hkdf(authSecret,shared,concat(encoder.encode('WebPush: info\0'),uaPublic,asPublic),32)
  const cek=await hkdf(usedSalt,ikm,encoder.encode('Content-Encoding: aes128gcm\0'),16)
  const nonce=await hkdf(usedSalt,ikm,encoder.encode('Content-Encoding: nonce\0'),12)
  const aes=await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['encrypt'])
  const padded=concat(encoder.encode(plaintext),new Uint8Array([2]))
  const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},aes,padded))
  const recordSize=new Uint8Array([0,0,16,0])
  return concat(usedSalt,recordSize,new Uint8Array([asPublic.length]),asPublic,cipher)
}

export async function generateVapidKeys(){
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify'])
  return {
    publicKey:toBase64Url(await crypto.subtle.exportKey('raw',pair.publicKey)),
    privateJwk:JSON.stringify(await crypto.subtle.exportKey('jwk',pair.privateKey)),
  }
}

export async function vapidAuthorization({endpoint,publicKey,privateJwk,subject,nowSeconds}){
  const key=await crypto.subtle.importKey('jwk',JSON.parse(privateJwk),{name:'ECDSA',namedCurve:'P-256'},false,['sign'])
  const part=value=>toBase64Url(encoder.encode(JSON.stringify(value)))
  const unsigned=part({typ:'JWT',alg:'ES256'})+'.'+part({aud:new URL(endpoint).origin,exp:nowSeconds+12*3600,sub:subject})
  const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,encoder.encode(unsigned))
  return `vapid t=${unsigned}.${toBase64Url(signature)}, k=${publicKey}`
}

export {publicJwk}

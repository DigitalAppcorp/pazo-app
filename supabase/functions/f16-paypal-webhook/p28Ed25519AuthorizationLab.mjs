// P28 experimental Ed25519 authorization. Offline only; no deployed endpoint.
// Canonical payload binds request, event and key version; keys are injected.
const EVENT=/^[A-Za-z0-9._-]{3,128}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VERSION=/^v[1-9][0-9]{0,5}$/
export function p28CanonicalAuthorization({eventId,requestId,keyVersion,expiresAt}={}){
 if(typeof eventId!=='string'||!EVENT.test(eventId)||typeof requestId!=='string'||!UUID.test(requestId)||
 typeof keyVersion!=='string'||!VERSION.test(keyVersion)||!Number.isSafeInteger(expiresAt)||expiresAt<0)return null
 return new TextEncoder().encode(['PAZO-F16-P28-READ-V1',requestId.toLowerCase(),eventId,keyVersion,String(expiresAt)].join('\n'))
}
export async function p28SignAuthorization({payload,privateKey,cryptoImpl=globalThis.crypto}={}){
 if(!(payload instanceof Uint8Array)||!privateKey||!cryptoImpl?.subtle)return null
 try{return new Uint8Array(await cryptoImpl.subtle.sign('Ed25519',privateKey,payload))}catch{return null}
}
export async function p28VerifyAuthorization({payload,signature,publicKey,cryptoImpl=globalThis.crypto}={}){
 if(!(payload instanceof Uint8Array)||!(signature instanceof Uint8Array)||signature.byteLength!==64||!publicKey||!cryptoImpl?.subtle)return false
 try{return await cryptoImpl.subtle.verify('Ed25519',publicKey,signature,payload)}catch{return false}
}

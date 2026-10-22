// F16-P28 offline only: explicit key version, no fallback to retired versions.
import {createP28EventFingerprint} from './p28EventFingerprint.mjs'
const VERSION=/^v[1-9][0-9]{0,5}$/
export function createP28VersionedFingerprint({activeVersion,keys={},cryptoImpl=globalThis.crypto}={}){
 if(!VERSION.test(activeVersion||'')||!keys||typeof keys!=='object')return async()=>null
 const versions=Object.keys(keys)
 if(versions.length!==1||versions[0]!==activeVersion)return async()=>null
 const derive=createP28EventFingerprint({secret:keys[activeVersion],cryptoImpl})
 return async eventId=>{
  const fingerprint=await derive(eventId)
  return fingerprint?Object.freeze({keyVersion:activeVersion,eventFingerprint:fingerprint}):null
 }
}

// Read-only public admin projection. Never infer authority from browser flags.
export function parsePazoLiveReleaseStatus(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).sort().join(',')!==
  'asOf,engineeringVerified,mayCharge,mode,originalOperator,preparationReady,revision,source'||
  raw.source!=='pazo_live_release_status_v1'||raw.mayCharge!==false||
  !['off','canary','public'].includes(raw.mode)||!Number.isSafeInteger(raw.revision)||raw.revision<0||
  ['engineeringVerified','preparationReady','originalOperator'].some(k=>typeof raw[k]!=='boolean')||
  typeof raw.asOf!=='string'||!Number.isFinite(Date.parse(raw.asOf))||
  raw.preparationReady&&!raw.engineeringVerified)return null
 return raw
}

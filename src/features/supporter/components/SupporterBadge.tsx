import { useState } from 'react'

export type SupporterMilestone = 0 | 3 | 6 | 12
const badgeFiles = {
  0: 'amigo-pazo-inicio.png',
  3: 'amigo-pazo-3-meses.png',
  6: 'amigo-pazo-6-meses.png',
  12: 'amigo-pazo-12-meses.png',
} as const

/**
 * Official approved PAZO badge artwork, not a substitute icon. Must be installed
 * from the original PO Library export before enabling the public F16 release.
 * This component NEVER determines entitlement: only an independently verified
 * backend RPC result may set active=true. Missing assets fail closed (no fake).
 */
export function SupporterBadge({
  active,milestone=0,lang,size='small',
}:{
  active:boolean
  milestone?:SupporterMilestone
  lang:'es'|'en'
  size?:'small'|'large'
}){
  const [failedAsset,setFailedAsset]=useState<string|null>(null)
  if(!active || !Object.prototype.hasOwnProperty.call(badgeFiles,milestone)) return null
  const file=badgeFiles[milestone]
  if(failedAsset===file)return null
  const label=lang==='es'
    ? (milestone===0?'Amigo de PAZO':`Amigo de PAZO · ${milestone} meses`)
    : (milestone===0?'PAZO Friend':`PAZO Friend · ${milestone} months`)
  return <img
    src={'/supporter/' + file}
    alt={label}
    title={label}
    decoding="async"
    loading="lazy"
    onError={()=>setFailedAsset(file)}
    className={(size==='large'?'h-[66px] w-[66px]':'h-8 w-8')+' shrink-0 object-contain'}
  />
}

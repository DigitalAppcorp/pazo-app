import {useState} from 'react'
import {GratitudeWallLive} from './GratitudeWallLive'
import {GratitudeWallScene, type WallTab} from './GratitudeWallScene'

type Props={lang:'es'|'en';onClose:()=>void}

/**
 * Welcome A01 remains accessible without login. When the verified-benefits
 * release flag is OFF, render the approved design's empty state with ZERO
 * roster fetches and ZERO fabricated consenting pets. Live RPC is gated.
 */
export const GratitudeWallPreview=({lang,onClose}:Props)=>{
  const [order,setOrder]=useState<WallTab>('all')
  if(import.meta.env.VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED === 'true')
    return <GratitudeWallLive lang={lang} onClose={onClose}/>
  return <GratitudeWallScene lang={lang} onClose={onClose}
    rows={[]} tab={order} onTabChange={setOrder} previewOnly/>
}

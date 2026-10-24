import {useState} from 'react'
import {GratitudeWallLive} from './GratitudeWallLive'
import {GratitudeWallScene, type WallTab} from './GratitudeWallScene'
import {supporterBenefitsUiEnabled} from '../supporterUiRelease'

type Props={lang:'es'|'en';onClose:()=>void}

/**
 * Welcome A01 remains accessible without login. When the verified-benefits
 * release flag is OFF, render the approved design's empty state with ZERO
 * roster fetches and ZERO fabricated consenting pets. Live RPC is gated.
 */
export const GratitudeWallPreview=({lang,onClose}:Props)=>{
  const [order,setOrder]=useState<WallTab>('all')
  if(supporterBenefitsUiEnabled)
    return <GratitudeWallLive lang={lang} onClose={onClose} backToWelcome/>
  return <GratitudeWallScene lang={lang} onClose={onClose}
    rows={[]} tab={order} onTabChange={setOrder} previewOnly/>
}

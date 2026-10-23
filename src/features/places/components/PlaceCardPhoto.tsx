import { useEffect, useState } from 'react'
import { IconPin } from '../../../components/icons/PazoIcons'
import type { PetPlace } from '../../../types/pazo'
import { getCuratedPlacePhoto } from '../curatedPlacePhotography'
/** Actual venue photos always take precedence; a category illustration is
 * visibly labeled so nobody mistakes another business for this venue. */
export const PlaceCardPhoto=({place,lang}:{
  place:Pick<PetPlace,'name'|'category'|'photoUrl'>;lang:'es'|'en'
})=>{
  const [failed,setFailed]=useState(false)
  const [fallbackAttempt,setFallbackAttempt]=useState(false)
  const directPhoto=place.photoUrl?.trim()||''
  const curated=!directPhoto?getCuratedPlacePhoto(place.name):null
  const photoUrl=directPhoto||curated?.imageUrl||''
  useEffect(()=>{setFailed(false);setFallbackAttempt(false)},[photoUrl])
  // Commons resolves the very same licensed file if its direct thumbnail URL fails.
  // Retry once; never substitute a different business or an unlicensed image.
  const fallbackPhoto=curated
    ? curated.sourceUrl.replace('/wiki/File:', '/wiki/Special:FilePath/')+'?width=500'
    : ''
  const resolvedPhotoUrl=fallbackAttempt&&fallbackPhoto?fallbackPhoto:photoUrl
  const showPhoto=/^https:\/\/[^\s]+$/i.test(photoUrl)&&!failed
  const illustrative=Boolean(curated&&!curated.exactVenue&&showPhoto)
  const accent=place.category==='food'||place.category==='pet_store'
    ? 'from-[#E5EAC7] via-[#D3DFC0] to-[#EDF1DC]'
    : place.category==='trail'||place.category==='park'
      ? 'from-[#D3E4D4] via-[#E9EEDF] to-[#C8D8CA]'
      : 'from-[#E5EBE4] via-[#F2F3E8] to-[#CCDCD5]'
  return <div className={`relative h-[108px] w-full overflow-hidden rounded-[1.3rem] bg-gradient-to-br ${accent}`}>
    {showPhoto?
      <img data-pazo-place-photo="true" src={resolvedPhotoUrl}
        alt={illustrative?
          (lang==='es'?'Imagen ilustrativa de la categoría, no del establecimiento':
            'Illustrative category photo, not this establishment'):
          `Foto de ${place.name}`}
        loading="lazy" decoding="async" referrerPolicy="no-referrer"
        className="h-full w-full object-cover" onError={()=>{
          if(curated&&!fallbackAttempt){setFallbackAttempt(true);return}
          setFailed(true)
        }}/>:
      <div className="flex h-full flex-col items-center justify-center gap-1 text-[#476A5E]">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/55"><IconPin size={21}/></span>
        <span className="text-[10px] font-semibold">{lang==='es'?'Foto no disponible':'Photo unavailable'}</span>
      </div>}
    {illustrative&&<span className="pointer-events-none absolute right-2 top-2 rounded-full bg-[#204E4A]/80 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">{lang==='es'?'Ilustrativa':'Illustrative'}</span>}
  </div>
}

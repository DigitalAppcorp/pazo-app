import { useEffect, useState } from 'react'
import { IconPin } from '../../../components/icons/PazoIcons'
import type { PetPlace } from '../../../types/pazo'

/** Never present a generic stock image as a photograph of a real business.
 * External real-place images require a verified licensed photo URL.
 * Google Places Photos require a separately approved, billed provider
 * integration with attribution and no persistent caching. */
export const PlaceCardPhoto = ({
  place, lang,
}: {
  place: Pick<PetPlace, 'name' | 'category' | 'photoUrl'>
  lang: 'es' | 'en'
}) => {
  const [failed, setFailed] = useState(false)
  const photoUrl = place.photoUrl?.trim() || ''
  useEffect(() => setFailed(false), [photoUrl])
  const hasTrustedPhoto = /^https:\/\/[^\s]+$/i.test(photoUrl) && !failed
  const accent = place.category === 'food' || place.category === 'pet_store'
    ? 'from-[#E5EAC7] via-[#D3DFC0] to-[#EDF1DC]'
    : place.category === 'trail' || place.category === 'park'
      ? 'from-[#D3E4D4] via-[#E9EEDF] to-[#C8D8CA]'
      : 'from-[#E5EBE4] via-[#F2F3E8] to-[#CCDCD5]'

  return <div className={`relative h-[91px] w-full overflow-hidden rounded-[1.3rem] bg-gradient-to-br ${accent}`}>
    {hasTrustedPhoto
      ? <img src={photoUrl} alt={`Foto de ${place.name}`} loading="lazy" decoding="async"
          className="h-full w-full object-cover" onError={() => setFailed(true)} />
      : <div className="flex h-full flex-col items-center justify-center gap-1 text-[#476A5E]">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/55">
            <IconPin size={21} />
          </span>
          <span className="text-[10px] font-semibold">
            {lang === 'es' ? 'Foto no disponible' : 'Photo unavailable'}
          </span>
        </div>}
  </div>
}

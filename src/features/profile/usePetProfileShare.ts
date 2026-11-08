import { useRef, useState } from 'react'
import { recordReturnProfileShare } from '../push/pushService'
import { sharedPetUrl } from './sharedPetRoute'

export function usePetProfileShare() {
  const [shareFeedback, setShareFeedback] = useState<{ petId: string; copied: boolean; url: string } | null>(null)
  const sharing = useRef(false)

  const copyProfile = async (pet: { id: string }) => {
    const url = sharedPetUrl(window.location.origin, pet.id)
    try {
      await navigator.clipboard.writeText(url)
      setShareFeedback({ petId: pet.id, copied: true, url })
      recordReturnProfileShare(pet.id)
    } catch {
      setShareFeedback({ petId: pet.id, copied: false, url })
    }
  }

  const shareProfile = async (pet: { id: string; name: string }, nativeOnly = false) => {
    if (sharing.current) return
    sharing.current = true
    setShareFeedback(null)
    const url = sharedPetUrl(window.location.origin, pet.id)
    try {
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: `${pet.name} · PAZO`, url })
          recordReturnProfileShare(pet.id)
          return
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return
        }
      }
      if (!nativeOnly) await copyProfile(pet)
    } finally {
      sharing.current = false
    }
  }

  return { shareProfile, shareFeedback, copyProfile }
}

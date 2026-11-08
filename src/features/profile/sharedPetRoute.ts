const sharedPetHash = /^#\/pet\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
const returnKey = 'pazo_shared_pet_return'

export function getSharedPetId(hash: string) {
  return sharedPetHash.exec(hash)?.[1].toLowerCase() ?? null
}

export function sharedPetUrl(origin: string, petId: string) {
  return new URL(`/mascota/${encodeURIComponent(petId)}`, origin).href
}

// Keep the public destination in this tab across an OAuth redirect.
export function rememberSharedPet(petId: string) {
  try { sessionStorage.setItem(returnKey, `#/pet/${petId}`) } catch { /* storage unavailable */ }
}

export function takeSharedPet() {
  try {
    const hash = sessionStorage.getItem(returnKey)
    sessionStorage.removeItem(returnKey)
    return getSharedPetId(hash ?? '')
  } catch {
    return null
  }
}

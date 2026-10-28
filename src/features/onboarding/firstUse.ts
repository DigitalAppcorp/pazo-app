export type FirstUseIntent = 'qr' | 'neutral'
export interface FirstUseHint { ownerId: string; petId: string; intent: FirstUseIntent }

// Only the successful creation callback can offer this. Bootstrap/reload of an
// existing pet never does, so there is no new persistent tracking/preference.
export function shouldOfferFirstUse(previousPetIds: readonly string[], ownerId?: string, petId?: string, demo = false): boolean {
  return Boolean(ownerId && petId && !demo && previousPetIds.length === 0)
}
export function isCurrentFirstUse(hint: FirstUseHint | null, ownerId?: string, petId?: string): boolean {
  return Boolean(hint && hint.ownerId === ownerId && hint.petId === petId)
}

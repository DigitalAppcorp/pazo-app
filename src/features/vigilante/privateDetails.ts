// Private data the Vigilante matches alerts against. Pure helpers, no network.

// Closed list mirrored by pet_health_conditions_valid.
export const HEALTH_CONDITIONS = ['allergies', 'diabetes', 'heart', 'respiratory', 'seizures', 'other'] as const
export type HealthCondition = (typeof HEALTH_CONDITIONS)[number]

export const HEALTH_CONDITION_LABELS: Record<HealthCondition, { es: string; en: string }> = {
  allergies: { es: 'Alergias', en: 'Allergies' },
  diabetes: { es: 'Diabetes', en: 'Diabetes' },
  heart: { es: 'Problema cardiaco', en: 'Heart condition' },
  respiratory: { es: 'Problema respiratorio', en: 'Breathing condition' },
  seizures: { es: 'Convulsiones', en: 'Seizures' },
  other: { es: 'Otra', en: 'Other' },
}

export interface PetHealthDetails {
  birthMonth: string // 'YYYY-MM' or ''
  conditions: HealthCondition[]
  foodBrand: string
  foodProduct: string
}

export const EMPTY_PET_HEALTH: PetHealthDetails = { birthMonth: '', conditions: [], foodBrand: '', foodProduct: '' }

export const isHealthCondition = (value: unknown): value is HealthCondition =>
  typeof value === 'string' && (HEALTH_CONDITIONS as readonly string[]).includes(value)

export const isValidPostalCode = (value: string) => /^[0-9]{5}$/.test(value)

// Empty is valid: every field is optional.
export const isValidBirthMonth = (value: string) => {
  if (value === '') return true
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const now = new Date()
  return month >= 1 && month <= 12 && year >= 1990 &&
    (year < now.getFullYear() || (year === now.getFullYear() && month <= now.getMonth() + 1))
}

interface PetHealthRow {
  birth_month: string | null
  health_conditions: string[] | null
  food_brand: string | null
  food_product: string | null
}

export const mapPetHealthRow = (row: PetHealthRow | null): PetHealthDetails => ({
  birthMonth: row?.birth_month ? row.birth_month.slice(0, 7) : '',
  conditions: (row?.health_conditions || []).filter(isHealthCondition),
  foodBrand: row?.food_brand || '',
  foodProduct: row?.food_product || '',
})

export const toPetHealthRow = (details: PetHealthDetails): PetHealthRow => ({
  birth_month: details.birthMonth ? `${details.birthMonth}-01` : null,
  health_conditions: [...new Set(details.conditions)],
  food_brand: details.foodBrand.trim() || null,
  food_product: details.foodProduct.trim() || null,
})

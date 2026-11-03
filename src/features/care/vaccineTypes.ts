import type { Species, VaccineType } from '../../types/pazo'

// Closed list mirrored by care_items_vaccine_type_valid. The Vigilante matches outbreaks
// against these keys, so a free-text title is never read as a vaccine.
export const VACCINE_TYPES = [
  'rabies',
  'dhpp',
  'leptospirosis',
  'bordetella',
  'canine_influenza',
  'fvrcp',
  'felv',
  'other',
] as const satisfies readonly VaccineType[]

export const VACCINE_LABELS: Record<VaccineType, { es: string; en: string }> = {
  rabies: { es: 'Rabia', en: 'Rabies' },
  dhpp: { es: 'Moquillo y parvovirus (DHPP)', en: 'Distemper and parvo (DHPP)' },
  leptospirosis: { es: 'Leptospirosis', en: 'Leptospirosis' },
  bordetella: { es: 'Tos de las perreras (Bordetella)', en: 'Kennel cough (Bordetella)' },
  canine_influenza: { es: 'Influenza canina', en: 'Canine influenza' },
  fvrcp: { es: 'Triple felina (FVRCP)', en: 'Feline distemper (FVRCP)' },
  felv: { es: 'Leucemia felina (FeLV)', en: 'Feline leukemia (FeLV)' },
  other: { es: 'Otra vacuna', en: 'Other vaccine' },
}

const OPTIONS_BY_SPECIES: Partial<Record<Species, readonly VaccineType[]>> = {
  perro: ['rabies', 'dhpp', 'leptospirosis', 'bordetella', 'canine_influenza', 'other'],
  gato: ['rabies', 'fvrcp', 'felv', 'other'],
}

// Only dogs and cats get the list for now; other species keep the free title.
export const vaccineOptionsFor = (species: Species | undefined): readonly VaccineType[] =>
  (species && OPTIONS_BY_SPECIES[species]) || []

export const isVaccineType = (value: unknown): value is VaccineType =>
  typeof value === 'string' && (VACCINE_TYPES as readonly string[]).includes(value)

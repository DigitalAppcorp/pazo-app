import { supabase } from '../../services/supabaseClient'
import { mapPetHealthRow, toPetHealthRow, type PetHealthDetails } from './privateDetails'

const PET_HEALTH_COLUMNS = 'birth_month,health_conditions,food_brand,food_product'

export const fetchPetHealthDetails = async (petId: string): Promise<PetHealthDetails> => {
  const { data, error } = await supabase
    .from('pet_private_details')
    .select(PET_HEALTH_COLUMNS)
    .eq('pet_id', petId)
    .maybeSingle()
  if (error) throw error
  return mapPetHealthRow(data)
}

// Owner-only row; the RLS policies reject any pet the caller does not own.
export const savePetHealthDetails = async (petId: string, details: PetHealthDetails) => {
  const { error } = await supabase
    .from('pet_private_details')
    .upsert({ pet_id: petId, ...toPetHealthRow(details) }, { onConflict: 'pet_id' })
  if (error) throw error
}

export const fetchHouseholdPostalCode = async (): Promise<string> => {
  const { data, error } = await supabase
    .from('household_private_details')
    .select('postal_code')
    .maybeSingle()
  if (error) throw error
  return data?.postal_code || ''
}

export const saveHouseholdPostalCode = async (postalCode: string) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('No active session.')
  const { error } = await supabase
    .from('household_private_details')
    .upsert({ user_id: user.id, postal_code: postalCode || null, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

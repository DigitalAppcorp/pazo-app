import { supabase } from './supabaseClient'
import type { ActivePlaceCheckin } from '../types/pazo'

const mapCheckin = (row: any): ActivePlaceCheckin => ({
  id: row.id,
  placeId: row.place_id,
  petId: row.pet_id,
  visible: Boolean(row.visible),
  checkedInAt: row.checked_in_at,
  expiresAt: row.expires_at,
})

export const fetchActivePlaceCheckin = async (
  petId: string
): Promise<ActivePlaceCheckin | null> => {
  const { data, error } = await supabase
    .from('pet_place_checkins')
    .select('id,place_id,pet_id,visible,checked_in_at,expires_at')
    .eq('pet_id', petId)
    .is('ended_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (error) throw error
  return data ? mapCheckin(data) : null
}

export const startPlaceCheckin = async ({
  placeId,
  petId,
  visible,
}: {
  placeId: string
  petId: string
  visible: boolean
}): Promise<ActivePlaceCheckin> => {
  const { data, error } = await supabase
    .from('pet_place_checkins')
    .insert({
      place_id: placeId,
      pet_id: petId,
      visible,
    })
    .select('id,place_id,pet_id,visible,checked_in_at,expires_at')
    .single()

  if (error) throw error
  return mapCheckin(data)
}

export const setPlaceCheckinVisibility = async ({
  checkinId,
  visible,
}: {
  checkinId: string
  visible: boolean
}) => {
  const { error } = await supabase
    .from('pet_place_checkins')
    .update({ visible })
    .eq('id', checkinId)

  if (error) throw error
}

export const endPlaceCheckin = async (checkinId: string) => {
  const { error } = await supabase
    .from('pet_place_checkins')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', checkinId)

  if (error) throw error
}

import { supabase } from './supabaseClient'
import type {
  CareCompletion,
  CareItem,
  CareItemInput,
  CareReminderDays,
  CareRecurrence,
  CareCategory,
} from '../types/pazo'

const HISTORY_PAGE_SIZE = 20

const normalizeTime = (value: string | null | undefined) =>
  value ? value.slice(0, 5) : null

const mapCareItem = (row: any): CareItem => ({
  id: row.id,
  petId: row.pet_id,
  title: row.title,
  category: row.category as CareCategory,
  dueDate: row.due_date,
  dueTime: normalizeTime(row.due_time),
  timezone: row.timezone,
  recurrence: row.recurrence as CareRecurrence,
  reminderDaysBefore:
    row.reminder_days_before === null
      ? null
      : (Number(row.reminder_days_before) as Exclude<CareReminderDays, null>),
  notes: row.notes,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const mapCareCompletion = (row: any): CareCompletion => ({
  id: row.id,
  careItemId: row.care_item_id,
  petId: row.pet_id,
  scheduledDate: row.scheduled_date,
  scheduledTime: normalizeTime(row.scheduled_time),
  completedAt: row.completed_at,
  title: row.title_snapshot,
  category: row.category_snapshot as CareCategory,
  notes: row.notes_snapshot,
  recurrence: row.recurrence_snapshot as CareRecurrence,
})

const toCareWritePayload = (input: CareItemInput) => ({
  title: input.title.trim(),
  category: input.category,
  due_date: input.dueDate,
  due_time: input.dueTime?.trim() || null,
  timezone: input.timezone.trim(),
  recurrence: input.recurrence,
  reminder_days_before: input.reminderDaysBefore,
  notes: input.notes?.trim() || null,
})

export const fetchActiveCareItems = async (petId: string): Promise<CareItem[]> => {
  const { data, error } = await supabase
    .from('care_items')
    .select(
      'id,pet_id,title,category,due_date,due_time,timezone,recurrence,reminder_days_before,notes,status,created_at,updated_at'
    )
    .eq('pet_id', petId)
    .eq('status', 'active')
    .order('due_date', { ascending: true })
    .order('due_time', { ascending: true, nullsFirst: false })
    .limit(50)

  if (error) throw error
  return (data || []).map(mapCareItem)
}

export const fetchCareHistory = async (
  petId: string,
  offset = 0,
  limit = HISTORY_PAGE_SIZE
): Promise<CareCompletion[]> => {
  const safeOffset = Math.max(0, offset)
  const safeLimit = Math.min(Math.max(1, limit), 50)

  const { data, error } = await supabase
    .from('care_completions')
    .select(
      'id,care_item_id,pet_id,scheduled_date,scheduled_time,completed_at,title_snapshot,category_snapshot,notes_snapshot,recurrence_snapshot'
    )
    .eq('pet_id', petId)
    .order('completed_at', { ascending: false })
    .order('id', { ascending: false })
    .range(safeOffset, safeOffset + safeLimit - 1)

  if (error) throw error
  return (data || []).map(mapCareCompletion)
}

export const createCareItem = async (
  petId: string,
  input: CareItemInput
): Promise<CareItem> => {
  const { data, error } = await supabase
    .from('care_items')
    .insert({
      pet_id: petId,
      ...toCareWritePayload(input),
    })
    .select(
      'id,pet_id,title,category,due_date,due_time,timezone,recurrence,reminder_days_before,notes,status,created_at,updated_at'
    )
    .single()

  if (error) throw error
  return mapCareItem(data)
}

export const updateCareItem = async (
  careItemId: string,
  input: CareItemInput
): Promise<CareItem> => {
  const { data, error } = await supabase
    .from('care_items')
    .update(toCareWritePayload(input))
    .eq('id', careItemId)
    .eq('status', 'active')
    .select(
      'id,pet_id,title,category,due_date,due_time,timezone,recurrence,reminder_days_before,notes,status,created_at,updated_at'
    )
    .single()

  if (error) throw error
  return mapCareItem(data)
}

export const archiveCareItem = async (careItemId: string): Promise<void> => {
  const { error } = await supabase.rpc('archive_care_item', {
    p_care_item_id: careItemId,
  })

  if (error) throw error
}

export const completeCareItem = async (item: CareItem): Promise<void> => {
  const { error } = await supabase.rpc('complete_care_item', {
    p_care_item_id: item.id,
    p_expected_due_date: item.dueDate,
    p_expected_due_time: item.dueTime || null,
  })

  if (error) throw error
}

export const undoCareCompletion = async (completionId: string): Promise<void> => {
  const { error } = await supabase.rpc('undo_care_completion', {
    p_completion_id: completionId,
  })

  if (error) throw error
}

export const fetchCareReminderCandidates = async (
  petIds: string[]
): Promise<CareItem[]> => {
  if (petIds.length === 0) return []

  const now = new Date()
  const maxDate = new Date(now)
  // +8 creates a one-day safety margin for care items saved in another timezone.
  // The final reminder decision is filtered client-side using the item's own IANA timezone.
  maxDate.setDate(maxDate.getDate() + 8)

  const maxDateString = [
    maxDate.getFullYear(),
    String(maxDate.getMonth() + 1).padStart(2, '0'),
    String(maxDate.getDate()).padStart(2, '0'),
  ].join('-')

  const { data, error } = await supabase
    .from('care_items')
    .select(
      'id,pet_id,title,category,due_date,due_time,timezone,recurrence,reminder_days_before,notes,status,created_at,updated_at'
    )
    .in('pet_id', petIds)
    .eq('status', 'active')
    .lte('due_date', maxDateString)
    .order('due_date', { ascending: true })
    .order('due_time', { ascending: true, nullsFirst: false })
    .limit(50)

  if (error) throw error
  return (data || []).map(mapCareItem)
}

export const CARE_HISTORY_PAGE_SIZE = HISTORY_PAGE_SIZE

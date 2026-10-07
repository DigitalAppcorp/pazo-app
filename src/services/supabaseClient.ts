import { createClient } from '@supabase/supabase-js'

const fallbackSupabaseUrl = 'https://mrybvqdebbgcayuvgkkr.supabase.co'
const fallbackPublishableKey = 'sb_publishable_eSU1LzulS94igbbS0oXdDw_OqeaiBeg'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim()
  || fallbackSupabaseUrl

const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  || fallbackPublishableKey

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase public configuration is missing.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

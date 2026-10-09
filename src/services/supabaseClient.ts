import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'PAZO: Missing Supabase environment configuration.'
  )
}

if (import.meta.env.DEV) {
  const url = new URL(supabaseUrl)

  const isLocal =
    url.protocol === 'http:' &&
    ['127.0.0.1', 'localhost'].includes(url.hostname) &&
    url.port === '54321'

  if (!isLocal) {
    throw new Error(
      'PAZO SECURITY: Development must use local Supabase.'
    )
  }
}

export const supabase = createClient(supabaseUrl, supabaseKey)

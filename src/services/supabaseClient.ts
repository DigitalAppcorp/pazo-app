import { createClient } from '@supabase/supabase-js'

import { getPublicSupabaseConfig } from '../lib/publicConfig'

const config = getPublicSupabaseConfig(import.meta.env)
if (!config) throw new Error('Supabase public configuration is missing or invalid.')

export const supabase = createClient(config.url, config.key)

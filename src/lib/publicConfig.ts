interface PublicEnvironment {
  [key: string]: unknown
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

// Changing the PAZO project requires an intentional configuration review.
const expectedHost = 'mrybvqdebbgcayuvgkkr.supabase.co'

export const getPublicSupabaseConfig = (env: PublicEnvironment) => {
  const url = env.VITE_SUPABASE_URL?.trim()
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !key) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' || parsed.host !== expectedHost
      || parsed.username || parsed.password || parsed.search || parsed.hash
      || parsed.pathname !== '/') return null
    if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
      const parts = key.split('.')
      if (parts.length !== 3) return null
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      if (payload.role !== 'anon' || payload.ref !== expectedHost.split('.')[0]) return null
    }
    return { url: parsed.origin, key }
  } catch {
    return null
  }
}

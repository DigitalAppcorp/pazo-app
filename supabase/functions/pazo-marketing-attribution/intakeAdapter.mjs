// PAZO Marketing: provider adapters. CODE ONLY; server secret never travels to the browser.
// NO hosted deployment, NO rollout, and no calls while endpoint release is OFF.
export function createMarketingProvider({
  url, anonKey, serviceKey, fetchImpl=fetch,
}) {
  const expected = 'https://mrybvqdebbgcayuvgkkr.supabase.co'
  if (url !== expected || typeof anonKey !== 'string' || anonKey.length < 15
    || typeof serviceKey !== 'string' || serviceKey.length < 15) {
    throw new Error('marketing_config_unavailable')
  }

  return {
    authenticate: async (userJwt) => {
      // Supabase Auth performs trusted server validation of the bearer token;
      // never decode JWT and treat its unsigned payload as an authority.
      const result = await fetchImpl(expected + '/auth/v1/user', {
        method:'GET', redirect:'error', cache:'no-store',
        signal:AbortSignal.timeout(8000),
        headers:{
          'apikey':anonKey,
          'authorization':'Bearer ' + userJwt,
          'accept':'application/json',
        },
      })
      if (result.status !== 200) return null
      const data = await result.json()
      return data && typeof data === 'object' ? data : null
    },
    submit: async ({ownerId,creative,firstTouchAt}) => {
      // The next gate must approve the collection notice, retention,
      // and a secure service-RPC bridge. No secrets in frontend.
      const result = await fetchImpl(expected + '/rest/v1/rpc/pazo_marketing_record_verified_v1', {
        method:'POST', redirect:'error', cache:'no-store',
        signal:AbortSignal.timeout(8000),
        headers:{
          'apikey':serviceKey, 'authorization':'Bearer ' + serviceKey,
          'content-type':'application/json', 'accept':'application/json',
        },
        body: JSON.stringify({
          p_owner:ownerId,
          p_creative:creative,
          p_first_touch_at:firstTouchAt,
        }),
      })
      if (result.status !== 200) return false
      const value = await result.json()
      return value === true
    },
  }
}

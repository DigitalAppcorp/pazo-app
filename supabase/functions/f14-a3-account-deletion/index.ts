// F14 A3 — internal review only, with independent fail-closed deployment gates.
// NO deletion operations. Never enable or deploy without a separate PO gate.
// Supabase server middleware validates a *named* internal secret API key in
// the apikey header BEFORE this handler executes; no user JWT grants access.
import { withSupabase } from 'npm:@supabase/server@1.8.1'
import { makeA3InternalReviewHandler } from './http.ts'
import { createA3ReviewPort, type A3ServerRpc } from './adapter.ts'
import { createA3ReadOnlyChecks } from './checks.ts'

const invokeSecret = Deno.env.get('PAZO_A3_REVIEW_INVOKE_SECRET') ?? ''
const enabled = Deno.env.get('PAZO_A3_REVIEW_WORKER_ENABLED') === 'true'
  && invokeSecret.length >= 32

export default {
  fetch: withSupabase({ auth: 'secret:pazo-a3-review' }, async (req, ctx) => {
    // Even a valid service API key has NO effect unless a separate environment
    // gate is deliberately configured. The second internal key is unrelated
    // to the Supabase API key and must never be sent to a browser.
    const handler = makeA3InternalReviewHandler({
      enabled,
      invokeSecret,
      makePort: () => {
        if (!enabled || !ctx.supabaseAdmin) throw new Error('Review unavailable')
        const db = ctx.supabaseAdmin as unknown as A3ServerRpc
        return createA3ReviewPort(db, createA3ReadOnlyChecks(db))
      },
    })
    return handler(req)
  }),
}

// F14 A3 candidate endpoint. NOT DEPLOYED. Intentionally fail-closed.
// The SQL review contract is NOT APPLIED. No account, Auth user or Storage
// object may be deleted by this endpoint. There is no environment-only switch:
// an independently approved implementation must replace this handler after
// real server-side session, lease, ownership, media and retention QA.
const A3_ACCOUNT_DELETION_RELEASE_APPROVED = false as const

const reply = (status: number, body: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })

Deno.serve((request: Request) => {
  if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' })

  // No request parameters or Authorization secrets are read, logged or
  // processed while A3 is disabled; avoid unauthenticated CORS activation.
  if (!A3_ACCOUNT_DELETION_RELEASE_APPROVED) {
    return reply(503, { error: 'account_deletion_disabled' })
  }

  return reply(503, { error: 'account_deletion_not_configured' })
})

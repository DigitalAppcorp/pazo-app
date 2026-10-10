/**
 * F14 A3 - read-only, privileged review adapter. NOT DEPLOYED.
 *
 * The candidate endpoint remains disabled (503) and never imports this module.
 * The only client admitted here is a server-side Supabase client; its secret
 * key must never be shipped in the browser.
 *
 * Requester identity is authenticated by Auth.getUser(jwt) at the server.
 * An exact private operator grant and a pending subject request are then
 * checked independently in the database before reading aggregate counts.
 * An operator JWT alone is never permission to delete anything.
 */

export interface A3AuthIdentity {
  id: string
}

export interface A3PrivilegedClient {
  auth: {
    getUser(jwt: string): Promise<{
      data: { user: A3AuthIdentity | null }
      error: unknown
    }>
  }
  rpc(name: string, args: Record<string, string>): Promise<{
    data: unknown
    error: unknown
  }>
}

export type A3ReadOnlyInventory = Readonly<{
  owned_pets: number
  owned_posts: number
  owned_communities: number
  third_party_feed_comments: number
  third_party_community_posts: number
  owned_documents: number
  owned_care_items: number
  total_storage_objects_needing_ownership_review: number
  destructive_execution_allowed: false
}>

export class A3ReviewDenied extends Error {
  constructor() {
    super('A3 review unavailable')
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const INVENTORY_COUNTS = [
  'owned_pets',
  'owned_posts',
  'owned_communities',
  'third_party_feed_comments',
  'third_party_community_posts',
  'owned_documents',
  'owned_care_items',
  'total_storage_objects_needing_ownership_review',
] as const

export function parseA3ReviewInventory(value: unknown): A3ReadOnlyInventory {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new A3ReviewDenied()
  }
  const input = value as Record<string, unknown>
  const output: Record<string, number | false> = {}
  for (const key of INVENTORY_COUNTS) {
    const count = input[key]
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
      throw new A3ReviewDenied()
    }
    output[key] = count
  }
  if (input.destructive_execution_allowed !== false) {
    throw new A3ReviewDenied()
  }
  output.destructive_execution_allowed = false
  return output as A3ReadOnlyInventory
}

/**
 * Auth checks DO NOT grant deletion, and this function never changes data.
 * The subject UUID is supplied by a trusted reviewer workflow (not a public
 * user action); DB also checks the request exists and the operator is enrolled.
 */
export async function getA3ReviewInventory(
  admin: A3PrivilegedClient,
  operatorJwt: string,
  subjectUserId: string,
): Promise<A3ReadOnlyInventory> {
  if (typeof operatorJwt !== 'string' || operatorJwt.length < 20
      || operatorJwt.length > 8192 || !UUID.test(subjectUserId)) {
    throw new A3ReviewDenied()
  }

  // Do not forward caller JWT into the privileged client's global headers.
  // Auth verifies validity, expiry and issuer; identity is never taken from
  // the request JSON, its email address or user_metadata.
  const identity = await admin.auth.getUser(operatorJwt).catch(() => {
    throw new A3ReviewDenied()
  })
  const operatorId = identity.data?.user?.id
  if (identity.error || typeof operatorId !== 'string'
      || !UUID.test(operatorId) || operatorId === subjectUserId) {
    throw new A3ReviewDenied()
  }

  const membership = await admin.rpc('f14_a3_review_operator_authorized', {
    p_operator_user_id: operatorId,
    p_subject_user_id: subjectUserId,
  }).catch(() => { throw new A3ReviewDenied() })

  if (membership.error || membership.data !== true) {
    throw new A3ReviewDenied()
  }

  const inventory = await admin.rpc('f14_a3_review_inventory', {
    p_subject_user_id: subjectUserId,
  }).catch(() => { throw new A3ReviewDenied() })
  if (inventory.error) throw new A3ReviewDenied()

  return parseA3ReviewInventory(inventory.data)
}

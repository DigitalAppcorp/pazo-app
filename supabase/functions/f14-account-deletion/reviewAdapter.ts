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
async function authorizeOperator(
  admin: A3PrivilegedClient,
  operatorJwt: string,
  subjectUserId: string,
): Promise<string> {
  if (typeof operatorJwt !== 'string' || operatorJwt.length < 20
      || operatorJwt.length > 8192 || !UUID.test(subjectUserId)) {
    throw new A3ReviewDenied()
  }
  // JWT must originate from Authorization header on a trusted service.
  const identity = await admin.auth.getUser(operatorJwt)
    .catch(() => { throw new A3ReviewDenied() })
  const operatorId = identity.data?.user?.id
  if (identity.error || typeof operatorId !== 'string'
      || !UUID.test(operatorId) || operatorId === subjectUserId) {
    throw new A3ReviewDenied()
  }

  const membership = await admin.rpc('f14_a3_review_operator_authorized', {
    p_operator_user_id: operatorId,
    p_subject_user_id: subjectUserId,
  }).catch(() => { throw new A3ReviewDenied() })
  if (membership.error || membership.data !== true) throw new A3ReviewDenied()
  return operatorId
}

/** An operator can inspect only a verified pending-request aggregate. */
export async function getA3ReviewInventory(
  admin: A3PrivilegedClient,
  operatorJwt: string,
  subjectUserId: string,
): Promise<A3ReadOnlyInventory> {
  await authorizeOperator(admin, operatorJwt, subjectUserId)
  const inventory = await admin.rpc('f14_a3_review_inventory', {
    p_subject_user_id: subjectUserId,
  }).catch(() => { throw new A3ReviewDenied() })
  if (inventory.error) throw new A3ReviewDenied()
  return parseA3ReviewInventory(inventory.data)
}

export interface A3LeaseReceipt {
  revision: number
  leaseToken: string
  expiresAt: string
  stage: 'review_request'
  destructiveExecutionAllowed: false
}

function parseA3ReviewLease(data: unknown): A3LeaseReceipt {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new A3ReviewDenied()
  }
  const row = data as Record<string, unknown>
  if (!Number.isSafeInteger(row.revision) || (row.revision as number) < 2
      || typeof row.lease_token !== 'string' || !UUID.test(row.lease_token)
      || typeof row.expires_at !== 'string'
      || !Number.isFinite(Date.parse(row.expires_at))
      || row.stage !== 'review_request'
      || row.destructive_execution_allowed !== false) {
    throw new A3ReviewDenied()
  }
  return {
    revision: row.revision as number,
    leaseToken: row.lease_token,
    expiresAt: row.expires_at,
    stage: 'review_request',
    destructiveExecutionAllowed: false,
  }
}

/**
 * Creates/reclaims an EXCLUSIVE REVIEW lease only. It neither freezes writes
 * nor transitions the deletion request to processing. The expected revision
 * is obtained from server-side state; browser payloads cannot control it.
 */
export async function claimA3ReviewLease(
  admin: A3PrivilegedClient,
  operatorJwt: string,
  subjectUserId: string,
  expectedRevision: number | null,
): Promise<A3LeaseReceipt> {
  if (expectedRevision !== null
      && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1)) {
    throw new A3ReviewDenied()
  }
  const operatorId = await authorizeOperator(admin, operatorJwt, subjectUserId)
  const {data, error} = await admin.rpc('f14_a3_review_claim', {
    p_operator_user_id: operatorId,
    p_subject_user_id: subjectUserId,
    ...(expectedRevision === null ? {} : {p_expected_revision: String(expectedRevision)}),
  }).catch(() => { throw new A3ReviewDenied() })
  if (error) throw new A3ReviewDenied()
  return parseA3ReviewLease(data)
}

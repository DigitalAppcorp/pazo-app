import {
  getA3ReviewInventory, A3ReviewDenied,
  type A3PrivilegedClient,
} from './reviewAdapter.ts'
import {parseA3SocialCounts, type A3SocialCounts} from './socialDependencyReview.ts'

/**
 * Server-side review of social dependency COUNTS only.
 * First authenticates the operator JWT, its exact private grant, and the
 * outstanding request using the existing review adapter. Public clients
 * never receive a service key, pet IDs, post contents, phone numbers or URLs.
 *
 * This is NOT a deletion, worker, or permission to redact comments.
 * The shipped Edge endpoint still returns 503 and never imports this file.
 */
export async function getA3SocialDependencies(
  admin: A3PrivilegedClient,
  operatorJwt: string,
  subjectUserId: string,
): Promise<A3SocialCounts> {
  try {
    // Reuse verified Auth identity + private operator enrolment gate.
    await getA3ReviewInventory(admin, operatorJwt, subjectUserId)
    const result = await admin.rpc('f14_a3_social_dependency_review', {
      p_subject_user_id: subjectUserId,
    })
    if (result.error) throw new A3ReviewDenied()
    const counts = parseA3SocialCounts(result.data)
    if (!counts) throw new A3ReviewDenied()
    return counts
  } catch {
    throw new A3ReviewDenied()
  }
}

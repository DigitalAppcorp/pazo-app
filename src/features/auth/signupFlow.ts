// A successful signup may have no session when email confirmation is required.
export type SignUpOutcome = 'authenticated' | 'verify_email' | 'failed'

export function classifySignUpResult(error: unknown, session: unknown): SignUpOutcome {
  if (error) return 'failed'
  return session ? 'authenticated' : 'verify_email'
}

/** Return users to this app after email confirmation, not an unrelated
 * Supabase Site URL. Hosted Auth must allowlist this exact origin.
 */
export const signUpConfirmationRedirectUrl = (origin: string): string =>
  new URL(origin).origin

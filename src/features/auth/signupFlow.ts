// A successful signup may have no session when email confirmation is required.
export type SignUpOutcome = 'authenticated' | 'verify_email' | 'failed'

export function classifySignUpResult(error: unknown, session: unknown): SignUpOutcome {
  if (error) return 'failed'
  return session ? 'authenticated' : 'verify_email'
}

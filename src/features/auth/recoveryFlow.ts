// An explicit marker survives the email redirect until Supabase restores
// the recovery session. No password, token or email goes into this URL.
export const isRecoveryReturn = (search: string): boolean =>
  new URLSearchParams(search).get('auth') === 'recovery'

export const recoveryRedirectUrl = (origin: string): string =>
  `${new URL(origin).origin}/?auth=recovery`

export const isValidPazoPassword = (password: string): boolean =>
  password.length >= 8
  && /[a-z]/.test(password)
  && /[A-Z]/.test(password)
  && /[0-9]/.test(password)

// Only the Supabase PASSWORD_RECOVERY event confirms this special flow.
// Merely visiting ?auth=recovery with a normal logged-in session is not proof.
export const isVerifiedRecoverySession = (
  recoveryEventObserved: boolean,
  hasSessionUser: boolean,
): boolean => recoveryEventObserved === true && hasSessionUser === true

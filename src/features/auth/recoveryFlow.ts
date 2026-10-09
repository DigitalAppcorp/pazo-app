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

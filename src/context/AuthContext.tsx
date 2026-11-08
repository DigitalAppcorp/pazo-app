import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../services/supabaseClient'
import { releasePushForSignOut } from '../features/push/pushService'
import { autoExcludeInternalBrowser } from '../features/marketing/autoAnalyticsExclusion'
import { ensureOwnAccountProfile } from '../features/auth/ensureOwnAccountProfile'
import { classifySignUpResult, type SignUpOutcome } from '../features/auth/signupFlow'
import { observeSignupFailure, observeSignupFailureCode } from '../features/marketing/experienceDetails'
import {
  cleanGoogleReturnUrl,
  clearAdultAttestationIntent,
  hasAdultAttestationIntent,
  googleRedirectUrl,
  googleReturnFailure,
  isGoogleReturn,
  isNewGoogleAccount,
  rememberAdultAttestationIntent,
  requiresAdultAttestation,
  takeAdultAttestationIntent,
  type GoogleAuthFailure,
} from '../features/auth/googleAuth'
import { GoogleAdultGate } from '../features/auth/GoogleAdultGate'
import { isRecoveryReturn, isVerifiedRecoverySession, recoveryRedirectUrl } from '../features/auth/recoveryFlow'
import {
  captureEvent,
  setObservabilityUser,
} from '../services/observability'
import { stageMarketingSignupRequested, stageMarketingSignupVerified, submitAutomaticMarketingAttribution, clearLocalMarketingAttribution, pendingMarketingSignupData } from '../features/marketing/marketingRuntime'

/** ok: signed in. unconfirmed: the account exists but its email is not confirmed yet. */
export type SignInOutcome = 'ok' | 'unconfirmed' | 'failed'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<SignUpOutcome>
  signIn: (email: string, password: string) => Promise<SignInOutcome>
  resendSignupEmail: (email: string) => Promise<boolean>
  signInWithGoogle: (adultConfirmed: boolean) => Promise<boolean>
  googleAuthFailure: GoogleAuthFailure | null
  clearGoogleAuthFailure: () => void
  signOut: () => Promise<void>
  isPasswordRecovery: boolean
  recoverySessionVerified: boolean
  requestPasswordReset: (email: string) => Promise<boolean>
  changePassword: (password: string) => Promise<boolean>
  finishPasswordRecovery: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authBootstrapError, setAuthBootstrapError] = useState(false)
  const [authBootstrapRetry, setAuthBootstrapRetry] = useState(0)
  const [profileStatus, setProfileStatus] = useState<{ userId: string; status: 'loading' | 'ready' | 'error' } | null>(null)
  const [profileRetry, setProfileRetry] = useState(0)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(
    () => isRecoveryReturn(window.location.search)
  )
  // A query string is only a UI marker, NOT proof that the recovery link
  // created a session. Supabase must emit PASSWORD_RECOVERY first.
  const [recoverySessionVerified, setRecoverySessionVerified] = useState(false)
  const [googleAuthFailure, setGoogleAuthFailure] = useState<GoogleAuthFailure | null>(
    () => googleReturnFailure(window.location.search, window.location.hash)
  )
  // Avoids flashing the 18+ screen to someone who already confirmed it at signup.
  const [savingAttestation, setSavingAttestation] = useState(() => {
    try { return hasAdultAttestationIntent(window.sessionStorage) } catch { return false }
  })

  // Session bootstrap is independent from the splash animation.
  // A hung getSession must not trap the user behind the splash forever.
  useEffect(() => {
    let cancelled = false
    let resolved = false
    let observedUserId: string | null = null
    let googleReturnPending = isGoogleReturn(window.location.search)

    // Codes and tokens must not stay visible to analytics, referrers or history.
    const settleGoogleReturn = (session: Session | null) => {
      if (!googleReturnPending) return
      googleReturnPending = false
      if (!session?.user) setGoogleAuthFailure((current) => current ?? 'failed')
      const clean = cleanGoogleReturnUrl(window.location.href)
      if (clean !== null) window.history.replaceState(window.history.state, '', clean)
    }

    setLoading(true)
    setAuthBootstrapError(false)

    const watchdog = window.setTimeout(() => {
      if (!cancelled && !resolved) setAuthBootstrapError(true)
    }, 10000)

    const acceptSession = (session: Session | null) => {
      if (cancelled) return
      resolved = true
      window.clearTimeout(watchdog)
      const nextUser = session?.user ?? null
      if (observedUserId && observedUserId !== nextUser?.id) clearLocalMarketingAttribution()
      observedUserId = nextUser?.id ?? null
      settleGoogleReturn(session)
      setUser(nextUser)
      setObservabilityUser(nextUser?.id ?? null)
      setAuthBootstrapError(false)
      setLoading(false)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      acceptSession(session)

      if (event === 'PASSWORD_RECOVERY' && session?.user) {
        setIsPasswordRecovery(true)
        setRecoverySessionVerified(true)
      }

      if (event === 'SIGNED_OUT') {
        clearLocalMarketingAttribution()
        setRecoverySessionVerified(false)
        captureEvent('auth_session_signed_out')
      }
      if (event === 'SIGNED_IN') {
        captureEvent('auth_session_signed_in')
      }
      const googleSignup = Boolean(session?.user && isNewGoogleAccount(session.user, Date.now()))
      if (['SIGNED_IN','INITIAL_SESSION','TOKEN_REFRESHED'].includes(event) || (event === 'USER_UPDATED' && googleSignup)) {
        if (session?.user) {
          // An existing account signing in with Google is not a new signup.
          if (googleSignup) stageMarketingSignupRequested(session.user.id)
          stageMarketingSignupVerified(session.user.created_at, session.user.email_confirmed_at, session.user.id)
          // Auth callback must return before invoking another Supabase method.
          // Avoid a client session-lock deadlock; marketing remains fire-and-forget.
          // Nothing leaves the browser until a new Google account confirms 18+.
          if (!requiresAdultAttestation(session.user))
            window.setTimeout(() => { void submitAutomaticMarketingAttribution(session.user.id, session.access_token) }, 0)
        }
      }
    })

    // INITIAL_SESSION usually arrives through onAuthStateChange; getSession
    // is a fallback. A delayed response must not overwrite a newer event.
    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) {
          if (!cancelled && !resolved) setAuthBootstrapError(true)
          return
        }
        if (!resolved) acceptSession(data.session)
      })
      .catch(() => {
        if (!cancelled && !resolved) setAuthBootstrapError(true)
      })

    return () => {
      cancelled = true
      window.clearTimeout(watchdog)
      subscription.unsubscribe()
    }
  }, [authBootstrapRetry])

  // Auth identities can survive a prelaunch fixture reset even if profiles do not.
  // Keep the application behind a reversible bootstrap gate until the server restores
  // the minimal profile owned by the signed-in account.
  const adultAttestationPending = Boolean(user && !isPasswordRecovery && requiresAdultAttestation(user))

  const saveAdultAttestation = async (): Promise<boolean> => {
    const { error } = await supabase.auth.updateUser({
      data: { pazo_adult_attested_at: new Date().toISOString() },
    })
    if (error) captureEvent('auth_google_failed', { error_code: error.code || null })
    return !error
  }

  // The signup screen already asked. Saved after the redirect, when a user exists.
  const pendingAttestationUserId = adultAttestationPending ? user?.id ?? null : null
  useEffect(() => {
    if (!pendingAttestationUserId) return
    // Leaves the Auth callback first; a failure falls back to the visible gate.
    window.setTimeout(() => {
      let intent = false
      try { intent = takeAdultAttestationIntent(window.sessionStorage, Date.now()) } catch { /* the gate asks */ }
      if (!intent) { setSavingAttestation(false); return }
      void saveAdultAttestation().finally(() => setSavingAttestation(false))
    }, 0)
  }, [pendingAttestationUserId])

  // Test and administrator accounts keep this browser out of the usage figures.
  useEffect(() => {
    if (!user?.id) return
    void autoExcludeInternalBrowser(user, async () => {
      const { data, error } = await supabase.rpc('pazo_is_admin')
      return !error && data === true
    })
  }, [user])

  useEffect(() => {
    if (!user?.id || adultAttestationPending) {
      setProfileStatus(null)
      return
    }

    let cancelled = false
    const userId = user.id
    setProfileStatus({ userId, status: 'loading' })

    const watchdog = window.setTimeout(() => {
      if (!cancelled) setProfileStatus({ userId, status: 'error' })
    }, 10000)

    void ensureOwnAccountProfile()
      .then(() => {
        window.clearTimeout(watchdog)
        if (!cancelled) setProfileStatus({ userId, status: 'ready' })
      })
      .catch(() => {
        window.clearTimeout(watchdog)
        if (!cancelled) {
          console.error('Could not initialize account profile')
          setProfileStatus({ userId, status: 'error' })
        }
      })

    return () => {
      cancelled = true
      window.clearTimeout(watchdog)
    }
  }, [user?.id, profileRetry, adultAttestationPending])

  const signUp = async (email: string, password: string): Promise<SignUpOutcome> => {
    const campaign = pendingMarketingSignupData()
    const { data, error } = await supabase.auth.signUp({ email, password, ...(campaign ? { options: { data: campaign } } : {}) })
    const outcome = classifySignUpResult(error, data?.session)

    if (error) {
      observeSignupFailureCode(error.code)
      captureEvent('auth_signup_failed', {
        error_code: error.code || null,
      })
      alert(`Error: ${error.message}`)
      return 'failed'
    }

    // A request accepted by Auth is not necessarily an email-confirmed account.
    stageMarketingSignupRequested(data.user?.id)
    if (outcome === 'authenticated') {
      stageMarketingSignupVerified(data.user?.created_at, data.user?.email_confirmed_at, data.user?.id)
      void submitAutomaticMarketingAttribution(data.user?.id, data.session?.access_token)
    }
    captureEvent('auth_signup_succeeded')
    return outcome
  }

  const signIn = async (email: string, password: string): Promise<SignInOutcome> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      captureEvent('auth_signin_failed', {
        error_code: error.code || null,
      })
      // Shown on the login screen with a resend button, never as a raw provider alert.
      if (error.code === 'email_not_confirmed') {
        observeSignupFailure('unconfirmed_login')
        return 'unconfirmed'
      }
      alert(`Error al iniciar sesión: ${error.message}`)
      return 'failed'
    }

    captureEvent('auth_signin_succeeded')
    return 'ok'
  }

  const resendSignupEmail = async (email: string) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    return !error
  }

  const signInWithGoogle = async (adultConfirmed: boolean): Promise<boolean> => {
    try {
      if (adultConfirmed) rememberAdultAttestationIntent(window.sessionStorage, Date.now())
      else clearAdultAttestationIntent(window.sessionStorage)
    } catch { /* storage denied: the gate asks after the redirect */ }
    captureEvent('auth_google_started')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: googleRedirectUrl(window.location.origin),
          // Shared devices: choosing the account avoids entering the wrong one.
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error) captureEvent('auth_google_failed', { error_code: error.code || null })
      return !error
    } catch {
      captureEvent('auth_google_failed', { error_code: null })
      return false
    }
  }

  const clearGoogleAuthFailure = () => setGoogleAuthFailure(null)

  const requestPasswordReset = async (email: string): Promise<boolean> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: recoveryRedirectUrl(window.location.origin),
    })
    if (error) {
      captureEvent('auth_password_reset_request_failed', {
        error_code: error.code || null,
      })
      return false
    }
    captureEvent('auth_password_reset_requested')
    return true
  }

  const changePassword = async (password: string): Promise<boolean> => {
    // Neither a URL marker nor an ordinary pre-existing login grants a
    // password-reset flow. Require the verified Auth event and live user.
    if (!isVerifiedRecoverySession(recoverySessionVerified, Boolean(user))) {
      return false
    }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      captureEvent('auth_password_reset_update_failed', {
        error_code: error.code || null,
      })
      return false
    }
    setRecoverySessionVerified(false)
    captureEvent('auth_password_reset_completed')
    return true
  }

  const finishPasswordRecovery = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    const url = new URL(window.location.href)
    url.searchParams.delete('auth')
    window.history.replaceState(window.history.state, '', url.pathname + url.search)
    setIsPasswordRecovery(false)
    setRecoverySessionVerified(false)
    setObservabilityUser(null)
  }

  const signOut = async () => {
    await releasePushForSignOut()
    await supabase.auth.signOut()
    setObservabilityUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        resendSignupEmail,
        signInWithGoogle,
        googleAuthFailure,
        clearGoogleAuthFailure,
        signOut,
        isPasswordRecovery,
        recoverySessionVerified,
        requestPasswordReset,
        changePassword,
        finishPasswordRecovery,
      }}
    >
      {authBootstrapError && loading ? (
        <div className="min-h-screen bg-[#FAF8F5] text-[#204E4A] flex flex-col items-center justify-center gap-4 px-6">
          <p role="alert" className="text-sm font-bold text-center">
            No pudimos comprobar tu sesión. Tu cuenta no se ha modificado.
          </p>
          <button type="button" onClick={() => setAuthBootstrapRetry((attempt) => attempt + 1)}
            className="rounded-full bg-[#204E4A] px-6 py-3 font-bold text-white cursor-pointer focus-visible:bg-[#356D67]">
            Reintentar
          </button>
        </div>
      ) : adultAttestationPending && !savingAttestation ? (
        <GoogleAdultGate onConfirm={saveAdultAttestation} onDecline={signOut}/>
      ) : user && !isPasswordRecovery && (profileStatus?.userId !== user.id || profileStatus.status === 'loading') ? (
        <div role="status" className="min-h-screen bg-[#FAF8F5] text-[#204E4A] flex items-center justify-center px-6">
          <p className="font-bold text-sm">Preparando tu cuenta…</p>
        </div>
      ) : user && !isPasswordRecovery && profileStatus?.status === 'error' ? (
        <div className="min-h-screen bg-[#FAF8F5] text-[#204E4A] flex flex-col items-center justify-center gap-3 px-6">
          <p role="alert" className="font-bold text-sm text-center">No pudimos preparar tu cuenta. Tu sesión sigue guardada.</p>
          <button type="button" onClick={() => setProfileRetry((value) => value + 1)}
            className="rounded-full bg-[#204E4A] text-white px-6 py-3 font-bold cursor-pointer">Reintentar</button>
          <button type="button" onClick={() => void signOut()}
            className="rounded-full bg-[#E1E53F] text-[#204E4A] px-6 py-3 font-bold cursor-pointer">Cerrar sesión</button>
        </div>
      ) : children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}

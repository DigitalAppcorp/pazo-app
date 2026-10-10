import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../services/supabaseClient'
import { ensureOwnAccountProfile } from '../features/auth/ensureOwnAccountProfile'
import { classifySignUpResult, type SignUpOutcome } from '../features/auth/signupFlow'
import { isRecoveryReturn, isVerifiedRecoverySession, recoveryRedirectUrl } from '../features/auth/recoveryFlow'
import {
  captureEvent,
  setObservabilityUser,
} from '../services/observability'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<SignUpOutcome>
  signIn: (email: string, password: string) => Promise<boolean>
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
  const [profileStatus, setProfileStatus] = useState<{ userId: string; status: 'loading' | 'ready' | 'error' } | null>(null)
  const [profileRetry, setProfileRetry] = useState(0)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(
    () => isRecoveryReturn(window.location.search)
  )
  // A query string is only a UI marker, NOT proof that the recovery link
  // created a session. Supabase must emit PASSWORD_RECOVERY first.
  const [recoverySessionVerified, setRecoverySessionVerified] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      setObservabilityUser(nextUser?.id ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null

      if (event === 'PASSWORD_RECOVERY' && session?.user) {
        setIsPasswordRecovery(true)
        setRecoverySessionVerified(true)
      }

      if (event === 'SIGNED_OUT') {
        setRecoverySessionVerified(false)
        captureEvent('auth_session_signed_out')
      }

      setUser(nextUser)
      setObservabilityUser(nextUser?.id ?? null)
      setLoading(false)

      if (event === 'SIGNED_IN') {
        captureEvent('auth_session_signed_in')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Auth identities can survive a prelaunch fixture reset even if profiles do not.
  // Keep the application behind a reversible bootstrap gate until the server restores
  // the minimal profile owned by the signed-in account.
  useEffect(() => {
    if (!user?.id) {
      setProfileStatus(null)
      return
    }

    let cancelled = false
    const userId = user.id
    setProfileStatus({ userId, status: 'loading' })

    void ensureOwnAccountProfile()
      .then(() => {
        if (!cancelled) setProfileStatus({ userId, status: 'ready' })
      })
      .catch((error) => {
        console.error('Could not initialize account profile:', error)
        if (!cancelled) setProfileStatus({ userId, status: 'error' })
      })

    return () => { cancelled = true }
  }, [user?.id, profileRetry])

  const signUp = async (email: string, password: string): Promise<SignUpOutcome> => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    const outcome = classifySignUpResult(error, data?.session)

    if (error) {
      captureEvent('auth_signup_failed', {
        error_code: error.code || null,
      })
      alert(`Error: ${error.message}`)
      return 'failed'
    }

    captureEvent('auth_signup_succeeded')
    return outcome
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      captureEvent('auth_signin_failed', {
        error_code: error.code || null,
      })
      alert(`Error al iniciar sesión: ${error.message}`)
      return false
    }

    captureEvent('auth_signin_succeeded')
    return true
  }

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
        signOut,
        isPasswordRecovery,
        recoverySessionVerified,
        requestPasswordReset,
        changePassword,
        finishPasswordRecovery,
      }}
    >
      {user && !isPasswordRecovery && (profileStatus?.userId !== user.id || profileStatus.status === 'loading') ? (
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

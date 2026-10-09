import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../services/supabaseClient'
import { classifySignUpResult, type SignUpOutcome } from '../features/auth/signupFlow'
import { isRecoveryReturn, recoveryRedirectUrl } from '../features/auth/recoveryFlow'
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
  requestPasswordReset: (email: string) => Promise<boolean>
  changePassword: (password: string) => Promise<boolean>
  finishPasswordRecovery: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(
    () => isRecoveryReturn(window.location.search)
  )

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

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true)
      }

      if (event === 'SIGNED_OUT') {
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
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      captureEvent('auth_password_reset_update_failed', {
        error_code: error.code || null,
      })
      return false
    }
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
        requestPasswordReset,
        changePassword,
        finishPasswordRecovery,
      }}
    >
      {children}
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

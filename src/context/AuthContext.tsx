import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../services/supabaseClient'
import {
  captureEvent,
  setObservabilityUser,
} from '../services/observability'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<boolean>
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

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

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      captureEvent('auth_signup_failed', {
        error_code: error.code || null,
      })
      alert(`Error: ${error.message}`)
      return false
    }

    captureEvent('auth_signup_succeeded')
    return true
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

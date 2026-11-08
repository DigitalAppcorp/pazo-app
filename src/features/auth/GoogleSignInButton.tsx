import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { requestSignupPushPermission } from '../push/pushService'

interface Props {
  lang: 'es' | 'en'
  // Signup confirms 18+ here; it returns false to stop before leaving PAZO.
  confirmAdult?: () => boolean
}

const GoogleMark = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48" className="shrink-0">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.9-6.9C35.9 2.4 30.5 0 24 0 14.6 0 6.5 5.4 2.6 13.2l8 6.2C12.5 13.7 17.8 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.1 5.5c4.2-3.9 7.2-9.6 7.2-17z"/>
    <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-8-6.2C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.2z"/>
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2.1 1.4-4.9 2.3-8.8 2.3-6.2 0-11.5-4.2-13.4-9.9l-8 6.2C6.5 42.6 14.6 48 24 48z"/>
  </svg>
)

export function GoogleSignInButton({ lang, confirmAdult }: Props) {
  const { signInWithGoogle, googleAuthFailure, clearGoogleAuthFailure } = useAuth()
  const [starting, setStarting] = useState(false)
  const [startFailed, setStartFailed] = useState(false)

  // Coming back from Google with the browser's Back button restores this page.
  useEffect(() => {
    const reset = () => setStarting(false)
    window.addEventListener('pageshow', reset)
    return () => window.removeEventListener('pageshow', reset)
  }, [])

  const start = async () => {
    if (starting) return
    const adultConfirmed = confirmAdult ? confirmAdult() : false
    if (confirmAdult && !adultConfirmed) return
    clearGoogleAuthFailure()
    setStartFailed(false)
    setStarting(true)
    const permission = confirmAdult ? requestSignupPushPermission() : undefined
    if (permission) {
      // Give the native prompt time to resolve before navigating away to Google.
      // A quiet or ignored prompt cannot hold up sign-in indefinitely.
      let timeout: number | undefined
      try {
        await Promise.race([permission, new Promise<void>(resolve => {
          timeout = window.setTimeout(resolve, 5000)
        })])
      } finally {
        window.clearTimeout(timeout)
      }
    }
    if (!(await signInWithGoogle(adultConfirmed))) {
      setStarting(false)
      setStartFailed(true)
    }
  }

  const message = googleAuthFailure === 'cancelled'
    ? (lang === 'es'
      ? 'Cancelaste el acceso con Google. Puedes intentarlo de nuevo.'
      : 'You cancelled Google sign-in. You can try again.')
    : startFailed || googleAuthFailure === 'failed'
      ? (lang === 'es'
        ? 'No pudimos continuar con Google. Inténtalo de nuevo o usa tu correo.'
        : 'We could not continue with Google. Try again or use your email.')
      : ''

  return (
    <div className="space-y-2">
      <button type="button" onClick={() => void start()} disabled={starting} aria-busy={starting}
        className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-full bg-white px-4 py-2.5 text-[14px] font-extrabold text-[#204E4A] shadow-[0_4px_14px_rgba(32,78,74,0.08)] hover:bg-[#F0F2E8] focus-visible:bg-[#E1E53F]/40 disabled:opacity-60">
        <GoogleMark/>
        <span>
          {starting
            ? (lang === 'es' ? 'Abriendo Google…' : 'Opening Google…')
            : (lang === 'es' ? 'Continuar con Google' : 'Continue with Google')}
        </span>
      </button>
      {message && (
        <p role="alert" className="text-center text-[13px] font-semibold leading-snug text-[#204E4A]">{message}</p>
      )}
    </div>
  )
}

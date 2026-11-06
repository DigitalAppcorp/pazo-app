import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

// Re-engagement point 2: one tap sends the confirmation link again, with a pause between sends.
const COOLDOWN_SECONDS = 60

export function ResendConfirmationButton({ email, lang }: { email: string; lang: 'es' | 'en' }) {
  const { resendSignupEmail } = useAuth()
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [wait, setWait] = useState(0)
  const l = (es: string, en: string) => (lang === 'es' ? es : en)

  useEffect(() => {
    if (wait <= 0) return
    const timer = window.setTimeout(() => setWait((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [wait])

  const send = async () => {
    if (!email.trim() || state === 'sending' || wait > 0) return
    setState('sending')
    try {
      const ok = await resendSignupEmail(email.trim())
      setState(ok ? 'sent' : 'failed')
    } catch {
      setState('failed')
    } finally {
      setWait(COOLDOWN_SECONDS)
    }
  }

  return (
    <div className="space-y-1.5">
      <button type="button" onClick={() => void send()} disabled={state === 'sending' || wait > 0 || !email.trim()}
        className="w-full rounded-full bg-white py-3 text-xs font-extrabold text-[#204E4A] shadow-[0_4px_14px_rgba(32,78,74,0.08)] transition-colors hover:bg-[#F3F6EA] focus-visible:bg-[#E1E53F] disabled:opacity-60 cursor-pointer">
        {state === 'sending'
          ? l('Enviando…', 'Sending…')
          : wait > 0
            ? l(`Reenviar correo (${wait} s)`, `Resend email (${wait}s)`)
            : l('Reenviar correo de confirmación', 'Resend confirmation email')}
      </button>
      {state === 'sent' && <p role="status" className="text-center text-[12px] font-semibold text-[#204E4A]">{l('Solicitud recibida. Revisa tu bandeja de entrada y spam.', 'Request received. Check your inbox and spam.')}</p>}
      {state === 'failed' && <p role="status" className="text-center text-[12px] font-semibold text-[#5C7470]">{l('No pudimos reenviarlo ahora. Espera un momento e inténtalo otra vez.', "We couldn't resend it now. Wait a moment and try again.")}</p>}
    </div>
  )
}

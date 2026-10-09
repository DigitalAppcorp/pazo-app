import { useState, type FormEvent } from 'react'
import { isValidPazoPassword } from './recoveryFlow'

interface PasswordRecoveryViewProps {
  lang: 'es' | 'en'
  sessionReady: boolean
  onUpdatePassword: (password: string) => Promise<boolean>
  onExit: () => Promise<void>
}

export const PasswordRecoveryView = ({
  lang, sessionReady, onUpdatePassword, onExit,
}: PasswordRecoveryViewProps) => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return
    if (!isValidPazoPassword(password)) {
      setMessage(lang === 'es'
        ? 'Usa al menos 8 caracteres, una mayúscula, una minúscula y un número.'
        : 'Use at least 8 characters with uppercase, lowercase and a number.')
      return
    }
    if (password !== confirmPassword) {
      setMessage(lang === 'es' ? 'Las contraseñas no coinciden.' : 'Passwords do not match.')
      return
    }
    setMessage('')
    setSubmitting(true)
    try {
      if (await onUpdatePassword(password)) {
        setPassword('')
        setConfirmPassword('')
        setCompleted(true)
      } else {
        setMessage(lang === 'es'
          ? 'No se pudo actualizar la contraseña. Solicita otro enlace e inténtalo nuevamente.'
          : 'Password update failed. Request another link and try again.')
      }
    } catch {
      setMessage(lang === 'es'
        ? 'No hay conexión. Inténtalo nuevamente.'
        : 'Connection error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const exit = async () => {
    if (exiting || submitting) return
    setExiting(true)
    setMessage('')
    try {
      await onExit()
    } catch {
      setMessage(lang === 'es'
        ? 'No se pudo cerrar la sesión. Inténtalo nuevamente.'
        : 'Could not sign out. Please try again.')
    } finally {
      setExiting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#EFECE4] text-[#204E4A] flex items-center justify-center p-4">
      <main className="bg-white w-full max-w-sm rounded-[2rem] shadow-xl p-6 sm:p-8 space-y-5">
        <div className="space-y-2">
          <span className="font-black text-2xl tracking-tighter">pazo.</span>
          <h1 className="text-2xl font-black">
            {completed
              ? (lang === 'es' ? 'Contraseña actualizada' : 'Password updated')
              : (lang === 'es' ? 'Recuperar contraseña' : 'Reset your password')}
          </h1>
          <p className="text-sm text-[#5C7470]">
            {completed
              ? (lang === 'es' ? 'Ya puedes entrar con tu nueva contraseña.' : 'You can now sign in with your new password.')
              : !sessionReady
                ? (lang === 'es' ? 'El enlace no tiene una sesión válida o ha caducado. Solicita uno nuevo desde Iniciar sesión.' : 'Your link is invalid or expired. Request a new one from Log in.')
                : (lang === 'es' ? 'Escribe una nueva contraseña para tu cuenta.' : 'Enter a new password for your account.')}
          </p>
        </div>
        {sessionReady && !completed && (
          <form onSubmit={(event) => void submit(event)} className="space-y-3">
            <label className="block text-xs font-bold">
              {lang === 'es' ? 'Nueva contraseña' : 'New password'}
              <input type="password" required minLength={8} autoComplete="new-password"
                value={password} onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full bg-[#FAF8F5] rounded-xl px-4 py-3 text-sm" />
            </label>
            <label className="block text-xs font-bold">
              {lang === 'es' ? 'Confirmar contraseña' : 'Confirm password'}
              <input type="password" required minLength={8} autoComplete="new-password"
                value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-1 w-full bg-[#FAF8F5] rounded-xl px-4 py-3 text-sm" />
            </label>
            <button type="submit" disabled={submitting}
              className="w-full rounded-full bg-[#204E4A] text-white py-3 text-sm font-extrabold disabled:opacity-50">
              {submitting
                ? (lang === 'es' ? 'Guardando...' : 'Saving...')
                : (lang === 'es' ? 'Actualizar contraseña' : 'Update password')}
            </button>
          </form>
        )}
        {message && <p role="alert" className="text-xs text-red-700">{message}</p>}
        <button type="button" onClick={() => void exit()} disabled={exiting || submitting}
          className="w-full rounded-full border border-[#204E4A]/20 py-3 text-sm font-bold disabled:opacity-50">
          {completed
            ? (lang === 'es' ? 'Ir a iniciar sesión' : 'Go to log in')
            : (lang === 'es' ? 'Volver a iniciar sesión' : 'Back to log in')}
        </button>
      </main>
    </div>
  )
}

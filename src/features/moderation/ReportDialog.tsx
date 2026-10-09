import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { submitReport, type ReportReason, type ReportTarget } from './reportingService'

interface Props {
  target: { kind: ReportTarget; id: string; label?: string }
  onClose: () => void
  lang: 'es' | 'en'
}

const reasons: { value: ReportReason; es: string; en: string }[] = [
  { value: 'spam', es: 'Spam o publicidad engañosa', en: 'Spam or misleading advertising' },
  { value: 'harassment', es: 'Acoso', en: 'Harassment' },
  { value: 'unsafe', es: 'Contenido dañino o inapropiado', en: 'Harmful or inappropriate content' },
  { value: 'other', es: 'Otro motivo', en: 'Other reason' },
]

export function ReportDialog({ target, onClose, lang }: Props) {
  const [reason, setReason] = useState<ReportReason>('spam')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogPanelRef = useRef<HTMLDivElement>(null)
  const busyRef = useRef(busy)
  busyRef.current = busy

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) {
        event.preventDefault()
        onClose()
      }
      if (event.key !== 'Tab') return
      const focusable = dialogPanelRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [onClose])

  const es = lang === 'es'
  const typeLabel: Record<ReportTarget, [string, string]> = {
    feed_post: ['Publicación', 'Feed post'],
    feed_comment: ['Comentario', 'Feed comment'],
    pet_profile: ['Perfil de mascota', 'Pet profile'],
    community_post: ['Publicación de comunidad', 'Community post'],
    community_comment: ['Comentario de comunidad', 'Community comment'],
  }
  const subjectLabel = target.label?.trim() || typeLabel[target.kind][es ? 0 : 1]

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await submitReport(target.kind, target.id, reason, details)
      setSent(true)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : ''
      setError(message.includes('already pending')
        ? (es ? 'Ya existe una denuncia pendiente sobre este contenido.' : 'You already reported this content.')
        : message.includes('limit')
          ? (es ? 'Has alcanzado el límite temporal de denuncias.' : 'Report limit reached.')
          : (es ? 'No se pudo enviar. Intenta más tarde.' : 'Could not submit your report.'))
    } finally {
      setBusy(false)
    }
  }

  // Portal escapes the animated, scrollable Feed/Community ancestors. A CSS transform
  // on any ancestor otherwise changes the containing block of position: fixed.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={es ? 'Denunciar contenido' : 'Report content'}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/55 p-4">
      <div ref={dialogPanelRef} className="w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-[1.8rem] bg-[#FAF8F5] p-5 shadow-xl text-[#204E4A]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-black">{sent ? (es ? 'Denuncia recibida' : 'Report received') : (es ? 'Enviar denuncia' : 'Submit report')}</h2>
        <button ref={closeButtonRef} type="button" disabled={busy} onClick={onClose} className="min-h-11 rounded-xl px-3 font-bold text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#204E4A] disabled:opacity-50">{es ? 'Cerrar' : 'Close'}</button>
      </div>
      <p className="mt-3 rounded-xl bg-[#204E4A]/[0.06] px-3 py-2 text-xs font-semibold leading-relaxed" aria-label={es ? 'Contenido seleccionado' : 'Selected content'}>
        {es ? 'Contenido: ' : 'Content: '}{subjectLabel}
      </p>
      {sent ? <div role="status" className="mt-5 space-y-3">
        <p className="text-sm">{es ? 'Denuncia recibida. Un moderador podrá revisarla.' : 'Report received for moderation review.'}</p>
        <button type="button" onClick={onClose} className="rounded-full bg-[#204E4A] px-4 py-2 font-bold text-white">{es ? 'Aceptar' : 'OK'}</button>
      </div> : <form className="mt-4 space-y-4" onSubmit={send}>
        <label className="block text-xs font-bold">{es ? 'Motivo' : 'Reason'}
          <select value={reason} onChange={e => setReason(e.target.value as ReportReason)}
            className="mt-2 block w-full rounded-xl border border-[#204E4A]/20 bg-white p-3">
            {reasons.map(r => <option key={r.value} value={r.value}>{es ? r.es : r.en}</option>)}
          </select>
        </label>
        <label className="block text-xs font-bold">{es ? 'Detalles opcionales' : 'Optional details'}
          <textarea value={details} onChange={e => setDetails(e.target.value)} maxLength={500} rows={3}
            className="mt-2 block w-full rounded-xl border border-[#204E4A]/20 bg-white p-3"
            placeholder={es ? 'Describe el problema sin incluir información privada.' : 'Describe the issue without personal information.'} />
        </label>
        {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-full bg-[#204E4A] px-4 py-3 text-sm font-bold text-white disabled:opacity-40">
          {busy ? (es ? 'Enviando...' : 'Sending...') : (es ? 'Enviar denuncia' : 'Send report')}
        </button>
      </form>}
      </div>
    </div>,
    document.body
  )
}

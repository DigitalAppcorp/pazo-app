import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getModerationQueue, reviewReport, type PendingReport } from './reportingService'
import { reportTargetShortId } from './reportSubject'

interface Props { lang: 'es' | 'en'; onClose: () => void }
const PAGE = 20

export function ModeratorQueue({ lang, onClose }: Props) {
  const es = lang === 'es'
  const [reports, setReports] = useState<PendingReport[]>([])
  const [offset, setOffset] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const priorFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
      if (event.key !== 'Tab') return
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
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
      priorFocus?.focus()
    }
  }, [onClose])
  const load = useCallback(async (nextOffset: number) => {
    setBusy(true); setError('')
    try {
      const next = await getModerationQueue(nextOffset)
      setReports(next); setOffset(nextOffset)
    } catch { setError(es ? 'No se pudo cargar la cola. Verifica tus permisos.' : 'Cannot load queue or permissions.') }
    finally { setBusy(false) }
  }, [es])
  useEffect(() => { void load(0) }, [load])

  const review = async (report: PendingReport, action: 'dismiss' | 'remove') => {
    const explanation = action === 'remove'
      ? (es ? 'Retirar de la lectura pública. La limpieza de medios públicos se revisa por separado. ¿Continuar?' : 'Hide content from public reads. Public media requires separate cleanup. Continue?')
      : (es ? '¿Descartar esta denuncia?' : 'Dismiss this report?')
    const targetLabel = `${report.target_kind} · ${reportTargetShortId(report.target_id)}`
    if (!window.confirm(`${explanation}\n\n${es ? 'Objetivo' : 'Target'}: ${targetLabel}`)) return
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await reviewReport(report.id, action)
      setMessage(result === 'depublished_pending_media_review'
        ? (es ? 'Contenido despublicado. Revisión de archivos pendiente.' : 'Content depublished; media review pending.')
        : result === 'depublished_no_media_review'
          ? (es ? 'Contenido despublicado. No hay archivos adjuntos que revisar.' : 'Content depublished. No attached media to review.')
          : result === 'dismissed'
            ? (es ? 'Denuncia descartada.' : 'Report dismissed.')
            : (es ? 'Decisión registrada. Comprueba el estado de la cola.' : 'Decision recorded. Check the queue status.'))
      await load(0)
    } catch { setError(es ? 'No se pudo registrar la decisión.' : 'Failed to save moderation decision.') }
    finally { setBusy(false) }
  }

  // The safety view lives inside an animated, scrollable app container.
  // A body portal avoids clipping/offset when opened on a mobile device.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={es ? 'Cola de moderación' : 'Moderation queue'}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-3 sm:p-6">
      <section ref={panelRef} className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-[2rem] bg-[#FAF8F5] p-5 text-[#204E4A] shadow-xl">
    <header className="mb-5 flex items-center justify-between gap-3">
      <h2 className="text-xl font-black">{es ? 'Denuncias pendientes' : 'Pending reports'}</h2>
      <button ref={closeRef} type="button" onClick={onClose} className="min-h-11 rounded-xl px-3 text-sm font-bold">{es ? 'Cerrar' : 'Close'}</button>
    </header>
    {error && <p role="alert" className="my-3 text-xs text-red-700">{error}</p>}
    {message && <p role="status" className="my-3 text-xs">{message}</p>}
    {!reports.length && !busy && <p className="text-sm">{es ? 'No hay denuncias en esta página.' : 'No pending reports on this page.'}</p>}
    <div className="space-y-3">
      {reports.map(report => <article key={report.id} className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-xs font-bold">{({
          feed_post: es ? 'Publicación del Feed' : 'Feed post',
          feed_comment: es ? 'Comentario del Feed' : 'Feed comment',
          pet_profile: es ? 'Perfil de mascota' : 'Pet profile',
          community_post: es ? 'Publicación de comunidad' : 'Community post',
          community_comment: es ? 'Comentario de comunidad' : 'Community comment',
        })[report.target_kind] ?? report.target_kind} · {({
          spam: es ? 'Spam o publicidad engañosa' : 'Spam',
          harassment: es ? 'Acoso' : 'Harassment',
          unsafe: es ? 'Contenido dañino' : 'Harmful content',
          other: es ? 'Otro motivo' : 'Other',
        })[report.reason] ?? report.reason}</p>
        <p className="mt-1 break-all text-[10px] text-[#5C7470]">{report.target_id}</p>
        {report.details && <p className="mt-2 whitespace-pre-wrap text-xs">{report.details}</p>}
        <p className="mt-2 text-[10px] text-[#5C7470]">{new Date(report.created_at).toLocaleString()}</p>
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={busy} onClick={() => void review(report,'dismiss')} className="rounded-full px-3 py-2 text-xs font-bold">{es ? 'Descartar' : 'Dismiss'}</button>
          <button type="button" disabled={busy} onClick={() => void review(report,'remove')} className="rounded-full bg-[#204E4A] px-3 py-2 text-xs font-bold text-white">{es ? 'Despublicar' : 'Depublish'}</button>
        </div>
      </article>)}
    </div>
    <div className="mt-5 flex gap-2">
      <button type="button" disabled={busy || offset === 0} onClick={() => void load(Math.max(0,offset-PAGE))} className="rounded-xl bg-white px-3 py-2 text-xs font-bold disabled:opacity-40">{es ? 'Anterior' : 'Previous'}</button>
      <button type="button" disabled={busy || reports.length<PAGE} onClick={() => void load(offset+PAGE)} className="rounded-xl bg-white px-3 py-2 text-xs font-bold disabled:opacity-40">{es ? 'Siguiente' : 'Next'}</button>
    </div>
      </section>
    </div>,
    document.body
  )
}

import { useCallback, useEffect, useState } from 'react'
import { getModerationQueue, reviewReport, type PendingReport } from './reportingService'

interface Props { lang: 'es' | 'en'; onClose: () => void }
const PAGE = 20

export function ModeratorQueue({ lang, onClose }: Props) {
  const es = lang === 'es'
  const [reports, setReports] = useState<PendingReport[]>([])
  const [offset, setOffset] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
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
    if (!window.confirm(explanation)) return
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await reviewReport(report.id, action)
      setMessage(result === 'depublished_pending_media_review'
        ? (es ? 'Contenido despublicado. Revisión de archivos pendiente.' : 'Content depublished; media review pending.')
        : (es ? 'Denuncia descartada.' : 'Report dismissed.'))
      await load(0)
    } catch { setError(es ? 'No se pudo registrar la decisión.' : 'Failed to save moderation decision.') }
    finally { setBusy(false) }
  }

  return <div role="dialog" aria-modal="true" aria-label={es ? 'Cola de moderación' : 'Moderation queue'}
    className="absolute inset-0 z-[200] overflow-y-auto bg-[#FAF8F5] p-5 text-[#204E4A]">
    <header className="mb-5 flex items-center justify-between gap-3">
      <h2 className="text-xl font-black">{es ? 'Denuncias pendientes' : 'Pending reports'}</h2>
      <button type="button" onClick={onClose} className="text-sm font-bold">{es ? 'Cerrar' : 'Close'}</button>
    </header>
    {error && <p role="alert" className="my-3 text-xs text-red-700">{error}</p>}
    {message && <p role="status" className="my-3 text-xs">{message}</p>}
    {!reports.length && !busy && <p className="text-sm">{es ? 'No hay denuncias en esta página.' : 'No pending reports on this page.'}</p>}
    <div className="space-y-3">
      {reports.map(report => <article key={report.id} className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-xs font-bold">{report.target_kind.replaceAll('_',' ')} · {report.reason}</p>
        <p className="mt-1 break-all text-[10px] text-[#5C7470]">{report.target_id}</p>
        {report.details && <p className="mt-2 whitespace-pre-wrap text-xs">{report.details}</p>}
        <p className="mt-2 text-[10px] text-[#5C7470]">{new Date(report.created_at).toLocaleString()}</p>
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={busy} onClick={() => void review(report,'dismiss')} className="rounded-full border border-[#204E4A]/20 px-3 py-2 text-xs font-bold">{es ? 'Descartar' : 'Dismiss'}</button>
          <button type="button" disabled={busy} onClick={() => void review(report,'remove')} className="rounded-full bg-[#204E4A] px-3 py-2 text-xs font-bold text-white">{es ? 'Despublicar' : 'Depublish'}</button>
        </div>
      </article>)}
    </div>
    <div className="mt-5 flex gap-2">
      <button type="button" disabled={busy || offset === 0} onClick={() => void load(Math.max(0,offset-PAGE))} className="rounded-xl bg-white px-3 py-2 text-xs font-bold disabled:opacity-40">{es ? 'Anterior' : 'Previous'}</button>
      <button type="button" disabled={busy || reports.length<PAGE} onClick={() => void load(offset+PAGE)} className="rounded-xl bg-white px-3 py-2 text-xs font-bold disabled:opacity-40">{es ? 'Siguiente' : 'Next'}</button>
    </div>
  </div>
}

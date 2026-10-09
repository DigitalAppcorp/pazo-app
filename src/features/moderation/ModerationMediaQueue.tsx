import { useCallback, useEffect, useState } from 'react'
import { getPendingModerationMedia, type PendingMedia } from './reportingService'

interface Props { lang: 'es' | 'en'; onClose: () => void }

// F14 A2: fail-closed review of content that has already been depublished.
// No delete button while the exact-object/Storage CDN gate remains unresolved.
// The only mutation of this view is refreshing the moderator's read-only queue.
export function ModerationMediaQueue({ lang, onClose }: Props) {
  const es = lang === 'es'
  const [items, setItems] = useState<PendingMedia[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try { setItems(await getPendingModerationMedia()) }
    catch { setError(es ? 'No se pudo consultar la cola de revisión.' : 'Could not load the review queue.') }
    finally { setBusy(false) }
  }, [es])
  useEffect(() => { void load() }, [load])

  return <div role="dialog" aria-modal="true" aria-label={es ? 'Revisión de archivos' : 'Media review'}
    className="absolute inset-0 z-[210] overflow-y-auto bg-[#FAF8F5] p-5 text-[#204E4A]">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-xl font-black">{es ? 'Revisión de archivos' : 'Media review'}</h2>
      <button type="button" className="text-xs font-bold" onClick={onClose}>{es ? 'Cerrar' : 'Close'}</button>
    </div>
    <p className="my-4 text-xs text-[#5C7470]">
      {es
        ? 'El contenido denunciado y retirado no aparece en las lecturas públicas de PAZO. Las fotos pueden seguir accesibles mediante enlaces públicos guardados. La eliminación de Storage permanece desactivada hasta completar las verificaciones de seguridad.'
        : 'Removed content is excluded from PAZO public reads. Photos may remain accessible through previously known public URLs. Storage deletion remains disabled pending security checks.'}
    </p>
    <p className="mb-4 text-xs font-semibold text-[#204E4A]">
      {es
        ? 'Estos casos requieren revisión administrativa; aparecer aquí no confirma que se haya eliminado un archivo.'
        : 'These cases require administrative review; appearing here does not mean a file was deleted.'}
    </p>
    {error && <p role="alert" className="my-2 text-xs text-red-700">{error}</p>}
    {!items.length && !busy && !error && <p className="text-xs">{es ? 'No hay medios pendientes de revisión.' : 'No pending media reviews.'}</p>}
    <div aria-busy={busy} className="space-y-2">
      {items.map(item => <article key={item.target_kind + item.target_id} className="rounded-xl bg-white p-3">
        <p className="text-xs font-bold">{item.target_kind.replaceAll('_', ' ')}</p>
        <p className="my-1 break-all text-[10px] text-[#5C7470]">{item.target_id}</p>
        <p className="text-xs text-[#5C7470]">
          {es ? 'Revisión manual pendiente; no se ha confirmado eliminación en Storage ni en CDN.' : 'Manual review pending; no Storage or CDN deletion has been confirmed.'}
        </p>
      </article>)}
    </div>
    <button type="button" disabled={busy} onClick={() => void load()}
      className="mt-4 rounded-full border border-[#204E4A]/25 bg-white px-4 py-2 text-xs font-bold disabled:opacity-40">
      {es ? 'Actualizar estado' : 'Refresh status'}
    </button>
  </div>
}

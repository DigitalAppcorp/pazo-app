import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getPendingModerationMedia, purgeModerationMedia, type PendingMedia } from './reportingService'

interface Props { lang: 'es' | 'en'; onClose: () => void }

// Read-only queue. No destructive action until exact-object and CDN gates pass.
export function ModerationMediaQueue({ lang, onClose }: Props) {
  const es = lang === 'es'
  const [items, setItems] = useState<PendingMedia[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const enablePurge = import.meta.env.VITE_F14_MEDIA_PURGE_ENABLED === 'true'
  const closeRef = useRef<HTMLButtonElement>(null)
  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try { setItems(await getPendingModerationMedia()) }
    catch { setError(es ? 'No se pudo consultar la cola de revisión.' : 'Could not load the review queue.') }
    finally { setBusy(false) }
  }, [es])
  useEffect(() => { void load() }, [load])
  const purge = async(item: PendingMedia) => {
    if (!enablePurge || busy || !['feed_post','community_post'].includes(item.target_kind)) return
    const label = item.target_kind + ' · ' + item.target_id.slice(-8)
    const confirmText = es
      ? 'Eliminar DEFINITIVAMENTE del origen Storage la imagen del contenido retirado ' + label + '? Esta acción no se puede deshacer.'
      : 'Permanently delete the Storage origin image for removed content ' + label + '? This cannot be undone.'
    if (!window.confirm(confirmText)) return
    setBusy(true); setError(''); setMessage('')
    try {
      await purgeModerationMedia(item)
      setMessage(es
        ? 'Archivo eliminado del origen. La disponibilidad en cachés CDN externas requiere validación final.'
        : 'File removed from origin. CDN cache visibility still needs final verification.')
      await load()
    } catch {
      setError(es
        ? 'Retirada no confirmada. El archivo sigue pendiente de revisión; verifica permisos, origen y caché.'
        : 'Deletion not confirmed. Media remains pending review; verify permissions, origin and cache.')
    } finally { setBusy(false) }
  }

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); previousFocus?.focus() }
  }, [onClose])

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={es ? 'Revisión de archivos' : 'Media review'}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-3 sm:p-6">
      <section className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[2rem] bg-[#FAF8F5] p-5 text-[#204E4A] shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-black">{es ? 'Revisión de archivos' : 'Media review'}</h2>
          <button ref={closeRef} type="button" className="rounded-xl bg-white px-4 py-3 text-xs font-bold" onClick={onClose}>{es ? 'Cerrar' : 'Close'}</button>
        </div>
        <p className="my-4 text-xs text-[#5C7470]">
          {es
            ? 'El contenido retirado no aparece en las lecturas públicas de PAZO. Las fotos pueden seguir accesibles mediante enlaces públicos guardados. La eliminación de Storage continúa desactivada.'
            : 'Removed content is hidden from PAZO public reads. Photos may remain accessible by known public URLs. Storage deletion remains disabled.'}
        </p>
        {message && <p role="status" className="my-2 text-xs text-[#204E4A]">{message}</p>}
        {error && <p role="alert" className="my-2 text-xs text-red-700">{error}</p>}
        {!items.length && !busy && !error && <p className="text-xs">{es ? 'No hay medios pendientes de revisión.' : 'No pending media reviews.'}</p>}
        <div aria-busy={busy} className="space-y-2">
          {items.map(item => <article key={item.target_kind + item.target_id} className="rounded-xl bg-white p-3">
            <p className="text-xs font-bold">{item.target_kind.replaceAll('_', ' ')}</p>
            <p className="my-1 break-all text-[10px] text-[#5C7470]">{item.target_id}</p>
            <p className="text-xs text-[#5C7470]">
              {es ? 'Revisión manual pendiente: no se ha confirmado eliminación de Storage ni CDN.' : 'Manual review pending: Storage or CDN deletion not confirmed.'}
            </p>
            {enablePurge && (item.target_kind === 'feed_post' || item.target_kind === 'community_post') && (
              <button type="button" disabled={busy} onClick={() => void purge(item)}
                className="mt-2 rounded-full bg-[#204E4A] px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
                {es ? 'Retirar archivo verificado' : 'Remove verified file'}
              </button>
            )}
            {enablePurge && item.target_kind === 'pet_profile' && (
              <p className="mt-2 text-xs text-[#5C7470]">
                {es ? 'Perfil: revisión manual de varios archivos, sin borrado automático.' : 'Profile: manual multi-file review, no automatic deletion.'}
              </p>
            )}
          </article>)}
        </div>
        <button type="button" disabled={busy} onClick={() => void load()}
          className="mt-4 rounded-full bg-white px-4 py-3 text-xs font-bold disabled:opacity-40">
          {busy ? '...' : es ? 'Actualizar estado' : 'Refresh status'}
        </button>
      </section>
    </div>, document.body
  )
}

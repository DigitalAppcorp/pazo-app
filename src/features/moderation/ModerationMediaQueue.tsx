import { useEffect, useState } from 'react'
import { getPendingModerationMedia, purgeModerationMedia, type PendingMedia } from './reportingService'

interface Props { lang: 'es' | 'en'; onClose: () => void }
export function ModerationMediaQueue({ lang, onClose }: Props) {
  const es = lang === 'es'
  const [items, setItems] = useState<PendingMedia[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const load = async () => {
    setBusy(true)
    try { setItems(await getPendingModerationMedia()) }
    catch { setError(es ? 'No se pudo consultar los archivos.' : 'Could not load pending media.') }
    finally { setBusy(false) }
  }
  useEffect(() => { void load() }, [])
  const remove = async (item: PendingMedia) => {
    if (!window.confirm(es ? '¿Solicitar eliminación de la imagen en Storage? No se puede deshacer.' : 'Delete this image from Storage? This cannot be undone.')) return
    setBusy(true); setError(''); setMessage('')
    try {
      await purgeModerationMedia(item.target_kind,item.target_id)
      setMessage(es ? 'Storage aceptó la operación. Verifica la URL y la propagación de CDN.' : 'Storage accepted deletion. Verify URL and CDN propagation.')
      setItems(await getPendingModerationMedia())
    } catch { setError(es ? 'Falló la eliminación o la función aún no está habilitada. El caso sigue pendiente.' : 'Cleanup failed or is not enabled. Item remains pending.') }
    finally { setBusy(false) }
  }
  return <div role="dialog" aria-modal="true" aria-label={es ? 'Medios pendientes' : 'Pending media'}
    className="absolute inset-0 z-[210] overflow-y-auto bg-[#FAF8F5] p-5 text-[#204E4A]">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-xl font-black">{es ? 'Revisión de archivos' : 'Media review'}</h2>
      <button type="button" className="text-xs font-bold" onClick={onClose}>{es ? 'Cerrar' : 'Close'}</button>
    </div>
    <p className="my-4 text-xs text-[#5C7470]">{es ? 'Retirar de la base de datos no elimina automáticamente URLs públicas. Confirma la limpieza de Storage y CDN.' : 'Database withdrawal does not automatically remove public image URLs. Verify Storage and CDN.'}</p>
    {error && <p role="alert" className="my-2 text-xs text-red-700">{error}</p>}
    {message && <p role="status" className="my-2 text-xs">{message}</p>}
    {!items.length && !busy && <p className="text-xs">{es ? 'Sin tareas pendientes.' : 'No pending tasks.'}</p>}
    {items.map(item => <div key={item.target_kind+item.target_id} className="my-2 rounded-xl bg-white p-3">
      <p className="text-xs font-bold">{item.target_kind.replaceAll('_',' ')}</p>
      <p className="my-1 break-all text-[10px] text-[#5C7470]">{item.target_id}</p>
      <button type="button" disabled={busy} onClick={() => void remove(item)} className="rounded-full bg-[#204E4A] px-3 py-2 text-xs font-bold text-white disabled:opacity-40">{es ? 'Revisar y eliminar medio' : 'Review and remove media'}</button>
    </div>)}
    <button type="button" disabled={busy} onClick={() => void load()} className="mt-4 text-xs font-bold underline">{es ? 'Actualizar' : 'Refresh'}</button>
  </div>
}

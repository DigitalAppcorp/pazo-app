import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import { isModerator } from './reportingService'
import { ModeratorQueue } from './ModeratorQueue'
import { ModerationMediaQueue } from './ModerationMediaQueue'
type Props = {
  lang: 'es' | 'en'; ownBlocks: ReadonlySet<string>; hidden: ReadonlySet<string>;
  onUnblock: (id: string) => Promise<void>; onUnhide: (id: string) => Promise<void>; onClose: () => void
}
export function SafetySettings({ lang, ownBlocks, hidden, onUnblock, onUnhide, onClose }: Props) {
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [moderator, setModerator] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const [showMedia, setShowMedia] = useState(false)
  const [error, setError] = useState('')
  const blockIds = [...ownBlocks], postIds = [...hidden]
  useEffect(() => { let live = true; void isModerator().then(ok => { if (live) setModerator(ok) }).catch(() => {}); return () => { live = false } }, [])
  useEffect(() => {
    let alive = true
    const read = async () => {
      const [pets, posts] = await Promise.all([
        blockIds.length ? supabase.from('pets').select('owner_id,name').in('owner_id', blockIds) : Promise.resolve({ data: [], error: null }),
        postIds.length ? supabase.from('posts').select('id,pet_name').in('id', postIds) : Promise.resolve({ data: [], error: null }),
      ])
      if (pets.error) throw pets.error
      if (posts.error) throw posts.error
      if (alive) setLabels(Object.fromEntries([
        ...(pets.data || []).map((p) => [p.owner_id, p.name]),
        ...(posts.data || []).map((p) => [p.id, p.pet_name]),
      ]))
    }
    void read().catch(() => { if (alive) setError('No se pudieron cargar los detalles.') })
    return () => { alive = false }
  }, [blockIds.join(','), postIds.join(',')])
  const run = async (job: () => Promise<void>) => {
    setBusy(true); setError('')
    try { await job() } catch { setError('No se pudo realizar la operación.') }
    finally { setBusy(false) }
  }
  return <div role="dialog" aria-modal="true" aria-label="Seguridad social" className="absolute inset-0 z-[160] bg-[#FDFBF7] overflow-y-auto p-5 text-[#204E4A]">
    <div className="flex justify-between gap-3 mb-6"><h2 className="font-black text-lg">{lang === 'es' ? 'Bloqueos y publicaciones ocultas' : 'Blocked accounts and hidden posts'}</h2><button onClick={onClose} className="font-bold">{lang === 'es' ? 'Cerrar' : 'Close'}</button></div>
    {moderator && <button type="button" onClick={() => setShowQueue(true)} className="mb-4 rounded-full bg-[#204E4A] px-4 py-2 text-xs font-bold text-white">{lang === 'es' ? 'Ver denuncias pendientes' : 'View pending reports'}</button>}
    {showQueue && <ModeratorQueue lang={lang} onClose={() => setShowQueue(false)} />}
    {moderator && <button type="button" onClick={() => setShowMedia(true)} className="ml-2 mb-4 rounded-full bg-white px-4 py-2 text-xs font-bold underline">{lang === 'es' ? 'Archivos pendientes' : 'Pending media'}</button>}
    {showMedia && <ModerationMediaQueue lang={lang} onClose={() => setShowMedia(false)} />}
    {error && <p role="alert" className="text-red-700 mb-4">{error}</p>}
    <h3 className="font-extrabold mb-2">{lang === 'es' ? 'Cuentas bloqueadas por ti' : 'Accounts you blocked'}</h3>
    {!blockIds.length && <p className="text-sm mb-4">{lang === 'es' ? 'Ninguna' : 'None'}</p>}
    {blockIds.map(id => <div key={id} className="rounded-xl bg-white p-3 flex justify-between gap-2 mb-2"><span>{labels[id] || 'Cuenta'}</span><button disabled={busy} onClick={() => void run(() => onUnblock(id))} className="font-bold underline">{lang === 'es' ? 'Desbloquear' : 'Unblock'}</button></div>)}
    <h3 className="font-extrabold mt-6 mb-2">{lang === 'es' ? 'Publicaciones ocultas' : 'Hidden posts'}</h3>
    {!postIds.length && <p className="text-sm">{lang === 'es' ? 'Ninguna' : 'None'}</p>}
    {postIds.map(id => <div key={id} className="rounded-xl bg-white p-3 flex justify-between gap-2 mb-2"><span>{labels[id] || 'Publicación'}</span><button disabled={busy} onClick={() => void run(() => onUnhide(id))} className="font-bold underline">{lang === 'es' ? 'Mostrar' : 'Show'}</button></div>)}
  </div>
}

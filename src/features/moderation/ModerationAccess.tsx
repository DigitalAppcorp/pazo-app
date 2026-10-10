import { useEffect, useState } from 'react'
import { isModerator } from './reportingService'
import { ModeratorQueue } from './ModeratorQueue'
import { ModerationMediaQueue } from './ModerationMediaQueue'

export function ModerationAccess({ enabled, lang }: {enabled: boolean; lang:'es'|'en'}) {
  const [allowed, setAllowed] = useState(false)
  const [screen, setScreen] = useState<'reports'|'media'|null>(null)
  useEffect(() => {
    let live = true
    if (enabled) void isModerator().then(ok => { if (live) setAllowed(ok) }).catch(() => { if (live) setAllowed(false) })
    return () => { live = false }
  }, [enabled])
  if (!enabled || !allowed) return null
  return <section className="rounded-[2rem] bg-white p-4 shadow-sm space-y-2">
    <h3 className="text-xs font-black text-[#204E4A]">{lang === 'es' ? 'Moderación' : 'Moderation'}</h3>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setScreen('reports')} className="rounded-full bg-[#204E4A] px-4 py-3 text-xs font-bold text-white">{lang === 'es' ? 'Denuncias' : 'Reports'}</button>
      <button type="button" onClick={() => setScreen('media')} className="rounded-full bg-[#FAF8F5] px-4 py-3 text-xs font-bold text-[#204E4A]">{lang === 'es' ? 'Medios pendientes' : 'Pending media'}</button>
    </div>
    {screen === 'reports' && <ModeratorQueue lang={lang} onClose={() => setScreen(null)} />}
    {screen === 'media' && <ModerationMediaQueue lang={lang} onClose={() => setScreen(null)} />}
  </section>
}

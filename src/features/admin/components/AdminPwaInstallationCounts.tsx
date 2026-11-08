import { useEffect, useState } from 'react'
import { supabase } from '../../../services/supabaseClient'

type State = { status: 'loading' | 'off' | 'error' } | { status: 'ready'; detected: number; notDetected: number }

export function AdminPwaInstallationCounts({ lang }: { lang: 'es' | 'en' }) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const es = lang === 'es'
  useEffect(() => {
    let active = true
    void Promise.resolve(supabase.rpc('pazo_admin_pwa_installation_counts')).then(({ data, error }) => {
      if (!active) return
      if (!error && data?.enabled === false) setState({ status: 'off' })
      else if (!error && data?.enabled === true && Number.isSafeInteger(data.detected) && data.detected >= 0
        && Number.isSafeInteger(data.not_detected) && data.not_detected >= 0) {
        setState({ status: 'ready', detected: data.detected, notDetected: data.not_detected })
      } else setState({ status: 'error' })
    }).catch(() => { if (active) setState({ status: 'error' }) })
    return () => { active = false }
  }, [])

  return <section aria-labelledby="admin-pwa-counts" className="rounded-[24px] bg-white px-5 py-4 text-[#204E4A]">
    <h2 id="admin-pwa-counts" className="text-base font-black">{es ? 'Instalación de PAZO' : 'PAZO installation'}</h2>
    {state.status === 'ready' ? <>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#EDF3E8] p-3">
          <dt className="text-[13px] font-bold">{es ? 'Con instalación detectada' : 'Installation detected'}</dt>
          <dd className="text-2xl font-black">{state.detected.toLocaleString(lang)}</dd>
        </div>
        <div className="rounded-2xl bg-[#F7F3E8] p-3">
          <dt className="text-[13px] font-bold">{es ? 'Sin instalación detectada' : 'No installation detected'}</dt>
          <dd className="text-2xl font-black">{state.notDetected.toLocaleString(lang)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-[#5C7470]">{es
        ? 'Una vez por cuenta confirmada. Las instalaciones anteriores pueden aparecer al abrir PAZO desde su icono.'
        : 'One count per verified account. Earlier installations can be detected when PAZO is opened from its icon.'}</p>
    </> : <p role="status" className="mt-2 text-sm text-[#5C7470]">
      {state.status === 'loading' ? (es ? 'Cargando…' : 'Loading…')
        : state.status === 'off' ? (es ? 'Sin datos aún' : 'No data yet')
          : (es ? 'No pudimos cargar el conteo.' : 'We could not load the counts.')}
    </p>}
  </section>
}

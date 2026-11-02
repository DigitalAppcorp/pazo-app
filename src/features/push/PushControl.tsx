import { useEffect, useState } from 'react'
import {
  disablePush,
  enablePush,
  fetchPushPreferences,
  readPushEnvironment,
  readPushStatus,
  savePushPreferences,
  type PushPreferences,
} from './pushService'
import type { PushEnvironment } from './pushSupport'

interface PushControlProps {
  lang: 'es' | 'en'
  /** panel: lives in the bell and manages everything. offer: only asks, then disappears. */
  variant: 'panel' | 'offer'
}

const Bell = () => (
  <svg viewBox="0 0 32 32" width="22" height="22" fill="currentColor" aria-hidden="true">
    <path d="M16 4c-5.3 0-9.1 3.8-9.1 9.4v3.9c0 2.2-1 4.4-3 6.2-.9.8-.3 2.5 1.1 2.5h22c1.3 0 2-1.7 1.1-2.5-2-1.8-3-4-3-6.2v-3.9C25.1 7.8 21.3 4 16 4Zm0 25.5c3.1 0 4.8-1.3 5.5-2.5h-11c.8 1.2 2.5 2.5 5.5 2.5Z" />
  </svg>
)

const Notice = ({ title, text }: { title: string; text: string }) => (
  <div className="flex items-start gap-3 rounded-[23px] bg-[#F3F6EA] px-3.5 py-3.5">
    <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#204E4A]"><Bell /></span>
    <span className="min-w-0">
      <span className="block text-[14px] font-extrabold leading-snug text-[#204E4A]">{title}</span>
      <span className="mt-1 block text-[13px] leading-relaxed text-[#5C7470]">{text}</span>
    </span>
  </div>
)

export const PushControl = ({ lang, variant }: PushControlProps) => {
  const es = lang === 'es'
  const [environment, setEnvironment] = useState<PushEnvironment>(() => readPushEnvironment())
  const [active, setActive] = useState<boolean | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [preferences, setPreferences] = useState<PushPreferences | null>(null)

  useEffect(() => {
    let alive = true
    void readPushStatus().then((status) => {
      if (!alive) return
      setActive(status.active)
      setEnabled(status.enabled)
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!active || variant !== 'panel') return
    let alive = true
    void fetchPushPreferences().then((value) => { if (alive) setPreferences(value) }).catch(() => undefined)
    return () => { alive = false }
  }, [active, variant])

  if (environment === 'unsupported' || active === null) return null

  if (environment === 'in-app-browser') {
    return <Notice
      title={es ? 'Abre PAZO en tu navegador' : 'Open PAZO in your browser'}
      text={es ? 'Aquí no llegan avisos. Ábrelo en Safari o Chrome.' : 'Alerts cannot reach you here. Open it in Safari or Chrome.'} />
  }
  if (environment === 'ios-needs-install') {
    return <Notice
      title={es ? 'Recibe avisos en tu iPhone' : 'Get alerts on your iPhone'}
      text={es ? 'En Safari: Compartir → Añadir a pantalla de inicio. Luego abre PAZO desde ahí.' : 'In Safari: Share → Add to Home Screen. Then open PAZO from there.'} />
  }
  if (environment === 'denied') {
    return variant === 'panel' ? <Notice
      title={es ? 'Avisos bloqueados' : 'Alerts are blocked'}
      text={es ? 'Actívalos en los ajustes de tu teléfono.' : 'Turn them on in your phone settings.'} /> : null
  }
  if (!enabled) return null

  const activate = async () => {
    setBusy(true)
    setFailed(false)
    // Runs inside the tap: iOS only shows the permission prompt in response to one.
    const result = await enablePush(lang)
    setBusy(false)
    setEnvironment(readPushEnvironment())
    if (result === 'active') setActive(true)
    else if (result === 'failed') setFailed(true)
  }

  if (!active) {
    return (
      <div className="rounded-[23px] bg-[#E7F0DA] px-3.5 py-3.5">
        <button
          type="button"
          onClick={() => void activate()}
          disabled={busy}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#204E4A] px-4 text-[14px] font-extrabold text-white transition-colors hover:bg-[#183B38] focus-visible:bg-[#183B38] disabled:opacity-60"
        >
          <Bell />
          {busy ? (es ? 'Activando…' : 'Turning on…') : (es ? 'Activar avisos en este teléfono' : 'Turn on alerts on this phone')}
        </button>
        {failed && <p role="status" className="mt-2 text-center text-[12px] font-semibold text-[#5C7470]">{es ? 'No se pudo activar. Inténtalo de nuevo.' : 'Could not turn on. Try again.'}</p>}
      </div>
    )
  }

  if (variant === 'offer') return null

  const toggle = (key: keyof PushPreferences) => {
    if (!preferences) return
    const previous = preferences
    const next = { ...preferences, [key]: !preferences[key] }
    setPreferences(next)
    void savePushPreferences(next).catch(() => setPreferences(previous))
  }
  const options: { key: keyof PushPreferences; label: string }[] = [
    { key: 'sightings', label: es ? 'Avistamientos' : 'Sightings' },
    { key: 'community', label: es ? 'Comunidad' : 'Community' },
    { key: 'care', label: es ? 'Cuidados' : 'Care' },
  ]

  return (
    <details className="rounded-[23px] bg-[#F3F6EA] px-3.5 py-1">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-[13px] font-extrabold text-[#204E4A]">
        <Bell />
        {es ? 'Avisos activos' : 'Alerts on'}
        <span aria-hidden="true" className="ml-auto text-[18px] leading-none">＋</span>
      </summary>
      <div className="space-y-1 pb-2">
        {preferences && options.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="switch"
            aria-checked={preferences[key]}
            onClick={() => toggle(key)}
            className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-[14px] font-bold text-[#204E4A]"
          >
            {label}
            <span aria-hidden="true" className={'flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ' + (preferences[key] ? 'justify-end bg-[#204E4A]' : 'justify-start bg-[#CBD8CF]')}>
              <span className="h-5 w-5 rounded-full bg-white" />
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => void disablePush().then(() => setActive(false))}
          className="min-h-11 w-full rounded-full text-[13px] font-bold text-[#5C7470] hover:bg-white focus-visible:bg-white"
        >
          {es ? 'Desactivar en este teléfono' : 'Turn off on this phone'}
        </button>
      </div>
    </details>
  )
}

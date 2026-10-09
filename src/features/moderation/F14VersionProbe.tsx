import { useState } from 'react'
import { supabase } from '../../services/supabaseClient'

type Props = { lang: 'es' | 'en' }
type Step = { label: string }
const BUCKET = 'post-photos'
const PIXEL = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+wZ4sAAAAASUVORK5CYII='
const ownedFixture = (path: string, uid: string) =>
  new RegExp('^' + uid + '/f14-version-probe-[0-9a-f-]{36}\\.png$', 'i').test(path)
const imageBlob = () => {
  const bytes = atob(PIXEL)
  return new Blob([Uint8Array.from(bytes, c => c.charCodeAt(0)).buffer as ArrayBuffer], { type: 'image/png' })
}

/**
 * Preview-only, explicit opt-in and ONLY a unique 1px test file.
 * Tests whether current Storage API honors the exact versionId on deletion.
 * NEVER tests real posts, moderation claims, service_role, CDN or account data.
 */
export function F14VersionProbe({ lang }: Props) {
  const es = lang === 'es'
  const [busy, setBusy] = useState(false)
  const [steps, setSteps] = useState<Step[]>([])
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  async function run() {
    if (busy || done) return
    setBusy(true)
    setError('')
    setSteps([])
    const success = (esLabel: string, enLabel: string) =>
      setSteps(prev => [...prev, { label: es ? esLabel : enLabel }])
    let key = '', path = ''
    try {
      const { data, error: authError } = await supabase.auth.getUser()
      if (authError || !data.user) throw new Error('AUTH')
      const uid = data.user.id
      key = 'pazo:f14:version-probe:' + uid
      const stored = window.sessionStorage.getItem(key)
      if (stored && !ownedFixture(stored, uid)) throw new Error('UNSAFE_SAVED_PATH')
      path = stored || uid + '/f14-version-probe-' + crypto.randomUUID() + '.png'
      if (!ownedFixture(path, uid)) throw new Error('UNSAFE_PATH')
      const storage = supabase.storage.from(BUCKET)
      if (stored) {
        // A previous interrupted attempt may have left one synthetic file.
        // Only cleanup is permitted on retry; do not mark version QA as PASS.
        const cleanup = await storage.remove([path])
        if (cleanup.error) throw new Error('RECOVERY_FAILED')
        const gone = await storage.info(path)
        if (!gone.error) throw new Error('RECOVERY_UNCONFIRMED')
        window.sessionStorage.removeItem(key)
        setError(es
          ? 'Archivo de prueba anterior limpiado. Puedes iniciar una prueba nueva.'
          : 'Previous test fixture cleaned up. You may start a new test.')
        return
      }
      // Persist path BEFORE upload; interrupted runs never spawn new or orphan files.
      window.sessionStorage.setItem(key, path)
      const uploaded = await storage.upload(path, imageBlob(), {
        upsert: false, contentType: 'image/png', cacheControl: '60',
      })
      if (uploaded.error) throw new Error('UPLOAD_FAILED')
      success('Imagen artificial creada', 'Synthetic image uploaded')

      const first = await storage.info(path)
      const version = first.data?.version
      const firstId = first.data?.id
      if (first.error || typeof version !== 'string' || !version ||
        typeof firstId !== 'string' || !firstId)
        throw new Error('VERSION_NOT_AVAILABLE')
      success('Identidad y versión obtenidas desde Storage', 'Storage identity and version read')

      // Wrong version must NEVER remove the current version. This affects ONLY
      // the synthetic path generated above. A 404 rejection is acceptable.
      const wrongVersion = crypto.randomUUID()
      if (version === wrongVersion) throw new Error('VERSION_COLLISION')
      const wrong = await storage.remove([{ path, versionId: wrongVersion }])
      const afterWrong = await storage.info(path)
      if (afterWrong.error || afterWrong.data?.id !== firstId ||
        afterWrong.data?.version !== version)
        throw new Error('WRONG_VERSION_REMOVED_CURRENT')
      if (wrong.error && !['400', '404', '409'].includes(String(wrong.error.statusCode)))
        throw new Error('VERSION_REQUEST_FAILED')
      success('La versión incorrecta no eliminó el archivo actual', 'Wrong version did not remove current object')

      const exact = await storage.remove([{ path, versionId: version }])
      if (exact.error) throw new Error('EXACT_DELETE_FAILED')
      const absent = await storage.info(path)
      if (!absent.error || String(absent.error.statusCode) !== '404')
        throw new Error('CURRENT_VERSION_STILL_PRESENT')
      const listed = await storage.list(uid, {
        search: path.slice(uid.length + 1), limit: 25,
      })
      if (listed.error || listed.data?.some(x => x.name === path.slice(uid.length + 1)))
        throw new Error('ORIGIN_ABSENCE_UNCONFIRMED')
      success('Versión exacta eliminada; ausencia verificada en origen', 'Exact version removed and origin absence verified')
      window.sessionStorage.removeItem(key)
      setDone(true)
    } catch {
      // Keep only the specific generated fixture path for bounded retry cleanup.
      setError(es
        ? 'La prueba de versiones NO pasó o quedó incompleta. No la repitas con otra cuenta. Vuelve a pulsar para limpiar exclusivamente el archivo artificial de esta prueba.'
        : 'Version test did NOT pass or was interrupted. Retry with this same account only to clean up its synthetic fixture.')
    } finally {
      setBusy(false)
    }
  }
  return <section aria-label="F14 exact-version Storage QA" className="mb-5 rounded-2xl border border-[#204E4A]/20 bg-white p-4 text-[#204E4A]">
    <h3 className="text-sm font-extrabold">{es ? 'Prueba de versión exacta F14' : 'F14 exact-version check'}</h3>
    <p className="mt-1 text-xs leading-relaxed">{es
      ? 'Prueba nueva y aislada: crea una imagen artificial de 1 píxel, comprueba que una versión incorrecta no elimine la actual y después elimina la versión correcta. No modifica publicaciones ni fotos personales. No valida concurrencia ni CDN.'
      : 'Separate synthetic 1px test: checks that a wrong version cannot delete the current file, then removes the exact version. No personal content, concurrency or CDN testing.'}</p>
    <button type="button" disabled={busy || done} onClick={() => void run()}
      className="mt-3 min-h-11 rounded-xl bg-[#204E4A] px-4 text-xs font-bold text-white disabled:opacity-60">
      {busy ? (es ? 'Verificando…' : 'Checking…') : done ? (es ? 'Prueba completada' : 'Test complete')
        : es ? 'Verificar versión exacta (archivo artificial)' : 'Verify exact version (synthetic file)'}
    </button>
    <div aria-live="polite" className="mt-2 space-y-1">
      {steps.map(({ label }) => <p key={label} className="text-xs text-emerald-700">PASS · {label}</p>)}
    </div>
    {done && <p className="mt-2 text-xs font-bold text-emerald-700">
      {es ? 'PASS de la prueba aislada; NO equivale a una purga de medios moderados.' : 'Synthetic test PASS; moderated-media purge is still not certified.'}</p>}
    {error && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{error}</p>}
  </section>
}

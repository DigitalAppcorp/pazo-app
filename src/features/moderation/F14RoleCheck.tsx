import { useState } from 'react'
import { supabase } from '../../services/supabaseClient'

type Props = { lang: 'es' | 'en' }
type Check = { label: string; passed: boolean }

const EMPTY_ID = '00000000-0000-4000-8000-000000000000'

// PostgREST returns PostgreSQL SQLSTATE 42501 for authorization failures.
// A timeout, missing RPC or connectivity error must never count as permission denial.
type RpcError = { code?: string } | null | undefined
const permissionDenied = (error: RpcError) => error?.code === '42501'


/** Preview-only, non-mutating live-JWT regression for signed-in PAZO users. */
export function F14RoleCheck({ lang }: Props) {
  const [running, setRunning] = useState(false)
  const [checks, setChecks] = useState<Check[]>([])
  const [error, setError] = useState('')
  const [accountRole, setAccountRole] = useState<'moderator' | 'normal' | ''>('')
  const es = lang === 'es'
  const tested = checks.length > 0
  const allPass = tested && checks.every(c => c.passed)
  const run = async () => {
    if (running) return
    setRunning(true)
    setChecks([])
    setError('')
    setAccountRole('')
    try {
      // The user's *real existing* Supabase session signs all rpc requests.
      // Never read, display or transmit the access token to a new destination.
      const auth = await supabase.auth.getUser()
      if (auth.error || !auth.data.user) {
        setError(es ? 'Inicia sesión para ejecutar esta prueba.' : 'Please sign in before testing.')
        return
      }
      const role = await supabase.rpc('f14_is_moderator')
      if (role.error || typeof role.data !== 'boolean') {
        setError(es ? 'No se pudo comprobar tu rol.' : 'Could not verify your role.')
        return
      }
      const moderator = role.data
      setAccountRole(moderator ? 'moderator' : 'normal')
      const [queue, media, prepare, recheck] = await Promise.all([
        supabase.rpc('f14_moderation_queue', { p_limit: 1, p_offset: 0 }),
        supabase.rpc('f14_pending_media', { p_limit: 1 }),
        supabase.rpc('f14_prepare_media_claim', { p_kind: 'feed_post', p_id: EMPTY_ID }),
        supabase.rpc('f14_recheck_media_claim', { p_claim: EMPTY_ID }),
      ])
      setChecks([
        { label: es ? 'Sesión real validada por Auth' : 'Actual session validated by Auth', passed: true },
        { label: es ? 'Rol del usuario identificado' : 'Account role verified', passed: true },
        { label: es ? 'Acceso a la cola según el rol' : 'Report queue permission matches role',
          passed: moderator ? (!queue.error && Array.isArray(queue.data)) : permissionDenied(queue.error) },
        { label: es ? 'Acceso a archivos pendientes según el rol' : 'Media queue permission matches role',
          passed: moderator ? (!media.error && Array.isArray(media.data)) : permissionDenied(media.error) },
        { label: es ? 'Reserva privada bloqueada para cuentas' : 'Service-only media claim denied',
          passed: permissionDenied(prepare.error) },
        { label: es ? 'Revisión privada bloqueada para cuentas' : 'Service-only recheck denied',
          passed: permissionDenied(recheck.error) },
      ])
    } catch {
      setError(es ? 'La comprobación no pudo finalizar.' : 'The security check could not finish.')
    } finally {
      setRunning(false)
    }
  }
  const heading = es ? 'Prueba de permisos F14' : 'F14 permissions check'
  const roleCheck = accountRole
    ? (es ? 'Tipo de cuenta comprobado: ' : 'Verified account type: ') +
      (accountRole === 'moderator' ? (es ? 'Moderadora' : 'Moderator') : (es ? 'Normal' : 'Normal'))
    : (es ? 'Usa una cuenta a la vez. No se muestran contraseñas ni tokens.' : 'Test one account at a time. Passwords and tokens are never displayed.')
  return <section aria-label={heading} className="mb-5 rounded-2xl border border-[#204E4A]/20 bg-white p-4">
    <h3 className="text-sm font-extrabold">{heading}</h3>
    <p className="mt-1 text-xs leading-relaxed">{roleCheck}</p>
    <button type="button" onClick={() => void run()} disabled={running}
      className="mt-3 min-h-11 rounded-xl bg-[#204E4A] px-4 text-xs font-bold text-white disabled:opacity-60">
      {running ? (es ? 'Verificando…' : 'Checking…') : (es ? 'Comprobar permisos' : 'Run permissions check')}
    </button>
    {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
    {tested && <div aria-live="polite" className="mt-3 space-y-2">
      <p className="text-sm font-extrabold">{allPass ? (es ? 'PASS — Todos los permisos correctos' : 'PASS — All permissions correct') : (es ? 'FAIL — Revisar resultados' : 'FAIL — Review results')}</p>
      {checks.map(item => <p key={item.label} className="text-xs">
        <span className={item.passed ? 'text-emerald-700' : 'text-red-700'}>{item.passed ? 'PASS' : 'FAIL'}</span>
        {' · '}{item.label}
      </p>)}
      <p className="text-[11px] text-[#204E4A]/80">
        {es ? 'Solo se acepta SQLSTATE 42501 como rechazo de permisos. Un error de conexión no pasa esta prueba. La comprobación no modifica datos.' : 'Only SQLSTATE 42501 counts as permission denial. Connectivity errors do not pass. This check does not modify data.'}
      </p>
    </div>}
  </section>
}

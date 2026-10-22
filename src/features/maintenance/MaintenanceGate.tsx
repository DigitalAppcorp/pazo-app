import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { supabase } from '../../services/supabaseClient'

type Status = { enabled: boolean; message_es: string; message_en: string; updated_at: string }
const valid = (value: unknown): value is Status => !!value && typeof value === 'object' &&
  typeof (value as Status).enabled === 'boolean' &&
  typeof (value as Status).message_es === 'string' &&
  typeof (value as Status).message_en === 'string'

/**
 * The maintenance login must never reveal App to an unverified user.
 * The Data API additionally needs its independent server-side gate enabled.
 */
export function MaintenanceGate({ children }: { children: ReactNode }) {
  const epoch=useRef(0)
  const owner=useRef<string|null>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checked, setChecked] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [loginError, setLoginError] = useState('')

  const mounted=useRef(false)
  const refresh = useCallback(() => {
    const requestEpoch=++epoch.current
    const read=async()=>{
      const response=await supabase.rpc('pazo_public_maintenance_status')
      if(response.error||!valid(response.data))throw Error('maintenance_status_unverified')
      if(!response.data.enabled)return {status:response.data,admin:false,owner:null}
      const {data,error}=await supabase.auth.getUser()
      if(error||!data.user)return {status:response.data,admin:false,owner:null}
      const role=await supabase.rpc('pazo_is_admin')
      return {status:response.data,admin:!role.error&&role.data===true,owner:data.user.id}
    }
    return read().then(next=>{
      if(!mounted.current||requestEpoch!==epoch.current)return
      owner.current=next.owner
      setStatus(next.status);setIsAdmin(next.admin);setChecked(true)
      if(!next.status.enabled)setShowLogin(false)
    }).catch(()=>{
      if(!mounted.current||requestEpoch!==epoch.current)return
      // Preserve an observed lock on failure. Missing SQL during staging does
      // not hide the current app; backend guards still protect every operation.
      setIsAdmin(false);setChecked(true)
    })
  }, [])

  useEffect(() => {
    let active = true;mounted.current=true
    void refresh().catch(() => { if (active) setChecked(true) })
    const subscription = supabase.auth.onAuthStateChange((_event,session) => {
      const next= session?.user?.id??null
      if(next!==owner.current){epoch.current++;owner.current=next;setIsAdmin(false)}
      queueMicrotask(() => { if (active) void refresh().catch(() => {}) })
    })
    const onFocus = () => { if (active) void refresh().catch(() => {}) }
    const timer = window.setInterval(onFocus, 60000)
    window.addEventListener('focus', onFocus)
    return () => {
      active = false;mounted.current=false
      subscription.data.subscription.unsubscribe()
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  const signInAsAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (signingIn) return
    setSigningIn(true)
    setLoginError('')
    try {
      const attempt = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (attempt.error || !attempt.data.user) throw new Error('authentication failed')
      const role = await supabase.rpc('pazo_is_admin')
      if (role.error || role.data !== true) {
        // Never leave an ordinary authenticated account in an unlocked app.
        await supabase.auth.signOut()
        throw new Error('not authorized')
      }
      const current=await supabase.auth.getUser()
      if(current.error||current.data.user?.id!==attempt.data.user.id)throw Error('account_changed')
      setIsAdmin(true)
      setShowLogin(false)
      setPassword('')
    } catch {
      setIsAdmin(false)
      setLoginError(navigator.language.startsWith('en')
        ? 'Administrator access could not be verified.'
        : 'No se pudo verificar el acceso de administrador.')
      setPassword('')
    } finally {
      setSigningIn(false)
      void refresh().catch(() => {})
    }
  }

  if (!checked) return <div role="status" className="flex min-h-[100dvh] items-center justify-center bg-[#FAF8F5] p-6 text-center text-sm font-bold text-[#204E4A]">PAZO</div>
  if (!status?.enabled || isAdmin) return <>{children}</>

  const es = !navigator.language.startsWith('en')
  return <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-[#FAF8F5] px-6 text-center text-[#204E4A]">
    <h1 className="text-4xl font-black tracking-tight">pazo<span className="text-[#E1E53F]">.</span></h1>
    <h2 className="text-xl font-extrabold">{es ? 'Estamos mejorando PAZO' : 'PAZO is being improved'}</h2>
    <p role="status" className="max-w-sm text-sm leading-relaxed text-[#5C7470]">
      {es ? status.message_es : status.message_en}
    </p>
    <a href="/maintenance-admin.html" className="inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-bold underline focus-visible:bg-[#E1E53F]/35">{es?'Acceso de recuperación':'Recovery access'}</a>
    {!showLogin ? <button type="button" onClick={() => setShowLogin(true)}
      className="mt-4 min-h-11 rounded-xl px-4 py-2 text-xs font-bold underline hover:bg-[#EFF4E8] focus-visible:bg-[#E1E53F]/35">
      {es ? 'Acceso para administradores' : 'Administrator access'}
    </button> : <form onSubmit={event => void signInAsAdmin(event)}
      className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="text-sm font-black">{es ? 'Acceso de administrador' : 'Administrator sign-in'}</h3>
      <label className="block text-xs font-bold">{es ? 'Correo' : 'Email'}
        <input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)}
          className="mt-2 min-h-11 w-full rounded-xl bg-[#EFF4E9] px-3 py-2 text-sm" />
      </label>
      <label className="block text-xs font-bold">{es ? 'Contraseña' : 'Password'}
        <input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)}
          className="mt-2 min-h-11 w-full rounded-xl bg-[#EFF4E9] px-3 py-2 text-sm" />
      </label>
      {loginError && <p role="alert" className="text-xs text-[#A04535]">{loginError}</p>}
      <button type="submit" disabled={signingIn} className="min-h-11 w-full rounded-xl bg-[#E1E53F] px-4 py-2 text-sm font-black disabled:opacity-50">
        {signingIn ? (es ? 'Verificando…' : 'Verifying…') : (es ? 'Entrar' : 'Sign in')}
      </button>
      <button type="button" onClick={() => { setShowLogin(false); setLoginError(''); setPassword('') }}
        className="min-h-11 w-full rounded-xl bg-[#EFF4E9] px-4 py-2 text-xs font-bold">
        {es ? 'Volver' : 'Back'}
      </button>
    </form>}
  </main>
}

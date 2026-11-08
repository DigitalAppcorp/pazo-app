import { useState } from 'react'
import { setTestAccount, testAccountFlag } from '../testAccountService'

/** One switch per account in Administration → Users. Hidden until the server
 * returns the flag, so an older database never shows a control that cannot work. */
export function AdminTestAccountToggle({ lang, userId, row }: { lang: 'es' | 'en'; userId: string; row: unknown }) {
  const l = (es: string, en: string) => (lang === 'es' ? es : en)
  const initial = testAccountFlag(row)
  const [test, setTest] = useState(initial === true)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  if (initial === null) return null
  const toggle = async () => {
    const next = !test
    setBusy(true)
    setFailed(false)
    setTest(next)
    try {
      if (!(await setTestAccount(userId, next))) throw new Error('missing')
    } catch {
      setTest(!next)
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  const label = l('Cuenta de prueba', 'Test account')
  return <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-white px-3 py-2">
    <span className="text-xs font-bold text-[#253E35]">{label}</span>
    <button type="button" role="switch" aria-checked={test} aria-label={label} disabled={busy} onClick={toggle}
      className={'min-h-11 rounded-full px-4 text-[12px] font-bold disabled:opacity-60 ' + (test ? 'bg-[#E1E53F] text-[#253E35]' : 'bg-[#F5F6F1] text-[#536E64] hover:bg-[#EAF2E5] focus-visible:bg-[#EAF2E5]')}>
      {test ? l('Sí · no cuenta en cifras', 'Yes · excluded from figures') : l('No', 'No')}
    </button>
    {failed && <p role="status" className="!m-0 w-full text-[11px] font-semibold text-[#805417]">{l('No se pudo guardar. Inténtalo otra vez.', 'Could not save. Try again.')}</p>}
  </div>
}

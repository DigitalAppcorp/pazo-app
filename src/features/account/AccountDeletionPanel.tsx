import { useCallback, useEffect, useState } from 'react'
import type { AccountDeletionPreflight, AccountDeletionSnapshot } from './deletionFlow'
import { canCancelDeletion, canRequestDeletion, getDeletionStatusMessage } from './deletionFlow'
import { cancelAccountDeletion, getAccountDeletionPreflight, getAccountDeletionStatus, requestAccountDeletion } from './deletionService'

interface Props { lang: 'es' | 'en'; userId: string }

// Closed-by-default rollout. Requires a separate A3 backend gate; never
// expose a working-looking delete action against a database without its RPCs.
export const ACCOUNT_DELETION_REQUESTS_ENABLED =
  import.meta.env.VITE_F14_A3_REQUESTS_ENABLED === 'true'

export function AccountDeletionPanel({ lang, userId }: Props) {
  const es = lang === 'es'
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [preflight, setPreflight] = useState<AccountDeletionPreflight | null>(null)
  const [snapshot, setSnapshot] = useState<AccountDeletionSnapshot | null>(null)

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const [state, dependencies] = await Promise.all([
        getAccountDeletionStatus(), getAccountDeletionPreflight(),
      ])
      setSnapshot(state)
      setPreflight(dependencies)
    } catch {
      setError(es
        ? 'No se pudo consultar el estado. No se realizó ningún cambio.'
        : 'Could not retrieve the status. No changes were made.')
    } finally { setBusy(false) }
  }, [es])

  useEffect(() => {
    if (!open) return
    void load()
  }, [open, load, userId])

  if (!ACCOUNT_DELETION_REQUESTS_ENABLED || !userId) return null

  const request = async () => {
    if (busy || confirmText !== 'ELIMINAR' || !canRequestDeletion(snapshot?.status)) return
    setBusy(true)
    setError('')
    try {
      const state = await requestAccountDeletion()
      setSnapshot(state)
      setConfirmText('')
    } catch {
      setError(es ? 'No se pudo registrar la solicitud.' : 'Could not submit the request.')
    } finally { setBusy(false) }
  }

  const cancel = async () => {
    if (busy || !snapshot || !canCancelDeletion(snapshot.status)) return
    setBusy(true)
    setError('')
    try { setSnapshot(await cancelAccountDeletion()) }
    catch { setError(es ? 'No se pudo cancelar la solicitud.' : 'Could not cancel the request.') }
    finally { setBusy(false) }
  }

  return <section className="rounded-[2rem] bg-white p-4 shadow-sm space-y-3">
    <button type="button" className="w-full rounded-2xl bg-[#FAF8F5] px-4 py-3 text-left text-xs font-extrabold text-[#204E4A]"
      onClick={() => setOpen(v => !v)} aria-expanded={open}>
      {es ? 'Privacidad y cierre de cuenta' : 'Privacy and account closure'}
    </button>
    {open && <div className="space-y-3">
      <p className="text-xs text-[#5C7470]">
        {es
          ? 'Esta opción solicita una revisión del cierre. No elimina inmediatamente tu cuenta ni tus archivos.'
          : 'This requests an account closure review. It does not immediately delete your account or files.'}
      </p>
      {busy && <p role="status" className="text-xs">{es ? 'Consultando…' : 'Loading…'}</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      {preflight && <p className="text-xs text-[#5C7470]">
        {es ? 'Dependencias detectadas:' : 'Dependencies found:'} {preflight.pets} {es ? 'mascotas' : 'pets'},
        {' '}{preflight.posts} {es ? 'publicaciones' : 'posts'},
        {' '}{preflight.documents} {es ? 'documentos' : 'documents'}.
        {preflight.requiresManualReview && (es
          ? ' Se requiere revisión para proteger aportaciones de otras cuentas.'
          : ' Review is needed to protect contributions from other accounts.')}
      </p>}
      {snapshot && <p role="status" className="rounded-xl bg-[#FAF8F5] p-3 text-xs text-[#204E4A]">
        {getDeletionStatusMessage(snapshot.status, es)}
      </p>}
      {canRequestDeletion(snapshot?.status) && <>
        <label htmlFor="a3-confirm" className="block text-xs font-bold text-[#204E4A]">
          {es ? 'Escribe ELIMINAR para solicitar el cierre' : 'Type ELIMINAR to request closure'}
        </label>
        <input id="a3-confirm" autoComplete="off" value={confirmText} onChange={e => setConfirmText(e.target.value)}
          className="w-full rounded-xl bg-[#FAF8F5] p-3 text-sm text-[#204E4A]" />
        <button type="button" disabled={busy || !!error || confirmText !== 'ELIMINAR'} onClick={() => void request()}
          className="rounded-full bg-[#204E4A] px-5 py-3 text-xs font-bold text-white disabled:opacity-50">
          {es ? 'Solicitar revisión de cierre' : 'Request closure review'}
        </button>
      </>}
      {snapshot && canCancelDeletion(snapshot.status) && <button type="button" disabled={busy}
        onClick={() => void cancel()} className="rounded-full bg-[#E1E53F] px-5 py-3 text-xs font-bold text-[#204E4A] disabled:opacity-50">
        {es ? 'Cancelar solicitud' : 'Cancel request'}
      </button>}
      <button type="button" disabled={busy} onClick={() => void load()}
        className="rounded-full bg-[#FAF8F5] px-4 py-3 text-xs font-bold text-[#204E4A] disabled:opacity-50">
        {es ? 'Actualizar estado' : 'Refresh status'}
      </button>
    </div>}
  </section>
}

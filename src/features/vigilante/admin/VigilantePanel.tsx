import { useModalFocus } from '../../../lib/useModalFocus'
import { AdminVigilanteInbox } from './AdminVigilanteInbox'

// Opened straight from a Vigilante notice; the same inbox also lives in the admin dashboard.
export function VigilantePanel({ lang, onClose }: { lang: 'es' | 'en'; onClose: () => void }) {
  const dialogRef = useModalFocus(true, onClose)
  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#F3F6EA] p-4 sm:p-6">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="pazo-vigilante-panel-title" className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="pazo-vigilante-panel-title" className="text-[18px] font-black text-[#204E4A]">Vigilante</h2>
          <button type="button" onClick={onClose} className="min-h-11 rounded-full bg-white px-4 text-[13px] font-extrabold text-[#204E4A] shadow-[0_4px_16px_rgba(32,78,74,0.06)]">
            {lang === 'es' ? 'Cerrar' : 'Close'}
          </button>
        </div>
        <AdminVigilanteInbox lang={lang} />
      </div>
    </div>
  )
}

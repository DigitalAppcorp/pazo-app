import { useEffect, useRef, useState } from 'react'
import { LegalPreviewDialog } from '../legal/LegalPreviewDialog'
import type { LegalKind } from '../legal/legalCopy'
import { getInitialLanguage } from '../i18n/languagePreference'

interface Props {
  onConfirm: () => Promise<boolean>
  onDecline: () => Promise<void>
}

// A new Google account reaches PAZO without the signup checkbox. Google does
// not share an age, so the person confirms it here before an account is prepared.
export function GoogleAdultGate({ onConfirm, onDecline }: Props) {
  const [lang] = useState(getInitialLanguage)
  const [isAdult, setIsAdult] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const [legalKind, setLegalKind] = useState<LegalKind | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])

  const confirm = async () => {
    if (!isAdult || saving) return
    setSaving(true)
    setFailed(false)
    const saved = await onConfirm()
    // On success this screen is replaced as soon as the account updates.
    if (!saved) {
      setSaving(false)
      setFailed(true)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center overflow-y-auto bg-[#FAF8F5] px-6 py-8 text-[#204E4A]">
      <div className="w-full max-w-sm space-y-4">
        <h1 ref={heading} tabIndex={-1} className="bg-transparent text-3xl font-black no-underline focus:outline-none">
          {lang === 'es' ? 'Una última confirmación' : 'One last confirmation'}
        </h1>
        <p className="text-[14px] leading-relaxed text-[#5C7470]">
          {lang === 'es'
            ? 'PAZO es para personas de 18 años o más. Google no nos comparte tu edad, así que te pedimos confirmarla.'
            : 'PAZO is for people aged 18 or older. Google does not share your age with us, so we ask you to confirm it.'}
        </p>
        <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-[#5C7470]">
          <input type="checkbox" checked={isAdult} onChange={(event) => setIsAdult(event.target.checked)}
            className="h-5 w-5 shrink-0 rounded text-[#204E4A]"/>
          <span>{lang === 'es' ? 'Confirmo que tengo 18 años o más.' : 'I confirm that I am 18 or older.'}</span>
        </label>
        <div className="flex flex-wrap items-center justify-center gap-3 text-[14px]">
          <button type="button" onClick={() => setLegalKind('privacy')}
            className="min-h-11 font-semibold underline underline-offset-2 focus-visible:bg-[#E1E53F]">
            {lang === 'es' ? 'Política de privacidad' : 'Privacy policy'}
          </button>
          <button type="button" onClick={() => setLegalKind('terms')}
            className="min-h-11 font-semibold underline underline-offset-2 focus-visible:bg-[#E1E53F]">
            {lang === 'es' ? 'Términos de uso' : 'Terms of use'}
          </button>
        </div>
        {failed && (
          <p role="alert" className="text-center text-[13px] font-semibold">
            {lang === 'es' ? 'No pudimos guardar tu confirmación. Inténtalo de nuevo.' : 'We could not save your confirmation. Please try again.'}
          </p>
        )}
        <button type="button" onClick={() => void confirm()} disabled={!isAdult || saving}
          className="min-h-11 w-full cursor-pointer rounded-full bg-[#204E4A] px-4 py-3 text-[14px] font-extrabold text-white hover:bg-[#183d3a] focus-visible:bg-[#356D67] disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? (lang === 'es' ? 'Guardando…' : 'Saving…') : (lang === 'es' ? 'Continuar' : 'Continue')}
        </button>
        <button type="button" onClick={() => void onDecline()}
          className="min-h-11 w-full cursor-pointer rounded-full px-4 py-2.5 text-[14px] font-bold text-[#5C7470] hover:bg-[#F0F2E8] focus-visible:bg-[#E1E53F]/40">
          {lang === 'es' ? 'No tengo 18 años: cerrar sesión' : 'I am under 18: sign out'}
        </button>
      </div>
      {legalKind && <LegalPreviewDialog kind={legalKind} lang={lang} onClose={() => setLegalKind(null)}/>}
    </div>
  )
}

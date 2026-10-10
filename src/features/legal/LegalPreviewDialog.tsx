import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { legalPreview, type LegalKind, type LegalLanguage } from './legalCopy'
import { PAZO_PRIVACY_SUPPORT_EMAIL, PAZO_PRIVACY_SUPPORT_MAILTO } from './supportContact'

interface Props { kind: LegalKind; lang: LegalLanguage; onClose: () => void }

export function LegalPreviewDialog({ kind, lang, onClose }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const copy = legalPreview[kind][lang]
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButton.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus() }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-3 sm:p-6"
      role="dialog" aria-modal="true" aria-label={copy.heading}>
      <section className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[2rem] bg-[#FAF8F5] px-5 py-6 text-[#204E4A] shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">{copy.heading}</h2>
            <p className="mt-2 text-xs leading-relaxed text-[#5C7470]">{copy.introduction}</p>
          </div>
          <button ref={closeButton} type="button" onClick={onClose}
            className="shrink-0 rounded-full bg-white px-4 py-3 text-xs font-extrabold text-[#204E4A] focus-visible:bg-[#E1E53F]">
            {lang === 'es' ? 'Cerrar' : 'Close'}
          </button>
        </div>
        <p className="my-4 rounded-2xl bg-[#E1E53F]/30 px-3 py-3 text-xs font-semibold leading-relaxed">
          {copy.alert}
        </p>
        <div className="space-y-4">
          {copy.sections.map(section => (
            <section key={section.heading}>
              <h3 className="text-sm font-extrabold">{section.heading}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#5C7470]">{section.text}</p>
            </section>
          ))}
        </div>
        <div className="mt-5 rounded-2xl bg-white px-4 py-4">
          <p className="text-xs font-bold">{lang === 'es' ? 'Privacidad y soporte' : 'Privacy and support'}</p>
          <a href={PAZO_PRIVACY_SUPPORT_MAILTO}
            className="mt-2 inline-block break-all text-sm font-semibold text-[#204E4A] underline underline-offset-4 focus-visible:bg-[#E1E53F]">
            {PAZO_PRIVACY_SUPPORT_EMAIL}
          </a>
          <p className="mt-2 text-xs leading-relaxed text-[#5C7470]">
            {lang === 'es'
              ? 'Este correo recibe consultas de privacidad y soporte. Escribirnos no elimina tu cuenta automáticamente.'
              : 'This inbox accepts privacy and support questions. Emailing us does not automatically delete your account.'}
          </p>
        </div>
        <button type="button" onClick={onClose}
          className="mt-6 w-full rounded-full bg-[#204E4A] py-3 text-xs font-extrabold text-white focus-visible:bg-[#356D67]">
          {lang === 'es' ? 'Entendido' : 'Got it'}
        </button>
      </section>
    </div>, document.body
  )
}

import { useEffect } from 'react'
import { PAZO_MARKETING_PRIVACY_EFFECTIVE_DATE, resolveLegalCopy } from './legalCopy'
import { PAZO_PRIVACY_SUPPORT_EMAIL, PAZO_PRIVACY_SUPPORT_MAILTO } from './supportContact'
import type { LegalPageKind } from './legalPageRoute'

interface Props { kind: LegalPageKind; lang: 'es' | 'en' }

const link = 'font-semibold underline underline-offset-4 focus-visible:bg-[#E1E53F]'

// Same text as the in-app dialog, from the same source. Measurement choices
// need an account, so they stay in the app and are only pointed to here.
export function LegalPage({ kind, lang }: Props) {
  const copy = resolveLegalCopy(kind, lang, kind === 'privacy' ? PAZO_MARKETING_PRIVACY_EFFECTIVE_DATE : undefined)
  const other = lang === 'es' ? 'en' : 'es'
  useEffect(() => { document.title = `${copy.heading} · PAZO` }, [copy.heading])

  return (
    <main className="min-h-screen bg-[#FAF8F5] px-4 py-6 text-[#204E4A] sm:px-6">
      <article className="mx-auto w-full max-w-2xl">
        <nav aria-label={lang === 'es' ? 'Navegación legal' : 'Legal navigation'}
          className="flex flex-wrap items-center justify-between gap-3 text-[14px]">
          <a href="/" className="text-[22px] font-black tracking-tight focus-visible:bg-[#E1E53F]">pazo.</a>
          <span className="flex flex-wrap items-center gap-4">
            <a href={`/${kind === 'privacy' ? 'terms' : 'privacy'}?lang=${lang}`} className={link}>
              {kind === 'privacy'
                ? (lang === 'es' ? 'Términos de uso' : 'Terms of use')
                : (lang === 'es' ? 'Política de privacidad' : 'Privacy policy')}
            </a>
            <a href={`/${kind}?lang=${other}`} hrefLang={other} lang={other} className={link}>
              {other === 'en' ? 'English' : 'Español'}
            </a>
          </span>
        </nav>
        <h1 className="mt-6 text-3xl font-black">{copy.heading}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#5C7470]">{copy.introduction}</p>
        <p className="my-5 rounded-2xl bg-[#E1E53F]/30 px-4 py-3 text-[14px] font-semibold leading-relaxed">{copy.alert}</p>
        <div className="space-y-5">
          {copy.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-base font-extrabold">{section.heading}</h2>
              <p className="mt-1 text-[14px] leading-relaxed text-[#5C7470]">{section.text}</p>
              {section.link && (
                <a href={section.link.href} rel="noreferrer" className={`mt-1 inline-block break-words text-[14px] ${link}`}>
                  {section.link.label}
                </a>
              )}
            </section>
          ))}
        </div>
        <section className="mt-6 rounded-2xl bg-white px-4 py-4">
          <h2 className="text-base font-extrabold">{lang === 'es' ? 'Privacidad y soporte' : 'Privacy and support'}</h2>
          <a href={PAZO_PRIVACY_SUPPORT_MAILTO} className={`mt-2 inline-block break-all text-[14px] ${link}`}>
            {PAZO_PRIVACY_SUPPORT_EMAIL}
          </a>
          <p className="mt-2 text-[14px] leading-relaxed text-[#5C7470]">
            {lang === 'es'
              ? 'Este correo recibe consultas de privacidad y soporte. Escribirnos no elimina tu cuenta automáticamente.'
              : 'This inbox accepts privacy and support questions. Emailing us does not automatically delete your account.'}
          </p>
          {kind === 'privacy' && (
            <p className="mt-2 text-[14px] leading-relaxed text-[#5C7470]">
              {lang === 'es'
                ? 'Las opciones de medición de tu cuenta se gestionan dentro de PAZO, en esta misma política.'
                : 'Measurement choices for your account are managed inside PAZO, in this same policy.'}
            </p>
          )}
        </section>
      </article>
    </main>
  )
}

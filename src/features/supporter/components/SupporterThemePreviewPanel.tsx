import { useEffect, useRef, useState } from 'react'
import type { Pet } from '../../../types/pazo'
import { IconPaw } from '../../../components/icons/PazoIcons'
import { SupporterThemeSaveControl } from './SupporterThemeSaveControl'
import {supporterBenefitsUiEnabled} from '../supporterUiRelease'
import {
  SupporterProfileBackdrop,
  SupporterThemePreviewPicker,
  type SupporterProfileThemeSelection,
} from './SupporterProfileThemes'

interface SupporterThemePreviewPanelProps {
  pet: Pet
  lang: 'es' | 'en'
  onClose: () => void
}

// Discovery preview remains the default. Persistence is owner/server gated and opt-in for release.
const liveBenefitsUI = supporterBenefitsUiEnabled
export const SupporterThemePreviewPanel = ({ pet, lang, onClose }: SupporterThemePreviewPanelProps) => {
  const [theme, setTheme] = useState<SupporterProfileThemeSelection>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    if (typeof document === 'undefined') return
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="supporter-theme-preview-title"
      className="fixed inset-0 z-[110] overflow-y-auto bg-[#FAF8F5] font-sans text-[#204E4A]"
    >
      <div className="sticky top-0 z-30 bg-[#FAF8F5]/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3">
          <div>
            <h2 id="supporter-theme-preview-title" className="text-[20px] font-black">
              {lang === 'es' ? 'Personalizar perfil' : 'Customize profile'}
            </h2>
            <p className="text-[12px] font-medium text-[#5C7470]">
              {liveBenefitsUI ? (lang === 'es' ? 'Amigo de PAZO · Personalización' : 'PAZO Friend · Customization')
                : (lang === 'es' ? 'Amigo de PAZO · Vista previa' : 'Amigo de PAZO · Preview')}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="min-h-11 shrink-0 rounded-full bg-white px-4 py-2.5 text-[13px] font-bold text-[#204E4A] shadow-[0_3px_12px_rgba(32,78,74,0.08)] transition-colors hover:bg-[#E1E53F]/30 focus-visible:bg-[#E1E53F]/45"
          >
            {lang === 'es' ? 'Cerrar vista previa' : 'Close preview'}
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-10 pt-3">
        <p className="rounded-[20px] bg-[#F0F3ED] px-4 py-3 text-[13px] font-semibold leading-relaxed text-[#476862]">
          {lang === 'es'
            ? (liveBenefitsUI ? 'Explora los fondos de Amigo de PAZO. Guardar requiere una mensualidad verificada.' : 'Explora cómo podría verse el perfil de tu mascota. Función en desarrollo: los temas aún no se pueden guardar ni publicar.')
            : (liveBenefitsUI ? 'Explore PAZO Friend backgrounds. Saving requires a verified paid month.' : 'Explore how your pet profile could look. Feature in development: themes cannot be saved or published yet.')}
        </p>

        <SupporterThemePreviewPicker value={theme} onChange={setTheme} lang={lang} enabled={liveBenefitsUI} />
        {liveBenefitsUI && <SupporterThemeSaveControl petId={pet.id} selectedTheme={theme} lang={lang} onLoaded={setTheme} />}

        <section
          aria-label={lang === 'es' ? 'Simulación de tu perfil social' : 'Your social profile mockup'}
          className={'relative isolate min-h-[405px] overflow-hidden rounded-[32px] px-6 pb-10 pt-8 shadow-[0_8px_30px_rgba(32,78,74,0.06)] transition-colors duration-300 ' + (theme === 'stars' ? 'bg-[#1B2D5C]' : 'bg-[#F8F5EC]')}
        >
          {theme && <SupporterProfileBackdrop theme={theme} />}
          {theme === 'stars' && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 top-[170px] bg-gradient-to-b from-[#17264A]/5 via-[#17264A]/45 to-[#17264A]/65" />
          )}
          <div className="relative z-10">
            <div className="flex h-[132px] w-[132px] items-center justify-center overflow-hidden rounded-full bg-[#E9EFE6] shadow-[0_12px_28px_rgba(32,78,74,0.14)]">
              {pet.photoUrl
                ? <img src={pet.photoUrl} alt={pet.name} className="h-full w-full object-cover" />
                : <IconPaw size={56} className="text-[#204E4A]/40" />}
            </div>
            <h3 className={'mt-6 break-words text-[clamp(34px,10vw,48px)] font-black leading-tight tracking-[-0.04em] transition-colors duration-300 ' + (theme === 'stars' ? 'text-[#FCFAF2]' : 'text-[#204E4A]')}>
              {pet.name}
            </h3>
            <span className="mt-2 inline-flex rounded-full bg-[#E1E53F]/85 px-4 py-1.5 text-[14px] font-extrabold uppercase text-[#204E4A]">
              {pet.species}
            </span>
            {pet.breed && <p className={'mt-3 text-[13px] font-semibold transition-colors duration-300 ' + (theme === 'stars' ? 'text-[#F0F4EB]' : 'text-[#315B55]')}>{pet.breed}</p>}
            {Boolean(pet.bio?.trim()) && <p className={'mt-4 max-w-[40ch] whitespace-pre-wrap break-words text-[15px] font-medium leading-relaxed transition-colors duration-300 ' + (theme === 'stars' ? 'text-[#F0F4EB]' : 'text-[#315B55]')}>{pet.bio}</p>}
          </div>
        </section>

        <p role="status" className="px-2 text-center text-[12px] font-medium text-[#5C7470]">
          {lang === 'es'
            ? (liveBenefitsUI ? 'Los cambios solo aparecerán en tu perfil cuando PAZO confirme que se guardaron.' : 'Solo vista previa. Tu perfil público no ha cambiado.')
            : (liveBenefitsUI ? 'Changes appear publicly only after PAZO confirms they were saved.' : 'Preview only. Your public profile has not changed.')}
        </p>
      </div>
    </div>
  )
}

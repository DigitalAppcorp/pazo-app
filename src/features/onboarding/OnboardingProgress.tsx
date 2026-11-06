// One segment per onboarding screen, so signing up reads as a short path rather than a list of chores.
const STAGES = {
  es: ['Tu cuenta', 'Confirma tu correo', 'Tu mascota', 'Tu zona'],
  en: ['Your account', 'Confirm your email', 'Your pet', 'Your area'],
} as const

export type OnboardingStage = 0 | 1 | 2 | 3

export function OnboardingProgress({ stage, lang }: { stage: OnboardingStage; lang: 'es' | 'en' }) {
  const labels = STAGES[lang]
  return (
    <div className="mt-3">
      <div role="progressbar" aria-valuemin={1} aria-valuemax={labels.length} aria-valuenow={stage + 1}
        aria-valuetext={labels[stage]} aria-label={lang === 'es' ? 'Avance del registro' : 'Sign-up progress'}
        className="grid grid-cols-4 gap-1.5">
        {labels.map((label, index) => (
          <span key={label} aria-hidden="true"
            className={'h-2 rounded-full transition-colors duration-500 ' + (index < stage ? 'bg-[#204E4A]' : index === stage ? 'bg-[#E1E53F]' : 'bg-[#204E4A]/10')} />
        ))}
      </div>
      <p aria-hidden="true" className="mt-1.5 text-[12px] font-extrabold text-[#204E4A]">{labels[stage]}</p>
    </div>
  )
}

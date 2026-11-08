import { AppNotice } from '../notices/AppNotice'

export function FirstCarePrompt({ petName, lang, onStart, onDismiss }: {
  petName: string
  lang: 'es' | 'en'
  onStart: () => void
  onDismiss: () => void
}) {
  const es = lang === 'es'
  return <AppNotice kind="first-care" lang={lang} label={es ? 'Primer cuidado' : 'First care reminder'}
    title={es ? `Agenda un cuidado para ${petName}` : `Schedule care for ${petName}`}
    description={es ? 'Puedes empezar por su próxima vacuna. Elige cuál es y en qué fecha toca.' : 'Start with their next vaccine. Choose which one and when it’s due.'}
    dismissLabel={es ? 'Ahora no' : 'Not now'} autoFocus onDismiss={onDismiss}>
    <button type="button" data-notice-primary onClick={onStart}
      className="min-h-12 rounded-2xl bg-[#204E4A] px-3 py-3 text-[13px] font-extrabold leading-snug text-white hover:bg-[#183D3A] focus-visible:bg-[#E1E53F] focus-visible:text-[#204E4A] focus-visible:underline focus-visible:outline-none">
      {es ? 'Agendar cuidado' : 'Schedule care'}
    </button>
  </AppNotice>
}

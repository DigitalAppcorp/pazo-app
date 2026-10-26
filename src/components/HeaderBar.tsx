import { IconExplore, IconChat, IconBell } from './icons/PazoIcons'

interface HeaderBarProps {
  lang: 'es' | 'en'
  onToggleLang: () => void
  onOpenSearch: () => void
  onOpenMessages: () => void
  onOpenNotifications: () => void
  unreadMessagesCount: number
  unreadNotificationsCount: number
}

export const HeaderBar = ({
  lang,
  onToggleLang,
  onOpenSearch,
  onOpenMessages,
  onOpenNotifications,
  unreadMessagesCount,
  unreadNotificationsCount,
}: HeaderBarProps) => {
  return (
    <header className="relative z-20 flex shrink-0 items-center justify-between gap-2 bg-white/80 px-3 py-2.5 shadow-[0_3px_16px_rgba(32,78,74,0.05)] backdrop-blur-xl sm:px-5">
      <div className="flex items-center gap-2">
        <span className="font-black text-2xl tracking-tighter text-[#204E4A]">pazo.</span>
        <span className="w-2.5 h-2.5 rounded-full bg-[#E1E53F] animate-pulse-soft"></span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button
          onClick={onToggleLang}
          aria-label={lang === 'es' ? 'Cambiar a inglés' : 'Switch to Spanish'}
          className="flex h-10 min-w-10 items-center justify-center rounded-full bg-[#FAF8F5]/90 px-2 text-[13px] font-extrabold text-[#204E4A] shadow-sm transition-colors hover:bg-[#E1E53F]/45"
        >
          {lang === 'es' ? 'ES' : 'EN'}
        </button>

        <button
          onClick={onOpenSearch}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5]/90 text-[#204E4A] shadow-sm transition-colors hover:bg-[#E1E53F]/45 shadow-xs"
          title={lang === 'es' ? 'Buscar' : 'Search'}
          aria-label={lang === 'es' ? 'Buscar en PAZO' : 'Search PAZO'}
        >
          <IconExplore size={21} />
        </button>

        <button
          onClick={onOpenMessages}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5]/90 text-[#204E4A] shadow-sm transition-colors hover:bg-[#E1E53F]/45 relative shadow-xs"
          title={lang === 'es' ? 'Mensajes' : 'Messages'}
        >
          <IconChat size={21} />
          {unreadMessagesCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E1E53F] rounded-full shadow-xs"></span>
          )}
        </button>

        <button
          onClick={onOpenNotifications}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5]/90 text-[#204E4A] shadow-sm transition-colors hover:bg-[#E1E53F]/45 relative shadow-xs"
          title={lang === 'es' ? 'Notificaciones' : 'Notifications'}
        >
          <IconBell size={21} />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EC7357] rounded-full shadow-xs"></span>
          )}
        </button>
      </div>
    </header>
  )
}

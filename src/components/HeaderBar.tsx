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
    <header className="px-5 py-3.5 flex justify-between items-center bg-white/95 backdrop-blur-md relative z-20 shrink-0 shadow-[0_2px_12px_rgba(32,78,74,0.03)]">
      <div className="flex items-center gap-2">
        <span className="font-black text-2xl tracking-tighter text-[#204E4A]">pazo.</span>
        <span className="w-2.5 h-2.5 rounded-full bg-[#E1E53F] animate-pulse-soft"></span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleLang}
          className="text-[10px] font-extrabold tracking-wider px-3 py-1.5 rounded-full bg-[#FAF8F5] text-[#204E4A] hover:bg-neutral-100 transition-colors cursor-pointer shadow-xs"
        >
          {lang === 'es' ? 'ES' : 'EN'}
        </button>

        <button
          onClick={onOpenSearch}
          className="w-9 h-9 rounded-full bg-[#FAF8F5] hover:bg-neutral-100 text-[#204E4A] flex items-center justify-center transition-colors cursor-pointer shadow-xs"
          title={lang === 'es' ? 'Buscar' : 'Search'}
          aria-label={lang === 'es' ? 'Buscar en PAZO' : 'Search PAZO'}
        >
          <IconExplore size={17} />
        </button>

        <button
          onClick={onOpenMessages}
          className="w-9 h-9 rounded-full bg-[#FAF8F5] hover:bg-neutral-100 text-[#204E4A] flex items-center justify-center transition-colors cursor-pointer relative shadow-xs"
          title={lang === 'es' ? 'Mensajes' : 'Messages'}
        >
          <IconChat size={17} />
          {unreadMessagesCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E1E53F] rounded-full shadow-xs"></span>
          )}
        </button>

        <button
          onClick={onOpenNotifications}
          className="w-9 h-9 rounded-full bg-[#FAF8F5] hover:bg-neutral-100 text-[#204E4A] flex items-center justify-center transition-colors cursor-pointer relative shadow-xs"
          title={lang === 'es' ? 'Notificaciones' : 'Notifications'}
        >
          <IconBell size={17} />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EC7357] rounded-full shadow-xs"></span>
          )}
        </button>
      </div>
    </header>
  )
}

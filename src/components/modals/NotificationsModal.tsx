import {isSupporterNotification,supporterNotificationCopy} from '../../features/notifications/supporterNotification'
import { getNotificationCommunityId, getNotificationSightingId } from '../../features/notifications/notificationSource'
import { useState } from 'react'
import type { PazoNotification } from '../../types/pazo'
import { IconCalendar, IconChat, IconCommunity } from '../icons/PazoIcons'

interface NotificationsModalProps {
  isOpen: boolean
  onClose: () => void
  notifications: PazoNotification[]
  onOpenNotification: (notification: PazoNotification) => void
  onLoadMore: () => void
  hasMore: boolean
  isLoadingMore: boolean
  lang: 'es' | 'en'
}

/** Decorative PAZO artwork. No synthetic pets, user activity or notification data. */
const CommunityRestIllustration = () => (
  <svg viewBox="0 0 340 188" className="mx-auto block h-auto w-full max-w-[300px]" aria-hidden="true" focusable="false">
    <ellipse cx="173" cy="171" rx="129" ry="11" fill="#D2E0D3" opacity=".65" />
    <path d="M44 109c-10-44 29-78 74-77 27-11 65-3 84 9 46-15 89 10 96 51 10 57-57 75-129 76-64 0-116-13-125-59Z" fill="#E5EEDC" />
    {/* A sleepy dog curled up, with no photo or character impersonation. */}
    <path d="M54 122c0-28 26-47 58-47 35 0 54 17 60 44l-20 28H83c-19 0-29-9-29-25Z" fill="#DCA981" />
    <path d="M74 101C58 94 51 106 55 121c4 14 14 20 25 12l10-17Z" fill="#A66D55" />
    <ellipse cx="123" cy="116" rx="45" ry="38" fill="#E6B88F" />
    <path d="M151 90c19-5 23 13 18 27-4 14-14 19-23 12l-8-17Z" fill="#AD7558" />
    <ellipse cx="104" cy="115" rx="4.1" ry="4.6" fill="#204E4A" />
    <ellipse cx="143" cy="115" rx="4.1" ry="4.6" fill="#204E4A" />
    <ellipse cx="123" cy="132" rx="23" ry="14" fill="#F4D8B8" />
    <path d="M119 127c1-3 8-4 10 0 2 3-3 6-5 7-3-1-7-4-5-7Z" fill="#204E4A" />
    <path d="M124 134c-2 6-8 8-13 4m13-4c2 6 8 8 13 4" fill="none" stroke="#204E4A" strokeWidth="2.3" strokeLinecap="round"/>
    <ellipse cx="96" cy="127" rx="6" ry="3" fill="#EC7357" opacity=".3"/>
    <ellipse cx="150" cy="127" rx="6" ry="3" fill="#EC7357" opacity=".3"/>
    <path d="M92 149c13 11 35 14 53 0" fill="none" stroke="#C89070" strokeWidth="5" strokeLinecap="round"/>
    {/* Bell with PAZO lime accent and a resting notification dot. */}
    <path d="M223 116c8-8 9-17 9-28V75c0-21 13-34 32-34s32 13 32 34v13c0 11 2 20 10 28 3 4 1 9-5 9h-73c-6 0-9-5-5-9Z" fill="#204E4A"/>
    <rect x="247" y="39" width="34" height="9" rx="4.5" fill="#204E4A"/>
    <path d="M254 128h21c-2 12-18 17-21 0Z" fill="#204E4A"/>
    <path d="M240 112c6-6 8-16 8-27V75c0-14 6-24 16-29" fill="none" stroke="#83ADA0" strokeWidth="6" strokeLinecap="round" opacity=".7"/>
    <circle cx="295" cy="46" r="16" fill="#E1E53F"/>
    <path d="M291 46h8M295 42v8" stroke="#204E4A" strokeWidth="2.4" strokeLinecap="round"/>
    {/* Tiny paw represents PAZO's community identity, not an actual alert. */}
    <circle cx="203" cy="46" r="4.3" fill="#EC7357" opacity=".7"/>
    <circle cx="216" cy="41" r="4.3" fill="#EC7357" opacity=".7"/>
    <circle cx="229" cy="47" r="4.3" fill="#EC7357" opacity=".7"/>
    <path d="M205 56c6-10 17-10 23 0 4 8-2 12-8 9-3-1-6-1-9 0-6 3-11-2-6-9Z" fill="#EC7357" opacity=".7"/>
    <path d="M41 63c6-2 9-6 10-12 3 6 6 10 12 12-6 2-9 6-12 12-1-6-4-10-10-12Z" fill="#E1E53F"/>
  </svg>
)

const NotificationBell = () => (
  <svg viewBox="0 0 32 32" width="22" height="22" fill="currentColor" aria-hidden="true">
    <path d="M16 4c-5.3 0-9.1 3.8-9.1 9.4v3.9c0 2.2-1 4.4-3 6.2-.9.8-.3 2.5 1.1 2.5h22c1.3 0 2-1.7 1.1-2.5-2-1.8-3-4-3-6.2v-3.9C25.1 7.8 21.3 4 16 4Zm0 25.5c3.1 0 4.8-1.3 5.5-2.5h-11c.8 1.2 2.5 2.5 5.5 2.5Z" />
  </svg>
)

export const NotificationsModal = ({
  isOpen,
  onClose,
  notifications,
  onOpenNotification,
  onLoadMore,
  hasMore,
  isLoadingMore,
  lang,
}: NotificationsModalProps) => {
  const [filter, setFilter] = useState<'todas' | 'comunidad'>('todas')

  if (!isOpen) return null

  const filtered = notifications.filter((n) =>
    filter === 'todas' ? true : n.category === filter
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102D29]/60 p-3 backdrop-blur-[6px] animate-slide-up sm:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pazo-notifications-heading"
        aria-describedby="pazo-notifications-description"
        className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-[440px] space-y-4 overflow-y-auto rounded-[38px] bg-[#FFFCF6] p-5 shadow-[0_24px_65px_rgba(5,34,30,0.25)] sm:max-h-[90dvh] sm:p-7"
        onScroll={(event) => {
          const element = event.currentTarget
          const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight

          if (distanceToBottom < 180 && hasMore && !isLoadingMore) {
            onLoadMore()
          }
        }}
      >
        {/* Editorial community header, without extra fake notifications. */}
        <header className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="pazo-notifications-heading" className="mt-1.5 max-w-[17ch] text-[clamp(23px,6vw,29px)] font-black leading-[1.15] tracking-tight text-[#204E4A]">
              {lang === 'es' ? 'Siempre cerca de tu comunidad.' : 'Always close to your community.'}
            </h2>
            <p id="pazo-notifications-description" className="mt-2 max-w-[35ch] text-[13px] leading-relaxed text-[#5C7470]">
              {lang === 'es'
                ? 'Tus avisos y avistamientos, en un solo lugar.'
                : 'Your updates and sightings, all in one place.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'es' ? 'Cerrar avisos' : 'Close notifications'}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#204E4A] shadow-[0_3px_12px_rgba(32,78,74,0.07)] transition-colors hover:bg-[#E1E53F]/30 focus-visible:bg-[#E1E53F]/40"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6 18 18M18 6 6 18"/>
            </svg>
          </button>
        </header>

        <nav className="grid grid-cols-2 gap-1 rounded-full bg-[#F0F2EA] p-1.5" aria-label={lang === 'es' ? 'Filtrar avisos' : 'Filter notifications'}>
          <button
            type="button"
            aria-pressed={filter === 'todas'}
            onClick={() => setFilter('todas')}
            className={filter === 'todas'
              ? 'flex min-h-10 min-w-0 items-center justify-center rounded-full bg-[#204E4A] px-3 text-[13px] font-extrabold text-white shadow-[0_3px_10px_rgba(32,78,74,0.12)]'
              : 'flex min-h-10 min-w-0 items-center justify-center rounded-full px-3 text-[13px] font-bold text-[#5C7470] hover:bg-white focus-visible:bg-white'}
          >
            {lang === 'es' ? 'Todas' : 'All'}
          </button>
          <button
            type="button"
            aria-pressed={filter === 'comunidad'}
            onClick={() => setFilter('comunidad')}
            className={filter === 'comunidad'
              ? 'flex min-h-10 min-w-0 items-center justify-center rounded-full bg-[#204E4A] px-2 text-[13px] font-extrabold text-white shadow-[0_3px_10px_rgba(32,78,74,0.12)]'
              : 'flex min-h-10 min-w-0 items-center justify-center rounded-full px-2 text-[13px] font-bold text-[#5C7470] hover:bg-white focus-visible:bg-white'}
          >
            {lang === 'es' ? 'Avistamientos' : 'Sightings'}
          </button>
        </nav>

        <div className="space-y-2.5">
          {filtered.length === 0 ? (
            <div className="rounded-[30px] bg-[#F3F6EA]/75 px-3 pb-6 pt-4 text-center">
              <CommunityRestIllustration />
              <h3 className="mt-1 text-[21px] font-black tracking-tight text-[#204E4A]">
                {filter === 'comunidad'
                  ? (lang === 'es' ? 'Sin avistamientos por ahora' : 'No sightings for now')
                  : (lang === 'es' ? '¡Todo en calma!' : 'All is calm!')}
              </h3>
              <p className="mx-auto mt-2 max-w-[29ch] text-[13px] leading-relaxed text-[#5C7470]">
                {hasMore
                  ? (lang === 'es'
                    ? 'No hay novedades entre los avisos cargados. Puedes consultar los anteriores.'
                    : 'No updates among the loaded notices. You can check earlier ones.')
                  : filter === 'comunidad'
                    ? (lang === 'es' ? 'No hay avistamientos disponibles en esta sección.' : 'There are no sightings in this section.')
                    : (lang === 'es' ? 'Tu comunidad no tiene novedades para ti en este momento.' : 'Your community has no updates for you right now.')}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5" aria-live="polite">
              {filtered.map((item) => {
                const isSighting = Boolean(getNotificationSightingId(item))
                const isCommunityJoin = Boolean(getNotificationCommunityId(item))
                const canOpen = isSighting || isCommunityJoin || isSupporterNotification(item)
                const localized = supporterNotificationCopy(item,lang)
                const isCare = item.category === 'cuidados'

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => canOpen && onOpenNotification(item)}
                    disabled={!canOpen}
                    className={
                      'flex w-full min-w-0 items-start gap-3 rounded-[23px] px-3.5 py-3.5 text-left transition-colors ' +
                      (item.read
                        ? 'bg-white/70 '
                        : 'bg-[#E7F0DA]/90 shadow-[0_5px_16px_rgba(32,78,74,0.06)] ') +
                      (canOpen ? 'cursor-pointer hover:bg-[#E1E53F]/20 focus-visible:bg-[#E1E53F]/25' : 'cursor-default')
                    }
                  >
                    <span aria-hidden="true" className={'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ' +
                      (isSighting || isCommunityJoin ? 'bg-[#E1E53F]/50 text-[#204E4A]' : isCare ? 'bg-[#E7F0DA] text-[#204E4A]' : 'bg-[#F1F3EB] text-[#204E4A]')}>
                      {isCare ? <IconCalendar size={21} /> : isSighting ? <IconChat size={21} /> : isCommunityJoin ? <IconCommunity size={21} /> : <NotificationBell />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start gap-2">
                        <span className="min-w-0 flex-1 break-words text-[14px] font-extrabold leading-snug text-[#204E4A]">{localized.title}</span>
                        {!item.read && <span aria-label={lang === 'es' ? 'Nuevo' : 'New'} className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#EC7357]" />}
                      </span>
                      <span className="mt-1 block break-words text-[13px] leading-relaxed text-[#5C7470]">{localized.subtitle}</span>
                      {isSupporterNotification(item)&&<span className="mt-2 block text-[12px] font-bold text-[#204E4A]">{item.sourceType==='supporter_verified'?(lang==='es'?'Revisar mis beneficios':'Review my benefits'):(lang==='es'?'Ver mi participación':'View my participation')}</span>}
                      <span className="mt-2 block text-[11px] font-semibold text-[#71847F]">{item.timeAgo}</span>
                    </span>
                    {canOpen && (
                      <span aria-hidden="true" className="mt-1 text-[22px] font-bold leading-none text-[#204E4A]">›</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {isLoadingMore && (
          <div role="status" className="flex items-center justify-center gap-2 py-2 text-[12px] font-semibold text-[#5C7470]">
            <span aria-hidden="true" className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#204E4A] motion-reduce:animate-none" />
            {lang === 'es' ? 'Cargando más avisos…' : 'Loading more notifications…'}
          </div>
        )}
        {hasMore && !isLoadingMore && filtered.length === 0 && (
          <button
            type="button"
            onClick={onLoadMore}
            className="w-full rounded-full bg-white/85 px-4 py-3 text-[13px] font-extrabold text-[#204E4A] shadow-[0_3px_12px_rgba(32,78,74,0.06)] hover:bg-[#E1E53F]/20 focus-visible:bg-[#E1E53F]/30"
          >
            {lang === 'es' ? 'Ver avisos anteriores' : 'View earlier notifications'}
          </button>
        )}
      </section>
    </div>
  )
}

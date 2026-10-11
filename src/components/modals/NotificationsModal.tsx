import { getNotificationSightingId } from '../../features/notifications/notificationSource'
import { useState } from 'react'
import type { PazoNotification } from '../../types/pazo'
import { IconCalendar, IconChat } from '../icons/PazoIcons'

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-slide-up">
      <div
        className="w-full max-w-sm bg-white rounded-[2.8rem] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto soft-card"
        onScroll={(event) => {
          const element = event.currentTarget
          const distanceToBottom =
            element.scrollHeight - element.scrollTop - element.clientHeight

          if (distanceToBottom < 180 && hasMore && !isLoadingMore) {
            onLoadMore()
          }
        }}
      >
        <div className="flex justify-between items-center pb-2">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] bg-[#E1E53F] px-2.5 py-0.5 rounded-full inline-block">
              {lang === 'es' ? 'Avisos y Alertas' : 'Alerts & Activity'}
            </span>
            <h3 className="text-xl font-black text-[#204E4A] mt-1">
              {lang === 'es' ? 'Al día.' : 'Notifications.'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#5C7470] hover:text-[#204E4A] flex items-center justify-center font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-1.5 p-1 bg-[#FAF8F5] rounded-full">
          <button
            onClick={() => setFilter('todas')}
            className={`flex-1 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filter === 'todas'
                ? 'bg-[#204E4A] text-[#E1E53F]'
                : 'text-[#5C7470] hover:text-[#204E4A]'
            }`}
          >
            {lang === 'es' ? 'Todas' : 'All'}
          </button>
          <button
            onClick={() => setFilter('comunidad')}
            className={`flex-1 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filter === 'comunidad'
                ? 'bg-[#204E4A] text-[#E1E53F]'
                : 'text-[#5C7470] hover:text-[#204E4A]'
            }`}
          >
            {lang === 'es' ? 'Avistamientos' : 'Sightings'}
          </button>
        </div>

        <div className="space-y-2.5">
          {filtered.length === 0 ? (
            <p className="text-xs text-[#5C7470] text-center py-8">
              {lang === 'es' ? 'No tienes avisos pendientes.' : 'No pending alerts.'}
            </p>
          ) : (
            filtered.map((item) => {
              const canOpen = Boolean(getNotificationSightingId(item))

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => canOpen && onOpenNotification(item)}
                  disabled={!canOpen}
                  className={`w-full text-left p-3.5 rounded-2xl flex items-start gap-3 text-xs border transition-all ${
                    item.read
                      ? 'bg-[#FAF8F5]/45 border-transparent'
                      : 'bg-[#E1E53F]/12 border-[#E1E53F]/30 shadow-[0_4px_16px_rgba(32,78,74,0.05)]'
                  } ${
                    canOpen ? 'cursor-pointer hover:bg-[#E1E53F]/18' : 'cursor-default'
                  }`}
                >
                  <span className="text-base mt-0.5">
                    {item.category === 'cuidados'
                      ? <IconCalendar size={16} />
                      : <IconChat size={16} />}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#204E4A] block">
                        {item.title}
                      </span>
                      {!item.read && (
                        <span
                          className="w-2 h-2 rounded-full bg-[#E1E53F] shrink-0"
                          aria-label={lang === 'es' ? 'Nuevo' : 'New'}
                        />
                      )}
                    </div>
                    <span className="text-[11px] text-[#5C7470] block mt-0.5">
                      {item.subtitle}
                    </span>
                    <span className="text-[9px] text-[#5C7470]/60 block mt-1">
                      {item.timeAgo}
                    </span>
                  </div>
                  {canOpen && (
                    <span className="text-[#5C7470] font-black mt-1">›</span>
                  )}
                </button>
              )
            })
          )}
        </div>

        {isLoadingMore && (
          <div className="py-2 flex justify-center">
            <div className="w-5 h-5 border-2 border-[#204E4A]/20 border-t-[#204E4A] rounded-full animate-spin" />
          </div>
        )}

      </div>
    </div>
  )
}

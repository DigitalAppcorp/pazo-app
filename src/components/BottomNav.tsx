import type { CSSProperties } from 'react'
import {
  IconHome,
  IconCommunity,
  IconPlus,
  IconMap,
  IconPaw,
} from './icons/PazoIcons'

export type NavTab = 'inicio' | 'comunidades' | 'mapa' | 'mascota'

interface BottomNavProps {
  activeTab: NavTab
  onSelectTab: (tab: NavTab) => void
  onOpenCreate: () => void
  labels: {
    inicio: string
    comunidades: string
    crear: string
    mapa: string
    mascota: string
  }
}

// Create is an independent modal action, not an actual tab.
// Five equal-width centers: 10%, 30%, 50% (Create), 70%, 90%.
const NAV_ITEMS = [
  { tab: 'inicio', Icon: IconHome, center: 10 },
  { tab: 'comunidades', Icon: IconCommunity, center: 30 },
  { tab: 'mapa', Icon: IconMap, center: 70 },
  { tab: 'mascota', Icon: IconPaw, center: 90 },
] as const

export const BottomNav = ({ activeTab, onSelectTab, onOpenCreate, labels }: BottomNavProps) => {
  const selected = NAV_ITEMS.find((item) => item.tab === activeTab)
  const indicatorLeft = selected?.center ?? 10

  const renderTab = (tab: NavTab) => {
    const item = NAV_ITEMS.find((entry) => entry.tab === tab)
    if (!item) return null
    const { Icon } = item
    const isActive = activeTab === tab
    return (
      <button
        key={tab}
        type="button"
        aria-label={labels[tab]}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => onSelectTab(tab)}
        className="pointer-events-auto group relative z-10 flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 pt-1 text-[#5C7470] transition-colors duration-200 hover:text-[#204E4A] focus-visible:bg-[#E1E53F]"
      >
        <span
          aria-hidden="true"
          className={'pazo-liquid-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-full ' +
            (isActive ? 'pazo-liquid-icon--active text-[#E1E53F]' : 'pazo-liquid-icon--idle')}
        >
          <Icon size={21}/>
        </span>
        <span className={'max-w-full truncate text-[10px] font-extrabold tracking-tight transition-[opacity,color] duration-200 sm:text-xs ' +
          (isActive ? 'text-[#204E4A] opacity-100' : 'opacity-0 group-focus-visible:opacity-100')}>
          {labels[tab]}
        </span>
      </button>
    )
  }

  return (
    <nav
      aria-label="Navegación de PAZO"
      data-pazo-floating-nav="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-transparent px-4 pt-1 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
    >
      <div className="relative grid h-[76px] grid-cols-5 items-center">
        {/* Cream surface cut out against the actual PAZO app background; center Create remains independent. */}
        <div
          aria-hidden="true"
          className="pazo-liquid-surface pointer-events-none"
          style={{ '--pazo-liquid-center': indicatorLeft + '%' } as CSSProperties}
        />
        <div
          aria-hidden="true"
          className="pazo-liquid-indicator pointer-events-none"
          style={{ left: indicatorLeft + '%' }}
        />

        {renderTab('inicio')}
        {renderTab('comunidades')}

        <button
          type="button"
          onClick={onOpenCreate}
          title={labels.crear}
          aria-label={labels.crear}
          className="pointer-events-auto group relative z-10 flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 pt-1 focus-visible:bg-[#E1E53F]"
        >
          <span
            aria-hidden="true"
            className="flex h-[52px] w-[52px] -translate-y-[8px] items-center justify-center rounded-full bg-[#E1E53F] text-[#204E4A] shadow-[0_6px_22px_rgba(225,229,63,0.32)] transition-transform duration-200 group-hover:-translate-y-[11px] group-active:scale-95"
          >
            <IconPlus size={26}/>
          </span>
          <span className="-mt-1 max-w-full truncate text-[10px] font-extrabold tracking-tight text-[#204E4A] sm:text-xs">
            {labels.crear}
          </span>
        </button>

        {renderTab('mapa')}
        {renderTab('mascota')}
      </div>
    </nav>
  )
}

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

export const BottomNav = ({
  activeTab,
  onSelectTab,
  onOpenCreate,
  labels,
}: BottomNavProps) => {
  return (
    <nav className="relative z-30 grid shrink-0 grid-cols-5 items-center gap-0.5 bg-white/85 px-1 py-2 shadow-[0_-4px_20px_rgba(32,78,74,0.06)] backdrop-blur-xl sm:px-3">
      <button
        onClick={() => onSelectTab('inicio')}
        className={`flex min-w-0 flex-col items-center gap-0.5 rounded-2xl px-0.5 py-1 transition-colors ${
          activeTab === 'inicio'
            ? 'text-[#204E4A] font-extrabold'
            : 'text-[#5C7470]/70 hover:text-[#204E4A]'
        }`}
      >
        <span
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            activeTab === 'inicio' ? 'bg-[#204E4A] text-[#E1E53F] shadow-sm' : ''
          }`}
        >
          <IconHome size={18} />
        </span>
        <span className="max-w-full truncate text-[11px] font-semibold tracking-tight sm:text-[13px]">{labels.inicio}</span>
      </button>

      <button
        onClick={() => onSelectTab('comunidades')}
        className={`flex min-w-0 flex-col items-center gap-0.5 rounded-2xl px-0.5 py-1 transition-colors ${
          activeTab === 'comunidades'
            ? 'text-[#204E4A] font-extrabold'
            : 'text-[#5C7470]/70 hover:text-[#204E4A]'
        }`}
      >
        <span
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            activeTab === 'comunidades'
              ? 'bg-[#204E4A] text-[#E1E53F] shadow-sm'
              : ''
          }`}
        >
          <IconCommunity size={18} />
        </span>
        <span className="max-w-full truncate text-[11px] font-semibold tracking-tight sm:text-[13px]">{labels.comunidades}</span>
      </button>

      <button
        onClick={onOpenCreate}
        className="group flex min-w-0 flex-col items-center -mt-5"
        title="Crear publicación, evento o alerta"
      >
        <div className="w-13 h-13 rounded-full bg-[#E1E53F] hover:bg-[#d8dc35] text-[#204E4A] flex items-center justify-center shadow-[0_8px_25px_rgba(225,229,63,0.55)] transition-all transform group-hover:scale-105 active:scale-95">
          <IconPlus size={26} />
        </div>
        <span className="mt-1 max-w-full truncate text-[11px] font-extrabold tracking-tight text-[#204E4A] sm:text-[13px]">
          {labels.crear}
        </span>
      </button>

      <button
        onClick={() => onSelectTab('mapa')}
        className={`flex min-w-0 flex-col items-center gap-0.5 rounded-2xl px-0.5 py-1 transition-colors ${
          activeTab === 'mapa'
            ? 'text-[#204E4A] font-extrabold'
            : 'text-[#5C7470]/70 hover:text-[#204E4A]'
        }`}
      >
        <span
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            activeTab === 'mapa' ? 'bg-[#204E4A] text-[#E1E53F] shadow-sm' : ''
          }`}
        >
          <IconMap size={18} />
        </span>
        <span className="max-w-full truncate text-[11px] font-semibold tracking-tight sm:text-[13px]">{labels.mapa}</span>
      </button>

      <button
        onClick={() => onSelectTab('mascota')}
        className={`flex min-w-0 flex-col items-center gap-0.5 rounded-2xl px-0.5 py-1 transition-colors ${
          activeTab === 'mascota'
            ? 'text-[#204E4A] font-extrabold'
            : 'text-[#5C7470]/70 hover:text-[#204E4A]'
        }`}
      >
        <span
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            activeTab === 'mascota' ? 'bg-[#204E4A] text-[#E1E53F] shadow-sm' : ''
          }`}
        >
          <IconPaw size={18} />
        </span>
        <span className="max-w-full truncate text-[11px] font-semibold tracking-tight sm:text-[13px]">{labels.mascota}</span>
      </button>
    </nav>
  )
}

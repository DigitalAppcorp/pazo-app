import {
  IconHome,
  IconExplore,
  IconPlus,
  IconMap,
  IconPaw,
} from './icons/PazoIcons'

export type NavTab = 'inicio' | 'explorar' | 'mapa' | 'mascota'

interface BottomNavProps {
  activeTab: NavTab
  onSelectTab: (tab: NavTab) => void
  onOpenCreate: () => void
  labels: {
    inicio: string
    explorar: string
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
    <nav className="bg-white/95 backdrop-blur-md px-3 py-2 flex justify-around items-center relative z-30 shrink-0 shadow-[0_-4px_20px_rgba(32,78,74,0.04)]">
      {/* 1. Inicio */}
      <button
        onClick={() => onSelectTab('inicio')}
        className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-all cursor-pointer rounded-2xl ${
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
        <span className="text-[10px] tracking-tight">{labels.inicio}</span>
      </button>

      {/* 2. Explorar */}
      <button
        onClick={() => onSelectTab('explorar')}
        className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-all cursor-pointer rounded-2xl ${
          activeTab === 'explorar'
            ? 'text-[#204E4A] font-extrabold'
            : 'text-[#5C7470]/70 hover:text-[#204E4A]'
        }`}
      >
        <span
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            activeTab === 'explorar' ? 'bg-[#204E4A] text-[#E1E53F] shadow-sm' : ''
          }`}
        >
          <IconExplore size={18} />
        </span>
        <span className="text-[10px] tracking-tight">{labels.explorar}</span>
      </button>

      {/* 3. Botón Central CREAR (+) */}
      <button
        onClick={onOpenCreate}
        className="flex flex-col items-center -mt-5 cursor-pointer group"
        title="Crear publicación, evento o alerta"
      >
        <div className="w-13 h-13 rounded-full bg-[#E1E53F] hover:bg-[#d8dc35] text-[#204E4A] flex items-center justify-center shadow-[0_8px_25px_rgba(225,229,63,0.55)] transition-all transform group-hover:scale-105 active:scale-95">
          <IconPlus size={26} />
        </div>
        <span className="text-[10px] font-extrabold text-[#204E4A] mt-1 tracking-tight">
          {labels.crear}
        </span>
      </button>

      {/* 4. Mapa */}
      <button
        onClick={() => onSelectTab('mapa')}
        className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-all cursor-pointer rounded-2xl ${
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
        <span className="text-[10px] tracking-tight">{labels.mapa}</span>
      </button>

      {/* 5. Mi Mascota */}
      <button
        onClick={() => onSelectTab('mascota')}
        className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-all cursor-pointer rounded-2xl ${
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
        <span className="text-[10px] tracking-tight">{labels.mascota}</span>
      </button>
    </nav>
  )
}

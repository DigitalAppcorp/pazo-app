import { useState } from 'react'
import type { Community } from '../../types/pazo'
import { IconExplore, IconCheck } from '../icons/PazoIcons'

interface ExploreViewProps {
  communities: Community[]
  onToggleJoinCommunity: (commId: string) => void
  onSelectPetProfile: (petName: string) => void
  lang: 'es' | 'en'
}

export const ExploreView = ({
  communities,
  onToggleJoinCommunity,
  onSelectPetProfile,
  lang,
}: ExploreViewProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<'para_ti' | 'comunidades' | 'eventos'>('para_ti')

  const filteredCommunities = communities.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.species.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4 animate-slide-up pb-6">
      {/* Título de la sección */}
      <div className="space-y-1 px-1">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] bg-[#E1E53F] px-3 py-1 rounded-full inline-block shadow-xs">
          {lang === 'es' ? 'Descubrimiento' : 'Discovery'}
        </span>
        <h2 className="text-2xl font-black text-[#204E4A] tracking-tight">
          {lang === 'es' ? 'Encuentra a los tuyos.' : 'Find your crowd.'}
        </h2>
        <p className="text-xs text-[#5C7470]">
          {lang === 'es'
            ? 'Comunidades locales organizadas por especie e intereses'
            : 'Local communities organized by species and interests'}
        </p>
      </div>

      {/* Buscador con icono vectorial personalizado */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            lang === 'es'
              ? 'Mascotas, comunidades, eventos en LA...'
              : 'Pets, communities, events in LA...'
          }
          className="w-full bg-white rounded-full pl-11 pr-4 py-3 text-xs text-[#204E4A] shadow-sm focus:bg-white"
        />
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5C7470] pointer-events-none">
          <IconExplore size={16} />
        </div>
      </div>

      {/* Selector de pestañas: Para ti / Comunidades / Eventos */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveCategory('para_ti')}
          className={`text-xs font-bold px-4 py-2 rounded-full transition-all cursor-pointer ${
            activeCategory === 'para_ti'
              ? 'bg-[#204E4A] text-[#E1E53F] shadow-sm'
              : 'bg-white text-[#5C7470] hover:bg-neutral-50 shadow-xs'
          }`}
        >
          {lang === 'es' ? 'Para ti' : 'For you'}
        </button>
        <button
          onClick={() => setActiveCategory('comunidades')}
          className={`text-xs font-bold px-4 py-2 rounded-full transition-all cursor-pointer ${
            activeCategory === 'comunidades'
              ? 'bg-[#204E4A] text-[#E1E53F] shadow-sm'
              : 'bg-white text-[#5C7470] hover:bg-neutral-50 shadow-xs'
          }`}
        >
          {lang === 'es' ? 'Comunidades' : 'Communities'}
        </button>
        <button
          onClick={() => setActiveCategory('eventos')}
          className={`text-xs font-bold px-4 py-2 rounded-full transition-all cursor-pointer ${
            activeCategory === 'eventos'
              ? 'bg-[#204E4A] text-[#E1E53F] shadow-sm'
              : 'bg-white text-[#5C7470] hover:bg-neutral-50 shadow-xs'
          }`}
        >
          {lang === 'es' ? 'Eventos' : 'Events'}
        </button>
      </div>

      {/* Perfil Destacado de Mascota (Nube el conejo) */}
      <div className="p-4 bg-white rounded-[2.2rem] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-xs shrink-0">
            <img
              src="https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?q=80&w=200&auto=format&fit=crop"
              alt="Nube el conejo"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-[#204E4A]">Nube</span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 bg-[#FAF8F5] text-[#204E4A] rounded-full shadow-xs">
                {lang === 'es' ? 'Conejo • LA' : 'Rabbit • LA'}
              </span>
            </div>
            <p className="text-[11px] text-[#5C7470] line-clamp-1">
              {lang === 'es'
                ? 'Explora rincones tranquilos en compañía.'
                : 'Loves calm spots and friendly company.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => onSelectPetProfile('Nube')}
          className="bg-[#FAF8F5] hover:bg-[#E1E53F] text-[#204E4A] text-[11px] font-bold px-3.5 py-2 rounded-full transition-all cursor-pointer shrink-0 shadow-xs"
        >
          {lang === 'es' ? 'Ver Ficha' : 'View Profile'}
        </button>
      </div>

      {/* Lista de Comunidades */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-extrabold text-sm text-[#204E4A]">
            {lang === 'es' ? 'Comunidades sugeridas' : 'Suggested communities'}
          </h3>
          <span className="text-[11px] font-semibold text-[#5C7470]">
            {filteredCommunities.length} {lang === 'es' ? 'disponibles' : 'available'}
          </span>
        </div>

        {filteredCommunities.map((comm) => (
          <div
            key={comm.id}
            className="p-4 bg-white rounded-[2rem] shadow-[0_3px_16px_rgba(32,78,74,0.04)] flex gap-3.5 items-center justify-between"
          >
            <div className="flex gap-3 items-center min-w-0">
              <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-xs shrink-0">
                <img
                  src={comm.photoUrl}
                  alt={comm.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-xs text-[#204E4A] truncate">
                    {comm.name}
                  </h4>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-[#FAF8F5] text-[#5C7470] rounded-full shadow-xs shrink-0">
                    {comm.species}
                  </span>
                </div>
                <p className="text-[11px] text-[#5C7470] truncate mt-0.5">
                  {comm.tagline}
                </p>
                <span className="text-[10px] text-[#5C7470]/70 font-semibold block mt-0.5">
                  {comm.membersCount.toLocaleString()}{' '}
                  {lang === 'es' ? 'miembros' : 'members'}
                </span>
              </div>
            </div>

            <button
              onClick={() => onToggleJoinCommunity(comm.id)}
              className={`text-xs font-bold px-4 py-2 rounded-full transition-all shrink-0 cursor-pointer flex items-center gap-1 shadow-xs ${
                comm.isJoined
                  ? 'bg-[#FAF8F5] hover:bg-neutral-100 text-[#204E4A]'
                  : 'bg-[#E1E53F] hover:bg-[#d8dc35] text-[#204E4A]'
              }`}
            >
              {comm.isJoined && <IconCheck size={13} />}
              <span>
                {comm.isJoined
                  ? lang === 'es'
                    ? 'Unido'
                    : 'Joined'
                  : lang === 'es'
                  ? 'Unirme'
                  : 'Join'}
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

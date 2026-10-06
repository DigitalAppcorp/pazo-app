import { useState } from 'react'
import type { Community } from '../../types/pazo'
import { IconExplore } from '../icons/PazoIcons'
import { ValidationInterestPanel } from '../validation/ValidationInterestPanel'

interface ExploreViewProps {
  communities: Community[]
  activePetId?: string | null
  canTrackValidation: boolean
  lang: 'es' | 'en'
}

const COMMUNITY_INTENTS = [
  {
    value: 'local_people_pets',
    es: 'Personas y mascotas de mi zona',
    en: 'People and pets near me',
  },
  {
    value: 'species_breed_groups',
    es: 'Grupos por especie o raza',
    en: 'Species or breed groups',
  },
  {
    value: 'create_community',
    es: 'Crear mi propia comunidad',
    en: 'Create my own community',
  },
  {
    value: 'meetups',
    es: 'Organizar o encontrar encuentros',
    en: 'Organize or find meetups',
  },
  {
    value: 'advice',
    es: 'Pedir o compartir consejos',
    en: 'Ask for or share advice',
  },
  {
    value: 'other',
    es: 'Otro',
    en: 'Other',
  },
]

export const ExploreView = ({
  communities,
  activePetId,
  canTrackValidation,
  lang,
}: ExploreViewProps) => {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCommunities = communities.filter(
    (community) =>
      community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      community.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      community.species.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4 animate-slide-up pb-6">
      <div className="space-y-1 px-1">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] bg-[#E1E53F] px-3 py-1 rounded-full inline-block shadow-xs">
          {lang === 'es' ? 'Vista previa' : 'Preview'}
        </span>
        <h2 className="text-2xl font-black text-[#204E4A] tracking-tight">
          {lang === 'es' ? 'Comunidades de Pazo' : 'Pazo Communities'}
        </h2>
        <p className="text-xs text-[#5C7470]">
          {lang === 'es'
            ? 'Estamos evaluando cómo debería funcionar este espacio antes de construirlo.'
            : 'We are evaluating how this space should work before building it.'}
        </p>
      </div>

      <ValidationInterestPanel
        moduleKey="communities"
        source="explore"
        activePetId={activePetId}
        canTrack={canTrackValidation}
        titleEs="¿Te gustaría usar Comunidades?"
        titleEn="Would you use Communities?"
        descriptionEs="Tu respuesta nos ayuda a decidir si este módulo merece entrar al MVP y qué parte debería construirse primero."
        descriptionEn="Your response helps us decide whether this module belongs in the MVP and what should be built first."
        intents={COMMUNITY_INTENTS}
        lang={lang}
      />

      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={
            lang === 'es'
              ? 'Filtrar ejemplos de comunidades...'
              : 'Filter community examples...'
          }
          className="w-full bg-white rounded-full pl-11 pr-4 py-3 text-xs text-[#204E4A] shadow-sm focus:bg-white"
        />
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5C7470] pointer-events-none">
          <IconExplore size={16} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <div>
            <h3 className="font-extrabold text-sm text-[#204E4A]">
              {lang === 'es'
                ? 'Ejemplos conceptuales'
                : 'Concept examples'}
            </h3>
            <p className="text-[10px] text-[#5C7470] mt-0.5">
              {lang === 'es'
                ? 'Estas comunidades todavía no están activas.'
                : 'These communities are not active yet.'}
            </p>
          </div>
          <span className="text-[10px] font-semibold text-[#5C7470]">
            {filteredCommunities.length}{' '}
            {lang === 'es' ? 'ejemplos' : 'examples'}
          </span>
        </div>

        {filteredCommunities.map((community) => (
          <div
            key={community.id}
            className="p-4 bg-white rounded-[2rem] shadow-[0_3px_16px_rgba(32,78,74,0.04)] flex gap-3.5 items-center"
          >
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-xs shrink-0">
              <img
                src={community.photoUrl}
                alt={community.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h4 className="font-extrabold text-xs text-[#204E4A] truncate">
                  {community.name}
                </h4>
                <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-[#FAF8F5] text-[#5C7470] rounded-full shadow-xs shrink-0">
                  {community.species}
                </span>
              </div>
              <p className="text-[11px] text-[#5C7470] line-clamp-2 mt-0.5">
                {community.tagline}
              </p>
            </div>

            <span className="text-[9px] font-black uppercase tracking-wide text-[#204E4A] bg-[#E1E53F]/35 px-2.5 py-1 rounded-full shrink-0">
              {lang === 'es' ? 'Concepto' : 'Concept'}
            </span>
          </div>
        ))}

        {filteredCommunities.length === 0 && (
          <div className="rounded-[1.5rem] bg-white p-5 text-center text-xs text-[#5C7470] border border-[#204E4A]/8">
            {lang === 'es'
              ? 'No hay ejemplos que coincidan con ese filtro.'
              : 'No examples match that filter.'}
          </div>
        )}
      </div>
    </div>
  )
}

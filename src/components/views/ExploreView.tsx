import { useState } from 'react'
import type { Community } from '../../types/pazo'
import { IconExplore } from '../icons/PazoIcons'
import { ValidationInterestPanel } from '../validation/ValidationInterestPanel'

interface ExploreViewProps {
  communities: Community[]
  canTrackValidation: boolean
  lang: 'es' | 'en'
}

type ExploreCategory = 'para_ti' | 'comunidades' | 'eventos'

export const ExploreView = ({
  communities,
  canTrackValidation,
  lang,
}: ExploreViewProps) => {
  const [activeCategory, setActiveCategory] = useState<ExploreCategory>('para_ti')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCommunities = communities.filter(
    (community) =>
      community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      community.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      community.species.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const intentOptions = lang === 'es'
    ? [
        { key: 'similar_people_pets', label: 'Encontrar personas y mascotas como las mías' },
        { key: 'advice', label: 'Resolver dudas y compartir consejos' },
        { key: 'plans_events_challenges', label: 'Encontrar planes, caminatas, eventos o retos' },
        { key: 'create_grow_community', label: 'Crear y hacer crecer mi propia comunidad' },
        { key: 'recognition_badges', label: 'Ganar y mostrar reconocimiento o insignias' },
        { key: 'other', label: 'Otro' },
      ]
    : [
        { key: 'similar_people_pets', label: 'Find people and pets like mine' },
        { key: 'advice', label: 'Solve questions and share advice' },
        { key: 'plans_events_challenges', label: 'Find plans, walks, events, or challenges' },
        { key: 'create_grow_community', label: 'Create and grow my own community' },
        { key: 'recognition_badges', label: 'Earn and show recognition or badges' },
        { key: 'other', label: 'Other' },
      ]

  const communityUses = lang === 'es'
    ? [
        ['Conecta con gente como tú', 'Grupos por zona, especie, raza, intereses o experiencias compartidas.'],
        ['Pregunta y comparte', 'Resuelve dudas y comparte consejos útiles con otros dueños.'],
        ['Haz planes juntos', 'Caminatas, encuentros, eventos o retos con tu comunidad.'],
        ['Construye reconocimiento', 'Roles, aportes e insignias que podrían mostrarse en el perfil de tu mascota.'],
        ['Crea tu propio grupo', 'Si no existe, cualquier usuario podría crearlo y administrar lo básico gratis.'],
      ]
    : [
        ['Connect with people like you', 'Groups by area, species, breed, interests, or shared experiences.'],
        ['Ask and share', 'Solve questions and share useful advice with other owners.'],
        ['Make plans together', 'Walks, meetups, events, or challenges with your community.'],
        ['Build recognition', 'Roles, contributions, and badges that could appear on your pet profile.'],
        ['Create your own group', 'If it does not exist, any user could create it and manage the basics for free.'],
      ]

  return (
    <div className="space-y-4 animate-slide-up pb-8">
      <section className="space-y-2 px-1">
        <span className="inline-flex rounded-full bg-[#E1E53F] px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#204E4A] shadow-xs">
          {lang === 'es' ? 'Descubrimiento' : 'Discovery'}
        </span>

        <h2 className="text-[2rem] leading-none font-black tracking-tight text-[#204E4A]">
          {lang === 'es' ? 'Encuentra a los tuyos.' : 'Find your crowd.'}
        </h2>

        <p className="max-w-xl text-xs leading-relaxed text-[#5C7470]">
          {lang === 'es'
            ? 'Descubre mascotas, comunidades, eventos y nuevas experiencias dentro de PAZO.'
            : 'Discover pets, communities, events and new experiences across PAZO.'}
        </p>
      </section>

      <div className="relative pt-1">
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={
            lang === 'es'
              ? 'Mascotas, comunidades, eventos...'
              : 'Pets, communities, events...'
          }
          className="w-full rounded-full bg-white py-3.5 pl-11 pr-4 text-xs text-[#204E4A] shadow-sm outline-none placeholder:text-[#8FA09D] focus:ring-2 focus:ring-[#E1E53F]/70"
        />
        <div className="pointer-events-none absolute left-3.5 top-1/2 translate-y-[-35%] text-[#5C7470]">
          <IconExplore size={17} />
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {([
          ['para_ti', lang === 'es' ? 'Para ti' : 'For you'],
          ['comunidades', lang === 'es' ? 'Comunidades' : 'Communities'],
          ['eventos', lang === 'es' ? 'Eventos' : 'Events'],
        ] as Array<[ExploreCategory, string]>).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveCategory(key)}
            className={
              'shrink-0 rounded-full px-4 py-2.5 text-xs font-extrabold shadow-xs transition-all cursor-pointer ' +
              (activeCategory === key
                ? 'bg-[#204E4A] text-[#E1E53F]'
                : 'bg-white text-[#5C7470] hover:bg-neutral-50')
            }
          >
            {label}
          </button>
        ))}
      </nav>

      {activeCategory === 'para_ti' && (
        <div className="space-y-5">
          <section className="rounded-[2.2rem] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[#FAF8F5]">
                <img
                  src="https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?q=80&w=200&auto=format&fit=crop"
                  alt="Nube"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-black text-[#204E4A]">Nube</span>
                  <span className="shrink-0 rounded-full bg-[#FAF8F5] px-2.5 py-1 text-[9px] font-bold text-[#204E4A]">
                    {lang === 'es' ? 'Conejo • LA' : 'Rabbit • LA'}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] text-[#5C7470]">
                  {lang === 'es'
                    ? 'Explora rincones tranquilos en compañía.'
                    : 'Loves calm spots and friendly company.'}
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-[#FAF8F5] px-4 py-2 text-[10px] font-extrabold text-[#204E4A]">
                {lang === 'es' ? 'Vista demo' : 'Demo view'}
              </span>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-black text-[#204E4A]">
                {lang === 'es' ? 'Comunidades sugeridas' : 'Suggested communities'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveCategory('comunidades')}
                className="text-[10px] font-extrabold text-[#204E4A] cursor-pointer"
              >
                {lang === 'es' ? 'Ver todas' : 'See all'}
              </button>
            </div>

            <div className="space-y-3">
              {filteredCommunities.slice(0, 3).map((community) => (
                <button
                  key={community.id}
                  type="button"
                  onClick={() => setActiveCategory('comunidades')}
                  className="w-full rounded-[2rem] bg-white p-4 text-left shadow-sm transition-all hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[#FAF8F5]">
                      <img
                        src={community.photoUrl}
                        alt={community.name}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate text-xs font-black text-[#204E4A]">
                          {community.name}
                        </h4>
                        <span className="shrink-0 rounded-full bg-[#FAF8F5] px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-[#5C7470]">
                          {community.species}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#5C7470]">
                        {community.tagline}
                      </p>
                      <span className="mt-1.5 block text-[9px] font-bold text-[#204E4A]/55">
                        {lang === 'es' ? 'Vista previa conceptual' : 'Concept preview'}
                      </span>
                    </div>

                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E1E53F] text-lg font-black text-[#204E4A]">
                      ›
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-sm">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#5C7470]">
              {lang === 'es' ? 'También en Explorar' : 'Also in Explore'}
            </span>
            <h3 className="mt-1 text-sm font-black text-[#204E4A]">
              {lang === 'es' ? 'Personas, mascotas y eventos' : 'People, pets and events'}
            </h3>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#5C7470]">
              {lang === 'es'
                ? 'Explorar seguirá creciendo como el hub para descubrir nuevas conexiones y experiencias de PAZO.'
                : 'Explore will keep growing as the hub for discovering new PAZO connections and experiences.'}
            </p>
          </section>
        </div>
      )}

      {activeCategory === 'comunidades' && (
        <div className="space-y-5">
          <section className="rounded-[2.2rem] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-[#FAF8F5] px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest text-[#5C7470]">
                {lang === 'es' ? 'Vista previa · aún no activa' : 'Preview · not live yet'}
              </span>
            </div>

            <h3 className="mt-3 text-xl font-black text-[#204E4A]">
              {lang === 'es' ? 'Comunidades en PAZO' : 'Communities in PAZO'}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-[#5C7470]">
              {lang === 'es'
                ? 'Espacios creados por usuarios para reunir personas y mascotas que comparten una zona, especie, raza, actividad, duda o interés.'
                : 'Spaces created by users to bring together people and pets who share an area, species, breed, activity, question, or interest.'}
            </p>
          </section>

          <section className="space-y-3">
            <div className="px-1">
              <h3 className="text-sm font-black text-[#204E4A]">
                {lang === 'es' ? 'Ejemplos de comunidades' : 'Community examples'}
              </h3>
              <p className="mt-1 text-[10px] text-[#5C7470]">
                {lang === 'es'
                  ? 'Son ejemplos para visualizar la idea. No son grupos activos ni tienen miembros reales.'
                  : 'These examples only help visualize the idea. They are not live groups and have no real members.'}
              </p>
            </div>

            <div className="space-y-3">
              {filteredCommunities.slice(0, 3).map((community) => (
                <article
                  key={community.id}
                  className="rounded-[2rem] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[#FAF8F5]">
                      <img
                        src={community.photoUrl}
                        alt={community.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate text-xs font-black text-[#204E4A]">
                          {community.name}
                        </h4>
                        <span className="rounded-full bg-[#FAF8F5] px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-[#5C7470]">
                          {community.species}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#5C7470]">
                        {community.tagline}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="px-1">
              <h3 className="text-sm font-black text-[#204E4A]">
                {lang === 'es' ? '¿Qué podrías hacer dentro?' : 'What could you do inside?'}
              </h3>
            </div>

            <div className="grid gap-3">
              {communityUses.map(([title, body], index) => (
                <div
                  key={title}
                  className="rounded-[1.8rem] bg-white p-4 shadow-sm"
                >
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#204E4A] text-[10px] font-black text-[#E1E53F]">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-[#204E4A]">{title}</h4>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#5C7470]">{body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <ValidationInterestPanel
            moduleKey="communities"
            source="explore_communities"
            canTrack={canTrackValidation}
            intentQuestion={
              lang === 'es'
                ? '¿Qué haría que volvieras más a Comunidades?'
                : 'What would make you come back to Communities more often?'
            }
            intentOptions={intentOptions}
            lang={lang}
          />
        </div>
      )}

      {activeCategory === 'eventos' && (
        <section className="rounded-[2.2rem] bg-white p-5 shadow-sm">
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#5C7470]">
            {lang === 'es' ? 'Próximamente' : 'Coming later'}
          </span>
          <h3 className="mt-1 text-base font-black text-[#204E4A]">
            {lang === 'es' ? 'Eventos y actividades' : 'Events and activities'}
          </h3>
          <p className="mt-2 text-[11px] leading-relaxed text-[#5C7470]">
            {lang === 'es'
              ? 'Explorar será también el lugar para encontrar planes, encuentros y actividades cuando ese módulo pase su propia validación.'
              : 'Explore will also be the place to find plans, meetups, and activities once that module passes its own validation.'}
          </p>
        </section>
      )}
    </div>
  )
}

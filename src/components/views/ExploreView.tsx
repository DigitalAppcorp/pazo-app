import { useState } from 'react'
import type { Community } from '../../types/pazo'
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
        {
          title: 'Conecta con gente como tú',
          body: 'Encuentra grupos por zona, especie, raza, intereses o situaciones que compartes con tu mascota.',
        },
        {
          title: 'Pregunta y comparte',
          body: 'Resuelve dudas, comparte experiencias y encuentra consejos útiles de otros dueños.',
        },
        {
          title: 'Haz planes juntos',
          body: 'Organiza caminatas, encuentros, eventos o retos con personas de tu comunidad.',
        },
        {
          title: 'Construye reconocimiento',
          body: 'Roles, aportes e insignias podrían formar parte de la identidad de tu mascota en PAZO.',
        },
        {
          title: 'Crea tu propio grupo',
          body: 'Si no existe la comunidad que buscas, cualquier usuario podría crearla y administrar lo básico gratis.',
        },
      ]
    : [
        {
          title: 'Connect with people like you',
          body: 'Find groups by area, species, breed, interests, or situations you share with your pet.',
        },
        {
          title: 'Ask and share',
          body: 'Solve questions, share experiences, and find useful advice from other owners.',
        },
        {
          title: 'Make plans together',
          body: 'Organize walks, meetups, events, or challenges with people in your community.',
        },
        {
          title: 'Build recognition',
          body: 'Roles, contributions, and badges could become part of your pet identity in PAZO.',
        },
        {
          title: 'Create your own group',
          body: 'If the community you want does not exist, any user could create it and manage the basics for free.',
        },
      ]

  return (
    <div className="space-y-4 animate-slide-up pb-8">
      <header className="space-y-1 px-1">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] bg-[#E1E53F] px-3 py-1 rounded-full inline-block shadow-xs">
          {lang === 'es' ? 'Explorar' : 'Explore'}
        </span>
        <h2 className="text-2xl font-black text-[#204E4A] tracking-tight">
          {lang === 'es' ? 'Descubre más de PAZO' : 'Discover more of PAZO'}
        </h2>
        <p className="text-xs text-[#5C7470] leading-relaxed">
          {lang === 'es'
            ? 'Busca mascotas, comunidades, eventos y otras experiencias dentro de PAZO.'
            : 'Find pets, communities, events, and other experiences across PAZO.'}
        </p>
      </header>

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
              'text-xs font-bold px-4 py-2 rounded-full transition-all cursor-pointer shrink-0 ' +
              (activeCategory === key
                ? 'bg-[#204E4A] text-[#E1E53F] shadow-sm'
                : 'bg-white text-[#5C7470] hover:bg-neutral-50 shadow-xs')
            }
          >
            {label}
          </button>
        ))}
      </nav>

      {activeCategory === 'para_ti' && (
        <div className="space-y-4">
          <section className="grid gap-3">
            <button
              type="button"
              onClick={() => setActiveCategory('comunidades')}
              className="w-full text-left bg-white rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[9px] uppercase tracking-widest font-extrabold text-[#5C7470]">
                    {lang === 'es' ? 'En evaluación' : 'Under evaluation'}
                  </span>
                  <h3 className="text-base font-black text-[#204E4A] mt-1">
                    {lang === 'es' ? 'Comunidades' : 'Communities'}
                  </h3>
                  <p className="text-[11px] text-[#5C7470] leading-relaxed mt-1.5">
                    {lang === 'es'
                      ? 'Grupos creados alrededor de zonas, tipos de mascota, intereses y experiencias compartidas.'
                      : 'Groups built around areas, pet types, interests, and shared experiences.'}
                  </p>
                </div>
                <span className="w-9 h-9 rounded-full bg-[#E1E53F] text-[#204E4A] flex items-center justify-center font-black shrink-0">
                  ›
                </span>
              </div>
            </button>

            <div className="bg-white rounded-[2rem] p-5 shadow-sm">
              <span className="text-[9px] uppercase tracking-widest font-extrabold text-[#5C7470]">
                {lang === 'es' ? 'Descubrimiento social' : 'Social discovery'}
              </span>
              <h3 className="text-base font-black text-[#204E4A] mt-1">
                {lang === 'es' ? 'Personas y mascotas' : 'People and pets'}
              </h3>
              <p className="text-[11px] text-[#5C7470] leading-relaxed mt-1.5">
                {lang === 'es'
                  ? 'Explorar también será el punto de entrada para descubrir perfiles y nuevas conexiones.'
                  : 'Explore will also be the entry point for discovering profiles and new connections.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveCategory('eventos')}
              className="w-full text-left bg-white rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <span className="text-[9px] uppercase tracking-widest font-extrabold text-[#5C7470]">
                {lang === 'es' ? 'Próximamente' : 'Coming later'}
              </span>
              <h3 className="text-base font-black text-[#204E4A] mt-1">
                {lang === 'es' ? 'Eventos y actividades' : 'Events and activities'}
              </h3>
              <p className="text-[11px] text-[#5C7470] leading-relaxed mt-1.5">
                {lang === 'es'
                  ? 'Planes, encuentros y actividades podrán descubrirse desde este mismo hub cuando el módulo correspondiente esté listo.'
                  : 'Plans, meetups, and activities can live in this same hub when that module is ready.'}
              </p>
            </button>
          </section>
        </div>
      )}

      {activeCategory === 'comunidades' && (
        <div className="space-y-5">
          <section className="rounded-[2.3rem] bg-white p-5 shadow-sm overflow-hidden relative">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#E1E53F]/25 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <span className="text-[9px] uppercase tracking-widest font-extrabold text-[#5C7470]">
                {lang === 'es' ? 'Vista previa · aún no activa' : 'Preview · not live yet'}
              </span>
              <h3 className="text-xl font-black text-[#204E4A] mt-1.5">
                {lang === 'es' ? '¿Qué serían las Comunidades?' : 'What would Communities be?'}
              </h3>
              <p className="text-xs text-[#5C7470] leading-relaxed mt-2">
                {lang === 'es'
                  ? 'Espacios creados por usuarios de PAZO para reunir personas y mascotas que comparten una zona, una raza, una especie, una actividad, una duda o un interés.'
                  : 'Spaces created by PAZO users to bring together people and pets who share an area, breed, species, activity, question, or interest.'}
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <div className="px-1">
              <h3 className="text-sm font-black text-[#204E4A]">
                {lang === 'es' ? '¿Qué podrías hacer dentro?' : 'What could you do inside?'}
              </h3>
            </div>

            <div className="grid gap-3">
              {communityUses.map((item, index) => (
                <div
                  key={item.title}
                  className="bg-white rounded-[1.8rem] p-4 shadow-sm flex gap-3 items-start"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#204E4A] text-[#E1E53F] flex items-center justify-center text-[10px] font-black shrink-0">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#204E4A]">{item.title}</h4>
                    <p className="text-[11px] text-[#5C7470] leading-relaxed mt-1">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="px-1">
              <h3 className="text-sm font-black text-[#204E4A]">
                {lang === 'es' ? 'Ejemplos de comunidades posibles' : 'Examples of possible communities'}
              </h3>
              <p className="text-[10px] text-[#5C7470] mt-1">
                {lang === 'es'
                  ? 'Son ejemplos para entender la idea. No son grupos activos ni tienen miembros reales.'
                  : 'These are concept examples only. They are not live groups and do not have real members.'}
              </p>
            </div>

            <div className="grid gap-3">
              {communities.slice(0, 3).map((community) => (
                <article
                  key={community.id}
                  className="bg-white rounded-[2rem] p-4 shadow-sm flex items-center gap-3"
                >
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#FAF8F5] shrink-0">
                    <img
                      src={community.photoUrl}
                      alt={community.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-[#204E4A]">{community.name}</h4>
                    <p className="text-[11px] text-[#5C7470] mt-1 leading-relaxed">
                      {community.tagline}
                    </p>
                  </div>
                </article>
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
        <section className="bg-white rounded-[2rem] p-5 shadow-sm">
          <span className="text-[9px] uppercase tracking-widest font-extrabold text-[#5C7470]">
            {lang === 'es' ? 'En preparación' : 'In preparation'}
          </span>
          <h3 className="text-base font-black text-[#204E4A] mt-1">
            {lang === 'es' ? 'Eventos y actividades' : 'Events and activities'}
          </h3>
          <p className="text-[11px] text-[#5C7470] leading-relaxed mt-2">
            {lang === 'es'
              ? 'Explorar seguirá siendo el lugar donde aparecerán eventos cuando esa experiencia pase su propio proceso de validación e implementación.'
              : 'Explore will remain the place where events appear after that experience passes its own validation and implementation process.'}
          </p>
        </section>
      )}
    </div>
  )
}

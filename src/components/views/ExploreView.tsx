import type { Community } from '../../types/pazo'
import { ValidationInterestPanel } from '../validation/ValidationInterestPanel'

interface ExploreViewProps {
  communities: Community[]
  canTrackValidation: boolean
  lang: 'es' | 'en'
}

export const ExploreView = ({
  communities,
  canTrackValidation,
  lang,
}: ExploreViewProps) => {
  const pillars = lang === 'es'
    ? [
        {
          title: 'Encuentra a los tuyos',
          body: 'Grupos por zona, especie, raza, intereses o situaciones compartidas.',
        },
        {
          title: 'Aprende y ayuda',
          body: 'Pregunta, comparte consejos y encuentra respuestas útiles de otros dueños.',
        },
        {
          title: 'Haz cosas juntos',
          body: 'Caminatas, encuentros, actividades y retos que den motivos para volver.',
        },
        {
          title: 'Construye identidad',
          body: 'Reconocimiento, roles e insignias que puedan formar parte del perfil de tu mascota.',
        },
        {
          title: 'Crea y lidera',
          body: 'Si el grupo que buscas no existe, podrías crear el tuyo y administrarlo de forma básica gratis.',
        },
      ]
    : [
        {
          title: 'Find your crowd',
          body: 'Groups by area, species, breed, interests, or shared situations.',
        },
        {
          title: 'Learn and help',
          body: 'Ask questions, share advice, and find useful answers from other pet owners.',
        },
        {
          title: 'Do things together',
          body: 'Walks, meetups, activities, and challenges that create reasons to come back.',
        },
        {
          title: 'Build identity',
          body: 'Recognition, roles, and badges that can become part of your pet profile.',
        },
        {
          title: 'Create and lead',
          body: 'If the group you want does not exist, you could create it and manage the basics for free.',
        },
      ]

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

  const examples = communities.slice(0, 3)

  return (
    <div className="space-y-5 animate-slide-up pb-8">
      <section className="rounded-[2.4rem] bg-white p-5 shadow-sm overflow-hidden relative">
        <div className="absolute -right-12 -top-12 w-36 h-36 bg-[#E1E53F]/25 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] bg-[#E1E53F] px-3 py-1 rounded-full inline-block">
            {lang === 'es' ? 'Función en evaluación' : 'Feature under evaluation'}
          </span>

          <div>
            <h2 className="text-2xl font-black text-[#204E4A] tracking-tight leading-tight">
              {lang === 'es'
                ? 'Tu mascota también puede encontrar su lugar.'
                : 'Your pet can find their place too.'}
            </h2>
            <p className="text-xs text-[#5C7470] leading-relaxed mt-2 max-w-lg">
              {lang === 'es'
                ? 'Comunidades para conectar con personas y mascotas afines, aprender, organizar planes y construir una identidad que crece con tu participación.'
                : 'Communities to connect with like-minded people and pets, learn, organize plans, and build an identity that grows with participation.'}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="px-1">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#5C7470]">
            {lang === 'es' ? 'Lo que podría ofrecer' : 'What it could offer'}
          </p>
        </div>

        <div className="grid gap-3">
          {pillars.map((pillar, index) => (
            <div
              key={pillar.title}
              className="bg-white rounded-[1.9rem] p-4 shadow-sm flex gap-3.5 items-start"
            >
              <div className="w-9 h-9 rounded-2xl bg-[#204E4A] text-[#E1E53F] flex items-center justify-center text-[11px] font-black shrink-0">
                {String(index + 1).padStart(2, '0')}
              </div>
              <div>
                <h3 className="text-xs font-black text-[#204E4A]">{pillar.title}</h3>
                <p className="text-[11px] text-[#5C7470] leading-relaxed mt-1">
                  {pillar.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="px-1 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#5C7470]">
              {lang === 'es' ? 'Ejemplos conceptuales' : 'Concept examples'}
            </p>
            <h3 className="text-sm font-black text-[#204E4A] mt-1">
              {lang === 'es' ? 'Así podrían sentirse algunos grupos' : 'How some groups could feel'}
            </h3>
          </div>
          <span className="text-[9px] font-bold text-[#5C7470] bg-white px-2.5 py-1 rounded-full shadow-xs shrink-0">
            {lang === 'es' ? 'Aún no activos' : 'Not active yet'}
          </span>
        </div>

        <div className="grid gap-3">
          {examples.map((community) => (
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

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-[#204E4A] truncate">
                    {community.name}
                  </h4>
                  <span className="text-[8px] font-extrabold uppercase tracking-wide text-[#5C7470] bg-[#FAF8F5] px-2 py-0.5 rounded-full shrink-0">
                    {community.species}
                  </span>
                </div>
                <p className="text-[11px] text-[#5C7470] mt-1 line-clamp-2">
                  {community.tagline}
                </p>
                <p className="text-[9px] font-semibold text-[#204E4A]/60 mt-1.5">
                  {lang === 'es'
                    ? 'Ejemplo para visualizar la idea, no una comunidad real.'
                    : 'Concept example only, not a live community.'}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <ValidationInterestPanel
        moduleKey="communities"
        source="explore"
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
  )
}

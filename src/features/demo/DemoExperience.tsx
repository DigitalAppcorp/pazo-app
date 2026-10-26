import { useState } from 'react'
import { INITIAL_COMMUNITIES, INITIAL_PETS } from '../../data/mockData'
import type { Pet } from '../../types/pazo'

type Language = 'es' | 'en'

export const DemoBanner = ({
  lang, onCreateAccount, onExit,
}: {
  lang: Language
  onCreateAccount: () => void
  onExit: () => void
}) => (
  <section aria-label={lang === 'es' ? 'Demostración de PAZO' : 'PAZO demonstration'}
    className="mx-4 mt-2 shrink-0 rounded-[1.3rem] bg-[#EAF0DE] px-3.5 py-2.5 text-[#204E4A]">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="min-w-[120px] flex-1 text-[12px] leading-snug">
        <span className="font-extrabold">{lang === 'es' ? 'Modo demo.' : 'Demo mode.'}</span>{' '}
        {lang === 'es'
          ? 'Estos son ejemplos; tus cambios no se guardan.'
          : 'These are examples; your changes are not saved.'}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={onCreateAccount}
          className="min-h-10 rounded-full bg-[#204E4A] px-3 text-[12px] font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          {lang === 'es' ? 'Crear cuenta' : 'Sign up'}
        </button>
        <button type="button" onClick={onExit}
          className="min-h-10 rounded-full px-2 text-[12px] font-bold text-[#204E4A] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          {lang === 'es' ? 'Salir' : 'Exit'}
        </button>
      </div>
    </div>
  </section>
)

export const DemoCommunities = ({ lang, onCreateAccount }: {
  lang: Language
  onCreateAccount: () => void
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  return (
    <section className="space-y-3 pb-7">
      <h2 className="px-1 text-2xl font-black tracking-tight text-[#204E4A]">
        {lang === 'es' ? 'Descubre comunidades.' : 'Discover communities.'}
      </h2>
      <p className="px-1 text-[13px] leading-relaxed text-[#5C7470]">
        {lang === 'es'
          ? 'Comunidades ilustrativas para conocer el recorrido. No representan miembros ni grupos reales.'
          : 'Sample communities to explore the experience. These are not real groups or member counts.'}
      </p>
      {INITIAL_COMMUNITIES.map((community) => (
        <article key={community.id} className="overflow-hidden rounded-[1.7rem] bg-white shadow-sm">
          <button type="button" onClick={() => setSelectedId(selectedId === community.id ? null : community.id)}
            aria-expanded={selectedId === community.id}
            className="flex min-h-[76px] w-full items-center gap-3 p-3 text-left focus-visible:outline focus-visible:outline-2">
            <img src={community.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover"/>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-extrabold text-[#204E4A]">{community.name}</span>
              <span className="mt-1 block text-[12px] text-[#5C7470]">
                {lang === 'es' ? 'Comunidad de ejemplo' : 'Sample community'}
              </span>
            </span>
            <span aria-hidden="true" className="text-xl text-[#204E4A]">{selectedId === community.id ? '−' : '+'}</span>
          </button>
          {selectedId === community.id && (
            <div className="space-y-3 px-4 pb-4">
              <p className="text-[13px] leading-relaxed text-[#5C7470]">{community.tagline}</p>
              <button type="button" onClick={onCreateAccount}
                className="min-h-11 rounded-full bg-[#E1E53F] px-5 text-[13px] font-extrabold text-[#204E4A]">
                {lang === 'es' ? 'Crear cuenta para unirme' : 'Sign up to join'}
              </button>
            </div>
          )}
        </article>
      ))}
    </section>
  )
}

export const DemoExplore = ({
  lang, onSelectPet, onOpenCommunities, onOpenPlaces,
}: {
  lang: Language
  onSelectPet: (pet: Pet) => void
  onOpenCommunities: () => void
  onOpenPlaces: () => void
}) => {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLocaleLowerCase()
  const pets = INITIAL_PETS.filter((pet) =>
    [pet.name, pet.species, pet.bio ?? ''].some((value) => value.toLocaleLowerCase().includes(needle))
  )
  const communities = INITIAL_COMMUNITIES.filter((community) =>
    [community.name, community.tagline, community.species].some((value) =>
      value.toLocaleLowerCase().includes(needle)
    )
  )
  return (
    <section className="space-y-4 pb-7">
      <h2 className="text-2xl font-black text-[#204E4A]">
        {lang === 'es' ? 'Explora PAZO.' : 'Explore PAZO.'}
      </h2>
      <p className="text-[13px] text-[#5C7470]">
        {lang === 'es'
          ? 'Busca entre mascotas y comunidades de ejemplo, o abre el mapa.'
          : 'Search sample pets and communities, or open the map.'}
      </p>
      <label htmlFor="pazo-demo-search" className="block text-[13px] font-bold text-[#204E4A]">
        {lang === 'es' ? 'Buscar ejemplos' : 'Search examples'}
      </label>
      <input id="pazo-demo-search" type="search" value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={lang === 'es' ? 'Mascota o comunidad' : 'Pet or community'}
        className="min-h-12 w-full rounded-2xl bg-white px-4 text-[14px] text-[#204E4A] focus-visible:outline focus-visible:outline-2"/>
      <div className="space-y-2">
        {pets.map((pet) => (
          <button type="button" key={pet.id} onClick={() => onSelectPet(pet)}
            className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-white p-3 text-left">
            <img src={pet.photoUrl} alt="" className="h-10 w-10 rounded-full object-cover"/>
            <span className="text-[13px] font-bold text-[#204E4A]">{pet.name}</span>
            <span className="ml-auto text-[12px] text-[#5C7470]">{lang === 'es' ? 'Ejemplo' : 'Sample'}</span>
          </button>
        ))}
        {communities.map((community) => (
          <button type="button" key={community.id} onClick={onOpenCommunities}
            className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-white p-3 text-left">
            <img src={community.photoUrl} alt="" className="h-10 w-10 rounded-2xl object-cover"/>
            <span className="text-[13px] font-bold text-[#204E4A]">{community.name}</span>
            <span className="ml-auto text-[12px] text-[#5C7470]">{lang === 'es' ? 'Ejemplo' : 'Sample'}</span>
          </button>
        ))}
        {pets.length === 0 && communities.length === 0 && (
          <p role="status" className="rounded-2xl bg-white p-4 text-[13px] text-[#5C7470]">
            {lang === 'es' ? 'No hay ejemplos con ese nombre.' : 'No matching examples.'}
          </p>
        )}
      </div>
      <button type="button" onClick={onOpenPlaces}
        className="min-h-12 w-full rounded-full bg-[#204E4A] px-4 text-[14px] font-extrabold text-white">
        {lang === 'es' ? 'Explorar lugares en el mapa' : 'Explore places on the map'}
      </button>
    </section>
  )
}

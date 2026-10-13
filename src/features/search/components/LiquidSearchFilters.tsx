import { useLayoutEffect, useRef, useState } from 'react'
import type { SearchFilter } from '../types'

interface Props {
  filter: SearchFilter
  lang: 'es' | 'en'
  onChange: (next: SearchFilter) => void
}

type Geometry = { left: number; width: number }

const CHOICES: ReadonlyArray<{ id: SearchFilter; es: string; en: string }> = [
  {id: 'all', es: 'Todos', en: 'All'},
  {id: 'pet', es: 'Mascotas', en: 'Pets'},
  {id: 'community', es: 'Comunidades', en: 'Communities'},
  {id: 'place', es: 'Lugares', en: 'Places'},
]

/** The selected pill travels WITH the horizontally scrolling chips, not over the viewport.
 *  Actual tab widths differ by language and viewport; never hardcode step distances. */
export const LiquidSearchFilters = ({ filter, lang, onChange }: Props) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const buttonsRef = useRef<Partial<Record<SearchFilter, HTMLButtonElement | null>>>({})
  const [geometry, setGeometry] = useState<Geometry | null>(null)

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return

    const update = () => {
      const selected = buttonsRef.current[filter]
      if (!selected) return
      const next = { left: selected.offsetLeft, width: selected.offsetWidth }
      setGeometry(prev => prev?.left === next.left && prev.width === next.width ? prev : next)
    }
    update()

    // Labels, font load and responsive widths can all change the chip positions.
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    if (observer) {
      observer.observe(track)
      for (const button of Object.values(buttonsRef.current)) if (button) observer.observe(button)
    }
    if (typeof window !== 'undefined') window.addEventListener('resize', update)
    return () => {
      observer?.disconnect()
      if (typeof window !== 'undefined') window.removeEventListener('resize', update)
    }
  }, [filter, lang])

  return (
    <div className="mt-3 overflow-x-auto pb-1">
      <div ref={trackRef} role="group"
        aria-label={lang === 'es' ? 'Filtrar búsqueda' : 'Filter search'}
        className="relative flex w-max min-w-full gap-2"
      >
        {geometry && (
          <span aria-hidden="true" className="pazo-search-filter-indicator pointer-events-none"
            style={{ width: geometry.width, transform: `translate3d(${geometry.left}px, 0, 0)` }}
          />
        )}
        {CHOICES.map(choice => {
          const selected = filter === choice.id
          return (
            <button
              key={choice.id}
              ref={node => { buttonsRef.current[choice.id] = node }}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(choice.id)}
              className={'relative z-10 shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors focus-visible:bg-[#E1E53F]/25 ' +
                (selected
                  ? (geometry ? 'text-[#E1E53F]' : 'bg-[#204E4A] text-[#E1E53F]')
                  : 'bg-[#FAF8F5] text-[#5C7470]')}
            >
              {choice[lang]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

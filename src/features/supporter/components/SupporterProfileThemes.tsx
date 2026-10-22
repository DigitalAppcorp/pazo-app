import type { CSSProperties } from 'react'

// F16 discovery-only visuals. Never infer paid membership from this local selector state.
export const SUPPORTER_PROFILE_THEMES = [
  {
    id: 'classic', labelEs: 'Clásico PAZO', labelEn: 'Classic PAZO',
    swatch: '#F4DDBE', ink: '#C28D58',
    surface: 'linear-gradient(135deg, #FFF2DF 0%, #F2D5B2 60%, #F7E8D6 100%)',
  },
  {
    id: 'nature', labelEs: 'Naturaleza', labelEn: 'Nature',
    swatch: '#BDDCC2', ink: '#5B9B70',
    surface: 'linear-gradient(130deg, #E9F3E0 0%, #BBDCBF 57%, #E6EFCF 100%)',
  },
  {
    id: 'hearts', labelEs: 'Corazones', labelEn: 'Hearts',
    swatch: '#F7C9D8', ink: '#E9819E',
    surface: 'linear-gradient(135deg, #FFF0F1 0%, #F7C9D8 57%, #FFE4CE 100%)',
  },
  {
    id: 'stars', labelEs: 'Cielo estrellado', labelEn: 'Starry sky',
    swatch: '#24366D', ink: '#F5E4A5',
    surface: 'linear-gradient(135deg, #1B2D5C 0%, #405A8C 64%, #798AB0 100%)',
  },
  {
    id: 'adventure', labelEs: 'Aventura', labelEn: 'Adventure',
    swatch: '#9CE1E5', ink: '#2D9BA5',
    surface: 'linear-gradient(135deg, #BEEEF0 0%, #8CD3DB 60%, #DFF3E6 100%)',
  },
] as const

export type SupporterProfileThemeId = typeof SUPPORTER_PROFILE_THEMES[number]['id']
export type SupporterProfileThemeSelection = SupporterProfileThemeId | null

// Stagger and phase-offset a quiet 2-axis float. Positions/rotations stay fixed on
// their outer wrappers so movement never shifts the real pet identity or layout.
const decorativePositions = [
  { left: '73%', top: '12%', width: 66, rotation: -18, opacity: 0.75, duration: '6.8s', delay: '-1.5s' },
  { left: '14%', top: '29%', width: 38, rotation: 16, opacity: 0.42, duration: '7.6s', delay: '-4.2s' },
  { left: '89%', top: '51%', width: 52, rotation: 15, opacity: 0.6, duration: '5.9s', delay: '-2.7s' },
  { left: '51%', top: '8%', width: 28, rotation: -10, opacity: 0.5, duration: '8.2s', delay: '-5.3s' },
  { left: '59%', top: '58%', width: 24, rotation: 25, opacity: 0.25, duration: '7.1s', delay: '-0.6s' },
] as const

const ThemeDecoration = ({ theme, color }: { theme: SupporterProfileThemeId; color: string }) => {
  if (theme === 'nature') {
    return (
      <svg viewBox="0 0 100 100" fill={color} aria-hidden="true" className="h-full w-full">
        <path d="M17 82C16 37 47 11 86 10c-1 37-28 69-69 72Z" />
        <path d="M11 90 74 27" stroke="#F8FFF0" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".63" />
      </svg>
    )
  }
  if (theme === 'hearts') {
    return (
      <svg viewBox="0 0 100 100" fill={color} aria-hidden="true" className="h-full w-full">
        <path d="M50 88 14 54C-6 32 10 7 32 14c9 3 14 11 18 16 9-17 31-24 44-7 12 17 3 32-11 45L50 88Z" />
      </svg>
    )
  }
  if (theme === 'stars') {
    return (
      <svg viewBox="0 0 100 100" fill={color} aria-hidden="true" className="h-full w-full">
        <path d="m50 4 13 31 33 4-25 22 8 33-29-17-29 17 8-33L4 39l33-4L50 4Z" />
      </svg>
    )
  }
  if (theme === 'adventure') {
    return (
      <svg viewBox="0 0 100 100" fill={color} aria-hidden="true" className="h-full w-full">
        <path d="M8 83 40 29l16 25 9-16 28 45H8Z" />
        <path d="m29 47 11-18 11 18-11-7-11 7Z" fill="#F4FFFB" opacity=".8" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 100 100" fill={color} aria-hidden="true" className="h-full w-full">
      <ellipse cx="20" cy="32" rx="10" ry="15" transform="rotate(-24 20 32)" />
      <ellipse cx="42" cy="20" rx="10" ry="16" transform="rotate(-8 42 20)" />
      <ellipse cx="65" cy="24" rx="10" ry="16" transform="rotate(18 65 24)" />
      <ellipse cx="84" cy="42" rx="9" ry="14" transform="rotate(29 84 42)" />
      <path d="M18 77c-4-13 13-24 22-34 5-5 15-5 21 0 9 9 30 22 26 36-5 16-21 11-35 7-16-5-30 7-34-9Z" />
    </svg>
  )
}

export const SupporterProfileBackdrop = ({ theme }: { theme: SupporterProfileThemeId }) => {
  const variant = SUPPORTER_PROFILE_THEMES.find((v) => v.id === theme)
  if (!variant) return null
  const fade: CSSProperties = {
    background: variant.surface,
    maskImage: 'linear-gradient(to bottom, black 0%, black 51%, transparent 99%)',
    WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 51%, transparent 99%)',
  }

  return (
    <div
      aria-hidden="true"
      data-supporter-theme={theme}
      className="pointer-events-none absolute inset-x-0 top-0 h-[410px] overflow-hidden"
      style={fade}
    >
      <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/20 blur-[45px]" />
      {decorativePositions.map((spot, index) => (
        <span
          key={index}
          className="absolute block"
          style={{
            left: spot.left, top: spot.top, width: spot.width, height: spot.width,
            transform: 'rotate(' + spot.rotation + 'deg)',
            opacity: spot.opacity,
          }}
        >
          <span
            className="pazo-supporter-float block h-full w-full"
            style={{ animationDuration: spot.duration, animationDelay: spot.delay, animationDirection: index % 2 === 0 ? 'normal' : 'reverse' }}
          >
            <ThemeDecoration theme={theme} color={variant.ink} />
          </span>
        </span>
      ))}
      {theme === 'stars' && (
        <svg className="pazo-supporter-float absolute left-[9%] top-[12%] h-24 w-24 fill-[#F5E4A5]/85" style={{ animationDuration: '8.6s', animationDelay: '-3.1s' }} viewBox="0 0 100 100" aria-hidden="true">
          <path d="M68 10a37 37 0 1 0 23 64C48 84 27 35 68 10Z" />
        </svg>
      )}
      {theme === 'adventure' && (
        <>
        <svg className="pazo-supporter-float absolute bottom-[160px] right-[12%] h-[50px] w-[50px] fill-[#FFF4AD]" style={{ animationDuration: '8s', animationDelay: '-4.6s' }} viewBox="0 0 50 50" aria-hidden="true">
          <circle cx="25" cy="25" r="24" />
        </svg>
        <svg className="absolute bottom-0 left-0 h-[230px] w-full opacity-70" viewBox="0 0 500 230" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <path d="M0 204 128 35l92 125L315 45 500 204v26H0Z" fill="#72B9B4" />
          <path d="m87 89 41-54 40 54-40-21Z M278 96l37-51 42 51-42-20Z" fill="#F4FFF9" />
          <path d="M0 200q115-55 240 7t260-31v54H0Z" fill="#4A9C80" />
        </svg>
        </>
      )}
    </div>
  )
}

interface SupporterThemePreviewPickerProps {
  value: SupporterProfileThemeSelection
  onChange: (value: SupporterProfileThemeSelection) => void
  lang: 'es' | 'en'
  enabled?: boolean
}

export const SupporterThemePreviewPicker = ({value,onChange,lang,enabled=false}:SupporterThemePreviewPickerProps) => (
 <section aria-label={lang==='es'?'Vista previa de fondos':'Background preview'}
  className="relative">
  <div className="mb-3 flex items-center justify-between gap-2">
   <p className="text-[14px] font-bold text-[#476862]">
    {lang==='es'?'Fondos disponibles':'Available backgrounds'}
   </p>
   <span className="rounded-full bg-[#F4EDD8] px-3 py-1.5 text-[12px] font-bold text-[#6A6557]">
    {lang==='es'?(enabled?'AMIGO DE PAZO':'EN DESARROLLO'):(enabled?'PAZO FRIEND':'IN DEVELOPMENT')}
   </span>
  </div>
  <div role="group" aria-label={lang==='es'?'Elegir decoración':'Choose decoration'}
   className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-3">
   <button type="button" aria-pressed={value===null} onClick={()=>onChange(null)}
    className="flex min-w-[74px] shrink-0 snap-start flex-col items-center gap-2 rounded-[18px] py-2 text-center hover:bg-[#F4F5EE] focus-visible:bg-[#E1E53F]/35">
    <span aria-hidden="true" className={'flex h-[58px] w-[58px] items-center justify-center rounded-[18px] text-[20px] font-bold '+(value===null?'bg-[#204E4A] text-white':'bg-[#F8F5EC] text-[#204E4A]')}>
     ·
    </span>
    <span className="max-w-[85px] text-[13px] font-bold leading-tight text-[#204E4A]">
     {lang==='es'?'Original':'Original'}
    </span>
   </button>
   {SUPPORTER_PROFILE_THEMES.map(option=>(
    <button key={option.id} type="button" aria-pressed={value===option.id}
     onClick={()=>onChange(option.id)}
     className="flex min-w-[82px] shrink-0 snap-start flex-col items-center gap-2 rounded-[18px] px-1 py-2 text-center hover:bg-[#F4F5EE] focus-visible:bg-[#E1E53F]/35">
     <span aria-hidden="true" className={'flex h-[58px] w-[58px] items-center justify-center rounded-[18px] '+(value===option.id?'shadow-[0_7px_18px_rgba(32,78,74,0.18)]':'')}
      style={{background:option.surface}}>
      <span className="h-7 w-7 rounded-full opacity-70" style={{background:option.swatch}}/>
     </span>
     <span className={'max-w-[85px] text-[13px] font-bold leading-tight '+(value===option.id?'text-[#204E4A] underline decoration-[#E1E53F] decoration-[3px] underline-offset-[5px]':'text-[#5C7470]')}>
      {lang==='es'?option.labelEs:option.labelEn}
     </span>
    </button>
   ))}
  </div>
  <p className="mt-1 px-1 text-[13px] text-[#617670]" aria-live="polite">
   {lang==='es'
    ?(enabled?'Selecciona un fondo y confirma el guardado de forma segura.':'Prueba los diseños; no se guardan cambios ni se activa ninguna membresía.')
    :(enabled?'Choose a background, then confirm saving securely.':'Explore the designs; no changes are saved or membership activated.')}
  </p>
 </section>
)

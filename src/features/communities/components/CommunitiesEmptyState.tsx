type CommunitiesEmptyStateProps = {
  lang: 'es' | 'en'
  canCreate: boolean
  onCreate: () => void
}

/** Purely decorative illustration. No live map, nearby groups or geolocation data. */
const NeighborhoodMapIllustration = () => (
  <svg
    viewBox="0 0 360 207"
    role="img"
    aria-label=" "
    aria-hidden="true"
    focusable="false"
    className="mx-auto block h-auto w-full max-w-[380px]"
    fill="none"
  >
    <defs>
      <clipPath id="community-map-ground">
        <path d="M35 153c14-22 33-43 56-61 18-15 36-30 54-38 30-15 66-12 102 3 26 11 53 35 71 61 13 19 24 33 7 43-22 13-68 13-98 11-49-4-111 4-160-1-29-3-46-8-32-18Z"/>
      </clipPath>
      <linearGradient id="community-map-leaf" x1="52" y1="40" x2="299" y2="190" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F5F9DD"/>
        <stop offset=".59" stopColor="#EAF5C5"/>
        <stop offset="1" stopColor="#DBEDB6"/>
      </linearGradient>
      <filter id="community-map-pin-shadow" x="-60%" y="-30%" width="220%" height="190%">
        <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#204E4A" floodOpacity=".18"/>
      </filter>
    </defs>
    {/* Background foliage and small decorative motifs. */}
    <ellipse cx="181" cy="179" rx="145" ry="9" fill="#DAE9CE" opacity=".5"/>
    <ellipse cx="26" cy="103" rx="11" ry="6" fill="#E8F3B7"/>
    <ellipse cx="328" cy="90" rx="12" ry="8" fill="#E8F3B7"/>
    <path d="m88 32 5-7 6 7-6 1zM103 28l3-6 4 6-4 2z" fill="#E1EBA4" opacity=".9"/>
    {/* Soft, illustrated street map with many winding streets. */}
    <path d="M35 153c14-22 33-43 56-61 18-15 36-30 54-38 30-15 66-12 102 3 26 11 53 35 71 61 13 19 24 33 7 43-22 13-68 13-98 11-49-4-111 4-160-1-29-3-46-8-32-18Z" fill="url(#community-map-leaf)"/>
    <g clipPath="url(#community-map-ground)" stroke="#FFFDF7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M45 145c36-16 54-45 90-56 23-8 39-2 60-14 16-9 35-20 55-22" strokeWidth="10"/>
      <path d="M73 177c19-42 35-47 67-69 26-18 52-11 80-18 26-7 47-21 63-34" strokeWidth="9"/>
      <path d="M144 180c9-29 24-43 49-62 21-15 51-25 79-32" strokeWidth="10"/>
      <path d="M221 180c6-29 22-46 46-60 16-9 29-14 42-16" strokeWidth="10"/>
      <path d="M49 117c32 7 59 12 83 28 24 15 33 25 55 36" strokeWidth="9"/>
      <path d="M90 79c38 33 67 45 109 48 33 3 72 18 119 33" strokeWidth="9"/>
      <path d="M132 46c27 27 45 33 61 34 34 2 68 13 112 45" strokeWidth="9"/>
      <path d="M212 43c-3 19 4 33 18 44 25 20 46 48 50 82" strokeWidth="9"/>
      <path d="M33 159c51-6 91-4 143-1 57 3 99 1 155-8" strokeWidth="7" opacity=".7"/>
    </g>
    {/* Tree figures integrated into the map. */}
    <path d="M114 135v18" stroke="#7C9F71" strokeWidth="4.5" strokeLinecap="round"/>
    <ellipse cx="103" cy="132" rx="14" ry="11" fill="#8FBD6C"/>
    <ellipse cx="119" cy="128" rx="15" ry="15" fill="#A8D181"/>
    <ellipse cx="112" cy="120" rx="12" ry="11" fill="#B9DA88"/>
    <path d="M305 154v11" stroke="#789B72" strokeWidth="3.5" strokeLinecap="round"/>
    <ellipse cx="305" cy="150" rx="10" ry="13" fill="#87B975"/>
    <ellipse cx="310" cy="151" rx="8" ry="9" fill="#A4CB81"/>
    <path d="M44 170v9" stroke="#789B72" strokeWidth="3.5" strokeLinecap="round"/>
    <ellipse cx="44" cy="164" rx="10" ry="10" fill="#9AC77B"/>
    {/* Tiny actual houses: illustrations only, no simulated community cards. */}
    <g transform="translate(48 140)">
      <ellipse cx="20" cy="30" rx="31" ry="5" fill="#9DBE83" opacity=".3"/>
      <rect x="3" y="13" width="36" height="24" rx="4" fill="#E7BA84"/>
      <path d="M-1 16 19 1l24 15-5 5L19 9 2 21Z" fill="#C9895B"/>
      <rect x="18" y="24" width="9" height="13" rx="3" fill="#5D9090"/>
      <rect x="7" y="21" width="8" height="8" rx="2" fill="#F9EBC4"/>
      <rect x="30" y="21" width="7" height="8" rx="2" fill="#F9EBC4"/>
    </g>
    <g transform="translate(289 24) scale(.87)">
      <rect x="3" y="13" width="42" height="29" rx="4" fill="#F0BE88"/>
      <path d="M-2 17 24 0l27 17-5 5L24 9 3 23Z" fill="#D59E66"/>
      <rect x="20" y="27" width="10" height="15" rx="3" fill="#7BA9A4"/>
      <rect x="7" y="24" width="9" height="11" rx="2" fill="#E2F2EB"/>
      <rect x="35" y="24" width="7" height="11" rx="2" fill="#E2F2EB"/>
    </g>
    {/* Satellite community motifs show the visual concept, never actual groups. */}
    <circle cx="59" cy="59" r="29" fill="#F0F8C9"/>
    <g transform="translate(43 42)" fill="#204E4A">
      <circle cx="16" cy="12" r="9"/>
      <circle cx="5" cy="13" r="4"/>
      <circle cx="27" cy="13" r="4"/>
      <path d="M5 30c0-7 5-12 11-12s11 5 11 12v2H5z"/>
      <path d="M0 28c0-5 2-8 5-9M32 28c0-5-2-8-5-9" stroke="#204E4A" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="13" cy="11" r="1.2" fill="#E1E53F"/>
      <circle cx="19" cy="11" r="1.2" fill="#E1E53F"/>
    </g>
    <circle cx="295" cy="129" r="25" fill="#FFFFFF" opacity=".96"/>
    <g transform="translate(275 109)" fill="#204E4A">
      <circle cx="19" cy="8" r="5"/>
      <circle cx="8" cy="13" r="5"/>
      <circle cx="31" cy="13" r="5"/>
      <path d="M9 22c3-8 16-8 20 0l3 10H6z"/>
      <path d="M0 27c0-4 2-7 5-9M38 27c0-4-2-7-5-9" stroke="#204E4A" strokeWidth="3.5" strokeLinecap="round"/>
    </g>
    {/* Central dominant location pin with paw, matching selected Option 6. */}
    <ellipse cx="181" cy="134" rx="38" ry="13" fill="#E1E53F" opacity=".6"/>
    <ellipse cx="181" cy="134" rx="19" ry="7" fill="#D8E898"/>
    <g filter="url(#community-map-pin-shadow)">
      <path d="M180 17c-23 0-42 19-42 42 0 30 42 71 42 71s42-41 42-71c0-23-19-42-42-42Z" fill="#204E4A"/>
      <circle cx="180" cy="63" r="31" fill="#295D55" opacity=".45"/>
      <g fill="#FFFFFF">
        <ellipse cx="159" cy="53" rx="5.4" ry="7.5" transform="rotate(-24 159 53)"/>
        <ellipse cx="173" cy="45" rx="5.4" ry="7.5" transform="rotate(-9 173 45)"/>
        <ellipse cx="188" cy="45" rx="5.4" ry="7.5" transform="rotate(9 188 45)"/>
        <ellipse cx="202" cy="53" rx="5.4" ry="7.5" transform="rotate(24 202 53)"/>
        <path d="M180 61c-9 0-16 10-18 17-2 8 5 12 12 9l6-2 6 2c8 3 14-1 12-9-2-7-9-17-18-17Z"/>
      </g>
    </g>
  </svg>
)

export const CommunitiesEmptyState = ({
  lang,
  canCreate,
  onCreate,
}: CommunitiesEmptyStateProps) => (
  <section
    aria-label={lang === 'es' ? 'Todavía no hay comunidades' : 'No communities yet'}
    className="overflow-hidden rounded-[2.1rem] bg-white/85 px-4 pb-5 pt-3 text-center shadow-[0_4px_22px_rgba(32,78,74,0.045)] backdrop-blur-xl sm:px-6 sm:pb-6"
  >
    <NeighborhoodMapIllustration />
    <div className="-mt-1 space-y-1.5">
      <h3 className="text-[clamp(17px,4.5vw,20px)] font-extrabold leading-snug text-[#204E4A]">
        {lang === 'es' ? 'Todavía no hay comunidades.' : 'No communities yet.'}
      </h3>
      <p className="mx-auto max-w-[30ch] text-[13px] font-medium leading-relaxed text-[#5C7470]">
        {lang === 'es'
          ? 'Puedes crear la primera y empezar a conectar con mascotas en tu área.'
          : 'Create the first community and start connecting with pets in your area.'}
      </p>
      <button
        type="button"
        disabled={!canCreate}
        onClick={onCreate}
        className="mt-3 inline-flex min-h-[48px] w-full max-w-[320px] items-center justify-center gap-2 rounded-full bg-[#204E4A] px-3 py-3 text-[13px] font-extrabold leading-tight text-white shadow-[0_5px_16px_rgba(32,78,74,0.14)] transition-colors hover:bg-[#173D39] focus-visible:bg-[#32665D] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <path d="M12 4v16M4 12h16"/>
        </svg>
        {lang === 'es' ? 'Crear la primera comunidad' : 'Create the first community'}
      </button>
    </div>
  </section>
)

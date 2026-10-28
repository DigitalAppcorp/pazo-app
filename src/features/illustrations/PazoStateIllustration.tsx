/** PAZO vector artwork for each state; no external image dependency. */
export function PazoStateIllustration({kind,className="mt-2 shrink-0"}:{className?:string;kind:'welcome'|'loading'|'error'}) {
  const error=kind==='error'
  if(kind==='loading')return <svg aria-hidden="true" focusable="false" width="86" height="76" viewBox="0 0 100 88" className={className}>
    <path d="M9 42C7 16 42 7 65 16s31 35 15 52-67 18-71-26Z" fill="#ECF2E8"/>
    <path d="m14 64 10-12c6 7 5 13-2 16m51-45 11-8c3 7 0 12-7 13" fill="#DDE53D"/>
    <rect x="35" y="22" width="44" height="41" rx="6" transform="rotate(13 57 42)" fill="#DDE53D"/>
    <g transform="rotate(-12 45 47)"><rect x="22" y="27" width="48" height="40" rx="6" fill="#FFFEFB" stroke="#204E4A" strokeWidth="1.5"/>
    <path d="m27 51 10-10 10 8 9-7 8 9" fill="#C1D3BE"/><circle cx="57" cy="37" r="4" fill="#DDE53D"/>
    <path d="M31 59h30" stroke="#7B9990" strokeWidth="2" strokeLinecap="round"/></g>
    <path d="M5 34h10M4 42h9m65 23h12" stroke="#7B9990" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="72" cy="71" r="3" fill="#204E4A"/><circle cx="81" cy="71" r="3" fill="#204E4A" opacity=".55"/><circle cx="90" cy="71" r="3" fill="#204E4A" opacity=".25"/>
  </svg>
  if(error)return <svg aria-hidden="true" focusable="false" width="86" height="76" viewBox="0 0 100 88" className={className}>
    <path d="M10 45C4 21 32 7 59 14s35 23 29 44S58 83 35 77 13 65 10 45Z" fill="#F9E9DF"/>
    <path d="M22 41a10 10 0 0 1 2-20 16 16 0 0 1 30-2 11 11 0 0 1 8 22Z" fill="#FFFEFB" stroke="#204E4A" strokeWidth="1.5"/>
    <path d="M37 49v7c0 10 23 15 29 3" fill="none" stroke="#7B9990" strokeWidth="2" strokeDasharray="3 4" strokeLinecap="round"/>
    <circle cx="72" cy="56" r="17" fill="#DDE53D" stroke="#FFFEFB" strokeWidth="3"/>
    <path d="M63 57a9 9 0 0 1 15-6m0-5v5h-5m8 4a9 9 0 0 1-15 8" fill="none" stroke="#204E4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="m17 61 8-10c6 7 4 12-3 14" fill="#E8C3A8"/>
  </svg>
  return <svg aria-hidden="true" focusable="false" width="86" height="76" viewBox="0 0 100 88" className={className}>
    <path d="M8 45C6 21 31 7 58 13s37 24 31 45S62 86 35 78 9 65 8 45Z" fill="#ECF2E8"/>
    <path d="m13 67 9-14c7 4 8 11 2 15m53-44 8-11c5 5 5 11-1 14" fill="#DDE53D"/>
    <path d="M20 34c0-13 19-22 34-17m19 49c-14 15-37 9-43-3" stroke="#7B9990" strokeWidth="1.5" strokeDasharray="3 5" strokeLinecap="round"/>
    <g transform="rotate(-9 50 43)">
      <rect x="29" y="20" width="44" height="56" rx="9" fill="#204E4A" opacity=".10" transform="translate(2 3)"/>
      <rect x="27" y="18" width="44" height="56" rx="9" fill="#FFFEFB" stroke="#204E4A" strokeWidth="1.5"/>
      <path d="M27 32h44" stroke="#204E4A" strokeWidth="1.5"/>
      <circle cx="34" cy="25" r="2" fill="#DDE53D"/><path d="M41 25h21" stroke="#9AAF9D" strokeWidth="2" strokeLinecap="round"/>
      <ellipse cx="49" cy="53" rx="9" ry="7" fill="#204E4A"/>
      <ellipse cx="40" cy="44" rx="3" ry="4" fill="#204E4A" transform="rotate(-25 40 44)"/><ellipse cx="47" cy="40" rx="3" ry="4" fill="#204E4A"/><ellipse cx="55" cy="41" rx="3" ry="4" fill="#204E4A"/><ellipse cx="61" cy="47" rx="3" ry="4" fill="#204E4A" transform="rotate(25 61 47)"/>
      <path d="M40 66h18" stroke="#B2C3B3" strokeWidth="2" strokeLinecap="round"/>
    </g>
    <g><circle cx="75" cy="63" r="12" fill="#DDE53D" stroke="#FFFEFB" strokeWidth="3"/><path d="m70 63 3 3 6-7" fill="none" stroke="#204E4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></g>
  </svg>
}


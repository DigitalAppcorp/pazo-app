import { useEffect, useRef, useState } from 'react'
import { pageIsBusy, reloadForUpdate, watchForUpdates } from './appUpdate'

// Shown only while something is half done; otherwise the new version loads on its own.
export function AppUpdatePrompt({ lang, busy }: { lang: 'es' | 'en'; busy: boolean }) {
  const [offered, setOffered] = useState(false)
  const busyRef = useRef(busy)
  useEffect(() => { busyRef.current = busy }, [busy])

  useEffect(() => watchForUpdates({
    isBusy: () => busyRef.current || pageIsBusy(document, window.location),
    onOffer: () => setOffered(true),
  }), [])

  if (!offered) return null
  return (
    // Under the header, where it never covers a primary action or the bottom navigation.
    <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+4.5rem)] z-[70] flex justify-center px-4">
      <button
        type="button"
        onClick={reloadForUpdate}
        className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-extrabold text-[#204E4A] shadow-[0_8px_28px_rgba(32,78,74,0.16)] transition-colors hover:bg-[#F3F6EA] focus-visible:bg-[#F3F6EA]"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
          <path d="M4 4v4h4" />
          <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
          <path d="M20 20v-4h-4" />
        </svg>
        {lang === 'es' ? 'Nueva versión · Actualizar' : 'New version · Update'}
      </button>
    </div>
  )
}

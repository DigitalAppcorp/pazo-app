import type { ReactNode } from 'react'

/**
 * PAZO original vector micro-illustrations for authored UI and demo accents.
 * No emoji fonts, icon packages, strokes, rings or outlines.
 * Shape language: soft silhouettes, paw details, deep teal / citrus / coral.
 * These are decorative beside real text and should not be announced twice.
 */
export type PazoMotif =
  | 'camera' | 'shield' | 'star' | 'lock' | 'like' | 'leaf'
  | 'sparkle' | 'warm-heart' | 'meadow' | 'rabbit' | 'dog' | 'paw'

type MotifProps = {
  kind: PazoMotif
  size?: number
  className?: string
}

const green = '#204E4A'
const lime = '#E1E53F'
const cream = '#FAF8F5'
const coral = '#EC7357'

export const PazoMotifIcon = ({ kind, size = 18, className }: MotifProps) => {
  let shapes: ReactNode

  switch (kind) {
    case 'camera':
      shapes = <>
        <path fill={green} d="M7 5.5c.5-1.3 1.2-2 2.7-2h4.5c1.5 0 2.3.7 2.8 2l.4 1H19c2 0 3 1.3 3 3v8.4c0 2-1.3 3.1-3.2 3.1H5c-2 0-3-1.1-3-3.1V9.5c0-1.7 1.1-3 3-3h1.6z"/>
        <circle cx="12" cy="13.4" r="5.2" fill={cream}/>
        <ellipse cx="9.2" cy="11.4" rx="1.05" ry="1.5" fill={lime}/>
        <ellipse cx="12.1" cy="10.3" rx="1.05" ry="1.45" fill={lime}/>
        <ellipse cx="14.9" cy="11.5" rx="1.05" ry="1.5" fill={lime}/>
        <path d="M12 12.8c-2.2 0-3.8 2.3-3.8 3.4 0 1 .8 1.4 1.6 1.4.9 0 1.4-.5 2.2-.5s1.3.5 2.1.5c.9 0 1.7-.4 1.7-1.4 0-1.1-1.6-3.4-3.8-3.4z" fill={lime}/>
        <circle cx="19" cy="9" r="1" fill={lime}/>
      </>
      break
    case 'shield':
      shapes = <>
        <path fill={green} d="M12 1.8c3.1 2.2 6.2 2.6 9.4 3.4v6.5c0 5.4-3.4 8.8-9.4 11.9C6 20.5 2.6 17.1 2.6 11.7V5.2C5.8 4.4 8.9 4 12 1.8z"/>
        <path fill={cream} d="M12 7c2.4 0 4.5 1.6 4.5 3.7 0 1.6-1 2.8-2.4 3.6l2 3.8-4.1-1.9-4.1 1.9 2-3.8C8.5 13.5 7.5 12.3 7.5 10.7 7.5 8.6 9.6 7 12 7z"/>
        <path fill={lime} d="M11.9 8.7c-.7 0-1.1.5-1.1 1.2s.4 1.2 1.1 1.2 1.2-.5 1.2-1.2-.5-1.2-1.2-1.2z"/>
      </>
      break
    case 'star':
      shapes = <>
        <path fill={lime} d="M12 1.6c1.2 0 1.7 4.6 2.9 5.5.9.7 6.2-.6 6.6.5.4 1.2-3.7 3.3-4.1 4.5-.4 1.2 2.6 5.8 1.6 6.6-1 .8-4.9-2.3-6.1-2.3-1.4 0-5.1 3.2-6.1 2.3s2-5.3 1.6-6.6C8 10.9 4 8.7 4.4 7.6s5.7.2 6.6-.5C12 6.2 10.8 1.6 12 1.6z"/>
        <circle cx="12" cy="11.7" r="2.1" fill={green}/>
        <circle cx="7.5" cy="3" r="1.3" fill={coral}/>
      </>
      break
    case 'lock':
      shapes = <>
        <path fill={green} fillRule="evenodd" d="M6.6 9.9V7.7a5.4 5.4 0 0 1 10.8 0v2.2h-2.9V7.7a2.5 2.5 0 0 0-5 0v2.2H6.6z"/>
        <rect x="4.2" y="9.1" width="15.6" height="12.7" rx="4" fill={green}/>
        <path fill={lime} d="M12 12.2c1.4 0 2.3 1.1 2.3 2.3 0 1-.6 1.7-1.4 2.1l.5 2.2h-2.8l.5-2.2c-.8-.4-1.4-1.1-1.4-2.1 0-1.2.9-2.3 2.3-2.3z"/>
      </>
      break
    case 'like':
      shapes = <>
        <path fill={coral} d="M12 21.5 4.2 14.7C-1.2 9.8 3.8 2 9.5 5.1L12 7.2l2.5-2.1c5.7-3.1 10.7 4.7 5.3 9.6L12 21.5z"/>
        <circle cx="10.1" cy="11" r="1.2" fill={cream}/>
        <circle cx="13.8" cy="11" r="1.2" fill={cream}/>
        <path fill={cream} d="M12 12.7c-1.5 0-3 1.5-3 2.6 0 .7.5 1 1.1 1 .6 0 1.1-.4 1.9-.4.8 0 1.3.4 1.9.4.6 0 1.1-.3 1.1-1 0-1.1-1.5-2.6-3-2.6z"/>
      </>
      break
    case 'leaf':
      shapes = <>
        <path fill={green} d="M20.9 2.5c-8.9-.5-17.2 2.8-17.2 10.5 0 3.7 2.4 6.4 6 6.4 7.3 0 11.3-7.6 11.2-16.9z"/>
        <path fill={lime} d="M4.8 21.3C9.2 14.3 12.1 10.1 19 5.7c-3.7 4.7-7 9.6-11.7 15.9-1.1 1.5-3.4 1.2-2.5-.3z"/>
        <path fill={coral} d="M17.9 2.4c.8.2 1.8.2 3 .1-.4 1.2-1 2.1-1.9 2.7z"/>
      </>
      break
    case 'sparkle':
      shapes = <>
        <path fill={lime} d="M11.4 1.6c.8 0 1.4 5.9 2.2 7 .8 1.1 6.7 1.8 6.7 2.7s-5.9 1.5-6.7 2.5c-.8 1-1.4 7.4-2.2 7.4s-1.5-6.4-2.2-7.4c-.8-1-6.4-1.6-6.4-2.5S8.4 9.7 9.2 8.6c.7-1.1 1.4-7 2.2-7z"/>
        <path fill={coral} d="M19.9 17c.4 0 .8 1.4 1.2 1.8.5.5 1.5.9 1.5 1.3s-1 .6-1.5 1.1c-.4.5-.8 2-1.2 2s-.8-1.5-1.2-2c-.5-.5-1.4-.7-1.4-1.1s.9-.8 1.4-1.3c.4-.4.8-1.8 1.2-1.8z"/>
      </>
      break
    case 'warm-heart':
      shapes = <>
        <path fill={lime} d="M12 21.5 4.2 14.7C-1.2 9.8 3.8 2 9.5 5.1L12 7.2l2.5-2.1c5.7-3.1 10.7 4.7 5.3 9.6L12 21.5z"/>
        <path fill={green} d="M8 13.2c1.2-1.5 2.9-.9 4 .3 1.1-1.2 2.8-1.8 4-.3-1.3 2.6-2.5 3.4-4 4.3-1.5-.9-2.7-1.7-4-4.3z"/>
        <circle cx="12" cy="2.8" r="1.1" fill={coral}/>
      </>
      break
    case 'meadow':
      shapes = <>
        <path fill={green} d="M3.2 21.2C4.5 12.5 7 7.4 8.4 5.9c2.4 5.9 1 10.7-.1 15.3z"/>
        <path fill={lime} d="M9.3 21.2c1.1-9 3.7-16.6 5.8-18.5 2.7 6.7 2.3 13.1.3 18.5z"/>
        <path fill={green} d="M15.3 21.2c.2-7.6 2.3-12.3 5.5-14.2 1.4 7.8-.2 12.4-2.2 14.2z"/>
        <ellipse cx="7.8" cy="5.1" rx="1.6" ry="2.5" fill={coral}/>
        <ellipse cx="19" cy="7" rx="1.3" ry="2" fill={lime}/>
      </>
      break
    case 'rabbit':
      shapes = <>
        <path fill={green} d="M7.1 11.9C4.4 7.2 3.8 1.4 6.8 1.3c2-.1 3.5 4.2 5 7.6C13.4 4.9 14.9 1 17 1.3c3.2.5 2.1 6.8-.4 10.7 2.4 1.4 3.7 3.2 3.7 5.4 0 3.6-3.2 5.1-8.3 5.1s-8.3-1.5-8.3-5.1c0-2.4 1.1-4 3.4-5.5z"/>
        <path fill={lime} d="M6.3 3.6c-.4 0-.1 4.7 2.4 7.4C8.3 7.6 7 3.6 6.3 3.6zM17.4 3.6c-.6-.2-2.1 3.9-2.5 7.4 2.2-2.6 3-7.3 2.5-7.4z"/>
        <circle cx="9" cy="17.2" r="1" fill={cream}/>
        <circle cx="15" cy="17.2" r="1" fill={cream}/>
        <path fill={coral} d="M10.9 19.2c.6-.8 1.6-.8 2.2 0-.8 1.3-1.4 1.3-2.2 0z"/>
      </>
      break
    case 'dog':
      shapes = <>
        <path fill={green} d="M8.3 4.5c2.9-1.9 8.4-1.2 10.2 3 .7 1.9.9 4.4.3 6.2 2 2 3.2 6.2.5 7.5-1.2.6-3.1.5-4.4-.2-2.3 1.3-4.8 1.3-7.2.4-3.4-1.2-4.3-4.7-3.4-7.6C2.6 10.3 2 6.1 4.2 4.6c1-.7 2.8-.7 4.1-.1z"/>
        <path fill={cream} d="M6.5 6.2c-.8 2.9-.2 5.4 1.6 6.5 1.3-2.8.7-5.2-1.6-6.5z"/>
        <path fill={cream} d="M13.3 13.8c2.5-2.1 5.7-1.8 6.8.2-1.4 3.1-4.6 4-6.8 2.5z"/>
        <circle cx="15.4" cy="9.2" r="1.2" fill={lime}/>
        <circle cx="19.6" cy="13.8" r=".8" fill={green}/>
        <path fill={coral} d="M9 19c3 .8 6.7.7 9.6-.4v1.8c-3.4 1.3-6.5 1.3-9.6.2z"/>
      </>
      break
    case 'paw':
      shapes = <>
        <ellipse cx="5.4" cy="8.6" rx="2.1" ry="3.2" fill={lime}/>
        <ellipse cx="10.2" cy="5.7" rx="2.1" ry="3.2" fill={lime}/>
        <ellipse cx="15.5" cy="6.3" rx="2.1" ry="3.1" fill={lime}/>
        <ellipse cx="20.1" cy="10.1" rx="2.1" ry="3" fill={lime}/>
        <path fill={green} d="M12 11.4c-3.2 0-7.1 3.5-7.1 7 0 2.1 1.4 3.9 3.7 3.9 1.4 0 2.3-.8 3.4-.8 1.1 0 2 .8 3.4.8 2.3 0 3.7-1.8 3.7-3.9 0-3.5-3.9-7-7.1-7z"/>
        <path fill={cream} d="M12 15.7c.7-1 2.6-.8 2.6.7 0 .9-1.4 2-2.6 2.7-1.2-.7-2.6-1.8-2.6-2.7 0-1.5 1.9-1.7 2.6-.7z"/>
      </>
      break
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
    >
      {shapes}
    </svg>
  )
}

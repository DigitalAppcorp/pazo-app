import { useState } from 'react'
import { IconPaw } from '../../components/icons/PazoIcons'
import type { OfficialPost } from './officialPosts'

type BadgeSize = 'mini' | 'small' | 'large'
const BADGE_SIZE: Record<BadgeSize, string> = { mini: 'h-[20px] w-[20px]', small: 'h-8 w-8', large: 'h-[66px] w-[66px]' }

// Art approved by the PO on 2026-11-04. Like SupporterBadge, the server decides who
// carries it and a missing image shows nothing rather than a stand-in.
function VigilanteBadge({ kind, lang, size = 'mini' }: { kind: 'fundador' | 'oficial'; lang: 'es' | 'en'; size?: BadgeSize }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  const label = kind === 'fundador' ? (lang === 'es' ? 'Fundador' : 'Founder') : (lang === 'es' ? 'Oficial' : 'Official')
  return <img
    src={'/vigilante/insignia-' + kind + '.png'}
    alt={label}
    title={label}
    decoding="sync"
    loading="eager"
    onError={() => setFailed(true)}
    className={BADGE_SIZE[size] + ' shrink-0 object-contain'}
  />
}

export const OfficialBadge = ({ lang, size }: { lang: 'es' | 'en'; size?: BadgeSize }) => <VigilanteBadge kind="oficial" lang={lang} size={size} />

export const FounderBadge = ({ lang, size }: { lang: 'es' | 'en'; size?: BadgeSize }) => <VigilanteBadge kind="fundador" lang={lang} size={size} />

const formatSourceDate = (date: string, lang: 'es' | 'en') =>
  new Date(`${date}T12:00:00`).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })

interface OfficialPostCardProps {
  post: OfficialPost
  lang: 'es' | 'en'
  onToggleLike: (postId: string) => void
}

// PAZO is not a pet: no profile to open, no follow, no comments. Health alerts send
// questions to the vet instead of a comment thread.
export const OfficialPostCard = ({ post, lang, onToggleLike }: OfficialPostCardProps) => {
  const title = lang === 'en' && post.titleEn ? post.titleEn : post.title
  const body = lang === 'en' && post.bodyEn ? post.bodyEn : post.body
  const share = async () => {
    const url = `${window.location.origin}/?oficial=${encodeURIComponent(post.id)}`
    try {
      if (navigator.share) await navigator.share({ title, text: title, url })
      else await navigator.clipboard?.writeText(url)
    } catch {
      // The person closed the share sheet.
    }
  }
  return (
    <article className="pazo-glass-card relative rounded-[2.2rem] shadow-[0_4px_20px_rgba(32,78,74,0.05)]">
      <div className="flex min-w-0 items-start gap-2.5 p-3.5 sm:p-4">
        <div className="relative h-10 w-10 shrink-0">
          <img src="/pwa-icon-192.png" alt="" className="h-10 w-10 rounded-full object-cover shadow-xs" />
          <span className="pointer-events-none absolute -bottom-1 -right-1 z-10 block h-[20px] w-[20px]">
            <OfficialBadge lang={lang} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="text-[16px] font-extrabold leading-tight text-[#204E4A]">PAZO</span>
          </div>
          <p className="mt-0.5 text-[12px] text-[#5C7470]">
            {lang === 'es' ? 'Fuente' : 'Source'}:{' '}
            <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-[#204E4A] underline">
              {post.sourceName}
            </a>
            {' '}&bull; {formatSourceDate(post.sourcePublishedAt, lang)}
          </p>
        </div>
      </div>
      <div className="space-y-2 px-4 pb-4">
        <h3 className="text-[15px] font-black leading-snug text-[#204E4A]">{title}</h3>
        <p className="whitespace-pre-line text-xs leading-relaxed text-[#204E4A]">{body}</p>
        <p className="text-[12px] font-semibold text-[#5C7470]">
          {lang === 'es' ? '¿Dudas? Consulta a tu veterinario.' : 'Questions? Ask your vet.'}
        </p>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => onToggleLike(post.id)}
            aria-pressed={post.isLiked}
            aria-label={lang === 'es' ? `Me gusta: ${post.likes}` : `Like: ${post.likes}`}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full pr-2 text-[13px] font-extrabold transition-colors ${post.isLiked ? 'text-[#D56554]' : 'text-[#204E4A]'}`}>
            <span className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${post.isLiked ? 'bg-[#FCE6E2]' : 'bg-[#EEF4E7] hover:bg-[#E2EDD8]'}`}>
              <IconPaw size={20} />
            </span>
            <span>{post.likes}</span>
          </button>
          <button type="button" onClick={() => void share()}
            aria-label={lang === 'es' ? 'Compartir aviso' : 'Share alert'}
            className="inline-flex min-h-11 items-center gap-2 rounded-full pr-2 text-[13px] font-extrabold text-[#204E4A]">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF4E7] hover:bg-[#E2EDD8]">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 15V4m0 0L8 8m4-4 4 4" />
                <path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" />
              </svg>
            </span>
            <span>{lang === 'es' ? 'Compartir' : 'Share'}</span>
          </button>
        </div>
      </div>
    </article>
  )
}

import type { CommunitySummary } from '../../../types/pazo'
import { IconPaw, IconShield } from '../../../components/icons/PazoIcons'

type CommunityLifestyleHeroProps = {
  community: CommunitySummary
  isOwner: boolean
  postsCount: number
  canJoin: boolean
  isMembershipBusy: boolean
  onBack: () => void
  onMembership: () => void
  lang: 'es' | 'en'
}

/** Visual composition only. All metadata and image sources are community records. */
export const CommunityLifestyleHero = ({
  community, isOwner, postsCount, canJoin, isMembershipBusy, onBack, onMembership, lang,
}: CommunityLifestyleHeroProps) => (
  <div className="relative">
    <div className="relative h-[208px] overflow-hidden rounded-[2.25rem] bg-[#DDE7E4] sm:h-[255px]">
      {community.imageUrl ? (
        <img src={community.imageUrl} alt={community.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#E5EEDC]">
          <IconPaw size={63} className="text-[#204E4A]/25" />
        </div>
      )}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#F9F7EE]/30 to-transparent" />
      <button type="button" onClick={onBack}
        className="absolute left-3 top-3 z-10 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#FFFCF6]/95 px-4 text-[13px] font-extrabold text-[#204E4A] shadow-[0_5px_17px_rgba(32,78,74,0.13)] backdrop-blur-xl transition-colors hover:bg-[#E1E53F]/90 focus-visible:bg-[#E1E53F]/90">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
        {lang === 'es' ? 'Volver a Explorar' : 'Back to Explore'}
      </button>
      {community.status === 'archived' && (
        <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-[#204E4A]">
          {lang === 'es' ? 'Archivada' : 'Archived'}
        </span>
      )}
      <svg aria-hidden="true" viewBox="0 0 390 55" preserveAspectRatio="none"
        className="pointer-events-none absolute -bottom-px left-0 h-[52px] w-full">
        <path d="M0 46c62-31 115-3 182-13 78-12 131-38 208-12v34H0Z" fill="#F9F7EE"/>
      </svg>
    </div>

    <section aria-label={lang === 'es' ? 'Identidad de comunidad' : 'Community identity'} className="relative -mt-1 px-2 pb-2 sm:px-3">
      <div aria-hidden="true" className="pointer-events-none absolute -right-1 top-1 text-[#CFD99B]">
        <IconPaw size={42} />
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h2 className="min-w-0 max-w-full break-words text-[clamp(27px,7.7vw,37px)] font-black leading-[1.12] tracking-tight text-[#204E4A]">
          {community.name}
        </h2>
        {isOwner && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#E1E53F]/85 px-3 py-1.5 text-[11px] font-extrabold uppercase text-[#204E4A]">
            <IconShield size={14} />
            Admin
          </span>
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {community.category && <span className="rounded-full bg-white/85 px-3 py-1.5 text-[12px] font-extrabold text-[#204E4A] shadow-[0_2px_9px_rgba(32,78,74,0.04)]">{community.category}</span>}
        {community.species && <span className="rounded-full bg-[#E6EDCB]/85 px-3 py-1.5 text-[12px] font-extrabold text-[#204E4A]">{community.species}</span>}
        {community.zone && <span className="inline-flex min-w-0 items-center gap-1 text-[12px] font-semibold text-[#5C7470]">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.4"/>
          </svg>
          {community.zone}
        </span>}
      </div>
      {community.description && (
        <p className="mt-3 whitespace-pre-wrap break-words text-[14px] font-medium leading-relaxed text-[#5C7470]">{community.description}</p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-full bg-white/75 px-3 py-3 shadow-[0_5px_19px_rgba(32,78,74,0.05)] backdrop-blur-md">
        <div className="flex min-w-0 items-center justify-center gap-2">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E1E53F]/45 text-[#204E4A]">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="9" cy="8" r="3"/><path d="M2.5 20v-2c0-3 2.7-5.5 6.5-5.5s6.5 2.5 6.5 5.5v2M17 7a3 3 0 0 1 0 6m1 1c2.3.7 3.5 2.3 3.5 4.5V20"/>
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-[19px] font-black leading-none text-[#204E4A]">{community.membersCount}</span>
            <span className="block text-[11px] font-extrabold text-[#5C7470]">{lang === 'es' ? 'Miembros' : 'Members'}</span>
          </span>
        </div>
        <div className="flex min-w-0 items-center justify-center gap-2">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E1E53F]/45 text-[#204E4A]">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8 9h8M8 13h8M8 17h5"/>
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-[19px] font-black leading-none text-[#204E4A]">{postsCount}</span>
            <span className="block text-[11px] font-extrabold text-[#5C7470]">{lang === 'es' ? 'Publicaciones' : 'Posts'}</span>
          </span>
        </div>
      </div>

      {community.status === 'active' && !isOwner && (
        <button type="button" onClick={onMembership} disabled={isMembershipBusy || !canJoin}
          className={`mt-4 flex min-h-[48px] w-full items-center justify-center rounded-full px-5 py-3 text-[14px] font-extrabold shadow-[0_5px_17px_rgba(32,78,74,0.12)] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${community.isJoined
            ? 'bg-white/90 text-[#204E4A] hover:bg-[#E8F0E7] focus-visible:bg-[#E8F0E7]'
            : 'bg-[#204E4A] text-white hover:bg-[#173D39] focus-visible:bg-[#173D39]'}`}>
          {isMembershipBusy ? (lang === 'es' ? 'Actualizando…' : 'Updating…')
            : community.isJoined ? (lang === 'es' ? 'Salir de la comunidad' : 'Leave community')
            : (lang === 'es' ? 'Unirme a la comunidad' : 'Join community')}
        </button>
      )}
    </section>
  </div>
)

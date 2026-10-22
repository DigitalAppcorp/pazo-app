type PublicProfileTab = 'posts' | 'info'

interface PublicProfileTabsProps {
  activeTab: PublicProfileTab
  onChange: (tab: PublicProfileTab) => void
  lang: 'es' | 'en'
}

// One shared pill glides between both tabs; the content/selection stays in PublicProfileView.
export const PublicProfileTabs = ({ activeTab, onChange, lang }: PublicProfileTabsProps) => (
  <nav
    aria-label={lang === 'es' ? 'Secciones del perfil' : 'Profile sections'}
    className="relative mt-5 grid grid-cols-2 gap-1.5 rounded-full bg-white/85 p-1.5 shadow-[0_5px_20px_rgba(32,78,74,0.05)] backdrop-blur-md"
  >
    <span
      aria-hidden="true"
      className="pazo-profile-tab-indicator pointer-events-none"
      data-active={activeTab}
    />
    <button
      type="button"
      aria-current={activeTab === 'posts' ? 'page' : undefined}
      aria-pressed={activeTab === 'posts'}
      onClick={() => onChange('posts')}
      className={'relative z-10 flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-full px-2 py-3.5 text-[clamp(13px,3.7vw,16px)] font-extrabold transition-colors duration-200 focus-visible:bg-[#E1E53F] ' +
        (activeTab === 'posts' ? 'text-white' : 'text-[#607B73] hover:bg-[#204E4A]/5')}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24" width="19" height="19" fill="currentColor"
        className={activeTab === 'posts' ? 'pazo-profile-tab-icon--active shrink-0' : 'shrink-0'}
      >
        <rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/>
        <rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/>
      </svg>
      <span className="min-w-0 truncate">{lang === 'es' ? 'Publicaciones' : 'Posts'}</span>
    </button>
    <button
      type="button"
      aria-current={activeTab === 'info' ? 'page' : undefined}
      aria-pressed={activeTab === 'info'}
      onClick={() => onChange('info')}
      className={'relative z-10 flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-full px-2 py-3.5 text-[clamp(13px,3.7vw,16px)] font-extrabold transition-colors duration-200 focus-visible:bg-[#E1E53F] ' +
        (activeTab === 'info' ? 'text-white' : 'text-[#607B73] hover:bg-[#204E4A]/5')}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2"
        className={activeTab === 'info' ? 'pazo-profile-tab-icon--active shrink-0' : 'shrink-0'}
      >
        <circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7v.2" strokeLinecap="round"/>
      </svg>
      <span className="min-w-0 truncate">{lang === 'es' ? 'Información' : 'Info'}</span>
    </button>
  </nav>
)

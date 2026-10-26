import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { CommunitySummary, Pet } from '../../../types/pazo'
import { IconCalendar, IconClose, IconCommunity, IconDocument, IconExplore, IconPaw, IconPlus, IconShield } from '../../../components/icons/PazoIcons'
import { CommunityFutureGate } from './CommunityFutureGate'
import './communityWorkspace.css'

export type CommunityPage = 'posts' | 'activities' | 'questions' | 'members' | 'info' | 'admin' | 'tools'
const order: CommunityPage[] = ['posts', 'activities', 'questions', 'members']

function WorkspaceTabs({ active, onChange, lang }: { active: CommunityPage; onChange: (page: CommunityPage) => void; lang: 'es' | 'en' }) {
  const ref = useRef<HTMLElement>(null), [pill, setPill] = useState<{ x: number; width: number } | null>(null)
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const measure = () => {
      const button = node.querySelector<HTMLElement>('[aria-current="page"]')
      setPill(button ? { x: button.offsetLeft, width: button.offsetWidth } : null)
    }
    measure(); const observer = new ResizeObserver(measure); observer.observe(node)
    return () => observer.disconnect()
  }, [active, lang])
  const labels = lang === 'es' ? ['Publicaciones', 'Actividades', 'Preguntas', 'Miembros'] : ['Posts', 'Activities', 'Questions', 'Members']
  return <nav ref={ref} className="workspace-nav" aria-label={lang === 'es' ? 'Secciones de comunidad' : 'Community sections'}>
    {pill && <span aria-hidden="true" className="pazo-choice-indicator workspace-choice-indicator" style={{ transform: `translateX(${pill.x}px)`, width: pill.width }} />}
    {order.map((id, index) => <button type="button" key={id} data-workspace-page={id} onClick={() => onChange(id)} aria-current={active === id ? 'page' : undefined} aria-pressed={active === id}>
      <span className={active === id ? 'pazo-choice-label--active' : ''}>{labels[index]}</span>
      {(id === 'activities' || id === 'questions') && <span className="nav-dot" aria-label={lang === 'es' ? 'En desarrollo' : 'In development'} />}
    </button>)}
  </nav>
}

function ComposerDialog({ children, onClose, busy, lang }: { children: ReactNode; onClose: () => void; busy: boolean; lang: 'es' | 'en' }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const node = ref.current; node?.showModal(); return () => node?.close() }, [])
  return <dialog ref={ref} className="workspace-sheet" aria-label={lang === 'es' ? 'Publicar en la comunidad' : 'Post in the community'} onCancel={event => { event.preventDefault(); if (!busy) onClose() }} onClick={event => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <section><header><h2>{lang === 'es' ? 'Publicar en la comunidad' : 'Post in the community'}</h2><button type="button" className="icon-action" disabled={busy} onClick={onClose} aria-label={lang === 'es' ? 'Cerrar' : 'Close'}><IconClose size={20} /></button></header>{children}</section>
  </dialog>
}

interface Props {
  community: CommunitySummary; currentPet: Pet | null; active: CommunityPage; onChange: (page: CommunityPage) => void
  lang: 'es' | 'en'; onBack: () => void; onMembership: () => void; membershipBusy: boolean
  composer: ReactNode; composerOpen: boolean; onCompose: () => void; onCloseComposer: () => void; posting: boolean; children: ReactNode
}

/** Navigation and approved presentation only. Existing view continues to own all mutations. */
export function CommunityWorkspace({ community, currentPet, active, onChange, lang, onBack, onMembership, membershipBusy, composer, composerOpen, onCompose, onCloseComposer, posting, children }: Props) {
  const [activity, setActivity] = useState<'events' | 'challenges'>('events'), [people, setPeople] = useState<'members' | 'recognition'>('members')
  const contentRef = useRef<HTMLDivElement>(null), outgoingRef = useRef<HTMLDivElement>(null)
  const pendingRef = useRef<{ snapshot: HTMLElement; direction: number; animations?: Animation[] } | null>(null)
  const owner = community.role === 'owner', canParticipate = community.isJoined && community.status === 'active'
  const text = (es: string, en: string) => lang === 'es' ? es : en
  function go(next: CommunityPage) {
    if (next === active) return
    pendingRef.current?.animations?.forEach(animation => animation.cancel()); outgoingRef.current?.replaceChildren(); pendingRef.current = null
    const node = contentRef.current, from = order.indexOf(active), to = order.indexOf(next)
    if (node && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const snapshot = node.cloneNode(true) as HTMLElement
      snapshot.inert = true; snapshot.setAttribute('aria-hidden', 'true'); snapshot.removeAttribute('id'); snapshot.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'))
      pendingRef.current = { snapshot, direction: from >= 0 && to >= 0 ? Math.sign(to - from) : next === 'posts' ? -1 : 1 }
    }
    onChange(next)
  }
  useLayoutEffect(() => {
    const pending = pendingRef.current, node = contentRef.current, host = outgoingRef.current
    if (!pending || !node || !host) return
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const clear = () => { pending.animations?.forEach(animation => animation.cancel()); host.replaceChildren(); if (pendingRef.current === pending) pendingRef.current = null }
    if (preference.matches) { clear(); return }
    host.replaceChildren(pending.snapshot)
    const distance = (node.parentElement?.clientWidth || node.clientWidth) * pending.direction
    const options: KeyframeAnimationOptions = { duration: 460, easing: 'cubic-bezier(.22,1.26,.36,1)', fill: 'both' }
    const incoming = node.animate([{ transform: `translateX(${distance}px)` }, { transform: 'translateX(0)' }], options)
    const outgoing = host.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-distance}px)` }], options)
    pending.animations = [incoming, outgoing]
    void Promise.all([incoming.finished, outgoing.finished]).then(clear).catch(() => {})
    const reduce = () => { if (preference.matches) clear() }; preference.addEventListener('change', reduce)
    return () => { preference.removeEventListener('change', reduce); clear() }
  }, [active])
  const gate = (type: 'events' | 'challenges' | 'questions' | 'recognition' | 'tools') => <CommunityFutureGate key={community.id + type} type={type} community={community} lang={lang} onMembership={() => go('info')} />
  return <div className={'community-workspace' + (active !== 'posts' ? ' compact-context' : '')}>
    <div className="community-cover">{community.imageUrl && <img src={community.imageUrl} alt="" />}<button type="button" className="cover-back" onClick={onBack} aria-label={text('Volver a Comunidades', 'Back to communities')}>‹</button>{owner && <button type="button" className="cover-manage" onClick={() => go('admin')}><IconShield size={15} />{text('Administrar', 'Manage')}</button>}</div>
    <div className="community-heading"><h1>{community.name}</h1><div className="community-meta"><button type="button" onClick={() => go('members')}><IconCommunity size={14} />{community.membersCount} {text('miembros', 'members')}</button>{community.status === 'archived' && <span>{text('Archivada', 'Archived')}</span>}<span aria-hidden="true">·</span><button type="button" onClick={() => go('info')}>{text('Acerca de', 'About')} <span aria-hidden="true">›</span></button></div></div>
    <WorkspaceTabs active={active} onChange={go} lang={lang} />
    <div className="workspace-viewport"><div className="workspace-content" ref={contentRef}>
      {active === 'posts' && <><div className="conversation-intro"><h2>{text('En tu comunidad', 'In your community')}</h2><p>{text('Momentos, ideas y conversaciones.', 'Moments, ideas, and conversations.')}</p></div>{canParticipate && currentPet && <button type="button" className="quick-compose" onClick={onCompose}><img src={currentPet.photoUrl} alt="" /><span>{text('¿Qué quieres compartir?', 'What would you like to share?')}</span><IconPlus size={20} /></button>}{children}</>}
      {active === 'activities' && <><div className="section-heading"><div><h2>{text('Actividades', 'Activities')}</h2><p>{text('Encuentra un motivo para compartir.', 'Find a reason to share.')}</p></div></div><div className="local-segments" aria-label={text('Tipo de actividad', 'Activity type')}><button type="button" aria-pressed={activity === 'events'} onClick={() => setActivity('events')}><IconCalendar size={15} />{text('Agenda', 'Agenda')}</button><button type="button" aria-pressed={activity === 'challenges'} onClick={() => setActivity('challenges')}><IconPaw size={15} />{text('Retos', 'Challenges')}</button></div>{gate(activity)}</>}
      {active === 'questions' && <><div className="section-heading"><div><h2>{text('Preguntas', 'Questions')}</h2><p>{text('Lo que aprendemos juntos, a mano.', 'What we learn together, close at hand.')}</p></div></div>{gate('questions')}</>}
      {active === 'members' && <><div className="section-heading"><div><h2>{text('Miembros', 'Members')}</h2><p>{text('Las personas que hacen comunidad.', 'The people who make this community.')}</p></div></div><div className="local-segments"><button type="button" aria-pressed={people === 'members'} onClick={() => setPeople('members')}>{text('Miembros', 'Members')}</button><button type="button" aria-pressed={people === 'recognition'} onClick={() => setPeople('recognition')}>{text('Reconocimientos', 'Recognition')}<span className="nav-dot" aria-label={text('En desarrollo', 'In development')} /></button></div>{people === 'members' ? children : gate('recognition')}</>}
      {active === 'info' && <><button type="button" className="text-back" onClick={() => go('posts')}>‹ {text('Volver a la comunidad', 'Back to community')}</button><h2 className="page-heading">{text('Acerca de la comunidad', 'About this community')}</h2>{children}{!owner && <button type="button" className="action quiet membership-action" disabled={membershipBusy || !currentPet || community.status !== 'active'} onClick={onMembership}>{membershipBusy ? text('Actualizando…', 'Updating…') : community.isJoined ? text('Salir de la comunidad', 'Leave community') : text('Unirme a la comunidad', 'Join community')}</button>}</>}
      {active === 'admin' && owner && <><button type="button" className="text-back" onClick={() => go('posts')}>‹ {text('Volver a la comunidad', 'Back to community')}</button><div className="section-heading"><div><h2>{text('Administrar', 'Manage')}</h2><p>{text('Un espacio para cuidar la comunidad.', 'A space to care for your community.')}</p></div><span className="admin-mark"><IconShield size={19} /></span></div><div className="admin-list">{([
        ['info', IconDocument, text('Información y reglas', 'Information and rules'), text('Descripción, portada y configuración actual', 'Description, cover, and current settings')],
        ['members', IconCommunity, text('Miembros y administración', 'Members and management'), text('Personas, permisos y acciones actuales', 'People, permissions, and existing actions')],
        ['tools', IconExplore, text('Herramientas avanzadas', 'Advanced tools'), text('En desarrollo', 'In development')],
      ] as const).map(([id, Icon, title, description]) => <button type="button" key={id} onClick={() => go(id)}><span className="admin-icon"><Icon size={21} /></span><span><strong>{title}</strong><small>{description}</small></span><span aria-hidden="true">›</span></button>)}</div></>}
      {active === 'tools' && owner && <><button type="button" className="text-back" onClick={() => go('admin')}>‹ {text('Volver a Administrar', 'Back to management')}</button><h2 className="page-heading">{text('Herramientas avanzadas', 'Advanced tools')}</h2>{gate('tools')}</>}
    </div><div className="workspace-outgoing" ref={outgoingRef} aria-hidden="true" inert /></div>
    {composerOpen && canParticipate && <ComposerDialog onClose={onCloseComposer} busy={posting} lang={lang}>{composer}</ComposerDialog>}
  </div>
}

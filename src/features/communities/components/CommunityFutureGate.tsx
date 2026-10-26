import { useEffect, useRef, useState } from 'react'
import type { CommunitySummary } from '../../../types/pazo'
import { IconCalendar, IconChat, IconHeart, IconPaw, IconShield, IconCheck } from '../../../components/icons/PazoIcons'
import { FeatureIntentChoice } from '../../validation/components/FeatureIntentChoice'
import { hasFeatureExperimentInterest, recordFeatureExperimentInterest, recordFeatureExperimentView } from '../../../services/featureExperimentService'

const gates = {
  events: { key: 'communities_events', Icon: IconCalendar, es: ['Más momentos para compartir.', 'Este espacio permitiría descubrir y organizar encuentros con tu comunidad. Queremos saber si participarías o te gustaría proponer uno.'], en: ['More moments to share.', 'This space would help you discover and organize community meetups. Tell us if you would attend or propose one.'] },
  challenges: { key: 'communities_challenges', Icon: IconPaw, es: ['Pequeñas metas, en comunidad.', 'Aquí podrías encontrar retos compartidos y seguir tu participación. Cuéntanos si te gustaría sumar a tu mascota.'], en: ['Small goals, together.', 'Find shared challenges and follow your participation here. Tell us if you would like to include your pet.'] },
  questions: { key: 'communities_qa', Icon: IconChat, es: ['Las buenas respuestas merecen quedarse.', 'Este espacio reuniría las preguntas de la comunidad y sus respuestas útiles, para encontrarlas cuando las necesites. Hoy puedes seguir preguntando en una publicación normal.'], en: ['Good answers deserve to stay.', 'This space would collect community questions and useful answers so you can find them when needed. For now, you can still ask in a regular post.'] },
  recognition: { key: 'communities_badges', Icon: IconHeart, es: ['Los aportes también se reconocen.', 'Aquí podrían verse los reconocimientos por participar y ayudar en esta comunidad. Son independientes de las insignias de PAZO.'], en: ['Contributions deserve recognition.', 'This space would recognize participation and help within this community. These recognitions are separate from PAZO badges.'] },
  tools: { key: 'communities_admin_tools', Icon: IconShield, es: ['Más claridad para cuidar tu comunidad.', 'Estamos evaluando herramientas para conocer la participación y organizar mejor tu comunidad: estadísticas, roles personalizados y automatizaciones.'], en: ['More clarity to care for your community.', 'We are evaluating tools to understand participation and organize your community: statistics, custom roles, and automations.'] },
} as const

export type CommunityGate = keyof typeof gates

/** Existing account/module measurement contract; no new analytics or community identifiers. */
export function CommunityFutureGate({ type, community, lang, onMembership }: {
  type: CommunityGate; community: CommunitySummary; lang: 'es' | 'en'; onMembership: () => void
}) {
  const info = gates[type], { Icon } = info, [title, copy] = info[lang]
  // The deployed restrictive policies explicitly require these legacy source values.
  const source = community.role === 'owner' ? 'community_info_owner' : 'community_info_member'
  const eligible = community.isJoined && community.status === 'active' &&
    (community.role === 'owner' || community.role === 'member') && (type !== 'tools' || community.role === 'owner')
  const ref = useRef<HTMLElement>(null)
  const [saved, setSaved] = useState(false), [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    if (eligible) void hasFeatureExperimentInterest(info.key).then(value => { if (active) setSaved(value) })
      .catch(() => { if (active) setError(lang === 'es' ? 'No pudimos recuperar tu interés.' : 'Could not load your interest.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [eligible, info.key, community.id, lang, attempt])
  useEffect(() => {
    if (!eligible || !ref.current) return
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .5)) return
      observer.disconnect()
      void recordFeatureExperimentView(info.key, source).catch(() => { /* Measurement must not block navigation. */ })
    }, { threshold: [.5] })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [eligible, info.key, source, community.id])
  async function interest() {
    if (!eligible || loading || busy || saved || error) return
    setBusy(true)
    try { await recordFeatureExperimentInterest(info.key, source); setSaved(true) }
    catch { setError(lang === 'es' ? 'No pudimos guardar tu interés. Inténtalo otra vez.' : 'Could not save your interest. Try again.') }
    finally { setBusy(false) }
  }
  return <section ref={ref} className="future-gate">
    <div className="gate-art" aria-hidden="true"><Icon size={31} /></div>
    <span className="development">{lang === 'es' ? 'En desarrollo' : 'In development'}</span>
    <h3>{title}</h3><p>{copy}</p>
    {eligible ? <button type="button" className="action primary" disabled={loading || busy || saved || Boolean(error)} onClick={() => void interest()}>
      {loading ? (lang === 'es' ? 'Cargando…' : 'Loading…') : busy ? (lang === 'es' ? 'Guardando…' : 'Saving…') : saved ? <><IconCheck size={17} />{lang === 'es' ? 'Interés registrado' : 'Interest saved'}</> : (lang === 'es' ? 'Me interesa esta sección' : "I'm interested in this section")}
    </button> : community.status !== 'active' ? <p>{lang === 'es' ? 'La comunidad está archivada.' : 'This community is archived.'}</p>
      : !community.isJoined ? <button type="button" className="action primary" onClick={onMembership}>{lang === 'es' ? 'Unirme para participar' : 'Join to participate'}</button>
      : <p>{lang === 'es' ? 'La validación de interés aún no está disponible para este rol.' : 'Interest validation is not yet available for this role.'}</p>}
    {error && <div role="alert" className="gate-feedback"><p>{error}</p><button type="button" className="action quiet" onClick={() => { setError(''); setLoading(true); setAttempt(value => value + 1) }}>{lang === 'es' ? 'Reintentar' : 'Retry'}</button></div>}
    {saved && <div className="gate-feedback"><p role="status">{lang === 'es' ? 'Gracias. Tu interés ayuda a priorizar esta sección.' : 'Thank you. Your interest helps prioritize this section.'}</p><FeatureIntentChoice moduleKey={info.key} source={source} lang={lang} /></div>}
  </section>
}

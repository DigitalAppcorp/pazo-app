import type { ReportTarget } from './reportingService'
/** Text shown to the reporter only: the RPC still submits only kind and UUID. */
export function describeReportSubject(kind: ReportTarget, author: string | null | undefined, content: string | null | undefined, lang: 'es'|'en'): string {
 const es=lang==='es'
 const names: Record<ReportTarget,[string,string]>={
  feed_post:['Publicación','Post'],feed_comment:['Comentario','Comment'],
  pet_profile:['Perfil','Profile'],community_post:['Publicación de comunidad','Community post'],
  community_comment:['Comentario de comunidad','Community comment']
 }
 const title=names[kind][es?0:1]
 const name=(author||'').replace(/\s+/g,' ').trim().slice(0,45)
 const base=title+(name?' · '+name:'')
 if(kind==='pet_profile') return base
 const raw=(content||'').replace(/\s+/g,' ').trim()
 return base+(raw?' · «'+raw.slice(0,72)+(raw.length>72?'…':'')+'»':(es?' · (sin texto)':' · (no text)'))
}
export const reportTargetShortId=(id:string):string=>id.slice(-8)

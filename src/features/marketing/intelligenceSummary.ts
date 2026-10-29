import {supabase} from '../../services/supabaseClient'
import {intelligenceTasks,intelligenceKinds,anonymousSignals,futureModules,type IntelligenceTask,type IntelligenceKind,type AnonymousSignal} from './intelligenceCatalog'
import type {BehaviorSegment} from './behaviorSummary'
export const factLabels:Record<string,readonly [string,string]>={
 feed_impression:['Contenido expuesto','Content exposed'],feed_view:['Señal de vista conservada','Retained view signal'],feed_like:['Reacciones guardadas','Persisted reactions'],feed_save:['Publicaciones guardadas','Saved posts'],feed_publish:['Publicaciones creadas','Posts created'],feed_comment:['Comentarios publicados','Published comments'],profile_follow:['Relaciones de seguimiento','Following relationships'],pet_create:['Mascotas creadas','Pets created'],community_create:['Comunidades creadas','Communities created'],community_join:['Membresías actuales','Current memberships'],community_publish:['Publicaciones en comunidades','Community posts'],community_comment:['Comentarios en comunidades','Community comments'],community_like:['Reacciones en comunidades','Community reactions'],care_complete:['Cuidados completados','Completed care'],care_created:['Cuidados guardados','Saved care'],qr_share_confirmed:['Compartición QR resuelta','QR sharing resolved'],search_open:['Búsqueda abierta','Search opened'],search_execute:['Búsqueda ejecutada','Search executed'],search_result:['Resultado abierto','Result opened'],search_empty:['Búsqueda sin resultados','Search without results'],map_map_open:['Mapa abierto','Map opened'],map_search:['Búsqueda de lugares','Place search'],map_place_open:['Ficha de lugar abierta','Place card opened'],map_directions:['Solicitud de ruta','Directions request'],future_view:['Propuesta visible','Proposal visible'],future_interest:['Interés declarado','Declared interest'],future_intent_use:['Intención: usar','Intent: use'],future_intent_create:['Intención: crear','Intent: create'],future_intent_explore:['Intención: explorar','Intent: explore'],
 ...Object.fromEntries(Object.entries(futureModules).flatMap(([module,label])=>Object.entries({view:['Visible','Visible'],interest:['Me interesa','Interested'],intent_use:['Usaría','Would use'],intent_create:['Crearía','Would create'],intent_explore:['Exploraría','Would explore']}).map(([stage,name])=>[`future_${stage}_${module}`,[`${label[0]} · ${name[0]}`,`${label[1]} · ${name[1]}`]]))),
} as const
export type FactMetric=keyof typeof factLabels
export interface IntelligenceSummary{version:1;status:'paused'|'observing';coverage_since:string|null;as_of:string;effective_days:number;tasks:{task:IntelligenceTask;kind:IntelligenceKind;accounts:number}[];facts:{metric:FactMetric;accounts:number;returning:number|null}[];anonymous:{signal:AnonymousSignal;requests:number}[]}
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
const count=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=10
const date=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v))
export function parseIntelligenceSummary(v:unknown):IntelligenceSummary{
 if(!obj(v)||Object.keys(v).length!==8||v.version!==1||!['paused','observing'].includes(String(v.status))||!date(v.as_of)||!(v.coverage_since===null||date(v.coverage_since))||!Number.isInteger(v.effective_days)||Number(v.effective_days)<1||Number(v.effective_days)>14)throw Error('invalid intelligence envelope')
 const schemas:Record<string,(r:Record<string,unknown>)=>boolean>={
  tasks:r=>Object.keys(r).length===3&&Object.hasOwn(intelligenceTasks,String(r.task))&&intelligenceKinds.includes(r.kind as IntelligenceKind)&&count(r.accounts),
  facts:r=>Object.keys(r).length===3&&Object.hasOwn(factLabels,String(r.metric))&&count(r.accounts)&&(r.returning===null||count(r.returning)&&Number(r.returning)<=Number(r.accounts)&&(r.accounts===r.returning||Number(r.accounts)-Number(r.returning)>=10)),
  anonymous:r=>Object.keys(r).length===2&&anonymousSignals.includes(r.signal as AnonymousSignal)&&count(r.requests),
 }
 for(const [key,test]of Object.entries(schemas)){const rows=v[key];if(!Array.isArray(rows)||rows.length>260||rows.some(r=>!obj(r)||!test(r)))throw Error('unsafe intelligence rows')}
 if(v.status==='paused'&&['tasks','facts','anonymous'].some(k=>(v[k] as unknown[]).length))throw Error('paused report contains data')
 return v as unknown as IntelligenceSummary
}
export async function adminIntelligenceSummary(days:7|30|90,segment:BehaviorSegment,creative:string,signal:AbortSignal){
 const {data,error}=await supabase.rpc('pazo_admin_intelligence_summary_v1',{p_days:days,p_segment:segment,p_creative:creative}).abortSignal(signal)
 if(error)throw Error(error.code==='42501'?'mfa_required':'report_unavailable')
 return parseIntelligenceSummary(data)
}

import {supabase} from '../../services/supabaseClient'
export type BehaviorSegment='all'|'paid_attributed'|'unknown'
export const creatives=['all','perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en','qr_v2_en','cuidados_v2_en','app_v2_en'] as const
export interface BehaviorSummary{
 status:'paused'|'insufficient'|'collecting';period_days:7|30|90;effective_days:number;coverage_since:string|null;as_of:string;timezone:'America/Los_Angeles';minimum_sample:10;segment:BehaviorSegment;creative:string;source_gaps:string[];
 totals:null|{accounts:number;sessions:number;first_observed_sessions:number;return_sessions:number;active_account_days:number;useful_accounts:number|null};
 funnel:{step:string;accounts:number|null;denominator:number|null}[];
 paths:{screen:string;next_screen:string|null;accounts:number}[];
 issues:{screen:string;event:string;category:string;accounts:number}[];
 return_modules:{screen:string;accounts:number}[];return_actions:{event:string;accounts:number}[];
 retention:{day:number;matured:number;reopened:number;useful:number}[];
 paid_retention:{day:number;matured:number;reopened:number;useful:number}[];outcomes:{event:string;accounts:number}[];
 prereg:{step:string;signals:number}[];landing_signals:number;
}
const isObject=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
const count=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=0
/** Reject extra keys and unsafe payloads; never render raw backend diagnostic messages. */
export function parseBehaviorSummary(v:unknown):BehaviorSummary{
 if(!isObject(v)||!['paused','insufficient','collecting'].includes(String(v.status))||![7,30,90].includes(Number(v.period_days))||!count(v.effective_days)||Number(v.effective_days)>14||v.timezone!=='America/Los_Angeles'||v.minimum_sample!==10||!['all','paid_attributed','unknown'].includes(String(v.segment))||!creatives.includes(v.creative as typeof creatives[number])||typeof v.as_of!=='string'||!Number.isFinite(Date.parse(v.as_of))||(v.coverage_since!==null&&(typeof v.coverage_since!=='string'||!Number.isFinite(Date.parse(v.coverage_since)))))throw Error('invalid behavior envelope')
 const allowed=['status','period_days','effective_days','coverage_since','as_of','timezone','minimum_sample','segment','creative','source_gaps','totals','funnel','paths','issues','return_modules','return_actions','retention','paid_retention','outcomes','prereg','landing_signals']
 if(Object.keys(v).some(k=>!allowed.includes(k))||!count(v.landing_signals)||!Array.isArray(v.source_gaps)||v.source_gaps.some(x=>!['organic_evidenced','direct','anonymous_unique_people','historical_sessions','self_reported_reason','repeat_qr_share'].includes(x)))throw Error('invalid behavior fields')
 const screens=['home','pet','qr','agenda','communities','places','explore','first_pet']
 const schemas:Record<string,Record<string,(x:unknown)=>boolean>>={
  funnel:{step:x=>['verified','first_pet','tool_view','utility'].includes(String(x)),accounts:x=>x===null||count(x),denominator:x=>x===null||count(x)},
  paths:{screen:x=>screens.includes(String(x)),next_screen:x=>x===null||screens.includes(String(x)),accounts:count},
  issues:{screen:x=>screens.includes(String(x)),event:x=>['error','loading','retry'].includes(String(x)),category:x=>['none','network','unavailable'].includes(String(x)),accounts:count},
  return_modules:{screen:x=>screens.includes(String(x)),accounts:count},return_actions:{event:x=>['care_created','qr_share_confirmed'].includes(String(x)),accounts:count},
  retention:{day:x=>x===1||x===7,matured:count,reopened:count,useful:count},paid_retention:{day:x=>x===7,matured:count,reopened:count,useful:count},outcomes:{event:x=>['care_created','qr_share_confirmed'].includes(String(x)),accounts:count},prereg:{step:x=>['signup_cta','signup_start','signup_requested','signup_error'].includes(String(x)),signals:count},
 }
 for(const [key,schema]of Object.entries(schemas)){
  const rows=v[key];if(!Array.isArray(rows)||rows.length>24)throw Error('invalid report rows')
  for(const row of rows)if(!isObject(row)||Object.keys(row).length!==Object.keys(schema).length||Object.entries(schema).some(([k,test])=>!test(row[k])))throw Error('unsafe report row')
  if(['paths','issues','return_modules','return_actions','outcomes'].includes(key)&&rows.some(r=>Number(r.accounts)<10))throw Error('small segment exposed')
 }
 if(v.totals!==null){const t=v.totals;if(!isObject(t)||Object.keys(t).length!==6||!['accounts','sessions','first_observed_sessions','return_sessions','active_account_days','useful_accounts'].every(k=>k==='useful_accounts'&&t[k]===null||count(t[k]))||Number(t.accounts)<10||Number(t.accounts)>Number(t.sessions)||Number(t.first_observed_sessions)+Number(t.return_sessions)!==t.sessions)throw Error('invalid totals')}
 for(const row of v.funnel as BehaviorSummary['funnel'])if(row.accounts!==null&&row.denominator!==null&&(row.accounts>row.denominator||(row.accounts>0&&row.accounts<10)||(row.denominator-row.accounts>0&&row.denominator-row.accounts<10)))throw Error('incompatible funnel')
 for(const row of [...v.retention as BehaviorSummary['retention'],...v.paid_retention as BehaviorSummary['paid_retention']])if(row.matured<10||row.reopened>row.matured||row.useful>row.reopened)throw Error('invalid maturity')
 return v as unknown as BehaviorSummary
}
export async function adminBehaviorSummary(days:7|30|90,segment:BehaviorSegment,creative:string,signal:AbortSignal){
 const {data,error}=await supabase.rpc('pazo_admin_behavior_summary_v1',{p_days:days,p_segment:segment,p_creative:creative}).abortSignal(signal)
 if(error)throw Error(error.code==='42501'?'admin_required':'behavior unavailable')
 return parseBehaviorSummary(data)
}

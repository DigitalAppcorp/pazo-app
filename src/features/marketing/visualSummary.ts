import {supabase} from '../../services/supabaseClient'
import {creatives,type BehaviorSegment} from './behaviorSummary'

export type VisualFocus='all'|'ads'|'unknown'|'returning'
export const visualScreens=['home','pet','qr','agenda','communities','places','explore','first_pet'] as const
export type VisualScreen=typeof visualScreens[number]
export interface VisualSummary {
 version:1;status:'paused'|'insufficient'|'observing';as_of:string;coverage_since:string|null;
 timezone:'America/Los_Angeles';days:7|14;segment:BehaviorSegment;creative:string;audience:'all'|'returning';
 totals:null|{accounts:number;sessions:number;useful:number|null;returning:number|null};
 segments:null|{all:number;paid:number;unknown:number;returning:number|null};landing_requests:number|null;
 funnel:{step:'verified'|'first_pet'|'tool_view'|'utility';accounts:number}[];
 trend:{day:string;accounts:number|null;returning:number|null}[];
 last_steps:{screen:VisualScreen;sessions:number;accounts:number}[];
 moves:{from:VisualScreen;to:VisualScreen;accounts:number}[];
 return_modules:{screen:VisualScreen;accounts:number}[];
 creatives:{creative:string;verified:number;pet:number;viewed:number;useful:number}[];
}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
const count=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&(v===0||v>=10)
const cell=(v:unknown)=>v===null||count(v)
const exact=(v:unknown,keys:string[])=>object(v)&&Object.keys(v).sort().join('|')===[...keys].sort().join('|')
const date=(v:unknown)=>typeof v==='string'&&!Number.isNaN(Date.parse(v))
const list=(v:unknown,max:number,check:(r:Record<string,unknown>)=>boolean)=>Array.isArray(v)&&v.length<=max&&v.every(r=>object(r)&&check(r))
const screen=(v:unknown)=>visualScreens.includes(v as VisualScreen)
export function parseVisualSummary(v:unknown):VisualSummary{
 if(!exact(v,['version','status','as_of','coverage_since','timezone','days','segment','creative','audience','totals','segments','landing_requests','funnel','trend','last_steps','moves','return_modules','creatives']))throw Error('invalid visual report')
 const r=v as Record<string,unknown>
 if(r.version!==1||!['paused','insufficient','observing'].includes(String(r.status))||!date(r.as_of)||!(r.coverage_since===null||date(r.coverage_since))||r.timezone!=='America/Los_Angeles'||(r.days!==7&&r.days!==14)||!['all','paid_attributed','unknown'].includes(String(r.segment))||!creatives.includes(r.creative as typeof creatives[number])||!['all','returning'].includes(String(r.audience))||!cell(r.landing_requests))throw Error('invalid visual scope')
 if(!(r.totals===null||exact(r.totals,['accounts','sessions','useful','returning'])&&object(r.totals)&&count(r.totals.accounts)&&count(r.totals.sessions)&&cell(r.totals.useful)&&cell(r.totals.returning)))throw Error('invalid visual totals')
 if(!(r.segments===null||exact(r.segments,['all','paid','unknown','returning'])&&object(r.segments)&&count(r.segments.all)&&count(r.segments.paid)&&count(r.segments.unknown)&&cell(r.segments.returning)))throw Error('invalid segments')
 if(!list(r.funnel,4,x=>exact(x,['step','accounts'])&&['verified','first_pet','tool_view','utility'].includes(String(x.step))&&count(x.accounts))||!list(r.trend,14,x=>exact(x,['day','accounts','returning'])&&typeof x.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x.day)&&date(x.day)&&cell(x.accounts)&&cell(x.returning))||!list(r.last_steps,8,x=>exact(x,['screen','sessions','accounts'])&&screen(x.screen)&&count(x.sessions)&&count(x.accounts))||!list(r.moves,56,x=>exact(x,['from','to','accounts'])&&screen(x.from)&&screen(x.to)&&x.from!==x.to&&count(x.accounts))||!list(r.return_modules,8,x=>exact(x,['screen','accounts'])&&screen(x.screen)&&count(x.accounts))||!list(r.creatives,9,x=>exact(x,['creative','verified','pet','viewed','useful'])&&creatives.includes(x.creative as typeof creatives[number])&&x.creative!=='all'&&[x.verified,x.pet,x.viewed,x.useful].every(count)))throw Error('invalid visual rows')
 const report=v as VisualSummary
 const safeDifference=(parent:number,child:number)=>parent>=child&&(parent===child||parent-child>=10)
 if(report.totals&&(report.totals.useful!==null&&!safeDifference(report.totals.accounts,report.totals.useful)||report.totals.returning!==null&&!safeDifference(report.totals.accounts,report.totals.returning)))throw Error('unsafe complementary totals')
 if(report.last_steps.some(x=>x.accounts<10||x.sessions<x.accounts)||report.moves.some(x=>x.accounts<10)||report.return_modules.some(x=>x.accounts<10))throw Error('invalid positive observation')
 if(new Set(report.last_steps.map(x=>x.screen)).size!==report.last_steps.length||new Set(report.moves.map(x=>x.from+':'+x.to)).size!==report.moves.length||new Set(report.return_modules.map(x=>x.screen)).size!==report.return_modules.length||new Set(report.creatives.map(x=>x.creative)).size!==report.creatives.length)throw Error('duplicate visual rows')
 if(report.creatives.some(x=>x.verified<10||!safeDifference(x.verified,x.pet)||!safeDifference(x.pet,x.viewed)||!safeDifference(x.viewed,x.useful))||report.funnel.some((x,i,a)=>i>0&&!safeDifference(a[i-1].accounts,x.accounts))||report.trend.some(x=>x.accounts===null&&x.returning!==null||x.accounts!==null&&x.returning!==null&&!safeDifference(x.accounts,x.returning)))throw Error('unsafe complementary counts')
 if(report.trend.length!==report.days||new Set(report.trend.map(x=>x.day)).size!==report.days||report.trend.some((x,i,a)=>i>0&&x.day<=a[i-1].day)||report.trend.some(x=>x.returning!==null&&x.accounts!==null&&x.returning>x.accounts))throw Error('invalid trend sequence')
 if(report.funnel.length&&report.funnel.map(x=>x.step).join('|')!=='verified|first_pet|tool_view|utility')throw Error('invalid funnel order')
 if(report.funnel.some((x,i,a)=>i>0&&x.accounts>a[i-1].accounts)||report.creatives.some(x=>x.pet>x.verified||x.viewed>x.pet||x.useful>x.viewed))throw Error('invalid funnel cohort')
 if(report.totals&&(report.totals.sessions<report.totals.accounts||report.totals.useful!==null&&report.totals.useful>report.totals.accounts||report.totals.returning!==null&&report.totals.returning>report.totals.accounts)||report.segments&&(report.segments.all!==report.segments.paid+report.segments.unknown||report.segments.returning!==null&&report.segments.returning>report.segments.all))throw Error('invalid aggregate relationship')
 return report
}
export function largestFunnelGap(rows:VisualSummary['funnel']){
 return rows.slice(1).map((r,i)=>({from:i,to:i+1,accounts:rows[i].accounts-r.accounts,ratio:rows[i].accounts?(rows[i].accounts-r.accounts)/rows[i].accounts:0}))
  .filter(x=>x.accounts>=10).sort((a,b)=>b.accounts-a.accounts||b.ratio-a.ratio)[0]??null
}
export function displayVisualCount(value:number|null|undefined,lang:'es'|'en'){
 if(value==null)return '—'
 return new Intl.NumberFormat(lang==='es'?'es-GT':'en-US',value>=10000?{notation:'compact',maximumFractionDigits:1}:{}).format(value)
}
export function visualScope(focus:VisualFocus){
 if(!['all','ads','unknown','returning'].includes(focus))throw Error('invalid visual focus')
 return {segment:focus==='ads'?'paid_attributed':focus==='unknown'?'unknown':'all',audience:focus==='returning'?'returning':'all'} as const
}
export async function adminVisualSummary(days:7|14,focus:VisualFocus,creative:string,signal:AbortSignal){
 const {segment,audience}=visualScope(focus)
 const {data,error}=await supabase.rpc('pazo_admin_visual_summary_v1',{p_days:days,p_segment:segment,p_creative:creative,p_audience:audience}).abortSignal(signal)
 if(error)throw Error(error.code==='42501'?'admin_required':'report_unavailable')
 const report=parseVisualSummary(data)
 if(report.days!==days||report.segment!==segment||report.audience!==audience||report.creative!==creative)throw Error('report scope mismatch')
 return report
}

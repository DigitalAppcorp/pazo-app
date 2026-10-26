// Validate the aggregate boundary before rendering. No identity/free text from
// an unexpected RPC response can become a campaign label in the panel.
const creatives=new Set(['perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en'])
const metrics=['landing_signals','verified_signups','first_pet_within_7d','d7_matured_owners','d7_screen_activity_proxy'] as const
type Totals=Record<typeof metrics[number],number>
export type MarketingSummary={status:'not_configured'|'paused'|'collecting';period_days:7|30|90;as_of:string;time_zone:'America/Los_Angeles';totals:Totals;daily:(Totals&{day:string;campaign:string;creative:string})[]}
const object=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v)
const exact=(v:Record<string,unknown>,keys:readonly string[])=>Object.keys(v).length===keys.length&&Object.keys(v).every(k=>keys.includes(k))
const validMetrics=(v:unknown):v is Totals&Record<string,unknown>=>object(v)&&metrics.every(k=>typeof v[k]==='number'&&Number.isSafeInteger(v[k])&&(v[k] as number)>=0)&&
 (v.first_pet_within_7d as number)<=(v.verified_signups as number)&&(v.d7_screen_activity_proxy as number)<=(v.d7_matured_owners as number)&&(v.d7_matured_owners as number)<=(v.verified_signups as number)
export function parseMarketingSummary(value:unknown):MarketingSummary{
 const fail=()=>{throw Error('PAZO_MARKETING_INVALID_AGGREGATE')}
 if(!object(value)||!exact(value,['status','period_days','as_of','time_zone','totals','daily'])||!['not_configured','paused','collecting'].includes(String(value.status))||
  ![7,30,90].includes(value.period_days as number)||typeof value.as_of!=='string'||!Number.isFinite(Date.parse(value.as_of))||value.time_zone!=='America/Los_Angeles'||
  !validMetrics(value.totals)||!exact(value.totals,metrics)||!Array.isArray(value.daily)||value.daily.length>540)return fail()
 const days=new Set<string>(),totals=Object.fromEntries(metrics.map(k=>[k,0])) as Totals
 for(const row of value.daily){
  if(!object(row)||!exact(row,['day','campaign','creative',...metrics])||!validMetrics(row)||typeof row.day!=='string'||!/^\d{4}-\d\d-\d\d$/.test(row.day)||
   !Number.isFinite(Date.parse(row.day))||new Date(row.day).toISOString().slice(0,10)!==row.day||row.campaign!=='pazo_beta_local_202610'||!creatives.has(row.creative as string))return fail()
  const key=row.day+':'+row.creative;if(days.has(key))return fail();days.add(key)
  for(const k of metrics)totals[k]+=row[k]
 }
 const expected=value.totals
 if(metrics.some(k=>totals[k]!==expected[k]||!Number.isSafeInteger(totals[k])))return fail()
 return value as unknown as MarketingSummary
}

import {supabase} from '../../services/supabaseClient'
import {anonymousSignals,type AnonymousSignal} from './intelligenceCatalog'
import {createPazoMarketingRecorder,parsePazoCampaign} from './attribution'

/** OFF until the runbook is complete: notice, SQL, Edge, then this build flag. */
export const CAMPAIGN_EXPERIENCE_ENABLED=import.meta.env.VITE_PAZO_CAMPAIGN_EXPERIENCE_ENABLED==='true'

/** Only the validated ad of this browser's landing (URL, or the existing 72h first-party state). Never an identifier. */
export function campaignExperienceFields(){
 return CAMPAIGN_EXPERIENCE_ENABLED?campaignFields():{}
}
export function campaignFields(){
 const now=Date.now()
 let attr=parsePazoCampaign(window.location.search,now)
 if(!attr)try{attr=createPazoMarketingRecorder(window.localStorage,{enabled:true}).read()?.attribution??null}catch{attr=null}
 return attr?{utm_source:attr.source,utm_medium:attr.medium,utm_campaign:attr.campaign,utm_content:attr.creative}:{}
}

export interface CampaignExperienceReport{version:1;status:'paused'|'observing';coverage_since:string|null;as_of:string;creative:string;rows:{signal:AnonymousSignal;ads:number;other:number|null}[]}
const safe=(v:unknown)=>Number.isSafeInteger(v)&&(v===0||Number(v)>=10)
const when=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v))
/** Reject extra keys and any count that could expose fewer than 10 requests. */
export function parseCampaignExperience(v:unknown):CampaignExperienceReport{
 const r=v as Record<string,unknown>
 if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).sort().join()!=='as_of,coverage_since,creative,rows,status,version'||r.version!==1||!['paused','observing'].includes(String(r.status))||!when(r.as_of)||!(r.coverage_since===null||when(r.coverage_since))||typeof r.creative!=='string'||!Array.isArray(r.rows)||r.rows.length>anonymousSignals.length)throw Error('invalid campaign experience')
 for(const row of r.rows as Record<string,unknown>[])if(!row||typeof row!=='object'||Object.keys(row).sort().join()!=='ads,other,signal'||!anonymousSignals.includes(row.signal as AnonymousSignal)||!safe(row.ads)||!(row.other===null||safe(row.other)))throw Error('unsafe campaign experience')
 return r as unknown as CampaignExperienceReport
}
export async function adminCampaignExperience(days:7|30|90,creative:string,signal:AbortSignal){
 const {data,error}=await supabase.rpc('pazo_admin_campaign_experience_v1',{p_days:days,p_creative:creative}).abortSignal(signal)
 if(error)throw Error(error.code==='42501'?'admin_required':'report_unavailable')
 return parseCampaignExperience(data)
}

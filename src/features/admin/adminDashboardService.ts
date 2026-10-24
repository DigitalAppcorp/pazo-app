import { supabase } from '../../services/supabaseClient'

export interface AdminOverview {
  environment:'sandbox'
  as_of:string
  period_days:number
  people:{ registered:number;new_7d:number;new_30d:number;with_pet:number;without_pet:number;pets:number;posts:number;comments:number;communities:number }
  activity:{tracking_since:string;today:number;last_7d:number;last_30d:number;active_period:number;total_user_days:number;module_counts:Record<string,number>}
  support:{sandbox_verified_periods:number;sandbox_gross_minor:number;sandbox_paid_accounts:number;sandbox_covered_accounts:number;sandbox_held_periods:number;checkout_attempts:number;attempts_without_verified_period:number;live_revenue_minor:null;live_verified:false}
  experiments:{tracked_views:number;interested_accounts:number;intent_votes:number;place_events:number;search_events:number}
  resources:{database_bytes:number;stored_objects:number;storage_estimated_bytes:number;provider_egress_bytes:null;provider_quota_bytes:null;provider_billing_amount:null;note:string}
}
export interface AdminUser {
 user_id:string;email:string|null;created_at:string;pet_count:number
 pets:{id:string;name:string;species:string}[]
 active_days_30:number;last_recorded_day:string|null
 ever_sandbox_paid:boolean;has_verified_sandbox_coverage:boolean;unverified_checkout_attempts:number
}
export interface AdminExperiment {
 key:string;name:string;viewers:number;interested:number;intent_votes:number
 interest_rate:number|null;confidence:'insufficient'|'directional'|'reasonable'
 priority_score:number|null
 choices:{option:string;votes:number}[]
}
export interface AdminVoter {user_id:string;email:string|null;interested_at:string;choice:string|null;source:string}
export interface AdminAudience {user_id:string;email:string|null;first_viewed:string;last_viewed:string;interested:boolean;choice:string|null}
async function call<T>(fn:string,args?:Record<string,unknown>):Promise<T>{
 const {data,error}=await supabase.rpc(fn,args)
 if(error)throw error
 if(data===null||data===undefined)throw Error('PAZO_ADMIN_EMPTY_RESPONSE')
 return data as T
}
/** Marketing backend returns aggregates only after an explicit server admin
 * check; no owner IDs, visit identifiers, IPs or raw event records. */
export interface AdminMarketingDay {
 day:string
 campaign:string
 creative:string
 landing_signals:number
 verified_signups:number
 first_pet_within_7d:number
 d7_matured_owners:number
 d7_screen_activity_proxy:number
}
export interface AdminMarketingTotals {
 landing_signals:number
 verified_signups:number
 first_pet_within_7d:number
 d7_matured_owners:number
 d7_screen_activity_proxy:number
}
export interface AdminMarketingSummary {
 status:'not_configured'|'paused'|'collecting'
 period_days:7|30|90
 as_of:string
 time_zone:'America/Los_Angeles'
 totals:AdminMarketingTotals
 daily:AdminMarketingDay[]
}
export const adminMarketingSummary=(days:7|30|90)=>call<AdminMarketingSummary>(
 'pazo_admin_marketing_summary',{p_days:days}
)

export const checkAdmin=()=>call<boolean>('pazo_is_admin')
export const adminOverview=(days:7|30|90)=>call<AdminOverview>('pazo_admin_overview',{p_days:days})
export const adminUsers=(offset:number)=>call<AdminUser[]>('pazo_admin_users',{p_limit:30,p_offset:offset})
export const adminExperiments=()=>call<AdminExperiment[]>('pazo_admin_experiments')
export const adminVoters=(moduleKey:string)=>call<AdminVoter[]>('pazo_admin_voters',{p_module_key:moduleKey,p_limit:40})
export const adminAudience=(moduleKey:string)=>call<AdminAudience[]>('pazo_admin_audience',{p_module_key:moduleKey,p_limit:40})
const sections:Record<string,string>={
 inicio:'feed',comunidades:'communities',mapa:'places',mascota:'profile',explore:'explore'
}
/** Coarse, explicit top-level screen access only. One write per section per day. */
export async function recordAdminActivity(tab:string):Promise<void>{
 const moduleKey=sections[tab]
 if(!moduleKey)return
 const {error}=await supabase.rpc('pazo_track_activity',{p_module:moduleKey})
 if(error)throw error
}

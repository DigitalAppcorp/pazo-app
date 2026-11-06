import {supabase} from '../../services/supabaseClient'

export type SignupMethod = 'email' | 'google' | 'other'

interface SignupAccount {
 method:SignupMethod; email_sent:boolean; confirmed:boolean; signed_in:boolean
}

export interface AdminSignupSummary {
 methods:{method:SignupMethod; registered:number; email_sent:number; confirmed:number; signed_in:number; with_pet:number}[]
 accounts:Partial<Record<string,SignupAccount>>
 attempts_active:boolean
 attempts:{day:string;requests:number|null}[]
}

export async function adminSignupSummary(userIds:string[],signal:AbortSignal):Promise<AdminSignupSummary>{
 const {data,error}=await supabase.rpc('pazo_admin_signup_summary_v1',{p_user_ids:userIds}).abortSignal(signal)
 if(error)throw error
 if(!data)throw Error('PAZO_ADMIN_EMPTY_RESPONSE')
 return data as AdminSignupSummary
}

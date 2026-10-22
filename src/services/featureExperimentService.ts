import { supabase } from './supabaseClient'

const SESSION_KEY = 'pazo_validation_session_id'

const getSessionId = () => {
  const existing = sessionStorage.getItem(SESSION_KEY)
  if (existing) return existing

  const id = crypto.randomUUID()
  sessionStorage.setItem(SESSION_KEY, id)
  return id
}

export const recordFeatureExperimentView = async (
  moduleKey: string,
  source: string
) => {
  const { error } = await supabase
    .from('module_validation_views')
    .upsert(
      {
        module_key: moduleKey,
        session_id: getSessionId(),
        source,
      },
      {
        onConflict: 'user_id,module_key,session_id',
        ignoreDuplicates: true,
      }
    )

  if (error) throw error
}

export const recordFeatureExperimentInterest = async (
  moduleKey: string,
  source: string
) => {
  const { error } = await supabase.from('module_validation_interests').insert({
    module_key: moduleKey,
    source,
  })

  if (error && error.code !== '23505') throw error
}

export const hasFeatureExperimentInterest = async (moduleKey: string) => {
  const { data, error } = await supabase
    .from('module_validation_interests')
    .select('module_key')
    .eq('module_key', moduleKey)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

/** Explicit one-choice feedback, not autocapture. One answer per account+module. */
export type FeatureIntent='use'|'create'|'explore'
export const getFeatureExperimentIntent=async(moduleKey:string):Promise<FeatureIntent|null>=>{
 const {data,error}=await supabase.from('module_validation_intents')
  .select('intent_key').eq('module_key',moduleKey).maybeSingle()
 if(error)throw error
 return data?.intent_key==='use'||data?.intent_key==='create'||data?.intent_key==='explore'
  ?data.intent_key:null
}
export const recordFeatureExperimentIntent=async(
 moduleKey:string,source:string,intent:FeatureIntent,
)=>{
 const {error}=await supabase.from('module_validation_intents').upsert({
  module_key:moduleKey,source,intent_key:intent,
 },{onConflict:'user_id,module_key'})
 if(error)throw error
}

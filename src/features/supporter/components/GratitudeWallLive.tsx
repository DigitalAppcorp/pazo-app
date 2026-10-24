import {useEffect, useState} from 'react'
import {supabase} from '../../../services/supabaseClient'
import {GratitudeWallScene, type WallEntry, type WallTab} from './GratitudeWallScene'

type Props = {lang:'es'|'en';onClose:()=>void;backToWelcome?:boolean}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function validWallRows(data:unknown):data is WallEntry[] {
  if(!Array.isArray(data)||data.length>48)return false
  const ids=new Set<string>()
  for(const row of data) {
    if(!row||typeof row!=='object'||!UUID.test(row.pet_id)||
       ids.has(row.pet_id)||typeof row.pet_name!=='string'||
       row.pet_name.length<1||row.pet_name.length>120||
       (row.photo_url!==null && (typeof row.photo_url!=='string' ||
         !/^https:\/\//.test(row.photo_url) || row.photo_url.length>2000))||
       ![0,3,6,12].includes(row.milestone))return false
    ids.add(row.pet_id)
  }
  return true
}

/**
 * Read-only wall. The SECURITY DEFINER RPC enforces current paid coverage and
 * revoked/owner-bound per-pet consent on every read. No owner or payment data
 * reaches this view; nothing is inferred from a PayPal redirect.
 *
 * RPC returns rows in consent-granted order ASC. "Recent" reverses consent
 * order; "Longest supporting" sorts by VERIFIED milestone, not an invented
 * continuous tenure or a synthetic first-payment date.
 */
export function GratitudeWallLive({lang,onClose,backToWelcome=false}:Props) {
  const [rows,setRows]=useState<WallEntry[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState(false)
  const [tab,setTab]=useState<WallTab>('all')
  const [revision,setRevision]=useState(0)

  useEffect(()=>{
    let active=true
    setLoading(true)
    setError(false)
    setRows([])
    void Promise.resolve(supabase.rpc('pazo_supporter_public_wall',{p_limit:48}))
      .then(({data,error:backendError})=>{
        if(!active)return
        if(backendError||!validWallRows(data))throw Error('PUBLIC_WALL_UNTRUSTED')
        setRows(data)
      })
      .catch(()=>{if(active){setError(true);setRows([])}})
      .finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[revision])

  return <GratitudeWallScene lang={lang} onClose={onClose}
    rows={rows} tab={tab} onTabChange={setTab}
    loading={loading} error={error} onRetry={()=>setRevision(n=>n+1)} backToWelcome={backToWelcome}/>
}

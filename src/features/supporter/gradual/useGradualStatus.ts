import {useCallback,useEffect,useRef,useState} from 'react'
import {supabase} from '../../../services/supabaseClient'
import {useAuth} from '../../../context/AuthContext'

export type GradualState='not_joined'|'waiting'|'slot_granted'|'paying'|'payment_verifying'|'benefits_active'|'benefits_ended'|'issue'|'withdrawn'|'declined'
export type GradualStatus={source:'gradual_owner_v1';pilotStage:string;campaignState:string;revision:number;myState:GradualState;eligible:boolean;myCanCheckout:boolean;benefitsActive:boolean;pendingVerification:boolean;feedback:'ok'|'issue'|'skipped'|null}
const states=new Set(['not_joined','waiting','slot_granted','paying','payment_verifying','benefits_active','benefits_ended','issue','withdrawn','declined'])
export function parseGradualStatus(raw:unknown):GradualStatus|null{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null
 const v=raw as Partial<GradualStatus>
 return v.source==='gradual_owner_v1'&&states.has(v.myState||'')&&Number.isSafeInteger(v.revision)&&Number(v.revision)>=0&&(v.feedback===null||['ok','issue','skipped'].includes(v.feedback||''))&&
  ['L1_FIRST_REAL','L2_SMALL','L3_BETA','L4_EXTENDED','LIMITED_COMPLETE'].includes(v.pilotStage||'')&&
  ['inactive','active','paused_admin','paused_automatic'].includes(v.campaignState||'')&&
  typeof v.eligible==='boolean'&&typeof v.myCanCheckout==='boolean'&&typeof v.benefitsActive==='boolean'&&typeof v.pendingVerification==='boolean'
  ?v as GradualStatus:null
}
export function useGradualStatus(enabled=true){
 const {user}=useAuth();const owner=enabled?user?.id??null:null
 const [revision,setRevision]=useState(0)
 const [result,setResult]=useState<{owner:string;revision:number;value:GradualStatus|null}|null>(null)
 const [busyOwner,setBusyOwner]=useState<string|null>(null)
 const pending=useRef<{owner:string;token:symbol}|null>(null);const currentOwner=useRef(owner)
 useEffect(()=>{currentOwner.current=owner;return()=>{currentOwner.current=null}},[owner])
 const refresh=useCallback(()=>setRevision(v=>v+1),[])
 const value=result?.owner===owner?result.value:null
 useEffect(()=>{
  let current=true;if(!owner)return
  void(async()=>{try{
   const response=await supabase.rpc('pazo_gradual_my_status')
   const parsed=response.error?null:parseGradualStatus(response.data)
   if(current)setResult({owner,revision,value:parsed})
  }catch{if(current)setResult({owner,revision,value:null})}})()
  return()=>{current=false}
 },[owner,revision])
 useEffect(()=>{
  const focused=()=>{if(document.visibilityState==='visible')refresh()}
  window.addEventListener('online',refresh);window.addEventListener('focus',refresh)
  window.addEventListener('hashchange',refresh);document.addEventListener('visibilitychange',focused)
  const timer=window.setInterval(focused,20000)
  return()=>{clearInterval(timer);window.removeEventListener('online',refresh);window.removeEventListener('focus',refresh);window.removeEventListener('hashchange',refresh);document.removeEventListener('visibilitychange',focused)}
 },[refresh])
 const act=useCallback(async(action:string,component?:string)=>{
  if(!owner||pending.current?.owner===owner)return false
  const operation={owner,token:Symbol('gradual-action')};pending.current=operation;setBusyOwner(owner)
  try{
   const response=action==='ok'||action==='issue'||action==='skipped'
    ?await supabase.rpc('pazo_gradual_feedback',{p_feedback:action,p_component:component??null})
    :await supabase.rpc('pazo_gradual_interest',{p_action:action})
   if(currentOwner.current!==owner)return false
   refresh();return !response.error
  }catch{return false}finally{if(pending.current===operation){pending.current=null;setBusyOwner(null)}}
 },[owner,refresh])
 return {value,busy:!!owner&&busyOwner===owner,act,refresh,loading:!!owner&&result?.owner!==owner,error:!!owner&&result?.owner===owner&&!value}
}

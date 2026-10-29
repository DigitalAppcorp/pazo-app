import {useEffect,useLayoutEffect,useRef} from 'react'
import {supabase} from '../../services/supabaseClient'
import {BEHAVIOR_COLLECTION_ENABLED,behaviorRecorder,withdrawBehavior,type BehaviorScreen} from './behaviorRuntime'
import {INTELLIGENCE_COLLECTION_ENABLED} from './intelligenceCatalog'

export function useBehaviorObservation(owner:string|undefined,screen:BehaviorScreen|null,state:'ready'|'loading'|'error',petContext=''){
 useLayoutEffect(()=>{behaviorRecorder.setContext(petContext)},[petContext])
 const latest=useRef(screen)
 const previous=useRef<{screen:BehaviorScreen;state:typeof state}|null>(null)
 useLayoutEffect(()=>{latest.current=screen},[screen])
 useEffect(()=>{
  if(!BEHAVIOR_COLLECTION_ENABLED)return
  if((navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl===true){
   if(INTELLIGENCE_COLLECTION_ENABLED&&owner)void withdrawBehavior()
   return
  }
  let current=true,authVersion=0
  previous.current=null
  behaviorRecorder.bind(null)
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
   if(event==='TOKEN_REFRESHED'&&owner&&session?.user.id===owner)behaviorRecorder.refresh({owner,token:session.access_token})
   if(event==='SIGNED_OUT'||event==='SIGNED_IN'||event==='INITIAL_SESSION'){
    authVersion++
    behaviorRecorder.bind(owner&&session&&session.user.id===owner?{owner,token:session.access_token}:null)
    if(latest.current)behaviorRecorder.observe(latest.current,'screen_view','none',document.visibilityState==='visible')
   }
  })
  const requestedVersion=authVersion
  void supabase.auth.getSession().then(({data})=>{
   if(current&&authVersion===requestedVersion&&owner&&data.session&&data.session.user.id===owner){behaviorRecorder.bind({owner,token:data.session.access_token});if(latest.current)behaviorRecorder.observe(latest.current,'screen_view','none',document.visibilityState==='visible')}
  })
  return()=>{current=false;subscription.unsubscribe();behaviorRecorder.bind(null)}
  // Auth binding is separate from screen changes; no session restart per view.
 },[owner])
 useEffect(()=>{
  if(!screen||!BEHAVIOR_COLLECTION_ENABLED){previous.current=null;return}
  const before=previous.current
  previous.current={screen,state}
  const observe=()=>{
   const visible=document.visibilityState==='visible'
   behaviorRecorder.observe(screen,'screen_view','none',visible)
   if(before?.screen===screen&&before.state==='error'&&state==='loading')behaviorRecorder.observe(screen,'retry','none',visible)
   if(state!=='ready')behaviorRecorder.observe(screen,state==='error'?'error':'loading',state==='error'?(navigator.onLine?'unavailable':'network'):'none',visible)
  }
  observe();document.addEventListener('visibilitychange',observe)
  return()=>document.removeEventListener('visibilitychange',observe)
 },[screen,state])
}

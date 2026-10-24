import {useEffect,useRef,useState} from 'react'
import {supabase} from '../../services/supabaseClient'

class AccountRequestScope {
 private controller=new AbortController()
 capture(){
  const observed=this.controller
  return {signal:observed.signal,isCurrent:()=>this.controller===observed&&!observed.signal.aborted}
 }
 invalidate(){this.controller.abort();this.controller=new AbortController()}
}
/** Fence private responses and clear drafts when the authenticated owner changes. */
export function useAccountRequestScope(onChange:()=>void){
 const [scope]=useState(()=>new AccountRequestScope())
 const callback=useRef(onChange)
 useEffect(()=>{callback.current=onChange},[onChange])
 useEffect(()=>{
  let previousOwner:string|null|undefined
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
   const owner=session?.user?.id??null
   if(event==='SIGNED_OUT'||(previousOwner!==undefined&&previousOwner!==owner)){
    scope.invalidate();callback.current()
   }
   previousOwner=owner
  })
  return ()=>{subscription.unsubscribe();scope.invalidate()}
 },[scope])
 return scope
}

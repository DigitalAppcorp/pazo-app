/** Prepared only. No provider is contacted unless the separate landing gate
 * is enabled and an approved public site key is configured. Never persisted. */
type Shield={render:(element:HTMLElement,options:Record<string,unknown>)=>string;execute:(id:string)=>void;remove:(id:string)=>void}
let loading:Promise<Shield>|undefined
export async function requestLandingChallenge():Promise<string|null>{
 const key=import.meta.env.VITE_PAZO_MARKETING_TURNSTILE_SITE_KEY
 if(typeof window==='undefined'||typeof key!=='string'||!/^[-a-zA-Z0-9_]{20,100}$/.test(key))return null
 try{
  loading??=new Promise<Shield>((resolve,reject)=>{
   const existing=(window as Window&{turnstile?:Shield}).turnstile
   if(existing){resolve(existing);return}
   const script=document.createElement('script')
   const timer=window.setTimeout(()=>{script.remove();loading=undefined;reject(Error('challenge_unavailable'))},8000)
   script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true
   script.onload=()=>{window.clearTimeout(timer);const api=(window as Window&{turnstile?:Shield}).turnstile;if(api)resolve(api);else{loading=undefined;reject(Error('challenge_unavailable'))}}
   script.onerror=()=>{window.clearTimeout(timer);script.remove();loading=undefined;reject(Error('challenge_unavailable'))}
   document.head.append(script)
  })
  const shield=await loading
  return await new Promise(resolve=>{
   // Only an approved Invisible site key is supported. If misconfigured to
   // require interaction, discard the signal rather than add signup UI.
   const holder=document.createElement('div');holder.hidden=true;holder.setAttribute('aria-hidden','true');document.body.append(holder)
   let id:string|undefined,finished=false
   const finish=(token:string|null)=>{if(finished)return;finished=true;window.clearTimeout(timer);if(id!==undefined)shield.remove(id);holder.remove();resolve(token)}
   const timer=window.setTimeout(()=>finish(null),12000)
   try{id=shield.render(holder,{sitekey:key,action:'pazo_marketing_landing',execution:'execute',appearance:'interaction-only',
    callback:(token:string)=>finish(typeof token==='string'&&token.length<=2048?token:null),
    'error-callback':()=>finish(null),'expired-callback':()=>finish(null),'timeout-callback':()=>finish(null)})
    shield.execute(id)
   }catch{finish(null)}
  })
 }catch{return null}
}

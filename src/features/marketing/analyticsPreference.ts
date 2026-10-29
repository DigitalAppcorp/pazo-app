/** Functional browser preference, never an identity or a server-side signal.
 * Kept across Auth/logout/account deletion; revocation is explicit in Admin.
 */
export const ANALYTICS_EXCLUSION_KEY='pazo_analytics_excluded_v1'
type Preference='included'|'excluded'|'unavailable'
const listeners=new Set<()=>void>()
let generation=0,temporaryExclusion=false,observedWindow:Window|undefined
const changed=()=>{generation++;for(const listener of listeners)listener()}
const onStorage=(event:StorageEvent)=>{if(event.key===ANALYTICS_EXCLUSION_KEY||event.key===null)changed()}
function watchStorage(){
 if(typeof window==='undefined'||observedWindow===window)return
 observedWindow?.removeEventListener?.('storage',onStorage)
 observedWindow=window
 window.addEventListener?.('storage',onStorage)
}
export function analyticsPreference():Preference{
 watchStorage()
 if(typeof window==='undefined')return 'included'
 try{
  if(window.localStorage.getItem(ANALYTICS_EXCLUSION_KEY)==='1')return 'excluded'
  return temporaryExclusion?'unavailable':'included'
 }catch{return 'unavailable'}
}
export function browserAnalyticsAllowed():boolean{
 return analyticsPreference()==='included'&&(typeof navigator==='undefined'||(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl!==true)
}
export function subscribeAnalyticsPreference(listener:()=>void){
 watchStorage();listeners.add(listener)
 return()=>{listeners.delete(listener)}
}
export function excludeBrowserAnalytics(excluded:boolean):boolean{
 watchStorage()
 let saved=false
 try{
  if(excluded)window.localStorage.setItem(ANALYTICS_EXCLUSION_KEY,'1')
  else window.localStorage.removeItem(ANALYTICS_EXCLUSION_KEY)
  saved=(window.localStorage.getItem(ANALYTICS_EXCLUSION_KEY)==='1')===excluded
 }catch{/* Cannot promise persistence when storage is denied. */}
 temporaryExclusion=!saved
 changed()
 return saved
}
/** An on→off→on preference sequence cannot revive an old request. */
export function captureAnalyticsRequest():()=>boolean{
 const allowed=browserAnalyticsAllowed(),epoch=generation
 return()=>allowed&&epoch===generation&&browserAnalyticsAllowed()
}

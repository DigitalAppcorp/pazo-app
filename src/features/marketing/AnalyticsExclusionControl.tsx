import {useState,useSyncExternalStore} from 'react'
import {analyticsPreference,excludeBrowserAnalytics,subscribeAnalyticsPreference} from './analyticsPreference'

export function AnalyticsExclusionControl({lang}:{lang:'es'|'en'}){
 const l=(es:string,en:string)=>lang==='es'?es:en
 const preference=useSyncExternalStore(subscribeAnalyticsPreference,analyticsPreference,()=> 'unavailable')
 const [failed,setFailed]=useState(false)
 const excluded=preference!=='included'
 return <div className="pa-exclusion">
  <div className="pa-exclusion-row"><div><strong>{l('Excluir señales de este navegador','Exclude signals from this browser')}</strong><p>{l('Detiene los envíos de visitas y uso de herramientas, incluso después de cerrar sesión.','Stop sending visit and tool-use signals, including after signing out.')}</p></div>
   <button type="button" role="switch" aria-checked={excluded} aria-label={l('Excluir señales de este navegador','Exclude signals from this browser')} onClick={()=>setFailed(!excludeBrowserAnalytics(!excluded))}><span aria-hidden="true" data-active={excluded}/></button>
  </div>
  <p>{l('Se aplica a todas las cuentas y visitas sin sesión de este navegador. No borra datos previos ni se aplica a otros dispositivos. Puedes desactivarlo aquí.','Applies to all accounts and signed-out visits in this browser. It does not erase earlier data or apply to other devices. You can turn it off here.')}</p>
  <p>{l('Los registros guardados, como un cuidado, pueden seguir contándose en informes del servicio. Esta opción controla los envíos del navegador.','Saved records, such as a care item, may still count in service reports. This option controls browser transmissions.')}</p>
  {(failed||preference==='unavailable')&&<p role="status">{l('No podemos guardar o leer la preferencia. Por privacidad, este navegador no enviará señales mientras el almacenamiento no esté disponible.','The preference cannot be saved or read. For privacy, this browser will not send signals while storage is unavailable.')}</p>}
 </div>
}

import { useEffect,useState } from 'react'
import {
 getFeatureExperimentIntent,recordFeatureExperimentIntent,
 type FeatureIntent,
} from '../../../services/featureExperimentService'

const options:{id:FeatureIntent;es:string;en:string}[]=[
 {id:'use',es:'Usarlo cuando esté disponible',en:'Use it when available'},
 {id:'create',es:'Crear u organizar algo',en:'Create or organize something'},
 {id:'explore',es:'Explorar lo que otros comparten',en:'Explore what others share'},
]
/** Render only after the user explicitly marked "Me interesa". */
export function FeatureIntentChoice({moduleKey,source,lang}:{
 moduleKey:string;source:string;lang:'es'|'en'
}){
 const [selected,setSelected]=useState<FeatureIntent|null>(null)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 useEffect(()=>{
  let active=true
  setSelected(null)
  void getFeatureExperimentIntent(moduleKey).then(v=>{if(active)setSelected(v)})
    .catch(()=>{if(active)setError(lang==='es'?'No se pudo recuperar tu voto.':'Could not load your vote.')})
  return ()=>{active=false}
 },[moduleKey,lang])
 const choose=async(id:FeatureIntent)=>{
  if(busy)return
  setBusy(true);setError('')
  try{await recordFeatureExperimentIntent(moduleKey,source,id);setSelected(id)}
  catch{setError(lang==='es'?'No pudimos guardar tu elección. Inténtalo de nuevo.':'Could not save your choice. Try again.')}
  finally{setBusy(false)}
 }
 return <section aria-label={lang==='es'?'Preferencia para esta función':'Preference for this feature'}
  className="mt-3 rounded-[19px] bg-white/90 p-3">
  <p className="text-[12px] font-extrabold text-[#204E4A]">
   {lang==='es'?'¿Qué te gustaría hacer con esta función?':'What would you like to do with this feature?'}
  </p>
  <p className="mt-1 text-[11px] text-[#5C7470]">
   {lang==='es'?'Tu respuesta es opcional y ayuda a decidir qué construir primero.':'Your answer is optional and helps prioritize development.'}
  </p>
  <div className="mt-2 flex flex-wrap gap-2">
   {options.map(option=><button type="button" key={option.id} disabled={busy}
     aria-pressed={selected===option.id}
     onClick={()=>void choose(option.id)}
     className={'rounded-full px-3 py-2 text-[11px] font-bold transition-colors focus-visible:bg-[#E1E53F] disabled:opacity-50 '+
      (selected===option.id?'bg-[#204E4A] text-white':'bg-[#F0F3E7] text-[#204E4A] hover:bg-[#E1E53F]')}>
     {lang==='es'?option.es:option.en}
   </button>)}
  </div>
  {selected&&<p className="mt-2 text-[11px] font-bold text-[#436F5E]">{lang==='es'?'Preferencia registrada. Puedes cambiarla.':'Preference saved. You can change it.'}</p>}
  {error&&<p role="alert" className="mt-2 text-[11px] font-medium text-[#A24739]">{error}</p>}
 </section>
}

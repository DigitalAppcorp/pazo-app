import {creatives,type BehaviorSegment} from './behaviorSummary'
export function BehaviorFilters({lang,segment,creative,onSegment,onCreative}:{lang:'es'|'en';segment:BehaviorSegment;creative:string;onSegment:(value:BehaviorSegment)=>void;onCreative:(value:string)=>void}){
 const l=(es:string,en:string)=>lang==='es'?es:en
 const source=segment==='all'?l('Todos los orígenes','All sources'):segment==='paid_attributed'?l('Anuncio validado','Validated ad'):l('Origen desconocido','Unknown source')
 const name=(c:string)=>c==='all'?l('Todos los anuncios','All ads'):c.includes('_v2_')?(c==='cuidados_v2_en'?l('Cuidados','Care'):c==='app_v2_en'?'PAZO':'QR')+' · EN · v2':l(c.startsWith('qr_')?'Pasaporte QR':c.startsWith('perfil_')?'Perfil de mascota':'Comunidad',c.startsWith('qr_')?'QR passport':c.startsWith('perfil_')?'Pet profile':'Community')+' · '+(c.endsWith('_es')?'ES':'EN')
 return <details className="behavior-filter-disclosure"><summary>{l('Filtrar resultados','Filter results')} <span>{source} · {name(creative)}</span></summary><div className="behavior-filters">
  <label>{l('Origen de cuenta','Account source')}<select value={segment} onChange={e=>onSegment(e.target.value as BehaviorSegment)}><option value="all">{l('Todos los orígenes','All sources')}</option><option value="paid_attributed">{l('Anuncio validado','Validated ad')}</option><option value="unknown">{l('Origen desconocido','Unknown source')}</option></select></label>
  <label>{l('Anuncio','Ad creative')}<select value={creative} disabled={segment==='unknown'} onChange={e=>onCreative(e.target.value)}>{creatives.map(c=><option key={c} value={c}>{name(c)}</option>)}</select></label>
  <p>{l('Campaña','Campaign')}: {creative.includes('_v2_')?'pazo_la_en_202611':creative==='all'?l('Histórica + ensayo 2','Historical + trial 2'):'pazo_beta_local_202610'}</p>
 </div></details>
}

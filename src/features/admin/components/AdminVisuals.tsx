
import type {ReactNode} from 'react'

export type AdminGlyphName='users'|'paw'|'crown'|'money'|'activity'|'database'|'layers'|'chart'|'heart'|'alert'|'search'|'compass'|'calendar'|'clock'|'settings'|'pin'|'check'|'flame'|'chevron'
export function AdminGlyph({name,size=23}:{name:AdminGlyphName;size?:number}){
 const icons:Record<AdminGlyphName,ReactNode>={
  users:<><circle cx="9" cy="7.5" r="3"/><path d="M2.5 20v-2.2a6.5 6.5 0 0 1 13 0V20M17 4.5a3.2 3.2 0 0 1 0 6.4m1 4a5 5 0 0 1 3.5 5.1"/></>,
  paw:<><ellipse cx="5.2" cy="9" rx="1.5" ry="2.2"/><ellipse cx="9.7" cy="5.6" rx="1.7" ry="2.3"/><ellipse cx="15.1" cy="6.5" rx="1.7" ry="2.2"/><ellipse cx="19.1" cy="10.5" rx="1.4" ry="2"/><path d="M6 17.2c0-3.1 3.2-5.2 6-5.2s6 2.1 6 5.2c0 2.3-1.6 3.7-3.9 3.7-.9 0-1.4-.5-2.1-.5s-1.2.5-2.1.5C7.6 20.9 6 19.5 6 17.2Z"/></>,
  crown:<path d="m2.5 7 5.4 4.2L12 4l4.1 7.2L21.5 7 20 19H4L2.5 7Zm2.4 15h14.2"/>,
  money:<><circle cx="12" cy="12" r="9"/><path d="M15.4 8.6c-1-1.4-5.5-1.8-6.4.4-1.5 3.7 7.6 1 6.5 5.7-1.1 2.4-5.5 2.5-7 .5M12 5v14"/></>,
  activity:<path d="M2 13h5l2.6-7 4.8 12 2.7-6H22"/>,
  database:<><ellipse cx="12" cy="5" rx="8.5" ry="3"/><path d="M3.5 5v7c0 1.7 3.8 3 8.5 3s8.5-1.3 8.5-3V5M3.5 12v7c0 1.7 3.8 3 8.5 3s8.5-1.3 8.5-3v-7"/></>,
  layers:<><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7 9h10M7 13h10M7 17h7"/></>,
  chart:<><path d="M3 20h18M5 16l5-5 3 3 6-9"/><path d="M16 5h3v3"/></>,
  heart:<path d="M12 21s-9-5.4-9-11.1C3 4.8 9.4 2.5 12 7c2.6-4.5 9-2.2 9 2.9C21 15.6 12 21 12 21Z"/>,
  alert:<><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3h.01"/></>,
  search:<><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/></>,
  compass:<><circle cx="12" cy="12" r="9"/><path d="m16 8-3 6-5 2 2-6Z"/></>,
  calendar:<><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6M17 2v6M3 11h18"/></>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="m10 2 .5 2.3a8 8 0 0 0-2 1.2L6.4 4.4 4 7l1.2 2a8 8 0 0 0 0 3L3 13l1 3 2.5.3a8 8 0 0 0 2 1.5l-.3 2.3 3.5.9 1.4-2a8 8 0 0 0 2.6-.8l2 1.2 2-3-1.3-1.9a8 8 0 0 0 .5-2.6L22 10l-1-3-2.4-.4a8 8 0 0 0-1.7-1.7L17.1 2h-3.4l-.6 2.2"/></>,
  pin:<><path d="M20 10c0 5.5-8 12-8 12S4 15.5 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.6"/></>,
  check:<path d="m4 12 5 5L20 6"/>,
  flame:<path d="M12 22c5 0 8-3.7 8-8.2 0-3.2-1.8-5.5-4.7-8.8.2 3.5-1.6 5-2.2 5.1.3-3.5-2.1-6.3-4.2-8.1.3 4.2-5 6.6-5 12.5C3.9 18.9 7.3 22 12 22Z"/>
  chevron:<path d="m9 5 7 7-7 7"/>
 }
 return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

export function AdminMiniSpark({values,color='#158653'}:{values:number[];color?:string}){
 // This is a distribution silhouette from observed bins, NOT a historical trend.
 const max=Math.max(1,...values)
 const points=values.map((v,i)=>`${10+(i*100/Math.max(1,values.length-1))},${42-v/max*30}`).join(' ')
 return <svg className="h-11 w-[112px]" viewBox="0 0 120 51" fill="none" role="img" aria-label="Distribución de valores observados">
  <polyline points={points} stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" fill="none"/>
  {values.map((v,i)=><circle key={i} cx={10+(i*100/Math.max(1,values.length-1))} cy={42-v/max*30} r="2.5" fill={color}/>)}
 </svg>
}

export function AdminDonut({parts,total,centerLabel}:{parts:{label:string;count:number;color:string}[];total:number;centerLabel:string}){
 const observed=parts.filter(p=>p.count>0)
 let current=0
 const stops=observed.map(p=>{
  const from=current
  current+=p.count/Math.max(1,total)*100
  return `${p.color} ${from}% ${current}%`
 })
 const gradient=stops.length? `conic-gradient(${stops.join(', ')})`:'conic-gradient(#E8EEE8 0 100%)'
 return <div className="flex flex-col items-center gap-4 sm:flex-row">
  <div className="relative h-[152px] w-[152px] shrink-0 rounded-full" style={{background:gradient}} role="img"
   aria-label={parts.map(p=>`${p.label}: ${p.count}`).join(', ')}>
   <div className="absolute inset-[24px] flex flex-col items-center justify-center rounded-full bg-white">
    <strong className="text-[23px] font-black text-[#173D38]">{total}</strong>
    <span className="text-[11px] font-bold text-[#71857F]">{centerLabel}</span>
   </div>
  </div>
  <div className="w-full space-y-2.5">
   {parts.map(p=><div key={p.label} className="flex items-center gap-2 text-[13px]">
    <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{backgroundColor:p.color}}/>
    <span className="min-w-0 flex-1 text-[#486A60]">{p.label}</span>
    <strong className="text-[#204E4A]">{p.count}</strong>
   </div>)}
  </div>
 </div>
}

export function AdminCohortColumns({prior,older,recent,labels}:{
 prior:number;older:number;recent:number;labels:[string,string,string]
}){
 const data=[Math.max(0,prior),Math.max(0,older),Math.max(0,recent)]
 const max=Math.max(1,...data)
 return <div role="img" aria-label={data.map((v,i)=>`${labels[i]}: ${v}`).join(', ')}>
  <div className="relative flex h-[200px] items-end justify-around gap-4 bg-[repeating-linear-gradient(to_top,#EDF3ED_0px,#EDF3ED_1px,transparent_1px,transparent_49px)] px-4 pt-3">
   {data.map((value,i)=><div key={labels[i]} className="flex h-full w-1/4 flex-col items-center justify-end gap-2">
    <strong className="text-[13px] text-[#294E45]">{value}</strong>
    <div className={'w-full max-w-[74px] rounded-t-[8px] '+(i===1?'bg-[#8DCE67]':'bg-[#176C52]')}
      style={{height:Math.max(0,value?8+value/max*148:0)}}/>
   </div>)}
  </div>
  <div className="flex justify-around gap-3 py-3 text-center">
   {labels.map(v=><p key={v} className="w-1/3 text-[11px] font-semibold leading-snug text-[#768982]">{v}</p>)}
  </div>
 </div>
}

/** Radial module reach: each circle is observed users of that module / all
 * observed active users in the selected period. Rings may overlap by user;
 * it is NOT a historical trend or additive share of the audience. */
export function AdminModuleRings({items,base,centerLabel}:{
 items:{name:string;value:number;color:string}[];base:number;centerLabel:string
}){
 const radii=[79,61,43,25]
 return <div className="flex min-h-[216px] flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-2">
  <svg viewBox="0 0 216 208" role="img"
   aria-label={items.map(v=>v.name+': '+v.value+' de '+base+' usuarios activos').join('; ')}
   className="h-[188px] w-[188px] shrink-0 overflow-visible">
   {items.slice(0,4).map((item,i)=>{
    const radius=radii[i], circumference=2*Math.PI*radius
    const progress=Math.min(1,Math.max(0,item.value/Math.max(1,base)))
    return <g key={item.name}>
     <circle cx="108" cy="104" r={radius} fill="none" stroke="#EFF3ED" strokeWidth="11"/>
     <circle cx="108" cy="104" r={radius} fill="none" stroke={item.color}
      strokeWidth="11" strokeLinecap="round" transform="rotate(-90 108 104)"
      strokeDasharray={circumference*progress+' '+circumference}/>
    </g>
   })}
   <text x="108" y="104" fontSize="26" fontWeight="800" textAnchor="middle" fill="#173D38">{base}</text>
   <text x="108" y="122" fontSize="11" fontWeight="700" textAnchor="middle" fill="#647E71">{centerLabel}</text>
  </svg>
  <div className="w-full min-w-0 flex-1 space-y-3">
   {items.map(item=><div key={item.name} className="flex items-center gap-2.5 text-[13px]">
    <span className="h-3 w-3 shrink-0 rounded-full" style={{backgroundColor:item.color}}/>
    <span className="min-w-0 flex-1 truncate font-semibold text-[#526F63]">{item.name}</span>
    <strong className="text-[14px] text-[#204E4A]">{item.value}</strong>
   </div>)}
  </div>
 </div>
}

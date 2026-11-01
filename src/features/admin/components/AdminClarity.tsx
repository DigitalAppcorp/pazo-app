import {useEffect,useId,useRef,useState,type KeyboardEvent,type ReactNode} from 'react'
import {AdminGlyph,type AdminGlyphName} from './AdminVisuals'
import './AdminClarity.css'

/** Explanations stay one tap away, so charts carry numbers instead of footnotes.
 * Opens by click or keyboard, never hover only, and Escape closes it first. */
export function InfoTip({label,children}:{label:string;children:ReactNode}){
 const [position,setPosition]=useState<{left:number;top:number}|null>(null)
 const button=useRef<HTMLButtonElement>(null),box=useRef<HTMLDivElement>(null),id=useId()
 const close=()=>setPosition(null)
 useEffect(()=>{
  if(!position)return
  const outside=(event:PointerEvent)=>{const target=event.target as Node;if(!box.current?.contains(target)&&!button.current?.contains(target))close()}
  document.addEventListener('pointerdown',outside)
  // A scroll still settling from the tap itself must not close the tip it just opened.
  const settle=window.setTimeout(()=>window.addEventListener('scroll',close,true),200)
  window.addEventListener('resize',close)
  return()=>{window.clearTimeout(settle);document.removeEventListener('pointerdown',outside);window.removeEventListener('scroll',close,true);window.removeEventListener('resize',close)}
 },[position])
 const toggle=()=>{
  if(position||!button.current)return close()
  const rect=button.current.getBoundingClientRect(),width=Math.min(280,window.innerWidth-24)
  setPosition({left:Math.max(12,Math.min(rect.left-width/2,window.innerWidth-width-12)),top:rect.bottom+6})
 }
 const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&position){event.preventDefault();event.stopPropagation();close();button.current?.focus()}}
 return <span className="ac-info" onKeyDown={escape}>
  <button ref={button} type="button" aria-label={label} aria-expanded={!!position} aria-controls={position?id:undefined} onClick={toggle}>i</button>
  {position&&<div ref={box} id={id} role="note" style={position}>{children}</div>}
 </span>
}

export function ChartPanel({title,unit,info,infoLabel,aside,children,className=''}:{title:string;unit?:string;info?:ReactNode;infoLabel?:string;aside?:ReactNode;children:ReactNode;className?:string}){
 const id=useId()
 return <section className={'pa-panel '+className} aria-labelledby={id}><div className="pa-panel-heading"><div className="pa-panel-title"><h3 id={id}>{title}</h3>{info&&<InfoTip label={infoLabel??title}>{info}</InfoTip>}{unit&&<small>{unit}</small>}</div>{aside}</div>{children}</section>
}

/** Thin daily line. A null is unpublished data and stays a gap, never a zero. */
export function Spark({values}:{values:(number|null)[]}){
 const max=Math.max(1,...values.map(v=>v??0)),x=(i:number)=>i*100/Math.max(1,values.length-1),y=(v:number)=>30-v/max*26
 const runs:string[][]=[];let run:string[]=[]
 values.forEach((v,i)=>{if(v===null){if(run.length)runs.push(run);run=[]}else run.push(x(i)+','+y(v))})
 if(run.length)runs.push(run)
 return <svg className="ac-spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">{runs.map(r=><polyline key={r[0]} points={r.length>1?r.join(' '):r[0]+' '+r[0]} vectorEffect="non-scaling-stroke"/>)}</svg>
}

export function MiniRing({value,total}:{value:number;total:number}){
 return <svg className="ac-ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="14"/><circle cx="18" cy="18" r="14" pathLength="100" strokeDasharray={(total?100*value/total:0)+' 100'} transform="rotate(-90 18 18)"/></svg>
}

export function RankBars({rows,empty}:{rows:{key:string;label:string;value:number;display?:string;meta?:string}[];empty?:string}){
 const max=Math.max(1,...rows.map(r=>r.value))
 if(!rows.length)return <p className="ac-empty">{empty}</p>
 return <ol className="ac-rank">{rows.map(r=><li key={r.key}><div><span>{r.label}</span><strong>{r.display??r.value}{r.meta&&<small>{r.meta}</small>}</strong></div><i aria-hidden="true"><b style={{width:100*r.value/max+'%'}}/></i></li>)}</ol>
}

export function PairBars({rows,first,second,empty}:{rows:{key:string;label:string;a:number;b:number|null}[];first:string;second?:string;empty?:string}){
 const max=Math.max(1,...rows.flatMap(r=>[r.a,r.b??0]))
 if(!rows.length)return <p className="ac-empty">{empty}</p>
 return <><div className="ac-pair-key"><span><i/>{first}</span>{second&&<span><i data-second="true"/>{second}</span>}</div><ol className="ac-pair">{rows.map(r=><li key={r.key}><span>{r.label}</span><div><i aria-hidden="true"><b style={{width:100*r.a/max+'%'}}/></i><strong>{r.a.toLocaleString('es-US')}</strong></div>{r.b!==null&&<div><i aria-hidden="true"><b data-second="true" style={{width:100*r.b/max+'%'}}/></i><strong>{r.b.toLocaleString('es-US')}</strong></div>}</li>)}</ol></>
}

export function PulseTile({icon,label,value,hint,onOpen}:{icon:AdminGlyphName;label:string;value:string;hint?:string;onOpen:()=>void}){
 return <button type="button" className="ac-pulse" onClick={onOpen}>
  <span aria-hidden="true"><AdminGlyph name={icon} size={18}/></span>
  <span><small>{label}</small><strong>{value}</strong></span>
  {hint&&<em>{hint}</em>}
 </button>
}

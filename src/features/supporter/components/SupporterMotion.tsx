import {useLayoutEffect,useRef} from 'react'
import type {ReactNode} from 'react'

/** Same opaque, directional liquid slide approved for Communities. */
export function SupporterMotion({motionKey,back=false,children}:{motionKey:string;back?:boolean;children:ReactNode}){
 const node=useRef<HTMLDivElement>(null),host=useRef<HTMLDivElement>(null),snapshot=useRef<HTMLElement|null>(null)
 const previous=useRef(motionKey)
 const remember=()=>{snapshot.current=node.current?.cloneNode(true) as HTMLElement|null}
 useLayoutEffect(()=>{
  const changed=previous.current!==motionKey;previous.current=motionKey
  const incoming=node.current,outgoing=host.current,old=snapshot.current
  if(!incoming||!outgoing||!changed||!old||matchMedia('(prefers-reduced-motion:reduce)').matches){remember();return}
  old.inert=true;old.setAttribute('aria-hidden','true');old.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));outgoing.replaceChildren(old)
  const x=incoming.clientWidth*(back?-1:1),options={duration:460,easing:'cubic-bezier(.22,1.26,.36,1)',fill:'both' as const}
  const a=incoming.animate([{transform:`translateX(${x}px)`},{transform:'translateX(0)'}],options),b=outgoing.animate([{transform:'translateX(0)'},{transform:`translateX(${-x}px)`}],options)
  const clean=()=>{a.cancel();b.cancel();outgoing.replaceChildren();remember()};Promise.all([a.finished,b.finished]).then(clean).catch(()=>{})
  const media=matchMedia('(prefers-reduced-motion:reduce)'),reduce=()=>{if(media.matches)clean()};media.addEventListener('change',reduce)
  return()=>{media.removeEventListener('change',reduce);clean()}
 },[motionKey,back])
 return <div className="pazo-supporter-motion"><div ref={node} className="pazo-supporter-motion-surface" onClickCapture={remember} onKeyDownCapture={remember}>{children}</div><div ref={host} className="pazo-supporter-motion-outgoing"/></div>
}

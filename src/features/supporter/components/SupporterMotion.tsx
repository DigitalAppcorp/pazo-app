import {useLayoutEffect,useRef} from 'react'
import type {ReactNode} from 'react'

/** Same opaque, directional liquid slide approved for Communities. */
export function SupporterMotion({motionKey,back=false,enter=false,children}:{motionKey:string;back?:boolean;enter?:boolean;children:ReactNode}){
 const node=useRef<HTMLDivElement>(null),host=useRef<HTMLDivElement>(null),snapshot=useRef<HTMLElement|null>(null)
 const previous=useRef<string|null>(null)
 const remember=()=>{snapshot.current=node.current?.cloneNode(true) as HTMLElement|null}
 useLayoutEffect(()=>{
  const first=previous.current===null,changed=previous.current!==motionKey;previous.current=motionKey
  const incoming=node.current,outgoing=host.current,old=first?null:snapshot.current
  if(!incoming||!outgoing||!changed||(first&&!enter)||(!first&&!old)||matchMedia('(prefers-reduced-motion:reduce)').matches){remember();return}
  if(old){old.inert=true;old.setAttribute('aria-hidden','true');old.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));outgoing.replaceChildren(old)}
  if(first)remember()
  const x=incoming.clientWidth*(first?1:back?-1:1),options={duration:460,easing:'cubic-bezier(.22,1.26,.36,1)',fill:'both' as const}
  const a=incoming.animate([{transform:`translateX(${x}px)`},{transform:'translateX(0)'}],options),b=old?outgoing.animate([{transform:'translateX(0)'},{transform:`translateX(${-x}px)`}],options):null
  const clean=(save=true)=>{a.cancel();b?.cancel();outgoing.replaceChildren();if(save)remember()};Promise.all([a.finished,...(b?[b.finished]:[])]).then(()=>clean()).catch(()=>{})
  const media=matchMedia('(prefers-reduced-motion:reduce)'),reduce=()=>{if(media.matches)clean()};media.addEventListener('change',reduce)
  return()=>{media.removeEventListener('change',reduce);clean(false)}
 },[motionKey,back,enter])
 return <div className="pazo-supporter-motion"><div ref={node} className="pazo-supporter-motion-surface" onClickCapture={remember} onKeyDownCapture={remember}>{children}</div><div ref={host} className="pazo-supporter-motion-outgoing"/></div>
}

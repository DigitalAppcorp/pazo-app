/** Close only the current visible sheet; never replay a callback after unmount. */
export function exitSupporterScreen(action:()=>void){
 if(typeof document==='undefined'||typeof matchMedia==='undefined'){action();return}
 const panels=document.querySelectorAll<HTMLElement>('[data-supporter-screen-portal]')
 const panel=panels.item(panels.length-1)
 if(!panel||typeof panel.animate!=='function'||matchMedia('(prefers-reduced-motion:reduce)').matches){action();return}
 if(panel.dataset.supporterClosing)return
 panel.dataset.supporterClosing='true'
 const animation=panel.animate([{transform:'translateX(0)'},{transform:'translateX(100%)'}],{duration:460,easing:'cubic-bezier(.22,1.26,.36,1)',fill:'both'})
 const finish=()=>{if(panel.isConnected){delete panel.dataset.supporterClosing;action()}animation.cancel()}
 const media=matchMedia('(prefers-reduced-motion:reduce)'),reduce=()=>{if(media.matches)animation.finish()}
 media.addEventListener('change',reduce)
 animation.finished.then(finish).catch(()=>{}).finally(()=>media.removeEventListener('change',reduce))
}

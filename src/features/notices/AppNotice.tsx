import {PazoStateIllustration} from '../illustrations/PazoStateIllustration'
import {useEffect, useRef, type ReactNode} from 'react'

/** Nonmodal app layer: outside scrolling pages, above the dock, below dialogs. */
export function AppNotice({kind,label,title,description,children,onDismiss,autoFocus=false,lang}:{
  kind:'welcome';label:string;title:string;description:string;
  children:ReactNode;onDismiss:()=>void;autoFocus?:boolean;lang:'es'|'en'
}) {
  const notice=useRef<HTMLElement>(null)
  useEffect(()=>{
    if(autoFocus)notice.current?.querySelector<HTMLButtonElement>('[data-notice-primary]')?.focus({preventScroll:true})
  },[autoFocus])
  const dismiss=()=>{
    onDismiss()
    if(typeof document!=='undefined')document.querySelector<HTMLButtonElement>('nav[data-pazo-floating-nav] button[aria-current="page"]')?.focus({preventScroll:true})
  }
  return <section ref={notice} aria-label={label} data-pazo-app-notice={kind} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();dismiss()}}}
    className="absolute inset-x-3 bottom-[calc(112px+env(safe-area-inset-bottom))] z-[35] max-h-[calc(100%-190px)] overflow-y-auto overscroll-contain rounded-[24px] border border-[#204E4A]/10 bg-[#FFFEFB] p-4 text-[#204E4A] shadow-[0_12px_48px_-12px_rgba(32,78,74,0.30)] sm:inset-x-5 sm:p-5">
    <button type="button" onClick={dismiss} aria-label={lang==='es'?'Cerrar aviso':'Dismiss notice'}
      className="absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center rounded-full text-[#5C7470] hover:bg-[#204E4A]/5 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#204E4A]">
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
    </button>
    <div className="flex items-start gap-3 pr-5">
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#5C7470]">{label}</p>
        <h2 className="break-words text-[20px] font-black leading-[1.2] tracking-tight">{title}</h2>
      </div>
      <PazoStateIllustration kind="welcome"/>
    </div>
    <p className="mt-3 text-[13px] leading-[1.6] text-[#5C7470]">{description}</p>
    <div className="mt-4 grid grid-cols-2 gap-2">{children}</div>
  </section>
}

export const noticePrimary='min-h-12 rounded-2xl bg-[#204E4A] px-3 py-3 text-[13px] font-extrabold leading-snug text-white hover:bg-[#183D3A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#204E4A]'
export const noticeSecondary='min-h-12 rounded-2xl border border-[#204E4A]/15 bg-[#F3F6EE] px-2 py-3 text-[12px] font-extrabold leading-snug text-[#204E4A] hover:bg-[#E7EEDC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#204E4A]'

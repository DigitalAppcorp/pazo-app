import {PazoStateIllustration} from '../illustrations/PazoStateIllustration'
import {useEffect, useRef, type ReactNode} from 'react'

export function NoticeDialog({ kind, label, children, onDismiss }: {
  kind: 'welcome' | 'first-care' | 'first-install'
  label: string
  children: ReactNode
  onDismiss: () => void
}) {
  const notice = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = notice.current
    if (!dialog) return
    dialog.showModal()
    dialog.querySelector<HTMLElement>('[data-notice-primary]')?.focus({ preventScroll: true })
    return () => { if (dialog.open) dialog.close() }
  }, [])

  return <dialog ref={notice} aria-label={label} data-pazo-app-notice={kind}
    onCancel={(event) => { event.preventDefault(); onDismiss() }}
    className="fixed inset-x-3 bottom-[calc(112px+env(safe-area-inset-bottom))] top-auto m-0 max-h-[calc(100dvh_-_150px_-_env(safe-area-inset-bottom))] w-auto max-w-none overflow-y-auto overscroll-contain rounded-[24px] bg-[#FFFEFB] p-4 text-[#204E4A] shadow-[0_16px_52px_-12px_rgba(21,47,43,0.40)] backdrop:bg-[#152F2B]/35 backdrop:backdrop-blur-[6px] sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[calc(100dvh_-_2.5rem)] sm:w-[min(390px,calc(100vw_-_2.5rem))] sm:p-5">
    {children}
  </dialog>
}

export function AppNotice({label,title,description,children,onDismiss,lang}:{
  label:string;title:string;description:string;
  children:ReactNode;onDismiss:()=>void;lang:'es'|'en'
}) {
  return <NoticeDialog kind="welcome" label={label} onDismiss={onDismiss}>
    <button type="button" onClick={onDismiss} aria-label={lang==='es'?'Cerrar aviso':'Dismiss notice'}
      className="absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center rounded-full text-[#5C7470] hover:bg-[#204E4A]/5 focus-visible:bg-[#E1E53F] focus-visible:outline-none">
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
  </NoticeDialog>
}

export const noticePrimary='min-h-12 rounded-2xl bg-[#204E4A] px-3 py-3 text-[13px] font-extrabold leading-snug text-white hover:bg-[#183D3A] focus-visible:bg-[#E1E53F] focus-visible:text-[#204E4A] focus-visible:outline-none'
export const noticeSecondary='min-h-12 rounded-2xl bg-[#F3F6EE] px-2 py-3 text-[12px] font-extrabold leading-snug text-[#204E4A] hover:bg-[#E7EEDC] focus-visible:bg-[#E1E53F] focus-visible:outline-none'

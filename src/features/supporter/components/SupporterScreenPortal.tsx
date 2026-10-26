import {createPortal} from 'react-dom'
import type {ReactNode} from 'react'
import {SupporterMotion} from './SupporterMotion'

/**
 * Both supporter destinations live above the PAZO shell, NOT in My Pet's
 * scrollable main area. Keeping the portal inside the shell preserves
 * the approved 430px phone frame on desktop; a direct account route uses
 * document.body because it renders without the shell.
 */
export function SupporterScreenPortal({children,motionKey='supporter',back=false}:{children:ReactNode;motionKey?:string;back?:boolean}) {
  if (typeof document === 'undefined') return null
  const shell = document.querySelector('[data-pazo-app-shell]')
  const target = shell ?? document.body
  return createPortal(
    <div data-supporter-screen-portal
      className={(shell ? 'absolute' : 'fixed') +
        ' inset-0 z-[115] min-h-0 overflow-hidden bg-[#FAF8F5]'}>
      <SupporterMotion motionKey={motionKey} back={back}>{children}</SupporterMotion>
    </div>,
    target
  )
}

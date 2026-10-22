import {useEffect,useState} from 'react'

// The browser controls install eligibility. In-app mode is reliably detectable;
// a separately launched browser tab cannot always detect an existing installation.
type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>}
type IosNavigator=Navigator&{standalone?:boolean}
const inStandaloneMode=()=>typeof window!=='undefined'&&typeof navigator!=='undefined'&&
  (window.matchMedia('(display-mode: standalone)').matches||
   (navigator as IosNavigator).standalone===true)
const isiOS=()=>typeof navigator!=='undefined'&&
  (/iPad|iPhone|iPod/i.test(navigator.userAgent)||
   (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))

export function PazoInstallControl({lang}:{lang:'es'|'en'}){
 const [installed,setInstalled]=useState(()=>inStandaloneMode())
 const [prompt,setPrompt]=useState<InstallPrompt|null>(null)
 const [showInstructions,setShowInstructions]=useState(false)
 const [isPrompting,setIsPrompting]=useState(false)
 useEffect(()=>{
  const refresh=()=>{if(inStandaloneMode()){setInstalled(true);setPrompt(null);setShowInstructions(false)}}
  const onPrompt=(e:Event)=>{e.preventDefault();if(!inStandaloneMode())setPrompt(e as InstallPrompt)}
  const onInstalled=()=>{setInstalled(true);setPrompt(null);setShowInstructions(false)}
  const media=window.matchMedia('(display-mode: standalone)')
  window.addEventListener('beforeinstallprompt',onPrompt)
  window.addEventListener('appinstalled',onInstalled)
  media.addEventListener?.('change',refresh)
  refresh()
  return ()=>{
   window.removeEventListener('beforeinstallprompt',onPrompt)
   window.removeEventListener('appinstalled',onInstalled)
   media.removeEventListener?.('change',refresh)
  }
 },[])
 if(installed||(!prompt&&!isiOS()))return null
 const es=lang==='es'
 const act=async()=>{
  if(!prompt){setShowInstructions(s=>!s);return}
  if(isPrompting)return
  setIsPrompting(true)
  try{
   const current=prompt
   setPrompt(null)
   await current.prompt()
   const choice=await current.userChoice
   if(choice.outcome==='accepted')setInstalled(true)
   // Browsers may not issue a new install prompt after dismissal.
  }catch{/* Never claim installation after a failed native prompt. */}
  finally{setIsPrompting(false)}
 }
 return <div data-pazo-install-control="true" className="px-1 py-1">
  <button type="button" onClick={()=>void act()} disabled={isPrompting}
   className="min-h-11 w-full rounded-2xl bg-[#EFF4E8] px-3 py-3 text-left text-xs font-bold text-[#204E4A] transition-colors hover:bg-[#E1E53F]/40 focus-visible:bg-[#E1E53F]/50 disabled:opacity-50">
   {isPrompting?(es?'Abriendo instalación…':'Opening installation…'):
    prompt?(es?'Instalar PAZO':'Install PAZO'):
    (es?'Cómo instalar PAZO':'How to install PAZO')}
  </button>
  {showInstructions&&<p role="status" className="px-3 py-2 text-xs leading-relaxed text-[#5C7470]">
    {es?'En Safari, toca Compartir y elige «Añadir a pantalla de inicio».':
    'In Safari, tap Share, then Add to Home Screen.'}
  </p>}
 </div>
}

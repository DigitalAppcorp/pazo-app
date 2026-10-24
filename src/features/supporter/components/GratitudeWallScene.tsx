import {useEffect, useRef} from 'react'
import {IconHeart, IconPaw, IconSparkle} from '../../../components/icons/PazoIcons'
import {SupporterBadge} from './SupporterBadge'

export type WallEntry = {
  pet_id:string
  pet_name:string
  photo_url:string|null
  milestone:0|3|6|12
}
export type WallTab = 'all'|'recent'|'longtime'
type Props = {
  lang:'es'|'en'
  onClose:()=>void
  rows:WallEntry[]
  tab:WallTab
  onTabChange:(tab:WallTab)=>void
  loading?:boolean
  error?:boolean
  onRetry?:()=>void
  previewOnly?:boolean
  backToWelcome?:boolean
}

/** Decorative elements share the *exact* pazo-supporter-float motion used by
 * SupporterProfileBackdrop. Text, controls, photographs and timeline never move.
 * The existing global reduced-motion media query disables the animation.
 */
function WallOrnaments({quiet=false}:{quiet?:boolean}) {
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
    <span className="absolute right-[7%] top-[5%] rotate-12 text-[#A9BC95]/60">
      <span className="pazo-supporter-float block" style={{animationDuration:'7.6s',animationDelay:'-3.1s'}}><IconPaw size={quiet?36:46}/></span>
    </span>
    <span className="absolute left-[5%] top-[13%] -rotate-12 text-[#E6AA7F]/70">
      <span className="pazo-supporter-float block" style={{animationDuration:'8.2s',animationDelay:'-1.8s',animationDirection:'reverse'}}><IconHeart size={quiet?23:30}/></span>
    </span>
    <span className="absolute right-[5%] top-[54%] rotate-12 text-[#CED67A]/80">
      <span className="pazo-supporter-float block" style={{animationDuration:'6.8s',animationDelay:'-4.2s'}}><IconSparkle size={quiet?22:30}/></span>
    </span>
    <span className="absolute bottom-[3%] left-[8%] -rotate-12 text-[#B8C69E]/65">
      <span className="pazo-supporter-float block" style={{animationDuration:'7.9s',animationDelay:'-5s',animationDirection:'reverse'}}><IconPaw size={quiet?28:38}/></span>
    </span>
  </div>
}

function WallEmpty({lang,previewOnly=false}:{lang:'es'|'en';previewOnly?:boolean}) {
  const es=lang==='es'
  return <section aria-label={es?'Estado vacío del muro':'Empty wall'}
    className="relative isolate mt-4 min-h-[380px] overflow-hidden rounded-[30px] bg-white px-5 pb-10 pt-8 shadow-[0_8px_24px_rgba(32,78,74,0.045)]">
    <WallOrnaments/>
    <div className="relative z-10 mx-auto flex max-w-[320px] flex-col items-center text-center">
      <div aria-hidden="true" className="relative flex h-[198px] w-[265px] items-center justify-center">
        <img src="/supporter/gratitude-empty-pets.svg" alt="" width="265" height="196"
          className="h-[196px] w-[265px] object-contain"/>
        <span className="absolute left-[43%] top-0 text-[#E9A77D]">
          <span className="pazo-supporter-float block" style={{animationDuration:'7.3s',animationDelay:'-2.2s'}}><IconHeart filled size={27}/></span>
        </span>
      </div>
      <h2 className="mt-5 text-[clamp(21px,5.8vw,26px)] font-black leading-[1.18] tracking-tight text-[#204E4A]">
        {es?'Todavía no hay mascotas inscritas voluntariamente.':'No pets have opted in yet.'}
      </h2>
      <p className="mt-4 max-w-[30ch] text-[14px] leading-relaxed text-[#476862]">
        {es
          ? 'Cuando una familia tenga una membresía verificada y autorice aparecer aquí, su mascota formará parte de este muro.'
          : 'Once a family has a verified membership and opts their pet in, that pet will appear on this wall.'}
      </p>
      {previewOnly&&<p className="mt-3 text-[13px] font-semibold text-[#6A807A]">
        {es?'Las mascotas se mostrarán solamente después de su autorización.':'Pets appear only after permission is granted.'}
      </p>}
    </div>
  </section>
}

function wallSort(rows:WallEntry[], tab:WallTab) {
  const entries=[...rows] // RPC: granted_at ASC, pet_id ASC (not payment start time)
  if(tab==='recent')return entries.reverse()
  if(tab==='longtime')return entries.sort((a,b)=>b.milestone-a.milestone)
  return entries
}

export function GratitudeWallScene({lang,onClose,rows,tab,onTabChange,loading=false,error=false,onRetry,previewOnly=false,backToWelcome=false}:Props) {
  const closeRef=useRef<HTMLButtonElement>(null)
  const es=lang==='es'
  const label=(spanish:string,english:string)=>es?spanish:english
  useEffect(()=>{
    closeRef.current?.focus()
    if(typeof window==='undefined')return
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()}
    window.addEventListener('keydown',escape)
    return()=>window.removeEventListener('keydown',escape)
  },[onClose])
  const tabs:readonly {value:WallTab;es:string;en:string}[]=[
    {value:'all',es:'Todos',en:'All'},
    {value:'recent',es:'Recientes',en:'Recent'},
    {value:'longtime',es:'Más tiempo apoyando',en:'Longtime supporters'},
  ]
  const shown=wallSort(rows,tab)
  return <div role="dialog" aria-modal="true" aria-labelledby="pazo-gratitude-title"
    className="absolute inset-0 z-[110] flex min-h-0 flex-col overflow-hidden bg-[#FAF8F5] text-[#204E4A]">
    <header className="relative z-10 shrink-0 bg-[#FAF8F5]/95 px-4 pb-2 pt-4 backdrop-blur-xl">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-2">
        <h1 id="pazo-gratitude-title" className="min-w-0 text-[clamp(18px,5vw,21px)] font-black leading-tight">
          {label('Gracias, Amigos de PAZO','Thank you, PAZO Friends')}
        </h1>
        <button ref={closeRef} type="button" onClick={onClose}
          aria-label={previewOnly||backToWelcome?label('Volver a bienvenida','Back to welcome'):label('Volver','Back')}
          className="min-h-11 shrink-0 rounded-full bg-[#E1E53F] px-4 py-2.5 text-[14px] font-bold text-[#204E4A] hover:bg-[#EFF16D] focus-visible:bg-[#EFF16D]">
          {label('Volver','Back')}
        </button>
      </div>
    </header>

    <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="relative mx-auto min-h-full w-full max-w-xl px-4 pb-10 pt-2">
        <div aria-hidden="true" className="pointer-events-none absolute -left-8 -top-2 h-28 w-28 rounded-full bg-[#E8EED8]/40 blur-[32px]"/>
        <section aria-label={label('Acerca del muro','About the wall')}
          className="relative isolate overflow-hidden rounded-[25px] bg-gradient-to-r from-[#FBE6D8] via-[#FCEBE0] to-[#F8E5D9] px-4 py-3">
          <WallOrnaments quiet/>
          <div className="relative z-10 flex items-start gap-3">
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FAD9C3] text-[#DA805C]">
              <IconHeart filled size={23}/>
            </span>
            <p className="min-w-0 text-[14px] font-medium leading-[1.55] text-[#204E4A]">
              {label('Cada mascota aparece aquí porque su familia lo autorizó y tiene una membresía Amigo de PAZO verificada. PAZO sigue siendo gratuito.',
                'Every pet here has their family’s permission and a verified PAZO Friend membership. PAZO remains free.')}
            </p>
          </div>
        </section>

        <nav aria-label={label('Orden del muro','Wall order')} className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {tabs.map(item=><button key={item.value} type="button"
            aria-pressed={tab===item.value} onClick={()=>onTabChange(item.value)}
            className={'min-h-11 shrink-0 rounded-full px-4 py-2 text-[14px] font-extrabold transition-colors focus-visible:bg-[#DCEBCA] ' +
              (tab===item.value?'bg-[#204E4A] text-white':'bg-white text-[#204E4A] shadow-[0_3px_12px_rgba(32,78,74,0.035)] hover:bg-[#E9F0DF]')}>
            {es?item.es:item.en}
          </button>)}
        </nav>

        {loading&&<p role="status" className="mt-5 rounded-2xl bg-white p-5 text-sm">
          {label('Consultando el muro…','Loading the wall…')}
        </p>}
        {error&&<div role="alert" className="mt-4 space-y-3 rounded-2xl bg-[#FCE5D8] p-5 text-[14px]">
          <p>{label('No pudimos verificar las mascotas del muro.','Could not verify the wall entries.')}</p>
          {onRetry&&<button type="button" onClick={onRetry}
            className="min-h-11 rounded-full bg-[#204E4A] px-4 py-2.5 font-bold text-white hover:bg-[#32635D] focus-visible:bg-[#32635D]">
            {label('Intentar de nuevo','Try again')}
          </button>}
        </div>}
        {!loading&&!error&&shown.length===0&&<WallEmpty lang={lang} previewOnly={previewOnly}/>}
        {!loading&&!error&&shown.length>0&&<section aria-label={label('Mascotas participantes','Participating pets')}
          className="relative mt-3 grid grid-cols-2 gap-2.5 pb-3 sm:gap-3">
          {shown.map(pet=><article key={pet.pet_id}
            className="relative flex min-h-[172px] flex-col items-center justify-start gap-2 rounded-[24px] bg-white px-2.5 pb-3 pt-3 text-center shadow-[0_5px_18px_rgba(32,78,74,0.055)]">
            <div className="relative h-[82px] w-[82px] shrink-0 sm:h-[90px] sm:w-[90px]">
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#EEF0DF]">
                {pet.photo_url
                  ?<img src={pet.photo_url} alt="" className="h-full w-full object-cover" loading="lazy"/>
                  :<IconPaw size={34} className="text-[#204E4A]/35"/>}
              </div>
              <span aria-hidden="false" className="absolute -bottom-1 -right-2 z-10">
                <SupporterBadge active milestone={pet.milestone} lang={lang}/>
              </span>
            </div>
            <h2 className="w-full break-words text-[16px] font-black leading-tight text-[#204E4A]">{pet.pet_name}</h2>
            <p className="text-[12px] font-semibold leading-tight text-[#5C7470]">
              {pet.milestone>0
                ?label(`${pet.milestone} meses verificados`,`${pet.milestone} verified months`)
                :label('Amigo de PAZO','PAZO Friend')}
            </p>
          </article>)}
        </section>}
      </div>
    </main>
  </div>
}
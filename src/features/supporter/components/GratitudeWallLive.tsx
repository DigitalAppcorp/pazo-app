import {useEffect, useMemo, useState} from 'react'
import {supabase} from '../../../services/supabaseClient'
import {IconPaw} from '../../../components/icons/PazoIcons'

type Row = {
  pet_id: string
  pet_name: string
  photo_url: string | null
  milestone: 0 | 3 | 6 | 12
}
type Props = {lang:'es'|'en';onClose:()=>void}
type Tab = 'all'|'recent'|'longtime'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function validWallRows(data:unknown):data is Row[] {
  if(!Array.isArray(data)||data.length>48)return false
  const ids=new Set<string>()
  for(const row of data) {
    if(!row||typeof row!=='object'||!UUID.test(row.pet_id)||
       ids.has(row.pet_id)||typeof row.pet_name!=='string'||
       row.pet_name.length<1||row.pet_name.length>120||
       (row.photo_url!==null && (typeof row.photo_url!=='string' ||
         !/^https:\/\//.test(row.photo_url) || row.photo_url.length>2000))||
       ![0,3,6,12].includes(row.milestone))return false
    ids.add(row.pet_id)
  }
  return true
}

export function GratitudeWallLive({lang,onClose}:Props){
  const [rows,setRows]=useState<Row[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState(false)
  const [tab,setTab]=useState<Tab>('all')
  const isEs=lang==='es'
  const label=(es:string,en:string)=>isEs?es:en
  useEffect(()=>{
    let active=true
    setLoading(true);setError(false);setRows([])
    void supabase.rpc('pazo_supporter_public_wall',{p_limit:48})
      .then(({data,error:backendError})=>{
        if(!active)return
        if(backendError||!validWallRows(data))throw Error('PUBLIC_WALL_UNTRUSTED')
        setRows(data)
      }).catch(()=>{if(active)setError(true)})
      .finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[])
  const shown=useMemo(()=>{
    const copy=[...rows]
    if(tab==='recent')return copy.reverse()
    if(tab==='longtime')return copy.sort((a,b)=>b.milestone-a.milestone)
    return copy
  },[rows,tab])
  const button='min-h-11 rounded-full px-4 py-2.5 text-[13px] font-bold'
  return <div role="dialog" aria-modal="true" aria-labelledby="supporter-live-wall-title"
    className="absolute inset-0 z-[110] flex flex-col overflow-hidden bg-[#FAF8F5] text-[#204E4A]">
    <header className="shrink-0 bg-[#FAF8F5] px-4 py-4">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
        <h1 id="supporter-live-wall-title" className="text-[20px] font-black">
          {label('Gracias, Amigos de PAZO','Thank you, PAZO Friends')}
        </h1>
        <button type="button" onClick={onClose} className={button+' bg-[#E1E53F]/75'}>
          {label('Volver','Back')}
        </button>
      </div>
    </header>
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-xl space-y-4 px-4 pb-10">
        <p className="rounded-[24px] bg-[#FBE8D9] p-5 text-[14px] font-medium">
          {label('Cada mascota aparece aquí porque su familia lo autorizó y tiene una membresía Amigo de PAZO verificada. PAZO sigue siendo gratuito.',
            'Every pet shown here has their family’s permission and a verified PAZO Friend membership. PAZO remains free.')}
        </p>
        <nav aria-label={label('Orden del muro','Wall order')} className="flex gap-2 overflow-x-auto">
          {([
            ['all',label('Todos','All')],
            ['recent',label('Recientes','Recent')],
            ['longtime',label('Más tiempo apoyando','Longtime supporters')],
          ] as const).map(([value,title])=><button key={value} type="button"
            aria-pressed={tab===value} onClick={()=>setTab(value)}
            className={button+(tab===value?' bg-[#204E4A] text-white':' bg-white text-[#204E4A]')}>
            {title}
          </button>)}
        </nav>
        {loading&&<p role="status">{label('Consultando el muro…','Loading the wall…')}</p>}
        {error&&<p role="alert" className="rounded-2xl bg-[#FCE5D8] p-4">
          {label('No pudimos verificar las mascotas del muro.','Could not verify the wall entries.')}
        </p>}
        {!loading&&!error&&shown.length===0&&<p role="status" className="rounded-2xl bg-white p-5 text-sm">
          {label('Todavía no hay mascotas inscritas voluntariamente.','No pets have opted in yet.')}
        </p>}
        {!loading&&!error&&shown.length>0&&<section
          aria-label={label('Mascotas participantes','Participating pets')}
          className="grid grid-cols-2 gap-3">
          {shown.map(pet=><article key={pet.pet_id}
            className="overflow-hidden rounded-[24px] bg-white p-3 shadow-[0_5px_18px_rgba(32,78,74,0.06)]">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[18px] bg-[#E9EFE6]">
              {pet.photo_url?<img src={pet.photo_url} alt={pet.pet_name}
                className="h-full w-full object-cover" loading="lazy"/>
                :<IconPaw size={42} className="text-[#204E4A]/35"/>}
            </div>
            <h2 className="mt-3 break-words text-[15px] font-black">{pet.pet_name}</h2>
            <p className="mt-1 text-[11px] font-bold text-[#5C7470]">
              {label('Amigo de PAZO','PAZO Friend')}
              {pet.milestone>0? ' · '+pet.milestone+' '+label('meses','months'):''}
            </p>
          </article>)}
        </section>}
      </div>
    </main>
  </div>
}

import {useEffect,useState} from 'react'
import {createPortal} from 'react-dom'
import {getDeletionRequest,submitDeletionRequest,cancelDeletionRequest} from './deletionRequestService'
import {mayCancelDeletion,type DeletionReceipt} from './deletionRequestState'

type Props={lang:'es'|'en';onClose:()=>void}
export function DeletionRequestDialog({lang,onClose}:Props) {
 const es=lang==='es'
 const [receipt,setReceipt]=useState<DeletionReceipt|null>(null)
 const [loading,setLoading]=useState(true)
 const [working,setWorking]=useState(false)
 const [error,setError]=useState(false)
 const [typed,setTyped]=useState('')
 const confirmed=typed.trim().toUpperCase()===(es?'ELIMINAR':'DELETE')
 useEffect(()=>{
   let active=true
   void getDeletionRequest().then(result=>{
     if(active) setReceipt(result)
   }).catch(()=>{if(active)setError(true)}).finally(()=>{if(active)setLoading(false)})
   const keyboard=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()}
   window.addEventListener('keydown',keyboard)
   return ()=>{active=false;window.removeEventListener('keydown',keyboard)}
 },[onClose])
 const act=async(mode:'request'|'cancel')=>{
  if(working||loading) return
  if(mode==='request'&&!confirmed) return
  setWorking(true);setError(false)
  try {
   if(mode==='request'){setReceipt(await submitDeletionRequest());setTyped('')}
   else if(await cancelDeletionRequest()){setReceipt(await getDeletionRequest())}
   else {setError(true);setReceipt(await getDeletionRequest())}
  } catch {setError(true)}
  finally {setWorking(false)}
 }
 return createPortal(
  <div role="dialog" aria-modal="true"
    aria-label={es?'Solicitud de eliminación de cuenta':'Account deletion request'}
    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-3">
    <section className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[2rem] bg-[#FAF8F5] px-5 py-6 text-[#204E4A] shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-black">{es?'Eliminar mi cuenta':'Delete my account'}</h2>
        <button type="button" onClick={onClose} className="rounded-full bg-white px-4 py-2 text-xs font-bold focus-visible:bg-[#E1E53F]">
          {es?'Cerrar':'Close'}
        </button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[#5C7470]">
        {es
         ?'Esta opción registra una solicitud de eliminación. NO borra todavía tu cuenta, tus publicaciones ni tus archivos. Revisaremos la solicitud y el proceso de eliminación antes de completarla.'
         :'This submits a deletion request. It does NOT yet delete your account, posts or files. The request and deletion process must be reviewed before completion.'}
      </p>
      {loading ? <p role="status" className="mt-4 text-xs">{es?'Comprobando solicitud…':'Checking request…'}</p> :
       <>
        {receipt?.status==='requested'&&<p role="status" className="mt-4 rounded-xl bg-[#E1E53F]/30 p-3 text-xs font-bold">
         {es?'Solicitud recibida. Tu cuenta sigue activa hasta que termine el proceso.':'Request received. Your account remains active until processing is complete.'}
        </p>}
        {receipt?.status==='processing'&&<p role="status" className="mt-4 rounded-xl bg-[#E1E53F]/30 p-3 text-xs font-bold">
         {es?'Solicitud en revisión. Ya no puedes cancelarla desde aquí.':'Request being reviewed. Cancellation is no longer available here.'}
        </p>}
        {receipt?.status==='completed'&&<p role="status" className="mt-4 text-xs">{es?'La solicitud figura como completada.':'The request is marked complete.'}</p>}
        {(!receipt||receipt.status==='cancelled')&&<>
          <label htmlFor="pazo-deletion-confirm" className="mt-4 block text-xs font-semibold">
            {es?'Para solicitar la eliminación, escribe ELIMINAR':'To request deletion, type DELETE'}
          </label>
          <input id="pazo-deletion-confirm" value={typed} onChange={e=>setTyped(e.target.value)} autoComplete="off"
           className="mt-2 w-full rounded-xl bg-white px-4 py-3 text-sm text-[#204E4A] focus:bg-[#E1E53F]/20"/>
          <button type="button" disabled={!confirmed||working} onClick={()=>void act('request')}
           className="mt-3 w-full rounded-full bg-[#204E4A] px-4 py-3 text-xs font-bold text-white disabled:opacity-40">
            {working?(es?'Enviando…':'Submitting…'):(es?'Enviar solicitud':'Submit request')}
          </button>
        </>}
        {mayCancelDeletion(receipt?.status??null)&&<button type="button" disabled={working}
          onClick={()=>void act('cancel')} className="mt-3 w-full rounded-full bg-white px-4 py-3 text-xs font-bold text-[#204E4A] disabled:opacity-40">
          {es?'Cancelar solicitud pendiente':'Cancel pending request'}
        </button>}
       </>}
      {error&&<p role="alert" className="mt-3 text-xs font-bold text-[#AF3029]">
        {es?'No se pudo confirmar el cambio. La cuenta no ha sido eliminada; inténtalo después.':'Could not confirm this change. The account has not been deleted; please try later.'}
      </p>}
    </section>
  </div>,document.body)
}

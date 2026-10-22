import {useEffect,useState} from 'react'
import {supabase} from '../../../services/supabaseClient'
import {parsePazoLiveFinanceSummary,type PazoLiveFinanceSummary} from '../liveFinanceSummary.mjs'
export function AdminLiveFinanceSummary({lang}:{lang:'es'|'en'}){
 const [data,setData]=useState<PazoLiveFinanceSummary|null>(null)
 const [stage,setStage]=useState<'loading'|'verified'|'unavailable'>('loading')
 const [revision,setRevision]=useState(0)
 const t=(es:string,en:string)=>lang==='es'?es:en
 useEffect(()=>{
  let active=true
  void (async()=>{
   try{
    const {data:raw,error}=await supabase.rpc('pazo_admin_live_finance_summary')
    const value=parsePazoLiveFinanceSummary(raw)
    if(error||!value)throw Error('unverified_live_summary')
    if(active){setData(value);setStage('verified')}
   }catch{if(active){setData(null);setStage('unavailable')}}
  })()
  return ()=>{active=false}
 },[revision])
 const tile=(label:string,value:string|number)=><div key={label} className="min-w-0 rounded-[21px] bg-white p-4 shadow-[0_8px_30px_rgba(32,78,74,0.065)]">
  <p className="text-[13px] font-semibold text-[#536E64]">{label}</p>
  <p className="mt-2 break-words text-[25px] font-black text-[#204E4A]">{value}</p>
 </div>
 const money=(n:number)=>(n/100).toLocaleString(lang==='es'?'es-US':'en-US',{style:'currency',currency:'USD'})
 return <section aria-label={t('Registro verificado Live','Verified Live ledger')} className="space-y-3">
  <h3 className="text-[17px] font-black">{t('Pagos Live registrados en PAZO','Live payments recorded in PAZO')}</h3>
  {stage==='loading'&&<p role="status">{t('Consultando el registro Live…','Reading the Live ledger…')}</p>}
  {stage==='unavailable'&&<p role="alert" className="rounded-2xl bg-[#FCE5D8] p-4 text-sm">
   {t('No pudimos verificar la fuente Live. No mostramos importes ni conteos estimados.',
    'The Live source could not be verified. Estimated amounts and counts are not shown.')}
  </p>}
  {stage==='verified'&&data&&<>
   <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {tile(t('Bruto de pagos verificados','Verified payment gross'),money(data.payments.grossVerifiedMinor))}
    {tile(t('Bruto de períodos con retención','Gross periods on hold'),money(data.payments.heldGrossMinor))}
    {tile(t('Pagos verificados','Verified payments'),data.payments.verifiedPayments)}
    {tile(t('Cuentas con cobertura vigente','Accounts with current coverage'),data.activePaidAccounts)}
    {tile(t('Solicitudes abiertas','Open requests'),data.subscriptions.openRequests)}
    {tile(t('Solicitudes sin vínculo PayPal','Requests awaiting PayPal binding'),data.subscriptions.unboundRequests)}
    {tile(t('Solicitudes descartadas sin enviar','Unsent requests discarded'),data.subscriptions.closedUnsentRequests)}
    {tile(t('Cancelaciones confirmadas','Confirmed cancellations'),data.subscriptions.confirmedCancellations)}
   </div>
   <p className="text-[12px] text-[#536E64]">{t('Fuente: períodos verificados de PAZO. No representa saldo, ingresos netos, comisiones ni un estado de cuenta de PayPal.',
    'Source: PAZO verified periods. This is not a PayPal balance, net revenue, fee calculation or merchant statement.')}</p>
  </>}
  <button type="button" disabled={stage==='loading'} onClick={()=>{
    setStage('loading');setRevision(n=>n+1)
   }}
   className="min-h-11 rounded-full bg-[#E1E53F] px-4 py-2 text-sm font-bold disabled:opacity-50">
   {t('Actualizar registro Live','Refresh Live ledger')}</button>
 </section>
}

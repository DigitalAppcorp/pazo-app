import {useEffect,useState} from 'react'
import {supabase} from '../../../services/supabaseClient'

// Requires a NEW MFA challenge; even an existing aal2 session is not fresh
// enough to provision Live PayPal secrets. The server checks amr.totp time.
type Props={lang:'es'|'en';onVerified:()=>void;purpose?:'credentials'|'operations'}
const card='rounded-[17px] bg-[#F2F7E9] p-4 text-[#204E4A]'
const button='min-h-11 rounded-[13px] bg-[#E1E53F] px-4 text-[13px] font-black text-[#204E4A] disabled:opacity-50'
export function AdminPaypalMfaStepUp({lang,onVerified,purpose='credentials'}:Props){
 const t=(es:string,en:string)=>lang==='es'?es:en
 const [factorId,setFactorId]=useState('')
 const [pendingFactorId,setPendingFactorId]=useState('')
 const [qrCode,setQrCode]=useState('')
 const [code,setCode]=useState('')
 const [busy,setBusy]=useState(false)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [recent,setRecent]=useState(false)
 const [notice,setNotice]=useState('')
 useEffect(()=>{
  let active=true
  void (async()=>{
   try{
    const {data,error:authError}=await supabase.auth.mfa.listFactors()
    if(authError)throw authError
    const verified=data?.totp?.find(f=>f.status==='verified')
    if(active){
     setFactorId(verified?.id||'')
     const pending=data?.all?.find(f=>f.factor_type==='totp'&&
      f.status==='unverified'&&f.id!==verified?.id)
     setPendingFactorId(verified?'':pending?.id||'')
    }
   }catch{if(active)setError(t(
    'No pudimos consultar el segundo factor. Revisa tu sesión.',
    'Unable to check MFA factors. Verify your session.'))}
   finally{if(active)setLoading(false)}
  })()
  return ()=>{active=false}
 },[lang])
 const resetPending=async()=>{
  if(busy||!pendingFactorId)return
  setBusy(true);setError('');setRecent(false)
  try{
   // Only remove an UNVERIFIED factor of this signed-in account.
   const {data,error:listError}=await supabase.auth.mfa.listFactors()
   if(listError||!data?.all?.some(f=>f.id===pendingFactorId&&
     f.factor_type==='totp'&&f.status==='unverified'))
    throw Error('unverified_factor_not_found')
   const {error:deleteError}=await supabase.auth.mfa.unenroll({
    factorId:pendingFactorId
   })
   if(deleteError)throw Error('pending_factor_unenroll_failed')
   setPendingFactorId('');setFactorId('');setQrCode('')
   setNotice(t('Registro pendiente eliminado. Ya puedes configurar el autenticador.','Pending enrollment cleared. You can now set up the authenticator.'))
  }catch{setError(t(
   'No se pudo reiniciar el registro pendiente. Inicia sesión de nuevo e inténtalo.',
   'Could not reset the pending enrollment. Sign in again and retry.'))}
  finally{setBusy(false)}
 }
 const enroll=async()=>{
  if(busy||pendingFactorId)return
  setBusy(true);setError('');setNotice('');setRecent(false)
  let stage='REQUEST'
  try{
   const {data,error:authError}=await supabase.auth.mfa.enroll({
    factorType:'totp',friendlyName:'PAZO Admin'
   })
   if(authError)throw Error('mfa_enroll_unavailable')
   stage='FACTOR'
   if(!data?.id)throw Error('mfa_enroll_unavailable')
   setPendingFactorId(data.id)
   stage='QR_MISSING'
   const candidate=data.totp?.qr_code
   if(typeof candidate!=='string')throw Error('mfa_qr_unavailable')
   stage='QR_SIZE'
   if(candidate.length>2000000)throw Error('mfa_qr_unavailable')
   stage='QR_FORMAT'
   if(!/^data:image\/svg\+xml(?:;charset=utf-8|;utf-8|;utf8|;base64|),/i.test(candidate))
    throw Error('mfa_qr_unavailable')
   setPendingFactorId('');setFactorId(data.id);setQrCode(candidate)
  }catch{setError(t(
   'No se pudo mostrar el autenticador. Código: '+stage+'. No vuelvas a intentarlo; informa solo el código.',
   'Authenticator setup failed. Code: '+stage+'. Do not retry; report only the code.'))}
  finally{setBusy(false)}
 }
 const verify=async()=>{
  if(busy||!factorId)return
  if(!/^\d{6}$/.test(code)){
   setError(t('Escribe el código de seis dígitos.','Enter the six-digit code.'))
   return
  }
  setBusy(true);setError('');setRecent(false)
  try{
   const {error:authError}=await supabase.auth.mfa.challengeAndVerify({
    factorId,code
   })
   if(authError)throw authError
   const {data,error:assuranceError}=
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
   if(assuranceError||data?.currentLevel!=='aal2')
    throw Error('aal2_not_established')
   setCode('');setQrCode('');setRecent(true)
   onVerified()
  }catch{
   setCode('')
   setError(t('No se comprobó el código del autenticador. Intenta de nuevo.',
    'Authenticator code was not verified. Please try again.'))
  }finally{setBusy(false)}
 }
 return <section className={card} data-pazo-admin-live-mfa="true">
  <h4 className="text-[15px] font-black">{t(
   'Verificación reforzada de administrador','Administrator step-up verification')}</h4>
  <p className="mt-2 text-[12px] leading-relaxed">
   {purpose==='operations'?t('Los cambios operativos requieren un código nuevo del autenticador. El servidor comprobará tu sesión y permisos antes de guardar.',
    'Operational changes require a fresh authenticator code. The server checks your session and permissions before saving.'):t('Para preparar credenciales Live se exige un código nuevo del autenticador. Una sesión iniciada anteriormente no cuenta como una nueva verificación.',
    'Staging Live credentials requires a fresh authenticator code. An older signed-in session is not a new verification.')}
  </p>
  {loading?<p className="mt-3 text-[12px]" role="status">{t('Comprobando…','Checking…')}</p>:
   <>
    {pendingFactorId&&!factorId&&<button type="button" className={'mt-3 '+button}
     disabled={busy} onClick={()=>void resetPending()}>{t(
      'Reiniciar registro pendiente','Reset pending enrollment')}</button>}
    {!factorId&&!pendingFactorId&&<button type="button" className={'mt-3 '+button}
     disabled={busy} onClick={()=>void enroll()}>{t(
      'Configurar autenticador','Set up authenticator')}</button>}
    {qrCode&&<div className="mt-3">
     <p className="mb-2 text-[12px]">{t(
      'Escanea este QR con una aplicación autenticadora. No compartas el código QR.',
      'Scan this QR with an authenticator app. Do not share the QR code.')}</p>
     <img src={qrCode} width="178" height="178"
      className="max-w-full rounded-[10px] bg-white p-2"
      onError={()=>{setPendingFactorId(factorId);setFactorId('');setQrCode('')
       setError(t('No se pudo mostrar el QR. Código: QR_IMAGE. Informa solo el código.',
        'Could not display QR. Code: QR_IMAGE. Report only the code.'))}}
      alt={t('QR de autenticación personal','Personal authentication QR')}/>
    </div>}
    {factorId&&<form onSubmit={e=>{e.preventDefault();void verify()}}
      className="mt-3 flex flex-wrap items-end gap-2">
     <label className="text-[12px] font-bold">
      {t('Código del autenticador','Authenticator code')}
      <input type="password" inputMode="numeric" pattern="[0-9]{6}"
       autoComplete="one-time-code" maxLength={6}
       value={code} onChange={e=>setCode(e.target.value)}
       className="mt-1 block min-h-11 rounded-[12px] bg-white px-3"
       disabled={busy}/>
     </label>
     <button type="submit" className={button}
      disabled={busy||code.length!==6}>{t('Verificar','Verify')}</button>
    </form>}
    {recent&&<p className="mt-2 text-[12px] font-bold" role="status">{t(
     'Segundo factor comprobado. La autorización final la verificará el servidor.',
     'MFA confirmed. Final authorization will be checked by the server.')}</p>}
   </>}
  {notice&&<p role="status" className="mt-2 text-[12px] font-semibold text-[#204E4A]">{notice}</p>}
  {error&&<p className="mt-2 text-[12px] font-semibold text-[#9B4236]"
   role="alert">{error}</p>}
 </section>
}

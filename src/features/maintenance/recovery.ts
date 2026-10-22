import {createClient} from '@supabase/supabase-js'
import {getPublicSupabaseConfig} from '../../lib/publicConfig'

const element=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T
const form=element<HTMLFormElement>('sign-in')
const email=element<HTMLInputElement>('admin-email')
const password=element<HTMLInputElement>('admin-password')
const login=element<HTMLButtonElement>('login')
const controls=element<HTMLElement>('controls')
const restore=element<HTMLButtonElement>('restore')
const refresh=element<HTMLButtonElement>('refresh')
const confirmation=element<HTMLInputElement>('confirmation')
const result=element<HTMLElement>('result')
const english=navigator.language.startsWith('en')
const t=(es:string,en:string)=>english?en:es
document.documentElement.lang=english?'en':'es'
for(const [id,es,en] of [
 ['recovery-title','PAZO · Recuperación','PAZO · Recovery'],
 ['recovery-intro','Acceso exclusivo de administración para consultar el mantenimiento y restaurar la aplicación. Restaurar el acceso no activa PayPal.','Administrator-only access to check maintenance and restore the application. Restoring access does not activate PayPal.'],
 ['email-label','Correo de administrador','Administrator email'],['password-label','Contraseña','Password'],
 ['login','Verificar acceso','Verify access'],['refresh','Consultar estado','Check status'],
 ['confirmation-label','Confirmo que deseo restaurar el acceso a PAZO.','I confirm that I want to restore access to PAZO.'],
 ['restore','Restaurar acceso','Restore access'],['logout','Cerrar sesión de recuperación','Close recovery session'],
 ['back','Volver a PAZO','Return to PAZO']
])element(id).textContent=t(es,en)
const config=getPublicSupabaseConfig(import.meta.env)
type Status={enabled:boolean;revision:number;message_es:string;message_en:string}

if(!config){result.textContent=t('Configuración pública no disponible. Contacta con soporte.','Public configuration unavailable. Contact support.');login.disabled=true}
else {
 // Ephemeral session: no localStorage, URL token, analytics, App or React dependency.
 const client=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
 let status:Status|null=null
 let verified=false
 let working=false
 const render=()=>{restore.disabled=working||!verified||!status?.enabled||!confirmation.checked;refresh.disabled=working}
 const read=async()=>{
  const role=await client.rpc('pazo_is_admin')
  if(role.error||role.data!==true)throw Error('admin_unverified')
  const response=await client.rpc('pazo_public_maintenance_status')
  const value=response.data as Partial<Status>|null
  if(response.error||!value||typeof value.enabled!=='boolean'||!Number.isSafeInteger(value.revision)
   ||typeof value.message_es!=='string'||typeof value.message_en!=='string')throw Error('status_unverified')
  status=value as Status;verified=true
  controls.hidden=false;form.hidden=true
  result.textContent=status.enabled?t('Mantenimiento activo. Puedes restaurar el acceso.','Maintenance is active. You can restore access.'):t('PAZO está disponible. No se cambió ningún control financiero.','PAZO is available. No financial controls were changed.')
 }
 const fail=()=>{status=null;result.textContent=t('No se pudo verificar el estado. Consulta de nuevo; no repitas un cambio sin comprobarlo.','Status could not be verified. Check again before repeating a change.')}
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(working)return;working=true;login.disabled=true;render()
  try{
   const auth=await client.auth.signInWithPassword({email:email.value.trim(),password:password.value})
   password.value=''
   if(auth.error||!auth.data.user)throw Error('login_unverified')
   await read()
  }catch{
   verified=false;status=null;controls.hidden=true;form.hidden=false
   await client.auth.signOut({scope:'local'}).catch(()=>{})
   result.textContent=t('No se pudo verificar el acceso de administrador.','Administrator access could not be verified.')
  }finally{password.value='';working=false;login.disabled=false;render()}
 })
 refresh.addEventListener('click',async()=>{
  if(working)return;working=true;render()
  try{await read()}catch{fail()}finally{working=false;render()}
 })
 confirmation.addEventListener('change',render)
 restore.addEventListener('click',async()=>{
  if(working||!verified||!status?.enabled||!confirmation.checked)return
  const observed=status;working=true;render()
  try{
   const changed=await client.rpc('pazo_admin_set_maintenance',{
    p_enabled:false,p_message_es:observed.message_es,p_message_en:observed.message_en,
    p_expected_revision:observed.revision,p_request_id:crypto.randomUUID()
   })
   if(changed.error||changed.data!==true)throw Error('restore_unverified')
   await read()
   if(status?.enabled)throw Error('restore_not_observed')
   confirmation.checked=false
  }catch{fail()}finally{working=false;render()}
 })
 element<HTMLButtonElement>('logout').addEventListener('click',async()=>{
  if(working)return
  verified=false;status=null;controls.hidden=true;form.hidden=false;confirmation.checked=false;render()
  await client.auth.signOut({scope:'local'}).catch(()=>{})
  result.textContent=t('Sesión de recuperación cerrada.','Recovery session closed.')
 })
}

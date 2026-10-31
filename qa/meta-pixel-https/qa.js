'use strict';
// PAZO #169 — QA HTTPS standalone only. No imports from production PWA.
const DATASET='1090116830295088';
const eventName='CompleteRegistration';
const scriptUrl='https://connect.facebook.net/en_US/fbevents.js';
const status=document.querySelector('#status');
const checkbox=document.querySelector('#agree');
const fire=document.querySelector('#fire');
const revoke=document.querySelector('#revoke');
let authorized=false;
let busy=false;
let sdkOwned=false;
let timer=null;
const isGpc=()=>navigator.globalPrivacyControl===true;
function render(message){
 status.textContent=message;
 fire.disabled=busy || authorized || isGpc() || checkbox.checked!==true;
}
function removeMetaCookies(){
 for(const name of ['_fbp','_fbc']){
  // Host-only. No other application's cookies are touched.
  try{document.cookie=name+'=; Path=/; Max-Age=0; SameSite=Lax'}catch{}
 }
}
function withdraw(){
 authorized=false;
 checkbox.checked=false;
 if(timer!==null)clearTimeout(timer);
 timer=null;
 if(sdkOwned&&typeof window.fbq==='function'){
  try{window.fbq('consent','revoke')}catch{}
 }
 removeMetaCookies();
 render('Consentimiento retirado. No se enviarán nuevos eventos desde este laboratorio.');
}
checkbox.addEventListener('change',()=>render(isGpc()?'GPC: medición bloqueada.':'Listo para prueba manual.'));
revoke.addEventListener('click',withdraw);
window.addEventListener('pagehide',withdraw);
setInterval(()=>{
 if(isGpc() && authorized)withdraw();
 if(isGpc())fire.disabled=true;
},600);
function install(){
 return new Promise((resolve,reject)=>{
  if(window.fbq || window._fbq)return reject(new Error('Hay otro Pixel. Cancelado.'));
  const stub=function(){stub.callMethod?stub.callMethod.apply(stub,arguments):stub.queue.push(Array.from(arguments))};
  stub.queue=[];stub.loaded=true;stub.version='2.0';
  stub.disablePushState=true;
  window.fbq=stub;window._fbq=stub;
  sdkOwned=true;
  stub('consent','revoke');
  stub('set','autoConfig',false,DATASET);
  stub('init',DATASET);
  const script=document.createElement('script');
  script.async=true;script.src=scriptUrl;
  script.onload=()=>resolve(stub);
  script.onerror=()=>reject(new Error('No se pudo cargar el SDK.'));
  document.head.appendChild(script);
 });
}
fire.addEventListener('click',async()=>{
 if(busy || authorized || isGpc() || !checkbox.checked)return;
 busy=true;
 render('Cargando SDK de Meta tras tu aceptación explícita...');
 try{
  const fbq=await install();
  if(isGpc()||!checkbox.checked){withdraw();return}
  authorized=true;
  const eventID=crypto.randomUUID(); // QA only: never used for real PAZO registrations.
  fbq('consent','grant');
  fbq('trackSingle',DATASET,eventName,{}, {eventID});
  render('Evento sintético solicitado.\\nEvento: '+eventName+'\\nID: '+eventID+'\\nDataset: '+DATASET+'\\nOrigen: navegador\\nEstado: ENVIADO AL SDK (no confirma recepción de Meta).');
  timer=setTimeout(()=>{
    fbq('consent','revoke');
    authorized=false;
    removeMetaCookies();
    render('Prueba ejecutada y permiso retirado.\\nEvento: '+eventName+'\\nID: '+eventID+'\\nDataset: '+DATASET+'\\nPara verificar deduplicación, usar exactamente este ID en CAPI QA.');
  },3500);
 }catch{
  withdraw();
  render('No fue posible realizar la prueba. No intentar a ciegas.');
 }finally{busy=false;fire.disabled=true;}
});
render('Estado: SIN ACTIVAR. No se ha cargado Meta Pixel.');
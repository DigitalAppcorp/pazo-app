// LOCAL MOCKED browser checks. Never logs in to hosted Auth or sends real data.
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE||'playwright')
const ORIGIN=process.env.PAZO_F17_LOCAL_ORIGIN||'http://127.0.0.1:5173'
assert.match(ORIGIN,/^http:\/\/127\.0\.0\.1:\d+$/)
const RECOVERY_ORIGIN=process.env.PAZO_F17_RECOVERY_ORIGIN||ORIGIN
assert.match(RECOVERY_ORIGIN,/^http:\/\/127\.0\.0\.1:\d+$/)
const actor='f1700000-0000-4000-8000-000000000001'
const owner='f1700000-0000-4000-8000-000000000002'
const fakeToken=()=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:actor,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'synthetic'].join('.')
const browser=await chromium.launch({headless:true,...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{}),args:['--no-sandbox']})
let assertions=0
const check=(value,message)=>{assert.ok(value,message);assertions++}
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:740},locale:'es-GT',serviceWorkers:'block'})
  let admin=false,enabled=true,revision=0,submissions=0,giftPosts=0,giftIds=[],ticket=null
  let remoteUnmocked=0,adminUpdates=0,holdHistory=false,releaseHistory=null,historyHeld=false
  const status=()=>({enabled,revision,message_es:'Mantenimiento de prueba sintética',message_en:'Synthetic maintenance mode'})
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url())
   if(url.origin===ORIGIN||url.origin===RECOVERY_ORIGIN){
    if(/\/assets\/(?:App-|app-)/.test(url.pathname)&&url.origin===RECOVERY_ORIGIN)return route.abort()
    return route.continue()
   }
   // All remote traffic is fulfilled or aborted before a network connection.
   if(url.hostname!=='mrybvqdebbgcayuvgkkr.supabase.co'){remoteUnmocked++;return route.abort()}
   let body={};try{body=req.postDataJSON()??{}}catch{}
   let response={},code=200
   if(url.pathname.endsWith('/auth/v1/token'))response={access_token:fakeToken(),refresh_token:'SYNTHETIC_ONLY',expires_in:3600,token_type:'bearer',user:{id:actor,email:'admin@synthetic.invalid',aud:'authenticated',role:'authenticated'}}
   else if(url.pathname.endsWith('/auth/v1/user'))response={id:actor,email:'admin@synthetic.invalid',aud:'authenticated',role:'authenticated'}
   else if(url.pathname.endsWith('/auth/v1/logout'))response={}
   else if(url.pathname.endsWith('/rpc/pazo_public_maintenance_status'))response=status()
   else if(url.pathname.endsWith('/rpc/pazo_is_admin'))response=admin
   else if(url.pathname.endsWith('/rpc/pazo_admin_set_maintenance')){
    if(!admin||body.p_enabled!==false||body.p_expected_revision!==revision){code=403;response={code:'42501'}}
    else{enabled=false;revision++;response=true}
   }else if(url.pathname.endsWith('/pazo_support_tickets'))response=ticket?[{...ticket,owner_id:owner}]:[]
   else if(url.pathname.endsWith('/rpc/pazo_admin_update_support_ticket')){
    adminUpdates++;ticket={...ticket,status:body.p_status,admin_note:body.p_admin_note,admin_reply:body.p_admin_reply};response=true
   }else if(url.pathname.endsWith('/rpc/pazo_submit_support_ticket')){
    submissions++;ticket={id:body.p_request_id,category:body.p_category,message:body.p_message,status:'open',admin_reply:'Respuesta segura de prueba',admin_note:'NEVER_DISPLAY_PRIVATE_NOTE',created_at:new Date().toISOString()}
    // Simulate committed write whose response is lost: authoritative GET resolves it.
    code=503;response={code:'SYNTHETIC_RESPONSE_LOST'}
   }else if(url.pathname.endsWith('/rpc/pazo_my_support_tickets')){
    if(holdHistory){historyHeld=true;await new Promise(resolve=>{releaseHistory=resolve})}
    response=ticket?[ticket]:[]
   }
   else if(url.pathname.endsWith('/rpc/pazo_admin_find_benefit_recipients'))response=[{owner_id:owner,email:'owner@synthetic.invalid',pets:['Fixture pet'],gift_level:0,gift_expires_at:null,gift_active:giftPosts>0}]
   else if(url.pathname.endsWith('/rpc/pazo_admin_gift_history'))response=[]
   else if(url.pathname.endsWith('/rpc/pazo_admin_set_gift_benefits')){
    giftPosts++;giftIds.push(body.p_request_id);response=true
    if(giftPosts===1){code=503;response={code:'SYNTHETIC_RESPONSE_LOST'}}
   }else{remoteUnmocked++;return route.abort()}
   return route.fulfill({status:code,contentType:'application/json',body:JSON.stringify(response)}).catch(()=>{})
  })
  const page=await context.newPage(),errors=[]
  page.on('pageerror',error=>errors.push(error.name))
  page.on('dialog',dialog=>dialog.accept())
  await page.goto(ORIGIN+'/supabase/tests/f17/browser-harness.html?case=maintenance')
  await page.getByRole('heading',{name:'Estamos mejorando PAZO'}).waitFor()
  check(await page.getByTestId('protected-app').count()===0,'maintenance leaked app')
  await page.getByRole('button',{name:'Acceso para administradores'}).click()
  await page.getByLabel('Correo',{exact:true}).fill('ordinary@synthetic.invalid')
  await page.getByLabel('Contraseña',{exact:true}).fill('SYNTHETIC_ONLY_NOT_A_REAL_PASSWORD')
  await page.getByRole('button',{name:'Entrar',exact:true}).click()
  await page.getByRole('alert').waitFor()
  check(await page.getByTestId('protected-app').count()===0,'ordinary sign-in leaked app')
  admin=true
  await page.getByLabel('Correo',{exact:true}).fill('admin@synthetic.invalid')
  await page.getByLabel('Contraseña',{exact:true}).fill('SYNTHETIC_ONLY_NOT_A_REAL_PASSWORD')
  await page.getByRole('button',{name:'Entrar',exact:true}).click()
  await page.getByTestId('protected-app').waitFor()
  assertions++
  await page.evaluate(()=>localStorage.clear())
  await page.goto(RECOVERY_ORIGIN+'/maintenance-admin.html')
  await page.getByLabel('Correo de administrador').fill('admin@synthetic.invalid')
  await page.getByLabel('Contraseña',{exact:true}).fill('SYNTHETIC_ONLY_NOT_A_REAL_PASSWORD')
  await page.getByRole('button',{name:'Verificar acceso',exact:true}).click()
  await page.getByText('Mantenimiento activo. Puedes restaurar el acceso.',{exact:true}).waitFor()
  check(await page.getByRole('button',{name:'Restaurar acceso',exact:true}).isDisabled(),'restore needs explicit confirmation')
  await page.getByRole('checkbox').check()
  await page.getByRole('button',{name:'Restaurar acceso',exact:true}).click()
  await page.getByText('PAZO está disponible. No se cambió ningún control financiero.',{exact:true}).waitFor()
  check(!enabled,'independent restore failed')
  check(await page.evaluate(()=>Object.keys(localStorage).every(k=>!k.startsWith('sb-'))),'recovery persisted auth')
  // Clear the SDK session used only by the earlier maintenance fixture.
  await context.clearCookies();await page.evaluate(()=>localStorage.clear())
  await page.goto(ORIGIN+'/supabase/tests/f17/browser-harness.html?case=support')
  await page.getByLabel('Tu mensaje',{exact:true}).fill('Synthetic support delivery test')
  await page.getByRole('button',{name:'Enviar a soporte',exact:true}).click()
  await page.getByRole('button',{name:'Consultar envío',exact:true}).waitFor()
  await page.getByRole('button',{name:'Consultar envío',exact:true}).click()
  await page.getByText('Recibimos tu mensaje. Gracias por ayudarnos a mejorar PAZO.',{exact:true}).waitFor()
  check(submissions===1,'support duplicated uncertain write')
  check(!(await page.locator('body').innerText()).includes('NEVER_DISPLAY_PRIVATE_NOTE'),'support note leak')
  check(await page.getByText('Respuesta segura de prueba',{exact:true}).count()===1,'owner reply missing')
  await page.keyboard.press('Escape')
  check(await page.evaluate(()=>document.body.dataset.closed==='true'),'dialog Escape')
  await page.goto(ORIGIN+'/supabase/tests/f17/browser-harness.html?case=inbox')
  await page.getByRole('textbox',{name:'Nota interna (solo administradores)',exact:true}).fill('NEVER_DISPLAY_PRIVATE_NOTE')
  await page.getByRole('textbox',{name:'Respuesta visible para el usuario',exact:true}).fill('Respuesta actualizada de PAZO')
  await page.getByRole('button',{name:'Guardar nota y respuesta',exact:true}).click()
  await page.waitForFunction(()=>!document.querySelector('button[disabled]'))
  check(adminUpdates===1,'admin reply saved exactly once')
  await page.goto(ORIGIN+'/supabase/tests/f17/browser-harness.html?case=support')
  await page.getByText('Respuesta actualizada de PAZO',{exact:true}).waitFor()
  check(!(await page.locator('body').innerText()).includes('NEVER_DISPLAY_PRIVATE_NOTE'),'internal note leaked after administrator reply')
  await page.goto(ORIGIN+'/supabase/tests/f17/browser-harness.html?case=gift')
  await page.getByLabel('Cuenta o mascota',{exact:true}).fill('synthetic')
  await page.getByRole('button',{name:'Buscar',exact:true}).click()
  await page.getByRole('button',{name:/owner@synthetic.invalid/}).click()
  await page.getByRole('button',{name:'Dar beneficios',exact:true}).click()
  await page.getByText('Resultado sin confirmar. Consulta la cuenta antes de volver a guardar.',{exact:true}).waitFor()
  await page.getByRole('button',{name:'Dar beneficios',exact:true}).click()
  await page.getByText('Cambio registrado. Los beneficios de cortesía no cuentan como ingresos.',{exact:true}).waitFor()
  check(giftPosts===2&&giftIds[0]===giftIds[1]&&typeof giftIds[0]==='string','gift replay uses stable identifier')
  if(width===390){
   await page.goto(ORIGIN+'/supabase/tests/f17/browser-harness.html?case=install')
   await page.getByRole('button',{name:'Instalar',exact:true}).waitFor()
   await page.getByRole('button',{name:'Instalar',exact:true}).click()
   check(await page.evaluate(()=>window.fixturePromptCalls===1),'one-shot native prompt')
   check(await page.evaluate(()=>window.fixtureInstallState().installed===false),'prompt acceptance is not physical install')
  }
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow')
  holdHistory=true;historyHeld=false
  await page.goto(ORIGIN+'/supabase/tests/f17/browser-harness.html?case=support-delayed')
  await page.getByRole('dialog').waitFor()
  // The pending owner-only history read must not survive an account change.
  for(let i=0;i<50&&!historyHeld;i++)await page.waitForTimeout(20)
  check(historyHeld,'private history request did not start')
  await page.evaluate(()=>window.fixtureSignIn())
  await page.waitForFunction(()=>document.body.dataset.closed==='true')
  releaseHistory?.();holdHistory=false
  check(await page.getByRole('dialog').count()===0,'account change retained private support')
  check(remoteUnmocked===0,'unrecognized remote attempt')
  check(errors.length===0,'browser JavaScript error')
  await context.close()
 }
 const englishContext=await browser.newContext({locale:'en-US',serviceWorkers:'block'})
 const englishPage=await englishContext.newPage()
 await englishContext.route('**/*',route=>[ORIGIN,RECOVERY_ORIGIN].includes(new URL(route.request().url()).origin)?route.continue():route.abort())
 await englishPage.goto(RECOVERY_ORIGIN+'/maintenance-admin.html')
 await englishPage.getByRole('heading',{name:'PAZO · Recovery',exact:true}).waitFor()
 check(await englishPage.getByLabel('Administrator email',{exact:true}).count()===1,'English recovery labels')
 check(await englishPage.locator('#controls').isHidden()&&await englishPage.locator('#restore').isDisabled(),'English restore remains denied')
 await englishContext.close()
 console.log(JSON.stringify({source:'f17_local_mocked_chromium',viewports:[390,1440],compiled_recovery:RECOVERY_ORIGIN!==ORIGIN,assertions,result:'PASS',hosted_auth_or_provider_calls:0,physical_install:false}))
}finally{await browser.close()}

// F16-P05 disposable PostgreSQL ONLY: actual two-session claim serialization.
// All connection coordinates and event IDs are synthetic and fixed.
// No Supabase hosted connection, PayPal API, payment, ledger or entitlement.
import assert from 'node:assert/strict'
import {spawn,execFileSync} from 'node:child_process'
const psql='psql'
const args=['-X','-h','127.0.0.1','-p','55441','-U','f14_admin',
 '-d','f14_synthetic','-Atq','-v','ON_ERROR_STOP=1']
const id='WH-CONCURRENT-SYNTHETIC-001'
const old='WH-CONCURRENT-OLD-001'
const run=q=>execFileSync(psql,[...args,'-c',q],{
 encoding:'utf8',timeout:15000,stdio:['ignore','pipe','pipe'],
}).trim()
if(run("SELECT current_database()='f14_synthetic' AND session_user='f14_admin'")!=='t')
 throw Error('P05 refused non-disposable PostgreSQL')
let seq=0
const sessions=[]
function open(name){
 const child=spawn(psql,args,{env:{...process.env,
  PGAPPNAME:'p05_claim_disposable_'+name},stdio:['pipe','pipe','pipe']})
 sessions.push(child)
 let pending=null,output='',err=''
 child.stdout.on('data',b=>{output+=b;settle()})
 child.stderr.on('data',b=>{err+=b})
 child.on('error',e=>pending?.reject(e))
 child.on('exit',code=>pending?.reject(Error('psql exited '+code)))
 function settle(){
  if(!pending||!output.includes(pending.marker))return
  const i=output.indexOf(pending.marker)
  const value=output.slice(0,i).trim()
  output=output.slice(i+pending.marker.length)
  const {resolve,timer}=pending;pending=null;clearTimeout(timer)
  resolve(value)
 }
 return {
  async query(sql){
   assert.equal(pending,null)
   return await new Promise((resolve,reject)=>{
    const marker='p05_end_'+(++seq)
    const timer=setTimeout(()=>{
     child.kill();reject(Error('p05 local session timeout '+name))
    },10000)
    pending={resolve,reject,marker,timer}
    child.stdin.write(sql+"\nSELECT '"+marker+"';\n")
    settle()
   })
  },
  close(){child.stdin.end('ROLLBACK;\n\\q\n')}
 }
}
try{
 run("BEGIN;SET ROLE postgres;UPDATE supporter_private.p05_inbox_worker_gate SET enabled=false,not_before=NULL WHERE id=1;DELETE FROM supporter_private.paypal_verified_event_inbox WHERE provider_event_id IN ('"+id+"','"+old+"');COMMIT;")
 run("BEGIN;SET ROLE postgres;INSERT INTO supporter_private.paypal_verified_event_inbox(provider_event_id,event_type,verified_at,processing_state,next_attempt_at) VALUES('"+old+"','PAYMENT.SALE.COMPLETED',clock_timestamp()-interval '5 days','pending',clock_timestamp()-interval '1 second'),('"+id+"','PAYMENT.SALE.COMPLETED',clock_timestamp()-interval '30 seconds','pending',clock_timestamp()-interval '1 second');UPDATE supporter_private.p05_inbox_worker_gate SET enabled=true,not_before=clock_timestamp()-interval '2 minutes' WHERE id=1;COMMIT;")
 const a=open('workerA'),b=open('workerB')
 const one=await a.query("BEGIN;SET LOCAL ROLE service_role;SELECT public.f16_p05_draft_claim_next_verified_event()->>'eventId';")
 assert.equal(one,id,'first worker must claim the fresh synthetic event')
 // Worker A deliberately holds its row lock while worker B claims next.
 // SKIP LOCKED must not wait for A or select the historical event.
 const two=await b.query("BEGIN;SET LOCAL ROLE service_role;SELECT public.f16_p05_draft_claim_next_verified_event() IS NULL;COMMIT;")
 assert.equal(two,'t','second worker must not double claim a locked event')
 await a.query('COMMIT;')
 const three=await b.query("BEGIN;SET LOCAL ROLE service_role;SELECT public.f16_p05_draft_claim_next_verified_event() IS NULL;COMMIT;")
 assert.equal(three,'t','active lease must block a repeated claim')
 const attempts=run("BEGIN;SET ROLE postgres;SELECT attempt_count FROM supporter_private.paypal_verified_event_inbox WHERE provider_event_id='"+id+"';COMMIT;")
 assert.equal(attempts,'1')
 const historical=run("BEGIN;SET ROLE postgres;SELECT attempt_count FROM supporter_private.paypal_verified_event_inbox WHERE provider_event_id='"+old+"';COMMIT;")
 assert.equal(historical,'0')
 const denied=spawn(psql,[...args,'-c',
  'BEGIN;SET LOCAL ROLE anon;SELECT public.f16_p05_draft_claim_next_verified_event();COMMIT;'],
  {env:process.env,stdio:['ignore','ignore','pipe']})
 const exit=await new Promise((resolve,reject)=>{
  denied.on('error',reject);denied.on('exit',resolve)
  denied.stderr.resume()
 })
 assert.notEqual(exit,0,'anon must not execute private claim RPC')
 console.log('PASS P05 two-session SKIP LOCKED, lease, historical cutoff, anon deny (synthetic)')
}finally{
 for(const s of sessions)s.close()
 try{
  run("BEGIN;SET ROLE postgres;UPDATE supporter_private.p05_inbox_worker_gate SET enabled=false,not_before=NULL WHERE id=1;DELETE FROM supporter_private.paypal_verified_event_inbox WHERE provider_event_id IN ('"+id+"','"+old+"');COMMIT;")
 }catch{/* disposable CI process is thrown away */}
}

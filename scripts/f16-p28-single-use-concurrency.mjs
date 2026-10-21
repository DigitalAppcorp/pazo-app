// P28 disposable PG17 concurrency: a held consumption locks out a second caller.
import assert from 'node:assert/strict'
import {execFileSync,spawn} from 'node:child_process'
const args=['-X','-h','127.0.0.1','-p','55443','-U','f14_admin','-d','f14_synthetic','-Atq','-v','ON_ERROR_STOP=1']
const run=s=>execFileSync('psql',[...args,'-c',s],{encoding:'utf8',timeout:12000}).trim()
assert.equal(run("SELECT current_database()='f14_synthetic' AND session_user='f14_admin'"),'t')
const req='99999999-9999-4999-8999-999999999999',ev='WH-P28-CONCURRENT'
const fp='c'.repeat(64)
const read="SELECT public.f16_p28_lab_consume_historical_candidate('"+ev+"','"+req+"','"+fp+"')"
const setup="BEGIN;SET ROLE postgres;INSERT INTO supporter_private.paypal_verified_event_inbox(provider_event_id,event_type,processing_state,retention_hold) VALUES ('"+ev+"','PAYMENT.SALE.COMPLETED','pending',true);INSERT INTO supporter_private.p28_historical_read_audit(request_id,event_fingerprint) VALUES('"+req+"','"+fp+"');COMMIT;"
const clean="BEGIN;SET ROLE postgres;DELETE FROM supporter_private.p28_historical_read_audit WHERE request_id='"+req+"';DELETE FROM supporter_private.paypal_verified_event_inbox WHERE provider_event_id='"+ev+"';COMMIT;"
let child
try{
 run(setup)
 child=spawn('psql',args,{stdio:['pipe','pipe','pipe']})
 let output='',errors='',counter=0
 child.stdout.on('data',s=>{output+=s});child.stderr.on('data',s=>{errors+=s})
 const query=async(sql)=>{
  const marker='p28_mark_'+(++counter)
  child.stdin.write(sql+";\nSELECT '"+marker+"';\n")
  const deadline=Date.now()+10000
  while(!output.includes(marker)){
   if(Date.now()>deadline)throw Error('P28 session timeout '+errors.slice(0,200))
   await new Promise(r=>setTimeout(r,20))
  }
  const index=output.indexOf(marker),result=output.slice(0,index).trim()
  output=output.slice(index+marker.length)
  return result
 }
 const first=await query('BEGIN;SET LOCAL ROLE postgres;'+read)
 assert.match(first,/WH-P28-CONCURRENT/)
 let blocked=false
 try{run("BEGIN;SET LOCAL lock_timeout='500ms';SET LOCAL ROLE postgres;"+read+";COMMIT;")}
 catch(e){blocked=true;assert.match(String(e.stderr||e.message),/lock timeout|canceling statement due to lock timeout/i)}
 assert.equal(blocked,true)
 await query('COMMIT')
 assert.equal(run('BEGIN;SET ROLE postgres;'+read+';COMMIT;'),'')
 assert.equal(run("SELECT count(*) FROM supporter_private.p28_historical_read_audit WHERE request_id='"+req+"' AND consumed_at IS NOT NULL"),'1')
 console.log('PASS P28 two-session once-only consumption')
}finally{
 if(child){child.stdin.end('ROLLBACK;\n\\q\n');child.kill()}
 try{run(clean)}catch{}
}

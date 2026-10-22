// P26 disposable PG17 two-session lock test. No hosted connections.
import assert from 'node:assert/strict'
import {execFileSync,spawn} from 'node:child_process'
const args=['-X','-h','127.0.0.1','-p','55443','-U','f14_admin','-d','f14_synthetic','-Atq','-v','ON_ERROR_STOP=1']
const run=s=>execFileSync('psql',[...args,'-c',s],{encoding:'utf8',timeout:12000}).trim()
assert.equal(run("SELECT current_database()='f14_synthetic' AND session_user='f14_admin'"),'t')
const intent='intent-cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const owner='33333333-3333-4333-8333-333333333333'
const insert="INSERT INTO supporter_private.p26_proposed_obligation_credits(intent_id,obligation_ordinal,external_sale_id,owner_id) VALUES ('"+intent+"',0,'SALE-P26-CONCURRENT', '"+owner+"');"
const cleanup="BEGIN;SET ROLE postgres;DELETE FROM supporter_private.p26_proposed_obligation_credits WHERE intent_id='"+intent+"';DELETE FROM supporter_private.p25_first_obligation_reviews WHERE intent_id='"+intent+"';DELETE FROM supporter_private.paypal_subscription_intents WHERE intent_id='"+intent+"';COMMIT;"
const setup="BEGIN;SET ROLE postgres;INSERT INTO supporter_private.paypal_subscription_intents(intent_id,owner_id,provider,plan_id,state,external_subscription_id,bound_at) VALUES ('"+intent+"','"+owner+"','paypal','P-14V25407JP6850922NLHMDKI','bound','I-P26-CONCURRENT',clock_timestamp());INSERT INTO supporter_private.p25_first_obligation_reviews(intent_id,subscription_id,external_sale_id,provider_event_id,owner_id) VALUES ('"+intent+"','I-P26-CONCURRENT','SALE-P26-CONCURRENT','EVENT-P26-CONCURRENT','"+owner+"');COMMIT;"
let child
try{
 run(cleanup);run(setup)
 child=spawn('psql',args,{stdio:['pipe','pipe','pipe']})
 let output='',error='',seq=0
 child.stdout.on('data',x=>{output+=x})
 child.stderr.on('data',x=>{error+=x})
 const query=async(sql)=>{
  const marker='p26_marker_'+(++seq)
  child.stdin.write(sql+"\nSELECT '"+marker+"';\n")
  const deadline=Date.now()+8000
  while(!output.includes(marker)){
   if(Date.now()>deadline)throw Error('P26 first session timeout: '+error.slice(0,100))
   await new Promise(r=>setTimeout(r,20))
  }
  const idx=output.indexOf(marker),value=output.slice(0,idx).trim()
  output=output.slice(idx+marker.length)
  return value
 }
 await query('BEGIN;SET LOCAL ROLE postgres;'+insert)
 // The held uncommitted UNIQUE row must block conflicting second session,
 // not permit a concurrent duplicate; short lock timeout proves contention.
 let failed=false
 try{run("BEGIN;SET LOCAL lock_timeout='500ms';SET LOCAL ROLE postgres;"+insert+"COMMIT;")}
 catch(e){failed=true;assert.match(String(e.stderr||e.message),/lock timeout|canceling statement due to lock timeout/i)}
 assert.equal(failed,true,'concurrent insert must wait for unique-key lock')
 await query('COMMIT;')
 failed=false
 try{run('BEGIN;SET ROLE postgres;'+insert+'COMMIT;')}
 catch(e){failed=true;assert.match(String(e.stderr||e.message),/duplicate key|unique constraint/i)}
 assert.equal(failed,true,'committed reservation cannot duplicate')
 const count=run("SELECT count(*) FROM supporter_private.p26_proposed_obligation_credits WHERE intent_id='"+intent+"' AND credit_state='blocked'")
 assert.equal(count,'1')
 console.log('PASS P26 two-session uniqueness serialization and blocked-only credit')
}finally{
 if(child){child.stdin.end('ROLLBACK;\n\\q\n');child.kill()}
 try{run(cleanup)}catch{}
}

// PAZO F16 — only disposable GitHub Actions PostgreSQL 17.
import {spawn} from 'node:child_process'
const env=process.env
if(env.GITHUB_ACTIONS!=='true'||env.PGPASSWORD!=='f14_synthetic_ci_only'||
 env.SUPABASE_DB_URL||env.DATABASE_URL||env.PAZO_SUPABASE_PROJECT_ID)
 throw Error('F16 refund multievent concurrency requires isolated PG17 CI')
const args=['-X','-Atq','-v','ON_ERROR_STOP=1','-h','127.0.0.1',
 '-p','55441','-U','f14_admin','-d','f14_synthetic']
const sql=q=>new Promise((resolve,reject)=>{
 const cp=spawn('psql',[...args,'-c',q],{
  env:{...env,PGCONNECT_TIMEOUT:'5'},stdio:['ignore','pipe','pipe']})
 let output=''
 cp.stdout.on('data',b=>output+=b.toString())
 cp.on('error',reject)
 cp.on('close',code=>code===0?resolve(output.trim()):reject(Error('pg17_refund_rejected')))
})
const exec=q=>sql('SET ROLE service_role; '+q)
const owner='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const plan='P-14V25407JP6850922NLHMDKI'
const sub='I-RACE-MULTI-V2'
const intent='intent-7e620c85-2bc4-4f37-a606-f3cf3d29e9a0'
const sale='SALE-RACE-MULTI-V2'
const before=Number(await sql('SELECT COUNT(*) FROM supporter_private.f16_lab_refund_events'))
if(await exec("SELECT public.f16_paypal_create_private_intent('"+owner+"','"+intent+"')")!=='t')
 throw Error('Missing private synthetic owner')
if(await exec("SELECT public.f16_paypal_bind_private_intent('"+intent+"','"+owner+"','"+sub+"','"+plan+"')")!=='new_binding')
 throw Error('Binding failed')
async function claim(id){
 if(await exec("SELECT public.f16_paypal_record_verified_event('"+id+"','PAYMENT.SALE.REFUNDED')")!=='t')
  throw Error('Event admission failed')
 const x=await exec("SELECT public.f16_lab_claim_verified_inbox('"+id+"',240)::text")
 const token=JSON.parse(x)?.lease_token
 if(!token)throw Error('No unique lease')
 return token
}
function commit(id,token,refund,minor,status,time){
 return exec("SELECT public.f16_lab_commit_claimed_refund('"+id+"','"+
  token+"'::uuid,'"+sale+"','"+sub+"','"+refund+"',"+minor+",'"+
  status+"','"+time+"'::timestamptz)")
}
const first='WH-RACE-REFUND-100', second='WH-RACE-REFUND-199'
const t1=await claim(first),t2=await claim(second)
const date1='2026-10-14T12:00:00Z',date2='2026-10-14T12:15:00Z'
// Two workers may attempt final/refund in different orders. If the final
// evidence reaches SQL first, it MUST fail until the earlier partial commits.
const results=await Promise.allSettled([
 commit(first,t1,'REFUND-RACE-100',100,'PARTIALLY_REFUNDED',date1),
 commit(second,t2,'REFUND-RACE-199',199,'REFUNDED',date2),
])
if(results[0].status!=='fulfilled'||results[0].value!=='refund_recorded_partial')
 throw Error('Initial partial refund failed to settle')
const final=results[1].status==='fulfilled'?results[1].value:
 await commit(second,t2,'REFUND-RACE-199',199,'REFUNDED',date2)
if(final!=='refund_recorded_full')
 throw Error('Final refund not settled on safe retry')
const id='WH-RACE-REFUND-DUP',token=await claim(id)
const outcomes=await Promise.allSettled(Array.from({length:12},
 ()=>commit(id,token,'REFUND-RACE-100',100,'PARTIALLY_REFUNDED',date1)))
const fulfilled=outcomes.filter(x=>x.status==='fulfilled').map(x=>x.value)
if(fulfilled.length!==1||fulfilled[0]!=='refund_duplicate')
 throw Error('Lease replay granted more than one refund ACK')
const agg=await sql("SELECT refunded_minor||'|'||refund_count||'|'||refund_state FROM supporter_private.f16_lab_refund_sale_holds WHERE original_sale_id='"+sale+"'")
if(agg!=='299|2|full')throw Error('Concurrent refunds overcounted money')
const count=Number(await sql('SELECT COUNT(*) FROM supporter_private.f16_lab_refund_events'))
if(count!==before+2)throw Error('Duplicate refund ID created extra financial row')
if(await sql("SELECT supporter_private.wall_has_verified_entitlement('"+owner+"'::uuid)")!=='f')
 throw Error('Financial refund tests granted entitlement')
console.log('PASS F16: concurrent 100+199 cents, safe retries, 12-way replay, exact 299 cents, no entitlement')

// PAZO F16: PostgreSQL 17 isolated financial concurrency test. No hosted data.
import {spawn} from 'node:child_process'
const e=process.env
if(e.GITHUB_ACTIONS!=='true'||e.PGPASSWORD!=='f14_synthetic_ci_only'||
 e.SUPABASE_DB_URL||e.DATABASE_URL||e.PAZO_SUPABASE_PROJECT_ID)
 throw Error('F16 finance race requires disposable PostgreSQL in GitHub Actions')
const pg=['-X','-Atq','-v','ON_ERROR_STOP=1','-h','127.0.0.1',
 '-p','55441','-U','f14_admin','-d','f14_synthetic']
function sql(q){
 return new Promise((resolve,reject)=>{
  const child=spawn('psql',[...pg,'-c',q],{
   env:{...e,PGCONNECT_TIMEOUT:'5'},stdio:['ignore','pipe','pipe']})
  let output='',err=''
  child.stdout.on('data',b=>output+=b.toString())
  child.stderr.on('data',b=>err+=b.toString())
  child.on('error',reject)
  child.on('close',code=>code===0?resolve(output.trim()):
   reject(Error('Isolated PostgreSQL rejected request: '+err.slice(0,180))))
 })
}
const owner='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const plan='P-14V25407JP6850922NLHMDKI'
const paid='2026-10-13 19:00:00+00'
const subscription='I-LEASE-RACE'
const intent='intent-b7c4f893-2375-48b5-b4f2-38eb3addb004'
const before=await sql('SELECT count(*) FROM supporter_private.paypal_payment_entries')
const revBefore=await sql('SELECT count(*) FROM supporter_private.paypal_payment_reversals')
if(await sql("SET ROLE service_role; SELECT public.f16_paypal_create_private_intent('"+owner+"','"+intent+"')")!=='t')
 throw Error('No synthetic owner intent')
if(await sql("SET ROLE service_role; SELECT public.f16_paypal_bind_private_intent('"+intent+"','"+owner+"','"+subscription+"','"+plan+"')")!=='new_binding')
 throw Error('Synthetic subscription binding failed')
async function createEvent(id){
 const result=await sql("SET ROLE service_role; SELECT public.f16_paypal_record_verified_event('"+id+"','PAYMENT.SALE.COMPLETED')")
 if(result!=='t')throw Error('Could not create synthetic event')
}
async function claim(id){
 const text=await sql("SET ROLE service_role; SELECT public.f16_lab_claim_verified_inbox('"+id+"',240)::text")
 if(!text||text==='null')throw Error('No claim available')
 const row=JSON.parse(text)
 if(row.provider_event_id!==id||!row.lease_token)throw Error('Wrong lease issued')
 return row.lease_token
}
function commit(id,token,payment){
 return sql("SET ROLE service_role; SELECT public.f16_lab_commit_claimed_sale('"+
 id+"','"+token+"'::uuid,'"+payment+"','"+subscription+"','"+owner+"','"+
 plan+"',299,'USD','"+paid+"'::timestamptz)")
}
for(let i=1;i<=4;i++){
 const id='WH-FIN-RACE-'+i,payment='PAY-FIN-RACE-'+i
 await createEvent(id)
 const token=await claim(id)
 const result=await Promise.allSettled(Array.from({length:8},()=>commit(id,token,payment)))
 const accepted=result.filter(x=>x.status==='fulfilled').map(x=>x.value)
 const denied=result.filter(x=>x.status==='rejected')
 if(accepted.length!==1||accepted[0]!=='inserted_uncredited'||denied.length!==7)
  throw Error('Parallel token replay accepted multiple financial commits')
 const value=await sql("SELECT count(*)||'|'||MIN(entry_state) FROM supporter_private.paypal_payment_entries WHERE external_payment_id='"+payment+"'")
 if(value!=='1|uncredited')throw Error('Duplicate ledger row or wrong ledger state')
 const state=await sql("SELECT processing_state||'|'||retention_hold||'|'||(f16_lease_token IS NULL)::text FROM supporter_private.paypal_verified_event_inbox WHERE provider_event_id='"+id+"'")
 if(state!=='processed|true|true'&&state!=='processed|t|t')
  throw Error('Atomic ACK or token disposal failed')
}
await createEvent('WH-FIN-RACE-DUPA')
await createEvent('WH-FIN-RACE-DUPB')
const tA=await claim('WH-FIN-RACE-DUPA'),tB=await claim('WH-FIN-RACE-DUPB')
const both=await Promise.all([
 commit('WH-FIN-RACE-DUPA',tA,'PAY-FIN-RACE-SAME'),
 commit('WH-FIN-RACE-DUPB',tB,'PAY-FIN-RACE-SAME')
])
if(both.sort().join('|')!=='duplicate_uncredited|inserted_uncredited')
 throw Error('Same payment ID with different events was double-counted')
const after=await sql('SELECT count(*) FROM supporter_private.paypal_payment_entries')
const revAfter=await sql('SELECT count(*) FROM supporter_private.paypal_payment_reversals')
if(Number(after)!==Number(before)+5||revAfter!==revBefore)
 throw Error('Unexpected financial record count after races')
const entitlement=await sql("SELECT supporter_private.wall_has_verified_entitlement('"+owner+"'::uuid)")
if(entitlement!=='f')throw Error('No entitlement is allowed in isolated lab')
console.log('PASS F16: 32 concurrent lease-bound commits, 5 unique uncredited payments, no entitlement')

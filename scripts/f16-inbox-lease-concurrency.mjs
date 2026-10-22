// PAZO F16: disposable PostgreSQL 17 claim race, never connected to PAZO hosted.
import {spawn} from 'node:child_process'
const ENV=process.env
if(ENV.GITHUB_ACTIONS!=='true'||ENV.PGPASSWORD!=='f14_synthetic_ci_only'||
 ENV.SUPABASE_DB_URL||ENV.DATABASE_URL||ENV.PAZO_SUPABASE_PROJECT_ID)
 throw Error('F16 concurrency lab refuses non-disposable environment')
const base=['-X','-Atq','-v','ON_ERROR_STOP=1','-h','127.0.0.1',
 '-p','55441','-U','f14_admin','-d','f14_synthetic']
function sql(q){
 return new Promise((resolve,reject)=>{
  const child=spawn('psql',[...base,'-c',q],{
   env:{...ENV,PGCONNECT_TIMEOUT:'5'},stdio:['ignore','pipe','pipe']})
  let out='',err=''
  child.stdout.on('data',b=>out+=b.toString())
  child.stderr.on('data',b=>err+=b.toString())
  child.on('error',reject)
  child.on('close',code=>code===0?resolve(out.trim()):
   reject(Error('Disposable PG query failed: '+err.slice(0,200))))
 })
}
const money=await sql(`SELECT (SELECT count(*) FROM supporter_private.paypal_payment_entries)||
 '|'||(SELECT count(*) FROM supporter_private.paypal_payment_reversals)`)
for(let round=1;round<=4;round++){
 const id='WH-LEASE-RACE-'+round
 await sql(`INSERT INTO supporter_private.paypal_verified_event_inbox
  (provider_event_id,event_type)
  VALUES ('${id}','BILLING.SUBSCRIPTION.CREATED')`)
 const q=`SET ROLE service_role;
  SELECT COALESCE(public.f16_lab_claim_verified_inbox('${id}',60)::text,'null')`
 const results=await Promise.all(Array.from({length:8},()=>sql(q)))
 const leases=results.filter(x=>x!=='null').map(s=>JSON.parse(s))
 if(leases.length!==1||leases[0].provider_event_id!==id||
    leases[0].attempt!==1)throw Error('32-way claim violated exactly-once lease')
 const token=leases[0].lease_token
 const ack=await sql(`SET ROLE service_role;
  SELECT public.f16_lab_ack_lifecycle('${id}','${token}'::uuid)`)
 const again=await sql(`SET ROLE service_role;
  SELECT public.f16_lab_ack_lifecycle('${id}','${token}'::uuid)`)
 if(ack!=='t'||again!=='f')throw Error('Lease ack not single-use')
 const state=await sql(`SELECT processing_state||'|'||retention_hold
  FROM supporter_private.paypal_verified_event_inbox
  WHERE provider_event_id='${id}'`)
 if(state!=='processed|true'&&state!=='processed|t')
  throw Error('Lifecycle ack failed to preserve retention hold')
}
const after=await sql(`SELECT (SELECT count(*) FROM supporter_private.paypal_payment_entries)||
 '|'||(SELECT count(*) FROM supporter_private.paypal_payment_reversals)`)
if(after!==money)throw Error('Claim test wrote money or reversal records')
console.log('PASS F16: 32 concurrent claims, exactly 4 leases and 4 one-use lifecycle acks; zero financial writes')

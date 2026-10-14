// Execute only inside the existing disposable f14_synthetic PostgreSQL 17
// GitHub Actions service. Never reads hosted Supabase credentials.
import {spawn} from 'node:child_process'

const HOST='127.0.0.1',PORT='55441',DB='f14_synthetic',USER='f14_admin'
if(process.env.GITHUB_ACTIONS!=='true' ||
  process.env.PGPASSWORD!=='f14_synthetic_ci_only' ||
  process.env.PAZO_SUPABASE_PROJECT_ID || process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL) throw Error('F16 concurrency test requires disposable CI-only PostgreSQL')

function runSql(sql) {
  return new Promise((resolve,reject)=>{
    const args=['-X','-Atq','-v','ON_ERROR_STOP=1','-h',HOST,'-p',PORT,
      '-U',USER,'-d',DB,'-c',sql]
    const child=spawn('psql',args,{env:{...process.env,PGCONNECT_TIMEOUT:'5'},stdio:['ignore','pipe','pipe']})
    let stdout='',stderr=''
    child.stdout.on('data',data=>{stdout+=data.toString()})
    child.stderr.on('data',data=>{stderr+=data.toString()})
    child.on('error',reject)
    child.on('close',code=>{
      if(code!==0)reject(Error('F16 isolated PostgreSQL query failed: '+stderr.slice(0,250)))
      else resolve(stdout.trim())
    })
  })
}
for(let iteration=1;iteration<=4;iteration++) {
  const id='WH-F16-CONCURRENT-'+iteration
  const sql=`SET ROLE service_role; SELECT public.f16_paypal_record_verified_event(
    '${id}','PAYMENT.SALE.COMPLETED');`
  const verdicts=await Promise.all(Array.from({length:8},()=>runSql(sql)))
  const counts={t:verdicts.filter(v=>v==='t').length,f:verdicts.filter(v=>v==='f').length}
  if(counts.t!==1 || counts.f!==7)
    throw Error('F16 deduplication failed under parallel SQL sessions')
  const persisted=await runSql(`SELECT count(*) FROM supporter_private.paypal_verified_event_inbox WHERE provider_event_id='${id}'`)
  if(persisted!=='1')throw Error('F16 duplicate rows detected in PostgreSQL')
}
const rows=await runSql('SELECT count(*) FROM supporter_private.paypal_verified_event_inbox')
if(rows!=='4')throw Error('Unexpected number of committed synthetic test events')
console.log('PASS F16: 32 concurrent RPC calls across 4 unique IDs; exactly 4 rows, no duplicate credit')

// F16 global limiter concurrency lab: disposable CI PostgreSQL ONLY.
import {spawn} from 'node:child_process'

const DB='f14_synthetic',PORT='55441',HOST='127.0.0.1',USER='f14_admin'
if(process.env.GITHUB_ACTIONS!=='true'||
  process.env.PGPASSWORD!=='f14_synthetic_ci_only'||
  process.env.DATABASE_URL||process.env.SUPABASE_DB_URL||
  process.env.PAZO_SUPABASE_PROJECT_ID)
 throw Error('Global budget lab requires disposable CI PostgreSQL, never hosted')
function sql(statement){
 return new Promise((resolve,reject)=>{
  const child=spawn('psql',['-X','-Atq','-v','ON_ERROR_STOP=1',
    '-h',HOST,'-p',PORT,'-U',USER,'-d',DB,'-c',statement],{
    env:{...process.env,PGCONNECT_TIMEOUT:'5'},stdio:['ignore','pipe','pipe'],
  })
  let out='',err=''
  child.stdout.on('data',chunk=>{out+=String(chunk)})
  child.stderr.on('data',chunk=>{err+=String(chunk)})
  child.on('error',reject)
  child.on('close',exit=>{
   if(exit!==0)reject(Error('Disposable SQL budget lab failed: '+err.slice(0,150)))
   else resolve(out.trim())
  })
 })
}
await sql("SET ROLE postgres; UPDATE supporter_private.f16_webhook_request_budget SET window_number=0,admitted=0;")
const query='SET ROLE service_role; SELECT public.f16_paypal_try_admit_global();'
const bursts=await Promise.all(Array.from({length:40},()=>sql(query)))
if(bursts.some(x=>x!=='t'&&x!=='f'))throw Error('Invalid lab RPC admission response')
const accepted=bursts.filter(x=>x==='t').length
if(accepted<1||accepted>30)throw Error('Invalid global budget concurrency decision')
const stored=await sql("SELECT admitted FROM supporter_private.f16_webhook_request_budget WHERE bucket='minute';")
if(Number(stored)!==accepted)throw Error('Lost counter increments under concurrent requests')
let remaining=30-accepted
for(let i=0;i<remaining;i++) {
 if(await sql(query)!=='t')throw Error('Global budget exhausted before fixed cap')
}
if(await sql(query)!=='f')throw Error('Global budget exceeded fixed per-minute cap')
const total=await sql("SELECT admitted FROM supporter_private.f16_webhook_request_budget WHERE bucket='minute';")
if(total!=='30')throw Error('Quota count exceeds or undershoots 30')
console.log('PASS F16: 40 parallel PostgreSQL requests, no counter races, 30 global slots maximum')

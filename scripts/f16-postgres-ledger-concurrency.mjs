// PAZO F16: concurrent financial lab only. No hosted Supabase connection.
import {spawn} from 'node:child_process'
const migrationQa=process.env.PAZO_F16_MIGRATION_QA==='true'

if(process.env.GITHUB_ACTIONS!=='true' ||
  process.env.PGPASSWORD!=='f14_synthetic_ci_only' ||
  process.env.DATABASE_URL || process.env.SUPABASE_DB_URL ||
  process.env.PAZO_SUPABASE_PROJECT_ID)
  throw Error('F16 ledger concurrency requires disposable CI PostgreSQL')

const OWNER='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const PLAN='P-14V25407JP6850922NLHMDKI'
const WHEN='2026-10-13 19:00:00+00'
function sqlRun(query){
 return new Promise((resolve,reject)=>{
  const p=spawn('psql',['-X','-Atq','-v','ON_ERROR_STOP=1','-h','127.0.0.1',
    '-p','55441','-U','f14_admin','-d','f14_synthetic','-c',query],{
      env:{...process.env,PGCONNECT_TIMEOUT:'5'},stdio:['ignore','pipe','pipe'],
    })
  let out='',err=''
  p.stdout.on('data',x=>{out+=x.toString()})
  p.stderr.on('data',x=>{err+=x.toString()})
  p.on('error',reject)
  p.on('close',code=>code===0?resolve(out.trim()):
    reject(Error('Isolated F16 ledger SQL failed: '+err.slice(0,160))))
 })
}
const payment=id=>`SELECT supporter_private.${migrationQa?'f16_private_record':'f16_lab_record'}_payment(
 '${id}','I-PAZO-TEST','${OWNER}'::uuid,'${PLAN}',
 299,'USD',TIMESTAMPTZ '${WHEN}')`
const reversal=id=>`SELECT supporter_private.${migrationQa?'f16_private_record':'f16_lab_record'}_reversal(
 '${id}','refunded',TIMESTAMPTZ '${WHEN}')`
const count=async(sql,expect,msg)=>{
 const v=await sqlRun(sql)
 if(v!==String(expect))throw Error(msg+': '+v)
}
const concurrent=await Promise.all(Array.from({length:8},()=>sqlRun(payment('PAY-RACE-01'))))
if(concurrent.filter(x=>x==='inserted_uncredited').length!==1 ||
   concurrent.filter(x=>x==='duplicate_uncredited').length!==7)
 throw Error('Concurrent payment ID was not idempotent')
const race=await Promise.all([
 sqlRun(reversal('PAY-RACE-01')),
 ...Array.from({length:8},()=>sqlRun(payment('PAY-RACE-01'))),
])
if(race[0]!=='reversal_recorded' ||
   race.slice(1).some(x=>!['duplicate_uncredited','duplicate_blocked'].includes(x)))
 throw Error('Payment/refund race had an unexpected result')
const reversed=await Promise.all(Array.from({length:8},()=>sqlRun(reversal('PAY-RACE-02'))))
if(reversed.filter(x=>x==='reversal_recorded').length!==1 ||
   reversed.filter(x=>x==='reversal_duplicate').length!==7)
 throw Error('Concurrent reversal tombstone was not idempotent')
if(await sqlRun(payment('PAY-RACE-02'))!=='inserted_blocked')
 throw Error('Late payment escaped the existing tombstone')
await count("SELECT count(*) FROM supporter_private.paypal_payment_entries",2,'duplicate payments')
await count("SELECT count(*) FROM supporter_private.paypal_payment_reversals",2,'duplicate reversals')
await count("SELECT count(*) FROM supporter_private.paypal_payment_entries WHERE entry_state='blocked_reversal'",2,'reversal race left unblocked payments')
console.log('PASS F16 ledger: 25 concurrent payment/reversal calls; two unique payments, two tombstones, no credits')

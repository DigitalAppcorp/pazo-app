// F16: concurrent subscription claim verification in disposable PG only.
import {spawn} from 'node:child_process'

if(process.env.GITHUB_ACTIONS!=='true' ||
   process.env.PGPASSWORD!=='f14_synthetic_ci_only' ||
   process.env.DATABASE_URL || process.env.SUPABASE_DB_URL ||
   process.env.PAZO_SUPABASE_PROJECT_ID)
 throw Error('F16 owner binding race test requires isolated CI PostgreSQL')
const OWNER_A='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const OWNER_B='8b134f73-5ee3-49a2-9a36-3e1592e5af81'
const PLAN='P-14V25407JP6850922NLHMDKI'
function run(query) {
 return new Promise((resolve,reject)=>{
  const child=spawn('psql',['-X','-Atq','-v','ON_ERROR_STOP=1','-h','127.0.0.1',
    '-p','55441','-U','f14_admin','-d','f14_synthetic','-c',query],{
      env:{...process.env,PGCONNECT_TIMEOUT:'5'},stdio:['ignore','pipe','pipe'],
    })
  let stdout='',stderr=''
  child.stdout.on('data',chunk=>{stdout+=chunk})
  child.stderr.on('data',chunk=>{stderr+=chunk})
  child.on('error',reject)
  child.on('close',code=>code===0?resolve(stdout.trim()):
    reject(Error('F16 isolated owner SQL rejected: '+stderr.slice(0,160))))
 })
}
const bind=(id,owner,sub)=>`SELECT supporter_private.f16_lab_bind_subscription(
  '${id}','${owner}'::uuid,'${sub}','${PLAN}','${id}')`
const ids=[
 'intent-a-parallelclaim000',
 'intent-b-parallelclaim000',
 'intent-c-parallelclaim000',
 'intent-d-parallelclaim000',
]
await run(`INSERT INTO supporter_private.paypal_subscription_intents
  (intent_id,owner_id,plan_id) VALUES
  ('${ids[0]}','${OWNER_A}'::uuid,'${PLAN}'),
  ('${ids[1]}','${OWNER_B}'::uuid,'${PLAN}'),
  ('${ids[2]}','${OWNER_B}'::uuid,'${PLAN}'),
  ('${ids[3]}','${OWNER_B}'::uuid,'${PLAN}')`)
const attempts=await Promise.all(Array.from({length:16},()=>run(bind(ids[0],OWNER_A,'I-SANDBOX-CLAIM-01'))))
if(attempts.filter(x=>x==='new_binding').length!==1 ||
 attempts.filter(x=>x==='already_bound').length!==15)
 throw Error('Concurrent same-owner claim was not idempotent')
const hijacks=await Promise.allSettled(
  Array.from({length:8},()=>run(bind(ids[0],OWNER_B,'I-SANDBOX-CLAIM-01'))))
if(hijacks.some(x=>x.status!=='rejected'))
 throw Error('Unauthorized owner hijacked a bound intent')
const rivals=await Promise.allSettled(ids.slice(1).map(id=>run(bind(id,OWNER_B,'I-SANDBOX-CLAIM-02'))))
if(rivals.filter(x=>x.status==='fulfilled'&&x.value==='new_binding').length!==1 ||
 rivals.filter(x=>x.status==='rejected').length!==2)
 throw Error('Same PayPal subscription could bind more than one owner intent')
const count=await run('SELECT count(*) FROM supporter_private.paypal_subscription_intents WHERE state=\'bound\'')
if(count!=='2')throw Error('Cross-owner race yielded extra bindings')
const second=await run(`SELECT count(*) FROM supporter_private.paypal_subscription_intents
 WHERE external_subscription_id='I-SANDBOX-CLAIM-02'`)
if(second!=='1')throw Error('PayPal subscription ID claimed multiple times')
const payments=await run('SELECT count(*) FROM supporter_private.paypal_payment_entries')
if(payments!=='0')throw Error('Binding unexpectedly credited payment')
console.log('PASS F16 owner binding: 27 race attempts; one intent per subscription, no cross-owner claim, zero payments')

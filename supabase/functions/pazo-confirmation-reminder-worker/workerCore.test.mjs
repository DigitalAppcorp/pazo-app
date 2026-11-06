import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createConfirmationReminderWorker} from './workerCore.mjs'

const request=(authorization='Bearer '+'a'.repeat(64),method='POST')=>
  new Request('https://worker.test/',{method,headers:{authorization}})

test('rejects non-POST requests and malformed dispatch credentials before RPC',async()=>{
  let calls=0
  const worker=createConfirmationReminderWorker({rpc:async()=>{calls++;return true},sendResend:async()=>true})
  assert.equal((await worker(request(undefined,'GET'))).status,405)
  assert.equal((await worker(request('Bearer nope'))).status,401)
  assert.equal(calls,0)
})

test('a rejected or replayed dispatch never leases accounts or sends mail',async()=>{
  const calls=[]
  const worker=createConfirmationReminderWorker({rpc:async(name)=>{calls.push(name);return false},sendResend:async()=>{throw Error('must not send')}})
  assert.equal((await worker(request())).status,401)
  assert.deepEqual(calls,['pazo_auth_confirmation_reminder_admit'])
})

test('uses Auth resend once and reports only a closed outcome, never the email',async()=>{
  const calls=[]
  let sent=0
  const worker=createConfirmationReminderWorker({
    rpc:async(name,args)=>{
      calls.push([name,args])
      if(name==='pazo_auth_confirmation_reminder_admit')return true
      if(name==='pazo_auth_confirmation_reminder_lease')return [{user_id:'u-1',email:'private@example.test'}]
      return 1
    },
    sendResend:async(email)=>{sent++;assert.equal(email,'private@example.test');return true},
  })
  const response=await worker(request())
  assert.equal(response.status,200)
  assert.deepEqual(await response.json(),{processed:1})
  assert.equal(sent,1)
  assert.deepEqual(calls[2],[
    'pazo_auth_confirmation_reminder_report',
    {p_results:[{user_id:'u-1',outcome:'accepted'}]},
  ])
  assert.doesNotMatch(JSON.stringify(calls[2]),/private@example\.test/)
})

test('a timeout is terminal and is never retried in the same invocation',async()=>{
  let sent=0
  const reports=[]
  const worker=createConfirmationReminderWorker({
    rpc:async(name,args)=>name==='pazo_auth_confirmation_reminder_admit'?true:
      name==='pazo_auth_confirmation_reminder_lease'?[{user_id:'u-2',email:'private@example.test'}]:reports.push(args),
    sendResend:async()=>{sent++;throw Error('timeout')},
  })
  assert.equal((await worker(request())).status,200)
  assert.equal(sent,1)
  assert.deepEqual(reports,[{p_results:[{user_id:'u-2',outcome:'unknown'}]}])
})

test('database claim is private, excludes Google, accounts for manual resends and expires after 14 days',()=>{
  const sql=readFileSync(new URL('../../migrations/20261106090005_pazo_email_confirmation_reminder.sql',import.meta.url),'utf8')
  assert.match(sql,/ENABLE ROW LEVEL SECURITY[\s\S]*FORCE ROW LEVEL SECURITY/)
  assert.match(sql,/REVOKE ALL ON auth_private\.confirmation_reminder FROM PUBLIC,anon,authenticated,service_role/)
  assert.match(sql,/raw_app_meta_data->>'provider'='email'/)
  assert.match(sql,/NEW\.confirmation_sent_at IS DISTINCT FROM OLD\.confirmation_sent_at/)
  assert.match(sql,/DELETE FROM auth_private\.confirmation_reminder WHERE user_id=NEW\.id/)
  assert.match(sql,/interval '14 days'/)
  assert.match(sql,/status='attempting',attempted_at=/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyA3PasswordForJob} from './reauth.ts'

const job='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const sid='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const jwt='j'.repeat(80)
const password='An Example Secret 456'
function fixture(){
  const calls=[]
  const port={
    async verifyCurrentSession(){calls.push('session');return{userId:id,email:'test@example.invalid',sessionId:sid}},
    async readRequestedJobOwner(){calls.push('owner');return id},
    async verifyPassword(){calls.push('password');return{userId:id}},
    async recordProof(){calls.push('save');return true},
  }
  return{calls,port}
}
test('verified original session + fresh password + job owner only records review evidence',async()=>{
  const a=fixture()
  const result=await verifyA3PasswordForJob(job,jwt,password,a.port)
  assert.deepEqual(result,{status:'recorded_for_review',accountDeletionAllowed:false})
  assert.deepEqual(a.calls,['session','owner','password','save'])
  assert.ok(!JSON.stringify(result).includes(password))
  assert.ok(!JSON.stringify(result).includes('example.invalid'))
})
test('invalid request fails before consulting Auth or database',async()=>{
  const a=fixture()
  for(const [j,t,p] of [
    ['',jwt,password],[job,'short',password],[job,jwt,''],[job,jwt,'a'.repeat(1025)],
  ]) {
    const r=await verifyA3PasswordForJob(j,t,p,a.port)
    assert.equal(r.status,'rejected')
  }
  assert.deepEqual(a.calls,[])
})
test('other account job never prompts for password and never records evidence',async()=>{
  const a=fixture();a.port.readRequestedJobOwner=async()=>sid
  const r=await verifyA3PasswordForJob(job,jwt,password,a.port)
  assert.equal(r.status,'rejected')
  assert.ok(!a.calls.includes('password'))
  assert.ok(!a.calls.includes('save'))
})
test('different credential identity cannot record evidence for current session',async()=>{
  const a=fixture();a.port.verifyPassword=async()=>({userId:sid})
  assert.equal((await verifyA3PasswordForJob(job,jwt,password,a.port)).status,'rejected')
  assert.ok(!a.calls.includes('save'))
})
test('missing verifiable session ID is rejected even when email matches',async()=>{
  const a=fixture()
  a.port.verifyCurrentSession=async()=>({userId:id,email:'test@example.invalid',sessionId:''})
  assert.equal((await verifyA3PasswordForJob(job,jwt,password,a.port)).status,'rejected')
  assert.ok(!a.calls.includes('save'))
})
test('wrong password, missing session and DB error all fail closed',async()=>{
  const noPwd=fixture();noPwd.port.verifyPassword=async()=>null
  assert.equal((await verifyA3PasswordForJob(job,jwt,password,noPwd.port)).status,'rejected')
  assert.ok(!noPwd.calls.includes('save'))
  const noSession=fixture();noSession.port.verifyCurrentSession=async()=>null
  assert.equal((await verifyA3PasswordForJob(job,jwt,password,noSession.port)).status,'rejected')
  const dbDown=fixture();dbDown.port.recordProof=async()=>{throw Error('User email and password leaked')}
  const r=await verifyA3PasswordForJob(job,jwt,password,dbDown.port)
  assert.equal(r.status,'retryable')
  assert.ok(!JSON.stringify(r).includes('password'))
})
test('failure to persist evidence must not report success',async()=>{
  const a=fixture();a.port.recordProof=async()=>false
  assert.equal((await verifyA3PasswordForJob(job,jwt,password,a.port)).status,'retryable')
})

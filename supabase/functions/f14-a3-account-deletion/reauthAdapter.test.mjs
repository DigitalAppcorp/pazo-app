import test from 'node:test'
import assert from 'node:assert/strict'
import {makeA3SupabaseReauthPort} from './reauthAdapter.ts'
import {verifyA3PasswordForJob} from './reauth.ts'

const job='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const session='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const jwt='valid-synthetic-session-'.repeat(4)
const pwd='Secret 0123 = Test'

function setup(opts={}){
 const events=[]
 const newAuth=()=>({auth:{
   async getUser(){events.push('Auth.getUser');return{data:{user:{id,email:'owner@example.invalid'}},error:null}},
   async getClaims(){events.push('Auth.getClaims');return{data:{claims:{sub:opts.sub??id,session_id:opts.session??session}},error:null}},
   async signInWithPassword(){events.push('Auth.signInWithPassword');return{data:{user:{id:opts.loginId??id},session:{access_token:'ephemeral'}},error:opts.loginError??null}},
   async signOut({scope}){events.push('Auth.signOut:'+scope);return{error:opts.logoutError??null}},
 }})
 const db={async rpc(name,args){
   events.push(name)
   if(name==='f14_a3_service_job_owner') return{data:opts.owner??id,error:null}
   if(name==='f14_a3_service_record_reauth') {
     assert.equal(args.p_session_id,session)
     return{data:true,error:null}
   }
   throw Error('Unexpected RPC')
 }}
 return{events,port:makeA3SupabaseReauthPort(newAuth,db)}
}
test('server binds live user, signed session, job ownership, fresh password and receipt',async()=>{
 const a=setup()
 const r=await verifyA3PasswordForJob(job,jwt,pwd,a.port)
 assert.equal(r.status,'recorded_for_review')
 assert.equal(r.accountDeletionAllowed,false)
 assert.ok(a.events.includes('Auth.signOut:local'))
 assert.ok(a.events.includes('f14_a3_service_record_reauth'))
 assert.ok(!JSON.stringify(r).includes('owner@'))
})
test('tampered JWT claim or missing session cannot be used for account closure',async()=>{
 const a=setup({sub:session})
 const r=await verifyA3PasswordForJob(job,jwt,pwd,a.port)
 assert.equal(r.status,'rejected')
 assert.ok(!a.events.includes('Auth.signInWithPassword'))
 const b=setup({session:''})
 assert.equal((await verifyA3PasswordForJob(job,jwt,pwd,b.port)).status,'rejected')
})
test('wrong password, different login identity or unsafe signout block receipt',async()=>{
 for(const opts of [
   {loginError:{message:'Bad password'}},
   {loginId:session},
   {logoutError:{message:'Cannot revoke temporary session'}},
 ]) {
   const a=setup(opts)
   const r=await verifyA3PasswordForJob(job,jwt,pwd,a.port)
   assert.equal(r.status,'rejected')
   assert.ok(!a.events.includes('f14_a3_service_record_reauth'))
 }
})
test('job ownership must match before password authentication',async()=>{
 const a=setup({owner:session})
 assert.equal((await verifyA3PasswordForJob(job,jwt,pwd,a.port)).status,'rejected')
 assert.ok(!a.events.includes('Auth.signInWithPassword'))
})

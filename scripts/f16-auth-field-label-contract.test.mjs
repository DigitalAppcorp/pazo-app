import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const a=readFileSync(new URL('../src/components/views/OnboardingView.tsx',import.meta.url),'utf8')
const b=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8')
for(const [src,id] of [[a,'pazo-signup-email'],[a,'pazo-signup-password'],[b,'pazo-login-email'],[b,'pazo-login-password']]){
 test(id+' has one input and one associated label',()=>{
  assert.equal(src.split('id="'+id+'"').length,2)
  assert.equal(src.split('htmlFor="'+id+'"').length,2)
 })
}

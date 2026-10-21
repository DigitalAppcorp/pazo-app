import test from 'node:test'
import assert from 'node:assert/strict'
import {PAZO_SANDBOX_PLAN_ID,assessPazoSandboxPlan} from './paypalSandboxPlanContract.mjs'
const valid=()=>({
  id:PAZO_SANDBOX_PLAN_ID,status:'ACTIVE',
  billing_cycles:[{tenure_type:'REGULAR',frequency:{interval_unit:'MONTH',interval_count:1},
    total_cycles:0,pricing_scheme:{fixed_price:{currency_code:'USD',value:'2.99'}}}],
  payment_preferences:{setup_fee:{currency_code:'USD',value:'0.00'}},
  quantity_supported:false,
})
test('accepts only active unlimited monthly USD 2.99 plan without setup fee',()=>{
  const r=assessPazoSandboxPlan(valid());assert.equal(r.ok,true);assert.equal(r.summary.amount,'2.99')
})
test('rejects wrong plan ID and non-active status',()=>{
  for(const data of [{id:'P-other'},{status:'CREATED'},{status:'INACTIVE'}])
    assert.equal(assessPazoSandboxPlan({...valid(),...data}).ok,false)
})
test('rejects annual, finite and trial plan structures',()=>{
  const v=valid()
  for(const cycles of [
    [{...v.billing_cycles[0],frequency:{interval_unit:'YEAR',interval_count:1}}],
    [{...v.billing_cycles[0],total_cycles:12}],
    [{tenure_type:'TRIAL'},...v.billing_cycles],
  ]) assert.equal(assessPazoSandboxPlan({...v,billing_cycles:cycles}).ok,false)
})
test('rejects wrong currency, value, and setup fees',()=>{
  const v=valid()
  for(const fixed_price of [{currency_code:'USD',value:'3.99'},{currency_code:'EUR',value:'2.99'},{currency_code:'USD',value:'2.990'}])
    assert.equal(assessPazoSandboxPlan({...v,billing_cycles:[{...v.billing_cycles[0],pricing_scheme:{fixed_price}}]}).ok,false)
  assert.equal(assessPazoSandboxPlan({...v,payment_preferences:{setup_fee:{currency_code:'USD',value:'0.49'}}}).ok,false)
})
test('flags quantity and taxes for manual review',()=>{
  const r=assessPazoSandboxPlan({...valid(),quantity_supported:true,taxes:{percentage:'8.5'}})
  assert.equal(r.ok,true);assert.deepEqual(r.warnings,['quantity_supported_review','tax_configuration_review'])
})
test('fails closed for missing data and does not echo arbitrary plan data',()=>{
  assert.equal(assessPazoSandboxPlan(null).ok,false)
  const r=assessPazoSandboxPlan({...valid(),merchant_secret:'SECRET_EXAMPLE'})
  assert.equal(JSON.stringify(r).includes('SECRET_EXAMPLE'),false)
})

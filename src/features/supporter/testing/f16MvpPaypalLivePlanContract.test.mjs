import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePazoPaypalLiveMonthlyPlan as check}
 from '../../../../supabase/functions/f16-paypal-webhook/pazoPaypalLivePlanContract.mjs';
const ID='P-1234567890ABCDEFGHIJKL';
const plan=(changes={})=>({
  id:ID,status:'ACTIVE',quantity_supported:false,
  billing_cycles:[{
    tenure_type:'REGULAR',sequence:1,total_cycles:0,
    frequency:{interval_unit:'MONTH',interval_count:1},
    pricing_scheme:{fixed_price:{currency_code:'USD',value:'2.99'}},
  }],
  payment_preferences:{auto_bill_outstanding:false,
    setup_fee:{currency_code:'USD',value:'0.00'}},
  ...changes
});
const blocked=p=>p.ready===false&&p.mayCheckout===false&&
  p.mayGrantBenefits===false;
test('F16 MVP: one LIVE $2.99 monthly recurring plan passes but does not authorize checkout',()=>{
 const p=check(plan(),ID);
 assert.equal(p.ready,true);
 assert.equal(p.planId,ID);
 assert.equal(p.priceMinor,299);
 assert.equal(p.currency,'USD');
 assert.equal(p.cadence,'MONTH_1');
 assert.equal(p.mayCheckout,false);
 assert.equal(p.mayGrantBenefits,false);
});
test('F16 MVP: no live plan ID, wrong merchant plan or inactive fails closed',()=>{
 for(const [x,expected] of [
  [plan(),undefined],[plan(),'P-OTHER'],
  [plan({id:'P-OTHER'}),ID],[plan({status:'CREATED'}),ID],
  [plan({status:'INACTIVE'}),ID]
 ])assert.ok(blocked(check(x,expected)));
});
test('F16 MVP: trial, additional cycle, finite cycle, annual and weekly blocked',()=>{
 const good=plan().billing_cycles[0];
 for(const variation of [
  [good,{...good,tenure_type:'TRIAL',sequence:2}],
  [good],
 ]) {/* no-op: build adversarial cases below without provider calls */}
 for(const p of [
  plan({billing_cycles:[{...good,tenure_type:'TRIAL'},good]}),
  plan({billing_cycles:[{...good,total_cycles:12}]}),
  plan({billing_cycles:[{...good,frequency:{interval_unit:'YEAR',interval_count:1}}]}),
  plan({billing_cycles:[{...good,frequency:{interval_unit:'WEEK',interval_count:1}}]}),
  plan({billing_cycles:[{...good,sequence:2}]}),
 ]) assert.ok(blocked(check(p,ID)));
});
test('F16 MVP: price/FX/tiers/setup fee/outstanding and taxes cannot be silently accepted',()=>{
 const good=plan().billing_cycles[0];
 for(const p of [
  plan({billing_cycles:[{...good,pricing_scheme:{fixed_price:{currency_code:'USD',value:'3.99'}}}]}),
  plan({billing_cycles:[{...good,pricing_scheme:{fixed_price:{currency_code:'EUR',value:'2.99'}}}]}),
  plan({billing_cycles:[{...good,pricing_scheme:{fixed_price:{currency_code:'USD',value:'2.99'},tiers:[]}}]}),
  plan({payment_preferences:{setup_fee:{currency_code:'USD',value:'1.00'}}}),
  plan({payment_preferences:{auto_bill_outstanding:true}}),
  plan({taxes:{percentage:'8.00',inclusive:false}}),
  plan({quantity_supported:true}),
 ])assert.ok(blocked(check(p,ID)));
});
test('F16 MVP: untrusted or absent plan cannot authorize money or benefits',()=>{
 for(const value of [null,undefined,[],{},'P-123',false])
  assert.ok(blocked(check(value,ID)));
});

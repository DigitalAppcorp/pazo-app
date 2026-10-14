import test from 'node:test'
import assert from 'node:assert/strict'
import {assessF16P05WindowCoverage} from '../../../../supabase/functions/f16-paypal-webhook/p05TransactionWindowCoverageLab.mjs'
const sub='I-PAZO-WINDOW-QA'
const t=(id,time)=>({id,time,payer_email:'private@example.com'})
const start='2026-10-01T00:00:00Z'
const mid='2026-11-01T00:00:00Z'
const end='2026-12-01T00:00:00Z'
const first={subscriptionId:sub,merchantScopedByPayPalApi:true,httpOk:true,
 startTime:start,endTime:mid,totalPages:1,totalItems:1,
 transactions:[t('SALE-WINDOW-ONE','2026-10-12T00:00:00Z')]}
const second={subscriptionId:sub,merchantScopedByPayPalApi:true,httpOk:true,
 startTime:mid,endTime:end,totalPages:1,totalItems:1,
 transactions:[t('SALE-WINDOW-TWO','2026-11-12T00:00:00Z')]}
const setup=(patch={})=>({subscriptionId:sub,requestedStart:start,requestedEnd:end,
 windows:[{...first,transactions:first.transactions.map(x=>({...x}))},
 {...second,transactions:second.transactions.map(x=>({...x}))}],...patch})
const run=mutate=>{const x=setup();mutate?.(x);return assessF16P05WindowCoverage(x)}
const safe=r=>{
 assert.equal(r.globalFinancialCoverage,false)
 assert.equal(r.canConcludeNoRefunds,false)
 assert.equal(r.canConcludeNoDisputes,false)
 assert.equal(r.mayAssignBillingCycle,false)
 assert.equal(r.mayGrantBenefits,false)
 assert.equal(r.mayCountPaidMonth,false)
 assert.equal(r.entitlement,false)
 assert.equal(r.paidThrough,null)
 assert.equal(JSON.stringify(r).includes('private@example.com'),false)
 assert.equal(JSON.stringify(r).includes('SALE-WINDOW'),false)
 assert.equal(JSON.stringify(r).includes(sub),false)
}
test('P05 two verified adjacent 31/30-day windows still cannot prove no refunds or periods',()=>{
 const r=run()
 safe(r)
 assert.equal(r.requestedWindowCovered,true)
 assert.equal(r.windowCount,2)
 assert.equal(r.transactionCount,2)
 assert.equal(r.reason,'requested_transaction_window_contiguous_not_financially_exhaustive')
})
test('P05 reversed request order of contiguous windows is harmless, not evidence of paid period',()=>{
 const r=run(x=>x.windows.reverse())
 safe(r);assert.equal(r.requestedWindowCovered,true)
})
test('P05 missing beginning, end or middle of history is denied',()=>{
 for(const mutate of [
  x=>x.requestedStart='2026-09-01T00:00:00Z',
  x=>x.requestedEnd='2026-12-02T00:00:00Z',
  x=>x.windows[1].startTime='2026-11-02T00:00:00Z',
  x=>x.windows.splice(0,1),
  x=>x.windows.splice(1,1),
 ]){
  const r=run(mutate)
  safe(r);assert.equal(r.requestedWindowCovered,false)
 }
})
test('P05 overlapping windows are held for review even if individual pages complete',()=>{
 const r=run(x=>x.windows[1].startTime='2026-10-31T00:00:00Z')
 safe(r);assert.equal(r.reason,'overlapping_windows_need_dedup_review')
})
test('P05 duplicate transaction IDs across adjacent windows cannot be counted as two paid months',()=>{
 const r=run(x=>x.windows[1].transactions[0].id='SALE-WINDOW-ONE')
 safe(r);assert.equal(r.reason,'duplicate_cross_window_payment')
})
test('P05 partial, contradictory, missing pagination metadata is denied',()=>{
 for(const mutate of [
  x=>x.windows[0].totalPages=2,
  x=>x.windows[0].totalPages=null,
  x=>x.windows[0].totalItems=0,
  x=>x.windows[0].totalItems=2,
  x=>x.windows[0].totalPages=-1,
  x=>x.windows[0].transactions=[],
  x=>delete x.windows[0].transactions,
 ]){
  const r=run(mutate)
  safe(r);assert.equal(r.reason,'incomplete_provider_page')
 }
})
test('P05 zero-transactions pages are still insufficient to rule out refunds',()=>{
 const r=run(x=>{
  x.windows[0].totalPages=0
  x.windows[0].totalItems=0
  x.windows[0].transactions=[]
  x.windows[1].totalItems=0
  x.windows[1].transactions=[]
 })
 safe(r);assert.equal(r.requestedWindowCovered,true)
 assert.equal(r.transactionCount,0)
 assert.equal(r.canConcludeNoRefunds,false)
})
test('P05 unverified merchant, cross-subscription pages and untrusted response block',()=>{
 for(const mutate of [
  x=>x.windows[1].subscriptionId='I-ANOTHER-USER',
  x=>x.windows[0].httpOk=false,
  x=>x.windows[0].merchantScopedByPayPalApi=false,
  x=>x.windows[0]=null,
  x=>x.subscriptionId='../../../account',
  x=>x.windows[0].payerEmail='private@example.com',
 ]){
  const r=run(mutate)
  safe(r)
  // Extra response fields are ignored; a caller must still strip payer PII.
  assert.equal(r.mayGrantBenefits,false)
 }
})
test('P05 invalid transaction references or out-of-window dates fail closed',()=>{
 for(const mutate of [
  x=>x.windows[0].transactions[0].time='2026-02-30T00:00:00Z',
  x=>x.windows[0].transactions[0].time='2026-11-02T00:00:00Z',
  x=>x.windows[0].transactions[0].id='../etc/passwd',
  x=>x.windows[0].endTime='2026-11-03T00:00:00Z',
  x=>x.windows[0].startTime='2026-11-01T00:00:00Z',
 ]){
  const r=run(mutate)
  safe(r);assert.equal(r.requestedWindowCovered,false)
 }
})
test('P05 24+ windows or absurd transaction histories never silently truncate',()=>{
 for(const mutate of [
  x=>x.windows=Array.from({length:25},()=>({...first})),
  x=>x.windows[0].transactions=Array.from({length:501},(_,i)=>
   t('SALE-'+i,'2026-10-13T00:00:00Z')),
 ]){
  const r=run(mutate)
  safe(r);assert.equal(r.requestedWindowCovered,false)
 }
})
test('P05 all combinations of page completeness, merchant origin, IDs and empty response never authorize benefits',()=>{
 let n=0
 for(const pages of [0,1,2,null])
  for(const count of [0,1,2])
   for(const ok of [true,false])
    for(const merchant of [true,false]){
     const r=run(x=>{
      x.windows[0].totalPages=pages
      x.windows[0].totalItems=count
      x.windows[0].httpOk=ok
      x.windows[0].merchantScopedByPayPalApi=merchant
     })
     safe(r);n++
    }
 assert.equal(n,48)
})

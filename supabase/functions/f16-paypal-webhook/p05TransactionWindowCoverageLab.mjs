// PAZO F16-P05 — OFFLINE ONLY, no network, payments, grants or DB writes.
// Verifies a bounded, merchant-scoped SERIES of subscription-transaction
// query windows. Does NOT prove absence of past refunds, disputes, unknown
// invoices, or full historical billing-cycle coverage.
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const ID=/^[A-Za-z0-9._-]{3,128}$/
const MAX_MS=31*24*60*60*1000
const date=x=>typeof x==='string'&&UTC.test(x)&&Number.isFinite(Date.parse(x))&&
 new Date(Date.parse(x)).toISOString().replace(/\.000Z$/,'Z')===x?
 Date.parse(x):null
const denied=(reason,windowCount=0)=>Object.freeze({
 reason,windowCount,
 requestedWindowCovered:false,globalFinancialCoverage:false,
 canConcludeNoRefunds:false,canConcludeNoDisputes:false,
 mayAssignBillingCycle:false,mayGrantBenefits:false,
 mayCountPaidMonth:false,entitlement:false,paidThrough:null,
})
export function assessF16P05WindowCoverage({
 subscriptionId,requestedStart,requestedEnd,windows,
}={}){
 const first=date(requestedStart),last=date(requestedEnd)
 if(!SUB.test(subscriptionId||'')||first===null||last===null||
  first>=last||!Array.isArray(windows)||windows.length<1||
  windows.length>24)return denied('invalid_requested_history_window')
 const normalized=[]
 const seenIds=new Set()
 let count=0
 for(const w of windows){
  if(!w||typeof w!=='object'||Array.isArray(w)||
   w.subscriptionId!==subscriptionId||w.merchantScopedByPayPalApi!==true||
   w.httpOk!==true)return denied('window_not_verified',normalized.length)
  const from=date(w.startTime),to=date(w.endTime)
  if(from===null||to===null||from>=to||to-from>MAX_MS)
   return denied('invalid_window_bounds',normalized.length)
  // PayPal's response includes total_items/total_pages, but the endpoint
  // here is intentionally not paginated. Other pages MUST be rejected.
  const tx=w.transactions
  const pages=w.totalPages,items=w.totalItems
  const empty=pages===0&&items===0&&Array.isArray(tx)&&tx.length===0
  if(!Array.isArray(tx)||tx.length>500||
   !Number.isSafeInteger(pages)||!Number.isSafeInteger(items)||
   pages<0||items<0||(!empty&&pages!==1)||
   items!==tx.length)
   return denied('incomplete_provider_page',normalized.length)
  for(const t of tx){
   if(!t||!ID.test(t.id||'')||!date(t.time))
    return denied('malformed_payment_reference',normalized.length)
   const when=date(t.time)
   if(when<from||when>to)return denied('transaction_outside_window',normalized.length)
   if(seenIds.has(t.id))
    return denied('duplicate_cross_window_payment',normalized.length)
   seenIds.add(t.id)
   count++
  }
  normalized.push({from,to})
 }
 normalized.sort((a,b)=>a.from-b.from)
 if(normalized[0].from!==first||normalized.at(-1).to!==last)
  return denied('requested_history_not_fully_covered',windows.length)
 for(let i=1;i<normalized.length;i++){
  if(normalized[i].from>normalized[i-1].to)
   return denied('history_has_unqueried_gap',windows.length)
  if(normalized[i].from<normalized[i-1].to)
   return denied('overlapping_windows_need_dedup_review',windows.length)
 }
 // A verified set of contiguous window responses is still only the
 // requested transaction window, not the complete financial lifetime.
 return Object.freeze({
  reason:'requested_transaction_window_contiguous_not_financially_exhaustive',
  windowCount:normalized.length,transactionCount:count,
  requestedWindowCovered:true,globalFinancialCoverage:false,
  canConcludeNoRefunds:false,canConcludeNoDisputes:false,
  mayAssignBillingCycle:false,mayGrantBenefits:false,
  mayCountPaidMonth:false,entitlement:false,paidThrough:null,
 })
}

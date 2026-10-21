// GET-only, original-sale dispute evidence. Input comes from private paid ledger.
// Official schema: developer.paypal.com/api/customer-disputes/v1/schema.json
// Drop buyer/seller identities, free text, messages and documents immediately.
import {canonicalPaypalInstant} from './liveBillingSnapshot.mjs'
const HOST='https://api-m.paypal.com',PATH='/v1/customer/disputes'
const ID=/^[A-Za-z0-9-]{3,100}$/,SALE=/^[0-9A-Z_]{1,128}$/
const statuses=new Set(['OPEN','WAITING_FOR_BUYER_RESPONSE','WAITING_FOR_SELLER_RESPONSE','UNDER_REVIEW','RESOLVED','OTHER'])
const outcomes=new Set(['RESOLVED_BUYER_FAVOUR','RESOLVED_SELLER_FAVOUR','RESOLVED_WITH_PAYOUT','CANCELED_BY_BUYER','ACCEPTED','DENIED','NONE'])
const fail=()=>{throw Error('live_dispute_evidence_unavailable')}
const amount=m=>{
 if(m?.currency_code!=='USD'||typeof m.value!=='string'||!/^\d{1,4}(?:\.\d{1,2})?$/.test(m.value))fail()
 const [a,b='']=m.value.split('.');const v=Number(a)*100+Number(b.padEnd(2,'0'))
 if(v<0||v>299)fail();return v
}
function normalize(d,{disputeId,saleId,originalPaymentAt,now}){
 const updatedAt=canonicalPaypalInstant(d?.update_time),createdAt=canonicalPaypalInstant(d?.create_time)
 if(d?.dispute_id!==disputeId||!statuses.has(d.status)||!createdAt||!updatedAt||
  Date.parse(createdAt)<Date.parse(originalPaymentAt)||Date.parse(updatedAt)<Date.parse(createdAt)||
  Date.parse(updatedAt)>now()+300000||!Array.isArray(d.disputed_transactions)||
  d.disputed_transactions.length!==1)fail()
 const t=d.disputed_transactions[0]
 if(t?.seller_transaction_id!==saleId||canonicalPaypalInstant(t.create_time)!==originalPaymentAt||amount(t.gross_amount)!==299)fail()
 const disputedMinor=amount(d.dispute_amount)
 const outcome=d.dispute_outcome?.outcome_code??null
 if(outcome!==null&&!outcomes.has(outcome))fail()
 // Only complete, unambiguous original USD2.99 disputes can affect a whole
 // period. Partial/unknown cases keep prior coverage and require review.
 let decision='review'
 if(disputedMinor===299){
  if(['OPEN','WAITING_FOR_BUYER_RESPONSE','WAITING_FOR_SELLER_RESPONSE','UNDER_REVIEW'].includes(d.status))decision='hold'
  else if(d.status==='RESOLVED'&&outcome==='RESOLVED_BUYER_FAVOUR')decision='hold'
  else if(d.status==='RESOLVED'&&['RESOLVED_SELLER_FAVOUR','CANCELED_BY_BUYER'].includes(outcome)&&
    t.transaction_status==='COMPLETED'&&
    (d.dispute_outcome.amount_refunded===undefined||amount(d.dispute_outcome.amount_refunded)===0))decision='clear'
 }
 return Object.freeze({disputeId,providerUpdatedAt:updatedAt,status:d.status,outcome,disputedMinor,decision})
}
export function createPazoLiveDisputeEvidenceReader({getJson,now=Date.now}={}){
 if(typeof getJson!=='function'||typeof now!=='function')throw Error('live_dispute_reader_not_configured')
 return async({saleId,originalPaymentAt,knownDisputeIds=[]}={})=>{
  const original=canonicalPaypalInstant(originalPaymentAt)
  if(!SALE.test(saleId||'')||!original||!Array.isArray(knownDisputeIds)||knownDisputeIds.length>20||
   knownDisputeIds.some(id=>!ID.test(id||''))||new Set(knownDisputeIds).size!==knownDisputeIds.length)fail()
  const started=now(),ids=new Set(),urls=new Set()
  let path=PATH+'?disputed_transaction_id='+encodeURIComponent(saleId)+'&page_size=50',pages=0
  while(path){
   if(++pages>5||urls.has(path)||now()-started>45000)fail()
   urls.add(path)
   const d=await getJson(path)
   if(!Array.isArray(d?.items)||d.items.length>50||(d.links!==undefined&&!Array.isArray(d.links)))fail()
   for(const row of d.items){
    if(!ID.test(row?.dispute_id||'')||ids.has(row.dispute_id)||ids.size>=20)fail()
    ids.add(row.dispute_id)
   }
   const next=(d.links||[]).filter(l=>l?.rel==='next');if(next.length>1)fail()
   path=null
   if(next.length){
    let u;try{u=new URL(next[0].href)}catch{fail()}
    if(next[0].method!=='GET'||u.origin!==HOST||u.pathname!==PATH||u.username||u.password||u.hash||
     u.searchParams.get('disputed_transaction_id')!==saleId||
     [...u.searchParams.keys()].some(k=>!['disputed_transaction_id','page','page_size','next_page_token'].includes(k))||
     [...u.searchParams.keys()].some(k=>u.searchParams.getAll(k).length!==1)||
     (u.searchParams.has('page')&&!/^[1-9]\d?$/.test(u.searchParams.get('page')))||
     (u.searchParams.has('page_size')&&!/^(?:[1-9]|[1-4]\d|50)$/.test(u.searchParams.get('page_size')))||
     (u.searchParams.has('next_page_token')&&!/^[A-Za-z0-9+/=]{1,255}$/.test(u.searchParams.get('next_page_token'))))fail()
    path=u.pathname+u.search
   }
  }
  // A case disappearing from a list is not a release. GET every known case.
  for(const id of knownDisputeIds)ids.add(id)
  if(ids.size>20)fail()
  const cases=[]
  for(const disputeId of ids){
   if(now()-started>45000)fail()
   const d=await getJson(PATH+'/'+encodeURIComponent(disputeId))
   cases.push(normalize(d,{disputeId,saleId,originalPaymentAt:original,now}))
  }
  return Object.freeze({verified:true,coverageComplete:true,saleId,originalPaymentAt:original,
   source:'original_generation_paypal_disputes_get',cases:Object.freeze(cases)})
 }
}

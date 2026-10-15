// PAZO F16 — pure read-only evidence comparison. Never authorizes financial writes.
const ref=/^[A-Za-z0-9._-]{3,128}$/
const merchantMoney=x=>x?.currency_code==='USD'&&x?.value==='2.99'
// PAYMENT.SALE.COMPLETED uses Payments v1 sale shape, NOT modern money fields.
const saleMoney=x=>x?.currency==='USD'&&x?.total==='2.99'
const result=(phase,reason)=>Object.freeze({phase,reason,mayGrantBenefits:false,mayRecordPayment:false,cycleVerified:false,paidThrough:null})
export function compareF16SandboxSaleEvidence({subscription,transaction,event,inboxEventId}={}){
  if(!subscription||!transaction||!event||!inboxEventId)
    return result('INCONCLUSIVE','missing_evidence')
  if(!ref.test(transaction.id||'')||!ref.test(inboxEventId)||!ref.test(event.id||''))
    return result('INCONCLUSIVE','invalid_reference')
  if(event.id!==inboxEventId)
    return result('MISMATCH','webhook_event_id_mismatch')
  if(event.event_type!=='PAYMENT.SALE.COMPLETED')
    return result('MISMATCH','webhook_event_type_mismatch')
  if(subscription.status!=='CANCELLED'||!/^I-[A-Za-z0-9_-]{3,70}$/.test(subscription.id||''))
    return result('INCONCLUSIVE','subscription_status_or_id_unverified')
  if(transaction.status!=='COMPLETED'||!merchantMoney(transaction.amount_with_breakdown?.gross_amount))
    return result('MISMATCH','merchant_sale_details_mismatch')
  const sale=event.resource
  if(!sale||typeof sale!=='object'||!ref.test(sale.id||''))
    return result('INCONCLUSIVE','webhook_sale_reference_missing')
  if(sale.id!==transaction.id)
    return result('MISMATCH','webhook_sale_id_mismatch')
  const linked=sale.billing_agreement_id
  if(typeof linked!=='string'||!linked)
    return result('INCONCLUSIVE','webhook_subscription_reference_missing')
  if(linked!==subscription.id)
    return result('MISMATCH','webhook_subscription_mismatch')
  if(sale.state!=='completed'&&sale.state!=='COMPLETED')
    return result('INCONCLUSIVE','webhook_sale_status_not_confirmed')
  if(!saleMoney(sale.amount))
    return result('MISMATCH','webhook_sale_amount_mismatch')
  return result('MATCH','exact_sale_webhook_and_subscription_references_match_only')
}

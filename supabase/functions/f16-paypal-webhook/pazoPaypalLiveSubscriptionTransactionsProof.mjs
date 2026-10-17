// PAZO F16: verify a PayPal Subscriptions v1 TRANSACTIONS response offline.
// The only positive result is a merchant transaction CANDIDATE for additional
// reconciliation. Never produces coverage, checkout authority or paidThrough.
// PayPal: GET /v1/billing/subscriptions/{id}/transactions (merchant OAuth).
const ID=/^[A-Za-z0-9._-]{3,50}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/;
const HOLD=new Set(['PENDING','DECLINED','FAILED','PARTIALLY_REFUNDED','REFUNDED']);
const fail=(reason)=>Object.freeze({
  state:'BLOCKED',reason,transactionVerified:false,
  mayRecordPayment:false,mayCreatePaidPeriod:false,
  mayGrantBenefits:false,paidThrough:null,serviceStart:null,serviceEnd:null,
});
export function reviewPazoLiveSubscriptionTransactions({
  document,expectedTransactionId,verifiedWebhookTime
}={}){
  if(!ID.test(expectedTransactionId||'') || !ISO.test(verifiedWebhookTime||'') ||
     !Number.isFinite(Date.parse(verifiedWebhookTime)) ||
     !document || typeof document!=='object'||Array.isArray(document)||
     !Array.isArray(document.transactions) || document.transactions.length>20)
    return fail('private_verified_inputs_missing');
  // Prohibit review of truncated/paginated results; never infer an unobserved
  // reversal or duplicate is absent when not all transactions were inspected.
  if(document.total_pages!==1 || document.total_items!==document.transactions.length)
    return fail('merchant_transaction_list_incomplete');
  if(document.transactions.some(row=>!row||typeof row!=='object' ||
     !ID.test(row.id||'') ||
     typeof row.status!=='string' || !['COMPLETED',...HOLD].includes(row.status)))
    return fail('unrecognized_transaction');
  const matches=document.transactions.filter(tx=>tx.id===expectedTransactionId);
  if(matches.length!==1)return fail('merchant_transaction_id_missing_or_duplicated');
  const tx=matches[0];
  if(tx.status!=='COMPLETED')return fail('merchant_transaction_not_cleared');
  if(tx.amount_with_breakdown?.gross_amount?.currency_code!=='USD' ||
     tx.amount_with_breakdown?.gross_amount?.value!=='2.99')
    return fail('merchant_transaction_gross_wrong');
  if(!ISO.test(tx.time||'') || !Number.isFinite(Date.parse(tx.time)))
    return fail('merchant_paid_timestamp_not_verified');
  if(Math.abs(Date.parse(verifiedWebhookTime)-Date.parse(tx.time))>48*3600000)
    return fail('merchant_paid_time_outside_verified_webhook');
  return Object.freeze({
    ...fail('single_completed_subscription_transaction_requires_period_and_reversal_review'),
    state:'REVIEW_REQUIRED',transactionVerified:true,
    transactionId:expectedTransactionId,merchantPaidAt:tx.time,
  });
}

// Closed aggregate contract: never expose customer/provider rows in this panel.
export function parsePazoLiveFinanceSummary(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||
  Object.keys(raw).sort().join(',')!=='activePaidAccounts,asOf,currency,environment,paidThrough,payments,providerStatement,source,subscriptions'||
  raw.source!=='pazo_verified_live_ledger'||raw.environment!=='live'||
  raw.currency!=='USD'||raw.providerStatement!==false||raw.paidThrough!==null||
  typeof raw.asOf!=='string'||!Number.isFinite(Date.parse(raw.asOf)))return null
 const valid=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).sort().join(',')===[...keys].sort().join(',')&&
  keys.every(k=>Number.isSafeInteger(value[k])&&value[k]>=0)
 if(!valid(raw.payments,['verifiedPayments','grossVerifiedMinor','heldPayments','heldGrossMinor'])||
  !valid(raw.subscriptions,['openRequests','unboundRequests','closedUnsentRequests','confirmedCancellations'])||
  !Number.isSafeInteger(raw.activePaidAccounts)||raw.activePaidAccounts<0||
  raw.payments.heldPayments>raw.payments.verifiedPayments||
  raw.payments.heldGrossMinor>raw.payments.grossVerifiedMinor||
  raw.subscriptions.unboundRequests>raw.subscriptions.openRequests)return null
 return raw
}

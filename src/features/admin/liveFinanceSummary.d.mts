export interface PazoLiveFinanceSummary {
 source:'pazo_verified_live_ledger'
 environment:'live'
 currency:'USD'
 asOf:string
 providerStatement:false
 paidThrough:null
 activePaidAccounts:number
 payments:{verifiedPayments:number;grossVerifiedMinor:number;heldPayments:number;heldGrossMinor:number}
 subscriptions:{openRequests:number;unboundRequests:number;closedUnsentRequests:number;confirmedCancellations:number}
}
export declare function parsePazoLiveFinanceSummary(raw:unknown):PazoLiveFinanceSummary|null

// Type contract for the read-only .mjs recovery classifier used by Vite/TSX.
export type SandboxV2RecoveryPhase =
 | 'creation_unconfirmed'
 | 'no_confirmed_subscription'
 | 'merchant_missing_needs_reconciliation'
 | 'merchant_read_unavailable'
 | 'merchant_status_unverified'
 | 'approval_resumable'
 | 'approval_link_unavailable'
 | 'approval_not_payment'
 | 'existing_subscription_may_bill'
 | 'terminal_needs_financial_reconciliation'
export interface SandboxV2RecoveryState {
 readonly phase: SandboxV2RecoveryPhase
 readonly mayStartNewCheckout: false
 readonly mayRecordPayment: false
 readonly mayGrantBenefits: false
 readonly paidThrough: null
 readonly canResumeOriginal: boolean
}
export declare function classifySandboxV2Recovery(input?:{
 accountState?: 'pending'|'bound'|string|null
 providerStatus?: string|null
 providerCode?: string|null
 providerError?: string|null
}): SandboxV2RecoveryState

export type OpenBlocker =
  | null
  | 'hosted_gate_required'
  | 'health_requires_review'
  | 'merchant_requires_review'
export function publicSupporterControls(value: unknown): {
  financial: 'pause_checkouts' | 'open_checkouts' | null
  promotion: 'pause_invitations' | 'resume_invitations' | null
}

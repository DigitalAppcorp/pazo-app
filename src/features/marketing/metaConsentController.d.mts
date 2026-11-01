export interface MetaConsentController {
  onGrant: () => Promise<boolean>
  onWithdraw: () => Promise<boolean>
  syncGpc: () => Promise<{status: string}>
}
export function createMetaConsentController(options: Record<string, unknown>): MetaConsentController | null

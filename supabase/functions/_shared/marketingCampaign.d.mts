export const LEGACY_CAMPAIGN: 'pazo_beta_local_202610'
export const ADS2_CAMPAIGN: 'pazo_la_en_202611'
export const LEGACY_CREATIVES: readonly string[]
export const ADS2_CREATIVES: readonly string[]
export const ALL_CREATIVES: readonly string[]
export function campaignForCreative(creative: unknown): string | null
export function validCampaignPair(campaign: unknown, creative: unknown): boolean

// Closed, disjoint campaign/creative contract; no advertising assets or PII.
export const LEGACY_CAMPAIGN = 'pazo_beta_local_202610'
export const ADS2_CAMPAIGN = 'pazo_la_en_202611'
export const LEGACY_CREATIVES = Object.freeze(['perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en'])
export const ADS2_CREATIVES = Object.freeze(['qr_v2_en','cuidados_v2_en','app_v2_en'])
export const ALL_CREATIVES = Object.freeze([...LEGACY_CREATIVES,...ADS2_CREATIVES])
export const campaignForCreative = creative => LEGACY_CREATIVES.includes(creative) ? LEGACY_CAMPAIGN : ADS2_CREATIVES.includes(creative) ? ADS2_CAMPAIGN : null
export const validCampaignPair = (campaign, creative) => typeof campaign === 'string' && campaignForCreative(creative) === campaign

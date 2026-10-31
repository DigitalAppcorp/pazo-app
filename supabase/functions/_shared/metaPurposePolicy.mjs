// #169. Pure policy evaluation. Source MUST be trusted server storage,
// not a checkbox or request body. No provider call is made by this module.
// A PAZO first-party analytics notice is not a Meta third-party sharing grant.
export const META_PURPOSE = 'meta_conversions_v1'
export const META_CONSENT_VERSION = 'pazo-meta-conversions-v1'
const validDate = value => typeof value==='string'
  && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(value)
  && Number.isFinite(Date.parse(value))

/** Consent is positive, specific, authenticated, current and withdrawable.
 * GPC / sale-sharing opt-out overrides consent. Unknown values are denied.
 * `trusted` must be asserted only by the server-side consent repository.
 */
export function assessMetaPurpose({
  record=null, now=Date.now(), trusted=false, gpc=true,
  sharingOptOut=true, accountExcluded=true, qaOrAdmin=true,
}={}) {
  if (!Number.isSafeInteger(now) || now<0
    || trusted!==true || gpc!==false || sharingOptOut!==false
    || accountExcluded!==false || qaOrAdmin!==false
    || !record || typeof record!=='object' || Array.isArray(record))
    return {allowed:false,reason:'blocked'}
  if (record.purpose!==META_PURPOSE || record.version!==META_CONSENT_VERSION
    || record.decision!=='granted' || !validDate(record.decidedAt)
    || record.withdrawnAt!==null || record.revokedAt!==null)
    return {allowed:false,reason:'blocked'}
  const t=Date.parse(record.decidedAt)
  if (t>now || (record.expiresAt!==undefined
    && (!validDate(record.expiresAt) || Date.parse(record.expiresAt)<=now)))
    return {allowed:false,reason:'blocked'}
  return {allowed:true,reason:'approved'}
}

// PAZO F16-P16 — pet-independent, authenticated account-management route.
export const SUPPORTER_ACCOUNT_HASH = '#/account/supporter'
export const isSupporterAccountHash = hash => hash === SUPPORTER_ACCOUNT_HASH
export function leaveSupporterAccountRoute(location) {
 if(!location || typeof location.hash!=='string')return false
 if(!isSupporterAccountHash(location.hash))return false
 location.hash = ''
 return true
}

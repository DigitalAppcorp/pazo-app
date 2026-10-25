// PAZO F16-P16 — pet-independent, authenticated account-management route.
export const SUPPORTER_ACCOUNT_HASH = '#/account/supporter'
export const isSupporterAccountHash = hash => hash === SUPPORTER_ACCOUNT_HASH ||
 hash === SUPPORTER_ACCOUNT_HASH+'?from=invitation' ||
 hash === SUPPORTER_ACCOUNT_HASH+'?from=notification' ||
 hash === SUPPORTER_ACCOUNT_HASH+'?paypal=return' ||
 hash === SUPPORTER_ACCOUNT_HASH+'?paypal=cancel'
export const supporterPaypalReturnKind = hash =>
 hash === SUPPORTER_ACCOUNT_HASH+'?paypal=return'?'return':
 hash === SUPPORTER_ACCOUNT_HASH+'?paypal=cancel'?'cancel':null
export const supporterEntrySource = hash => supporterPaypalReturnKind(hash)?'paypal':
 hash===SUPPORTER_ACCOUNT_HASH+'?from=invitation'?'invitation':
 hash===SUPPORTER_ACCOUNT_HASH+'?from=notification'?'notification':'manual'
// A browser redirect from PayPal carries untrusted query tokens. Strip them
// immediately; callback route means navigation only, never proof of payment.
export function normalizeSupporterPaypalCallback(location,history) {
 const kind=location?.pathname==='/paypal/return'?'return':
   location?.pathname==='/paypal/cancel'?'cancel':null
 if(!kind||typeof history?.replaceState!=='function')return false
 history.replaceState(history.state,'','/#/account/supporter?paypal='+kind)
 return true
}
export function leaveSupporterAccountRoute(location) {
 if(!location || typeof location.hash!=='string')return false
 if(!isSupporterAccountHash(location.hash))return false
 location.hash = ''
 return true
}

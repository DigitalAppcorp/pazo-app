export declare const SUPPORTER_ACCOUNT_HASH: '#/account/supporter'
export declare function isSupporterAccountHash(hash: string): boolean
export declare function leaveSupporterAccountRoute(location: { hash: string } | null | undefined): boolean
export declare function supporterPaypalReturnKind(hash:string): 'return'|'cancel'|null
export declare function normalizeSupporterPaypalCallback(
 location:{pathname:string}|null|undefined,
 history:{state:unknown;replaceState:(state:unknown,title:string,url:string)=>void}|null|undefined
):boolean
export function supporterEntrySource(hash:string):'manual'|'invitation'|'notification'|'paypal'

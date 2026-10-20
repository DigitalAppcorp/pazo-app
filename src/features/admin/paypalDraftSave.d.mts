export type PazoAdminDraft = Readonly<{
 p_environment:'sandbox'|'live'
 p_plan_id:string
 p_price_minor:number
 p_return_origin:string
 p_webhook_id:string
}>
export type PazoAdminDraftOutcome = Readonly<{
 state:'verified'|'rejected'|'uncertain'
 code:string
 settings:unknown|null
}>
export function normalizePazoDraft(input?:{
 environment:'sandbox'|'live'
 price:string
 planId:string
 origin:string
 webhookId:string
}):PazoAdminDraft|null
export function savePazoAdminDraftWithReadback(args?:{
 draft:PazoAdminDraft|null
 write:(payload:PazoAdminDraft)=>Promise<unknown>
 read:()=>Promise<unknown>
}):Promise<PazoAdminDraftOutcome>

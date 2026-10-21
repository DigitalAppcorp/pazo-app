// Service-only original sale binding and timestamp; no public ID lookup.
import {createPazoLiveServiceRpc} from '../pazo-paypal-live-checkout/liveSqlServiceAdapters.mjs'
import {canonicalPaypalInstant} from './liveBillingSnapshot.mjs'
export function createPazoLiveOriginalRefundSaleReader(options={}){
 const rpc=createPazoLiveServiceRpc(options)
 return async({merchantGeneration,saleId}={})=>{
  const fail=()=>{throw Error('original_refund_sale_unavailable')}
  if(!Number.isSafeInteger(merchantGeneration)||merchantGeneration<1||merchantGeneration>9999||
   !/^[A-Za-z0-9._-]{3,128}$/.test(saleId||''))fail()
  const d=await rpc('originalRefundSale',{p_generation:merchantGeneration,p_sale_id:saleId})
  if(d===null)return null
  if(d?.recorded!==true||d.provider!=='paypal'||d.sourceEnvironment!=='live'||d.merchantGeneration!==merchantGeneration||
   d.saleId!==saleId||d.state!=='bound'||d.consentVerified!==true||d.amountMinor!==299||d.currency!=='USD'||
   !/^I-[A-Za-z0-9_-]{3,70}$/.test(d.subscriptionId||'')||!/^P-[A-Z0-9]{12,40}$/.test(d.planId||'')||
   !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(d.ownerId||'')||
   !/^intent-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(d.intentId||'')||
   canonicalPaypalInstant(d.originalPaymentAt)!==d.originalPaymentAt)fail()
  return Object.freeze({provider:d.provider,sourceEnvironment:d.sourceEnvironment,recorded:d.recorded,
   merchantGeneration:d.merchantGeneration,saleId:d.saleId,state:d.state,consentVerified:d.consentVerified,
   amountMinor:d.amountMinor,currency:d.currency,subscriptionId:d.subscriptionId,planId:d.planId,
   ownerId:d.ownerId,intentId:d.intentId,originalPaymentAt:d.originalPaymentAt})
 }
}

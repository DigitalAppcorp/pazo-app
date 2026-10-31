// #169: OFF-by-default Edge candidate, not deployed.
// The one-time SQL RPC is LAB-ONLY; do not flip these flags until an
// approved migration, privacy review, and authenticated E2E exist.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createMetaReceiptHandler} from './receiptCore.mjs'
import {createMetaReceiptProvider} from './receiptAdapter.mjs'
const META_RECEIPT_ENDPOINT_RELEASED=false
const META_RECEIPT_PRIVACY_REVIEWED=false
function setup(){
  if(!META_RECEIPT_ENDPOINT_RELEASED||!META_RECEIPT_PRIVACY_REVIEWED)
    return createMetaReceiptHandler()
  try {
    const provider=createMetaReceiptProvider({
      url:Deno.env.get('SUPABASE_URL'),
      anonKey:Deno.env.get('SUPABASE_ANON_KEY'),
      serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      datasetId:Deno.env.get('META_DATASET_ID'),
      captureOriginalUa:true,
    })
    return createMetaReceiptHandler({
      released:true,privacyReviewed:true,...provider,
    })
  }catch{return createMetaReceiptHandler()}
}
Deno.serve(setup())

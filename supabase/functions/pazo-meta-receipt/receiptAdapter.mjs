// #169: candidate owner-bound, one-time receipt adapter; NEVER deployed.
// No provider token, pixel initialization, or third-party network here.
// Service-only RPC atomically consumes at most one receipt for a verified
// authenticated signup. A lost response may omit Pixel; it cannot re-mint it.
import {createMetaWithdrawalProvider} from '../pazo-meta-consent/withdrawAdapter.mjs'
import {createMarketingProvider} from '../pazo-marketing-attribution/intakeAdapter.mjs'
const URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
const PAZO_WEB_DATASET='1438916858347709'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function createMetaReceiptProvider({
  url,anonKey,serviceKey,datasetId,fetchImpl=fetch,
}={}) {
  if(url!==URL||datasetId!==PAZO_WEB_DATASET
      ||typeof fetchImpl!=='function')throw Error('meta_receipt_not_configured')
  // This provider's authenticate calls Supabase Auth /user AND /settings.
  // Auto-confirmation, unknown Auth configuration, and missing keys fail closed.
  const source=createMarketingProvider({url,anonKey,serviceKey,fetchImpl})
  const withdrawal=createMetaWithdrawalProvider({url,anonKey,serviceKey,fetchImpl})
 return {
    authenticate:source.authenticate,
    authenticateGpc:withdrawal.authenticate,
    persistGpc:withdrawal.withdraw,
    lookupReceipt:async ownerId=>{
      if(typeof ownerId!=='string'||!UUID.test(ownerId))return null
      let response
      try {
        response=await fetchImpl(URL+'/rest/v1/rpc/pazo_meta_take_pixel_receipt_candidate',{
          method:'POST',redirect:'error',cache:'no-store',
          signal:AbortSignal.timeout(6000),
          headers:{'apikey':serviceKey,'authorization':'Bearer '+serviceKey,
            'content-type':'application/json','accept':'application/json'},
          body:JSON.stringify({p_owner:ownerId}),
        })
      }catch{return null}
      if(response?.status!==200)return null
      let rows
      try{rows=await response.json()}catch{return null}
      if(!Array.isArray(rows)||rows.length!==1)return null
      const eventId=rows[0]?.event_id
      const parsed=Date.parse(rows[0]?.event_time)
      if(typeof eventId!=='string'||!UUID.test(eventId)
         ||!Number.isFinite(parsed))return null
      // Each affirmative attestation below is enforced *inside* the
      // service-only SQL receipt function, not accepted from the browser.
      // Browser GPC must still be checked independently at the HTTP layer.
      return {ownerId,authorized:true,verifiedRegistration:true,
        excluded:false,gpc:false,sharingOptOut:false,withdrawn:false,
        metaReleaseEnabled:true,eventId,datasetId,
        eventTime:Math.floor(parsed/1000)}
    },
  }
}

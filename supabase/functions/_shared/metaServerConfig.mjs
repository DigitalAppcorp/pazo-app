// #169: server-only Meta credential resolver, NOT imported by any deployed
// PAZO Edge Function. Never expose token to a browser, response or logs.
// The explicit release and privacy switches must BOTH be true before any
// environment reads. No default Deno/global env access is performed.
const DATASET=/^[1-9][0-9]{5,24}$/
const VERSION=/^v(?:[2-9][0-9]|[1-9][0-9]{2,})\.0$/
const EXPECTED_PAZO_WEB_DATASET='1438916858347709'

export function resolveMetaServerConfig({
  releaseEnabled=false, privacyGateApproved=false,
  expectedDatasetId=EXPECTED_PAZO_WEB_DATASET,
  apiVersion=null, readSecret=()=>undefined,
}={}) {
  if (releaseEnabled!==true || privacyGateApproved!==true) return null
  if (typeof readSecret!=='function' || typeof apiVersion!=='string'
      || !VERSION.test(apiVersion)
      || !DATASET.test(expectedDatasetId)) return null
  let token,datasetId
  try {
    datasetId=readSecret('META_DATASET_ID')
    token=readSecret('META_CAPI_ACCESS_TOKEN')
  } catch {return null}
  if (typeof datasetId!=='string' || !DATASET.test(datasetId)
      || datasetId!==expectedDatasetId
      || typeof token!=='string' || token.length<24
      || token.trim()!==token || /\s/.test(token)) return null
  // This return value is server-memory ONLY. Do not serialize, spread into
  // error telemetry or expose from any HTTP response.
  return Object.freeze({datasetId,apiVersion,serverToken:token})
}

// Safe for operational status views. Never returns values or secret lengths.
export function metaCredentialStatus({releaseEnabled=false,
  privacyGateApproved=false,readSecret=()=>undefined,
  apiVersion=null}={}) {
  if (releaseEnabled!==true || privacyGateApproved!==true)
    return Object.freeze({status:'disabled'})
  const resolved=resolveMetaServerConfig({releaseEnabled,
    privacyGateApproved,readSecret,apiVersion})
  return Object.freeze({status:resolved?'configured':'not_configured'})
}

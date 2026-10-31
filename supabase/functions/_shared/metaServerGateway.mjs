// #169 — OFF-by-default Edge-server composition candidate.
// NO deployed Edge Function imports this module. It neither exposes the
// environment secrets to a browser nor sends requests by itself.
// Only a trusted server worker may pass a durable outbox repository.
import {resolveMetaServerConfig} from './metaServerConfig.mjs'
import {deliverVerifiedMetaRegistration} from './metaDeliveryCoordinator.mjs'
import {validMetaTestConfiguration} from './metaCapi.mjs'

export async function runMetaCapiWorker({
  releaseEnabled=false,privacyGateApproved=false,
  repository=null,apiVersion=null,readSecret=()=>undefined,
  fetchImpl=fetch,clock=()=>Date.now(),
  testModeEnabled=false,testEventCode=null,nonProduction=false,
}={}) {
  if (releaseEnabled!==true || privacyGateApproved!==true)
    return {status:'disabled'}
  // Refuse a misconfigured test mode before reading secrets or leasing an event.
  if(!validMetaTestConfiguration({testModeEnabled,testEventCode,nonProduction}))
    return {status:'not_configured'}
  // Missing dataset/secret/version always fails closed BEFORE leasing any
  // verified-registration event, so no work can be lost on misconfiguration.
  const config=resolveMetaServerConfig({
    releaseEnabled,privacyGateApproved,apiVersion,readSecret,
  })
  if (!config) return {status:'not_configured'}
  return deliverVerifiedMetaRegistration({
    releaseEnabled,privacyGateApproved,repository,clock,fetchImpl,
    datasetId:config.datasetId,apiVersion:config.apiVersion,
    serverToken:config.serverToken,
    testModeEnabled,testEventCode,nonProduction,
  })
}

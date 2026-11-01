// PAZO #169 — CAPI Edge worker assembly, provider OFF unless every gate
// is independently released. No account data, secrets or network on import.
// This module only composes an approved server-side reader; it does NOT
// supply or authorize a reader of email hashes / originating User-Agent.
import {createMetaWorkerHandler} from './workerCore.mjs'
import {createMetaWorkerAuthenticator} from './workerAuth.mjs'
import {createMetaOutboxRepository} from '../_shared/metaOutboxRepository.mjs'
import {runMetaCapiWorker} from '../_shared/metaServerGateway.mjs'
import {resolveMetaBackend} from '../_shared/metaSupabaseOrigin.mjs'

export function createMetaWorkerRuntime({
  released=false,privacyReviewed=false,matchFieldsApproved=false,
  providerApproved=false,url=null,isolatedOrigin=null,serviceKey=null,
  readSecret=()=>undefined,authenticate=null,
  readApprovedMatchField=null,apiVersion=null,
  fetchImpl=fetch,clock=()=>Date.now(),cryptoImpl=crypto,
}={}) {
  const gatesOpen=released===true && privacyReviewed===true
    && matchFieldsApproved===true && providerApproved===true
  if(!gatesOpen) return createMetaWorkerHandler()
  // Without a separately reviewed server-side identity reader, fail closed,
  // even when a caller accidentally flips ALL four release switches.
  const backend=resolveMetaBackend({url,isolatedOrigin})
  const repository=backend&&createMetaOutboxRepository({
    enabled:true,privacyApproved:true,matchFieldsApproved:true,
    url,isolatedOrigin,serviceKey,readApprovedMatchField,fetchImpl,
  })
  if(!repository)return createMetaWorkerHandler()
  return createMetaWorkerHandler({
    released:true,privacyReviewed:true,matchFieldsApproved:true,
    providerApproved:true,
    authenticate:authenticate??createMetaWorkerAuthenticator({readSecret,cryptoImpl}),
    run:()=>runMetaCapiWorker({
      releaseEnabled:true,privacyGateApproved:true,repository,
      apiVersion,readSecret,fetchImpl,clock,
      // A dataset secret that does not belong to this backend fails closed.
      expectedDatasetId:backend.datasetId,
      // A live, deployed worker never accepts or generates test event codes.
      testModeEnabled:false,testEventCode:null,nonProduction:false,
    }),
  })
}

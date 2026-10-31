// PAZO #169 — CAPI Edge worker assembly, provider OFF unless every gate
// is independently released. No account data, secrets or network on import.
// This module only composes an approved server-side reader; it does NOT
// supply or authorize a reader of email hashes / originating User-Agent.
import {createMetaWorkerHandler} from './workerCore.mjs'
import {createMetaWorkerAuthenticator} from './workerAuth.mjs'
import {createMetaOutboxRepository} from '../_shared/metaOutboxRepository.mjs'
import {runMetaCapiWorker} from '../_shared/metaServerGateway.mjs'

export function createMetaWorkerRuntime({
  released=false,privacyReviewed=false,matchFieldsApproved=false,
  providerApproved=false,url=null,serviceKey=null,readSecret=()=>undefined,
  readApprovedMatchField=null,apiVersion=null,
  fetchImpl=fetch,clock=()=>Date.now(),cryptoImpl=crypto,
}={}) {
  const gatesOpen=released===true && privacyReviewed===true
    && matchFieldsApproved===true && providerApproved===true
  if(!gatesOpen) return createMetaWorkerHandler()
  // Without a separately reviewed server-side identity reader, fail closed,
  // even when a caller accidentally flips ALL four release switches.
  const repository=createMetaOutboxRepository({
    enabled:true,privacyApproved:true,matchFieldsApproved:true,
    url,serviceKey,readApprovedMatchField,fetchImpl,
  })
  if(!repository)return createMetaWorkerHandler()
  const authenticate=createMetaWorkerAuthenticator({readSecret,cryptoImpl})
  return createMetaWorkerHandler({
    released:true,privacyReviewed:true,matchFieldsApproved:true,
    providerApproved:true,authenticate,
    run:()=>runMetaCapiWorker({
      releaseEnabled:true,privacyGateApproved:true,repository,
      apiVersion,readSecret,fetchImpl,clock,
      // A live, deployed worker never accepts or generates test event codes.
      testModeEnabled:false,testEventCode:null,nonProduction:false,
    }),
  })
}

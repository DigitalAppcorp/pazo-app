// #169 — CAPI worker entrypoint, hardcoded OFF and NOT deployed.
// This file intentionally has NO path to a live Meta sender.
// Before any future change: reviewed migration, approved Meta matching data,
// worker-only authentication, privacy audit, staging and separate PO release GO.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createMetaWorkerHandler} from './workerCore.mjs'

const META_WORKER_ENDPOINT_RELEASED=false
const META_WORKER_PRIVACY_REVIEWED=false
const META_WORKER_MATCH_FIELDS_APPROVED=false
const META_WORKER_PROVIDER_APPROVED=false

// Even if the file were accidentally deployed, all requests return disabled
// without reading environment secrets or touching a provider/DB.
Deno.serve(createMetaWorkerHandler({
  released:META_WORKER_ENDPOINT_RELEASED,
  privacyReviewed:META_WORKER_PRIVACY_REVIEWED,
  matchFieldsApproved:META_WORKER_MATCH_FIELDS_APPROVED,
  providerApproved:META_WORKER_PROVIDER_APPROVED,
}))

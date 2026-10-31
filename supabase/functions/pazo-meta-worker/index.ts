// #169 — CAPI worker entrypoint, hardcoded OFF and NOT deployed.
// This file intentionally has NO path to a live Meta sender.
// Before any future change: reviewed migration, approved Meta matching data,
// worker-only authentication, privacy audit, staging and separate PO release GO.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createMetaWorkerRuntime} from './runtime.mjs'
import {createMetaMatchReader} from '../_shared/metaMatchReader.mjs'

const META_WORKER_ENDPOINT_RELEASED=false
const META_WORKER_PRIVACY_REVIEWED=false
const META_WORKER_MATCH_FIELDS_APPROVED=false
const META_WORKER_PROVIDER_APPROVED=false
// Legal/technical source-of-truth review is independent of provider approval.
const META_WORKER_MATCH_SOURCE_APPROVED=false

// No environment variable is read unless ALL four review flags are released.
// This candidate deliberately has NO approved matching-data reader. Thus
// even flipping all switches cannot trigger a Meta or Supabase request;
// supplying that reader requires separate data-field/privacy approval.
const reviewedRelease=META_WORKER_ENDPOINT_RELEASED
  && META_WORKER_PRIVACY_REVIEWED
  && META_WORKER_MATCH_FIELDS_APPROVED
  && META_WORKER_PROVIDER_APPROVED
const settings=reviewedRelease?{
  released:true,privacyReviewed:true,matchFieldsApproved:true,
  providerApproved:true,
  url:Deno.env.get('SUPABASE_URL'),
  serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  readSecret:(name)=>Deno.env.get(name),
  // Even after the other four switches, no matching data is read until this
  // separate origin/retention/privacy review is approved and published.
  readApprovedMatchField:createMetaMatchReader({
    enabled:META_WORKER_MATCH_SOURCE_APPROVED,
    privacyReviewed:META_WORKER_PRIVACY_REVIEWED,
    sourceApproved:META_WORKER_MATCH_SOURCE_APPROVED,
    url:Deno.env.get('SUPABASE_URL'),
    serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  }),
  apiVersion:'v26.0',
}: {}
Deno.serve(createMetaWorkerRuntime(settings))

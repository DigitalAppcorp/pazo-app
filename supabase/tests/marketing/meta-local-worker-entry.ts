// #169 disposable Supabase CLI Edge runtime harness only.
// Never deploy, import in production, or point this at hosted PAZO.
// This file is copied ONLY into a temporary functions folder by CI, and runs
// the real worker runtime. The provider is an in-memory fake: this file has no
// path to Meta, and any other destination throws.
import {createMetaWorkerRuntime} from '../pazo-meta-worker/runtime.mjs'
import {createMetaMatchReader} from '../_shared/metaMatchReader.mjs'

const API='http://kong:8000'
const DATASET='1090116830295088'
const SYNTHETIC={
 META_WORKER_DISPATCH_SECRET:'synthetic_local_worker_dispatch_secret_0123456789',
 META_DATASET_ID:DATASET,
 META_CAPI_ACCESS_TOKEN:'synthetic_local_capi_token_not_a_real_meta_token',
} as Record<string,string>
const SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const captured:unknown[]=[]
const fetchImpl=async(input:string|URL,init:RequestInit)=>{
 const url=new URL(String(input))
 if(url.origin===API)return fetch(url,init)
 if(url.origin==='https://graph.facebook.com'
   &&url.pathname==='/v26.0/'+DATASET+'/events'){
  const body=JSON.parse(String(init.body))
  captured.push({keys:Object.keys(body).sort(),event:body.data?.[0]})
  return new Response(JSON.stringify({events_received:1}),{status:200,
   headers:{'content-type':'application/json'}})
 }
 throw Error('local_lab_egress_forbidden')
}
const gates={released:true,privacyReviewed:true,matchFieldsApproved:true,
 providerApproved:true}
const worker=createMetaWorkerRuntime({...gates,url:API,isolatedOrigin:API,
 serviceKey:SERVICE,apiVersion:'v26.0',readSecret:(name:string)=>SYNTHETIC[name],
 fetchImpl,
 readApprovedMatchField:createMetaMatchReader({enabled:true,privacyReviewed:true,
  sourceApproved:true,url:API,isolatedOrigin:API,serviceKey:SERVICE,fetchImpl}),
})
Deno.serve((req:Request)=>{
 if(req.method==='GET'&&new URL(req.url).pathname.endsWith('/__captured'))
  return new Response(JSON.stringify(captured),{status:200,
   headers:{'content-type':'application/json'}})
 return worker(req)
})

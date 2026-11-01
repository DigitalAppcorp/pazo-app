// #169: server-only backend allowlist for the Meta worker; NOT deployed.
// Binds each backend to its dataset: production PAZO can only reach PAZO Web,
// and an isolated backend can only reach PAZO QA. Neither can cross over, so a
// staging worker cannot touch production and QA events cannot reach PAZO Web.
const PRODUCTION_ORIGIN='https://mrybvqdebbgcayuvgkkr.supabase.co'
const PRODUCTION_DATASET='1438916858347709'
const QA_DATASET='1090116830295088'
const HOSTED_ORIGIN=/^https:\/\/[a-z0-9]{20}\.supabase\.co$/
const LOCAL_LAB_ORIGIN='http://kong:8000'
const isolatedAllowed=origin=>origin!==PRODUCTION_ORIGIN
  && (origin===LOCAL_LAB_ORIGIN||HOSTED_ORIGIN.test(origin))

// `url` is the platform's own SUPABASE_URL. `isolatedOrigin` must be declared
// separately and match it exactly: an arbitrary URL or a path never passes.
export function resolveMetaBackend({url=null,isolatedOrigin=null}={}) {
  if(typeof url!=='string')return null
  if(isolatedOrigin===null||isolatedOrigin===undefined){
    return url===PRODUCTION_ORIGIN
      ?Object.freeze({origin:url,datasetId:PRODUCTION_DATASET,isolated:false})
      :null
  }
  if(typeof isolatedOrigin!=='string'||url!==isolatedOrigin
    ||!isolatedAllowed(isolatedOrigin))return null
  return Object.freeze({origin:url,datasetId:QA_DATASET,isolated:true})
}

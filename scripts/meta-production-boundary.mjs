// #169: static release boundary for Meta candidate (no network, no secrets).
// CI detects accidental imports or SDK snippets in the current live entrypoints.
// This is a defense-in-depth guard, not a full supply-chain or legal audit.
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

export const ENTRYPOINTS=Object.freeze([
 'index.html',
 'src/main.tsx',
 'src/App.tsx',
 'src/features/marketing/marketingRuntime.ts',
 'supabase/functions/pazo-marketing-attribution/index.ts',
])
export const OFF_FLAGS=Object.freeze({
 'supabase/migrations/20261101120000_pazo_meta_conversions.sql':
  [' enabled boolean NOT NULL DEFAULT false'],
 'src/features/marketing/metaRelease.ts':
  ["  env.VITE_PAZO_META_ENABLED === 'true'",
   "  isMetaEnabled(env) && env.VITE_PAZO_META_PIXEL_ENABLED === 'true'"],
})
const forbidden=[
 /(?:metaConsentRegistrationFlow|metaConsentTransport|metaConsentController|MetaConsentChoice|metaPixelLoader|metaPixel|metaCapi|metaServerGateway|metaOutboxRepository|metaDeliveryCoordinator)/,
 /(?:connect\.facebook\.net|graph\.facebook\.com|facebook\.com\/tr|fbevents\.js)/,
 /\bfbq\s*\(/,
 /pazo-meta-(?:grant|receipt|worker|consent)/,
]
export function verifyMetaProductionBoundary({sources,entrypoints=ENTRYPOINTS,flags=OFF_FLAGS}){
 const faults=[]
 for(const path of entrypoints){
   const data=sources[path]
   if(typeof data!=='string'){faults.push(path+': source unavailable');continue}
   for(const rule of forbidden){
     if(rule.test(data))faults.push(path+': inactive Meta source or SDK exposed ('+rule.source+')')
   }
 }
 for(const [path,expected] of Object.entries(flags)){
   const data=sources[path]
   if(typeof data!=='string'){faults.push(path+': source unavailable');continue}
   const lines=new Set(data.split(/\r?\n/))
   for(const line of expected){
     if(!lines.has(line))faults.push(path+': required release gate not hardcoded OFF: '+line)
   }
 }
 return faults
}
export function readMetaBoundarySources(root='.'){
 const sources={}
 for(const path of [...ENTRYPOINTS,...Object.keys(OFF_FLAGS)])
   sources[path]=readFileSync(resolve(root,path),'utf8')
 return sources
}
// Called from CI; never reads cookies, network, environment or secrets.
const invoked=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)
if(invoked){
 let errors
 try{errors=verifyMetaProductionBoundary({sources:readMetaBoundarySources()})}
 catch{errors=['cannot read required production boundary sources']}
 if(errors.length){
   for(const error of errors)process.stderr.write('META_OFF_BOUNDARY_FAIL '+error+'\n')
   process.exitCode=1
 }else process.stdout.write('META_OFF_BOUNDARY_PASS\n')
}

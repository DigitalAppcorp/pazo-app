// PAZO F16 — pure, offline Sandbox configuration gate. NO HTTP endpoint.
// Never return, print or persist secret VALUES; only public variable NAMES.
// Supabase automatically injects the SUPABASE_* values; do not attempt to
// create custom secrets under that reserved prefix.
const EXPECTED=Object.freeze({
  PAYPAL_ENV:'sandbox',
  PAYPAL_WEBHOOK_ID:'6N7889790V1467139',
  PAYPAL_PLAN_ID:'P-14V25407JP6850922NLHMDKI',
  SUPABASE_URL:'https://mrybvqdebbgcayuvgkkr.supabase.co',
})
const REQUIRED_SECRETS=Object.freeze([
  'PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','SUPABASE_SERVICE_ROLE_KEY',
])
const PRINTABLE=/^[\x21-\x7E]{8,512}$/
export function assessF16SandboxConfig(env){
  const get=typeof env?.get==='function'?(name)=>env.get(name):()=>undefined
  const missing=[],invalid=[]
  for(const [name,expected] of Object.entries(EXPECTED)){
    const value=get(name)
    if(value===undefined || value===null || value==='')missing.push(name)
    else if(value!==expected)invalid.push(name)
  }
  for(const name of REQUIRED_SECRETS){
    const value=get(name)
    if(value===undefined || value===null || value==='')missing.push(name)
    else if(typeof value!=='string'||!PRINTABLE.test(value)||
       (name==='PAYPAL_CLIENT_ID'&&value.includes(':')) ||
       (name==='SUPABASE_SERVICE_ROLE_KEY'&&value.length<24) ||
       (name==='SUPABASE_SERVICE_ROLE_KEY'&&/\s/.test(value))
    )invalid.push(name)
  }
  // Result is safe for diagnostics performed OFFLINE ONLY, not public HTTP.
  return Object.freeze({
    ready:missing.length===0&&invalid.length===0,
    missing:Object.freeze(missing),
    invalid:Object.freeze(invalid),
  })
}

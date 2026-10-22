// F16-P28 historical candidate inventory: offline adapter only.
// Exact event ID, no enumeration, no P21 claims, no merchant traffic or financial writes.
const response=(status,code)=>new Response(JSON.stringify({
 code,environment:'sandbox',reviewOnly:true,mayRecordPayment:false,
 mayGrantBenefits:false,paidThrough:null
}),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}})
const EVENT=/^[A-Za-z0-9._-]{3,128}$/
const REQUEST=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const eq=(a,b)=>{
 if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length||a.length<32)return false
 let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i)
 return diff===0
}
export function createP28HistoricalCandidateInventory({enabled=false,operatorKey,readCandidate}={}){
 return async request=>{
  if(!enabled)return response(503,'historical_review_disabled')
  if(request.method!=='POST')return response(405,'method_not_allowed')
  const bearer=request.headers.get('authorization')
  if(!eq(bearer?.startsWith('Bearer ')?bearer.slice(7):null,operatorKey))
   return response(401,'operator_auth_required')
  if(typeof readCandidate!=='function')return response(503,'candidate_reader_unavailable')
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')
   return response(415,'invalid_content_type')
  let payload
  try{
   const raw=await request.text()
   if(raw.length>256)return response(413,'invalid_body_size')
   payload=JSON.parse(raw)
  }catch{return response(400,'invalid_json')}
  if(!payload||Array.isArray(payload)||
    Object.keys(payload).sort().join(',')!=='eventId,requestId'||
    typeof payload.eventId!=='string'||!EVENT.test(payload.eventId)||
    typeof payload.requestId!=='string'||!REQUEST.test(payload.requestId))
   return response(400,'invalid_reference')
  try{
   const candidate=await readCandidate(Object.freeze({...payload}))
   if(!candidate||candidate.id!==payload.eventId||
     candidate.processingState!=='pending')
    return response(404,'candidate_not_available')
   // Do not return identifiers, owner information, payment information, or timestamps.
   return response(200,'historical_candidate_review_required')
  }catch{return response(503,'candidate_reader_unavailable')}
 }
}

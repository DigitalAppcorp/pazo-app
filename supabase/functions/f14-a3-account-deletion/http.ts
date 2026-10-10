import { runA3DeletionReview, type A3ReviewPort } from './worker.ts'

// Internal-only POST endpoint. Two independent barriers:
// (1) default disabled server environment flag,
// (2) long secret provided only by a trusted back-end caller.
// The gateway must ALSO verify its Supabase JWT; no CORS headers.
export interface A3HttpOptions {
  enabled: boolean
  invokeSecret: string
  makePort: () => A3ReviewPort | Promise<A3ReviewPort>
}

function json(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload),{
    status,
    headers:{'content-type':'application/json','cache-control':'no-store'},
  })
}

async function equalSecret(expected: string, received: string): Promise<boolean> {
  if (expected.length < 32 || received.length < 32 || received.length > 512) return false
  const encoder=new TextEncoder()
  const [a,b]=await Promise.all([
    crypto.subtle.digest('SHA-256',encoder.encode(expected)),
    crypto.subtle.digest('SHA-256',encoder.encode(received)),
  ])
  const x=new Uint8Array(a),y=new Uint8Array(b)
  let different=0
  for(let i=0;i<x.length;i++) different|=x[i]^y[i]
  return different===0
}

async function limitedBody(req:Request,maxBytes=1024):Promise<string|null> {
  const reader=req.body?.getReader()
  if(!reader) return null
  const chunks:Uint8Array[]=[]
  let length=0
  while(true) {
    const {done,value}=await reader.read()
    if(done) break
    length+=value.byteLength
    if(length>maxBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const combined=new Uint8Array(length)
  let offset=0
  for(const chunk of chunks){combined.set(chunk,offset);offset+=chunk.byteLength}
  return new TextDecoder('utf-8',{fatal:true}).decode(combined)
}

export function makeA3InternalReviewHandler(options:A3HttpOptions) {
  return async(req:Request):Promise<Response> => {
    if(!options.enabled || options.invokeSecret.length<32) {
      return json(503,{error:'not_enabled'})
    }
    if(req.method!=='POST') return json(405,{error:'method_not_allowed'})
    try {
      if(!await equalSecret(options.invokeSecret,req.headers.get('x-a3-worker-key')??'')) {
        return json(401,{error:'unauthorized'})
      }
      if(req.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json') {
        return json(415,{error:'unsupported_media_type'})
      }
      const body=await limitedBody(req)
      if(body===null) return json(413,{error:'invalid_body'})
      const input:unknown=JSON.parse(body)
      if(!input || typeof input!=='object' || Array.isArray(input)) return json(400,{error:'invalid_request'})
      const item=input as Record<string,unknown>
      const claim=item.claim
      if(typeof item.jobId!=='string' || !claim || typeof claim!=='object' || Array.isArray(claim)) {
        return json(400,{error:'invalid_request'})
      }
      const lease=claim as Record<string,unknown>
      if(typeof lease.token!=='string' || typeof lease.version!=='number') {
        return json(400,{error:'invalid_request'})
      }
      const port=await options.makePort()
      const result=await runA3DeletionReview(item.jobId,{token:lease.token,version:lease.version},port)
      return json(result.status==='retryable'?503:200,result)
    } catch {
      // Never reflect database exceptions, internal secrets or user records.
      return json(503,{error:'review_unavailable'})
    }
  }
}

// PAZO F16 — bounded best-effort worker-local admission for expensive PayPal checks.
// Fixed budgets are NOT a global IP/rate firewall: Edge isolates are independent.
// Reject with retryable 503 BEFORE OAuth/PayPal verification, never ACK an unpersisted event.
// No IP address, webhook headers, user IDs or payloads are retained in this gate.
export function createF16WorkerAdmissionGate({
  maxInFlight=4, maxPerWindow=60, windowMs=60_000, now=Date.now,
}={}) {
  if(!Number.isSafeInteger(maxInFlight)||maxInFlight<1||
     !Number.isSafeInteger(maxPerWindow)||maxPerWindow<1||
     !Number.isSafeInteger(windowMs)||windowMs<1||typeof now!=='function')
    throw Error('invalid_admission_gate_limits')
  let active=0
  const started=[]
  return Object.freeze({
    tryEnter(){
      const time=now()
      if(!Number.isFinite(time))return null
      while(started.length && time-started[0]>=windowMs)started.shift()
      if(active>=maxInFlight || started.length>=maxPerWindow)return null
      started.push(time)
      active++
      let released=false
      return ()=>{
        if(released)return
        released=true
        active--
      }
    },
  })
}
// One singleton per Edge isolate, NOT one limiter per incoming request.
// The receiver is currently assembled inside Deno.serve for each request.
export const f16WorkerAdmissionGate=createF16WorkerAdmissionGate()

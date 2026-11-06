// Sends at most one Auth-managed signup confirmation resend per queued account.
// The email is fetched just in time from Auth and is never stored or returned.
export function createConfirmationReminderWorker({rpc,sendResend}){
  return async request=>{
    if(request.method!=='POST')return new Response(null,{status:405})
    const token=(request.headers.get('authorization')??'').replace(/^Bearer /,'')
    if(!/^[a-f0-9]{64}$/.test(token))return new Response(null,{status:401})
    if(await rpc('pazo_auth_confirmation_reminder_admit',{p_token:token})!==true)
      return new Response(null,{status:401})

    const leased=await rpc('pazo_auth_confirmation_reminder_lease',{p_limit:5})
    if(!Array.isArray(leased))return new Response(null,{status:503})
    const results=[]
    for(const item of leased){
      if(!item||typeof item.user_id!=='string'||typeof item.email!=='string'||!item.email.trim()){
        if(typeof item?.user_id==='string')results.push({user_id:item.user_id,outcome:'rejected'})
        continue
      }
      let outcome='unknown'
      try{
        const result=await sendResend(item.email)
        outcome=result===true?'accepted':result===false?'rejected':'unknown'
      }catch{
        // A network timeout may happen after Auth accepted the request. Never retry it.
        outcome='unknown'
      }
      results.push({user_id:item.user_id,outcome})
    }
    if(results.length)await rpc('pazo_auth_confirmation_reminder_report',{p_results:results})
    return new Response(JSON.stringify({processed:results.length}),{
      status:200,headers:{'content-type':'application/json'},
    })
  }
}

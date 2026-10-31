// PAZO first-party aggregate landing signal. NEVER claim unique visitors.
// CODE ONLY / RELEASE OFF. No cookies, persistent client identifiers,
// personal fields or logging. Client origin is NOT an authentication proof.
import {readMarketingBody} from '../pazo-marketing-attribution/requestBody.mjs'
import {validCampaignPair} from '../_shared/marketingCampaign.mjs'
const OFF={status:'collection_disabled'}
const FAIL={status:'not_accepted'}
const keys=new Set(['utm_source','utm_medium','utm_campaign','utm_content'])
const json=(body,status,extra={})=>new Response(JSON.stringify(body),{
  status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra},
})
export function createMarketingLandingHandler({
  released=false,
  submit=null,
  submitPrereg=null,
  preregReleased=false,
  experienceReleased=false,
  submitExperience=null,
  verifyChallenge=null,
  origin='https://pazo-app.vercel.app',
}={}){
  return async(request)=>{
    if(!released||typeof submit!=='function'||typeof verifyChallenge!=='function')return json(OFF,503)
    // Basic cross-origin restriction only; scripts can forge Origin.
    if(request.headers.get('origin')!==origin)return json(FAIL,403)
    const cors={'access-control-allow-origin':origin,'vary':'Origin'}
    if(request.method==='OPTIONS')return new Response(null,{
      status:204,headers:{...cors,'access-control-allow-methods':'POST, OPTIONS',
        'access-control-allow-headers':'content-type,authorization,apikey,x-client-info,x-pazo-challenge',
        'access-control-max-age':'300'},
    })
    if(request.method!=='POST')return json(FAIL,405,cors)
    if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers.get('content-type')||''))
      return json(FAIL,415,cors)
    let raw=''
    try {
      raw=await readMarketingBody(request,320)
    }catch(error){return json(FAIL,[408,413].includes(error?.status)?error.status:400,cors)}
    let data
    try{data=JSON.parse(raw)}catch{return json(FAIL,400,cors)}
    const experience=data&&typeof data==='object'&&!Array.isArray(data)&&Object.hasOwn(data,'experience')
    if(experience){
      if(!experienceReleased||typeof submitExperience!=='function')return json(OFF,503,cors)
      if(Object.keys(data).length!==1||!['welcome','login_open','login_attempt','login_error','reset_attempt','reset_error','demo_enter','demo_home','demo_pet','demo_communities','demo_places','demo_explore','demo_action','demo_signup','demo_exit','signup_cta','signup_start','signup_requested','signup_error'].includes(data.experience)||request.headers.get('sec-gpc')==='1')return json(FAIL,400,cors)
    }else if(!data||typeof data!=='object'||Array.isArray(data)
      ||Object.keys(data).length!==keys.size+(data.step===undefined?0:1)
      ||Object.keys(data).some(k=>!keys.has(k)&&k!=='step')
      ||data.utm_source!=='meta'||data.utm_medium!=='paid_social'
      ||!validCampaignPair(data.utm_campaign,data.utm_content))
      return json(FAIL,400,cors)
    if(data.step!==undefined&&(!preregReleased||typeof submitPrereg!=='function'))return json(OFF,503,cors)
    if(data.step!==undefined&&!['signup_cta','signup_start','signup_requested','signup_error'].includes(data.step))return json(FAIL,400,cors)
    // Origin and UTM cannot prove a human. Provider validates a short-lived,
    // single-use token against our exact hostname/action before ANY DB budget.
    try{if(await verifyChallenge(request.headers.get('x-pazo-challenge'))!==true)return json(FAIL,403,cors)}
    catch{return json(FAIL,503,cors)}
    // Only the allowlisted creative reaches the privileged aggregate RPC.
    try {
      const accepted=experience?await submitExperience(data.experience):data.step===undefined?await submit(data.utm_content):await submitPrereg(data.utm_content,data.step)
      return json({status:accepted===true?'aggregated':'not_accepted'},accepted===true?202:409,cors)
    }catch{return json(FAIL,503,cors)}
  }
}

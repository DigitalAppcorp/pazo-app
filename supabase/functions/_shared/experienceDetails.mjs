// Closed vocabulary shared by browser and Edge. Mirrors marketing_private.experience_detail_valid.
export const EXPERIENCE_DETAILS={
 signup_failure:['missing_fields','age_required','password_mismatch','weak_password','email_taken','invalid_email','rate_limited','network','google_age','google_cancelled','google_failed','other'],
 demo_last_screen:['home','pet','communities','places','explore'],
 arrival_source:['search','social','direct','installed','other'],
}
export const validExperienceDetail=(kind,value)=>Object.hasOwn(EXPERIENCE_DETAILS,kind)&&EXPERIENCE_DETAILS[kind].includes(value)
const search=/(^|\.)(google|bing|duckduckgo|yahoo|ecosia|baidu|yandex|brave)\.[a-z.]+$/i
const social=/(^|\.)(facebook|instagram|tiktok|threads|whatsapp|twitter|reddit|youtube|pinterest|linkedin|snapchat|telegram)\.[a-z.]+$|^(t\.co|x\.com|fb\.me|wa\.me)$/i
/** Category only; the referrer is discarded here and never sent. Null means a move inside PAZO. */
export function classifyArrival(referrer,ownHost,standalone=false){
 if(standalone)return 'installed'
 if(!referrer)return 'direct'
 let host
 try{host=new URL(referrer).hostname}catch{return 'other'}
 if(host===ownHost)return null
 return search.test(host)?'search':social.test(host)?'social':'other'
}
export function signupFailureFromCode(code){
 if(code==='email_exists'||code==='user_already_exists')return 'email_taken'
 if(code==='weak_password')return 'weak_password'
 if(code==='email_address_invalid'||code==='validation_failed')return 'invalid_email'
 if(typeof code==='string'&&code.startsWith('over_'))return 'rate_limited'
 return 'other'
}

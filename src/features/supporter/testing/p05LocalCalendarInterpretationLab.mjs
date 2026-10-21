// PAZO F16-P05 — OFFLINE date interpretation, not PayPal cycle evidence.
// Identical local day-of-month can be masked by UTC date and DST changes.
// This classifies a hypothesis only; no seller timezone is provider-attested.
const ZONE='America/Los_Angeles'
const ISO=/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z$/
const shape=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join('|')===keys.slice().sort().join('|')
const valid=s=>typeof s==='string'&&ISO.test(s)&&Number.isFinite(Date.parse(s))&&
 (new Date(Date.parse(s)).toISOString()===s||
  new Date(Date.parse(s)).toISOString().replace(/\.000Z$/,'Z')===s)
const parts=(date,zone)=>Object.fromEntries(new Intl.DateTimeFormat('en-US',{
 timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',
 hour:'2-digit',minute:'2-digit',hourCycle:'h23',
 }).formatToParts(date).filter(p=>p.type!=='literal')
 .map(p=>[p.type,Number(p.value)]))
const isoParts=d=>({
 year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate(),
 hour:d.getUTCHours(),minute:d.getUTCMinutes(),
})
const nextMonth=(a,b)=>{
 const month=a.month===12?1:a.month+1
 const year=a.month===12?a.year+1:a.year
 return b.year===year&&b.month===month
}
const base=Object.freeze({
 environment:'sandbox',step:'p05_local_calendar_date_interpretation_lab',
 cycleVerified:false,cycleAttributionConfirmed:false,
 periodStart:null,periodEnd:null,paidThrough:null,
 mayCreatePaidPeriod:false,mayRecordPayment:false,mayGrantBenefits:false,
 mayCountCommemorativeMonth:false,financialHistoryComplete:false,
 dbWrites:0,networkPaymentWrites:0,
 providerTimeZoneVerified:false,saleToCycleVerified:false,
})
const deny=(reason)=>Object.freeze({...base,phase:'INCONCLUSIVE',reason})
export function assessP05LocalCalendarInterpretation(input={}){
 const expected=['subscriptionStartUtc','saleCompletedUtc','activationUtc',
  'observedNextBillingUtc','sourceSubscriptionCreateSetStartTime']
 if(!shape(input,expected)||!valid(input.subscriptionStartUtc)||
  !valid(input.saleCompletedUtc)||!valid(input.activationUtc)||
  !valid(input.observedNextBillingUtc)||
  typeof input.sourceSubscriptionCreateSetStartTime!=='boolean')
  return deny('missing_or_invalid_observations')
 const start=new Date(input.subscriptionStartUtc),sale=new Date(input.saleCompletedUtc)
 const active=new Date(input.activationUtc),next=new Date(input.observedNextBillingUtc)
 if(+sale<+start||+active<+sale||+next<=+active)
  return deny('event_order_inconsistent')
 const a=parts(start,ZONE),b=parts(next,ZONE)
 const au=isoParts(start),bu=isoParts(next)
 const sameCalendarDayFollowingMonth=nextMonth(a,b)&&a.day===b.day
 const utcSameCalendarDayFollowingMonth=nextMonth(au,bu)&&au.day===bu.day
 // DST shift inferred only from offset changes in the same named zone.
 const zoneOffset=(d,p)=>Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute)-
  (Math.floor(d.getTime()/60000)*60000)
 return Object.freeze({...base,
  phase:'DATE_PATTERN_CANDIDATE_ONLY',
  reason:'local_calendar_pattern_is_not_paypal_billing_anchor_attestation',
  observerZone:ZONE,
  sourceSubscriptionCreateSetStartTime:input.sourceSubscriptionCreateSetStartTime,
  localFollowingMonthSameDay:sameCalendarDayFollowingMonth,
  utcFollowingMonthSameDay:utcSameCalendarDayFollowingMonth,
  localClockTimeMatches:a.hour===b.hour&&a.minute===b.minute,
  timezoneOffsetChanged:zoneOffset(start,a)!==zoneOffset(next,b),
  independentProviderBillingAnchorStillRequired:true,
  merchantAllocationEvidenceStillRequired:true,
 })
}

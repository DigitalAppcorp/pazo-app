// PAZO F16 MVP — trusted server-only presentation projection for four APPROVED
// perks. Not a PayPal verification engine or a replacement for P05/P21/P42.
// Call only AFTER independent merchant evidence has been reconciled with
// authenticated owner, immutable terms, real completed payment, refunds and
// disputes. Never import into the client or call with browser-provided proofs.
export const SUPPORTER_THEME_IDS = Object.freeze([
  'classic','nature','hearts','stars','adventure'
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RECEIPT = /^[A-Za-z0-9_-]{6,180}$/;
const dateValue = value => {
  if(typeof value!=='string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value)) return NaN;
  return Date.parse(value);
};
const blocked = () => ({
  state:'UNVERIFIED',active:false,paidThrough:null,
  profileBadge:false,postAvatarBadge:false,
  themesEnabled:false,themeIds:[],
  milestones:[],highestMilestone:0,wallPetIds:[],
});
export function projectVerifiedSupporterBenefits(input) {
  const result=blocked();
  if(!input || input.trustBoundary!=='SERVER_RECONCILED_FINANCIAL_PROOF' ||
     input.ownerAuthenticated!==true || input.readFromVerifiedLedger!==true ||
     !UUID.test(input.ownerId||'') || !Array.isArray(input.cycles) ||
     input.cycles.length>250 || !Array.isArray(input.wallConsents) ||
     input.wallConsents.length>100) return result;
  const now=dateValue(input.now);
  if(!Number.isFinite(now)) return result;

  // Cycle state MUST come from server merchant reconciliation, not from a
  // SUBSCRIPTION.ACTIVATED event, redirect, next_billing_time or local clock.
  const cycleIds=new Set(),saleIds=new Set(),verified=[];
  for(const c of input.cycles) {
    if(!c || typeof c!=='object' || !RECEIPT.test(c.cycleId||'') ||
       !RECEIPT.test(c.saleId||'') ||
       cycleIds.has(c.cycleId) || saleIds.has(c.saleId) ||
       c.ownerId!==input.ownerId ||
       c.ownerBindingVerified!==true || c.merchantSaleVerified!==true ||
       c.regularChargeVerified!==true ||
       c.currency!=='USD' || c.amountMinor!==299 ||
       !['CLEARED','REFUNDED','PARTIAL_REVIEW','DISPUTED','FAILED'].includes(c.financialState))
       return blocked();
    const from=dateValue(c.serviceStartsAt),to=dateValue(c.serviceEndsAt);
    if(!Number.isFinite(from) || !Number.isFinite(to) ||
       from>=to || to-from>32*86400000) return blocked();
    cycleIds.add(c.cycleId);saleIds.add(c.saleId);
    if(c.financialState==='CLEARED')verified.push({...c,from,to});
  }
  verified.sort((a,b)=>a.from-b.from);
  for(let i=1;i<verified.length;i++) {
    if(verified[i].from<verified[i-1].to) return blocked();
  }
  // No free 30-day extrapolation; a cancelled subscription retains an
  // independently proven paid period but never extends it by itself.
  const current=verified.find(c=>c.from<=now && now<c.to);
  const maturedCycles=verified.filter(c=>c.from<=now).length;
  const milestones=[3,6,12].filter(n=>maturedCycles>=n);
  result.state='SERVER_VERIFIED';
  result.active=Boolean(current);
  result.paidThrough=current ? new Date(current.to).toISOString() : null;
  result.profileBadge=result.active;
  result.postAvatarBadge=result.active;
  result.themesEnabled=result.active;
  result.themeIds=result.active ? [...SUPPORTER_THEME_IDS] : [];
  result.milestones=result.active ? milestones : [];
  result.highestMilestone=result.active && milestones.length ? milestones[milestones.length-1] : 0;
  // Public wall requires paid entitlement AND a separate affirmative
  // persisted consent linked to the SAME owner/pet. No opt-in by default.
  if(result.active) {
    const seen=new Set();
    for(const row of input.wallConsents){
      if(!row || !UUID.test(row.petId||'') || row.ownerId!==input.ownerId ||
         typeof row.optedIn!=='boolean' || seen.has(row.petId)) return blocked();
      seen.add(row.petId);
      if(row.optedIn===true) result.wallPetIds.push(row.petId);
    }
  }
  return result;
}

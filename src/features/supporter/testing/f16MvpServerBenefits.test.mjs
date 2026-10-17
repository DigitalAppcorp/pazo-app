import test from 'node:test';
import assert from 'node:assert/strict';
import { projectVerifiedSupporterBenefits, SUPPORTER_THEME_IDS } from '../../../../supabase/functions/f16-paypal-webhook/pazoSupporterBenefitsV1.mjs';

const owner='11111111-1111-4111-8111-111111111111';
const pet='22222222-2222-4222-8222-222222222222';
const starts='2026-10-01T00:00:00Z', ends='2026-11-01T00:00:00Z';
const cycle=(overrides={})=>({
  cycleId:'cycle-001',saleId:'sale-001',ownerId:owner,
  ownerBindingVerified:true,merchantSaleVerified:true,regularChargeVerified:true,
  currency:'USD',amountMinor:299,financialState:'CLEARED',
  serviceStartsAt:starts,serviceEndsAt:ends,...overrides,
});
const input=(overrides={})=>({
  trustBoundary:'SERVER_RECONCILED_FINANCIAL_PROOF',
  ownerAuthenticated:true,readFromVerifiedLedger:true,ownerId:owner,
  now:'2026-10-18T00:00:00Z',
  cycles:[cycle()],wallConsents:[],...overrides,
});
const inactive=r=>r.active===false && r.profileBadge===false &&
  r.postAvatarBadge===false && r.themesEnabled===false && r.wallPetIds.length===0;
test('F16 MVP: paid cycle + owner proof activates badges and five approved profile themes',()=>{
  const p=projectVerifiedSupporterBenefits(input());
  assert.equal(p.state,'SERVER_VERIFIED');
  assert.equal(p.active,true);
  assert.equal(p.profileBadge,true);
  assert.equal(p.postAvatarBadge,true);
  assert.equal(p.paidThrough,'2026-11-01T00:00:00.000Z');
  assert.deepEqual(p.themeIds,[...SUPPORTER_THEME_IDS]);
  assert.equal(p.milestones.length,0);
  assert.deepEqual(p.wallPetIds,[]);
});
test('F16 MVP: cancelled PayPal status alone does not revoke paid coverage',()=>{
  const p=projectVerifiedSupporterBenefits(input({providerSubscriptionStatus:'CANCELLED'}));
  assert.equal(p.active,true);
  assert.equal(p.paidThrough,'2026-11-01T00:00:00.000Z');
});
test('F16 MVP: expiration removes visual benefits without guessed 30 days',()=>{
  const p=projectVerifiedSupporterBenefits(input({now:ends}));
  assert.ok(inactive(p));assert.equal(p.paidThrough,null);
});
test('F16 MVP: browser, unauthenticated, unverified ledger are permanently blocked',()=>{
  for(const overrides of [{trustBoundary:'BROWSER'},{ownerAuthenticated:false},
    {readFromVerifiedLedger:false},{ownerId:'fake'},{cycles:[cycle({ownerId:pet})]},
    {cycles:[cycle({merchantSaleVerified:false})]}, {cycles:[cycle({amountMinor:199})]},
    {cycles:[cycle({currency:'EUR'})]}, {cycles:[cycle({regularChargeVerified:false})]}]){
    assert.equal(projectVerifiedSupporterBenefits(input(overrides)).state,'UNVERIFIED');
  }
});
test('F16 MVP: refund, partial-review, dispute and failed charge do not grant benefits',()=>{
  for(const financialState of ['REFUNDED','PARTIAL_REVIEW','DISPUTED','FAILED']){
    assert.ok(inactive(projectVerifiedSupporterBenefits(
      input({cycles:[cycle({financialState})]}))));
  }
});
test('F16 MVP: duplicate cycles, sale reuse and overlapping paid intervals fail closed',()=>{
  for(const cycles of [
    [cycle(),cycle()],
    [cycle(),cycle({cycleId:'cycle-002'})],
    [cycle(),cycle({cycleId:'cycle-002',saleId:'sale-002',
      serviceStartsAt:'2026-10-31T00:00:00Z',serviceEndsAt:'2026-11-30T00:00:00Z'})],
  ]) assert.equal(projectVerifiedSupporterBenefits(input({cycles})).state,'UNVERIFIED');
});
test('F16 MVP: only opt-in for current owned pets shows on wall',()=>{
  assert.deepEqual(projectVerifiedSupporterBenefits(input({wallConsents:[{
    petId:pet,ownerId:owner,optedIn:true,
  }]})).wallPetIds,[pet]);
  assert.deepEqual(projectVerifiedSupporterBenefits(input({wallConsents:[{
    petId:pet,ownerId:owner,optedIn:false,
  }]})).wallPetIds,[]);
  assert.equal(projectVerifiedSupporterBenefits(input({wallConsents:[{
    petId:pet,ownerId:pet,optedIn:true,
  }]})).state,'UNVERIFIED');
});
test('F16 MVP: invalid windows and duplicate consent fail closed',()=>{
  for(const v of [
    input({cycles:[cycle({serviceEndsAt:starts})]}),
    input({cycles:[cycle({serviceStartsAt:'2026-08-01T00:00:00Z'})]}),
    input({wallConsents:[{petId:pet,ownerId:owner,optedIn:true},{petId:pet,ownerId:owner,optedIn:true}]}),
  ])assert.equal(projectVerifiedSupporterBenefits(v).state,'UNVERIFIED');
});
test('F16 MVP: milestone thresholds count unique verified paid cycles only',()=>{
  const cycles=Array.from({length:12},(_,i)=>{
    const a=new Date(Date.UTC(2026,0+i,1)).toISOString().replace('.000Z','Z');
    const b=new Date(Date.UTC(2026,1+i,1)).toISOString().replace('.000Z','Z');
    return cycle({cycleId:'cycle-'+String(i).padStart(3,'0'),saleId:'sale-'+String(i).padStart(3,'0'),
      serviceStartsAt:a,serviceEndsAt:b});
  });
  const p=projectVerifiedSupporterBenefits(input({cycles,now:'2026-12-18T00:00:00Z'}));
  assert.deepEqual(p.milestones,[3,6,12]);assert.equal(p.highestMilestone,12);
  const p2=projectVerifiedSupporterBenefits(input({cycles:cycles.slice(0,5),now:'2026-04-18T00:00:00Z'}));
  assert.deepEqual(p2.milestones,[3]);assert.equal(p2.highestMilestone,3);
  const p3=projectVerifiedSupporterBenefits(input({cycles:[...cycles.slice(0,2),
    {...cycles[2],financialState:'REFUNDED'}],now:'2026-02-18T00:00:00Z'}));
  assert.deepEqual(p3.milestones,[]);
});

test('F16 MVP: future prepaid months must not count as elapsed support',()=>{
  const p=projectVerifiedSupporterBenefits(input({cycles:[
    cycle(),cycle({cycleId:'cycle-002',saleId:'sale-002',serviceStartsAt:'2026-11-01T00:00:00Z',serviceEndsAt:'2026-12-01T00:00:00Z'}),
    cycle({cycleId:'cycle-003',saleId:'sale-003',serviceStartsAt:'2026-12-01T00:00:00Z',serviceEndsAt:'2027-01-01T00:00:00Z'}),
  ],now:'2026-10-18T00:00:00Z'}));
  assert.equal(p.active,true);
  assert.deepEqual(p.milestones,[]);
});

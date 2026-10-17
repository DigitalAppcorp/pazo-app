// PAZO F16 MVP: strict, PURE verification of a PayPal LIVE plan returned by
// authenticated Merchant GET /v1/billing/plans/{id}. No network, no secret,
// no checkout, no attempt to create a plan, and no benefit authorization.
// This only checks product pricing/terms; independent merchant identity,
// tax/legal approval, subscription ownership and actual completed sales
// are separate mandatory gates before public Live checkout.
const PLAN=/^P-[A-Z0-9]{12,40}$/;
const blocked=(reason)=>Object.freeze({
  ready:false,reason,mayCheckout:false,mayGrantBenefits:false,
  planId:null,priceMinor:null,currency:null,cadence:null
});
export function validatePazoPaypalLiveMonthlyPlan(plan,expectedPlanId){
  if(typeof expectedPlanId!=='string'||!PLAN.test(expectedPlanId))
    return blocked('approved_live_plan_id_missing');
  if(!plan || typeof plan!=='object'||Array.isArray(plan) ||
     plan.id!==expectedPlanId || plan.status!=='ACTIVE')
    return blocked('merchant_active_live_plan_mismatch');
  if(!Array.isArray(plan.billing_cycles)||plan.billing_cycles.length!==1)
    return blocked('trial_or_unapproved_billing_cycles');
  const cycle=plan.billing_cycles[0];
  if(!cycle||cycle.tenure_type!=='REGULAR'||cycle.sequence!==1||
     cycle.total_cycles!==0 ||
     cycle.frequency?.interval_unit!=='MONTH'||
     cycle.frequency?.interval_count!==1)
    return blocked('not_one_indefinite_monthly_cycle');
  if(cycle.pricing_scheme?.fixed_price?.currency_code!=='USD'||
     cycle.pricing_scheme?.fixed_price?.value!=='2.99'||
     cycle.pricing_scheme?.tiers!==undefined)
    return blocked('wrong_price_currency_or_variable_pricing');
  const preferences=plan.payment_preferences;
  if(!preferences||typeof preferences!=='object'||
     (preferences.setup_fee &&
       (preferences.setup_fee.currency_code!=='USD'||
        preferences.setup_fee.value!=='0.00'))||
     preferences.auto_bill_outstanding===true)
    return blocked('setup_fee_or_outstanding_bill');
  if(plan.quantity_supported===true || plan.tax_percentage!==undefined ||
     (plan.taxes && (Number(plan.taxes.percentage||0)!==0 ||
      plan.taxes.inclusive===true)))
    return blocked('tax_or_quantity_terms_need_review');
  return Object.freeze({
    ready:true,reason:'live_monthly_plan_shape_verified_offline_only',
    mayCheckout:false,mayGrantBenefits:false,
    planId:expectedPlanId,priceMinor:299,currency:'USD',cadence:'MONTH_1'
  });
}

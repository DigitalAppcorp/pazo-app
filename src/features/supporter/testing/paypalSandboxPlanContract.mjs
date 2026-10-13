// Pure, offline PAZO F16 contract check for a PREEXISTING PayPal Sandbox plan.
// This never calls PayPal or grants membership.
export const PAZO_SANDBOX_PLAN_ID = 'P-14V25407JP6850922NLHMDKI'
function cents(value) {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/.test(value)) return null
  const [whole, fractional=''] = value.split('.')
  return Number(whole)*100 + Number(fractional.padEnd(2,'0'))
}
export function assessPazoSandboxPlan(plan) {
  const issues=[]
  const warnings=[]
  if (!plan || typeof plan !== 'object' || Array.isArray(plan))
    return {ok:false,issues:['invalid_response'],warnings,summary:null}
  if (plan.id !== PAZO_SANDBOX_PLAN_ID) issues.push('plan_id_mismatch')
  if (plan.status !== 'ACTIVE') issues.push('plan_not_active')
  const cycles=Array.isArray(plan.billing_cycles) ? plan.billing_cycles : []
  const regular=cycles.filter(c=>c?.tenure_type==='REGULAR')
  if (regular.length!==1 || cycles.length!==1) issues.push('unexpected_billing_cycles_or_trial')
  const cycle=regular[0]
  if (cycle?.frequency?.interval_unit!=='MONTH' || Number(cycle?.frequency?.interval_count)!==1)
    issues.push('not_monthly')
  if (Number(cycle?.total_cycles)!==0) issues.push('finite_billing_cycles')
  const price=cycle?.pricing_scheme?.fixed_price
  if (price?.currency_code!=='USD' || cents(price?.value)!==299) issues.push('price_not_usd_2_99')
  const setup=plan.payment_preferences?.setup_fee
  if (setup && (setup.currency_code!=='USD'||cents(setup.value)!==0))
    issues.push('nonzero_or_unknown_setup_fee')
  if (plan.quantity_supported===true) warnings.push('quantity_supported_review')
  if (plan.taxes && Number(plan.taxes.percentage)>0) warnings.push('tax_configuration_review')
  // Only project-approved fields; never reflect merchant or purchaser details.
  return {ok:issues.length===0,issues,warnings,summary:{
    id:plan.id===PAZO_SANDBOX_PLAN_ID?PAZO_SANDBOX_PLAN_ID:'mismatch',
    status:plan.status==='ACTIVE'?'ACTIVE':'not_active',
    currency:price?.currency_code==='USD'?'USD':'other',
    amount:price?.currency_code==='USD' && cents(price?.value)===299?'2.99':'mismatch',
    cadence:cycle?.frequency?.interval_unit==='MONTH'&&Number(cycle?.frequency?.interval_count)===1?'MONTH/1':'other',
  }}
}

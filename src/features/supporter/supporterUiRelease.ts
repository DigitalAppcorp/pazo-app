// F16 UI release policy. A local Vite Sandbox QA screen can display real,
// server-verified benefits without publishing the membership program in Live.
// This changes PRESENTATION only: paid entitlements always come from Supabase.
// The build flag is never an alternative to owner/period/hold verification.
export const supporterSandboxUi = import.meta.env.DEV &&
  import.meta.env.VITE_PAZO_F16_SANDBOX_QA_UI === 'true' &&
  typeof window !== 'undefined' &&
  ['localhost','127.0.0.1'].includes(window.location.hostname)

// L1 is active: an absent Vercel build flag must not hide already verified
// paid or admin-granted benefits. An explicit 'false' remains an emergency
// presentation-only override; RPC checks remain the exclusive authority.
export const supporterBenefitsUiEnabled =
  import.meta.env.VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED !== 'false' ||
  supporterSandboxUi

// No owner, payment reference, personal data or entitlement is sent in the event.
// Every listener must re-read current server-authoritative membership state.
export const SUPPORTER_PAYMENT_VERIFIED_EVENT = 'pazo:supporter-payment-verified'

# PAZO F18 — Kitty preflight owns Live readiness (2026-10-25)

## Product rule / acceptance

The animated kitten-with-yarn screen is the single user-visible **preparation state** for **Amigo de PAZO**.

For any inactive account, or a complimentary account choosing to support voluntarily, **do not reveal the offer card until all required READ-only server checks are completed**:

1. Auth/membership entitlement verification (verified coverage or no current coverage).
2. Account-owner attempt list (do not offer a second subscription when an older approval is pending/bound).
3. Authenticated PayPal Live GET readiness and published immutable offer/consent copy in the selected ES/EN language, including whether **this** account is admitted and the financial worker is healthy.

These checks can execute concurrently or as necessary for dependency ordering. The card must be **first painted with the correct path fully resolved**:
- New eligible buyer: card, correct price/terms, consent checkbox, **Continuar con PayPal** already in the render.
- Prior pending/bound request: **continue/reconcile the original attempt**, no second CREATE.
- Verified paid user: benefits home/management, never an unverified checkout.
- Server unavailable, blocked, or malformed offer: **remain on kitten failure state with Retry/Exit**. Never reveal a half-populated payment screen.
- Changing Auth user, selected language, or explicitly retrying a failed preflight: restart kitten and invalidate the old result. Stale response cannot unlock another owner's offer.
- Background `pazo_supporter_status` hydration, window focus or other incidental reads must **not** trigger PayPal GET on a card that is already visible. Server checks for actual POST remain authoritative.

**Exception:** the real PayPal `POST /subscribe` after the user's explicit, informed click still needs an async "Conectando con PayPal…" state and can redirect to PayPal. It cannot run during kitten preflight: it may create a subscription and needs affirmative consent. Timeout/ambiguous result MUST remain in review, with no automatic second CREATE.

## Root cause identified and corrected

The previous `SupporterAccountManagement.preparationPending` included membership, account list and Sandbox terms only, while `SupporterLiveCheckoutPanel` independently sent the Live GET **after** the card appeared. `availabilityRevision` bound that Live GET to background status-hydration, potentially retriggering it post-paint. Static comments claimed the Live GET was inside kitten, but the actual boolean gate did not include it.

Fix PR #110 makes Live readiness a language/account/retry-scoped parent preflight dependency and removes the unrelated `availabilityRevision` coupling. Existing PayPal operations, signed webhooks, ledger, membership and promotional logic remain unchanged.

## Tests

- Real React parent + real Live checkout child with delayed GET: kitten present, card hidden, no CREATE; after verified GET, show the card already containing PayPal CTA.
- New language: old-language offer cannot flash while refreshed immutable terms are unverified.
- Server 403: kitten failure/retry, no partial card, retry GET only.
- Regression and browser workflows must remain PASS.

## Deployment rule

Frontend-only change. Do not modify SQL, PayPal credentials, Edge, financial records or opening flags for this UX fix. Release to the **official** Vercel project `pazo-app` (not legacy `pazo-app-t83r`) only after green CI; verify official alias commit and production HTTP health.


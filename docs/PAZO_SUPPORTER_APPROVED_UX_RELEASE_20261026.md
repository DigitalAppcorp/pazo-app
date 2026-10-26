# Amigo de PAZO — approved UX integration and frontend release

## Authority and scope

On26October2026 the PO approved the full Amigo de PAZO proposal04, including the final instruction to move its existing My Pet entry below all other utilities. The PO then explicitly requested production publication, preserving the application’s working logic and changing only what is necessary. This release includes the previously approved Communities integration f12b61bb / PR123 and the supporter UI below. The production base observed before release was main5036f6d7 / Vercel dpl_2R6ZGFrwfF1ShPHDMuWbC1Ybwrcb.

This is a frontend release. It does not activate invitations/checkouts, change commercial eligibility, run migrations, deploy Edge functions, create/cancel a provider subscription or assert a real payment. The user-visible price remains USD2.99/month, voluntary, with PAZO free and the exact published consent contract supplied by the existing server.

## Implementation

- PetView retains its complete working context and all utility actions. Its single SupporterProfileEntry is now last, including after the lost-pet action. Verified, inactive, checking and unavailable server states have distinct, honest presentations. No local payment flag is introduced.
- SupporterInvitationPrompt retains its existing coordinator, impression reporting, free exit, opt-out callback, Escape and focus lifecycle. Its artwork and copy use the approved login corgi art direction.
- SupporterApprovedOffer separates invitation, explanation and consent with opaque directional liquid motion. The original SupporterLiveCheckoutPanel stays mounted to preserve preflight/readiness, exact server terms, unchecked consent, single-use request and existing PayPal validation. No payment starts by navigating to a screen. An existing original request displays recovery rather than a new subscription offer.
- SupporterApprovedBenefits is reachable through the existing verified membership branch. It uses the original theme picker/save, per-pet wall consent and financial management callbacks. Courtesy remains distinct from paid support. The illustrated thank-you requires both verified membership and independent server paid status after a PayPal return; the route alone grants nothing. Account routes without a selected pet remain usable.
- Subscription management/status/recovery/download/cancellation handlers remain unchanged. Management details are initially collapsed from an unpaid pending screen, and expanded when deliberately reached from benefits. Provider uncertainty is never labeled confirmation.
- The existing notification inbox and its navigation are untouched. Original backgrounds, Supabase client, eligibility, RPCs, financial endpoints, certificates and financial state remain authoritative. Sandbox retains its established QA presentation through the existing components.
- SupporterMotion reuses the approved460ms/cubic-bezier(.22,1.26,.36,1) opaque full-screen direction. Reduced-motion cancels both navigation and environmental water/leaves. No animation dependency was added.

## Artwork provenance

Three project-local PNGs in public/supporter/art/ were generated with the built-in imagegen using the actual approved login corgi reference, with original alpha preserved. Garden, gratitude and four benefit scenes match the final approved proposal. No official logo, badge or background is replaced. No new asset generator or dependency is introduced into the product.

## Verification before release

- TypeScript/Vite build PASS; existing large app-chunk warning retained.
- Governance PASS; closure component suite521/521 includes ES/EN verified/inactive/unknown entry safeguards.
- Supporter synthetic suite1196/1196 PASS. Superseded static UI assertions were updated for the approved entry/composition; signed consent, single-use checkout, release guards and financial assertions remain. OpenSSL was added only to the current test process PATH from the existing Git installation.
- F18 unit/readiness33/33 PASS. The readiness test adapter recognizes the new presentation wrapper while testing the actual unchanged checkout GET/preparation controller. F18 browser selectors now traverse invitation→offer→consent before the unchanged financial assertions.
- Prepreview distribution4/4 and release static guard PASS.
- Seven real account handlers are AST-extracted and SHA256-identical to the prior integration checkout. Nine complete contract/controller files are byte-identical, including Live checkout, owner status, themes/save, wall consent, routes, canonical offer and Supabase client. Evidence: docs/supporter-ux-20261026/contract-proof.json.
- Actual product components, real hooks and controllers tested against isolated Auth/RPC/Edge boundaries:11 browser flows covering consent/ambiguous payment, original recovery, theme save/readback, opt-in/withdrawal, cancellation uncertainty, verified thanks, courtesy, no-pet route, reduced-motion and actual PetView entry/destinations. No real external requests or JS errors. ES/EN320/390/1440 layouts checked; canonical desktop/mobile frames preserved. Browser evidence is synthetic and does not establish a real payer journey.

## Release and rollback

Target: Vercel pazo-app / prj_nk61nr5ZVpxlp8qbIvRCsua36iXI, team_02Ax5UcD1OlLzpDBYyNMi6KO, canonical https://pazo-app.vercel.app/. Git auto-deploy is disabled; merge alone does not publish. Require CI on the exact candidate, then deploy the exact integrated main SHA, verify READY, alias/source SHA, public SPA/PayPal return/cancel/PWA and artwork assets. CI PostgreSQL/browser results and production postflight must be recorded separately; local Docker was unavailable, so no local PG/browser claim is made here.

Rollback frontend to the observed prior Vercel production deployment if the postflight fails. Do not roll back SQL history or alter provider/ledger data. Release status remains PENDING_CI_AND_DEPLOY until the recorded production postflight.

# PAZO #169 — independent consent visual evidence review (2026-10-31)

**Scope:** Review of the archived 48 screenshots and QA_RESULT.json from GitHub Actions [visual run #25](https://github.com/DigitalAppcorp/pazo-app/actions/runs/41183470074), artifact `meta-consent-visual-candidate` (id 13035594404), SHA `bd39b37d19723d7437f690bed5743a692edfe7a7`. This is an isolated synthetic UI preview, **not** hosted PAZO.

## Evidence

- CI visual job **SUCCESS**; `META_CONSENT_VISUAL_DOM_PASS`, screenshots=48, externalRequests=0, findings=[].
- Matrix: ES/EN × 320/390/430 px × default/GPC/GPC-error/grant-error × initial/result.
- Direct visual inspection of all **24 initial** screenshots by language/scenario/viewport contact sheets. Result states are asserted in Chromium and preserved in the artifact, but this review does not assert manual pixel-by-pixel inspection of every result state.
- ES/EN default shows an unchecked checkbox, disabled consent button, and clear continue-without-consent button.
- GPC scenarios hide affirmative consent and show saved/error/retry copy. Mobile 320px initial states show complete controls without obvious clipping. Visible typography and layout scale across 320/390/430.

## Findings / limitations

- **Visual candidate PASS (initial states only), no evidence of material clipping or deceptive affirmative consent in the inspected images.** Contrast ratios and screen-reader behavior were not independently measured; do not describe as WCAG conformance.
- Product polish observation (S3): the block is text-heavy, particularly at 320px; legal review should decide whether a concise layer with a linked full disclosure better preserves comprehension. Do not remove material disclosure merely to shorten.
- The yellow non-consent action is more prominent than the opt-in action, consistent with voluntary consent; do not reverse prominence to pressure users.
- **Not tested:** actual Auth/Edge hosted flow, cross-device GPC withdrawal, real privacy link destination, Pixel/CAPI network traffic, Events Manager dedup, Meta account ownership, production copy, assistive technology and PO acceptance.

## Verdict

`VISUAL_SCREENSHOT_INITIAL_STATES: PASS`
`AUTOMATED_UI_DOM: PASS`
`DESIGN_QA_FULL: NOT_TESTED`
`PRIVACY/LEGAL: BLOCKED`
`HOSTED_E2E: NOT_TESTED`
`PIXEL_CAPI_PROD: OFF`
`RELEASE: NO-GO`

This report does not constitute permission to merge, deploy, change the published privacy policy, send data to Meta, provision paid infrastructure, or spend on ads. Separate legal/data-field review, authenticated isolated hosted/staging flow, Meta Events Manager verification, and explicit launch authorization remain required.

## Extended coverage — 31 Oct 2026 (commit 33e13d7e)

- [Chromium visual run #32](https://github.com/DigitalAppcorp/pazo-app/actions/runs/41184589597) **SUCCESS** with 54 PNG files: 2 languages × 3 widths × 4 scenarios × initial/result = 48, plus 6 explicit GPC persistence-error screenshots captured **before** pressing Retry. Archive artifact ID `13036626001`; SHA `33e13d7ee206e706c93386830f2fe70d65514cf9`.
- `QA_RESULT.json`: `META_CONSENT_VISUAL_DOM_PASS`, `screenshots:54`, `externalRequests:0`, `findings:[]`. Browser console errors, page runtime exceptions, local 4xx/5xx and failed local requests now fail the test, even if the DOM appears acceptable.
- Independent visual contact-sheet inspection of all 48 initial/result states plus the 6 saved GPC-error screenshots: ES/EN copy present, retry visible after server failure, non-consent continuation visible, no apparent horizontal clipping at 320/390/430 px. This is qualitative screen review, not a contrast calculation, assistive-technology audit or public-hosted E2E.
- **Revised isolated visual verdict:** `DESIGN_QA_ISOLATED: PASS`. `DESIGN_QA_FULL: NOT_TESTED` remains because the actual signed-in PAZO route, privacy-link destination, cross-device GPC and production treatment have not been validated. All provider release gates stay OFF.

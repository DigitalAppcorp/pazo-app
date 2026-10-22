# F16-P28 — Ed25519 public-key verification feasibility (NO-GO)
2026-10-15. Offline experiment only.

## Goal
Sign a canonical authorization containing domain tag, request UUID, exact event ID,
key version, and expiration. Verify it with a public key, never distributing
the private signing key to PostgreSQL or callers.

## What is actually verified
- Offline WebCrypto Ed25519 signing/verification using generated ephemeral test keys.
- Adversarial mutation of event, requestId, version, and expiresAt invalidates signature.
- Public key mismatch and malformed signature deny.

## Blocking gap
Read-only query against hosted PostgreSQL catalog found `extensions.digest`, but
NO exposed asymmetric signature verification function in the checked schemas.
The Node/WebCrypto verifier is **not** a PostgreSQL verifier. No migration is
ready: Ed25519 support in PostgreSQL must be validated via an approved, audited
extension, an approved isolated verification service with transactional DB
consumption, or a different supported primitive. Do not assume pgcrypto can
verify Ed25519 signatures.

Other outstanding gates: server clock expiry evaluation, public-key version
and revocation governance, replay-proof atomic consume, operator authentication,
audit retention, and privileged service threat model.

## Status
NO hosted DDL, key, endpoint, PayPal or financial changes authorized or made.

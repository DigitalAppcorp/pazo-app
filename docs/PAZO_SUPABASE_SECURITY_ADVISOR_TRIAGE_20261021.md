# PAZO Beta — Supabase Security Advisor triage (2026-10-21)

Source: connected Supabase Advisors on project `mrybvqdebbgcayuvgkkr`, read-only at **2026-10-21 23:48 UTC**. No configuration, permissions, users or database rows were modified by this audit.

## Security notices

| Supabase lint | Level | Findings | Required disposition |
|---|---|---:|---|
| `rls_enabled_no_policy` | INFO | 46 | The majority are private, service-owned tables with intentionally forced RLS and **deny-all client access**; no automatic policies or PUBLIC grants should be created. Examine exposed schemas individually. |
| `anon_security_definer_function_executable` | WARN | 4 | Explicit public read contracts: `f14_content_visible`, `pazo_supporter_public_badges_batch`, `pazo_supporter_public_pet_benefits`, `pazo_supporter_public_wall`. Verify minimal output, owner privacy and public release scope; revoking all would break existing anonymous UI. Do not blindly revoke. |
| `authenticated_security_definer_function_executable` | WARN | 40 | Needs role/owner/AAL analysis per RPC before beta; a function's executable grant alone does not establish a vulnerability, but security-definer bypasses RLS. |
| `auth_leaked_password_protection` | WARN | 1 | **Leaked password protection disabled** at Supabase Auth. Enable in the project's Auth settings after verifying supported plan/configuration and admin approval; no Auth-setting mutation was made by this agent. |

Official remediation references:
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Financial authorization postflight

Separate SQL read-only query confirmed `merchants=0`, `intents=0`, `paid_periods=0`; selector `environment=sandbox`, `live_enabled=false`, `kill_switch=true`, `active_generation=null`. The external provider is not operational. No database changes or PayPal calls were made by this audit.

## Release handling

**Not a blanket CI PASS or security certification.** PWA/HTTPS public E2E, privacy and Auth advisory triage, P4 original merchant+MFA controlled cutover, and true PayPal payment/cancel/benefit canary still require independent evidence. This report is for PAZO release governance and does not authorize production deployment, preview, changes to RLS/GRANT, or real payment.

Security definer public read RPCs must be inspected against the UI's intended anonymous access prior to deciding if grants should be reduced; no speculative mass policy creation.

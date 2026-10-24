# PAZO F17 — F14 historical one-time SQL safety adjustment (PR #99 review)

**Scope: Git-only proposed mitigation, no production change.** Previous PR #97 copied into the executable migration directory the exact hosted SQL for version `20261010043307`, including a one-time target-specific `DO` block that can modify an old synthetic claim's expiry. The preexisting F14 archive README explicitly says this historical block **must not be replayed**.

## Remediation in this review branch

- The executable file `supabase/migrations/20261010043307_f14_media_jwt_claim_compat_single_test.sql` is now **byte-identical** to the previously-reviewed **structural-only redacted** archive file `supabase/history/f14_applied/20261010043307_f14_media_jwt_claim_compat_single_test.REDACTED.sql`.
- Preserves both structural function definitions; omits entirely the historical one-time claim-extension block and literal disposable target ID.
- The original hosted SQL and SHA remain **unchanged** in the immutable Phase 2 and Phase 3 snapshot manifests, and in prior Git commits; no claim of byte identity between the new active structural file and the hosted historical statement.
- Tests of the active executable source fail closed if that one-time SQL appears again, and historical manifests continue to prove the original archival hash. The hosted migration version still has its exact filename, so the 122-version inventory is unchanged.

## Important limitations / GO conditions

**This fixes the known F14 one-time replay hazard in the executable directory, NOT the missing foundational schema.** No complete 122-migration replay exists. Other historical migrations have not been individually certified safe for fresh replay. Future bootstrap should use an independently verified complete backup and controlled restore rather than blindly reapplying legacy migrations.

Do not run `supabase db push`, `supabase migration repair`, hosted DDL/DML, or production deploy/merge without Product Owner approval. GitHub PR #99 remains DRAFT and includes PRs #95, #97, #98. A code-only merge of these changes may trigger the existing hosting platform's automatic deployment; evaluate before giving main GO.

The older F14 archive `supabase/sql/f14_media_auth_role_compat_single_trial.sql` already contained the full original historical one-time trial (prior to this review); this mitigation does not claim to purge that identifier from old Git history.

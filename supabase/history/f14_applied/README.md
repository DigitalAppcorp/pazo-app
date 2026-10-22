# F14 applied migration history (read-only recovery)

These 17 entries were read individually from `supabase_migrations.schema_migrations` on project `mrybvqdebbgcayuvgkkr` using `BEGIN READ ONLY; SELECT version, name, statements ... WHERE version = ...; ROLLBACK;`. They were already applied to hosted Supabase. The new `20261010222006_f14_media_purge_retry_reconciliation.sql` is separate and remains unapplied.

This directory is an **archive, not a replayable migration chain**. The repository lacks the initial PAZO schema; its first versioned migration already alters existing application tables. Do not copy this archive into `supabase/migrations`, use `supabase db push`, or apply its one-time statements to hosted or test data. Reconstruct a structural baseline before PostgreSQL validation.

Fifteen missing statements are archived byte-for-byte as UTF-8 SQL. The remaining missing version, `20261010043307`, includes a literal identifier for one disposable test target. Its structural SQL is archived with the one-time `DO` block explicitly omitted. The complete original statement body was already present before this recovery in `supabase/sql/f14_media_auth_role_compat_single_trial.sql` with an added historical header; do not duplicate or execute it. The 17th version, `20261010072555`, was already in `supabase/migrations`; its functional SQL matches the applied statement, but editorial comments differ.

The MD5 values below are calculated over the original `statements` text in PostgreSQL and identify the exact applied source. They are audit references, not a substitute for PostgreSQL testing.

| Applied version | Name | Original MD5 | Recovery status | Repository path |
| --- | --- | --- | --- | --- |
| 20261008112333 | `f14_account_blocks_hidden_posts` | bf4ca836100d1670d44bb571b3739704 | Original SQL archived unchanged | `supabase/history/f14_applied/20261008112333_f14_account_blocks_hidden_posts.sql` |
| 20261008120333 | `f14_reports_moderation` | 855c30ead30cb88e50b78121f986a848 | Original SQL archived unchanged | `supabase/history/f14_applied/20261008120333_f14_reports_moderation.sql` |
| 20261008122907 | `f14_comment_parent_guard` | 97db0041edfa0fdf46d13cb0dee7a092 | Original SQL archived unchanged | `supabase/history/f14_applied/20261008122907_f14_comment_parent_guard.sql` |
| 20261009010551 | `f14_media_status_presence_guard` | 2e4be62f263f091fe64fb1a3bdc89ad0 | Original SQL archived unchanged | `supabase/history/f14_applied/20261009010551_f14_media_status_presence_guard.sql` |
| 20261009014616 | `f14_media_claim_preflight` | f4a841f2046a28051b9e03484ef17a67 | Original SQL archived unchanged | `supabase/history/f14_applied/20261009014616_f14_media_claim_preflight.sql` |
| 20261009040957 | `f14_storage_held_media_guard` | 2c30f60c588fce94c96d9bc3954c4e7b | Original SQL archived unchanged | `supabase/history/f14_applied/20261009040957_f14_storage_held_media_guard.sql` |
| 20261009054411 | `f14_held_media_fail_closed_recheck_update_guard` | 2b3349dd38b7d8489fbc577b72e13338 | Original SQL archived unchanged | `supabase/history/f14_applied/20261009054411_f14_held_media_fail_closed_recheck_update_guard.sql` |
| 20261009055801 | `f14_held_media_copy_source_operation_guard` | 976cb3a39ef35dbe0056bd957ba1c662 | Original SQL archived unchanged | `supabase/history/f14_applied/20261009055801_f14_held_media_copy_source_operation_guard.sql` |
| 20261009055955 | `f14_disable_unverified_media_purge_confirmation` | 224bfc970c14a567e7892900da997cfc | Original SQL archived unchanged | `supabase/history/f14_applied/20261009055955_f14_disable_unverified_media_purge_confirmation.sql` |
| 20261009061213 | `f14_reject_unverified_purged_status` | 8bdc104b50e507fcd7f15613c36c8e7e | Original SQL archived unchanged | `supabase/history/f14_applied/20261009061213_f14_reject_unverified_purged_status.sql` |
| 20261009095635 | `f14_service_only_media_evidence_reader` | a091a3fa64c85e5f4e44f78657aed9f9 | Original SQL archived unchanged | `supabase/history/f14_applied/20261009095635_f14_service_only_media_evidence_reader.sql` |
| 20261010033538 | `f14_moderation_media_preflight_locked` | c4a1db045ebfe519231c000a7aeca849 | Original SQL archived unchanged | `supabase/history/f14_applied/20261010033538_f14_moderation_media_preflight_locked.sql` |
| 20261010034610 | `f14_finalize_media_after_verified_claim` | 7f8b186f7a1dadc6d826490cade51ec5 | Original SQL archived unchanged | `supabase/history/f14_applied/20261010034610_f14_finalize_media_after_verified_claim.sql` |
| 20261010043307 | `f14_media_jwt_claim_compat_single_test` | a6bb99575e9c906bf5f3e7a4c6df1ed5 | Structural excerpt; one-time UUID block omitted | `supabase/history/f14_applied/20261010043307_f14_media_jwt_claim_compat_single_test.REDACTED.sql` |
| 20261010045708 | `f14_account_request_intake` | 6884650b131fdfb2fe9a9e8a20ae8f06 | Original SQL archived unchanged | `supabase/history/f14_applied/20261010045708_f14_account_request_intake.sql` |
| 20261010053708 | `f14_community_ownership_continuity` | 0da26f6f84310e568c6f4b7798c09875 | Original SQL archived unchanged | `supabase/history/f14_applied/20261010053708_f14_community_ownership_continuity.sql` |
| 20261010072555 | `f14_recover_missing_profile` | 76fba3aa1b4d029a633bfc679de9bca7 | Already versioned (functional SQL matches; comments differ) | `supabase/migrations/20261010072555_f14_recover_missing_profile.sql` |

Sensitive-content review: no literal email address, JWT, API key, database credential, or private key was found in the recovered SQL. One literal disposable target UUID occurred only in the one-time migration and was not copied into this archive. The F14 probe contains the project's public Supabase URL pattern.

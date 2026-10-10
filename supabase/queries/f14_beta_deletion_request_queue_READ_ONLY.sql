-- PAZO MVP BETA | private deletion request queue (READ ONLY)
-- Operator: run using the trusted Supabase SQL editor/DB admin only.
-- Never paste email, token, password, user-generated text or request UUID into
-- public issues, screenshots or analytics. No extra service or scheduled job.
-- Existing backend: account_requests_private.deletion_requests +
-- public.pazo_deletion_request/status/cancel() (already installed).
-- No UPDATE/DELETE, no direct Auth or Storage mutations, no grants/RPC.

SELECT
  r.subject_user_id AS internal_request_id,
  r.status,
  r.requested_at,
  r.updated_at,
  CASE
    WHEN r.status = 'requested' THEN 'awaiting_private_review'
    WHEN r.status = 'processing' THEN 'verify_actual_deletion_before_completion'
    ELSE 'historical'
  END AS operator_next_step
FROM account_requests_private.deletion_requests AS r
WHERE r.status IN ('requested', 'processing')
ORDER BY r.requested_at ASC, r.subject_user_id ASC;

-- If any rows appear, verify the requester through trusted Auth records,
-- run supabase/queries/f14_account_deletion_preflight_READ_ONLY.sql,
-- and follow docs/PAZO_MVP_MANUAL_DELETION_SOP_20261010.md.
-- Do NOT change status to processing/completed or remove Auth/Storage from
-- this query. A row being 'requested' never authorizes irreversible action.

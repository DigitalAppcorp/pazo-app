-- Mirror of production migration: identify recent Meta CAPI QA accounts
-- using a specific controlled classification reason.
alter table supporter_private.gradual_qa_accounts
  drop constraint gradual_qa_accounts_reason_check;
alter table supporter_private.gradual_qa_accounts
  add constraint gradual_qa_accounts_reason_check
  check (reason = any(array[
    'prebeta_20261023'::text,
    'postbeta_qa_20261026'::text,
    'meta_capi_qa_2026_11_01'::text
  ]));

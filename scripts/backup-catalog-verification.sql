-- Administrative recovery verification. Write output to a private local file.
-- Includes private fingerprints, never frontend/telemetry/public CI with hosted data.
-- Compare ACLs with implicit defaults expanded and ordering normalized.
-- Equality at two read times is not an atomic cross-service snapshot.
BEGIN READ ONLY;
SET LOCAL search_path=pg_catalog;
WITH relations AS (
 SELECT c.oid,n.nspname,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,
 pg_get_userbyid(c.relowner) owner,ARRAY(SELECT x::text FROM unnest(COALESCE(c.relacl,acldefault(CASE WHEN c.relkind='S' THEN 's'::"char" ELSE 'r'::"char" END,c.relowner))) x ORDER BY x::text) acl
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND c.relkind IN ('r','p','v','m','S','f')
), tables AS (
 SELECT nspname,relname,query_to_xml(CASE WHEN relkind='S' THEN format(
 'SELECT last_value,is_called FROM %I.%I',nspname,relname) ELSE format(
 'SELECT count(*) AS rows,md5(COALESCE(string_agg(row_to_json(t)::text,''|'' ORDER BY row_to_json(t)::text),'''')) AS digest FROM %I.%I t',nspname,relname) END,false,true,'')::text evidence
 FROM relations WHERE relkind IN ('r','p','S')
), routines AS (
 SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args,
 pg_get_functiondef(p.oid) definition,pg_get_userbyid(p.proowner) owner,ARRAY(SELECT x::text FROM unnest(COALESCE(p.proacl,acldefault('f',p.proowner))) x ORDER BY x::text) acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND p.prokind IN ('f','p')
), policies AS (
 SELECT r.nspname,r.relname,p.polname,p.polcmd,p.polpermissive,
 ARRAY(SELECT CASE WHEN x=0 THEN 'public' ELSE pg_get_userbyid(x) END FROM unnest(p.polroles) x ORDER BY 1) roles,
 pg_get_expr(p.polqual,p.polrelid) qual,pg_get_expr(p.polwithcheck,p.polrelid) checks
 FROM pg_policy p JOIN relations r ON r.oid=p.polrelid
), constraints AS (
 SELECT r.nspname,r.relname,c.conname,pg_get_constraintdef(c.oid) definition,c.convalidated
 FROM pg_constraint c JOIN relations r ON r.oid=c.conrelid
), triggers AS (
 SELECT r.nspname,r.relname,t.tgname,pg_get_triggerdef(t.oid) definition,t.tgenabled
 FROM pg_trigger t JOIN relations r ON r.oid=t.tgrelid WHERE NOT t.tgisinternal
)
SELECT jsonb_build_object(
 'tables',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY nspname,relname) FROM tables t),'[]'::jsonb),
 'relations_sha_md5',(SELECT md5(string_agg((to_jsonb(r)-'oid')::text,'|' ORDER BY nspname,relname)) FROM relations r),
 'functions_sha_md5',(SELECT md5(string_agg(to_jsonb(r)::text,'|' ORDER BY nspname,proname,args)) FROM routines r),
 'policies_sha_md5',(SELECT md5(string_agg(to_jsonb(p)::text,'|' ORDER BY nspname,relname,polname)) FROM policies p),
 'constraints_sha_md5',(SELECT md5(string_agg(to_jsonb(c)::text,'|' ORDER BY nspname,relname,conname)) FROM constraints c),
 'triggers_sha_md5',(SELECT md5(string_agg(to_jsonb(t)::text,'|' ORDER BY nspname,relname,tgname)) FROM triggers t),
 'functions',(SELECT count(*) FROM routines),'policies',(SELECT count(*) FROM policies),'constraints',(SELECT count(*) FROM constraints),'triggers',(SELECT count(*) FROM triggers),
 'extensions',(SELECT jsonb_agg(jsonb_build_object('name',extname,'version',extversion,'owner',pg_get_userbyid(extowner)) ORDER BY extname) FROM pg_extension),
 'database',(SELECT jsonb_build_object('owner',pg_get_userbyid(datdba),'acl',datacl::text,'encoding',pg_encoding_to_char(encoding),'collate',datcollate,'ctype',datctype,'provider',datlocprovider) FROM pg_database WHERE datname=current_database())
) AS evidence;
ROLLBACK;

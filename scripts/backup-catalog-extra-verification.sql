BEGIN READ ONLY;
SET LOCAL search_path=pg_catalog;
WITH schemas AS (
 SELECT nspname,pg_get_userbyid(nspowner) owner,
 ARRAY(SELECT x::text FROM unnest(COALESCE(nspacl,acldefault('n',nspowner))) x ORDER BY 1) acl
 FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname<>'information_schema'
), roles AS (
 SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolconnlimit,rolvaliduntil,rolbypassrls,rolconfig
 FROM pg_roles WHERE rolname NOT LIKE 'cli_login_%'
), memberships AS (
 SELECT pg_get_userbyid(roleid) role,pg_get_userbyid(member) member,pg_get_userbyid(grantor) grantor,admin_option,inherit_option,set_option
 FROM pg_auth_members WHERE pg_get_userbyid(member) NOT LIKE 'cli_login_%' AND pg_get_userbyid(roleid) NOT LIKE 'cli_login_%'
), columns AS (
 SELECT n.nspname,c.relname,a.attname,row_number() OVER(PARTITION BY c.oid ORDER BY a.attnum) ordinal,format_type(a.atttypid,a.atttypmod) type,a.attnotnull,a.attidentity,a.attgenerated,
 pg_get_expr(d.adbin,d.adrelid) default_expr,co.collname,a.attstorage,a.attcompression,
 ARRAY(SELECT x::text FROM unnest(a.attacl) x ORDER BY 1) acl
 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum LEFT JOIN pg_collation co ON co.oid=a.attcollation
 WHERE a.attnum>0 AND NOT a.attisdropped AND c.relkind IN ('r','p','v','m','f') AND n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'
), indexes AS (
 SELECT n.nspname,c.relname,pg_get_indexdef(i.indexrelid) definition,i.indisvalid,i.indisready,i.indisreplident
 FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'
), defaults AS (
 SELECT pg_get_userbyid(defaclrole) role,COALESCE(n.nspname,'') schema,defaclobjtype,
 ARRAY(SELECT x::text FROM unnest(defaclacl) x ORDER BY 1) acl
 FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
), settings AS (
 SELECT CASE WHEN setdatabase=0 THEN '' ELSE (SELECT datname FROM pg_database WHERE oid=setdatabase) END database,
 CASE WHEN setrole=0 THEN '' ELSE pg_get_userbyid(setrole) END role,ARRAY(SELECT x FROM unnest(setconfig) x ORDER BY x) config
 FROM pg_db_role_setting WHERE setrole=0 OR pg_get_userbyid(setrole) NOT LIKE 'cli_login_%'
), extobjects AS (
 SELECT e.extname,pg_describe_object(d.classid,d.objid,d.objsubid) object,
 CASE WHEN d.classid='pg_proc'::regclass THEN pg_get_userbyid(p.proowner) WHEN d.classid='pg_class'::regclass THEN pg_get_userbyid(c.relowner) END owner,
 CASE WHEN d.classid='pg_proc'::regclass THEN ARRAY(SELECT x::text FROM unnest(COALESCE(p.proacl,acldefault('f',p.proowner))) x ORDER BY 1)
 WHEN d.classid='pg_class'::regclass AND c.relkind IN ('r','p','v','m','S','f') THEN ARRAY(SELECT x::text FROM unnest(COALESCE(c.relacl,acldefault(CASE WHEN c.relkind='S' THEN 's'::"char" ELSE 'r'::"char" END,c.relowner))) x ORDER BY 1) END acl
 FROM pg_depend d JOIN pg_extension e ON d.refclassid='pg_extension'::regclass AND d.refobjid=e.oid AND d.deptype='e'
 LEFT JOIN pg_proc p ON d.classid='pg_proc'::regclass AND p.oid=d.objid LEFT JOIN pg_class c ON d.classid='pg_class'::regclass AND c.oid=d.objid
)
SELECT jsonb_build_object(
 'schemas',(SELECT jsonb_agg(to_jsonb(s) ORDER BY nspname) FROM schemas s),
 'roles',(SELECT jsonb_agg(to_jsonb(r) ORDER BY rolname) FROM roles r),
 'memberships',(SELECT jsonb_agg(to_jsonb(m) ORDER BY role,member,grantor) FROM memberships m),
 'columns',(SELECT jsonb_agg(to_jsonb(c) ORDER BY nspname,relname,ordinal) FROM columns c),
 'indexes',(SELECT jsonb_agg(to_jsonb(i) ORDER BY nspname,relname,definition) FROM indexes i),
 'default_acl',(SELECT jsonb_agg(to_jsonb(d) ORDER BY role,schema,defaclobjtype) FROM defaults d),
 'settings',(SELECT jsonb_agg(to_jsonb(s) ORDER BY database,role) FROM settings s),
 'extension_objects',(SELECT jsonb_agg(to_jsonb(e) ORDER BY extname,object) FROM extobjects e),
 'extensions',(SELECT jsonb_agg(jsonb_build_object('name',extname,'version',extversion,'owner',pg_get_userbyid(extowner),'schema',n.nspname) ORDER BY extname) FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace),
 'p42_rows',(SELECT count(*) FROM supporter_private.p42_activation_signing_keys),
 'vault_rows',(SELECT count(*) FROM vault.secrets)
) AS evidence;
ROLLBACK;

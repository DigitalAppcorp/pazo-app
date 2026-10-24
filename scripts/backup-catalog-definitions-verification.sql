BEGIN READ ONLY;
SET LOCAL search_path=pg_catalog;
WITH relations AS (
 SELECT n.nspname,c.relname,c.relkind,c.relpersistence,c.relreplident,c.reloptions,c.relispartition,
 pg_get_partkeydef(c.oid) partition_key,pg_get_expr(c.relpartbound,c.oid) partition_bound,
 CASE WHEN c.relkind IN ('v','m') THEN pg_get_viewdef(c.oid,true) END view_definition,
 COALESCE(t.spcname,'pg_default') tablespace,a.amname
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_tablespace t ON t.oid=c.reltablespace LEFT JOIN pg_am a ON a.oid=c.relam
 WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND c.relkind IN ('r','p','v','m','S','f')
), sequences AS (
 SELECT n.nspname,c.relname,format_type(s.seqtypid,NULL) type,s.seqstart,s.seqincrement,s.seqmax,s.seqmin,s.seqcache,s.seqcycle
 FROM pg_sequence s JOIN pg_class c ON c.oid=s.seqrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'
), types AS (
 SELECT n.nspname,t.typname,t.typtype,pg_get_userbyid(t.typowner) owner,t.typnotnull,t.typdefault,
 CASE WHEN t.typbasetype=0 THEN NULL ELSE format_type(t.typbasetype,t.typtypmod) END base_type,
 ARRAY(SELECT x::text FROM unnest(COALESCE(t.typacl,acldefault('T',t.typowner))) x ORDER BY 1) acl,
 (SELECT jsonb_agg(enumlabel ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid=t.oid) labels,
 (SELECT jsonb_agg(jsonb_build_object('name',conname,'definition',pg_get_constraintdef(oid),'validated',convalidated) ORDER BY conname) FROM pg_constraint WHERE contypid=t.oid) domain_constraints
 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND t.typtype IN ('d','e','c','r','m')
), rules AS (
 SELECT n.nspname,c.relname,r.rulename,pg_get_ruledef(r.oid,true) definition,r.ev_enabled
 FROM pg_rewrite r JOIN pg_class c ON c.oid=r.ev_class JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'
), publications AS (
 SELECT pubname,pg_get_userbyid(pubowner) owner,puballtables,pubinsert,pubupdate,pubdelete,pubtruncate,pubviaroot FROM pg_publication
)
SELECT jsonb_build_object(
 'relations',(SELECT jsonb_agg(to_jsonb(r) ORDER BY nspname,relname) FROM relations r),
 'sequences',(SELECT jsonb_agg(to_jsonb(s) ORDER BY nspname,relname) FROM sequences s),
 'types',(SELECT jsonb_agg(to_jsonb(t) ORDER BY nspname,typname) FROM types t),
 'rules',(SELECT jsonb_agg(to_jsonb(r) ORDER BY nspname,relname,rulename) FROM rules r),
 'publications',(SELECT jsonb_agg(to_jsonb(p) ORDER BY pubname) FROM publications p),
 'database',(SELECT jsonb_build_object('allow_connections',datallowconn,'connection_limit',datconnlimit,'template',datistemplate,'locale',to_jsonb(d)->>'datlocale','icu_rules',to_jsonb(d)->>'daticurules','collation_version',datcollversion,'tablespace',(SELECT spcname FROM pg_tablespace WHERE oid=d.dattablespace)) FROM pg_database d WHERE datname=current_database()),
 'large_objects',(SELECT count(*) FROM pg_largeobject_metadata)
) AS evidence;
ROLLBACK;

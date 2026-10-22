// Builds reviewable SQL only. No credentials, connection, execution or deployment.
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
const filenames=[
 '20261022103706_pazo_f17_private_support.sql',
 '20261022103707_pazo_f17_gift_benefits.sql',
 '20261022103708_pazo_f17_maintenance_guard.sql',
]
export function f17SchemaPlan(root=process.cwd()){
 return filenames.map(filename=>{
  const source=readFileSync(resolve(root,'supabase/migrations',filename),'utf8')
  if((source.match(/^BEGIN;$/gm)||[]).length!==1||(source.match(/^COMMIT;$/gm)||[]).length!==1)throw Error('Unexpected migration transaction structure')
  return {filename,version:filename.slice(0,14),name:filename.slice(15,-4),source,
   sha256:createHash('sha256').update(source).digest('hex'),md5:createHash('md5').update(source).digest('hex')}
 })
}
export function buildF17SchemaBatch({commit=false,root=process.cwd()}={}){
 const plan=f17SchemaPlan(root)
 let sql='-- REVIEWED F17 BATCH. Run only after the PO deployment authorization.\nBEGIN;\nSET LOCAL lock_timeout=\'5s\';\n'
 for(const m of plan){
  const tag='$f17_migration_'+m.version+'$'
  if(m.source.includes(tag))throw Error('Source delimiter collision')
  sql+=m.source.replace(/^BEGIN;\n/m,'').replace(/\nCOMMIT;\s*$/,'')+'\n'
  sql+=`INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('${m.version}','${m.name}',ARRAY[${tag}${m.source}${tag}]);\n`
 }
 sql+='DO $postflight$ BEGIN\n'
 for(const m of plan)sql+=` IF NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='${m.version}' AND name='${m.name}' AND md5(statements[1])='${m.md5}') THEN RAISE EXCEPTION 'F17 migration history mismatch';END IF;\n`
 sql+=` IF NOT EXISTS(SELECT 1 FROM admin_private.pazo_app_maintenance WHERE singleton AND NOT enabled AND revision=0) THEN RAISE EXCEPTION 'Maintenance must remain OFF';END IF;
 IF (SELECT count(*) FROM pg_class WHERE oid IN (
 'public.pazo_support_tickets'::regclass,'supporter_private.pazo_admin_gift_access'::regclass,
 'supporter_private.pazo_admin_gift_audit'::regclass,'admin_private.pazo_app_maintenance'::regclass,
 'admin_private.pazo_app_maintenance_audit'::regclass) AND relrowsecurity AND relforcerowsecurity)<>5
 THEN RAISE EXCEPTION 'F17 private table RLS incomplete';END IF;
 IF has_table_privilege('authenticated','public.pazo_support_tickets','INSERT')
 OR has_table_privilege('authenticated','supporter_private.pazo_admin_gift_access','UPDATE')
 OR has_table_privilege('authenticated','admin_private.pazo_app_maintenance','UPDATE')
 OR has_function_privilege('anon','public.pazo_my_support_tickets()','EXECUTE')
 OR has_function_privilege('authenticated','admin_private.pazo_support_prune_resolved()','EXECUTE')
 THEN RAISE EXCEPTION 'F17 unexpected client privilege';END IF;
END $postflight$;
`
 return sql+(commit?'COMMIT;\n':'ROLLBACK;\n')
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(process.argv.includes('--sql'))process.stdout.write(buildF17SchemaBatch({commit:process.argv.includes('--commit')}))
 else console.log(JSON.stringify({source:'f17_schema_review_plan',executes_sql:false,migrations:f17SchemaPlan().map(({source,md5,...summary})=>summary)},null,2))
}

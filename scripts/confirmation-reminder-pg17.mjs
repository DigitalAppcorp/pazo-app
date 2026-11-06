// Disposable PostgreSQL 17 integration test. Never accepts a hosted database URL.
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'

if(process.env.CI!=='true'||process.env.PAZO_CONFIRMATION_REMINDER_PG_MODE!=='ci'
  ||process.env.PGHOST!=='127.0.0.1'||process.env.PGDATABASE!=='pazo_confirmation_synthetic'
  ||!process.env.PGPASSWORD)throw Error('An isolated CI PostgreSQL 17 database is required')
const psql=(sql)=>execFileSync('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8'}).trim()
const file=(path)=>psql(readFileSync(path,'utf8'))
const check=(query,expected,message)=>assert.equal(psql(query),expected,message)

file('supabase/tests/confirmation-reminder/fixtures-pg17.sql')
file('supabase/migrations/20261106090005_pazo_email_confirmation_reminder.sql')

check("SELECT count(*) FROM auth_private.confirmation_reminder",'1','Backfill includes one old real email account only')
check("SELECT user_id FROM auth_private.confirmation_reminder",'10000000-0000-4000-8000-000000000001','Google, QA, admin and anonymous accounts stay excluded')
check("SELECT status='pending' AND due_at<=statement_timestamp() FROM auth_private.confirmation_reminder",'t','Old account is due after its confirmation email is 24h old')
check("SELECT auth_private.confirmation_reminder_tick() IS NOT NULL",'t','Cron emits one dispatch when an account is due')
check("SELECT dispatch_sha256 IS NOT NULL AND dispatch_expires_at>statement_timestamp() FROM auth_private.confirmation_reminder_worker_dispatch WHERE singleton",'t','Dispatch token is hashed and short-lived')
check("SELECT count(*) FROM information_schema.columns WHERE table_schema='auth_private' AND table_name='confirmation_reminder' AND column_name IN('email','message','body')",'0','No email address or message body is stored')
check("SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='auth_private.confirmation_reminder'::regclass",'t','Private queue has FORCE RLS')
check("SELECT NOT has_table_privilege('anon','auth_private.confirmation_reminder','SELECT') AND NOT has_table_privilege('authenticated','auth_private.confirmation_reminder','SELECT') AND NOT has_table_privilege('service_role','auth_private.confirmation_reminder','SELECT')",'t','No role can read the table directly')
check("SELECT NOT has_function_privilege('anon','public.pazo_auth_confirmation_reminder_lease(integer)','EXECUTE') AND has_function_privilege('service_role','public.pazo_auth_confirmation_reminder_lease(integer)','EXECUTE')",'t','Only service role can lease through RPC')

psql(`INSERT INTO auth.users(id,email,created_at,confirmation_sent_at,raw_app_meta_data) VALUES('20000000-0000-4000-8000-000000000001','new@example.test',statement_timestamp()-interval '2 hours',statement_timestamp()-interval '1 hour','{"provider":"email"}')`)
check("SELECT status='pending' AND abs(extract(epoch FROM (due_at-confirmation_sent_at))-86400)<0.1 FROM auth_private.confirmation_reminder r JOIN auth.users u ON u.id=r.user_id WHERE r.user_id='20000000-0000-4000-8000-000000000001'",'t','New signup schedules 24h after its confirmation email')
psql("UPDATE auth.users SET confirmation_sent_at=statement_timestamp() WHERE id='20000000-0000-4000-8000-000000000001'")
check("SELECT abs(extract(epoch FROM (r.due_at-u.confirmation_sent_at))-86400)<0.1 FROM auth_private.confirmation_reminder r JOIN auth.users u ON u.id=r.user_id WHERE r.user_id='20000000-0000-4000-8000-000000000001'",'t','Manual resend postpones the automatic reminder')
psql("UPDATE auth.users SET email_confirmed_at=statement_timestamp() WHERE id='20000000-0000-4000-8000-000000000001'")
check("SELECT count(*) FROM auth_private.confirmation_reminder WHERE user_id='20000000-0000-4000-8000-000000000001'",'0','Confirmation removes pending state')

check("SET ROLE service_role; SELECT jsonb_array_length(public.pazo_auth_confirmation_reminder_lease(5))",'1','The due email account is claimed once')
check("SET ROLE service_role; SELECT jsonb_array_length(public.pazo_auth_confirmation_reminder_lease(5))",'0','A claimed account cannot be claimed twice')
check("SELECT status='attempting' AND attempted_at IS NOT NULL FROM auth_private.confirmation_reminder WHERE user_id='10000000-0000-4000-8000-000000000001'",'t','Claim is recorded before the external call')
check("SET ROLE service_role; SELECT public.pazo_auth_confirmation_reminder_report('[{\"user_id\":\"10000000-0000-4000-8000-000000000001\",\"outcome\":\"accepted\"}]'::jsonb)",'1','Auth outcome is recorded')
check("SELECT status='accepted' AND finished_at IS NOT NULL FROM auth_private.confirmation_reminder WHERE user_id='10000000-0000-4000-8000-000000000001'",'t','Accepted is a terminal one-time outcome')

psql("UPDATE auth_private.confirmation_reminder SET status='accepted',finished_at=statement_timestamp()-interval '15 days' WHERE user_id='10000000-0000-4000-8000-000000000001'")
check("SELECT auth_private.confirmation_reminder_retention_tick()>=1",'t','Fourteen-day records are purged')
check("SELECT count(*) FROM auth_private.confirmation_reminder",'0','Purged account state cannot be re-enqueued by the scheduler')
psql("INSERT INTO auth.users(id,email,created_at,confirmation_sent_at,raw_app_meta_data) VALUES('30000000-0000-4000-8000-000000000001','expired@example.test',statement_timestamp()-interval '16 days',statement_timestamp()-interval '16 days','{\"provider\":\"email\"}')")
check("SELECT auth_private.confirmation_reminder_retention_tick()>=1",'t','Pending records expire after 14 days of eligibility')
check("SELECT count(*) FROM auth_private.confirmation_reminder",'0','Expired pending state is removed and cannot be re-enqueued by the scheduler')

const token='a'.repeat(64)
psql(`UPDATE auth_private.confirmation_reminder_worker_dispatch SET dispatch_sha256=sha256(convert_to('${token}','UTF8')),dispatch_expires_at=statement_timestamp()+interval '2 minutes' WHERE singleton`)
check(`SET ROLE service_role; SELECT public.pazo_auth_confirmation_reminder_admit('${token}')`,'t','Valid one-time worker token is admitted')
check(`SET ROLE service_role; SELECT public.pazo_auth_confirmation_reminder_admit('${token}')`,'f','Worker token replay is rejected')

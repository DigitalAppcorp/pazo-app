// Vigilante integration and security tests against a disposable PostgreSQL 17.
// Runs only in CI against 127.0.0.1; never accepts a remote database.
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'

if(!(process.env.CI==='true'&&process.env.PGHOST==='127.0.0.1'&&process.env.PGDATABASE==='vigilante'))
 throw Error('Isolated CI PostgreSQL (PGHOST=127.0.0.1, PGDATABASE=vigilante) required')
const sql=query=>{
 const result=spawnSync('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8',maxBuffer:4e6})
 if(result.status!==0)throw Error(result.stderr||'psql failed')
 return result.stdout.trim()
}
const file=path=>sql(readFileSync(path,'utf8'))
let checks=0
const check=(value,message)=>{assert.ok(value,message);checks++;console.log('ok -',message)}
const rejects=(query,pattern,message)=>{assert.throws(()=>sql(query),pattern);checks++;console.log('ok -',message)}
const id=n=>'98000000-0000-4000-8000-'+String(n).padStart(12,'0')
const claims=(user,extra={})=>JSON.stringify({sub:user,role:'authenticated',aal:'aal1',amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)-3600}],...extra})
const as=(user,query,extra)=>`SET ROLE authenticated;SET "request.jwt.claims"='${claims(user,extra)}';${query}`
const asAnon=query=>`SET ROLE anon;${query}`
const asService=query=>`SET ROLE service_role;${query}`

file('supabase/tests/vigilante/fixtures-pg17.sql')
const admin=id(1),ana=id(2),beto=id(3),carla=id(4),dani=id(5),eva=id(6),fede=id(7)
sql(`insert into auth.users(id) values ${[admin,ana,beto,carla,dani,eva,fede].map(u=>`('${u}')`).join(',')};
 insert into public.profiles(id) values ${[admin,ana,beto,carla,dani,eva,fede].map(u=>`('${u}')`).join(',')};
 insert into admin_private.admin_grants values('${admin}');
 insert into public.pets(id,owner_id,name,species,created_at) values('${id(90)}','${ana}','Existing','conejo',now()-interval '30 days');`)

// Migrations in the order they must be applied in production.
const migrations=['20261103200000_pazo_care_vaccine_type','20261103201000_pazo_vigilante_private_details','20261103202000_pazo_welcome_notification',
 '20261103210000_pazo_official_author','20261103220000_pazo_health_alert_push','20261103230000_pazo_vigilante_engine']
for(const name of migrations)file(`supabase/migrations/${name}.sql`)
check(true,'all six Vigilante migrations apply in order on PostgreSQL 17')
check(sql(`select count(*) from public.notifications where type='welcome' and user_id='${ana}'`)==='1','existing accounts get one welcome notice')

// Pets: A current, B expired, C unregistered, D cat, E completed only, F no postal code.
const pet={max:id(11),rex:id(12),toby:id(13),mia:id(14),lola:id(15),nube:id(16)}
sql(`insert into public.pets(id,owner_id,name,species) values
 ('${pet.max}','${ana}','Max','perro'),('${pet.rex}','${beto}','Rex','perro'),('${pet.toby}','${carla}','Toby','perro'),
 ('${pet.mia}','${dani}','Mia','gato'),('${pet.lola}','${eva}','Lola','perro'),('${pet.nube}','${fede}','Nube','perro');
 insert into public.household_private_details(user_id,postal_code) values
 ('${ana}','90026'),('${beto}','90026'),('${carla}','90026'),('${dani}','90026'),('${eva}','90026');`)
check(sql(`select count(*) from public.notifications where type='welcome' and user_id='${beto}'`)==='1','a first pet creates the welcome notice')
sql(`insert into public.pets(owner_id,name,species) values('${beto}','Second','ave')`)
check(sql(`select count(*) from public.notifications where type='welcome' and user_id='${beto}'`)==='1','a second pet does not repeat it')

// Care items through the owner's own session (column grants and RLS).
sql(as(ana,`insert into public.care_items(pet_id,title,category,due_date,vaccine_type) values('${pet.max}','Lepto','vaccine',current_date+200,'leptospirosis')`))
sql(as(beto,`insert into public.care_items(pet_id,title,category,due_date,vaccine_type) values('${pet.rex}','Lepto','vaccine',current_date-10,'leptospirosis')`))
sql(`insert into public.care_items(pet_id,title,category,due_date,vaccine_type,status) values('${pet.lola}','Lepto','vaccine',current_date-400,'leptospirosis','completed')`)
check(true,'owners record a typed vaccine through their own grants')
rejects(as(ana,`insert into public.care_items(pet_id,title,category,due_date,vaccine_type) values('${pet.max}','Bath','hygiene',current_date,'rabies')`),/care_items_vaccine_type_valid/,'a vaccine type only fits a vaccine item')
rejects(as(ana,`insert into public.care_items(pet_id,title,category,due_date,vaccine_type) values('${pet.rex}','X','vaccine',current_date,'rabies')`),/row-level security/,'nobody writes care for a pet they do not own')

// Privacy of the household postal code and pet health data.
check(sql(as(beto,`select count(*) from public.household_private_details`))==='1','an owner sees only their own postal code')
check(sql(as(beto,`select count(*) from public.household_private_details where user_id='${ana}'`))==='0','another owner cannot read it')
rejects(asAnon(`select * from public.household_private_details`),/permission denied/,'anonymous visitors cannot read postal codes')
rejects(as(beto,`insert into public.household_private_details(user_id,postal_code) values('${ana}','10001')`),/row-level security/,'nobody writes another household')
rejects(as(ana,`update public.household_private_details set postal_code='9002' where user_id='${ana}'`),/household_postal_code_valid/,'postal codes are five digits')
sql(`insert into public.pet_private_details(pet_id,health_conditions,food_brand) values('${pet.max}','{heart}','Acme Pet Foods'),('${pet.toby}','{}','Other Brand')`)
check(sql(as(beto,`select count(*) from public.pet_private_details where pet_id='${pet.max}'`))==='0','pet health and food stay private to the owner')
rejects(`insert into public.pet_private_details(pet_id,health_conditions) values('${pet.rex}','{made_up}')`,/pet_health_conditions_valid/,'health conditions come from the closed list')

// Reserved names.
for(const name of ['PAZO','P.a.z.0','Pazo Oficial','PAZO team','Pazó'])
 rejects(`insert into public.pets(owner_id,name,species) values('${ana}','${name}','perro')`,/PAZO_RESERVED_NAME/,`reserved pet name: ${name}`)
sql(`insert into public.pets(owner_id,name,species) values('${ana}','Paz','otro')`)
check(true,'ordinary names such as "Paz" are allowed')
rejects(as(ana,`update public.profiles set username='pazo_admin' where id='${ana}'`),/PAZO_RESERVED_NAME/,'reserved usernames are rejected')

// Official author: nobody can write as PAZO.
rejects(as(admin,`insert into public.official_posts(title,body,source_name,source_url,source_published_at) values('Hola','Texto','X','https://x.gov',current_date)`),/permission denied/,'not even an administrator inserts official posts directly')
rejects(as(ana,`select * from vigilante_private.drafts`),/permission denied/,'the Vigilante schema is closed to users')
rejects(as(ana,`select public.pazo_vigilante_ingest('nws_la','[]')`),/permission denied/,'only the worker (service role) can ingest')
rejects(as(ana,`select public.pazo_vigilante_inbox()`),/Administrator required/,'only administrators see the inbox')
check(sql(`select is_founder from public.profiles where id='${admin}'`)==='t','the administrator account is the founder')
check(sql(as(ana,`select count(*) from public.pazo_founder_pets_batch(array['${pet.max}'::uuid])`))==='0','founder badges only for founder pets')

// OFF by default: nothing is read, drafted or published.
check(JSON.parse(sql(asService(`select public.pazo_vigilante_ingest('nws_la','[]')`))).enabled===false,'installed OFF: ingestion does nothing')
check(sql(`select vigilante_private.tick() is null`)==='t','installed OFF: the scheduler does nothing')
check(sql(`select count(*) from cron.job where jobname='pazo_vigilante_tick_v1'`)==='1','the ten-minute schedule is installed')
sql(as(admin,`select public.pazo_vigilante_set_enabled(true)`))
rejects(as(ana,`select public.pazo_vigilante_set_enabled(true)`),/Administrator required/,'only administrators switch the Vigilante')

// Subscriptions and preferences for push.
sql(`insert into push_private.subscriptions(user_id) values('${beto}'),('${carla}'),('${eva}'),('${admin}');
 insert into push_private.preferences(user_id,health_alerts) values('${eva}',false);`)

const outbreak=(n,extra={})=>JSON.stringify([{kind:'outbreak',external_id:'ext-'+n,fingerprint:'outbreak:lepto:'+n,url:'https://publichealth.lacounty.gov/vet/'+n,published_on:new Date().toISOString().slice(0,10),params:{vaccine_type:'leptospirosis',area:'Silver Lake',postal_codes:['90026']},...extra}])
let r=JSON.parse(sql(asService(`select public.pazo_vigilante_ingest('nws_la','${outbreak(1)}'::jsonb)`)))
check(r.drafted===1,'an outbreak that reaches pets becomes a draft')
check(sql(`select count(*) from public.notifications where type='admin_vigilante_pending' and user_id='${admin}'`)==='1','administrators are told a draft is waiting')
let inbox=JSON.parse(sql(as(admin,`select public.pazo_vigilante_inbox()`)))
const draft=inbox.drafts[0]
check(draft.counts.pets.current===1&&draft.counts.pets.expired===1&&draft.counts.pets.unregistered===1&&draft.counts.pets.no_date===1,'per-pet relevance: current, expired, unregistered and completed-without-date are told apart')
check(draft.counts.pets.insufficient===1,'a household without postal code counts as insufficient data, not as a recipient')
check(draft.counts.notified_users===3&&draft.counts.push_users===2,'counts before sending: 3 notices, 2 pushes (one person turned health alerts off)')
check(!JSON.stringify(inbox).includes(beto)&&!JSON.stringify(inbox).includes('Rex'),'the inbox shows counts, never identities')
check(draft.body_es.includes('leptospirosis')&&draft.body_es.includes(draft.source_name)&&draft.body_en.includes('leptospirosis'),'the ES/EN templates name the source and the disease')

r=JSON.parse(sql(asService(`select public.pazo_vigilante_ingest('nws_la','${outbreak(2,{external_id:'ext-dup',fingerprint:'outbreak:lepto:1'})}'::jsonb)`)))
check(sql(`select status from vigilante_private.findings where external_id='ext-dup'`)==='duplicate','a repeat of the same event is a duplicate')
sql(asService(`select public.pazo_vigilante_ingest('nws_la','${outbreak(3)}'::jsonb)`))
check(sql(`select count(*) from vigilante_private.findings where external_id='ext-3'`)==='1'&&sql(asService(`select public.pazo_vigilante_ingest('nws_la','${outbreak(3)}'::jsonb)`)).includes('"new": 0'),'re-reading a source never inserts the same item twice')
const recallNobody=JSON.stringify([{kind:'recall',external_id:'fda-x',fingerprint:'recall:nobody',url:'https://www.fda.gov/x',published_on:new Date().toISOString().slice(0,10),params:{brand:'Nobody Brand',product:'Dog Food',reason:'Mold'}}])
sql(asService(`select public.pazo_vigilante_ingest('fda_recalls','${recallNobody}'::jsonb)`))
check(sql(`select status from vigilante_private.findings where external_id='fda-x'`)==='irrelevant','a recall of a brand nobody feeds is archived without a draft')
const old=JSON.stringify([{kind:'heat',external_id:'heat-old',fingerprint:'heat:old',url:'https://api.weather.gov/alerts/old',published_on:'2026-01-01',expires_at:'2026-01-02T00:00:00Z',params:{}}])
sql(asService(`select public.pazo_vigilante_ingest('nws_la','${old}'::jsonb)`))
check(sql(`select status from vigilante_private.findings where external_id='heat-old'`)==='expired','an expired source item never becomes a draft')
sql(asService(`select public.pazo_vigilante_ingest('nws_la','${outbreak(4)}'::jsonb)`))
sql(asService(`select public.pazo_vigilante_ingest('nws_la','${outbreak(5)}'::jsonb)`))
check(sql(`select status from vigilante_private.findings where external_id='ext-4'`)==='drafted'&&sql(`select status from vigilante_private.findings where external_id='ext-5'`)==='capped','at most three drafts a day; the rest are capped')

// Decisions are recorded on the server; approving as-is needs no second factor.
rejects(as(ana,`select public.pazo_vigilante_decide('${draft.id}','approve')`),/Administrator required/,'no user can approve')
rejects(as(admin,`select public.pazo_vigilante_edit('${draft.id}','{"title_es":"Otro"}')`),/Fresh second factor required/,'editing without a fresh second factor is refused by the server')
const fresh={aal:'aal2',amr:[{method:'totp',timestamp:Math.floor(Date.now()/1000)-30}]}
rejects(as(admin,`select public.pazo_vigilante_edit('${draft.id}','{"audience_species":["perro","gato"]}')`,fresh),/Audience can only narrow/,'the audience can narrow but never widen')
check(sql(as(admin,`select public.pazo_vigilante_edit('${draft.id}','{"title_en":"Leptospirosis cases reported near Silver Lake"}')`,fresh))==='t','a fresh TOTP lets the administrator edit')
check(sql(`select count(*) from vigilante_private.audit where action='edit'`)==='1','edits are audited with the change')
check(sql(as(admin,`select public.pazo_vigilante_test('${draft.id}')`))==='t'&&sql(`select count(*) from public.notifications where user_id='${admin}' and type='health_alert'`)==='1','a test reaches only the administrator')

r=JSON.parse(sql(as(admin,`select public.pazo_vigilante_decide('${draft.id}','approve')`)))
check(r.notified===3,'approval notifies exactly the expired, unregistered and no-date owners')
const notices=JSON.parse(sql(`select json_agg(json_build_object('u',user_id,'reason',alert_reason,'vaccine',alert_vaccine_type)) from public.notifications where type='health_alert' and source_id='${r.post}'`))
check(!notices.some(n=>n.u===ana),'a pet with a current vaccine receives nothing')
check(notices.find(n=>n.u===beto).reason==='expired'&&notices.find(n=>n.u===carla).reason==='unregistered'&&notices.find(n=>n.u===eva).reason==='unregistered','reasons are stored per pet; a dose without date asks instead of concluding')
check(sql(`select count(*) from public.notifications where source_id='${r.post}' and (title ilike '%Rex%' or body ilike '%Rex%')`)==='0','stored notice text never contains the pet name')
check(sql(`select count(*) from push_private.outbox o join public.notifications n on n.id=o.notification_id where n.source_id='${r.post}'`)==='2','pushes respect subscriptions and the health-alert preference')
check(sql(`select bool_and(o.next_attempt_at=push_private.next_daytime(n.created_at)) from push_private.outbox o join public.notifications n on n.id=o.notification_id where n.source_id='${r.post}'`)==='t','pushes wait out the 21:00-08:00 quiet hours')
check(sql(`select push_private.next_daytime('2026-11-03 22:30:00-08') = '2026-11-04 08:00:00-08'::timestamptz and push_private.next_daytime('2026-11-03 12:00:00-08') = '2026-11-03 12:00:00-08'::timestamptz`)==='t','quiet hours are computed in Los Angeles time')
check(sql(`select count(*) from public.notifications where type='admin_vigilante_approved'`)==='1','every approval tells the administrators')
check(sql(`select status from vigilante_private.drafts where id='${draft.id}'`)==='sent'&&sql(`select count(*) from vigilante_private.audit where action='approve'`)==='1','the decision and its exact text are recorded')
rejects(as(admin,`select public.pazo_vigilante_decide('${draft.id}','approve')`),/not pending/,'a draft is approved only once')

// The feed and the answers.
const feed=user=>JSON.parse(sql(as(user,`select coalesce(json_agg(id),'[]') from public.get_official_feed((select id from public.pets where owner_id='${user}' order by created_at limit 1))`)))
check(feed(carla).includes(r.post),'the official post appears in the feed of a matching pet')
check(!feed(dani).includes(r.post),'a cat does not see a dog outbreak')
rejects(as(ana,`select * from public.get_official_feed('${pet.rex}')`),/not owned/,'nobody reads the feed as another person’s pet')
const notice=sql(`select id from public.notifications where user_id='${carla}' and source_id='${r.post}'`)
check(sql(as(carla,`select public.pazo_answer_health_alert('${notice}','has_it')`))==='t','the owner answers from the notice')
check(sql(as(carla,`select public.pazo_answer_health_alert('${notice}','unsure')`))==='f','an answer is recorded only once')
check(sql(as(beto,`select public.pazo_answer_health_alert('${notice}','unsure')`))==='f','nobody answers someone else’s notice')
check(sql(as(carla,`select public.toggle_official_post_like('${r.post}')->>'likes'`))==='1','likes count per person')

// Cancelling stops what has not gone out.
const results=JSON.parse(sql(as(admin,`select public.pazo_vigilante_results('${draft.id}')`)))
check(results.notified===3&&results.answers.has_it===1,'results are counts only')
const cancelled=JSON.parse(sql(as(admin,`select public.pazo_vigilante_cancel('${draft.id}')`)))
check(cancelled.dropped_pushes>=1,'cancelling drops pushes not yet sent')
check(sql(`select count(*) from public.notifications where source_id='${r.post}' and read_at is null`)==='0','unread notices are removed; answered ones remain')
check(!feed(carla).includes(r.post),'a cancelled alert leaves the feed')

// Medium-priority weekly cap and low priority.
const heat=n=>JSON.stringify([{kind:'heat',external_id:'heat-'+n,fingerprint:'heat:la:'+n,url:'https://api.weather.gov/alerts/'+n,published_on:new Date().toISOString().slice(0,10),params:{area:'Los Angeles County'}}])
sql(`update vigilante_private.drafts set created_at=now()-interval '2 days'`)
for(const n of [1,2,3]){
 sql(asService(`select public.pazo_vigilante_ingest('nws_la','${heat(n)}'::jsonb)`))
 const d=sql(`select id from vigilante_private.drafts where status='pending' order by created_at desc limit 1`)
 sql(as(admin,`select public.pazo_vigilante_decide('${d}','approve')`))
}
check(sql(`select count(*) from public.notifications n join public.official_posts o on o.id=n.source_id where n.user_id='${ana}' and o.priority='medium'`)==='2','at most two medium alerts a week per person; the third stays in the feed')
sql(`update vigilante_private.drafts set created_at=now()-interval '2 days'`)
sql(asService(`select public.pazo_vigilante_ingest('nws_la','${heat(4)}'::jsonb)`))
const low=sql(`select id from vigilante_private.drafts where status='pending' order by created_at desc limit 1`)
sql(as(admin,`select public.pazo_vigilante_edit('${low}','{"priority":"low"}')`,fresh))
const lowResult=JSON.parse(sql(as(admin,`select public.pazo_vigilante_decide('${low}','approve')`)))
check(lowResult.notified===0&&lowResult.post,'low priority publishes to the feed only, without notices')

// Rejection teaches visible rules.
sql(`update vigilante_private.drafts set created_at=now()-interval '2 days'`)
sql(asService(`select public.pazo_vigilante_ingest('fda_recalls','${JSON.stringify([{kind:'recall',external_id:'fda-acme',fingerprint:'recall:acme',url:'https://www.fda.gov/acme',published_on:new Date().toISOString().slice(0,10),params:{brand:'Acme Pet Foods',product:'Dog Food',reason:'Salmonella'}}])}'::jsonb)`))
const recall=sql(`select id from vigilante_private.drafts where kind='recall' and status='pending'`)
check(recall.length>0,'a recall of a brand someone feeds becomes a draft')
sql(as(admin,`select public.pazo_vigilante_decide('${recall}','reject','doubtful_source')`))
check(sql(`select trust from vigilante_private.sources where key='fda_recalls'`)==='2','a doubtful-source rejection lowers that source’s trust')

// Source failures, reminders and the worker token.
for(let i=0;i<4;i++)sql(asService(`select public.pazo_vigilante_source_failed('nws_la','HTTP 503')`))
check(sql(`select count(*) from public.notifications where type='system' and user_id='${admin}'`)==='1','three failures in a row alert the administrators once')
sql(`update vigilante_private.drafts set created_at=now()-interval '1 day'`)
sql(asService(`select public.pazo_vigilante_ingest('fda_recalls','${JSON.stringify([{kind:'recall',external_id:'fda-acme2',fingerprint:'recall:acme2',url:'https://www.fda.gov/acme2',published_on:new Date().toISOString().slice(0,10),params:{brand:'Acme Pet Foods',product:'Treats',reason:'Mold'}}])}'::jsonb)`))
sql(`update vigilante_private.drafts set expires_at=now()-interval '1 minute' where status='pending' and kind<>'recall'`)
sql(`update vigilante_private.drafts set created_at=now()-interval '31 minutes' where status='pending' and kind='recall'`)
sql(`update vigilante_private.sources set last_checked_at=null where key='nws_la'`)
sql('select vigilante_private.tick()')
check(sql(`select count(*) from public.notifications where type='admin_vigilante_pending' and title like '%urgente%'`)==='1','an urgent draft reminds the administrators after 30 minutes')
check(sql(`select count(*) from vigilante_private.drafts where status='expired'`)!=='0','drafts past their expiry are archived as expired without approval')
check(sql(`select count(*) from net.calls where url like '%pazo-vigilante-worker'`)==='1','a due source wakes the worker with a single-use token')
const token=JSON.parse(sql(`select headers from net.calls order by id desc limit 1`)).authorization.replace('Bearer ','')
check(sql(asService(`select public.pazo_vigilante_worker_admit('${token}')`))==='t'&&sql(asService(`select public.pazo_vigilante_worker_admit('${token}')`))==='f','the worker token works exactly once')
rejects(as(ana,`select public.pazo_vigilante_worker_admit('${token}')`),/permission denied/,'users cannot call the worker admission')

// Manual mode, then OFF again.
const manual=sql(as(admin,`select public.pazo_vigilante_manual('outbreak','https://publichealth.lacounty.gov/vet/lepto.htm','Condado de Los Ángeles',current_date,'{"vaccine_type":"rabies","area":"Echo Park"}')`))
check(/^[0-9a-f-]{36}$/.test(manual),'a pasted official link becomes a draft through the same templates')
check(sql(`select source_name from vigilante_private.drafts where id='${manual}'`)==='Condado de Los Ángeles','the draft names the authority, not the tool')
rejects(as(admin,`select public.pazo_vigilante_manual('outbreak','http://insecure.example','X',current_date,'{"vaccine_type":"rabies"}')`),/https link required/,'only https official links are accepted')
sql(as(admin,`select public.pazo_vigilante_set_enabled(false)`))
rejects(as(admin,`select public.pazo_vigilante_decide('${manual}','approve')`),/Vigilante is off/,'with the Vigilante off nothing is published')
check(sql(`select count(*) from public.notifications n where n.type='health_alert' and n.title ilike '%Max%'`)==='0','no stored alert ever carries a pet name')
console.log(`\n${checks} Vigilante PG17 checks passed`)

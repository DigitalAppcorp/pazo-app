// Strictly local read-only synthetic Supabase seam for QA fixtures.
// This module is imported ONLY from supabase/tests/visual/browser-harness.html.
// Never ship to PAZO production or accept a hosted session/token.
const RESEARCH_USER='00000000-0000-4000-8000-00000000a001';
const NOW='2026-10-25T19:00:00.000Z';
const communityRows=Object.freeze([
 {id:'00000000-0000-4000-8000-00000000c001',owner_user_id:RESEARCH_USER,
  name:'Paseos de prueba',description:'Encuentros para mascotas — comunidad sintética de QA.',
  category:'Paseos',species:'perro',zone:'Área de demostración',
  image_url:null,image_storage_path:null,rules:'Respeto y bienestar.',status:'active',
  members_count:8,created_at:NOW,updated_at:NOW},
 {id:'00000000-0000-4000-8000-00000000c002',owner_user_id:RESEARCH_USER,
  name:'Amigos de mascotas',description:'Grupo ficticio solo para validar la vista de comunidades.',
  category:'Comunidad',species:null,zone:'Los Ángeles — demostración',
  image_url:null,image_storage_path:null,rules:'Compartir con respeto.',status:'active',
  members_count:12,created_at:NOW,updated_at:NOW}
]);
const syntheticAdminOverview=Object.freeze({
 environment:'sandbox',as_of:NOW,period_days:30,
 people:{registered:8,new_7d:2,new_30d:5,with_pet:5,without_pet:3,pets:7,posts:14,comments:11,communities:2},
 activity:{tracking_since:'2026-10-01',today:3,last_7d:15,last_30d:43,active_period:5,
  total_user_days:55,module_counts:{feed:20,places:12,communities:10,profile:8,care:5,documents:2}},
 support:{sandbox_verified_periods:3,sandbox_gross_minor:897,sandbox_paid_accounts:2,
  sandbox_covered_accounts:2,sandbox_held_periods:0,checkout_attempts:4,
  attempts_without_verified_period:1,live_revenue_minor:null,live_verified:false},
 experiments:{tracked_views:27,interested_accounts:9,intent_votes:6,place_events:5,search_events:4},
 resources:{database_bytes:7300000,stored_objects:7,storage_estimated_bytes:410000,
  provider_egress_bytes:null,provider_quota_bytes:null,provider_billing_amount:null,
  note:'SYNTHETIC QA FIXTURE — no hosting metrics'}
});
const syntheticUsers=Object.freeze([
 {user_id:RESEARCH_USER,email:'demo-user@example.invalid',created_at:NOW,
  pet_count:1,pets:[{id:'00000000-0000-4000-8000-000000000001',name:'Luna QA',species:'perro'}],
  active_days_30:5,last_recorded_day:'2026-10-24',ever_sandbox_paid:true,
  has_verified_sandbox_coverage:true,unverified_checkout_attempts:0},
 {user_id:'00000000-0000-4000-8000-00000000a002',email:'demo-two@example.invalid',created_at:NOW,
  pet_count:2,pets:[{id:'00000000-0000-4000-8000-000000000003',name:'Max QA',species:'gato'}],
  active_days_30:2,last_recorded_day:'2026-10-20',ever_sandbox_paid:false,
  has_verified_sandbox_coverage:false,unverified_checkout_attempts:1}
]);
const syntheticExperiments=Object.freeze([
 {key:'events',name:'Eventos',viewers:27,interested:12,intent_votes:8,interest_rate:.444,
  confidence:'directional',priority_score:42,choices:[{option:'use',votes:5},{option:'create',votes:3}]},
 {key:'places',name:'Lugares',viewers:21,interested:8,intent_votes:5,interest_rate:.381,
  confidence:'directional',priority_score:36,choices:[{option:'explore',votes:5}]}
]);
const noWrite=()=>{throw Error('PAZO VISUAL QA BLOCK: mutations are forbidden')}
const typed=(data)=>({data,error:null,count:Array.isArray(data)?data.length:null,status:200});
const noData=()=>({data:null,error:{message:'Synthetic QA: unsupported read'},count:0,status:400});
function fakeBuilder(table,state){
 let mode='list',limit=200,field='',value=null;
 const query={
  select(){return query},eq(k,v){field=k;value=v;return query},neq(){return query},
  is(){return query},gte(){return query},lte(){return query},ilike(){return query},
  or(){return query},order(){return query},range(_from,to){limit=to+1;return query},
  limit(n){limit=n;return query},in(){return query},
  single(){mode='single';return query},maybeSingle(){mode='single';return query},
  insert:noWrite,update:noWrite,delete:noWrite,upsert:noWrite,
  then(resolve,reject){
   let rows=[];
   if(table==='communities')rows=communityRows.filter(x=>!field||x[field]===value);
   if(table==='community_memberships')rows=[{community_id:communityRows[0].id,user_id:RESEARCH_USER,
     role:'owner',display_pet_id:'00000000-0000-4000-8000-000000000001',joined_at:NOW}];
   if(table==='pets'&&state==='profile')rows=[{id:'00000000-0000-4000-8000-000000000001',
     name:'Luna de prueba',species:'perro',age:'3',photo_url:null,created_at:NOW,
     bio:'Perfil totalmente sintético para investigación UX.',breed:'Mestiza',gender:'hembra',is_lost:false}];
   return Promise.resolve(typed(mode==='single'?rows[0]??null:rows.slice(0,limit))).then(resolve,reject);
  }
 };
 return query;
}
export function installSyntheticReadGateway(supabase,scene) {
 const enabled=scene.startsWith('admin-')||scene==='communities-populated'||scene==='search-active'||scene==='search-filter-people';
 if(!enabled)return;
 if(!import.meta.env.DEV||!['127.0.0.1','localhost'].includes(location.hostname))
   throw Error('Gateway may only be installed on development loopback');
 const makeResult=(data)=>Promise.resolve(typed(data));
 supabase.auth.getUser=async()=>({data:{user:{id:RESEARCH_USER,email:'qa@example.invalid'}},error:null});
 supabase.from=(table)=>fakeBuilder(table,scene.startsWith('pet-')?'profile':'community');
 supabase.rpc=(fn,args)=>{
   if(fn==='pazo_admin_overview')return makeResult({...syntheticAdminOverview,period_days:args?.p_days??30});
   if(fn==='pazo_admin_users')return makeResult(syntheticUsers);
   if(fn==='pazo_admin_experiments')return makeResult(syntheticExperiments);
   if(fn==='pazo_admin_voters'||fn==='pazo_admin_audience')return makeResult([]);
   if(fn==='pazo_is_admin')return makeResult(true);
   // Read-only QA: intentionally no permissions to invoke any other RPC.
   return Promise.resolve(noData());
 };
 Object.defineProperty(window,'__PAZO_QA_READ_GATEWAY__',{value:{
   enabled:true,fixture:'synthetic-read-only',scene,allowlist:['pazo_admin_overview',
    'pazo_admin_users','pazo_admin_experiments','pazo_admin_voters','pazo_admin_audience']},writable:false});
}

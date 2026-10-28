import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import React from 'react'
import {create,act} from 'react-test-renderer'
import ts from 'typescript'
import {execFileSync} from 'node:child_process'

// Execute the real App orchestration with deferred services and isolated children.
// No hosted sessions, DB, payments, invitations or network requests.
globalThis.IS_REACT_ACT_ENVIRONMENT=true
const cache=fs.mkdtempSync(path.resolve('node_modules/.cache/pr1a-'))
async function moduleFrom(source,name){
 const file=path.join(cache,name+'.mjs')
 fs.writeFileSync(file,ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023,jsx:ts.JsxEmit.ReactJSX}}).outputText)
 return import(pathToFileURL(file).href)
}
const {createRequestScope}=await moduleFrom(fs.readFileSync('src/lib/requestScope.ts','utf8'),'scope')
const {selectFeedPage}=await moduleFrom(fs.readFileSync('src/features/feed/selectFeedPage.ts','utf8'),'select')
const {advanceFeedCursors}=await moduleFrom(fs.readFileSync('src/features/feed/advanceFeedCursors.ts','utf8'),'cursors')
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}
const pets=['A','B'].map(id=>({id,name:id,species:'perro',isLost:false,photoUrl:'',ownerId:'owner',breed:'',age:''}))
const services={}
let auth={user:{id:'owner'},loading:false},listeners=[],timerCallbacks=[],calls=[],root
let results={}
const call=(name,...args)=>{calls.push([name,...args]);const fn=results[name];return typeof fn==='function'?fn(...args):Promise.resolve(fn)}
const child=name=>props=>React.createElement('pazo-'+name,props)
const base={
 createRequestScope,selectFeedPage,advanceFeedCursors,
 useAuth:()=>auth,AuthProvider:({children})=>children,
 canUseAccountFeatures:(id,demo)=>Boolean(id)&&!demo,
 getInitialLanguage:()=> 'es', applyDocumentLanguage(){},rememberLanguage(){},
 INITIAL_PETS:pets,CARE_HISTORY_PAGE_SIZE:2,DOCUMENTS_PAGE_SIZE:2,
 supporterBenefitsUiEnabled:false, isSupporterAccountHash:()=>false,
 normalizeSupporterPaypalCallback:()=>false,stageMarketingLanding(){},
 getNotificationCommunityId:()=>null,getNotificationSightingId:n=>n.sightingId??null,
 isSupporterNotification:()=>false,wasAuthorDeleted:()=>false,
}
const db={auth:{onAuthStateChange(fn){listeners.push(fn);return {data:{subscription:{unsubscribe(){listeners=listeners.filter(x=>x!==fn)}}}}}},
 from(table){let filter;const q={select(){return q},in(){return q},eq(k,v){filter=v;return q},order(){return q},range(){return q},
 then(a,b){return call(table==='follows'?'follows':'posts',filter).then(a,b)}};return q},
 rpc:async(name,args)=>results['rpc:'+name]?call('rpc:'+name,args):({data:[],error:null})}
base.supabase=db
let source=process.env.PAZO_PR1A_BASELINE==='true'
 ?execFileSync('git',['show','HEAD:src/App.tsx'],{encoding:'utf8'})
 :fs.readFileSync('src/App.tsx','utf8')
const ast=ts.createSourceFile('App.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[]
for(const n of ast.statements){if(!ts.isImportDeclaration(n)||!n.importClause||n.importClause.isTypeOnly||n.moduleSpecifier.text==='react')continue
 const bindings=n.importClause.namedBindings
 if(!bindings||!ts.isNamedImports(bindings))throw Error('unexpected import')
 const names=bindings.elements.filter(x=>!x.isTypeOnly).map(x=>x.name.text)
 for(const name of names){if(name in base)continue
  base[name]=/^[A-Z]/.test(name)?child(name):(...args)=>call(name,...args)
 }
 edits.push([n.getStart(ast),n.end,`const {${names.join(',')}}=globalThis.__PR1A_SERVICES__;`])
}
for(const[a,b,s]of edits.reverse())source=source.slice(0,a)+s+source.slice(b)
// Observe actual state/handlers without exporting a production test interface.
source=source.replace('  if (publicRescueRoute.token) {',`  globalThis.__PR1A_STATE__ = {
  loadMoreFeed, loadMoreCareHistory, loadMoreDocuments, refreshNotifications, handleOpenNotification,
  refreshCareReminders, loadCareForPet, loadDocumentsForPet, loadFeedForPet,
  posts, careHistory, documents, notifications, careReminderItems, unreadNotificationCount,
  isCareHistoryLoading, isDocumentsLoadingMore, isFeedLoadingMore,
  isFeedLoading, feedError, currentPet, petBootstrap,
  }
  if (publicRescueRoute.token) {`)
globalThis.__PR1A_SERVICES__=Object.assign(services,base)
const {default:App}=await moduleFrom(source,'app')
const original={window:globalThis.window,document:globalThis.document,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout}
globalThis.window={location:{hash:'',search:'',hostname:'localhost'},matchMedia:()=>({matches:true}),addEventListener(){},removeEventListener(){},history:{back(){}},setTimeout,clearTimeout}
globalThis.document={addEventListener(){},removeEventListener(){},visibilityState:'visible'}
globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}}
globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=()=>{}
globalThis.setTimeout=(fn)=>{timerCallbacks.push(fn);return timerCallbacks.length}
globalThis.clearTimeout=()=>{}
const flush=async fn=>{await act(async()=>{await fn?.();for(let i=0;i<12;i++)await Promise.resolve()})}
const view=name=>root.root.findByType('pazo-'+name)
const nav=tab=>flush(()=>view('BottomNav').props.onSelectTab(tab))
const switchPet=id=>flush(()=>view('PetView').props.onSelectPet(pets.find(p=>p.id===id)))
async function setup(overrides={}){
 auth={user:{id:'owner'},loading:false};calls=[];timerCallbacks=[]
 results={fetchOwnedPets:pets,follows:{data:[],error:null},posts:{data:[],error:null},
  fetchActiveCareItems:[],fetchCareHistory:[],fetchCareReminderCandidates:[],
  recoverPetDocumentOperations:undefined,fetchPetDocumentsPage:{items:[],total:0},
  fetchNotifications:[],fetchUnreadNotificationCount:0,fetchLatestUnreadSightingNotification:null,...overrides}
 await flush(()=>{root=create(React.createElement(App))})
 await flush(()=>timerCallbacks.splice(0).forEach(fn=>fn()))
}
test.afterEach(async()=>{if(root)await flush(()=>root.unmount());root=null})
test.after(()=>{Object.assign(globalThis,original);fs.rmSync(cache,{recursive:true,force:true})})

test('verified identity unlocks all three tools while feed remains pending',async()=>{
 const feed=deferred();await setup({follows:()=>feed.promise})
 assert.equal(root.root.findAllByType('pazo-BottomNav').length,1)
 for(const[tab,name]of [['comunidades','CommunitiesView'],['mapa','MapView'],['mascota','PetView']]){await nav(tab);assert.ok(view(name))}
 await nav('inicio');assert.match(JSON.stringify(root.toJSON()),/Sincronizando feed/)
 await flush(()=>feed.resolve({data:[],error:null}));assert.ok(view('HomeView'))
})
test('failed care does not block documents, profile or feed; care retry recovers locally',async()=>{
 let fail=true;await setup({fetchActiveCareItems:()=>fail?Promise.reject(Error('offline')):Promise.resolve([{id:'care',petId:'A',dueDate:'2026-10-28'}])})
 assert.ok(view('HomeView'));await nav('mascota');await flush(()=>view('PetView').props.onOpenCareAgenda())
 assert.match(view('CareModal').props.error,/offline/)
 const identityCalls=calls.filter(x=>x[0]==='fetchOwnedPets').length
 fail=false;await flush(()=>view('CareModal').props.onRetry());assert.equal(view('CareModal').props.careItems[0].id,'care')
 assert.equal(calls.filter(x=>x[0]==='fetchOwnedPets').length,identityCalls)
 assert.ok(calls.some(x=>x[0]==='fetchPetDocumentsPage'))
})
test('feed error and retry preserve identity and other tools',async()=>{
 let fail=true;await setup({follows:()=>Promise.resolve({data:[],error:fail?Error('offline'):null})})
 assert.match(JSON.stringify(root.toJSON()),/No pudimos cargar/)
 await nav('mapa');assert.ok(view('MapView'));await nav('inicio')
 fail=false;await flush(()=>root.root.findAllByType('button').find(x=>x.children.includes('Reintentar')).props.onClick())
 assert.ok(view('HomeView'));assert.equal(calls.filter(x=>x[0]==='fetchOwnedPets').length,1)
})
for(const sequence of [['B'],['B','A']])test(`stale care, documents and profile rejected after A -> ${sequence.join(' -> ')}`,async()=>{
 const care=deferred(),docs=deferred(),profile=deferred();let firstCare=true,firstDocs=true,firstProfile=true
 await setup({fetchActiveCareItems:id=>firstCare?(firstCare=false,care.promise):Promise.resolve([{id:'fresh-'+id,petId:id,dueDate:'2026-10-28'}]),
  fetchPetDocumentsPage:id=>firstDocs?(firstDocs=false,docs.promise):Promise.resolve({items:[{id:'fresh-'+id,petId:id}],total:1}),
  posts:()=>firstProfile?(firstProfile=false,profile.promise):Promise.resolve({data:[{id:'fresh-profile',pet_id:'A'}],error:null})})
 await nav('mascota');for(const id of sequence)await switchPet(id)
 await flush(()=>{care.resolve([{id:'obsolete',petId:'A',dueDate:'2026-10-28'}]);docs.resolve({items:[{id:'obsolete'}],total:999});profile.resolve({data:[{id:'obsolete',pet_id:'A'}],error:null})})
 assert.equal(view('PetView').props.documentCount,1)
 assert.ok(!view('PetView').props.careItems.some(x=>x.id==='obsolete'))
 assert.ok(!view('PetView').props.userPosts.some(x=>x.id==='obsolete'))
})
test('old session reminders and notifications cannot populate another account',async()=>{
 const reminders=deferred(),notices=deferred();let first=true,firstNotice=true
 await setup({fetchCareReminderCandidates:()=>first?(first=false,reminders.promise):Promise.resolve([]),fetchNotifications:()=>firstNotice?(firstNotice=false,notices.promise):Promise.resolve([])})
 await flush(()=>{auth={...auth,user:{id:'other'}};root.update(React.createElement(App))})
 await flush(()=>{reminders.resolve([{id:'obsolete',petId:'A',dueDate:'2020-01-01',reminderDaysBefore:1,timezone:'UTC'}]);notices.resolve([{id:'obsolete'}])})
 await nav('mascota');assert.equal(view('PetView').props.careReminderItem,undefined)
 assert.ok(!JSON.stringify(root.toJSON()).includes('obsolete'))
})
test('MFA refresh of same user object does not rebootstrap or unmount tool',async()=>{
 await setup();await nav('mascota');const count=calls.filter(x=>x[0]==='fetchOwnedPets').length
 await flush(()=>{auth={...auth,user:{id:'owner',aal:'aal2'}};root.update(React.createElement(App))})
 assert.ok(view('PetView'));assert.equal(calls.filter(x=>x[0]==='fetchOwnedPets').length,count)
})
const state=()=>globalThis.__PR1A_STATE__
test('documents fail independently and retry without restarting identity or feed',async()=>{
 let fail=true;await setup({fetchPetDocumentsPage:()=>fail?Promise.reject(Error('documents offline')):Promise.resolve({items:[{id:'recovered'}],total:1})})
 assert.ok(view('HomeView'));await nav('mascota');assert.match(view('DocumentsModal').props.error,/offline/)
 fail=false;await flush(()=>view('DocumentsModal').props.onRetry())
 assert.equal(view('DocumentsModal').props.documents[0].id,'recovered')
 assert.equal(calls.filter(x=>x[0]==='fetchOwnedPets').length,1)
})
for(const sequence of [['B'],['B','A']])test(`feed stale rejection/finalizer cannot stop current load after A -> ${sequence.join(' -> ')}`,async()=>{
 const first=deferred(),last=deferred();let n=0
 await setup({follows:()=>++n===1?first.promise:last.promise})
 await nav('mascota');for(const id of sequence)await switchPet(id)
 await flush(()=>first.reject(Error('obsolete failure')))
 assert.equal(state().isFeedLoading,true);assert.equal(state().feedError,null)
 await flush(()=>last.resolve({data:[],error:null}));assert.equal(state().isFeedLoading,false)
})
for(const resource of ['care','documents'])test(`${resource} replacement retires pending pagination and its finalizer`,async()=>{
 const old=deferred(),fresh=deferred();let pages=0
 const page=()=>[{id:'first'},{id:'second'}]
 await setup(resource==='care'?{fetchCareHistory:(_id,offset)=>offset===0?Promise.resolve(page()):(++pages===1?old.promise:fresh.promise)}:
  {fetchPetDocumentsPage:(_id,offset)=>offset===0?Promise.resolve({items:page(),total:10}):(++pages===1?old.promise:fresh.promise)})
 const more=()=>resource==='care'?state().loadMoreCareHistory():state().loadMoreDocuments()
 const retry=()=>resource==='care'?state().loadCareForPet('A'):state().loadDocumentsForPet('A')
 const loading=()=>resource==='care'?state().isCareHistoryLoading:state().isDocumentsLoadingMore
 await flush(()=>{void more()});await flush(retry);await flush(()=>{void more()});assert.equal(loading(),true)
 await flush(()=>old.resolve(resource==='care'?[{id:'obsolete'}]:{items:[{id:'obsolete'}],total:10}))
 assert.equal(loading(),true);assert.ok(!JSON.stringify(resource==='care'?state().careHistory:state().documents).includes('obsolete'))
 await flush(()=>fresh.resolve(resource==='care'?[{id:'fresh'}]:{items:[{id:'fresh'}],total:10}))
 assert.equal(loading(),false)
})
test('old mutation cannot refresh another pet after A -> B -> A',async()=>{
 const mutation=deferred();await setup({createCareItem:()=>mutation.promise});await nav('mascota')
 let done;await flush(()=>{done=view('CareModal').props.onCreateCare({title:'pending'})})
 await switchPet('B');await switchPet('A');const count=calls.filter(x=>x[0]==='fetchActiveCareItems').length
 await flush(()=>mutation.resolve());await done
 assert.equal(calls.filter(x=>x[0]==='fetchActiveCareItems').length,count)
})
test('sign out and sign in to same account retire old session responses',async()=>{
 const old=deferred();let n=0;await setup({fetchPetDocumentsPage:()=>++n===1?old.promise:Promise.resolve({items:[],total:0})})
 await flush(()=>{listeners.forEach(fn=>fn('SIGNED_OUT'));auth={...auth,user:null};root.update(React.createElement(App))})
 await flush(()=>{auth={...auth,user:{id:'owner'}};root.update(React.createElement(App))})
 await flush(()=>old.resolve({items:[{id:'obsolete'}],total:999}))
 assert.equal(state().documents.length,0);assert.equal(state().petBootstrap.status,'ready')
})
test('notification refresh while already pending does not strand the request lock',async()=>{
 const old=deferred();let n=0;await setup({fetchNotifications:()=>++n===1?old.promise:Promise.resolve([])})
 await flush(()=>state().refreshNotifications());await flush(()=>old.resolve([]));await flush(()=>state().refreshNotifications())
 assert.equal(n,2)
})
test('batched sign-out/sign-in to the same ID starts a new session lifetime',async()=>{
 const old=deferred();let n=0
 await setup({fetchPetDocumentsPage:()=>++n===1?old.promise:Promise.resolve({items:[],total:0})})
 await flush(()=>{listeners.forEach(fn=>fn('SIGNED_OUT'));auth={...auth,user:{id:'owner'}};root.update(React.createElement(App))})
 await flush(()=>old.resolve({items:[{id:'obsolete-session'}],total:999}))
 assert.equal(calls.filter(x=>x[0]==='fetchOwnedPets').length,2)
 assert.deepEqual(state().documents,[]);assert.equal(state().petBootstrap.status,'ready')
})
test('marking a notification read retires an older refresh and releases its pagination lock',async()=>{
 const old=deferred();let n=0
 const notice={id:'notice',sightingId:'sighting',petId:'A',read:false}
 await setup({fetchNotifications:()=>++n===1?old.promise:Promise.resolve([]),fetchUnreadNotificationCount:5})
 await flush(()=>state().handleOpenNotification(notice))
 await flush(()=>old.resolve([notice]))
 assert.deepEqual(state().notifications,[]);assert.equal(state().unreadNotificationCount,0)
 await flush(()=>state().refreshNotifications());assert.equal(n,2)
})
test('obsolete owned-pet bootstrap cannot replace a new account identity',async()=>{
 const old=deferred();let n=0;const otherPet={...pets[0],id:'C',name:'C'}
 await setup({fetchOwnedPets:()=>++n===1?old.promise:Promise.resolve([otherPet])})
 await flush(()=>{auth={...auth,user:{id:'other'}};root.update(React.createElement(App))})
 await flush(()=>old.resolve(pets));assert.equal(state().currentPet.id,'C')
 assert.equal(state().petBootstrap.userId,'other')
})
test('old feed success cannot publish after A -> B -> A',async()=>{
 const old=deferred();let n=0
 await setup({posts:()=>++n===1?old.promise:Promise.resolve({data:[],error:null})})
 await nav('mascota');await switchPet('B');await switchPet('A')
 await flush(()=>old.resolve({data:[{id:'obsolete',pet_id:'A'}],error:null}))
 assert.deepEqual(state().posts,[]);assert.equal(state().feedError,null)
})
test('feed refresh retires old mutation finalizer without unlocking a newer mutation',async()=>{
 const old=deferred(),fresh=deferred();let n=0
 const row={id:'post',pet_id:'A',pet_name:'A',created_at:'2026-10-28T00:00:00Z',likes:0}
 await setup({posts:{data:[row],error:null},'rpc:register_interaction_signal':()=>++n===1?old.promise:fresh.promise})
 let first,second;await flush(()=>{first=view('HomeView').props.onLikePost('post')})
 await flush(()=>state().loadFeedForPet(pets[0]))
 await flush(()=>{second=view('HomeView').props.onLikePost('post')});assert.equal(n,2)
 await flush(()=>old.resolve({error:Error('obsolete failure')}));await first
 await flush(()=>view('HomeView').props.onLikePost('post'));assert.equal(n,2)
 assert.equal(state().posts[0].isLiked,true)
 await flush(()=>fresh.resolve({error:null}));await second
})
test('request lifetime retires ABA, same-resource refresh, and late finalizers',()=>{
 const scope=createRequestScope(),a=scope.capture('page',true),more=scope.capture('page')
 const fresh=scope.capture('page',true);assert.equal(a(),false);assert.equal(more(),false);assert.equal(fresh(),true)
 scope.invalidate();const b=scope.capture();scope.invalidate();const a2=scope.capture()
 assert.equal(a(),false);assert.equal(b(),false);assert.equal(a2(),true)
})

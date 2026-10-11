import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { create, act } from 'react-test-renderer'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

// Component tests only: synthetic Auth and no browser, database or Storage calls.
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let dbResult={data:[],error:null}
let insertResult={error:null}
let hasUser=true
const calls=[]
const petInputs=[]
globalThis.__PAZO_CLOSURE_TEST_PET_INPUTS__=petInputs
globalThis.__PAZO_CLOSURE_TEST_DB__={
  auth:{getUser:async()=>({data:{user:hasUser?{id:'synthetic-uploader'}:null},error:null})},
  from(table){
    calls.push(['from',table])
    return {insert:async payload=>{calls.push(['insert',payload]);return insertResult},
      delete(){calls.push(['delete',table]);return {eq(column,id){calls.push(['eq',column,id]);return {select:async fields=>{calls.push(['select',fields]);return dbResult}}}}}}
  },
  storage:{from(bucket){return {upload:async path=>{calls.push(['upload',bucket,path]);return {error:null}},
    getPublicUrl:path=>({data:{publicUrl:`https://synthetic.invalid/${bucket}/${path}`}}),
    remove:async()=>{throw Error('Storage deletion is forbidden in closure component tests')}}}},
}
const cacheRoot=path.resolve('node_modules/.cache')
fs.mkdirSync(cacheRoot,{recursive:true})
const compiled=fs.mkdtempSync(path.join(cacheRoot,'pazo-closure-ui-'))
fs.writeFileSync(path.join(compiled,'package.json'),JSON.stringify({type:'module'}))
const syntheticEnv={DEV:false,VITE_SUPABASE_URL:'https://mrybvqdebbgcayuvgkkr.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_test_only'}
const compileDirectory = directory => {
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})) {
    const source=path.join(directory,entry.name)
    if(entry.isDirectory()) {compileDirectory(source);continue}
    if(!/\.tsx?$/.test(entry.name)||/\.d\.ts$/.test(entry.name)) continue
    const relative=path.relative('src',source)
    const normalized=relative.replaceAll('\\','/')
    let code=normalized==='context/AuthContext.tsx'
      ? 'export const useAuth = () => ({ user: null, signUp: async () => "verify_email" })'
      : normalized==='services/supabaseClient.ts' ? 'export const supabase = globalThis.__PAZO_CLOSURE_TEST_DB__'
      : normalized==='services/petService.ts' ? 'export const createPetProfile = async input => { globalThis.__PAZO_CLOSURE_TEST_PET_INPUTS__.push(input); return { ...input, id: "synthetic-pet" } }; export const updatePetProfile = createPetProfile'
      : fs.readFileSync(source,'utf8')
    code=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText
    code=code.replace(/(from\s+|import\s*)(['"])(\.[^'"]+)\2/g,(_all,prefix,quote,specifier)=>{
      const js=specifier.replace(/\.tsx?$/,'.js')
      return prefix+quote+(/\.js$/.test(js)?js:js+'.js')+quote
    }).replaceAll('import.meta.env',JSON.stringify(syntheticEnv)).replaceAll('__PAZO_BUILD_VERSION__',JSON.stringify('0.0.0'))
    const output=path.join(compiled,relative.replace(/\.tsx?$/,'.js'))
    fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,code)
  }
}
compileDirectory('src')
const load=relative=>import(pathToFileURL(path.join(compiled,relative)).href)
const {CreateModal}=await load('components/modals/CreateModal.js')
const {NotificationsModal}=await load('components/modals/NotificationsModal.js')
const {OnboardingView}=await load('components/views/OnboardingView.js')
const {HomeView}=await load('components/views/HomeView.js')
const {PetView}=await load('components/views/PetView.js')
const {createCommunityPost,deleteCommunityPost}=await load('services/communityService.js')
test.after(()=>{
  const target=fs.realpathSync(compiled)
  if(!target.startsWith(fs.realpathSync(cacheRoot)+path.sep)||!path.basename(target).startsWith('pazo-closure-ui-')) throw Error('Unexpected test directory')
  fs.rmSync(target,{recursive:true,force:true})
})
const buttonText = b => b.findAll(n=>typeof n.type==='string').flatMap(n=>n.children.filter(c=>typeof c==='string')).join(' ')
const button = (root, needle) => root.findAllByType('button').find(b=>buttonText(b).includes(needle))

test('T01/T02/T13 real Create menu preserves post/place/lost routes and active pet identity', async () => {
  for (const [name,lang] of [['Synthetic Cat','es'],['Synthetic Dog','en']]) {
    const selected=[]
    let renderer
    await act(async()=>{renderer=create(React.createElement(CreateModal,{isOpen:true,onClose(){},activePetName:name,lang,onSelectOption:t=>selected.push(t)}))})
    assert.ok(JSON.stringify(renderer.toJSON()).includes(name))
    const root=renderer.root
    const future=button(root,lang==='es'?'Encuentros':'Meetups')
    assert.equal(future.props.disabled,true)
    future.props.onClick()
    for(const label of lang==='es'?['Nueva Publicación','Sugerir un lugar','Mi mascota está perdida']:['New Post','Suggest a place','My pet is lost']) {
      await act(async()=>{button(root,label).props.onClick()})
    }
    assert.deepEqual(selected,['post','lugar','alerta'])
    await act(async()=>renderer.unmount())
  }
})
test('T15 demo Create traversal requests login and never dispatches a real action', async () => {
  const selected=[];let requests=0;let renderer
  await act(async()=>{renderer=create(React.createElement(CreateModal,{isOpen:true,onClose(){},lang:'en',canCreate:false,activePetName:'a sample pet',onRequireAccount:()=>requests++,onSelectOption:t=>selected.push(t)}))})
  for(const label of ['New Post','Suggest a place','My pet is lost']) await act(async()=>button(renderer.root,label).props.onClick())
  assert.equal(requests,3);assert.deepEqual(selected,[])
  assert.match(JSON.stringify(renderer.toJSON()),/Demo: sign in/)
  await act(async()=>renderer.unmount())
})
test('T03 only sighting opens its destination; unsupported Care filter is absent', async () => {
  const opened=[];let renderer
  const base={id:'n1',title:'Sighting title',subtitle:'Synthetic',category:'comunidad',sourceType:'sighting',sourceId:'s1',read:false,timeAgo:'Reciente'}
  await act(async()=>{renderer=create(React.createElement(NotificationsModal,{isOpen:true,onClose(){},lang:'en',notifications:[base,{...base,id:'n2',title:'System title',sourceType:'system',category:'todas'}],onOpenNotification:n=>opened.push(n.sourceId),onLoadMore(){},hasMore:false,isLoadingMore:false}))})
  assert.equal(button(renderer.root,'Care'),undefined)
  assert.equal(button(renderer.root,'System title').props.disabled,true)
  await act(async()=>button(renderer.root,'Sighting title').props.onClick())
  assert.deepEqual(opened,['s1'])
  await act(async()=>button(renderer.root,'Sightings').props.onClick())
  assert.equal(button(renderer.root,'System title'),undefined)
  await act(async()=>renderer.unmount())
})
test('T14 each onboarding step renders localized critical text without changing stored identifiers', () => {
  const needles={A01:['Comenzar','Get started'],A02:['Correo electrónico','Email'],A03:['Edad aproximada','Approximate age'],A04:['Solo visibles por el tutor','Visible only to the guardian'],A05:['Comunidades de gatos','Cat communities']}
  for(const [initialStep,[es,en]] of Object.entries(needles)) {
    const render=lang=>renderToStaticMarkup(React.createElement(OnboardingView,{initialStep,lang,onComplete(){},onSkipToLogin(){},onQuickDemo(){},onToggleLang(){}}))
    assert.ok(render('es').includes(es),initialStep)
    const english=render('en');assert.ok(english.includes(en),initialStep);assert.ok(!english.includes(es),initialStep)
    if(initialStep==='A05') assert.ok(english.includes('value="Los Ángeles"')) // User/state value is not translated.
  }
})
test('T14 English onboarding submits the unchanged Spanish species/interest identifiers', async () => {
  let renderer;let completed=false;petInputs.length=0
  await act(async()=>{renderer=create(React.createElement(OnboardingView,{initialStep:'A03',lang:'en',onComplete:()=>{completed=true},onSkipToLogin(){},onQuickDemo(){},onToggleLang(){}}))})
  const name=renderer.root.findAllByType('input').find(i=>i.props.placeholder==='E.g. Luna, Bruno, Cloud...')
  await act(async()=>name.props.onChange({target:{value:'Synthetic Dog'}}))
  await act(async()=>button(renderer.root,'Dog').props.onClick())
  await act(async()=>button(renderer.root,'Continue').props.onClick())
  await act(async()=>button(renderer.root,'Save and continue').props.onClick())
  await act(async()=>button(renderer.root,'Cat communities').props.onClick())
  await act(async()=>button(renderer.root,'Nutrition and natural food').props.onClick())
  await act(async()=>button(renderer.root,'Discover Pazo').props.onClick())
  assert.equal(completed,true);assert.equal(petInputs.length,1)
  assert.equal(petInputs[0].species,'perro')
  assert.equal(petInputs[0].name,'Synthetic Dog')
  assert.deepEqual(petInputs[0].interests,['Lugares aptos para mascotas','Nutrición y alimentación natural'])
  await act(async()=>renderer.unmount())
})
test('T15 demo profile Edit requests a real account without exposing an upload form', async () => {
  let renderer;let requests=0;petInputs.length=0
  const pet={id:'synthetic-pet',name:'Synthetic Cat',species:'gato',photoUrl:'',age:'1'}
  await act(async()=>{renderer=create(React.createElement(PetView,{currentPet:pet,canManagePet:false,onRequireAccount:()=>requests++,canModerate:false,availablePets:[pet],onSelectPet(){},onPetUpdated(){},onAddPet(){},careItems:[],onCompleteCare(){},onOpenQRPassport(){},onOpenCareAgenda(){},documentCount:0,onOpenDocuments(){},onOpenLostAlert(){},lang:'en'}))})
  await act(async()=>button(renderer.root,'Edit').props.onClick())
  assert.equal(requests,1)
  assert.equal(renderer.root.findAllByType('input').filter(i=>i.props.type==='file').length,0)
  assert.deepEqual(petInputs,[])
  assert.ok(renderer.root.findAllByType('a').some(a=>a.props.href==='mailto:appdigital.corp@gmail.com'))
  await act(async()=>renderer.unmount())
})
test('T04 mixed feed label is For you and demo nearby interest cannot write', async () => {
  calls.length=0
  let renderer
  await act(async()=>{renderer=create(React.createElement(HomeView,{posts:[],canReport:false,onLikePost(){},onSavePost(){},onAddComment:async()=>false,onLoadComments:async()=>true,lang:'en',ownedPetIds:[],onSelectPetProfile(){}}))})
  assert.ok(button(renderer.root,'For you'))
  await act(async()=>button(renderer.root,'Nearby').props.onClick())
  assert.equal(button(renderer.root,'Sign in to express interest').props.disabled,true)
  await act(async()=>button(renderer.root,'Sign in to express interest').props.onClick())
  assert.match(JSON.stringify(renderer.toJSON()),/location-based feed/)
  assert.deepEqual(calls,[])
  await act(async()=>renderer.unmount())
})
test('T16 actual service rejects unconfirmed DELETE and uses only the database-returned path', async () => {
  calls.length=0;hasUser=true
  const post={id:'synthetic-post',photoStoragePath:'forged-client-path'}
  dbResult={data:[],error:null}
  await assert.rejects(deleteCommunityPost(post),/not confirmed/)
  dbResult={data:[{id:post.id,community_id:'synthetic-community',photo_storage_path:'verified/server/path.webp'}],error:null}
  assert.deepEqual(await deleteCommunityPost(post),{mediaCleanupPending:true,storagePath:'verified/server/path.webp'})
  assert.ok(calls.some(c=>c[0]==='select' && c[1]==='id,community_id,photo_storage_path'))
  hasUser=false
  calls.length=0
  await assert.rejects(deleteCommunityPost(post),/sesión activa/)
  assert.deepEqual(calls,[])
  hasUser=true
})
test('T16 actual upload succeeds normally and keeps the exact reference after a lost insert response', async () => {
  const input={communityId:'synthetic-community',authorPetId:'synthetic-pet',body:'Synthetic body',imageFile:new File(['synthetic'],'photo.webp',{type:'image/webp'})}
  calls.length=0;insertResult={error:null}
  await createCommunityPost(input)
  assert.ok(calls.some(c=>c[0]==='insert' && c[1].body==='Synthetic body'))
  calls.length=0;insertResult={error:Error('lost insert response')}
  await assert.rejects(createCommunityPost(input),e=>{
    const uploaded=calls.find(c=>c[0]==='upload')
    return e.name==='CommunityMediaPendingError' && e.storagePath===uploaded[2]
  })
  insertResult={error:null}
})

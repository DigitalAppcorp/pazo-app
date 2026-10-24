import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { create, act } from 'react-test-renderer'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

// Component tests only: synthetic Auth, public RPC and storage; no network or real DB calls.
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let dbResult={data:[],error:null}
let insertResult={error:null}
let hasUser=true
const calls=[]
const petInputs=[]
globalThis.__PAZO_CLOSURE_TEST_PET_INPUTS__=petInputs
globalThis.__PAZO_CLOSURE_TEST_DB__={
  auth:{getUser:async()=>({data:{user:hasUser?{id:'synthetic-uploader'}:null},error:null}),
    onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
  // L1 displays the real public wall by default, even without a build flag.
  // Return an empty, consent-safe synthetic result; never query hosted Supabase.
  rpc:async(name,args)=>{
    calls.push(['rpc',name])
    if(name==='pazo_supporter_public_wall'&&args?.p_limit===48)return {data:[],error:null}
    return {data:null,error:{message:'unmocked_rpc'}}
  },
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
    if(entry.name.endsWith('.mjs')) {
      const output=path.join(compiled,path.relative('src',source))
      fs.mkdirSync(path.dirname(output),{recursive:true});fs.copyFileSync(source,output)
      continue
    }
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
      return prefix+quote+(/\.(?:js|mjs)$/.test(js)?js:js+'.js')+quote
    }).replaceAll('import.meta.env',JSON.stringify(syntheticEnv)).replaceAll('__PAZO_BUILD_VERSION__',JSON.stringify('0.0.0'))
    const output=path.join(compiled,relative.replace(/\.tsx?$/,'.js'))
    fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,code)
  }
}
compileDirectory('src')
const load=relative=>import(pathToFileURL(path.join(compiled,relative)).href)
const {CreateModal}=await load('components/modals/CreateModal.js')
const {NotificationsModal}=await load('components/modals/NotificationsModal.js')
const {mapNotificationRow,getNotificationCommunityId,getNotificationSightingId}=await load('features/notifications/notificationSource.js')
const {OnboardingView}=await load('components/views/OnboardingView.js')
const {HomeView}=await load('components/views/HomeView.js')
const {PetView}=await load('components/views/PetView.js')
const {BottomNav}=await load('components/BottomNav.js')
const {PublicProfileView}=await load('components/views/PublicProfileView.js')
const {SupporterThemePreviewPicker,SupporterProfileBackdrop,SUPPORTER_PROFILE_THEMES}=await load('features/supporter/components/SupporterProfileThemes.js')
const {SupporterThemePreviewPanel}=await load('features/supporter/components/SupporterThemePreviewPanel.js')
const {SupporterSandboxBenefitsStatus}=await load('features/supporter/components/SupporterSandboxBenefitsStatus.js')
const {PublicProfileTabs}=await load('features/profile/components/PublicProfileTabs.js')
const {GratitudeWallPreview}=await load('features/supporter/components/GratitudeWallPreview.js')
const {GratitudeWallScene}=await load('features/supporter/components/GratitudeWallScene.js')
const {GratitudeParticipationPreview}=await load('features/supporter/components/GratitudeParticipationPreview.js')
const {LiquidChoiceTabs}=await load('components/ui/LiquidChoiceTabs.js')
const {LiquidSearchFilters}=await load('features/search/components/LiquidSearchFilters.js')
const {MessagesModal}=await load('components/modals/MessagesModal.js')
const {CommunitiesEmptyState}=await load('features/communities/components/CommunitiesEmptyState.js')
const {CommunityLifestyleHero}=await load('features/communities/components/CommunityLifestyleHero.js')
const {ImmersivePlacesStage}=await load('features/places/components/ImmersivePlacesStage.js')
const {RescuePassportHero}=await load('features/rescue/components/RescuePassportHero.js')
const {LostAlertReview}=await load('features/rescue/components/LostAlertReview.js')
const {ActiveLostAlertPanel}=await load('features/rescue/components/ActiveLostAlertPanel.js')
const {createCommunityPost,deleteCommunityPost}=await load('services/communityService.js')
test.after(()=>{
  const target=fs.realpathSync(compiled)
  if(!target.startsWith(fs.realpathSync(cacheRoot)+path.sep)||!path.basename(target).startsWith('pazo-closure-ui-')) throw Error('Unexpected test directory')
  fs.rmSync(target,{recursive:true,force:true})
})
const buttonText = b => b.findAll(n=>typeof n.type==='string').flatMap(n=>n.children.filter(c=>typeof c==='string')).join(' ')
const button = (root, needle) => root.findAllByType('button').find(b=>buttonText(b).includes(needle))





test('F13 liquid selector keeps both pet utility and three community tabs, in Spanish and English', async () => {
  for(const [variant,lang,options] of [
    ['community','es',[['posts','Publicaciones'],['info','Información'],['members','Miembros']]],
    ['community','en',[['posts','Posts'],['info','Info'],['members','Members']]],
    ['pet','es',[['menu','Menú y Utilidades'],['myposts','Mis Publicaciones (0)']]],
    ['pet','en',[['menu','Menu & Utilities'],['myposts','My Posts (0)']]],
  ]) {
    const calls=[]
    const choices=options.map(([id,label])=>({id,label}))
    const rootProps={variant,active:choices[0].id,choices,onChange:id=>calls.push(id),accessibleLabel:lang==='es'?'Secciones':'Sections'}
    let ui
    await act(async()=>{ui=create(React.createElement(LiquidChoiceTabs,rootProps))})
    const tabs=()=>ui.root.findAllByType('button')
    const indicator=()=>ui.root.findAll(n=>typeof n.props.className==='string'&&n.props.className.includes('pazo-choice-indicator pointer-events-none'))[0]
    assert.deepEqual(tabs().map(buttonText),choices.map(c=>c.label))
    assert.equal(tabs().length,choices.length)
    assert.equal(tabs()[0].props['aria-pressed'],true)
    assert.equal(indicator().props['data-active'],choices[0].id)
    assert.equal(indicator().props['aria-hidden'],'true')
    for(const [index,option] of choices.entries()) {
      await act(async()=>{tabs()[index].props.onClick()})
      assert.equal(calls.at(-1),option.id)
      await act(async()=>{ui.update(React.createElement(LiquidChoiceTabs,{...rootProps,active:option.id}))})
      assert.equal(indicator().props['data-active'],option.id)
      assert.equal(tabs().filter(b=>b.props['aria-pressed']).length,1)
      assert.equal(tabs()[index].props['aria-current'],'page')
    }
    await act(async()=>{ui.unmount()})
  }
  const community=fs.readFileSync('src/components/views/CommunityDetailView.tsx','utf8')
  const pet=fs.readFileSync('src/components/views/PetView.tsx','utf8')
  assert.ok(community.includes('variant="community"')&&community.includes('onChange={setActiveTab}'))
  assert.ok(pet.includes('variant="pet"')&&pet.includes('onChange={setActiveTab}'))
  for(const tab of ["activeTab === 'posts'","activeTab === 'info'","activeTab === 'members'"])assert.ok(community.includes(tab))
  assert.ok(pet.includes("activeTab === 'myposts'"))
  assert.ok(pet.includes('!isEditing && ('),'Edit mode still hides selector')
})

test('F13 liquid search filter preserves horizontal scrolling, four results types and original telemetry handler', async () => {
  for(const [lang,names] of [
    ['es',['Todos','Mascotas','Comunidades','Lugares']],
    ['en',['All','Pets','Communities','Places']]
  ]) {
    const seen=[],all=['all','pet','community','place']
    const props={filter:'all',lang,onChange:filter=>seen.push(filter)}
    let ui
    await act(async()=>{ui=create(React.createElement(LiquidSearchFilters,props))})
    const buttons=()=>ui.root.findAllByType('button')
    assert.deepEqual(buttons().map(buttonText),names)
    assert.deepEqual(buttons().map(b=>b.props['aria-pressed']),[true,false,false,false])
    // React-test-renderer has no DOM offset measurements; fallback active pill stays visible.
    assert.ok(buttons()[0].props.className.includes('bg-[#204E4A]'))
    for(const [index,id] of all.entries()) {
      await act(async()=>{buttons()[index].props.onClick()})
      assert.equal(seen.at(-1),id)
      await act(async()=>{ui.update(React.createElement(LiquidSearchFilters,{...props,filter:id}))})
      assert.equal(buttons()[index].props['aria-pressed'],true)
      assert.equal(buttons().filter(b=>b.props['aria-pressed']).length,1)
    }
    await act(async()=>{ui.unmount()})
  }
  const view=fs.readFileSync('src/components/views/GlobalSearchView.tsx','utf8')
  const filter=fs.readFileSync('src/features/search/components/LiquidSearchFilters.tsx','utf8')
  const css=fs.readFileSync('src/index.css','utf8')
  assert.ok(view.includes('<LiquidSearchFilters filter={filter} lang={lang} onChange={handleFilterChange} />'))
  assert.ok(view.includes("eventType: 'search_filter_change'"))
  assert.ok(view.includes("setFilter(nextFilter)"))
  for(const value of ['overflow-x-auto','relative flex w-max min-w-full gap-2','selected.offsetLeft','selected.offsetWidth','ResizeObserver','observer.observe(track)',"addEventListener('resize', update)"])assert.ok(filter.includes(value),value)
  for(const key of ['.pazo-choice-indicator--community[data-active="members"]','.pazo-choice-indicator--pet[data-active="myposts"]','.pazo-search-filter-indicator','width 460ms','prefers-reduced-motion: reduce'])assert.ok(css.includes(key),key)
})
test('F13 social pet profile liquid tabs glide between posts and information, preserving callbacks and accessibility', async () => {
  for(const [lang,first,second] of [['es','Publicaciones','Información'],['en','Posts','Info']]) {
    const selections=[]
    const props={lang,activeTab:'posts',onChange:tab=>selections.push(tab)}
    let ui
    await act(async()=>{ui=create(React.createElement(PublicProfileTabs,props))})
    const tabs=()=>ui.root.findAllByType('button')
    const indicator=()=>ui.root.findAll(n=>n.props.className==='pazo-profile-tab-indicator pointer-events-none')[0]
    assert.deepEqual(tabs().map(buttonText),[first,second])
    assert.equal(tabs().length,2)
    assert.equal(tabs()[0].props['aria-current'],'page')
    assert.equal(tabs()[0].props['aria-pressed'],true)
    assert.equal(tabs()[1].props['aria-pressed'],false)
    assert.equal(indicator().props['data-active'],'posts')
    assert.equal(indicator().props['aria-hidden'],'true')
    await act(async()=>{tabs()[1].props.onClick()})
    assert.deepEqual(selections,['info'])
    await act(async()=>{ui.update(React.createElement(PublicProfileTabs,{...props,activeTab:'info'}))})
    assert.equal(indicator().props['data-active'],'info')
    assert.equal(tabs()[1].props['aria-current'],'page')
    assert.equal(tabs()[1].props['aria-pressed'],true)
    assert.equal(tabs()[0].props['aria-pressed'],false)
    await act(async()=>{tabs()[0].props.onClick()})
    assert.deepEqual(selections,['info','posts'])
    await act(async()=>{ui.unmount()})
  }
  const css=fs.readFileSync('src/index.css','utf8')
  for(const part of ['.pazo-profile-tab-indicator','width: calc((100% - 18px) / 2)','transform: translateX(calc(100% + 6px))','transition: transform 460ms cubic-bezier','background: #204E4A','@keyframes pazoProfileTabSettle','prefers-reduced-motion: reduce','.pazo-profile-tab-indicator { transition: none'])assert.ok(css.includes(part),part)
  const segment=fs.readFileSync('src/features/profile/components/PublicProfileTabs.tsx','utf8')
  const profile=fs.readFileSync('src/components/views/PublicProfileView.tsx','utf8')
  assert.ok(segment.includes("onClick={() => onChange('posts')}"))
  assert.ok(segment.includes("onClick={() => onChange('info')}"))
  assert.ok(profile.includes('<PublicProfileTabs activeTab={activeTab} onChange={setActiveTab} lang={lang} />'))
  assert.ok(profile.includes("activeTab === 'posts' ? ("))
  assert.ok(profile.includes("aria-label={activeTab === 'posts'"),'Posts/info keep their original accessible panel heading')
})

test('F13 Liquid Navigation animates actual tabs without changing the center Create action', async () => {
  const labels={inicio:'Inicio',comunidades:'Comunidades',crear:'Crear',mapa:'Mapa',mascota:'Mi mascota'}
  const selected=[],created=[]
  const props={activeTab:'inicio',labels,onSelectTab:tab=>selected.push(tab),onOpenCreate:()=>created.push('create')}
  let ui
  await act(async()=>{ui=create(React.createElement(BottomNav,props))})
  const buttons=()=>ui.root.findAllByType('button')
  assert.equal(buttons().length,5)
  assert.deepEqual(buttons().map(b=>b.props['aria-label']),Object.values(labels))
  assert.equal(buttons()[0].props['aria-current'],'page')
  assert.ok(buttons().slice(1).every(b=>b.props['aria-current']===undefined))
  const indicator=()=>ui.root.findAll(n=>n.props.className==='pazo-liquid-indicator pointer-events-none')[0]
  const surface=()=>ui.root.findAll(n=>n.props.className==='pazo-liquid-surface pointer-events-none')[0]
  assert.equal(indicator().props.style.left,'10%')
  assert.equal(surface().props.style['--pazo-liquid-center'],'10%')
  assert.equal(indicator().props['aria-hidden'],'true')
  assert.equal(surface().props['aria-hidden'],'true')
  await act(async()=>{buttons()[2].props.onClick()})
  assert.deepEqual(created,['create'])
  assert.deepEqual(selected,[],'Create must not select a navigation tab')
  for(const [i,tab,left] of [[1,'comunidades','30%'],[3,'mapa','70%'],[4,'mascota','90%'],[0,'inicio','10%']]) {
    await act(async()=>{buttons()[i].props.onClick()})
    assert.equal(selected.at(-1),tab)
    await act(async()=>{ui.update(React.createElement(BottomNav,{...props,activeTab:tab}))})
    assert.equal(indicator().props.style.left,left)
    assert.equal(surface().props.style['--pazo-liquid-center'],left,'True carved recess must track orb on every tab')
    assert.equal(buttons()[i].props['aria-current'],'page')
    assert.equal(buttons().filter(b=>b.props['aria-current']==='page').length,1)
    const tabIcons=buttons().filter((_,index)=>index!==2).map(b=>b.findAll(n=>typeof n.props.className==='string'&&n.props.className.includes('pazo-liquid-icon flex'))[0])
    assert.equal(tabIcons.filter(n=>n.props.className.includes('pazo-liquid-icon--active')).length,1,'Exactly one orb icon stays raised')
    assert.equal(tabIcons.filter(n=>n.props.className.includes('pazo-liquid-icon--idle')).length,3,'Only the three inactive tab icons are lowered')
    assert.ok(tabIcons.filter(n=>n.props.className.includes('pazo-liquid-icon--idle')).every(n=>!n.props.className.includes('pazo-liquid-icon--active')))
  }
  await act(async()=>{ui.update(React.createElement(BottomNav,{...props,labels:{
    inicio:'Home',comunidades:'Communities',crear:'Create',mapa:'Map',mascota:'My Pet'
  }}))})
  assert.deepEqual(buttons().map(b=>b.props['aria-label']),['Home','Communities','Create','Map','My Pet'])
  await act(async()=>{ui.unmount()})
  const css=fs.readFileSync('src/index.css','utf8')
  for(const part of ['.pazo-liquid-indicator','.pazo-liquid-surface','@property --pazo-liquid-center','background: #FFFFFF','top: 14px','bottom: -3px','-webkit-mask-image: radial-gradient(circle 30px','mask-image: radial-gradient(circle 30px','transparent 0 29px, #000 30px','transition: --pazo-liquid-center 460ms','background: #204E4A','box-shadow: 0 8px 17px','@keyframes pazoLiquidSettle','prefers-reduced-motion: reduce', '.pazo-liquid-surface, .pazo-liquid-indicator { transition: none','animation: none; transform: translateY(-15px)'])assert.ok(css.includes(part),part)
  assert.ok(css.replaceAll('\r\n','\n').includes('.pazo-liquid-icon--idle {\n  transform: translateY(15px);'),'Idle tab glyphs must align with white bar vertical center')
  const source=fs.readFileSync('src/components/BottomNav.tsx','utf8')
  assert.ok(source.includes("isActive ? 'pazo-liquid-icon--active text-[#E1E53F]' : 'pazo-liquid-icon--idle'"),'Only idle icons are repositioned')
  const surfaceCss=css.split('.pazo-liquid-surface {')[1].split('}')[0]
  assert.ok(surfaceCss.includes('background: #FFFFFF'),'Only navigation surface becomes pure white')
  assert.ok(!surfaceCss.includes('#FFF8EB'),'Previous cream fill must be removed')
  assert.ok(!/border\s*:|outline\s*:|ring\s*:/.test(surfaceCss),'Carved bar must not introduce outlines or borders')
  assert.ok(!css.includes('pazo-liquid-notch'),'Old painted cream notch must not remain')
  assert.ok(!css.includes('background: radial-gradient(circle at 30% 20%'),'Plastic gradient must be removed')
  assert.ok(!css.includes('backdrop-filter: blur(16px)'),'No glass on the new solid orb')
  assert.ok(!css.includes('pazo-liquid-indicator::before'),'No gloss/reflection pseudo-element')
  const orbCss=css.split('.pazo-liquid-indicator {')[1].split('}')[0]
  assert.ok(!/rgba\(40, 124, 99|backdrop-filter|filter: blur|linear-gradient|radial-gradient/.test(orbCss),'Solid green orb must not regress to glass')
  assert.ok(css.includes('exposes 7px of the real app background'),'Notch gap must remain narrow')
  const navSource=fs.readFileSync('src/components/BottomNav.tsx','utf8')
  const appSource=fs.readFileSync('src/App.tsx','utf8')
  assert.ok(navSource.includes('data-pazo-floating-nav="true"') && navSource.includes('bg-transparent'),'The floating dock must expose content through its carved notch')
  assert.ok(appSource.includes('flex flex-col h-full bg-[#FAF8F5] relative overflow-hidden'),'App canvas contract stays unchanged')
  assert.ok(navSource.includes('h-[76px]'),'Nav track must allow readable labels on mobile')
  assert.ok(navSource.includes('pt-1 pb-[calc(0.75rem+env(safe-area-inset-bottom))]'),'Bar must clear mobile safe area and have comfortable bottom spacing')
  assert.ok(navSource.includes("pazo-liquid-icon--active text-[#E1E53F]"),'Active icon must contrast with official dark green orb')
  assert.ok(navSource.includes('pointer-events-none absolute inset-x-0 bottom-0') && navSource.includes('pointer-events-auto group'),'Only floating dock controls must capture touches')
  const app=fs.readFileSync('src/App.tsx','utf8')
  assert.ok(app.includes('onOpenCreate={() => setIsCreateMenuOpen(true)}'))
  assert.ok(app.includes('if (tab !== activeTab)'))
  assert.ok(app.includes('setActiveTab(tab)'))
})
test('F13 lost-pet alert option 6 review has only real preview information and original publish/edit callbacks', async () => {
  const pet={id:'test-pet',name:'emilio',photoUrl:'https://source.invalid/pet.jpg',species:'perro',age:'4',qrId:'test'}
  for(const lang of ['es','en']) {
    let edit=0,publish=0,tree
    await act(async()=>{tree=create(React.createElement(LostAlertReview,{
      pet,lang,lastSeen:'Zona aprobada',dateTime:'2026-10-13T12:00',details:'Detalle real',
      isSaving:false,onEdit(){edit++},onPublish(){publish++}
    }))})
    const json=JSON.stringify(tree.toJSON())
    assert.ok(json.includes('Zona aprobada')&&json.includes('Detalle real')&&json.includes('emilio'))
    assert.equal(tree.root.findAllByType('input').length,0)
    assert.equal(tree.root.findAllByType('textarea').length,0)
    const all=tree.root.findAllByType('button')
    assert.equal(all.length,2)
    await act(async()=>{all[0].props.onClick();all[1].props.onClick()})
    assert.equal(edit,1);assert.equal(publish,1)
    await act(async()=>{tree.unmount()})
  }
})

test('F13 active alert option 2 retains resolve and exposes existing public passport sharing options', async () => {
  const pet={id:'test-pet',name:'emilio',photoUrl:'https://source.invalid/pet.jpg',species:'perro',age:'4',qrId:'test'}
  const calls=[]
  const base={
    pet,lastSeen:'Zona real',details:'Descripción real',lang:'es',isSaving:false,
    publicUrl:'https://pazo.invalid/#/rescue/12345678-1234-1234-1234-123456789abc',
    isLinkLoading:false,linkError:'',shareFeedback:'',isLocalLink:false,
    onCopy(){calls.push('copy')},onWhatsApp(){calls.push('whatsapp')},
    onInstagram(){calls.push('instagram')},onMore(){calls.push('more')},
    onRetryLink(){calls.push('retry')},onResolve(){calls.push('resolve')},onClose(){calls.push('close')}
  }
  let tree
  await act(async()=>{tree=create(React.createElement(ActiveLostAlertPanel,base))})
  const b=tree.root.findAllByType('button')
  assert.equal(b.length,7)
  for(const choice of b.slice(1,5))assert.equal(choice.props.disabled,false)
  await act(async()=>{for(const choice of b)choice.props.onClick()})
  assert.deepEqual(calls,['close','copy','whatsapp','instagram','more','resolve','close'])
  assert.ok(JSON.stringify(tree.toJSON()).includes('Zona real'))
  assert.ok(JSON.stringify(tree.toJSON()).includes('Descripción real'))
  await act(async()=>{tree.update(React.createElement(ActiveLostAlertPanel,{...base,isLocalLink:true}))})
  assert.equal(tree.root.findAllByType('button')[1].props.disabled,false)
  assert.ok(tree.root.findAllByType('button').slice(2,5).every(x=>x.props.disabled===true))
  await act(async()=>{tree.unmount()})
})

test('F13 public QR passport Option 3 displays only fetched rescue data, decorative neighborhood and no invented map/photo uploads', () => {
  const profile={name:'emilio',species:'gato',breed:'Real breed',photoUrl:'https://test.invalid/real-pet.jpg',bio:'Real bio',
    isLost:true,lastSeenLocation:'Real last seen zone',alertLastSeenAt:'2026-10-13T08:00:00Z',alertDetails:'Real alert details'}
  const html=renderToStaticMarkup(React.createElement(RescuePassportHero,{profile}))
  assert.match(html,/Soy /)
  for(const value of ['emilio','gato','Real breed','Real bio','Real last seen zone','Real alert details','Mascota reportada como perdida','Última ubicación','Última vez vista']) {
    assert.ok(html.includes(value),value)
  }
  assert.ok(html.includes('viewBox="0 0 400 150"'),'Neighborhood is purely a static drawing')
  assert.ok(!html.includes('mapboxgl')&&!html.includes('geolocation'))
  assert.ok(!html.includes('type="file"'))
  assert.ok(!html.includes('border-'))
  const noAlert=renderToStaticMarkup(React.createElement(RescuePassportHero,{profile:{...profile,isLost:false}}))
  assert.ok(noAlert.includes('emilio'))
  assert.ok(!noAlert.includes('Mascota reportada como perdida'))
  assert.ok(!noAlert.includes('Real last seen zone'))
  const fallback=renderToStaticMarkup(React.createElement(RescuePassportHero,{profile:{...profile,isLost:true,photoUrl:null,lastSeenLocation:null,alertLastSeenAt:null,alertDetails:null}}))
  assert.ok(!fallback.includes('<img'))
  assert.ok(!fallback.includes('undefined'))
  const view=fs.readFileSync('src/components/views/PublicRescueView.tsx','utf8')
  assert.ok(view.includes('<RescuePassportHero profile={profile}/>'))
  assert.ok(view.includes('await submitPublicSighting('),'Original private sighting RPC still runs')
  for(const field of ['reporterName','reporterPhone','message','location'])assert.ok(view.includes(field),field)
  for(const gate of ['isSubmitting || !reporterName.trim() || !reporterPhone.trim() || !message.trim()','setSent(true)','setReporterPhone','setReporterName','setMessage','setLocation','fromPreview && onBack','loadError','isLoading'])assert.ok(view.includes(gate),gate)
  assert.ok(view.includes('type="tel"'))
  assert.ok(!view.includes('type="file"'))
  assert.ok(!view.includes('navigator.geolocation'))
})
test('F13 Places Option 3 renders an edge-to-edge map, real carousel, filters and voluntary controls', () => {
  const chosen={
    id:'test-real-source-id',name:'Silver Lake Dog Park',category:'park',
    zone:'Silver Lake',description:'Real description',photoUrl:'https://source.invalid/real-photo.jpg',
    activePresenceCount:2,distanceKm:1.7,
    latitude:34.0,longitude:-118.2,address:'LA'
  }
  const categories=[
    {value:'all',es:'Todos',en:'All'},
    {value:'park',es:'Parques',en:'Parks'},
    {value:'food',es:'Comida / café',en:'Food / cafe'}
  ]
  const props={
    lang:'es',places:[chosen],categoryOptions:categories,category:'all',
    onCategory(){},searchQuery:'',onSearchChange(){},onSearchCommit(){},
    selectedPlaceId:null,focusPlaceRequest:null,onFocusPlace(){},onSelectPlace(){},userLocation:null,
    locationMessage:'',isLocating:false,onUseLocation(){},
    canSuggest:true,onSuggest(){},activeCheckin:false,
    isLoading:false,loadError:'',onRetry(){}
  }
  const markup=renderToStaticMarkup(React.createElement(ImmersivePlacesStage,props))
  assert.match(markup,/Explorar lugares en el mapa/)
  assert.match(markup,/Buscar lugar, zona o dirección/)
  assert.match(markup,/Carrusel horizontal de lugares/)
  assert.match(markup,/Silver Lake Dog Park/)
  assert.match(markup,/1.7 km/)
  assert.match(markup,/2 mascotas presentes/)
  assert.match(markup,/src="https:\/\/source.invalid\/real-photo.jpg"/)
  assert.match(markup,/aria-pressed="true"/)
  assert.match(markup,/Ubicación opcional/)
  assert.match(markup,/Tu ubicación se usa solo si la activas; no se guarda/)
  assert.doesNotMatch(markup,/Reseñas verificadas|Favoritos activados/)
  const empty=renderToStaticMarkup(React.createElement(ImmersivePlacesStage,{...props,places:[]}))
  assert.match(empty,/No encontramos lugares con esos filtros/)
  assert.doesNotMatch(empty,/Silver Lake Dog Park/)
  const error=renderToStaticMarkup(React.createElement(ImmersivePlacesStage,{...props,loadError:'Network error'}))
  assert.match(error,/Network error/)
  assert.match(error,/Reintentar/)
  const code=fs.readFileSync('src/components/views/MapView.tsx','utf8')
  const app=fs.readFileSync('src/App.tsx','utf8')
  const mapbox=fs.readFileSync('src/features/places/map/MapboxMap.tsx','utf8')
  const stage=fs.readFileSync('src/features/places/components/ImmersivePlacesStage.tsx','utf8')
  assert.ok(code.includes('<ImmersivePlacesStage'))
  assert.ok(code.includes('onSelectPlace={handleSelectPlace}'))
  assert.ok(code.includes('onFocusPlace={handleFocusPlace}'))
  assert.ok(code.includes('onUseLocation={handleUseLocation}'))
  assert.ok(code.includes('onSearchCommit={handleSearchCommit}'))
  assert.ok(code.includes('onCategory={handleCategory}'))
  assert.ok(code.includes("onSuggest={() => setIsSuggestOpen(true)}"))
  for(const key of ['handleStartCheckin','handleEndCheckin','handleVisibility','PlaceFeatureExperimentCard','SuggestPlaceModal','onClose={() => setIsSuggestOpen(false)}']) assert.ok(code.includes(key),key)
  assert.ok(app.includes("activeTab === 'mapa'"))
  assert.ok(app.includes("'relative min-h-0 flex-1 overflow-hidden p-0'"))
  assert.ok(stage.includes('<MapboxMap'))
  assert.ok(stage.includes('snap-x snap-mandatory'))
  assert.ok(stage.includes('overflow-x-auto'))
  assert.ok(stage.includes('pointer-events-none'))
  assert.ok(mapbox.includes('drawPazoCategoryPin'))
  assert.ok(mapbox.includes("'pazo-place-models'"))
  assert.ok(mapbox.includes("map.on('click', 'pazo-place-pins', handlePlaceClick)"))
  assert.ok(mapbox.includes("map.on('click', 'pazo-place-models', handlePlaceClick)"))
  assert.ok(!stage.includes('navigator.geolocation.getCurrentPosition'))
  assert.ok(!code.includes('pazo-glass-card p-6')) // Old stand-alone list layout must not return.
})

test('F13 Places carousel only centers map; pins retain details with brief entrance motion', async () => {
  const focused=[],opened=[]
  const chosen={id:'test-focus-id',name:'Real Place',category:'park',latitude:34,
    longitude:-118,address:'LA',zone:'LA',activePresenceCount:0}
  const props={lang:'es',places:[chosen],categoryOptions:[{value:'all',es:'Todos',en:'All'}],
    category:'all',onCategory(){},searchQuery:'',onSearchChange(){},onSearchCommit(){},
    selectedPlaceId:null,focusPlaceRequest:null,
    onFocusPlace:id=>focused.push(id),onSelectPlace:id=>opened.push(id),
    userLocation:null,locationMessage:'',isLocating:false,onUseLocation(){},
    canSuggest:false,onSuggest(){},activeCheckin:false,isLoading:false,
    loadError:'',onRetry(){}}
  let tree
  await act(async()=>{tree=create(React.createElement(ImmersivePlacesStage,props))})
  const card=tree.root.findAllByType('button').find(b=>b.props['aria-label']==='Centrar mapa en Real Place')
  assert.ok(card,'Carousel card must describe map focusing, not details')
  await act(async()=>{card.props.onClick();card.props.onClick()})
  assert.deepEqual(focused,['test-focus-id','test-focus-id'])
  assert.deepEqual(opened,[],'Carousel must not open the detail')
  await act(async()=>{tree.unmount()})
  const mapView=fs.readFileSync('src/components/views/MapView.tsx','utf8')
  const stage=fs.readFileSync('src/features/places/components/ImmersivePlacesStage.tsx','utf8')
  const mapbox=fs.readFileSync('src/features/places/map/MapboxMap.tsx','utf8')
  assert.match(mapView,/const handleFocusPlace = \(placeId: string\) => \{\s*setSelectedPlaceId\(null\)\s*setMapFocusRequest\(\{ placeId \}\)/)
  assert.ok(mapView.includes('setSelectedPlaceId(requestedPlaceId)'),'Deep link still opens detail')
  assert.ok(mapView.includes('setMapFocusRequest({ placeId: requestedPlaceId })'))
  assert.ok(stage.includes('onClick={() => onFocusPlace(place.id)}'))
  assert.ok(stage.includes('onSelectPlace={onSelectPlace}'),'Pins still use the detail handler')
  assert.ok(mapbox.includes("map.on('click', 'pazo-place-models', handlePlaceClick)"))
  assert.ok(mapbox.includes('focusPlaceRequest.placeId'))
  assert.ok(mapView.includes('motion-safe:animate-[slideUpFade_250ms_ease-out_both]'))
  assert.ok(fs.readFileSync('src/index.css','utf8').includes('@keyframes slideUpFade'))
})

test('F13 Community Lifestyle Option 4 uses real cover, open identity, owner/membership states and existing callbacks', async () => {
  const original={
    id:'community-synthetic',name:'A real community name',description:'Real community description',
    category:'Interest',species:'perro',zone:'Los Angeles',membersCount:3,
    ownerUserId:'synthetic-owner',imageUrl:'https://synthetic.invalid/community-cover.png',
    status:'active',isJoined:false,role:undefined,
  }
  let backs=0, memberships=0
  const props={community:original,isOwner:false,postsCount:2,canJoin:true,
    isMembershipBusy:false,onBack(){backs++},onMembership(){memberships++},lang:'es'}
  const html=renderToStaticMarkup(React.createElement(CommunityLifestyleHero,props))
  assert.ok(html.includes(original.imageUrl))
  assert.ok(html.includes(original.name))
  assert.ok(html.includes('A real community name'))
  assert.ok(html.includes('Real community description'))
  assert.ok(html.includes('Los Angeles'))
  assert.ok(html.includes('Identidad de comunidad'))
  assert.ok(html.includes('viewBox="0 0 390 55"')) // Organic cover -> content transition.
  assert.ok(html.includes('3'))
  assert.ok(html.includes('2'))
  assert.ok(!html.includes('Community #'))
  let renderer
  await act(async()=>{renderer=create(React.createElement(CommunityLifestyleHero,props))})
  assert.ok(button(renderer.root,'Unirme a la comunidad'))
  await act(async()=>button(renderer.root,'Unirme a la comunidad').props.onClick())
  await act(async()=>button(renderer.root,'Volver a Explorar').props.onClick())
  assert.equal(memberships,1)
  assert.equal(backs,1)
  await act(async()=>renderer.update(React.createElement(CommunityLifestyleHero,{
    ...props,community:{...original,isJoined:true},canJoin:true,
  })))
  assert.ok(button(renderer.root,'Salir de la comunidad'))
  await act(async()=>renderer.update(React.createElement(CommunityLifestyleHero,{
    ...props,community:{...original,role:'owner',isJoined:true},isOwner:true,
  })))
  assert.ok(!button(renderer.root,'Salir de la comunidad'))
  assert.ok(JSON.stringify(renderer.toJSON()).includes('Admin'))
  await act(async()=>renderer.update(React.createElement(CommunityLifestyleHero,{
    ...props,community:{...original,status:'archived'},canJoin:false,
  })))
  assert.ok(!button(renderer.root,'Unirme a la comunidad'))
  await act(async()=>renderer.unmount())
  const view=fs.readFileSync('src/components/views/CommunityDetailView.tsx','utf8')
  assert.ok(view.includes('<CommunityLifestyleHero'))
  assert.ok(view.includes("postsCount={posts.length}"))
  assert.ok(view.includes('onMembership={() => void handleMembership()}'))
  assert.ok(view.includes('<LiquidChoiceTabs'),'Community uses shared accessible slider')
  assert.ok(view.includes('variant="community"'),'Community preserves three choices')
  assert.ok(view.includes('active={activeTab}'),'The selected community section remains controlled by the view')
  assert.ok(view.includes('onChange={setActiveTab}'),'The same community section handler remains connected')
  const choice=fs.readFileSync('src/components/ui/LiquidChoiceTabs.tsx','utf8')
  assert.ok(choice.includes('aria-pressed={selected}'),'Moved selector keeps pressed semantics')
  assert.ok(choice.includes('onClick={() => onChange(id)}'),'Moved selector keeps original interactions')
  for(const identifier of ['handleCreatePost','toggleComments','handleDeleteComment','handleLike','handleRemoveMember','handleSaveEdit','handleArchive','CommunityFeatureExperimentCard']){
    assert.ok(view.includes(identifier),identifier)
  }
  assert.ok(view.includes('onSubmit={handleCreatePost}'))
  assert.ok(!view.includes('rounded-[2.4rem] pazo-glass-card'))
})


test('F13 Communities list entrance animates only real result cards with capped stagger and reduced-motion support', () => {
  const view=fs.readFileSync('src/components/views/CommunitiesView.tsx','utf8')
  const css=fs.readFileSync('src/index.css','utf8')
  assert.ok(view.includes('communities.map((community, index) => ('),'Existing results list should remain data-driven')
  assert.ok(view.includes('key={community.id}'),'Community cards retain stable keys')
  assert.ok(view.includes('style={{ animationDelay: `${Math.min(index, 3) * 12}ms` }}'),'Entrance staggering is bounded and index based')
  assert.ok(view.includes('className="pazo-community-card-enter'),'Only the real community card has its own entrance animation')
  assert.ok(view.includes("setSelectedCommunityId(community.id)"),'Card still navigates to detail')
  assert.ok(view.includes('void handleQuickMembership(community)'),'Quick join/leave callback stays unchanged')
  assert.ok(view.includes('event.stopPropagation()'),'Quick membership does not open detail')
  assert.ok(view.includes('communities.length === 0')&&view.includes('<CommunitiesEmptyState'),'Empty state stays unchanged')
  assert.ok(view.includes('isLoading ? ('),'Loading state stays unchanged')
  assert.ok(css.includes('@keyframes pazoCommunityCardEnter'))
  assert.ok(css.includes('translateY(5px)'))
  assert.ok(css.includes('pazoCommunityCardEnter 160ms ease-out'))
  assert.ok(css.replaceAll('\r\n','\n').includes('.pazo-community-card-enter {\n    animation: none;'),'Reduced motion disables entrance entirely')
})
test('F13 Community Option 6 empty state matches map concept, preserves real create callback, and does not invent communities', async () => {
  for(const [lang,heading,cta] of [
    ['es','Todavía no hay comunidades.','Crear la primera comunidad'],
    ['en','No communities yet.','Create the first community'],
  ]) {
    let created=0
    const props={lang,canCreate:true,onCreate(){created++}}
    const markup=renderToStaticMarkup(React.createElement(CommunitiesEmptyState,props))
    assert.ok(markup.includes('viewBox="0 0 360 207"'))
    assert.ok(markup.includes('community-map-ground'))
    assert.ok(markup.includes('community-map-pin-shadow'))
    assert.ok(markup.includes(heading))
    assert.ok(markup.includes(cta))
    assert.ok(!markup.includes('Community #1'))
    assert.ok(!markup.includes('href='))
    let renderer
    await act(async()=>{renderer=create(React.createElement(CommunitiesEmptyState,props))})
    const action=button(renderer.root,cta)
    assert.ok(action)
    assert.equal(action.props.disabled,false)
    await act(async()=>action.props.onClick())
    assert.equal(created,1)
    await act(async()=>renderer.update(React.createElement(CommunitiesEmptyState,{...props,canCreate:false})))
    const disabled=button(renderer.root,cta)
    assert.ok(disabled?.props.disabled)
    await act(async()=>renderer.unmount())
  }
  const view=fs.readFileSync('src/components/views/CommunitiesView.tsx','utf8')
  assert.ok(view.includes('communities.length === 0'))
  assert.ok(view.includes('<CommunitiesEmptyState'))
  assert.ok(view.includes('onCreate={() => setIsCreateCommunityOpen(true)}'))
  assert.ok(view.includes('canCreate={Boolean(currentPet) && canUseCommunities}'))
  assert.ok(view.includes('community.isJoined'))
  assert.ok(view.includes('handleQuickMembership'))
  assert.ok(view.includes('setSelectedCommunityId(community.id)'))
})

test('F13 messaging coming-soon is branded, bilingual, closeable and never shows synthetic chats for real accounts', async () => {
  for(const [lang,title,cta,status] of [
    ['es','Cada amistad comienza con un hola.','Volver a PAZO','En desarrollo'],
    ['en','Every friendship starts with hello.','Back to PAZO','In development'],
  ]) {
    let closes=0, sends=0
    const props={
      isOpen:true,
      isDemo:false,
      lang,
      conversations:[{id:'SYNTHETIC-NOT-TO-BE-SHOWN',petName:'Fake pet',personName:'Fake person',lastMessage:'Synthetic message'}],
      onClose(){closes++},
      onSendMessage(){sends++}
    }
    const markup=renderToStaticMarkup(React.createElement(MessagesModal,props))
    assert.ok(markup.includes('role="dialog"'))
    assert.ok(markup.includes('aria-modal="true"'))
    assert.ok(markup.includes('messages-not-ready-description'))
    assert.ok(markup.includes(title))
    assert.ok(markup.includes(status))
    assert.ok(markup.includes('PAZO'))
    assert.ok(markup.includes('viewBox="0 0 360 225"')) // Unique PAZO pets/chat artwork.
    assert.ok(!markup.includes('SYNTHETIC-NOT-TO-BE-SHOWN'))
    assert.ok(!markup.includes('Fake pet'))
    assert.ok(!markup.includes('Synthetic message'))
    assert.ok(!markup.includes('<input'))
    let renderer
    await act(async()=>{renderer=create(React.createElement(MessagesModal,props))})
    await act(async()=>button(renderer.root,cta).props.onClick())
    const closeButton=renderer.root.findAllByType('button').find(node=>node.props['aria-label']===(lang==='es'?'Cerrar':'Close'))
    assert.ok(closeButton)
    await act(async()=>closeButton.props.onClick())
    assert.equal(closes,2)
    assert.equal(sends,0)
    await act(async()=>renderer.unmount())
    assert.equal(renderToStaticMarkup(React.createElement(MessagesModal,{...props,isOpen:false})),'')
  }
})

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
test('Community join notification: strict source types, modal navigation, recipient contract and migration safety', async () => {
  const sourceRow={
    id:'notification-real',type:'community_join',
    title:'Nuevo miembro en tu comunidad',body:'Alguien se unió a tu comunidad «Test».',
    read_at:null,created_at:'2026-10-12T12:00:00Z',pet_id:null,source_id:'real-community-id',
  }
  const join=mapNotificationRow(sourceRow)
  assert.equal(join.category,'todas')
  assert.equal(join.sourceType,'community_join')
  assert.equal(join.read,false)
  assert.equal(getNotificationCommunityId(join),'real-community-id')
  assert.equal(getNotificationSightingId(join),null)
  assert.equal(getNotificationCommunityId({...join,sourceType:'system'}),null)
  assert.equal(getNotificationCommunityId({...join,sourceType:'sighting'}),null)
  assert.equal(getNotificationCommunityId({...join,sourceId:null}),null)
  const sighting={...join,id:'sighting-id',title:'Sighting detected',sourceType:'sighting',sourceId:'sighting-source',category:'comunidad'}
  assert.equal(getNotificationSightingId(sighting),'sighting-source')
  assert.equal(getNotificationCommunityId(sighting),null)
  let activated=[]
  const props={
    isOpen:true,lang:'es',
    notifications:[join,sighting,{...join,id:'system',title:'System notice',sourceType:'system',sourceId:'not-a-community'}],
    onClose(){},
    onOpenNotification(notification){activated.push(notification.id)},
    onLoadMore(){},hasMore:false,isLoadingMore:false,
  }
  let renderer
  await act(async()=>{renderer=create(React.createElement(NotificationsModal,props))})
  const joinButton=button(renderer.root,'Nuevo miembro en tu comunidad')
  assert.ok(joinButton)
  assert.equal(joinButton.props.disabled,false)
  assert.equal(button(renderer.root,'System notice').props.disabled,true)
  await act(async()=>joinButton.props.onClick())
  assert.deepEqual(activated,['notification-real'])
  await act(async()=>button(renderer.root,'Avistamientos').props.onClick())
  assert.equal(button(renderer.root,'Nuevo miembro en tu comunidad'),undefined)
  assert.ok(button(renderer.root,'Sighting detected'))
  await act(async()=>renderer.unmount())

  const app=fs.readFileSync('src/App.tsx','utf8')
  assert.ok(app.includes('getNotificationCommunityId(notification)'))
  assert.ok(app.includes('setCommunityTargetId(joinedCommunityId)'))
  assert.ok(app.includes('setCommunityTargetKey((value) => value + 1)'))
  assert.ok(app.includes("setActiveTab('comunidades')"))
  assert.ok(app.includes('await markNotificationRead(notification.id)'))

  const sql=fs.readFileSync('supabase/migrations/20261013025451_community_join_owner_notifications.sql','utf8')
  for(const line of [
    "CHECK (type IN ('sighting', 'system', 'community_join'))",
    "SECURITY DEFINER",
    "SET search_path = ''",
    "IF NEW.role <> 'member' THEN",
    "v_owner_id = NEW.user_id",
    "c.status = 'active'",
    "v_owner_id,",
    "'community_join'",
    "NEW.community_id",
    "AFTER INSERT ON public.community_memberships",
    "REVOKE ALL ON FUNCTION community_private.notify_owner_on_member_join()",
  ]) assert.ok(sql.includes(line),line)
  assert.ok(!/GRANT INSERT\\s+ON\\s+(TABLE\\s+)?public\\.notifications\\s+TO\\s+authenticated/i.test(sql))
  assert.ok(!/INSERT INTO public\\.community_memberships/i.test(sql))
})

test('F13 Community Cares empty-state is branded, filtered, bilingual and closes without fake alerts', async () => {
  for(const [lang,heading,empty,closeLabel] of [
    ['es','Siempre cerca de tu comunidad.','¡Todo en calma!','Cerrar avisos'],
    ['en','Always close to your community.','All is calm!','Close notifications'],
  ]) {
    let closed=0
    const props={
      isOpen:true,lang,notifications:[],onClose(){closed++},
      onOpenNotification(){throw Error('No synthetic notifications are openable')},
      onLoadMore(){throw Error('No pagination expected')},hasMore:false,isLoadingMore:false,
    }
    const html=renderToStaticMarkup(React.createElement(NotificationsModal,props))
    assert.ok(html.includes('role="dialog"'))
    assert.ok(html.includes('aria-modal="true"'))
    assert.ok(html.includes('pazo-notifications-description'))
    assert.ok(html.includes('viewBox="0 0 340 188"'))
    assert.ok(html.includes(heading))
    assert.ok(html.includes(empty))
    assert.ok(!html.includes('Synthetic notification'))
    let renderer
    await act(async()=>{renderer=create(React.createElement(NotificationsModal,props))})
    assert.ok(button(renderer.root,lang==='es'?'Todas':'All'))
    await act(async()=>button(renderer.root,lang==='es'?'Avistamientos':'Sightings').props.onClick())
    assert.ok(JSON.stringify(renderer.toJSON()).includes(lang==='es'?'Sin avistamientos por ahora':'No sightings for now'))
    const dismiss=renderer.root.findAllByType('button').find(el=>el.props['aria-label']===closeLabel)
    assert.ok(dismiss)
    await act(async()=>dismiss.props.onClick())
    assert.equal(closed,1)
    await act(async()=>renderer.unmount())
    assert.equal(renderToStaticMarkup(React.createElement(NotificationsModal,{...props,isOpen:false})),'')
  }
})

test('F13 Community Cares preserves real notification interaction, filter and existing pagination', async () => {
  const activated=[],paging=[]
  const sighting={id:'s1',title:'Valid sighting',subtitle:'Description',category:'comunidad',sourceType:'sighting',sourceId:'real-sighting-1',read:false,timeAgo:'2 h'}
  const system={id:'sys',title:'Informational alert',subtitle:'No destination',category:'todas',sourceType:'system',sourceId:'unused',read:true,timeAgo:'3 h'}
  const props={
    isOpen:true,lang:'en',notifications:[sighting,system],onClose(){},
    onOpenNotification:n=>activated.push(n.id),onLoadMore:()=>paging.push('load'),
    hasMore:true,isLoadingMore:false
  }
  let renderer
  await act(async()=>{renderer=create(React.createElement(NotificationsModal,props))})
  assert.ok(button(renderer.root,'Valid sighting'))
  assert.ok(button(renderer.root,'Informational alert'))
  assert.equal(button(renderer.root,'Informational alert').props.disabled,true)
  const scrollable=renderer.root.findAllByType('section').find(n=>n.props['aria-modal']==='true')
  await act(async()=>scrollable.props.onScroll({currentTarget:{scrollHeight:700,scrollTop:570,clientHeight:100}}))
  assert.deepEqual(paging,['load'])
  await act(async()=>button(renderer.root,'Valid sighting').props.onClick())
  assert.deepEqual(activated,['s1'])
  await act(async()=>button(renderer.root,'Sightings').props.onClick())
  assert.equal(button(renderer.root,'Informational alert'),undefined)
  await act(async()=>renderer.update(React.createElement(NotificationsModal,{...props,notifications:[]})))
  assert.ok(button(renderer.root,'View earlier notifications'))
  await act(async()=>button(renderer.root,'View earlier notifications').props.onClick())
  assert.deepEqual(paging,['load','load'])
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
  const needles={A01:['Comenzar','Get started'],A02:['Correo electrónico','Email'],A03:['El nombre, especie y foto de tu mascota','species and photo may be public'],A04:['Comunidades de gatos','Cat communities']}
  for(const [initialStep,[es,en]] of Object.entries(needles)) {
    const render=lang=>renderToStaticMarkup(React.createElement(OnboardingView,{initialStep,lang,onComplete(){},onSkipToLogin(){},onQuickDemo(){},onToggleLang(){}}))
    assert.ok(render('es').includes(es),initialStep)
    const english=render('en');assert.ok(english.includes(en),initialStep);assert.ok(!english.includes(es),initialStep)
    if(initialStep==='A04') assert.ok(english.includes('value="Los Ángeles"')) // User/state value is not translated.
    assert.ok(!english.includes('You decide.')) // Removed nonfunctional privacy page.
    if(initialStep==='A03') assert.ok(english.includes('Privacy details'))
  }
})
test('T14 English onboarding submits the unchanged Spanish species/interest identifiers', async () => {
  let renderer;let completed=false;petInputs.length=0
  await act(async()=>{renderer=create(React.createElement(OnboardingView,{initialStep:'A03',lang:'en',onComplete:()=>{completed=true},onSkipToLogin(){},onQuickDemo(){},onToggleLang(){}}))})
  const name=renderer.root.findAllByType('input').find(i=>i.props.placeholder==='E.g. Luna, Bruno, Cloud...')
  await act(async()=>name.props.onChange({target:{value:'Synthetic Dog'}}))
  await act(async()=>button(renderer.root,'Dog').props.onClick())
  await act(async()=>button(renderer.root,'Continue').props.onClick())
  assert.equal(button(renderer.root,'Save and continue'),undefined)
  assert.ok(button(renderer.root,'Cat communities'))
  await act(async()=>button(renderer.root,'Back').props.onClick())
  assert.ok(button(renderer.root,'Privacy details'))
  await act(async()=>button(renderer.root,'Continue').props.onClick())
  await act(async()=>button(renderer.root,'Cat communities').props.onClick())
  await act(async()=>button(renderer.root,'Nutrition and natural food').props.onClick())
  await act(async()=>button(renderer.root,'Create profile and enter').props.onClick())
  assert.equal(completed,true);assert.equal(petInputs.length,1)
  assert.equal(petInputs[0].species,'perro')
  assert.equal(petInputs[0].name,'Synthetic Dog')
  assert.deepEqual(petInputs[0].interests,['Lugares aptos para mascotas','Nutrición y alimentación natural'])
  await act(async()=>renderer.unmount())
})

test('F13 profile settings groups privacy, terms, deletion and support by logout', async () => {
  const pet={id:'synthetic-pet',name:'Synthetic Cat',species:'gato',photoUrl:'',age:'1'}
  const makeProps=lang=>({currentPet:pet,canManagePet:false,onRequireAccount(){},
    canModerate:false,availablePets:[pet],onSelectPet(){},onPetUpdated(){},onAddPet(){},
    careItems:[],onCompleteCare(){},onOpenQRPassport(){},onOpenCareAgenda(){},
    documentCount:0,onOpenDocuments(){},onOpenLostAlert(){},lang})
  for(const [lang,gear,privacy,terms,section] of [
    ['es','Configuración','Privacidad','Reglas de uso','Cuenta y datos'],
    ['en','Settings','Privacy','Community rules','Account and data']
  ]) {
    let ui
    await act(async()=>{ui=create(React.createElement(PetView,makeProps(lang)))})
    const gearButton=()=>ui.root.findAllByType('button').find(b=>b.props['aria-label']===gear)
    assert.ok(gearButton(),lang+' gear accessible')
    assert.equal(gearButton().props['aria-expanded'],false)
    assert.equal(ui.root.findAllByProps({id:'pazo-profile-settings'}).length,0)
    assert.equal(button(ui.root,terms),undefined,'Legal options must not remain in main body')
    assert.ok(!JSON.stringify(ui.toJSON()).includes(section),'Account section must not remain in main body')
    await act(async()=>{gearButton().props.onClick()})
    assert.equal(gearButton().props['aria-expanded'],true)
    const menu=ui.root.findByProps({id:'pazo-profile-settings'})
    const menuButtons=menu.findAllByType('button')
    assert.equal(menuButtons.length,4)
    assert.deepEqual(menuButtons.map(buttonText),[privacy,terms,lang==='es'?'Ayuda, consultas y sugerencias':'Help, questions and suggestions',lang==='es'?'Solicitar eliminación de cuenta':'Request account deletion'])
    assert.ok(JSON.stringify(ui.toJSON()).includes(section),'Account section must live inside settings')
    assert.equal(menuButtons[3].props.disabled,true,'Existing production request gate must remain disabled')
    assert.ok(menu.findAllByType('a').some(a=>a.props.href==='mailto:appdigital.corp@gmail.com'),'Support mailto must live inside settings')
    assert.ok(ui.root.findAllByType('button').some(b=>b.props.title===(lang==='es'?'Cerrar sesión':'Log out')))
    assert.ok(JSON.stringify(ui.toJSON()).includes(section),'Deletion section visible only while settings is expanded')
    await act(async()=>{gearButton().props.onClick()})
    assert.equal(gearButton().props['aria-expanded'],false)
    assert.ok(!JSON.stringify(ui.toJSON()).includes(section),'Account section must disappear when settings closes')
    await act(async()=>{ui.unmount()})
  }
  const source=fs.readFileSync('src/components/views/PetView.tsx','utf8')
  assert.ok(source.includes("setLegalKind('privacy')")&&source.includes("setLegalKind('terms')"))
  assert.ok(source.includes('showDeletionRequest && <DeletionRequestDialog'))
  assert.ok(source.includes('disabled={!requestEnabled}'))
  assert.ok(source.includes('PAZO_PRIVACY_SUPPORT_MAILTO'))
})

test('T15 demo profile Edit requests a real account without exposing an upload form', async () => {
  let renderer;let requests=0;petInputs.length=0
  const pet={id:'synthetic-pet',name:'Synthetic Cat',species:'gato',photoUrl:'',age:'1'}
  await act(async()=>{renderer=create(React.createElement(PetView,{currentPet:pet,canManagePet:false,onRequireAccount:()=>requests++,canModerate:false,availablePets:[pet],onSelectPet(){},onPetUpdated(){},onAddPet(){},careItems:[],onCompleteCare(){},onOpenQRPassport(){},onOpenCareAgenda(){},documentCount:0,onOpenDocuments(){},onOpenLostAlert(){},lang:'en'}))})
  const gear=renderer.root.findAllByType('button').find(b=>b.props['aria-label']==='Settings')
  await act(async()=>gear.props.onClick())
  assert.ok(renderer.root.findAllByType('a').some(a=>a.props.href==='mailto:appdigital.corp@gmail.com'))
  await act(async()=>button(renderer.root,'Edit').props.onClick())
  assert.equal(requests,1)
  assert.equal(renderer.root.findAllByType('input').filter(i=>i.props.type==='file').length,0)
  assert.deepEqual(petInputs,[])
  assert.ok(renderer.root.findAllByProps({id:'pazo-profile-settings'}).length===0)
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
  assert.match(JSON.stringify(renderer.toJSON()),/A world of pets around you/)
  assert.match(JSON.stringify(renderer.toJSON()),/Coming soon to PAZO/)
  assert.ok(renderer.root.findAllByType('svg').some(el=>el.props.viewBox==='0 0 340 178'))
  assert.ok(button(renderer.root,'For you').props['aria-pressed']===false)
  assert.ok(button(renderer.root,'Nearby').props['aria-pressed']===true)
  assert.deepEqual(calls,[])
  await act(async()=>renderer.unmount())
})
test('F13 nearby-only preview changes copy and artwork without rerouting feed, map or the interest callback', async () => {
  const source=fs.readFileSync('src/components/views/HomeView.tsx','utf8')
  assert.ok(source.includes('const NearbyNeighborhoodArtwork = () => ('))
  assert.ok(source.includes('Comunidad cercana')===false)
  assert.ok(source.includes('Un mundo de mascotas a tu alrededor'))
  assert.ok(source.includes('Próximamente en PAZO'))
  assert.ok(source.includes('onClick={handleNearbyInterest}'))
  assert.ok(source.includes("target_id: 'feature_nearby_interested'"))
  assert.ok(source.includes("target_id: 'feature_nearby_tab'"))
  assert.ok(source.includes("setFeedFilter('following')"))
  assert.ok(!source.includes('Estamos trabajando fuertemente'))
  const props={
    posts:[],canReport:false,onLikePost(){},onSavePost(){},
    onAddComment:async()=>false,onLoadComments:async()=>true,lang:'es',
    ownedPetIds:[],onSelectPetProfile(){}
  }
  let renderer
  await act(async()=>{renderer=create(React.createElement(HomeView,props))})
  assert.ok(button(renderer.root,'Para ti'))
  await act(async()=>button(renderer.root,'Cerca').props.onClick())
  assert.ok(JSON.stringify(renderer.toJSON()).includes('Un mundo de mascotas a tu alrededor'))
  assert.equal(button(renderer.root,'Inicia sesión para expresar interés').props.disabled,true)
  await act(async()=>button(renderer.root,'Para ti').props.onClick())
  assert.ok(JSON.stringify(renderer.toJSON()).includes('Todavía no hay publicaciones'))
  assert.ok(!JSON.stringify(renderer.toJSON()).includes('Un mundo de mascotas a tu alrededor'))
  await act(async()=>renderer.unmount())
})

test('F16 approved supporter themes have five distinct non-persistent visual previews and preserve the original profile', async () => {
  const expected=['classic','nature','hearts','stars','adventure']
  assert.deepEqual(SUPPORTER_PROFILE_THEMES.map(theme=>theme.id),expected)
  for (const option of SUPPORTER_PROFILE_THEMES) {
    const rendered=renderToStaticMarkup(React.createElement(SupporterProfileBackdrop,{theme:option.id}))
    assert.ok(rendered.includes('data-supporter-theme="'+option.id+'"'),'Distinct decorative layer exists: '+option.id)
    assert.ok(rendered.includes('aria-hidden="true"'),'All decorations are ignored by screenreaders')
    assert.ok(rendered.includes('pazo-supporter-float'),'Every variant has animated ornaments')
    assert.ok(rendered.includes('animation-duration'),'Each ornament has a distinct pace')
    assert.ok(!rendered.includes('Amigo de PAZO'),'No false supporter status in the background layer')
  }
  const selected=[]
  let view
  await act(async()=>{
    view=create(React.createElement(SupporterThemePreviewPicker,{value:null,onChange:value=>selected.push(value),lang:'es'}))
  })
  const choices=()=>view.root.findAllByType('button')
  assert.equal(choices().length,6,'Original option plus five approved themes')
  assert.ok(buttonText(choices()[0]).includes('Original'))
  assert.equal(choices()[0].props['aria-pressed'],true)
  assert.ok(JSON.stringify(view.toJSON()).includes('EN DESARROLLO'))
  for(const [index,id] of expected.entries()){
    await act(async()=>choices()[index+1].props.onClick())
    assert.equal(selected.at(-1),id)
  }
  await act(async()=>choices()[0].props.onClick())
  assert.equal(selected.at(-1),null,'Original background stays recoverable')
  await act(async()=>view.update(React.createElement(SupporterThemePreviewPicker,{value:'stars',onChange:value=>selected.push(value),lang:'en'})))
  assert.equal(choices()[4].props['aria-pressed'],true,'Selected theme exposed to assistive technology')
  assert.ok(JSON.stringify(view.toJSON()).includes('IN DEVELOPMENT'))
  await act(async()=>view.unmount())
  const profile=fs.readFileSync('src/components/views/PublicProfileView.tsx','utf8')
  const source=fs.readFileSync('src/features/supporter/components/SupporterProfileThemes.tsx','utf8')
  assert.ok(!source.includes('pazo_theme_preview')&&!source.includes('import.meta.env.DEV'),'No secret URL or development-only gate')
  assert.ok(!profile.includes('SupporterThemePreviewPicker') &&
    profile.includes('supporterBenefitsUiEnabled') &&
    profile.includes('supporterVisualsEnabled && supporterPerks?.theme') &&
    profile.includes('pazo_supporter_public_pet_benefits'),
    'Public themes are rendered only from verified server proof, behind default-off release flag')
  assert.ok(profile.includes('get_pet_founder_status'),'Legacy verified status flow remains unchanged')
  assert.ok(!source.includes('localStorage')&&!source.includes('supabase'),'Theme preview never writes user preferences or payment status')
  assert.ok(!source.includes('border-')&&!source.includes('ring-')&&!source.includes('outline-'),'Theme preview has zero UI borders')
})

test('F16 supporter customization is routed through a verified membership, not a second upsell card',()=>{
  const petCode=fs.readFileSync('src/components/views/PetView.tsx','utf8')
  const member=fs.readFileSync('src/features/supporter/components/SupporterBenefitsHome.tsx','utf8')
  const hook=fs.readFileSync('src/features/supporter/useSupporterMembershipStatus.ts','utf8')
  const preview=fs.readFileSync('src/features/supporter/components/SupporterThemePreviewPanel.tsx','utf8')
  assert.ok(petCode.includes('setShowSupporterAccount(true)'),'One discoverable supporter entry under My Pet')
  assert.ok(petCode.includes('pet={currentPet}'),'Selected pet is passed to supporter home')
  assert.ok(!petCode.includes('setShowSupporterThemePreview(true)'),'No competing customization card')
  assert.ok(!petCode.includes('setShowGratitudeParticipation(true)'),'No duplicate supporter wall card')
  assert.ok(petCode.includes("supporterStatus.kind==='verified'"),'Decorated entry needs server proof')
  assert.ok(member.includes('<SupporterThemePreviewPanel pet={pet}'),'Member opens actual approved profile picker')
  assert.ok(member.includes('<SupporterWallConsentSettings lang={lang}'),'Existing wall consent is reused')
  assert.ok(member.includes('<SupporterBadge active milestone={milestone}'),'No synthetic milestone')
  assert.ok(hook.includes("supabase.rpc('pazo_supporter_public_pet_benefits'"),'Server is source of verified perks')
  assert.ok(!hook.includes('localStorage')&&!hook.includes('sessionStorage'),'Membership state is not stored in browser')
  assert.ok(!preview.includes('supabase')&&!preview.includes('localStorage')&&!preview.includes('paypal'),'Preview itself never activates payment')
  assert.ok(preview.includes('supporterBenefitsUiEnabled'),'Save stays behind release flag')
  assert.ok(preview.includes('{liveBenefitsUI && <SupporterThemeSaveControl'),'Persistence requires server gate')
  assert.ok(!preview.includes('border-')&&!preview.includes('ring-')&&!preview.includes('outline-'),'Zero-outline rule')
  const css=fs.readFileSync('src/index.css','utf8')
  assert.ok(css.includes('@keyframes pazoSupporterGentleFloat'))
  assert.ok(css.includes('.pazo-supporter-float { animation: none !important; }'),'Reduced-motion contract intact')
})

test('A01 PO-approved welcome preserves sign-up, login, demo, locale and public wall', async()=>{
  for(const [lang,title,subtitle,signup,login,wall] of [
    ['es','Hecho con amor','Únete y descubre la mejor app social para mascotas','Comenzar','Ya tengo una cuenta','Conoce a los Amigos de PAZO'],
    ['en','Made with love','Join and discover the best social app for pets','Get started','I already have an account','Meet the PAZO Friends']
  ]) {
    let logins=0, demos=0, locales=0, ui
    const render=()=>React.createElement(OnboardingView,{
      initialStep:'A01',lang,onComplete(){},onSkipToLogin(){logins++},
      onQuickDemo(){demos++},onToggleLang(){locales++}
    })
    await act(async()=>{ui=create(render())})
    const snapshot=()=>JSON.stringify(ui.toJSON())
    assert.ok(snapshot().includes(title))
    assert.ok(snapshot().includes(subtitle))
    assert.ok(snapshot().includes('para las mascotas')||lang==='en')
    assert.ok(button(ui.root,wall))
    assert.ok(button(ui.root,signup))
    assert.ok(button(ui.root,login))
    assert.ok(button(ui.root,'Demo'))
    const companion=ui.root.findAllByType('img').filter(n=>n.props.src==='/onboarding/welcome-approved-art.svg')
    assert.equal(companion.length,1,'Approved dog illustration is used, not the inaccurate hand-drawn version')
    assert.equal(companion[0].props.alt,'','Dog graphic remains decorative with live text outside it')
    await act(async()=>button(ui.root,'Demo').props.onClick())
    await act(async()=>button(ui.root,login).props.onClick())
    assert.equal(demos,1)
    assert.equal(logins,1)
    const languageButton=ui.root.findAllByType('button').find(b=>b.props['aria-label']===
      (lang==='es'?'Cambiar a inglés':'Switch to Spanish'))
    assert.ok(languageButton)
    await act(async()=>languageButton.props.onClick())
    assert.equal(locales,1)
    await act(async()=>button(ui.root,signup).props.onClick())
    assert.ok(snapshot().includes(lang==='es'?'Correo electrónico':'Email'),'Comenzar opens original A02')
    await act(async()=>ui.unmount())
  }
  const source=fs.readFileSync('src/components/views/OnboardingView.tsx','utf8')
  const mascot=fs.readFileSync('src/features/onboarding/components/WelcomeAnimatedCompanion.tsx','utf8')
  const css=fs.readFileSync('src/index.css','utf8')
  assert.ok(source.includes('flex min-h-0 flex-1 flex-col overflow-hidden'),'Hero has no nested scroll')
  assert.ok(!source.includes('overflow-y-auto overscroll-contain'),'Welcome must not clip card with a scroller')
  assert.ok(source.includes('shrink-0 space-y-1.5 pb-0'),'Primary actions stay in compact footer')
  assert.ok(source.includes('<PazoInstallControl lang={lang} placement="welcome" />'),'Installation lives in login, not Home')
  assert.ok(!source.includes('photo-1543466835-00a7907e9de1'),'No remote stock hero image')
  assert.ok(!mascot.includes('setInterval')&&!mascot.includes('setTimeout'))
  assert.ok(!mascot.includes('fetch(')&&!mascot.includes('localStorage'),'Illustration never collects data')
  const approvedArt=fs.readFileSync('public/onboarding/welcome-approved-art.svg','utf8')
  assert.equal(approvedArt.split('data:image/webp;base64,').length-1,1,
    'Corgi renders as one image, not three independent animated cutouts')
  assert.ok(!/pazoRefTail|pazoRefHead|id="sceneWithoutTail"|id="onlyTail"/.test(approvedArt),
    'No separated sprite seams or synthetic wag')
  assert.ok(approvedArt.includes('viewBox="0 0 295 310"'),'Keep approved upright corgi aspect')
  assert.ok(!approvedArt.includes('Hecho con amor')&&!approvedArt.includes('Comenzar'),'UI copy remains DOM')
  assert.ok(!approvedArt.includes('Hecho con amor')&&!approvedArt.includes('Comenzar'),'UI words stay editable live text')
  for(const name of ['pazoWelcomeDogEnter','pazoWelcomeHeart','pazoWelcomeLine'])
    assert.ok(css.includes('@keyframes '+name),name)
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'))
  assert.ok(!source.includes('ring-')&&!mascot.includes('outline-'),'No UI outlines in new surfaces')
})

test('F16 gratitude wall is accessible from welcome A01 without login, not in Explore', async () => {
  const search=fs.readFileSync('src/components/views/GlobalSearchView.tsx','utf8')
  assert.ok(!search.includes('showGratitudeWall')&&!search.includes('GratitudeWallPreview'),'Explore must remain a search-only experience')
  const welcome=fs.readFileSync('src/components/views/OnboardingView.tsx','utf8')
  assert.ok(welcome.includes("step === 'A01' && showGratitudeWall"),'Public wall only exposed on the welcome step')
  assert.ok(welcome.includes('gratitudeWelcomeLinkRef.current?.focus()'),'Close returns focus to the welcome link')
  assert.ok(welcome.includes('flex min-h-0 flex-1 flex-col overflow-hidden'),'Welcome never scrolls artwork independently')
  assert.ok(welcome.includes('shrink-0 space-y-1.5 pb-0'),'Main account actions have compact footer')
  for(const [lang,entry,primary,login,back] of [
    ['es','Conoce a los Amigos de PAZO','Comenzar','Ya tengo una cuenta','Volver a bienvenida'],
    ['en','Meet the PAZO Friends','Get started','I already have an account','Back to welcome'],
  ]) {
    let ui
    await act(async()=>{ui=create(React.createElement(OnboardingView,{initialStep:'A01',lang,onComplete(){},onSkipToLogin(){},onQuickDemo(){},onToggleLang(){}}))})
    assert.ok(button(ui.root,entry),'Welcome link works before sign-up')
    assert.ok(button(ui.root,primary),'Signup preserved')
    assert.ok(button(ui.root,login),'Login preserved')
    assert.equal(ui.root.findAllByProps({role:'dialog'}).length,0)
    await act(async()=>button(ui.root,entry).props.onClick())
    assert.equal(ui.root.findAllByProps({role:'dialog'}).length,1,'Opening wall does not require a session')
    assert.ok(JSON.stringify(ui.toJSON()).includes(lang==='es'?'Todavía no hay mascotas inscritas voluntariamente.':'No pets have opted in yet.'))
    const dialog=ui.root.findAllByProps({role:'dialog'})[0]
    const close=dialog.findAllByType('button').find(b=>b.props['aria-label']===back)
    assert.ok(close,'Return button names welcome correctly')
    await act(async()=>close.props.onClick())
    assert.equal(ui.root.findAllByProps({role:'dialog'}).length,0)
    assert.ok(button(ui.root,entry),'Welcome accessible again')
    assert.ok(button(ui.root,primary))
    await act(async()=>ui.unmount())
  }
})

test('F16 option D wall shows consent-safe empty illustration and working chronological filters ES/EN', async () => {
  for(const [lang,all,recent,longtime] of [
    ['es','Todos','Recientes','Más tiempo apoyando'],
    ['en','All','Recent','Longtime supporters'],
  ]) {
    let ui
    await act(async()=>{ui=create(React.createElement(GratitudeWallPreview,{lang,onClose(){}}))})
    const root=ui.root
    assert.equal(root.findAllByProps({role:'dialog'}).length,1)
    assert.equal(root.findAllByProps({'aria-label':lang==='es'?'Estado vacío del muro':'Empty wall'}).length,1)
    assert.ok(root.findAll(n=>typeof n.props.className==='string'&&n.props.className.includes('pazo-supporter-float')).length>=4,
      'Reuse the profile customization floating motion for decorations, not content')
    assert.equal(root.findAllByType('article').length,0,'No invented members in public preview')
    assert.ok(button(root,all))
    assert.equal(button(root,all).props['aria-pressed'],true)
    await act(async()=>button(root,recent).props.onClick())
    assert.equal(button(root,recent).props['aria-pressed'],true)
    await act(async()=>button(root,longtime).props.onClick())
    assert.equal(button(root,longtime).props['aria-pressed'],true)
    assert.ok(JSON.stringify(ui.toJSON()).includes(lang==='es'?'Todavía no hay mascotas inscritas voluntariamente.':'No pets have opted in yet.'))
    assert.ok(!JSON.stringify(ui.toJSON()).includes('@luna')&&!JSON.stringify(ui.toJSON()).includes('12 MESES'))
    await act(async()=>ui.unmount())
  }
  const content=fs.readFileSync('src/features/supporter/components/GratitudeWallPreview.tsx','utf8')
  const welcome=fs.readFileSync('src/components/views/OnboardingView.tsx','utf8')
  assert.ok(welcome.includes('setShowGratitudeWall(true)'),'Public wall entry works without authentication')
  assert.ok(welcome.includes('<GratitudeWallPreview'),'Wall is accessible from welcome A01')
  assert.ok(!content.includes('supabase')&&!content.includes('localStorage'),'No paying pets or consent inferred from browser')
  assert.ok(!content.includes('border-')&&!content.includes('ring-'),'No new outlined surfaces')
})


test('F16 option D chronological cards only show validated server props, with honest milestone ordering',async()=>{
  const rows=[
    {pet_id:'11111111-1111-4111-8111-111111111111',pet_name:'Luna',photo_url:'https://synthetic.invalid/luna.png',milestone:0},
    {pet_id:'22222222-2222-4222-8222-222222222222',pet_name:'Milo',photo_url:null,milestone:12},
    {pet_id:'33333333-3333-4333-8333-333333333333',pet_name:'Toby',photo_url:null,milestone:3},
  ]
  let ui
  const render=tab=>React.createElement(GratitudeWallScene,{rows,tab,lang:'es',onClose(){},onTabChange(){}})
  await act(async()=>{ui=create(render('all'))})
  const names=()=>ui.root.findAllByType('article').map(card=>card.findAllByType('h2')[0].children.join(''))
  assert.deepEqual(names(),['Luna','Milo','Toby'])
  assert.ok(JSON.stringify(ui.toJSON()).includes('12 meses verificados'))
  assert.ok(!JSON.stringify(ui.toJSON()).includes('Apoyando desde hace 12 meses'),'Milestone is not an exact tenure')
  assert.ok(!JSON.stringify(ui.toJSON()).includes('unverified purchase'))
  await act(async()=>ui.update(render('recent')))
  assert.deepEqual(names(),['Toby','Milo','Luna'],'Most recent consent first, not invented payment chronology')
  await act(async()=>ui.update(render('longtime')))
  assert.deepEqual(names(),['Milo','Toby','Luna'],'Known milestones used as verified coarse ordering')
  await act(async()=>ui.unmount())
  let failure
  await act(async()=>{failure=create(React.createElement(GratitudeWallScene,{
    rows:[],tab:'all',lang:'en',onClose(){},onTabChange(){},error:true,onRetry(){}
  }))})
  assert.equal(failure.root.findAllByType('article').length,0)
  assert.equal(failure.root.findAllByProps({role:'alert'}).length,1)
  assert.equal(failure.root.findAllByProps({'aria-label':'Empty wall'}).length,0,
    'RPC failure must not be misrepresented as zero consenting pets')
  await act(async()=>failure.unmount())
  const css=fs.readFileSync('src/index.css','utf8')
  const wall=fs.readFileSync('src/features/supporter/components/GratitudeWallScene.tsx','utf8')
  const live=fs.readFileSync('src/features/supporter/components/GratitudeWallLive.tsx','utf8')
  const sql=fs.readFileSync('supabase/migrations/20261017161221_f16_sandbox_qa_verified_benefits_reads.sql','utf8')
  assert.ok(wall.includes('pazo-supporter-float'))
  assert.ok(css.includes('.pazo-supporter-float { animation: none !important; }'))
  assert.ok(wall.includes('/supporter/gratitude-empty-pets.svg'))
  assert.ok(live.includes("supabase.rpc('pazo_supporter_public_wall'"))
  assert.ok(live.includes('validWallRows(data)'))
  assert.ok(sql.includes('c.revoked_at IS NULL'))
  assert.ok(sql.includes("(b.value->>'badge')::boolean IS TRUE"))
  assert.ok(sql.includes('ORDER BY c.granted_at ASC,p.id ASC'))
  assert.ok(!wall.includes('border-')&&!wall.includes('ring-'),'No outlined wall surfaces')
})

test('F16 per-pet consent notice approved in ES/EN never persists preview decisions', async () => {
  const pets=[
    {id:'p1',name:'Luna',species:'perro',photoUrl:'https://synthetic.invalid/luna.png'},
    {id:'p2',name:'Kira',species:'gato',photoUrl:'https://synthetic.invalid/kira.png'}
  ]
  for(const [lang,authorize,remove,decline,prefix,visibility] of [
    ['es','Autorizar a Luna · Simulación','Quitar del muro · Simulación','Ahora no','Si autorizas a Luna','incluso sin iniciar sesión'],
    ['en','Allow Luna · Preview','Remove from the wall · Preview','Not now','If you authorize Luna','including visitors who are not signed in']
  ]) {
    let ui
    await act(async()=>{ui=create(React.createElement(GratitudeParticipationPreview,{pets,lang,onClose(){}}))})
    const root=ui.root, snapshot=()=>JSON.stringify(ui.toJSON())
    const cards=()=>root.findAllByType('button').filter(b=>b.props['aria-expanded']!==undefined)
    assert.equal(cards().length,2)
    assert.equal(cards()[0].props['aria-expanded'],false)
    assert.ok(!snapshot().includes(prefix))
    await act(async()=>cards()[0].props.onClick())
    assert.equal(cards()[0].props['aria-expanded'],true)
    assert.ok(snapshot().includes(prefix))
    assert.ok(snapshot().includes(visibility))
    assert.ok(snapshot().includes(lang==='es'?'datos de pago':'payment details'))
    assert.ok(snapshot().includes(lang==='es'?'capturas o copias':'screenshots or copies'))
    assert.ok(button(root,authorize))
    await act(async()=>button(root,decline).props.onClick())
    assert.equal(cards()[0].props['aria-expanded'],false)
    await act(async()=>cards()[0].props.onClick())
    await act(async()=>button(root,authorize).props.onClick())
    assert.ok(snapshot().includes(lang==='es'?'Seleccionada solo en esta simulación':'Selected in this preview only'))
    assert.equal(cards()[1].props['aria-expanded'],false)
    assert.ok(!snapshot().includes(lang==='es'?'Participa en el muro':'Appears on the gratitude wall'))
    await act(async()=>cards()[0].props.onClick())
    assert.ok(button(root,remove))
    await act(async()=>button(root,remove).props.onClick())
    assert.ok(!snapshot().includes(lang==='es'?'Seleccionada solo en esta simulación':'Selected in this preview only'))
    assert.ok(snapshot().includes(lang==='es'?'Sin guardar cambios':'Changes are not saved'))
    await act(async()=>ui.unmount())
    let reopened
    await act(async()=>{reopened=create(React.createElement(GratitudeParticipationPreview,{pets,lang,onClose(){}}))})
    assert.ok(!JSON.stringify(reopened.toJSON()).includes(lang==='es'?'Seleccionada solo en esta simulación':'Selected in this preview only'))
    await act(async()=>reopened.unmount())
  }
  const src=fs.readFileSync('src/features/supporter/components/GratitudeParticipationPreview.tsx','utf8')
  const pet=fs.readFileSync('src/components/views/PetView.tsx','utf8')
  const member=fs.readFileSync('src/features/supporter/components/SupporterBenefitsHome.tsx','utf8')
  assert.ok(!pet.includes('setShowGratitudeParticipation(true)'),'No duplicated wall card in My Pet')
  assert.ok(member.includes('<SupporterWallConsentSettings lang={lang}'),'Member manages live per-pet wall opt-in')
  assert.ok(!member.includes('<GratitudeParticipationPreview'),'Preview is not mistaken for saved consent')
  assert.ok(!src.includes('supabase')&&!src.includes('localStorage')&&!src.includes('fetch(')&&!src.includes('sessionStorage'))
  assert.ok(!src.includes('border-')&&!src.includes('ring-'))
})

test('F16 consent preview empty state is bilingual', async () => {
  for(const [lang,empty] of [
    ['es','Agrega una mascota para poder elegir si participará.'],
    ['en','Add a pet before choosing whether they will participate.']
  ]) {
    let ui
    await act(async()=>{ui=create(React.createElement(GratitudeParticipationPreview,{pets:[],lang,onClose(){}}))})
    assert.ok(JSON.stringify(ui.toJSON()).includes(empty))
    assert.equal(ui.root.findAllByType('button').filter(b=>b.props['aria-expanded']!==undefined).length,0)
    await act(async()=>ui.unmount())
  }
})

test('F13 approved lifestyle profile exposes only permitted actions and real bio editing', () => {
  const base={
    targetPetId:'someone-elses-pet',
    canReport:true,
    currentPetId:'my-pet',
    ownedPetIds:['my-pet'],
    onClose(){},
    lang:'es'
  }
  const external=renderToStaticMarkup(React.createElement(PublicProfileView,base))
  assert.ok(external.includes('aria-label="Opciones del perfil"'))
  assert.ok(external.includes('aria-haspopup="menu"'))
  assert.ok(!external.includes('Denunciar perfil')) // Visible only after opening menu.
  const own=renderToStaticMarkup(React.createElement(PublicProfileView,{
    ...base,targetPetId:'my-pet',ownedPetIds:['my-pet']
  }))
  assert.ok(!own.includes('aria-haspopup="menu"'))
  const profile=fs.readFileSync('src/components/views/PublicProfileView.tsx','utf8')
  const editor=fs.readFileSync('src/components/views/PetView.tsx','utf8')
  assert.ok(profile.includes("Boolean(petProfile.bio?.trim())"))
  assert.ok(!profile.includes('Denunciar perfil</button>'))
  assert.ok(profile.includes('IconCommunity')&&profile.includes('IconDocument')&&profile.includes('IconHeart'))
  assert.ok(editor.includes('id="pazo-pet-bio"'))
  assert.ok(editor.includes('value={editForm.bio}'))
  assert.ok(editor.includes('bio: editForm.bio'))
  // The old nested glass identity card was rejected: the lifestyle page uses an open canvas.
  assert.ok(profile.includes('identity is ON the canvas'))
  assert.ok(profile.includes('h-[148px] w-[148px]'))
  assert.ok(profile.includes('text-[clamp(39px,10vw,56px)]'))
  assert.ok(profile.includes('bg-[#F8F5EC]'))
  assert.ok(profile.includes('rounded-full bg-white/90'))
  assert.ok(!profile.includes('rounded-[2.65rem] bg-[#FFFCF5]/90'))
  assert.ok(!profile.includes('images.unsplash.com/photo-1543466835'))
  assert.ok(profile.includes('petProfile.photoUrl ?'))
  assert.ok(profile.includes("setPostReportId(post.id)"))
  assert.ok(profile.includes("kind: 'feed_post'"))
  assert.ok(profile.includes("postMenuId === post.id"))
  const follow=fs.readFileSync('src/components/shared/FollowButton.tsx','utf8')
  assert.ok(follow.includes("variant === 'profile' && isFollowing"))
  assert.ok(follow.includes("variant === 'profile' && ("))
  assert.ok(follow.includes('min-h-14'))

})

test('F13 feed post actions stay inside an accessible overflow menu; hide can be undone', async () => {
  const post={
    id:'synthetic-feed-post',petId:'another-pet',petName:'Second pet',petSpecies:'perro',
    petAvatar:'',location:'Los Angeles',timeAgo:'1 h',text:'Synthetic card content',
    photoUrl:null,likes:0,comments:[]
  }
  let renderer
  await act(async()=>{renderer=create(React.createElement(HomeView,{
    posts:[post],canReport:true,currentPetId:'',ownedPetIds:[],lang:'en',
    onLikePost(){},onSavePost(){},onAddComment:async()=>true,onLoadComments:async()=>true,onSelectPetProfile(){}
  }))})
  const menuButton=()=>renderer.root.findAllByType('button').find(b=>b.props['aria-haspopup']==='menu')
  assert.ok(menuButton())
  assert.equal(menuButton().props['aria-expanded'],false)
  assert.equal(button(renderer.root,'Report'),undefined)
  await act(async()=>menuButton().props.onClick())
  assert.equal(menuButton().props['aria-expanded'],true)
  assert.ok(button(renderer.root,'Hide post'))
  assert.ok(button(renderer.root,'Report'))
  await act(async()=>button(renderer.root,'Hide post').props.onClick())
  assert.equal(button(renderer.root,'Hide post'),undefined)
  assert.ok(button(renderer.root,'Undo'))
  assert.ok(!JSON.stringify(renderer.toJSON()).includes('Synthetic card content'))
  await act(async()=>button(renderer.root,'Undo').props.onClick())
  assert.ok(JSON.stringify(renderer.toJSON()).includes('Synthetic card content'))
  assert.equal(menuButton().props['aria-expanded'],false)
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

test('F16 Sandbox account status: only server-verified paid pet shows original badge and public wall consent',async()=>{
  const database=globalThis.__PAZO_CLOSURE_TEST_DB__
  const originalAuth=database.auth.getUser
  const originalFrom=database.from
  const originalRpc=database.rpc
  const OWNER='11111111-1111-4111-8111-111111111111'
  const PET='41111111-1111-4111-8111-111111111111'
  const row={id:PET,name:'Mascota QA'}
  const setup=({badge=false,consent=false,wall=false,error=false})=>{
    database.auth.getUser=async()=>({data:{user:{id:OWNER}},error:null})
    database.from=table=>{
      assert.equal(table,'pets')
      return {select:()=>({eq:(key,value)=>{
        assert.equal(key,'owner_id');assert.equal(value,OWNER)
        return {limit:async count=>{assert.equal(count,8);return {data:[row],error:null}}}
      }})}
    }
    database.rpc=async (name)=>{
      if(error)return {data:null,error:{code:'QA_DISCONNECTED'}}
      if(name==='pazo_wall_my_consents')
        return {data:[{pet_id:PET,opted_in:consent}],error:null}
      if(name==='pazo_supporter_public_wall')
        return {data:wall?[{pet_id:PET,pet_name:'Mascota QA',photo_url:null,milestone:0}]:[],error:null}
      if(name==='pazo_supporter_public_pet_benefits')
        return {data:{badge,theme:null,milestone:0},error:null}
      throw Error('Unexpected QA RPC '+name)
    }
  }
  try{
    for(const scenario of [
      {badge:false,consent:false,wall:false,expectedImage:false},
      {badge:true,consent:false,wall:false,expectedImage:true},
      {badge:true,consent:true,wall:true,expectedImage:true},
      {badge:false,consent:true,wall:true,expectedImage:false,expectedError:true},
      {error:true,expectedImage:false,expectedError:true},
    ]) {
      setup(scenario)
      let view
      await act(async()=>{view=create(React.createElement(SupporterSandboxBenefitsStatus,{lang:'es'}))})
      const images=view.root.findAllByType('img')
      assert.equal(images.length>0,scenario.expectedImage,
        'Cannot manufacture original supporter badge in '+JSON.stringify(scenario))
      if(scenario.expectedImage)
        assert.ok(images[0].props.src.includes('/supporter/amigo-pazo-inicio.png'))
      assert.equal(view.root.findAll(n=>n.props.role==='alert').length>0,
        Boolean(scenario.expectedError))
      await act(async()=>{view.unmount()})
    }
  }finally{
    database.auth.getUser=originalAuth
    database.from=originalFrom
    if(originalRpc===undefined)delete database.rpc
    else database.rpc=originalRpc
  }
})


test('Feed location comes from an explicit author choice, never a hardcoded city or private zone leak',()=>{
  const createPost=fs.readFileSync('src/components/modals/CreatePostModal.tsx','utf8')
  const feed=fs.readFileSync('src/components/views/HomeView.tsx','utf8')
  const app=fs.readFileSync('src/App.tsx','utf8')
  const profile=fs.readFileSync('src/components/views/PublicProfileView.tsx','utf8')
  const postService=fs.readFileSync('src/services/postService.ts','utf8')
  assert.ok(!createPost.includes("location: 'Los Ángeles, CA'"),'No fake location in new post writes')
  assert.ok(createPost.includes('const [shareLocation, setShareLocation] = useState(false)'),
    'Private location is never public by default')
  assert.ok(createPost.includes("setPostLocation(currentPet?.zone?.trim() || '')"),
    'Author can opt to use their own private-zone value deliberately')
  assert.ok(createPost.includes('checked={shareLocation}')&&createPost.includes('onChange={(e)=>setShareLocation(e.target.checked)}'),
    'Location disclosure requires a visible opt-in')
  assert.ok(createPost.includes("Se mostrará públicamente. Comparte solo ciudad o zona, no tu dirección."),
    'Disclosure of location visibility is explicit and discourages street addresses')
  assert.ok(createPost.includes('location: selectedLocation,'),
    'Write the selected location or explicit null, not a default city')
  assert.ok(createPost.includes('shareLocation?postLocation.trim():null'),
    'Unchecked location must be persisted as NULL')
  assert.ok(createPost.includes('maxLength={90}'))
  assert.ok(createPost.includes("location: newPostData.location || ''"))
  assert.ok(feed.includes('post.location ? <>{post.location} &bull; </> : null'),
    'Omit the separator and label if location was not disclosed')
  assert.ok(app.includes("location: wasAuthorDeleted(post) ? '' : (post.location || '')"))
  assert.ok(profile.includes("location: p.location || ''"))
  assert.ok(postService.includes("(p.location || '')"))
  assert.ok(!createPost.includes('navigator.geolocation')&&!createPost.includes('getCurrentPosition'),
    'No implicit device GPS collection')
})


test('F17 mobile regression: dynamic viewport, discreet install, street basemap and centered dialogs', () => {
  const read = path => fs.readFileSync(path,'utf8')
  const app = read('src/App.tsx')
  const welcome = read('src/components/views/OnboardingView.tsx')
  const install = read('src/features/pwa/components/PazoInstallControl.tsx')
  const map = read('src/features/places/map/MapboxMap.tsx')
  const basemap = read('src/features/places/map/pazoBasemap.ts')
  const stage = read('src/features/places/components/ImmersivePlacesStage.tsx')
  assert.ok(app.includes('h-[100dvh]'))
  assert.ok(app.includes('data-pazo-app-shell className="w-full sm:max-w-[430px] h-full min-h-0'))
  assert.ok(!app.includes('placement="banner"'),'Do not obscure the home feed with installation')
  assert.ok(welcome.includes('placement="welcome"'),'Discoverable on the first screen')
  assert.ok(install.includes("placement === 'welcome'"))
  assert.ok(install.includes('if (state.installed || (!state.pending && !isIOS())) return null'),
    'Standalone installations never receive the install suggestion')
  assert.ok(map.includes('style: PAZO_STANDARD_STYLE'),'Use official Standard only')
  assert.ok(map.includes('setMapAttempt(attempt => attempt + 1)'),'Provider failures offer an explicit retry')
  assert.ok(map.includes("map.on('style.load'"),'Restore overlays after style loads')
  assert.ok(map.includes("'pazo-place-models'"),'3D models remain')
  assert.ok(basemap.includes('mapbox://styles/mapbox/standard'))
  assert.ok(!basemap.includes('openstreetmap'),'No silent raster substitution')
  assert.ok(map.includes('attributionControl: true'),'Mapbox must render provider attribution')
  for(const path of ['CareModal','PassportModal','CreateModal']){
    const ui=read('src/components/modals/'+path+'.tsx')
    assert.ok(ui.includes('grid-cols-[32px_minmax(0,1fr)_32px]'),path+' title must be geometrically centered')
  }
  assert.ok(!read('src/components/views/CommunitiesView.tsx').includes('Únete, comparte y participa con otras mascotas de PAZO.'))
  assert.ok(!read('src/components/modals/MessagesModal.tsx').includes("PAZO · {lang === 'es'"))
  assert.ok(!read('src/components/modals/NotificationsModal.tsx').includes("PAZO · {lang === 'es'"))
})

test('F17 Places polish: transparent filter rail, feathered carousel edges, real photos only, external directions and rounded feed metrics', async () => {
  const stage = fs.readFileSync('src/features/places/components/ImmersivePlacesStage.tsx','utf8')
  const svc = fs.readFileSync('src/services/placeService.ts','utf8')
  const map = fs.readFileSync('src/components/views/MapView.tsx','utf8')
  const feed = fs.readFileSync('src/components/views/HomeView.tsx','utf8')
  const photo = fs.readFileSync('src/features/places/components/PlaceCardPhoto.tsx','utf8')
  assert.ok(stage.includes('data-pazo-category-fade="true"'))
  assert.ok(stage.includes('WebkitMaskImage:'))
  assert.ok(stage.includes('bg-transparent p-0 shadow-none'))
  assert.ok(stage.includes('<PlaceCardPhoto place={place} lang={lang} />'))
  assert.ok(!svc.includes('photoUrl: row.photo_url || DEFAULT_PLACE_PHOTO'),
    'A generic stock road must never masquerade as a verified venue photo')
  assert.ok(photo.includes('Foto no disponible'))
  assert.ok(photo.includes('setFallbackAttempt(true)') && photo.includes('setFailed(true)'),'Fallback retries the original credited Wikimedia file only')
  assert.ok(map.includes('data-pazo-directions="true"'))
  assert.ok(map.includes('buildPlaceDirectionsUrl(selectedPlace'))
  assert.ok(feed.includes('aria-pressed={post.isLiked}'))
  assert.ok(feed.includes('Comentarios:'))
  assert.ok(feed.includes('rounded-full bg-[#EEF4E7]'))
  assert.ok(feed.includes('onLikePost(post.id)'))
  assert.ok(feed.includes('onToggleComments(post.id)'))
  assert.ok(feed.includes('onSavePost(post.id)'))
  const {buildPlaceDirectionsUrl} = await import('../src/features/places/placeDirections.ts')
  const place={name:'Runyon Canyon Park',latitude:34.10519,longitude:-118.348955,address:'2000 N Fuller Ave'}
  assert.match(buildPlaceDirectionsUrl(place, 'Mozilla/5.0 (Linux; Android 14)'), /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1/)
  assert.ok(buildPlaceDirectionsUrl(place,'iPhone').startsWith('https://maps.apple.com/?daddr='))
  assert.match(buildPlaceDirectionsUrl({...place,latitude:NaN,longitude:NaN},'Android'), /Runyon%20Canyon%20Park/)
})


test('F17 mobile: centered modal, brand typography, floating map nav and image credit gate',()=>{
  const map=fs.readFileSync('src/components/views/MapView.tsx','utf8')
  const mapbox=fs.readFileSync('src/features/places/map/MapboxMap.tsx','utf8')
  const nav=fs.readFileSync('src/components/BottomNav.tsx','utf8')
  const css=fs.readFileSync('src/index.css','utf8')
  const stage=fs.readFileSync('src/features/places/components/ImmersivePlacesStage.tsx','utf8')
  assert.ok(map.includes('createPortal(') && map.includes('document.body'))
  assert.ok(map.includes('data-pazo-place-backdrop="true"') && map.includes('aria-modal="true"'))
  assert.ok(!map.includes('top-[102px] z-40 overflow-y-auto'))
  assert.ok(nav.includes('data-pazo-floating-nav="true"') && nav.includes('absolute inset-x-0 bottom-0 z-30 bg-transparent'))
  const appShell=fs.readFileSync('src/App.tsx','utf8')
  assert.ok(appShell.includes('pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-[calc(6rem+env(safe-area-inset-bottom))]'),'Main reserves only 6rem plus safe-area because social views already have pb-6')
  assert.ok(['src/components/views/HomeView.tsx','src/components/views/CommunitiesView.tsx','src/components/views/PetView.tsx'].every(path=>fs.readFileSync(path,'utf8').includes('animate-slide-up pb-6')),'Every social view already supplies its own 1.5rem bottom padding; do not duplicate it')
  assert.ok(!appShell.includes('pb-[calc(9rem+env(safe-area-inset-bottom))]') && !appShell.includes('pb-[calc(13rem+env(safe-area-inset-bottom))]'),'Overlong bottom spacers must not return')
  assert.ok(appShell.includes("activeTab === 'inicio' || activeTab === 'comunidades' || activeTab === 'mascota'"),'Fade must only cover Feed, Communities and My Pet')
  assert.ok(appShell.includes('data-pazo-scroll-soft-edge="true"') && appShell.includes('className="pazo-scroll-soft-edge"'),'The fade is a separate noninteractive sibling above scrolling content')
  assert.ok(appShell.indexOf('data-pazo-scroll-soft-edge="true"') > appShell.indexOf('</main>') && appShell.indexOf('data-pazo-scroll-soft-edge="true"') < appShell.indexOf('<BottomNav'),'The scroll fade must render below the crisp floating nav')
  assert.ok(css.includes('.pazo-scroll-soft-edge::before') && css.includes('backdrop-filter: blur(20px)') && css.includes('-webkit-mask-image: linear-gradient(to top'),'Frosted-glass effect must keep 20px real blur and mask aligned to the dock orb')
  assert.ok(!css.includes('.pazo-scroll-soft-edge::after') && !css.includes('background: linear-gradient(to bottom,\n    rgba(250, 248, 245'),'No cream fog layer may cover the actual photograph')
  assert.ok(css.includes('pointer-events: none;') && css.includes('bottom: 0;') && css.includes('height: calc(5.75rem + clamp(84px, 13dvh, 116px) + 20px + env(safe-area-inset-bottom, 0px));'),'Continuous fade must extend under the entire dock area without intercepting touches')
  assert.ok(!css.includes('bottom: calc(5.75rem + env(safe-area-inset-bottom, 0px));'),'Never stop blur above the dock or show the previously visible sharp horizontal seam')
  assert.ok(css.includes('rgba(0, 0, 0, 0.48) calc(6.4rem + env(safe-area-inset-bottom, 0px))') && css.includes('transparent calc(8.25rem + env(safe-area-inset-bottom, 0px))'),'Blur reaches the top of moving orb and fades before distant social controls')
  assert.ok(css.includes('rgba(0, 0, 0, 0.14) calc(7.35rem + env(safe-area-inset-bottom, 0px))') && css.includes('#000 calc(4.5rem + env(safe-area-inset-bottom, 0px))'),'Mask progresses gradually without a sharp band')
  assert.ok(!css.includes('transparent 45%'),'Orb-aligned blur must not regress to a viewport-dependent percentage mask')
  assert.ok(!css.includes('rgba(0, 0, 0, 0.28) 35%'),'Do not blur mid-distance feed controls')
  assert.ok(!css.includes('isolation: isolate;'),'Blur must sample scrolled content rather than an isolated transparent stack')
  assert.ok(css.includes('background: transparent;'),'Blur glass layer must have no tinted overlay')
  assert.ok(stage.includes('data-pazo-places-bottom-rail="true"') && stage.includes('bottom-[calc(6.75rem+env(safe-area-inset-bottom))]'),'Places cards remain above the floating dock')
  assert.ok(stage.includes('data-pazo-places-card-scroll="true"') && stage.includes('overflow-visible bg-transparent'),'Places rail has no vertical scroll area')
  assert.ok(!stage.includes('data-pazo-places-dock-clearance="true"'),'Places cards do not contain artificial bottom clearance')
  assert.ok(stage.includes('data-pazo-places-fixed-heading="true"') && stage.includes('data-pazo-places-card-scroll="true"'),'Places heading stays visible while cards scroll independently')
  // PO before/after Android comparison: only details should have been upscaled.
  // Canvas filters, heading, result count and card metadata retain F13 scale.
  assert.ok(stage.includes('px-3.5 py-2 text-[11px] font-extrabold'),'Places filter chips retain original compact size')
  assert.ok(stage.includes('<h2 className="text-[15px] font-black leading-tight'),'Places heading returns to its original 15px')
  assert.ok(stage.includes('aria-live="polite" className="text-[11px] font-semibold'),'Results counter returns to 11px')
  assert.ok(stage.includes('line-clamp-2 text-[14px] font-black'),'Place titles stay at 14px')
  assert.ok(stage.includes('mt-1 truncate text-[10px] font-extrabold'),'Card category/zone returns to 10px')
  assert.ok(stage.includes('pt-1.5 text-[10px] font-bold'),'Card presence returns to 10px')
  assert.ok(!stage.includes('rounded-full bg-[#FFFCF6]/90 px-3 py-1 shadow-'),'No new large white capsule behind the heading')
  assert.ok(map.includes('data-pazo-place-detail-scroll="true"') && map.includes('text-[22px]'),'Details keep their separately approved accessible scale')
  assert.ok(map.includes('data-pazo-place-fixed-header="true"') && map.includes('data-pazo-place-detail-scroll="true"'),'Place details title/close remain visible while voting and check-in scroll')
  assert.ok(mapbox.includes('const [mapNotice, setMapNotice]') && mapbox.includes('Mapbox no autorizó la cartografía'),'Provider denial still disclosed without raw token')
  assert.ok(!stage.includes('h-[min(48dvh,300px)]'),'Do not crop cards by subtracting padding from a fixed-height rail')
  assert.ok(!stage.includes('&copy; OpenStreetMap contributors'),'Do not place a huge duplicate attribution over the map')
  assert.ok(mapbox.includes('syncPlaceMarkers(map, mapboxgl, placesRef.current)'),'Always render real PAZO place annotations independent of tile success')
  assert.ok(!mapbox.includes('map.setStyle('),'Never replace the approved Standard style on resource errors')
  assert.ok(mapbox.includes('pazo-terrain-dem') && mapbox.includes('map.setTerrain('),'Authorized map style exposes actual elevation terrain')
  assert.ok(map.includes('data-pazo-place-details="true"') && map.includes('text-[22px]'),'Only the place detail dialog gets larger type')
  assert.ok(css.includes('.pazo-place-card:has(img[data-pazo-place-photo="true"])'))
  assert.ok(stage.includes('pazo-photo-credit'))
})

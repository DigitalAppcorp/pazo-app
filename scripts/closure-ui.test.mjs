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
const {mapNotificationRow,getNotificationCommunityId,getNotificationSightingId}=await load('features/notifications/notificationSource.js')
const {OnboardingView}=await load('components/views/OnboardingView.js')
const {HomeView}=await load('components/views/HomeView.js')
const {PetView}=await load('components/views/PetView.js')
const {BottomNav}=await load('components/BottomNav.js')
const {PublicProfileView}=await load('components/views/PublicProfileView.js')
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
  }
  await act(async()=>{ui.update(React.createElement(BottomNav,{...props,labels:{
    inicio:'Home',comunidades:'Communities',crear:'Create',mapa:'Map',mascota:'My Pet'
  }}))})
  assert.deepEqual(buttons().map(b=>b.props['aria-label']),['Home','Communities','Create','Map','My Pet'])
  await act(async()=>{ui.unmount()})
  const css=fs.readFileSync('src/index.css','utf8')
  for(const part of ['.pazo-liquid-indicator','.pazo-liquid-surface','@property --pazo-liquid-center','background: #FFF8EB','top: 14px','bottom: -3px','-webkit-mask-image: radial-gradient(circle 30px','mask-image: radial-gradient(circle 30px','transparent 0 29px, #000 30px','transition: --pazo-liquid-center 460ms','background: #204E4A','box-shadow: 0 8px 17px','@keyframes pazoLiquidSettle','prefers-reduced-motion: reduce', '.pazo-liquid-surface, .pazo-liquid-indicator { transition: none','animation: none; transform: translateY(-15px)'])assert.ok(css.includes(part),part)
  const surfaceCss=css.split('.pazo-liquid-surface {')[1].split('}')[0]
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
  assert.ok(navSource.includes('bg-[#FAF8F5]'),'Cutout must expose the exact PAZO app background')
  assert.ok(appSource.includes('flex flex-col h-full bg-[#FAF8F5] relative overflow-hidden'),'App canvas contract stays unchanged')
  assert.ok(navSource.includes('h-[76px]'),'Nav track must allow readable labels on mobile')
  assert.ok(navSource.includes('pt-1 pb-[calc(0.75rem+env(safe-area-inset-bottom))]'),'Bar must clear mobile safe area and have comfortable bottom spacing')
  assert.ok(navSource.includes("pazo-liquid-icon--active text-[#E1E53F]"),'Active icon must contrast with official dark green orb')
  assert.ok(fs.readFileSync('src/components/BottomNav.tsx','utf8').includes('bg-[#FAF8F5]'),'Notch must reveal the same background as PAZO, not a darker cream')
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
  assert.ok(mapView.includes('motion-safe:animate-[slideUpFade_320ms_ease-out_both]'))
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
  assert.ok(view.includes("aria-pressed={activeTab === key}"))
  assert.ok(view.includes("setActiveTab(key)"))
  for(const identifier of ['handleCreatePost','toggleComments','handleDeleteComment','handleLike','handleRemoveMember','handleSaveEdit','handleArchive','CommunityFeatureExperimentCard']){
    assert.ok(view.includes(identifier),identifier)
  }
  assert.ok(view.includes('onSubmit={handleCreatePost}'))
  assert.ok(!view.includes('rounded-[2.4rem] pazo-glass-card'))
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
    assert.equal(menuButtons.length,3)
    assert.deepEqual(menuButtons.map(buttonText),[privacy,terms,lang==='es'?'Solicitar eliminación de cuenta':'Request account deletion'])
    assert.ok(JSON.stringify(ui.toJSON()).includes(section),'Account section must live inside settings')
    assert.equal(menuButtons[2].props.disabled,true,'Existing production request gate must remain disabled')
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

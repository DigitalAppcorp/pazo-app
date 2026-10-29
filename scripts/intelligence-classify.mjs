// Reviewable coverage policy: source definitions, never automatic runtime capture.
import fs from 'node:fs'
import ts from 'typescript'
const functionCache=new Map()
function bodies(file,handler){
 if(!functionCache.has(file)){
  const tree=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),functions=new Map()
  function visit(n){if(ts.isVariableDeclaration(n)&&n.initializer&&ts.isArrowFunction(n.initializer)&&n.initializer.body)functions.set(n.name.getText(tree),n.initializer.body.getText(tree));if(ts.isFunctionDeclaration(n)&&n.name&&n.body)functions.set(n.name.text,n.body.getText(tree));ts.forEachChild(n,visit)}visit(tree);functionCache.set(file,functions)
 }
 const functions=functionCache.get(file)
 return handler+'\n'+[...handler.matchAll(/\b(?:handle|on)[A-Z]\w*/g)].map(x=>functions.get(x[0])||'').join('\n')
}
const input='artifacts/issue153/inventory/controls.json'
const data=JSON.parse(fs.readFileSync(input,'utf8'))
for(const c of data.controls){
 const text=c.file+' '+c.handler+' '+c.label
 const assign=(status,task,source,reason,identity='authenticated_eligible')=>Object.assign(c,{status,task,source,reason,identity,purpose:task,action:c.handler||c.tag,state:'Defined at source; runtime states covered separately',successAuthority:status==='REUSE_SOURCE'?source:'No success asserted by UI',sensitivity:'No content/identifier permitted in analytics',cost:status==='PROPOSED'?'Once task/kind/session; 64 maximum, batch 8':'No additional write',question:'Which task receives interest, fails, or achieves confirmed utility?',priority:status==='PROPOSED'||status==='REUSE_SOURCE'?'P1':'P2',test:'TEST_MATRIX_AND_EVIDENCE.md; source file/line is review anchor'})
 if(/admin|moderation\/(?!ReportDialog)|maintenance\/Admin|Sandbox|supporter|support\/components\/Admin/i.test(c.file))assign('EXCLUDED_WITH_REASON','Privileged or financial controls','Existing operational audit','Staff, payment and invitation actions cannot be product conversions','excluded')
 else if(/MessagesModal|SightingDetail|PublicRescue|LostAlert|ActiveLost|AlertModal|DeletionRequest|SupportRequest|AuthContext|PasswordRecovery|LegalPreview|MaintenanceGate|\/main.tsx|CreateModal - copia/.test(c.file))assign('EXCLUDED_WITH_REASON','Sensitive or operational control','Existing domain/operational records','Messaging, rescue/location, erasure, recovery secrets, legal and unused copy controls are excluded; no task content is collected','excluded')
 else if(/features\/marketing/.test(c.file))assign('EXCLUDED_WITH_REASON','Analytics/report or privacy control','Existing #150 privacy/report','Do not measure administration or turn withdrawal into a conversion','excluded')
 else if(/validation|FeatureExperiment|FutureGate/.test(c.file))assign('REUSE_SOURCE','Future feature interest','module_validation_views / interests / intents','Use existing visible-view and declared-interest rows; do not duplicate answers')
 else if(/GlobalSearch|search\//.test(c.file))assign('REUSE_SOURCE','Search discovery','search_usage_events','Existing search actions contain closed types and has-results, no query; new report applies eligibility/window')
 else if(/Onboarding|demo\/|FirstUsePrompt/.test(c.file))assign('PROPOSED','Acquisition / Demo / first value','#150 prereg + anonymous experience daily + pets','Aggregate anonymous requests only; signup remains existing protected source; no person conversion or identity bridge','anonymous_aggregate_or_verified_separate')
 else if(/HomeView/.test(c.file))assign('REUSE_SOURCE','Feed exposure and participation','interactions / posts / post_comments; #150 loading/error/retry','Existing 60% visibility and 3s signal do not prove reading; interactions and published rows remain authoritative')
 else if(/FollowButton|PublicProfile|profile\//.test(c.file))assign('REUSE_SOURCE','Profile discovery / follow','follows / #153 coarse profile intent','Follow is current persisted relationship, not satisfaction; no target ID in new observation')
 else if(/CareModal|PassportModal|DocumentsModal|AddPetModal|CreatePostModal|CreateCommunityModal|SuggestPlaceModal|CreateModal.tsx/.test(c.file))assign('PROPOSED','Tool / create task','Domain service attempt/failure + existing committed rows','Semantic service boundary covers submission; fields, close, preview and formatting are deliberately not additional events')
 else if(/Communit|MapView|places\/|PetView|BottomNav|HeaderBar|PazoInstallControl|ErrorBoundary|HomeFeedStatus|App.tsx/.test(c.file))assign('PROPOSED','Navigation / discovery / task','Existing #150 views + #153 named task boundaries','Named tasks and service errors only; tabs, visual options, text fields and duplicate render bindings add no event')
 else assign('EXCLUDED_WITH_REASON','Presentation / input / local choice','No new event','Local dismiss, input, preview or shared visual primitive adds no actionable independent signal; parent semantic task is covered','excluded')
 if(c.status==='PROPOSED'){
  if(['input','textarea','select','summary'].includes(c.tag)||/onClick=\{onClose\}|onClick=\{onBack\}|setShow|setStep|set.*Open\(false\)|setPetSpecies|toggleInterest/.test(c.handler))assign('EXCLUDED_WITH_REASON','Local input / presentation within a covered task','Parent semantic submission or screen observation','No independent click event: content fields, preview, local choice, close and formatting are not an actionable separate conversion','excluded')
  else if(/BottomNav|HeaderBar|HomeFeedStatus|ErrorBoundary/.test(c.file))assign('REUSE_SOURCE','Screen navigation / load / retry','Released #150 screen_view/loading/error/retry','Existing screen transitions and recovery already cover this control; no second observation')
  else if(/observeTask|observeAnonymous|observePrereg/.test(c.handler)||/Onboarding|DemoGuestViews|FirstUsePrompt|App.tsx|CareModal|PassportModal|DocumentsModal|CreatePost|CreateCommunity|AddPetModal|SuggestPlace|Communit|MapView|PetView|PazoInstall/.test(c.file))assign('INSTRUMENTED','Semantic task or screen binding','Explicit #153 task boundary / anonymous signal + reused #150/domain source','Coverage is at the named task/service/screen boundary, not one new event for each button. See taxonomy binding table; native inputs/local choices stay excluded.',/Onboarding|DemoGuest/.test(c.file)?'anonymous_aggregate_or_verified_separate':'authenticated_eligible')
  else assign('EXCLUDED_WITH_REASON','Local composition control','Covered parent screen/task','No separate event justified beyond the parent semantic task','excluded')
 }
 if(/MapView|places\//.test(c.file)&&c.status!=='EXCLUDED_WITH_REASON'&&!/observeTask/.test(c.handler))assign('REUSE_SOURCE','Place discovery and navigation','place_usage_events + module_validation_*; new map_open failure boundary','Reuse map_open/search/place_open/filter and existing fake-door rows. Precise location and check-ins excluded from analytics')
 c.route=/HomeView/.test(c.file)?'Inicio / Home':/MapView|places\//.test(c.file)?'Lugares / Places':/Communit/.test(c.file)?'Comunidades / Communities':/Admin|marketing/.test(c.file)?'Administración / Administration':/Onboarding/.test(c.file)?'Bienvenida y registro / Welcome and signup':c.file
 if(c.status==='INSTRUMENTED'){
  const body=bodies(c.file,c.handler)
  const direct=/beginTask\(|observeTask\(|observeAnonymous\(|observePrereg\(/.test(body)
  const delegates=/CareModal|DocumentsModal|AddPetModal|CreateCommunityModal|SuggestPlaceModal/.test(c.file)&&/handle(Submit|Save|Upload|Download|Delete|Complete|Archive|Undo)|on(Create|Update|Upload|Download|Delete|Complete|Archive|Undo)/.test(c.handler)
  const onboarding=/Onboarding|DemoGuest/.test(c.file)&&/handle(SignUp|FinishOnboarding)|onQuickDemo|onCreateAccount|onExit|onSkipToLogin|onOpenCommunities|onOpenPlaces|onSelectPet/.test(c.handler)
  const taskBinding=c.definition==='component_binding'&&/on(CreateCare|UpdateCare|CompleteCare|UploadDocument|DownloadDocument|CreatePost|CreatePet)/.test(c.handler)
  if(direct||delegates||onboarding||taskBinding){
   c.task=body.match(/(?:beginTask|observeTask)\('([^']+)'/)?.[1]||c.task
   c.reason='Verified explicit handler, service delegation or coarse Demo/registration boundary; not a raw click event. See named bindings in taxonomy.'
  }else if(/onOpen(Care|Passport|Search)|setActiveTab|onSelectTab/.test(c.handler))assign('REUSE_SOURCE','Screen/tool navigation','Released #150 screen observations','Opening an existing tool is already represented by screen_view; no duplicate click')
  else assign('EXCLUDED_WITH_REASON','Local control within an observed screen','Parent screen / authoritative task source','No distinct semantic observation is emitted for this control. Local tabs, previews, picker/close actions, formatting and destructive moderation controls do not justify an independent event. The screen and committed core task remain covered.','excluded')
 }
}
if(data.controls.some(x=>x.status==='NEEDS_REVIEW'))throw Error('Unclassified control')
const out='docs/product-intelligence';fs.mkdirSync(out,{recursive:true})
const compactArray=rows=>'[\n'+rows.map(x=>'  '+JSON.stringify(x)).join(',\n')+'\n ]'
fs.writeFileSync(out+'/EVENT_COVERAGE_MATRIX.json','{\n "scope":'+JSON.stringify(data.scope)+',\n "surfaces":'+compactArray(data.surfaces)+',\n "controls":'+compactArray(data.controls)+'\n}\n')
const counts=Object.fromEntries([...new Set(data.controls.map(x=>x.status))].map(k=>[k,data.controls.filter(x=>x.status===k).length]))
fs.writeFileSync(out+'/EVENT_COVERAGE_MATRIX.md',`# Cobertura #153\n\nInventario de ${data.surfaces.length} archivos TSX y ${data.controls.length} definiciones de controles. Los elementos repetidos de listas cuentan como una definición; no son usuarios ni clics. Cero controles sin clasificar.\n\nMatriz completa y verificable: [JSON](EVENT_COVERAGE_MATRIX.json), con componente, línea, etiqueta ES/EN literal o expresión del código, handler, propósito, fuente, identidad, autoridad, privacidad, coste, prioridad y prueba. Las etiquetas dinámicas se verifican además en navegación ES/EN.\n\nClasificación: ${JSON.stringify(counts)}. PROPOSED representa el ámbito de instrumentación propuesto en la auditoría inicial; su ejecución y cobertura real deben contrastarse con el catálogo y pruebas finales, no implica que cada campo de formulario emita eventos.\n\nEl inventario distingue plantillas compartidas de instancias. Excluir un campo no excluye la tarea de envío. Feed/fake doors reutilizan fuentes existentes; exposición no significa lectura, interés no significa adopción. Administración, pagos, secretos y contenido sensible quedan fuera de conversiones. No se afirma que las anotaciones agrupadas sean una auditoría manual de cada píxel.\n\nRegenerar: node scripts/intelligence-inventory.mjs && node scripts/intelligence-classify.mjs. Política explícita en el segundo script; no existe autocaptura en producción. Validación de rutas y estados: TEST_MATRIX_AND_EVIDENCE.md.\n`)
console.log(JSON.stringify({surfaces:data.surfaces.length,controls:data.controls.length,unclassified:0,counts}))

// Interactive LOCAL staging for this feature. Synthetic data only; the actual
// native React dashboard calls an HTTP adapter backed by isolated PostgreSQL.
// Auth is a disclosed QA double; no production credentials or domain writes.
import {createServer} from 'vite'
import {sql} from './marketing-sql-lab.mjs'
import {visualAdmin} from './admin-visual-fixture.mjs'
import {visualFontCss} from './admin-visual-font.mjs'
if(sql("SELECT to_regprocedure('public.pazo_admin_visual_summary_v1(integer,text,text,text)') IS NOT NULL")!=='t')throw Error('Run test:admin-visual:pg17 first; this server never installs or seeds anything')
const font=await visualFontCss(),port=5364
// Keep the product's strict project configuration untouched. The QA document
// redirects that project's requests to this loopback adapter before fetching.
process.env.VITE_SUPABASE_URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_synthetic'
const functions=new Set(['pazo_admin_visual_summary_v1','pazo_admin_behavior_summary_v1','pazo_admin_intelligence_summary_v1'])
const quote=v=>"'"+String(v).replaceAll("'","''")+"'"
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port,strictPort:true},plugins:[{
 name:'isolated-analytics-staging',
 transformIndexHtml(html,ctx){
  if(!ctx.path.includes('behavior-harness.html'))return html
  const transport=`<script>const qaFetch=window.fetch.bind(window);window.fetch=(input,init)=>{const u=new URL(input instanceof Request?input.url:String(input),location.href);if(u.origin==='https://mrybvqdebbgcayuvgkkr.supabase.co'){const local=location.origin+u.pathname+u.search;return qaFetch(input instanceof Request?new Request(local,input):local,init)}if(u.origin===location.origin)return qaFetch(input,init);return Promise.reject(new Error('External requests are disabled in synthetic staging'))}</script>`
  return html.replace('</head>','<title>PAZO · Revisión privada del panel</title><style>'+font+'</style>'+transport+'</head>')
 },
 configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
  const path=new URL(req.url,'http://127.0.0.1').pathname
  if(!path.startsWith('/rest/v1/')&&!path.startsWith('/auth/v1/'))return next()
  const reply=(data,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))}
  if(path.startsWith('/auth/v1/'))return reply({code:'SYNTHETIC_STAGING_NO_LOGIN'},401)
  const fn=path.split('/rpc/')[1]
  if(req.method!=='POST'||!functions.has(fn))return reply({code:'ONLY_ISOLATED_ANALYTICS_SUPPORTED'},503)
  try{
   let body='';for await(const chunk of req){body+=chunk;if(body.length>8192)return reply({code:'PAYLOAD_TOO_LARGE'},413)}
   const a=JSON.parse(body),days=Number(a.p_days)
   if(![7,14,30,90].includes(days))return reply({code:'INVALID_WINDOW'},400)
   const args=[days,quote(a.p_segment??'all'),quote(a.p_creative??'all')]
   if(fn==='pazo_admin_visual_summary_v1')args.push(quote(a.p_audience??'all'))
   return reply(JSON.parse(sql(visualAdmin(`SELECT public.${fn}(${args.join(',')})`))))
  }catch{return reply({code:'ISOLATED_REPORT_UNAVAILABLE'},503)}
 })}
}]})
await server.listen()
console.log(`LOCAL SYNTHETIC STAGING: http://127.0.0.1:${port}/supabase/tests/marketing/behavior-harness.html?lang=es`)
console.log('Actual isolated PostgreSQL reports; Auth double; read-only allowlist; no production writes. Ctrl+C stops this server.')
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit(0)})

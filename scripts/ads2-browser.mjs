// Run after ads2-pg17, against its fenced disposable database.
import {createServer} from 'vite'
process.env.VITE_SUPABASE_URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_synthetic'
process.env.VITE_PAZO_MARKETING_TURNSTILE_SITE_KEY='1x00000000000000000000AA'
process.env.PAZO_ADS2_BROWSER='true'
process.env.PAZO_MARKETING_LOCAL_ORIGIN='http://127.0.0.1:5389'
process.env.PAZO_MARKETING_SCREENSHOTS='artifacts/ads2/browser'
process.env.PAZO_PLAYWRIGHT_MODULE||='../../continuidad/f18-browser-tools/node_modules/playwright'
if(process.platform==='win32')process.env.PAZO_CHROMIUM_PATH||='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:5389,strictPort:true}})
try{await server.listen();await import('./marketing-browser.mjs')}finally{await server.close()}

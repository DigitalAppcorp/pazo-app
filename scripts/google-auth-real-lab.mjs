// #172 Serves the real app against a disposable local Supabase, for a person to
// sign in with real Google. Production's host check is replaced only in this
// dev server, so the app cannot reach hosted PAZO from here.
import fs from 'node:fs'
import {createServer} from 'vite'

const status=JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^﻿/,''))
const key=status.ANON_KEY||status.PUBLISHABLE_KEY
if(status.API_URL!=='http://127.0.0.1:54321'||!key)throw Error('local_supabase_required')
process.env.VITE_SUPABASE_URL=status.API_URL
process.env.VITE_SUPABASE_PUBLISHABLE_KEY=key
process.env.VITE_PAZO_GOOGLE_AUTH_ENABLED='true'
const server=await createServer({
 server:{host:'127.0.0.1',port:5398,strictPort:true},
 plugins:[{name:'pazo-local-supabase-only',enforce:'pre',
  transform(code,id){
   if(!id.split('?')[0].endsWith('src/lib/publicConfig.ts'))return null
   return `export const getPublicSupabaseConfig=()=>(${JSON.stringify({url:status.API_URL,key})})`
  }}],
})
await server.listen()
console.log('PAZO_REAL_LAB_APP http://127.0.0.1:5398/')

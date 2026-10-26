// Pre-publication validation only. No network, browser storage or collection.
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parsePazoCampaign,PAZO_CAMPAIGN} from '../src/features/marketing/attribution.ts'
export function validateMarketingUrl(value){
 let url
 try{url=new URL(value)}catch{return {valid:false,code:'invalid_url'}}
 if(url.origin!=='https://pazo-app.vercel.app'||url.pathname!=='/'||url.hash||url.username||url.password)return {valid:false,code:'wrong_destination'}
 const required=['utm_source','utm_medium','utm_campaign','utm_content']
 if(required.some(key=>url.searchParams.getAll(key).length!==1))return {valid:false,code:'missing_or_duplicate_utm'}
 if([...url.searchParams.keys()].some(key=>!required.includes(key)))return {valid:false,code:'unapproved_query_parameter'}
 if(url.searchParams.get('utm_campaign')!==PAZO_CAMPAIGN)return {valid:false,code:'unsupported_campaign'}
 const attribution=parsePazoCampaign(url.search,Date.now())
 return attribution?{valid:true,code:'accepted',creative:attribution.creative}:{valid:false,code:'unsupported_source_medium_or_creative'}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const input=process.argv.slice(2)
 const ads=input.length?input.map(url=>({format:'input',url})):JSON.parse(readFileSync(new URL('../docs/marketing/traffic-pilot-urls.json',import.meta.url),'utf8')).ads
 const results=ads.map(ad=>({format:ad.format,...validateMarketingUrl(ad.url)}))
 // Never echo an unvalidated URL or its possibly personal query values.
 process.stdout.write(JSON.stringify({campaign:PAZO_CAMPAIGN,results},null,2)+'\n')
 if(results.some(result=>!result.valid))process.exitCode=1
}

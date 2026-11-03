import test from 'node:test'
import assert from 'node:assert/strict'
import {createVigilanteWorker,parseFdaRecalls,parseNwsAlerts} from './workerCore.mjs'

// Shapes taken from the live NWS alerts API and FDA recalls RSS (3-nov-2026); values synthetic.
const nwsFeature=(over={})=>({id:'https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.test.1',properties:{
  id:'urn:oid:2.49.0.1.840.0.test.1',status:'Actual',messageType:'Alert',event:'Heat Advisory',
  sent:'2026-08-20T10:00:00-07:00',onset:'2026-08-20T11:00:00-07:00',ends:'2026-08-23T20:00:00-07:00',
  areaDesc:'Los Angeles County Valleys',geocode:{SAME:['006037'],UGC:['CAZ088']},...over}})

test('NWS: only actual heat or smoke alerts for Los Angeles County become findings',()=>{
  const items=parseNwsAlerts({features:[
    nwsFeature(),
    nwsFeature({event:'Air Quality Alert',id:'urn:2'}),
    nwsFeature({event:'Wind Advisory',id:'urn:3'}),
    nwsFeature({geocode:{SAME:['006029']},id:'urn:4'}),
    nwsFeature({status:'Test',id:'urn:5'}),
    nwsFeature({messageType:'Cancel',id:'urn:6'}),
  ]})
  assert.deepEqual(items.map(i=>i.kind),['heat','smoke'])
  const heat=items[0]
  assert.equal(heat.url,'https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.test.1')
  assert.equal(heat.published_on,'2026-08-20')
  assert.equal(heat.fingerprint,'heat:la:2026-08-20')
  assert.equal(heat.params.area,'Los Angeles County Valleys')
  assert.match(heat.params.until,/Aug 23/)
  assert.equal(heat.expires_at,'2026-08-24T03:00:00.000Z')
})

const rss=items=>`<?xml version="1.0"?><rss><channel>${items.map(([title,description,link,date])=>
  `<item><title>${title}</title><link>${link}</link><description>${description}</description><pubDate>${date}</pubDate><guid>${link}</guid></item>`).join('')}</channel></rss>`

test('FDA: pet food recalls become findings with brand, product and reason; human products are ignored',()=>{
  const items=parseFdaRecalls(rss([
    ['Acme Pet Foods Recalls Crunchy Chicken Dog Food Due to Potential Salmonella Contamination','Acme is recalling lots of dog food.','http://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/acme-dog','Fri, 30 Oct 2026 19:59:00 EDT'],
    ['Once Upon A Farm Recalls All Lots of Toddler Bars Due to Potential Choking Hazard','Toddler snack.','http://www.fda.gov/safety/x','Fri, 30 Oct 2026 19:59:00 EDT'],
    ['Feline Fine Issues Voluntary Recall of Salmon Cat Treats Because of Elevated Vitamin D','Cat treats.','http://www.fda.gov/safety/feline','Thu, 29 Oct 2026 10:00:00 EDT'],
  ]))
  assert.equal(items.length,2)
  assert.deepEqual(items[0].params,{brand:'Acme Pet Foods',product:'Crunchy Chicken Dog Food',reason:'Potential Salmonella Contamination'})
  assert.equal(items[0].url,'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/acme-dog')
  assert.equal(items[0].published_on,'2026-10-30')
  assert.equal(items[0].fingerprint,'recall:acme pet foods:crunchy chicken dog food')
  assert.deepEqual(items[1].params,{brand:'Feline Fine',product:'Salmon Cat Treats',reason:'Elevated Vitamin D'})
})

test('FDA: entities are decoded and markup is stripped, never passed through',()=>{
  const [item]=parseFdaRecalls(rss([['Paws &amp; Co Recalls <b>Beef</b> Dog Chews Due to Mold','dog','http://www.fda.gov/p','Mon, 02 Nov 2026 09:00:00 EST']]))
  assert.equal(item.params.brand,'Paws & Co')
  assert.equal(item.params.product,'Beef Dog Chews')
})

test('worker: rejects calls without the single-use token, and one failing source does not stop the others',async()=>{
  const calls=[]
  const rpc=async(name,args)=>{calls.push([name,args]);if(name==='pazo_vigilante_worker_admit')return args.p_token==='a'.repeat(64);if(name==='pazo_vigilante_due_sources')return ['nws_la','fda_recalls'];return {ok:true}}
  const fetchImpl=async url=>url.includes('weather.gov')?{ok:false,status:503,text:async()=>''}:{ok:true,status:200,text:async()=>rss([['Acme Recalls Dog Food Due to Mold','dog','http://www.fda.gov/a','Mon, 02 Nov 2026 09:00:00 EST']])}
  const worker=createVigilanteWorker({rpc,fetchImpl,userAgent:'test'})
  assert.equal((await worker(new Request('https://x',{method:'POST',headers:{authorization:'Bearer nope'}}))).status,401)
  assert.equal((await worker(new Request('https://x',{method:'GET'}))).status,405)
  const response=await worker(new Request('https://x',{method:'POST',headers:{authorization:'Bearer '+'a'.repeat(64)}}))
  assert.equal(response.status,200)
  assert.deepEqual(calls.filter(c=>c[0]==='pazo_vigilante_source_failed').map(c=>c[1].p_source_key),['nws_la'])
  const ingest=calls.find(c=>c[0]==='pazo_vigilante_ingest')
  assert.equal(ingest[1].p_source_key,'fda_recalls')
  assert.equal(ingest[1].p_items[0].kind,'recall')
  assert.ok(!calls.some(c=>/decide|publish|notifications/.test(c[0])),'the worker never publishes')
})

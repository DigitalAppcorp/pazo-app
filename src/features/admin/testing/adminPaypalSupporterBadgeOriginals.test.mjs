import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'

// Hashes from the four original PNGs embedded in the PO-approved
// PAZO_Supporter_Laboratorio_Visual.html. Git blobs match byte for byte.
// This prevents changing the agreed identity during beta release work.
const original=Object.freeze({
 'amigo-pazo-inicio.png':'4f8fa4d2616ab82863d57a09975603722beea51bc5b0e7b932b72d4377d192cf',
 'amigo-pazo-3-meses.png':'ff363fb865275019b718beb8cf6d3c432989fea408737cf56f1f6d32e4a2e211',
 'amigo-pazo-6-meses.png':'d1b6bbde37de8ce9d965ab30bf84158e2ddc76ee13a8398cad23eb57d5dbd003',
 'amigo-pazo-12-meses.png':'a62f7bf8d9fb78dcd50279f93780dcf36d95e61b5ed85c1414c6b120a3d319f5'
})
test('all four PO-approved original supporter badge bytes remain unchanged',()=>{
 for(const [name,sha] of Object.entries(original)){
  const file=new URL('../../../../public/supporter/'+name,import.meta.url)
  const bytes=readFileSync(file)
  assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a')
  assert.equal(createHash('sha256').update(bytes).digest('hex'),sha,name)
 }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {VACCINE_LABELS,VACCINE_TYPES,isVaccineType,vaccineOptionsFor} from './vaccineTypes.ts'

const sql=readFileSync(new URL('../../../supabase/migrations/20261103200000_pazo_care_vaccine_type.sql',import.meta.url),'utf8')

test('the app and the database share one closed list of vaccines',()=>{
  const list=sql.match(/vaccine_type = any\(array\[([^\]]+)\]/)[1]
  assert.deepEqual([...list.matchAll(/'([a-z_]+)'/g)].map(m=>m[1]),[...VACCINE_TYPES])
  assert.match(sql,/vaccine_type is null\s+or \(category = 'vaccine'/)
  assert.match(sql,/grant insert\(vaccine_type\), update\(vaccine_type\) on public\.care_items to authenticated/)
  for(const type of VACCINE_TYPES){
    assert.ok(VACCINE_LABELS[type].es&&VACCINE_LABELS[type].en,type)
    assert.ok(isVaccineType(type))
  }
  assert.equal(isVaccineType('Vacuna anual'),false)
  assert.equal(isVaccineType(null),false)
})

test('dogs and cats get their own vaccines; other species keep the free title',()=>{
  assert.ok(vaccineOptionsFor('perro').includes('leptospirosis'))
  assert.ok(!vaccineOptionsFor('perro').includes('felv'))
  assert.ok(vaccineOptionsFor('gato').includes('felv'))
  assert.ok(!vaccineOptionsFor('gato').includes('leptospirosis'))
  for(const species of ['conejo','ave','otro',undefined])assert.deepEqual([...vaccineOptionsFor(species)],[])
})

test('only vaccine items send a vaccine type, so the database constraint never rejects a save',()=>{
  const service=readFileSync(new URL('../../services/careService.ts',import.meta.url),'utf8')
  assert.match(service,/vaccine_type: input\.category === 'vaccine' \? input\.vaccineType \?\? null : null/)
  const selects=service.match(/'id,pet_id,title,category[^']*'/g)
  assert.ok(selects.length>=4)
  for(const select of selects)assert.match(select,/vaccine_type/)
})

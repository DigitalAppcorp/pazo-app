import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {EMPTY_PET_HEALTH,HEALTH_CONDITIONS,HEALTH_CONDITION_LABELS,isValidBirthMonth,isValidPostalCode,mapPetHealthRow,toPetHealthRow} from './privateDetails.ts'

const sql=readFileSync(new URL('../../../supabase/migrations/20261103201000_pazo_vigilante_private_details.sql',import.meta.url),'utf8')

test('the app and the database share one closed list of health conditions',()=>{
  const list=sql.match(/health_conditions <@ array\[([^\]]+)\]/)[1]
  assert.deepEqual([...list.matchAll(/'([a-z_]+)'/g)].map(m=>m[1]),[...HEALTH_CONDITIONS])
  for(const condition of HEALTH_CONDITIONS)assert.ok(HEALTH_CONDITION_LABELS[condition].es&&HEALTH_CONDITION_LABELS[condition].en)
})

test('the household postal code is private, owner-only and never on the public profile table',()=>{
  assert.match(sql,/create table public\.household_private_details/)
  assert.match(sql,/enable row level security/)
  assert.match(sql,/revoke all on public\.household_private_details from anon/)
  for(const action of ['select','insert','update'])
    assert.match(sql,new RegExp(`household_private_details_owner_${action}[\\s\\S]+?user_id = \\(select auth\\.uid\\(\\)\\)`))
  assert.match(sql,/as restrictive for all to anon,authenticated/)
  assert.doesNotMatch(sql,/alter table public\.profiles/i)
  assert.match(sql,/postal_code ~ '\^\[0-9\]\{5\}\$'/)
})

test('postal codes are five digits or empty',()=>{
  for(const ok of ['90026','00501'])assert.ok(isValidPostalCode(ok),ok)
  for(const bad of ['','9002','900261','9002a',' 90026'])assert.equal(isValidPostalCode(bad),false,bad)
})

test('the birth month is optional and never in the future',()=>{
  assert.ok(isValidBirthMonth(''))
  assert.ok(isValidBirthMonth('2020-05'))
  assert.equal(isValidBirthMonth('1989-12'),false)
  assert.equal(isValidBirthMonth('2020-13'),false)
  const next=new Date();next.setMonth(next.getMonth()+1)
  assert.equal(isValidBirthMonth(`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`),false)
})

test('health rows round-trip and drop anything outside the closed list',()=>{
  const details={birthMonth:'2021-03',conditions:['heart','allergies','heart'],foodBrand:'  Acme ',foodProduct:''}
  const row=toPetHealthRow(details)
  assert.deepEqual(row,{birth_month:'2021-03-01',health_conditions:['heart','allergies'],food_brand:'Acme',food_product:null})
  assert.deepEqual(mapPetHealthRow({...row,health_conditions:['heart','made_up']}),{birthMonth:'2021-03',conditions:['heart'],foodBrand:'Acme',foodProduct:''})
  assert.deepEqual(mapPetHealthRow(null),EMPTY_PET_HEALTH)
  assert.deepEqual(toPetHealthRow(EMPTY_PET_HEALTH),{birth_month:null,health_conditions:[],food_brand:null,food_product:null})
})

test('editing a pet never overwrites private details that failed to load',()=>{
  const view=readFileSync(new URL('../../components/views/PetView.tsx',import.meta.url),'utf8')
  assert.match(view,/const savePrivateDetails = privateDetailsPetId === currentPet\.id/)
  assert.match(view,/if \(savePrivateDetails\) \{\s+await Promise\.all\(\[savePetHealthDetails/)
  const onboarding=readFileSync(new URL('../../components/views/OnboardingView.tsx',import.meta.url),'utf8')
  assert.match(onboarding,/saveHouseholdPostalCode\(postalCode\)\.catch\(/)
})

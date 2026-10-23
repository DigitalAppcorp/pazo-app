import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {CURATED_PLACE_NAMES,getCuratedPlacePhoto} from '../src/features/places/curatedPlacePhotography.ts'

test('F17 six vetted unique photographic sources and licenses',()=>{
  const names=['Silver Lake Dog Park','Runyon Canyon Park','The Morrison',
    'VCA Miller-Robertson Animal Hospital','Groomickey Salon & Store','Petco Los Angeles - DTLA']
  assert.equal(CURATED_PLACE_NAMES.length,6)
  const photos=names.map(getCuratedPlacePhoto)
  assert.ok(photos.every(Boolean))
  assert.equal(new Set(photos.map(x=>x?.imageUrl)).size,6)
  assert.equal(photos.filter(x=>x?.exactVenue).length,1)
  assert.equal(getCuratedPlacePhoto('Runyon Canyon Park')?.exactVenue,true)
  assert.equal(getCuratedPlacePhoto('Unverified third party'),null)
  for(const x of photos){
    assert.match(x?.imageUrl,/\/500px-/)
    assert.doesNotMatch(x?.imageUrl,/\/640px-/)
    assert.ok(x?.imageUrl.startsWith('https://upload.wikimedia.org/wikipedia/commons/thumb/'))
    assert.ok(x?.sourceUrl.startsWith('https://commons.wikimedia.org/wiki/File:'))
    assert.ok(x?.licenseUrl.startsWith('https://creativecommons.org/licenses/'))
    assert.ok(x?.author)
  }
})
test('F17 author credit, illustrative disclosure, no referrer, photo precedence',()=>{
  const ui=fs.readFileSync('src/features/places/components/PlaceCardPhoto.tsx','utf8')
  const stage=fs.readFileSync('src/features/places/components/ImmersivePlacesStage.tsx','utf8')
  const legal=fs.readFileSync('src/features/legal/legalCopy.ts','utf8')
  assert.ok(ui.includes("const curated=!directPhoto?getCuratedPlacePhoto(place.name):null"))
  assert.ok(ui.includes("curated&&!curated.exactVenue&&showPhoto"))
  assert.ok(ui.includes("Ilustrativa"))
  assert.ok(ui.includes('referrerPolicy="no-referrer"'))
  assert.ok(ui.includes('setFallbackAttempt(true)') && ui.includes('setFailed(true)'))
  assert.ok(stage.includes('photoCredit.sourceUrl'))
  assert.ok(stage.includes('photoCredit.licenseUrl'))
  assert.ok(stage.includes('onClick={() => onFocusPlace(place.id)}'))
  assert.ok(legal.includes('Wikimedia Commons'))
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {classifyBasemapFailure} from './mapFailure.ts'
test('Mapbox authorization errors recognize actual HTTP words without exposing URL tokens',()=>{
 for(const input of [
  {message:'Mapbox resource returned 401'},
  {message:'tiles forbidden'},
  {statusCode:403,url:'https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=synthetic-only'}
 ])assert.equal(classifyBasemapFailure(input),'map_authorization')
})
test('optional models never hide a usable basemap; genuine tile outages get a fixed category',()=>{
 assert.equal(classifyBasemapFailure({status:403,url:'/models/places/synthetic.gltf'}),null)
 assert.equal(classifyBasemapFailure({status:503,url:'https://api.mapbox.com/tiles/synthetic'}),'map_unavailable')
 assert.equal(classifyBasemapFailure({status:403,url:'https://api.mapbox.com/v4/mapbox.mapbox-terrain-dem-v1/12/1/1.webp'}),null)
 assert.equal(classifyBasemapFailure({status:404,url:'https://api.mapbox.com/styles/v1/mapbox/missing'}),'map_unavailable')
 assert.equal(classifyBasemapFailure({message:'WebGL synthetic error'}),null)
 assert.equal(classifyBasemapFailure(null),null)
})

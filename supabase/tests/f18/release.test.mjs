import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {buildF18Manifest} from '../../../scripts/f18-release-manifest.mjs'
test('F18 deployment review manifest matches the complete current Edge source closure and SQL bytes',()=>{
 const manifest=JSON.parse(readFileSync('docs/review/f18/SOURCE_MANIFEST.json','utf8'))
 assert.deepEqual(manifest,buildF18Manifest())
 assert.equal(manifest.entries.length,3)
 assert.ok(manifest.entries.every(entry=>entry.files.length>1))
})
test('F18 source publication cannot deploy through Git integration',()=>{
 assert.equal(JSON.parse(readFileSync('vercel.json','utf8')).git.deploymentEnabled,false)
})

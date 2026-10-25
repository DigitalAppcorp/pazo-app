import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {buildF18Manifest} from '../../../scripts/f18-release-manifest.mjs'
test('F18 deployment review manifest matches the complete current Edge source closure and SQL bytes',()=>{
 const manifest=JSON.parse(readFileSync('docs/review/f18/SOURCE_MANIFEST.json','utf8'))
 assert.deepEqual(manifest,buildF18Manifest())
 assert.equal(manifest.entries.length,3)
 assert.equal(manifest.lineEndings,'git-lf')
 const pending=JSON.parse(readFileSync('docs/review/f18/NOT_APPLIED_MIGRATIONS.json','utf8'))
 assert.deepEqual(pending.versions,[])
 assert.equal(pending.installedVersion,manifest.sql.path.split('/').at(-1).slice(0,14))
 assert.equal(pending.status,'APPLIED_HOSTED')
 assert.equal(pending.productionPushAllowed,false)
 assert.ok(manifest.entries.every(entry=>entry.files.length>1))
})
test('F18 source publication cannot deploy through Git integration',()=>{
 assert.equal(JSON.parse(readFileSync('vercel.json','utf8')).git.deploymentEnabled,false)
})

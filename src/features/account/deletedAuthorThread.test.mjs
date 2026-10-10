import test from 'node:test'
import assert from 'node:assert/strict'
import {wasAuthorDeleted,getDeletedAuthorView,getDeletedAuthorLabel,SOCIAL_THREAD_REDACTION_EXECUTOR_ENABLED} from './deletedAuthorThread.ts'
test('the neutral label is bilingual; no original author metadata leaks',()=>{
 assert.equal(getDeletedAuthorLabel('es'),'Autor eliminado')
 assert.equal(getDeletedAuthorLabel('en'),'Deleted author')
 for(const lang of ['es','en']){
 const v=getDeletedAuthorView(lang)
 assert.equal(v.petId,'')
 assert.equal(v.avatar,'')
 assert.equal(v.text,'')
 assert.equal(v.photoUrl,null)
 assert.deepEqual(v.tags,[])
 }
})
test('only a valid explicit timestamp defines a tombstone; not a missing pet',()=>{
 assert.equal(wasAuthorDeleted({author_deleted_at:'2026-10-10T00:00:00Z'}),true)
 for(const x of [{}, {pet_id:null}, {author_deleted_at:null},{author_deleted_at:'wrong'}]){
  assert.equal(wasAuthorDeleted(x),false)
 }
 assert.equal(SOCIAL_THREAD_REDACTION_EXECUTOR_ENABLED,false)
})

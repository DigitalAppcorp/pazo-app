export type DeletedAuthorRow={
 author_deleted_at?: string | null
 pet_id?: string | null
 author_pet_id?: string | null
}
export const SOCIAL_THREAD_REDACTION_EXECUTOR_ENABLED=false as const
export function wasAuthorDeleted(row:DeletedAuthorRow):boolean {
 return typeof row.author_deleted_at==='string' && Number.isFinite(Date.parse(row.author_deleted_at))
}
export function getDeletedAuthorLabel(lang:'es'|'en'):string{
 return lang==='es'?'Autor eliminado':'Deleted author'
}
// Never read an old cached pet name/avatar/text from a deleted author's row.
export function getDeletedAuthorView(lang:'es'|'en') {
 return {name:getDeletedAuthorLabel(lang),petId:'',avatar:'',
         location:'',text:'',photoUrl:null,tags:[] as string[]}
}

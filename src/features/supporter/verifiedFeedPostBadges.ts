import type {Post, PostComment, CommunityPostComment, SupporterBadgeEvidence} from '../../types/pazo'

const PET_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MILESTONES=new Set([0,3,6,12])
const BATCH_MAX=48

export type ReadVerifiedBadgeBatch=(petIds:string[])=>Promise<{
 data:unknown
 error:unknown
}>

/**
 * Resolve the SAME authoritative RPC used by PAZO before publishing a Feed page.
 * This batches the network request, but commits posts and verified badges as ONE
 * display payload; no post can first appear without its already-earned badge.
 * It neither grants nor caches financial entitlements.
 *
 * If verification is unavailable, reject the page for the existing retry state.
 * Never silently present a verified paid author as a free author due to latency.
 */
async function readVerifiedPetBadges(
 petIds:readonly string[],read:ReadVerifiedBadgeBatch,
):Promise<Map<string,SupporterBadgeEvidence>>{
 if(petIds.some(id=>!PET_UUID.test(id)))throw Error('FEED_BADGE_INVALID_PET_ID')
 const resolved=new Map<string,SupporterBadgeEvidence>()
 for(let start=0;start<petIds.length;start+=BATCH_MAX){
  const ids=petIds.slice(start,start+BATCH_MAX)
  const {data,error}=await read(ids)
  if(error||!Array.isArray(data)||data.length!==ids.length)
   throw Error('FEED_BADGE_EVIDENCE_UNAVAILABLE')
  const batchSet=new Set(ids)
  for(const row of data){
   if(!row||typeof row!=='object'||Array.isArray(row))throw Error('FEED_BADGE_BAD_RESPONSE')
   const item=row as Record<string,unknown>
   if(typeof item.pet_id!=='string'||!batchSet.has(item.pet_id)||
      typeof item.badge!=='boolean'||!MILESTONES.has(item.milestone as number)||
      (!item.badge&&item.milestone!==0)||resolved.has(item.pet_id))
    throw Error('FEED_BADGE_BAD_RESPONSE')
   resolved.set(item.pet_id,{badge:item.badge,milestone:item.milestone as 0|3|6|12})
  }
  if(ids.some(id=>!resolved.has(id)))throw Error('FEED_BADGE_INCOMPLETE_RESPONSE')
 }
 return resolved
}

export async function attachVerifiedFeedBadges(
 posts:readonly Post[],read:ReadVerifiedBadgeBatch,
):Promise<Post[]>{
 if(posts.length===0)return []
 const petIds=[...new Set(posts.filter(post=>!post.isAuthorDeleted).map(post=>post.petId))]
 const resolved=await readVerifiedPetBadges(petIds,read)
 return posts.map(post=>({
  ...post,
  supporterBadge:post.isAuthorDeleted
   ?{badge:false,milestone:0}
   :resolved.get(post.petId)!,
 }))
}

/**
 * Feed and Communities comments must display their verified badge on the
 * comment's FIRST visible paint, not after a second React render. Never
 * inherit badge proof from the surrounding post's author. Missing/deleted
 * author pets never gain invented rights.
 */
export async function attachVerifiedCommentBadges<
 T extends Pick<PostComment|CommunityPostComment,'authorPetId'|'supporterBadge'>
>(comments:readonly T[],read:ReadVerifiedBadgeBatch):Promise<T[]>{
 if(comments.length===0)return []
 const petIds=[...new Set(comments.map(comment=>comment.authorPetId)
   .filter((id):id is string=>typeof id==='string'&&PET_UUID.test(id)))]
 const resolved=await readVerifiedPetBadges(petIds,read)
 return comments.map(comment=>({
  ...comment,
  supporterBadge:comment.authorPetId?resolved.get(comment.authorPetId):undefined,
 }))
}

const BADGE_FILES:Record<SupporterBadgeEvidence['milestone'],string>={
 0:'amigo-pazo-inicio.png',
 3:'amigo-pazo-3-meses.png',
 6:'amigo-pazo-6-meses.png',
 12:'amigo-pazo-12-meses.png',
}
const decodedArtwork=new Map<string,Promise<void>>()

/**
 * Browser image decoding is also completed before rendering a paid post.
 * Thus the first visible frame includes both the author photo and its badge.
 * Never preload a paid badge from a guessed entitlement.
 */
export async function preloadVerifiedFeedBadgeArt(posts:readonly {supporterBadge?:SupporterBadgeEvidence}[]):Promise<void>{
 if(typeof Image==='undefined')return // node tests / SSR
 const awarded=[...new Set(posts.filter(p=>p.supporterBadge?.badge)
  .map(p=>p.supporterBadge!.milestone))]
 await Promise.all(awarded.map(milestone=>{
  const src='/supporter/'+BADGE_FILES[milestone]
  let promise=decodedArtwork.get(src)
  if(!promise){
   promise=new Promise<void>((resolve,reject)=>{
    const artwork=new Image()
    const canDecode=typeof artwork.decode==='function'
    artwork.onerror=()=>reject(Error('FEED_BADGE_ARTWORK_UNAVAILABLE'))
    if(!canDecode)artwork.onload=()=>resolve()
    artwork.src=src
    if(canDecode){
     void artwork.decode().then(resolve,()=>reject(Error('FEED_BADGE_ARTWORK_UNAVAILABLE')))
    }else if(artwork.complete&&artwork.naturalWidth>0)resolve()
   })
   decodedArtwork.set(src,promise)
   void promise.catch(()=>decodedArtwork.delete(src))
  }
  return promise
 }))
}

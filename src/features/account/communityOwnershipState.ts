export type OwnershipOffer={
 status:'pending'
 candidateUserId:string
 expiresAt:string
}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
export function parseOwnershipOffer(input:unknown):OwnershipOffer|null {
 if(!input||typeof input!=='object'||Array.isArray(input))return null
 const offer=input as Record<string,unknown>
 if(offer.status!=='pending'||typeof offer.candidate_user_id!=='string'
 ||!uuid.test(offer.candidate_user_id)||typeof offer.expires_at!=='string'
 ||!Number.isFinite(Date.parse(offer.expires_at)))return null
 return {status:'pending',candidateUserId:offer.candidate_user_id,expiresAt:offer.expires_at}
}

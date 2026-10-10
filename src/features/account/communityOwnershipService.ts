import { supabase } from '../../services/supabaseClient'
import {parseOwnershipOffer,type OwnershipOffer} from './communityOwnershipState'

// This UI remains OFF until the SQL is explicitly approved, applied,
// and tested with two real authenticated sessions.
export const COMMUNITY_OWNERSHIP_RELEASE_READY = false as const
export function ownershipUiEnabled():boolean {
 return import.meta.env.VITE_F14_COMMUNITY_OWNERSHIP_ENABLED === 'true'
}
export async function nominateCommunityAdmin(communityId:string,userId:string):Promise<boolean> {
 const {data,error}=await supabase.rpc('pazo_community_set_admin',{
  p_community_id:communityId,p_member_id:userId,
 })
 if(error)throw error
 return data===true
}
export async function proposeCommunityTransfer(communityId:string,userId:string):Promise<boolean> {
 const {data,error}=await supabase.rpc('pazo_community_offer_transfer',{
  p_community_id:communityId,p_candidate_id:userId,
 })
 if(error)throw error
 return data===true
}
export async function fetchCommunityOwnershipOffer(communityId:string):
 Promise<{offer:OwnershipOffer;isCandidate:boolean}|null> {
 const [{data,error},{data:auth,error:authError}]=await Promise.all([
  supabase.rpc('pazo_community_transfer_offer',{p_community_id:communityId}),
  supabase.auth.getUser(),
 ])
 if(error||authError)throw error||authError
 const offer=parseOwnershipOffer(data)
 if(!offer)return null
 return {offer,isCandidate:offer.candidateUserId===auth.user?.id}
}
export async function acceptCommunityTransfer(communityId:string):Promise<boolean> {
 const {data,error}=await supabase.rpc('pazo_community_accept_transfer',{
  p_community_id:communityId,
 })
 if(error)throw error
 return data===true
}
export async function declineCommunityTransfer(communityId:string):Promise<boolean> {
 const {data,error}=await supabase.rpc('pazo_community_decline_transfer',{
  p_community_id:communityId,
 })
 if(error)throw error
 return data===true
}

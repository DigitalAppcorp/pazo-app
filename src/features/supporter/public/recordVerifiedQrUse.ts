import {supabase} from '../../../services/supabaseClient'
// Only called after the existing own-pet QR read succeeds. SQL independently
// checks the owner and enabled artifact. No token, QR bytes or pet content sent.
export async function recordVerifiedQrUse(petId:string){
 try{await supabase.rpc('pazo_supporter_qr_used',{p_pet:petId})}catch{/* Promotion never blocks QR/rescue. */}
}

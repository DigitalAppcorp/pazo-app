import {supabase} from '../../services/supabaseClient'
import {parseDeletionReceipt,type DeletionReceipt} from './deletionRequestState'

// RPCs derive the requester strictly from auth.uid(). Never accept a target ID.
async function invoke(name:'pazo_deletion_request'|'pazo_deletion_status'|'pazo_deletion_cancel') {
 const {data,error}=await supabase.rpc(name)
 if(error) throw new Error('Deletion request service unavailable')
 return data
}
export async function getDeletionRequest():Promise<DeletionReceipt|null> {
 const data=await invoke('pazo_deletion_status')
 if(data===null) return null
 const parsed=parseDeletionReceipt(data)
 if(!parsed) throw new Error('Deletion request status could not be validated')
 return parsed
}
export async function submitDeletionRequest():Promise<DeletionReceipt> {
 const value=parseDeletionReceipt(await invoke('pazo_deletion_request'))
 if(!value) throw new Error('Deletion request receipt could not be validated')
 return value
}
export async function cancelDeletionRequest():Promise<boolean> {
 return (await invoke('pazo_deletion_cancel'))===true
}

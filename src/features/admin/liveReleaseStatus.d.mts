export type PazoLiveReleaseStatus={
 source:'pazo_live_release_status_v1';asOf:string;mayCharge:false;
 mode:'off'|'canary'|'public';revision:number;engineeringVerified:boolean;
 preparationReady:boolean;originalOperator:boolean
}
export function parsePazoLiveReleaseStatus(raw:unknown):PazoLiveReleaseStatus|null;

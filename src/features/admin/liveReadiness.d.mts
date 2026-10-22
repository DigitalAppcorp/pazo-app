export type PazoLiveReadiness={
 source:'pazo_live_admin_readiness_v1';asOf:string;
 phase:'engineering_pending'|'credentials_pending'|'canary_pending'|'active';checkoutActive:boolean;
 mayActivate:false;mayCharge:false;
 checks:Record<'termsReady'|'ownerRecoverySchemaReady'|'benefitsSchemaReady'|'financeSchemaReady'|
  'releaseControlsReady'|'credentialsStored'|'providerResourcesVerified'|'workerHealthy',boolean>;
 blockers:string[]
}
export const LIVE_READINESS_CHECKS:ReadonlyArray<keyof PazoLiveReadiness['checks']>;
export function parsePazoLiveReadiness(raw:unknown):PazoLiveReadiness|null;

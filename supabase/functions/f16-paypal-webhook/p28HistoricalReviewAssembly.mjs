// Offline P28 historical composition. No deployed entrypoint and no financial actions.
import {createP28HistoricalCandidateInventory} from './p28HistoricalCandidateInventory.mjs'
import {createP28AuditedCandidateReader} from './p28AuditedCandidateReader.mjs'
import {createP28EventFingerprint} from './p28EventFingerprint.mjs'
import {createP28HostedAuditWriter} from './p28HostedAuditWriter.mjs'
import {createP28HistoricalHostedReader} from './p28HistoricalHostedReader.mjs'
export function createP28HistoricalReviewAssembly({
 enabled=false,operatorKey,projectUrl,serviceRoleKey,hmacSecret,
 fetchImpl=fetch,cryptoImpl=globalThis.crypto
}={}){
 const scope=enabled?'SERVER_ONLY_HISTORICAL_REVIEW':'DISABLED'
 const fingerprintEvent=createP28EventFingerprint({secret:hmacSecret,cryptoImpl})
 const recordAudit=createP28HostedAuditWriter({projectUrl,serviceRoleKey,fetchImpl,scope})
 const readCandidate=createP28HistoricalHostedReader({projectUrl,serviceRoleKey,fetchImpl,scope,fingerprintEvent})
 const auditedRead=createP28AuditedCandidateReader({fingerprintEvent,recordAudit,readCandidate})
 return createP28HistoricalCandidateInventory({enabled,operatorKey,readCandidate:auditedRead})
}

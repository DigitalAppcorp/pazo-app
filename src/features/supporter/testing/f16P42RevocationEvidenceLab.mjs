// F16 P42 — offline revocation evidence gate. NO provider access, I/O,
// timers, environment reads, DB credentials, secret bytes or finance writes.
// A PASS here evaluates PROVIDED METADATA only. It is never proof that
// Supabase secrets were actually deleted.
const PROJECT = 'mrybvqdebbgcayuvgkkr'
const SECRET = 'PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX'
const KEY_ID = 'P42_V1'
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_AGE_MS = 5 * 60 * 1000
const EXACT_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/

function utcMillis(value) {
  if (typeof value !== 'string' || !EXACT_UTC.test(value)) return NaN
  const n = Date.parse(value)
  if (!Number.isFinite(n)) return NaN
  const iso = new Date(n).toISOString()
  return (iso === value || (!value.includes('.') && iso === value.slice(0, -1) + '.000Z')) ? n : NaN
}
function result(reason, ok = false) {
  return Object.freeze({
    status: ok ? 'P42_REVOCATION_METADATA_CANDIDATE_ONLY' : 'P42_REVOCATION_BLOCKED',
    reason,
    actualProviderAccess: false,
    edgeSecretDeletedByThisCode: false,
    dbKeyDeletedByThisCode: false,
    mayEnableWriter: false,
    mayRecordActivation: false,
    mayRecordPayment: false,
    mayGrantBenefits: false
  })
}
export function inspectP42Revocation(snapshot) {
  // Each failure category is generic; never echo caller-supplied values.
  if (!snapshot || typeof snapshot !== 'object' ||
    snapshot.projectId !== PROJECT || snapshot.secretName !== SECRET ||
    snapshot.keyId !== KEY_ID || snapshot.environment !== 'sandbox') {
    return result('TARGET_MISMATCH')
  }
  if (snapshot.wasProvisioned !== true) return result('NOT_PROVISIONED')
  if (!['expiry','incident'].includes(snapshot.trigger)) return result('TRIGGER_INVALID')
  const started = utcMillis(snapshot.window?.notBefore)
  const ends = utcMillis(snapshot.window?.notAfter)
  const observed = utcMillis(snapshot.observedAt)
  const revoked = utcMillis(snapshot.revokedAt)
  if (![started, ends, observed, revoked].every(Number.isFinite) ||
    ends - started !== DAY_MS || revoked < started ||
    observed < revoked || observed < started ||
    (snapshot.trigger === 'expiry' && revoked < ends) ||
    (snapshot.trigger === 'expiry' && observed < ends)) {
    return result('WINDOW_INVALID')
  }
  const edgeTime = utcMillis(snapshot.edge?.verifiedAt)
  const dbTime = utcMillis(snapshot.db?.verifiedAt)
  if (![edgeTime, dbTime].every(Number.isFinite) ||
    edgeTime < revoked || dbTime < revoked ||
    edgeTime > observed || dbTime > observed ||
    observed - edgeTime > MAX_AGE_MS || observed - dbTime > MAX_AGE_MS) {
    return result('EVIDENCE_NOT_FRESH')
  }
  if (snapshot.edge?.unsetAcknowledged !== true ||
    snapshot.edge?.present !== false) return result('EDGE_NOT_REMOVED')
  const db = snapshot.db
  if (db?.removalAcknowledged !== true || db?.keyRows !== 0) {
    return result('DB_KEY_NOT_REMOVED')
  }
  if (db.writerEnabled !== false || db.writerNotBefore !== null ||
    db.workerEnabled !== false || db.activationBindings !== 0 ||
    db.paymentEntries !== 0 ||
    db.grantPublic !== false || db.grantAnon !== false ||
    db.grantAuthenticated !== false || db.grantServiceRole !== false) {
    return result('FINANCIAL_SECURITY_DRIFT')
  }
  return result('METADATA_AGREES_MANUAL_OPERATOR_REVIEW_REQUIRED', true)
}

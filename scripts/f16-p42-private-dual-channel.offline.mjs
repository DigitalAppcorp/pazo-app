// PAZO F16-P42 — OFFLINE contract design, NEVER a hosted provisioning client.
// This module has NO network, SQL driver, filesystem, CLI, key generation or token access.
// It accepts only a public FIXED synthetic fixture; production key bytes are rejected.
import { Buffer } from 'node:buffer';

export const PROJECT_REF = 'mrybvqdebbgcayuvgkkr';
export const EDGE_SECRET_NAME = 'PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX';
export const LAB_ONLY = 'P42_OFFLINE_SYNTHETIC_FIXTURE_ONLY';
const TEST_BYTES = Buffer.alloc(32, 0xa7); // public test bytes, never an HMAC key
const DAY_MS = 24 * 60 * 60 * 1000;
const EDGE_URL = 'https://api.supabase.com/v1/projects/' + PROJECT_REF + '/secrets';

export const PG_INSERT_SQL =
  'INSERT INTO supporter_private.p42_activation_signing_keys ' +
  '(key_id,key_bytes,enabled,not_before,not_after) ' +
  'VALUES ($1,$2::bytea,false,$3::timestamptz,$4::timestamptz) ' +
  'RETURNING key_id,enabled,not_before,not_after';
export const PG_DELETE_SQL =
  'DELETE FROM supporter_private.p42_activation_signing_keys ' +
  'WHERE key_id=$1 RETURNING key_id';
export const PG_METADATA_SQL =
  'SELECT key_id,enabled,not_before,not_after ' +
  'FROM supporter_private.p42_activation_signing_keys WHERE key_id=$1';

function labGate(mode) {
  if (mode !== LAB_ONLY) throw new Error('OFFLINE_LAB_ONLY_NO_REAL_KEY_OR_PROVIDER');
}
function validateT0(t0) {
  if (typeof t0 !== 'string' ||
      !/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(t0) ||
      !Number.isFinite(Date.parse(t0)) ||
      new Date(t0).toISOString() !== t0) {
    throw new Error('INVALID_SYNTHETIC_UTC_WINDOW');
  }
  const t1 = new Date(Date.parse(t0) + DAY_MS).toISOString();
  if (Date.parse(t1) - Date.parse(t0) !== DAY_MS) throw new Error('INVALID_24H_WINDOW');
  return t1;
}

// Only synthetic fixture: immutable identifiers, fixed test bytes and 24h UTC window.
// No execution methods; output MUST NOT be passed to a provider or SQL client.
export function buildOfflinePlan({ labOnly, t0Utc } = {}) {
  labGate(labOnly);
  const tExpUtc = validateT0(t0Utc);
  const bytes = Buffer.from(TEST_BYTES);
  return {
    laboratory: true,
    projectRef: PROJECT_REF,
    keyId: 'P42_V1',
    secretName: EDGE_SECRET_NAME,
    t0Utc,
    tExpUtc,
    pgInsert: { text: PG_INSERT_SQL, values: ['P42_V1', bytes, t0Utc, tExpUtc] },
    pgDelete: { text: PG_DELETE_SQL, values: ['P42_V1'] },
    pgMetadata: { text: PG_METADATA_SQL, values: ['P42_V1'] },
    edgeCreate: {
      method: 'POST', url: EDGE_URL,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ name: EDGE_SECRET_NAME, value: bytes.toString('hex') }]),
    },
    edgeDelete: {
      method: 'DELETE', url: EDGE_URL,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([EDGE_SECRET_NAME]),
    },
    edgeList: { method: 'GET', url: EDGE_URL },
  };
}

// Inert in-memory simulation: a failed second store must attempt compensation.
// Returns ONLY non-sensitive status labels, never synthetic bytes or body contents.
export function simulateDualStore({ labOnly, fail = 'NONE' } = {}) {
  labGate(labOnly);
  const allowed = new Set(['NONE', 'EDGE_CREATE', 'DB_INSERT', 'EDGE_COMPENSATE', 'DB_REVOKE']);
  if (!allowed.has(fail)) throw new Error('UNKNOWN_FAILURE_SCENARIO');
  let edge = false, db = false, compensated = false;
  if (fail === 'EDGE_CREATE') return { status: 'BLOCKED_EDGE', edge, db, compensated };
  edge = true;
  if (fail === 'DB_INSERT') {
    edge = false;
    compensated = true;
    return { status: 'BLOCKED_COMPENSATED', edge, db, compensated };
  }
  if (fail === 'EDGE_COMPENSATE') {
    // Simulate DB failure with failed Edge removal; never claim rollback succeeded.
    return { status: 'BLOCKED_UNCERTAIN_EDGE', edge, db, compensated };
  }
  db = true;
  if (fail === 'DB_REVOKE') return { status: 'BLOCKED_UNCERTAIN_DB', edge, db, compensated };
  // Simulate a successful manually ordered two-destination revocation.
  edge = false;
  db = false;
  return { status: 'SYNTHETIC_REVOCATION_CANDIDATE_ONLY', edge, db, compensated };
}

// Management API may return secret metadata with sensitive values.
// Only project exact name presence is ever eligible to leave an operator process.
export function projectSecretNameOnly({ labOnly, providerResponse } = {}) {
  labGate(labOnly);
  if (!Array.isArray(providerResponse)) throw new Error('UNRECOGNIZED_PRIVATE_RESPONSE');
  return { name: EDGE_SECRET_NAME,
    present: providerResponse.some(x => x && x.name === EDGE_SECRET_NAME),
    actualProviderAccess: false };
}

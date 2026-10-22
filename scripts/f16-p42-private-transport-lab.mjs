// P42 — isolated transport exercise, NEVER a hosted provisioning client.
// No network, SQL driver, filesystem, CLI, environment, random key, logs or process arguments.
import {
  LAB_ONLY, PROJECT_REF, EDGE_SECRET_NAME,
  PG_INSERT_SQL, PG_DELETE_SQL, PG_METADATA_SQL, buildOfflinePlan,
} from './f16-p42-private-dual-channel.offline.mjs';

const EDGE_URL = 'https://api.supabase.com/v1/projects/' + PROJECT_REF + '/secrets';
const TEST_AUTH = 'Bearer P42_FIXED_PUBLIC_LAB_AUTH_ONLY';
const CANONICAL_ERRORS = new Set([
  'NONE', 'EDGE_CREATE_REJECT', 'EDGE_CREATE_TIMEOUT_AFTER_WRITE',
  'DB_INSERT_REJECT', 'DB_INSERT_TIMEOUT_AFTER_WRITE',
  'DB_REJECT_COMPENSATION_REJECT', 'EDGE_DELETE_TIMEOUT_AFTER_WRITE',
  'DB_DELETE_TIMEOUT_AFTER_WRITE', 'EDGE_LIST_REJECT',
]);
const OPERATIONS = new Set(['PREPARE_ONLY','PREPARE_AND_MANUALLY_REVOKE']);
const SECRET_ERROR = 'P42_DO_NOT_LEAK_PRIVATE_PROVIDER_ERROR';

function makeFake(plan, fault, events) {
  let edge = null, db = null, mutation = null, faultUsed = false;
  const throwPrivate = () => { throw new Error(SECRET_ERROR); };
  function takeFault(name) {
    if (fault !== name || faultUsed) return false;
    faultUsed = true;
    return true;
  }
  return {
    async https({method,url,headers={},body}) {
      if (url !== EDGE_URL || !['POST','GET','DELETE'].includes(method) ||
          headers.Authorization !== TEST_AUTH) throw new Error('P42_FAKE_HTTP_GUARD');
      if (method !== 'GET' && headers['Content-Type'] !== 'application/json')
        throw new Error('P42_FAKE_HTTP_CONTENT_TYPE');
      // Never expose/log request headers, bodies or returned secret values.
      events.push('EDGE_' + method);
      if (method === 'POST') {
        if (takeFault('EDGE_CREATE_REJECT')) throwPrivate();
        if (edge !== null || body !== plan.edgeCreate.body) throwPrivate();
        const payload = JSON.parse(body);
        if (payload.length !== 1 || payload[0].name !== EDGE_SECRET_NAME ||
            payload[0].value !== 'a7'.repeat(32)) throwPrivate();
        edge = payload[0].value;
        mutation = 'EDGE_CREATED';
        if (takeFault('EDGE_CREATE_TIMEOUT_AFTER_WRITE')) throwPrivate();
        return {status:201};
      }
      if (method === 'GET') {
        if (takeFault('EDGE_LIST_REJECT')) throwPrivate();
        return {status:200,records:edge === null ? [] : [{name:EDGE_SECRET_NAME,value:edge}]};
      }
      if (body !== plan.edgeDelete.body) throwPrivate();
      if (fault === 'DB_REJECT_COMPENSATION_REJECT' && mutation === 'EDGE_CREATED')
        throwPrivate();
      edge = null;
      mutation = 'EDGE_REMOVED';
      if (takeFault('EDGE_DELETE_TIMEOUT_AFTER_WRITE')) throwPrivate();
      return {status:200};
    },
    async query({text,values}) {
      if (text === PG_INSERT_SQL) {
        events.push('PG_INSERT_BIND');
        if (takeFault('DB_INSERT_REJECT') || takeFault('DB_REJECT_COMPENSATION_REJECT'))
          throwPrivate();
        if (!Array.isArray(values) || values.length !== 4 ||
            values[0] !== 'P42_V1' || !Buffer.isBuffer(values[1]) ||
            values[1].length !== 32 || !values[1].equals(Buffer.alloc(32,0xa7)) ||
            values[2] !== plan.t0Utc || values[3] !== plan.tExpUtc || db !== null)
          throwPrivate();
        db = {key_id:'P42_V1',enabled:false,not_before:values[2],not_after:values[3]};
        if (takeFault('DB_INSERT_TIMEOUT_AFTER_WRITE')) throwPrivate();
        return {rowCount:1,rows:[{...db}]};
      }
      if (text === PG_METADATA_SQL) {
        events.push('PG_METADATA_ONLY');
        if (values?.length !== 1 || values[0] !== 'P42_V1') throwPrivate();
        return {rowCount:db ? 1 : 0,rows:db ? [{...db}] : []};
      }
      if (text === PG_DELETE_SQL) {
        events.push('PG_DELETE_BIND');
        if (values?.length !== 1 || values[0] !== 'P42_V1') throwPrivate();
        const old=db; db=null;
        if (takeFault('DB_DELETE_TIMEOUT_AFTER_WRITE')) throwPrivate();
        return {rowCount:old ? 1 : 0,rows:old ? [{key_id:old.key_id}] : []};
      }
      throwPrivate();
    },
    state() {return {edgePresent:edge!==null,dbRows:db ? 1:0};},
  };
}

export async function runP42PrivateTransportLab({
  labOnly,t0Utc,operation='PREPARE_ONLY',fault='NONE',
}={}) {
  if (labOnly !== LAB_ONLY) throw new Error('P42_OFFLINE_LAB_ONLY_NO_PROVIDER');
  if (!CANONICAL_ERRORS.has(fault) || !OPERATIONS.has(operation))
    throw new Error('P42_INVALID_SYNTHETIC_SCENARIO');
  const plan=buildOfflinePlan({labOnly,t0Utc});
  const events=[];
  const fake=makeFake(plan,fault,events);
  const http=descriptor=>fake.https({...descriptor,
    headers:{...(descriptor.headers||{}),Authorization:TEST_AUTH}});
  const blocked=status=>({laboratory:true,status,events,...fake.state()});
  try {
    if (plan.projectRef !== PROJECT_REF || plan.keyId !== 'P42_V1' ||
        plan.secretName !== EDGE_SECRET_NAME ||
        Date.parse(plan.tExpUtc)-Date.parse(plan.t0Utc)!==86400000)
      return blocked('BLOCKED_INVALID_CONTRACT');

    try {
      const response=await http(plan.edgeCreate);
      if (response.status!==201) return blocked('BLOCKED_EDGE_OUTCOME_UNCERTAIN');
    } catch {
      // Never repeat uncertain POST or proceed to DB.
      return blocked('BLOCKED_EDGE_OUTCOME_UNCERTAIN');
    }
    try {
      const response=await fake.query(plan.pgInsert);
      if (response.rowCount!==1) throw new Error(SECRET_ERROR);
    } catch {
      if (fault === 'DB_INSERT_TIMEOUT_AFTER_WRITE')
        return blocked('BLOCKED_DB_OUTCOME_UNCERTAIN');
      try {
        const removal=await http(plan.edgeDelete);
        const listing=await http(plan.edgeList);
        if (removal.status===200 && listing.status===200 &&
            !listing.records.some(x=>x?.name===EDGE_SECRET_NAME))
          return blocked('BLOCKED_DB_INSERT_EDGE_COMPENSATED');
      } catch { /* Compensation uncertainty must be retained. */ }
      return blocked('BLOCKED_EDGE_COMPENSATION_UNCERTAIN');
    }

    try {
      const listing=await http(plan.edgeList);
      const metadata=await fake.query(plan.pgMetadata);
      const row=metadata.rows[0];
      if (listing.status!==200 || metadata.rowCount!==1 ||
          !listing.records.some(x=>x?.name===EDGE_SECRET_NAME) ||
          row?.key_id!=='P42_V1' || row?.enabled!==false ||
          row?.not_before!==plan.t0Utc || row?.not_after!==plan.tExpUtc)
        return blocked('BLOCKED_METADATA_INCONSISTENT');
    } catch {return blocked('BLOCKED_POSTFLIGHT_UNCERTAIN');}
    if (operation==='PREPARE_ONLY')
      return {...blocked('SYNTHETIC_INERT_PREPARED_ONLY'),enabled:false};

    // Explicit simulated manual action; no cron, timeout, or provider side effect.
    try {
      const removal=await http(plan.edgeDelete);
      if (removal.status!==200) throw new Error(SECRET_ERROR);
    } catch {return blocked('BLOCKED_EDGE_REVOCATION_UNCERTAIN');}
    try {
      const removal=await fake.query(plan.pgDelete);
      if (removal.rowCount!==1 || removal.rows[0]?.key_id!=='P42_V1')
        return blocked('BLOCKED_DB_REVOCATION_UNCERTAIN');
      const [listing,metadata]=await Promise.all([
        http(plan.edgeList),fake.query(plan.pgMetadata)]);
      if (listing.status!==200 || metadata.rowCount!==0 ||
          listing.records.some(x=>x?.name===EDGE_SECRET_NAME))
        return blocked('BLOCKED_REVOCATION_POSTFLIGHT');
      return {...blocked('SYNTHETIC_MANUAL_REVOCATION_REHEARSED'),enabled:false};
    } catch {return blocked('BLOCKED_DB_REVOCATION_UNCERTAIN');}
  } finally {
    // Only the Buffer fixture is cleared. JS strings/snapshots cannot be
    // guaranteed to be cryptographically removed from memory.
    plan.pgInsert.values[1].fill(0);
  }
}

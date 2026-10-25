import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
const container = 'pazo-f18-public-lab'
const args = [
  'exec',
  '-i',
  container,
  'psql',
  '-X',
  '-qAt',
  '-v',
  'ON_ERROR_STOP=1',
  '-U',
  'postgres',
  '-d',
  'f14_synthetic',
]
function sql(query) {
  const r = spawnSync('docker', args, { input: query, encoding: 'utf8' })
  if (r.status !== 0) throw Error(r.stderr)
  return r.stdout.trim()
}
function parallel(query) {
  return new Promise((resolve, reject) => {
    const p = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] })
    let out = '',
      err = ''
    p.stdout.on('data', (d) => (out += d))
    p.stderr.on('data', (d) => (err += d))
    p.on('error', reject)
    p.on('exit', (code) =>
      code === 0 ? resolve(out.trim()) : reject(Error(err)),
    )
    p.stdin.end(query)
  })
}
assert.equal(
  sql(
    "SELECT current_database()='f14_synthetic' AND current_user='postgres' AND current_setting('server_version_num')::integer>=170000",
  ),
  't',
)
const claim = (n) =>
  `BEGIN;SET LOCAL lock_timeout='30s';SELECT f18_test.login(${n});SELECT public.pazo_supporter_promotion('claim')->>'show';COMMIT;`
const results = await Promise.all(
  Array.from({ length: 20 }, () => parallel(claim(120))),
)
assert.equal(results.filter((x) => x.endsWith('true')).length, 1)
console.log('PASS F18 20 simultaneous devices: exactly one render permit')
await Promise.all(
  Array.from({ length: 30 }, (_, i) => parallel(claim(121 + i))),
)
assert.equal(
  sql(
    'SELECT count(*) FROM supporter_private.supporter_promotion WHERE owner_id BETWEEN f18_test.owner(121) AND f18_test.owner(150) AND render_token IS NOT NULL',
  ),
  '30',
)
console.log('PASS F18 30 independent accounts: no commercial capacity or queue')
sql(
  `UPDATE supporter_private.supporter_promotion SET first_impression_at=now()-interval '15 days' WHERE owner_id BETWEEN f18_test.owner(120) AND f18_test.owner(150);`,
)
const tick = `BEGIN;SET LOCAL lock_timeout='45s';SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);SELECT public.pazo_f18_supporter_tick(true);COMMIT;`
await Promise.all(Array.from({ length: 8 }, () => parallel(tick)))
assert.equal(
  sql(
    "SELECT count(*)||':'||count(DISTINCT user_id) FROM public.notifications WHERE user_id BETWEEN f18_test.owner(120) AND f18_test.owner(150) AND type='supporter_campaign'",
  ),
  '31:31',
)
console.log(
  'PASS F18 8 concurrent/retried workers: 31 owners, 31 internal reminders',
)
const feedback = `BEGIN;SELECT f18_test.login(106);SELECT public.pazo_supporter_feedback('issue','badge');COMMIT;`
await Promise.all(Array.from({ length: 8 }, () => parallel(feedback)))
assert.equal(
  sql(
    'SELECT count(*) FROM public.pazo_support_tickets WHERE owner_id=f18_test.owner(106)',
  ),
  '1',
)
console.log(
  'PASS F18 feedback concurrency: one support case and unchanged paid rights',
)

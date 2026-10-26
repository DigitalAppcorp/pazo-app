// Only this named local Docker container/database. No connection-string input.
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const container = process.env.PAZO_F18_LAB_CONTAINER || 'pazo-f18-public-lab'
if (!/^pazo-f18-public-lab(?:-issue121)?$/.test(container))
  throw Error('Only the named F18 disposable containers are allowed')
function run(command, args) {
  const r = spawnSync(command, args, { stdio: 'inherit' })
  if (r.status !== 0) throw Error(`${command} failed: ${r.status}`)
}
for (const file of [
  'f16-live-worker-scheduler-core-stage.mjs',
  'f16-live-benefits-prerequisites-stage.mjs',
  'f16-gradual-live-stage.mjs',
])
  run(process.execPath, ['scripts/' + file])
const inspect = spawnSync(
  'docker',
  [
    'inspect',
    '--format',
    '{{index .Config.Labels "pazo.disposable"}}:{{.HostConfig.NetworkMode}}',
    container,
  ],
  { encoding: 'utf8' },
)
if (inspect.status !== 0) {
  run('docker', [
    'run',
    '--detach',
    '--name',
    container,
    '--label',
    'pazo.disposable=f18',
    '--network',
    'none',
    '--mount',
    `type=bind,src=${process.cwd()},dst=/repo,readonly`,
    '--workdir',
    '/repo',
    '--env',
    'POSTGRES_USER=postgres',
    '--env',
    'POSTGRES_DB=f16_lab',
    '--env',
    'POSTGRES_PASSWORD=synthetic_disposable_only',
    'postgres:17',
  ])
  for (let n = 0; n < 120; n++) {
    if (
      spawnSync(
        'docker',
        [
          'exec',
          container,
          'pg_isready',
          '-h',
          '127.0.0.1',
          '-U',
          'postgres',
          '-d',
          'f16_lab',
        ],
        { stdio: 'ignore' },
      ).status === 0
    )
      break
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
} else if (inspect.stdout.trim() !== 'f18:none')
  throw Error('Disposable label/network guard failed')
const details = JSON.parse(spawnSync('docker', ['inspect', container], {encoding:'utf8'}).stdout)[0]
const mount = details.Mounts.find(m => m.Destination === '/repo')
if (!mount || mount.RW !== false || resolve(mount.Source).toLowerCase() !== resolve('.').toLowerCase())
  throw Error('Disposable source mount does not match this reviewed checkout')
if (!details.State.Running) run('docker', ['start', container])
const base = [
  'exec',
  container,
  'psql',
  '-X',
  '-U',
  'postgres',
  '-d',
  'f16_lab',
  '-v',
  'ON_ERROR_STOP=1',
]
run('docker', [
  ...base,
  '-c',
  "DO $$ BEGIN IF current_database()<>'f16_lab' THEN RAISE EXCEPTION 'Disposable only';END IF;END $$;",
  '-c',
  'DROP DATABASE IF EXISTS f14_synthetic WITH (FORCE);',
])
const prerequisites = [
  'scripts/f16-live-gateway-disposable-lab.sql',
  'scripts/f16-gradual-live-lab-setup.sql',
  'supabase/tests/gradual/kernel-pg17.sql',
  'supabase/tests/gradual/failures-pg17.sql',
  'supabase/tests/gradual/security-pg17.sql',
  'supabase/migrations/20261023235424_pazo_f16_qa_original_read_audit.sql',
  'supabase/tests/gradual/real-cohort-pg17.sql',
  'supabase/tests/gradual/qa-recheck-gate-pg17.sql',
]
run('docker', [...base, ...prerequisites.flatMap((f) => ['-f', f])])
const source = readFileSync(
  'supabase/migrations/20261025073311_pazo_f18_public_supporter_invitations.sql',
  'utf8',
)
writeFileSync(
  'supabase/tests/supporter/fixtures/f18-rollback.generated.sql',
  source.replace(/COMMIT;\s*$/, 'ROLLBACK;'),
)
run('docker', [
  ...base,
  '-f',
  'supabase/tests/f18/setup.sql',
  '-f',
  'supabase/tests/f18/kernel.sql',
  '-f',
  'supabase/tests/f18/financial-gates.sql',
  '-f',
  'supabase/tests/f18/review-regressions.sql',
])
run(process.execPath, ['scripts/f18-public-supporter-concurrency.mjs'])
// Final isolated fixture verifies only the principal administrator is reclassified.
const archiveProposal=readFileSync('docs/review/f18/PROPOSED_SINGLE_QA_ARCHIVE_20261026.sql','utf8')
if(!archiveProposal.trimEnd().endsWith('COMMIT;'))
  throw Error('QA archive proposal is not a complete transaction')
writeFileSync(
  'supabase/tests/f18/qa-archive.rollback.generated.sql',
  archiveProposal.replace(/COMMIT;\s*$/, 'ROLLBACK;'),
)
run('docker', [...base, '-f', 'supabase/tests/f18/production-admin-reclassification-lab.sql'])

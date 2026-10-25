// Real React components -> intercepted Auth/Edge -> actual disposable PostgreSQL RPCs.
// No production requests, payer, secrets or payments. Existing PayPal provider is simulated.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { request } from 'node:http'
import { mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { getPazoLiveOffer } from '../supabase/functions/pazo-paypal-live-checkout/liveOfferRegistry.mjs'
import { createPublicSupporterAdminHandler } from '../supabase/functions/pazo-admin-public-supporter/handler.mjs'
const require = createRequire(import.meta.url),
  { chromium } = require(
    process.env.PAZO_PLAYWRIGHT_MODULE ||
      '../../continuidad/f18-browser-tools/node_modules/playwright',
  )
const origin = process.env.PAZO_F18_LOCAL_ORIGIN || 'http://127.0.0.1:5188'
assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/)
const out = process.env.PAZO_F18_SCREENSHOTS || 'artifacts/f18-ui'
mkdirSync(out, { recursive: true })
const owner = (n) =>
  `82000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`
const quote = (v) => "'" + String(v).replaceAll("'", "''") + "'"
function sql(query) {
  const r = spawnSync(
    'docker',
    [
      'exec',
      '-i',
      'pazo-f18-public-lab',
      'psql',
      '-X',
      '-qAt',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      'postgres',
      '-d',
      'f14_synthetic',
    ],
    { input: query, encoding: 'utf8' },
  )
  if (r.status !== 0) throw Error(r.stderr)
  return r.stdout.trim().split('\n').at(-1)
}
function rpc(n, name, args = []) {
  assert.match(name, /^pazo_[a-z_]+$/)
  return JSON.parse(
    sql(
      `BEGIN;SELECT f18_test.login(${n});SELECT public.${name}(${args.map((x) => (x === null ? 'NULL' : quote(x))).join(',')})::text;COMMIT;`,
    ),
  )
}
const local = (url) =>
  new Promise((resolve, reject) => {
    const req = request(url, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () =>
        resolve({
          status: res.statusCode,
          headers: {
            'content-type': res.headers['content-type'] || 'text/plain',
          },
          body: Buffer.concat(chunks),
        }),
      )
    })
    req.on('error', reject)
    req.end()
  })
const token = (n) =>
  `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: owner(n), role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.synthetic`
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PAZO_CHROMIUM_PATH
    ? { executablePath: process.env.PAZO_CHROMIUM_PATH }
    : {}),
  args: ['--no-sandbox'],
})
let assertions = 0
const check = (value, message) => {
  assert.ok(value, message)
  assertions++
}
async function fixture({
  width = 390,
  height = 844,
  lang = 'es',
  n = 174,
  mode = 'inactive',
  reduced = false,
} = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    serviceWorkers: 'block',
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  })
  let current = n,
    creates = 0,
    unknown = [],
    adminCalls = 0,
    statusReads = 0
  const errors = []
  await context.route('**/*', async (route) => {
    const r = route.request(),
      u = new URL(r.url())
    if (u.origin === origin) return route.fulfill(await local(u.href))
    if (u.hostname !== 'mrybvqdebbgcayuvgkkr.supabase.co') {
      unknown.push(u.hostname)
      return route.abort()
    }
    let body = {}
    try {
      body = r.postDataJSON() || {}
    } catch {}
    let value = {},
      code = 200
    try {
      if (u.pathname.endsWith('/auth/v1/token')) {
        current = body.email?.startsWith('switched') ? 175 : n
        value = {
          access_token: token(current),
          refresh_token: 'SYNTHETIC',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: owner(current),
            email: 'synthetic@invalid.test',
            aud: 'authenticated',
            role: 'authenticated',
          },
        }
      } else if (u.pathname.endsWith('/auth/v1/user'))
        value = {
          id: owner(current),
          email: 'synthetic@invalid.test',
          aud: 'authenticated',
          role: 'authenticated',
          factors: [],
        }
      else if (u.pathname.endsWith('/rpc/pazo_ensure_my_profile')) value = null
      else if (u.pathname.endsWith('/rpc/pazo_supporter_visit'))
        value = rpc(current, 'pazo_supporter_visit')
      else if (u.pathname.endsWith('/rpc/pazo_supporter_promotion'))
        value = rpc(current, 'pazo_supporter_promotion', [
          body.p_action,
          body.p_token ?? null,
          body.p_source ?? null,
        ])
      else if (u.pathname.endsWith('/rpc/pazo_supporter_status'))
        value = rpc(current, 'pazo_supporter_status')
      else if (u.pathname.endsWith('/rpc/pazo_supporter_feedback'))
        value = rpc(current, 'pazo_supporter_feedback', [
          body.p_feedback,
          body.p_component ?? null,
        ])
      else if (u.pathname.endsWith('/rpc/pazo_supporter_my_account_status'))
        value = {
          active: mode === 'courtesy' || mode === 'paid',
          milestone: 0,
        }
      else if (u.pathname.endsWith('/pazo-paypal-live-account'))
        value = {
          ok: true,
          paidThrough: null,
          accounts:
            mode === 'pending'
              ? [
                  {
                    intentId: 'intent-' + owner(170),
                    state: 'pending',
                    canDownloadAcceptance: true,
                    needsReconciliation: true,
                  },
                ]
              : [],
          acceptances: [],
        }
      else if (u.pathname.endsWith('/pazo-paypal-live-checkout')) {
        if (r.method() === 'POST') {
          creates++
          code = 503
          value = { code: 'outcome_unknown' }
        } else
          value = {
            code: 'live_checkout_ready',
            ready: true,
            mayGrantBenefits: false,
            offer: getPazoLiveOffer(lang),
          }
      } else if (
        u.pathname.endsWith('/rpc/pazo_admin_public_supporter_status')
      ) {
        statusReads++
        value = rpc(65535, 'pazo_admin_public_supporter_status')
      } else if (u.pathname.endsWith('/rpc/pazo_admin_supporter_member'))
        value = rpc(65535, 'pazo_admin_supporter_member', [body.p_owner])
      else if (u.pathname.endsWith('/rpc/pazo_admin_supporter_payments'))
        value = rpc(65535, 'pazo_admin_supporter_payments')
      else if (u.pathname.endsWith('/rpc/pazo_admin_find_benefit_recipients'))
        value = [
          {
            owner_id: owner(171),
            email: 'synthetic@invalid.test',
            pets: ['Synthetic pet'],
            gift_level: null,
            gift_expires_at: null,
            gift_active: false,
          },
        ]
      else if (u.pathname.endsWith('/rpc/pazo_admin_gift_history')) value = []
      else if (u.pathname.endsWith('/rpc/pazo_admin_live_finance_summary'))
        value = rpc(65535, 'pazo_admin_live_finance_summary')
      else if (u.pathname.endsWith('/rpc/pazo_admin_live_readiness'))
        value = {
          source: 'pazo_live_admin_readiness_v1',
          asOf: new Date().toISOString(),
          phase: 'active',
          checkoutActive: true,
          mayCharge: false,
          mayActivate: false,
          blockers: [],
          checks: Object.fromEntries(
            [
              'termsReady',
              'ownerRecoverySchemaReady',
              'benefitsSchemaReady',
              'financeSchemaReady',
              'releaseControlsReady',
              'credentialsStored',
              'providerResourcesVerified',
              'workerHealthy',
            ].map((k) => [k, true]),
          ),
        }
      else if (u.pathname.endsWith('/pazo-admin-public-supporter')) {
        adminCalls++
        const handler = createPublicSupporterAdminHandler({
          authenticateAdmin: async () => ({
            id: owner(65535),
            isAdmin: true,
            freshSession: true,
          }),
          change: async (a) =>
            JSON.parse(
              sql(
                `BEGIN;SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);SELECT public.pazo_f18_supporter_admin_action(${quote(a.actorId)},${quote(a.action)},${a.revision},${quote(a.requestId)})::text;COMMIT;`,
              ),
            ),
        })
        const response = await handler(
          new Request(
            'https://fixture.supabase.co/functions/v1/pazo-admin-public-supporter',
            {
              method: 'POST',
              headers: {
                origin: 'https://pazo-app.vercel.app',
                'content-type': 'application/json',
              },
              body: JSON.stringify(body),
            },
          ),
        )
        code = response.status
        value = await response.json()
      } else if (u.pathname.includes('/rest/v1/pazo_support_tickets'))
        value = []
      else {
        unknown.push(u.pathname)
        return route.abort()
      }
      await route.fulfill({
        status: code,
        contentType: 'application/json',
        body: JSON.stringify(value),
      })
    } catch (e) {
      errors.push('route: ' + e.message)
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: '{"code":"synthetic_route_failed"}',
      })
    }
  })
  const page = await context.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  const goto = (kind) =>
    page.goto(
      origin +
        `/supabase/tests/f18/browser-harness.html?case=${kind}&lang=${lang}`,
    )
  return {
    context,
    page,
    goto,
    errors,
    unknown,
    get creates() {
      return creates
    },
    get adminCalls() {
      return adminCalls
    },
    get statusReads() {
      return statusReads
    },
  }
}
try {
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [768, 1024],
    [1440, 900],
  ])
    for (const lang of ['es', 'en']) {
      const f = await fixture({ width, height, lang, reduced: true })
      await f.goto('invitation')
      await f.page
        .getByRole('heading', {
          name:
            lang === 'es'
              ? 'Ayúdanos a seguir creciendo'
              : 'Help us keep growing',
        })
        .waitFor()
      check(
        (
          await f.page.locator('.supporter-growth-price').textContent()
        ).includes('2.99'),
        'price and cadence visible',
      )
      const overflow = await f.page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      )
      check(!overflow, 'no horizontal overflow')
      const animation = await f.page
        .locator('.supporter-growth-art img')
        .evaluate((e) => getComputedStyle(e).animationName)
      check(animation === 'none', 'reduced motion respected')
      await f.page.screenshot({
        path: `${out}/growth-${width}-${lang}.png`,
        fullPage: true,
      })
      await f.page
        .getByRole('button', {
          name:
            lang === 'es'
              ? 'Ahora no, seguir en PAZO'
              : 'Not now, continue in PAZO',
        })
        .click()
      check(
        await f.page
          .getByRole('button', { name: 'PAZO', exact: true })
          .isVisible(),
        'free exit works',
      )
      check(
        f.errors.length === 0 && f.unknown.length === 0,
        'visual fixture has no console errors or external requests',
      )
      await f.context.close()
    }
  // Actual server-render handshake; no display while a critical task is active.
  sql(
    `INSERT INTO supporter_private.supporter_engagement(owner_id,first_use_at,returned_at,meaningful_at) VALUES(f18_test.owner(161),now()-interval '2 days',now(),now()) ON CONFLICT DO NOTHING;`,
  )
  const c = await fixture({ n: 161 })
  await c.page.goto(
    origin +
      '/supabase/tests/f18/browser-harness.html?case=coordinator&unsafe=1',
  )
  await c.page.waitForTimeout(2900)
  check(
    (await c.page.getByRole('dialog').count()) === 0,
    'critical task never interrupted',
  )
  await c.page.getByRole('button', { name: 'Fixture safe task' }).click()
  await c.page.getByRole('dialog').waitFor({ timeout: 12000 })
  await c.page.waitForTimeout(400)
  check(
    sql(
      'SELECT first_impression_at IS NOT NULL FROM supporter_private.supporter_promotion WHERE owner_id=f18_test.owner(161)',
    ) === 't',
    'real rendered impression persisted',
  )
  await c.page.keyboard.press('Escape')
  check(
    (await c.page.getByRole('dialog').count()) === 0,
    'Escape exits invitation',
  )
  await c.page.reload()
  await c.page.waitForTimeout(2900)
  check(
    (await c.page.getByRole('dialog').count()) === 0,
    'server cap survives reinstall/session reload',
  )
  check(
    c.errors.length === 0 && c.unknown.length === 0,
    'coordinator all requests accounted for',
  )
  await c.context.close()
  for (const lang of ['es', 'en']) {
    const f = await fixture({ lang, n: 174 })
    await f.goto('account')
    const checkbox = f.page.getByRole('checkbox')
    await checkbox.waitFor()
    const pay = f.page.getByRole('button', {
      name: lang === 'es' ? 'Continuar con PayPal' : 'Continue with PayPal',
      exact: true,
    })
    check(await pay.isDisabled(), 'explicit consent required')
    check(f.creates === 0, 'opening offer does not CREATE')
    check(
      (await f.page
        .getByText(/cupo|lista de espera|checkout slot|waiting list/i)
        .count()) === 0,
      'no commercial quota UI',
    )
    await f.page.screenshot({
      path: `${out}/offer-${lang}.png`,
      fullPage: true,
    })
    await checkbox.check()
    await pay.dblclick({ force: true }).catch(() => {})
    await f.page
      .getByRole('alert')
      .filter({
        hasText: lang === 'es' ? 'necesita revisión' : 'needs verification',
      })
      .waitFor()
    check(f.creates === 1, 'double click/network uncertainty creates once')
    check(
      (await f.page
        .getByRole('button', {
          name: lang === 'es' ? 'Continuar con PayPal' : 'Continue with PayPal',
          exact: true,
        })
        .count()) === 0,
      'unknown outcome offers no duplicate CREATE',
    )
    check(
      f.errors.length === 0 && f.unknown.length === 0,
      'offer all requests accounted for',
    )
    await f.context.close()
  }
  const courtesy = await fixture({ n: 105, mode: 'courtesy' })
  await courtesy.goto('account')
  await courtesy.page
    .getByRole('button', { name: 'Quiero apoyar voluntariamente a PAZO' })
    .click()
  await courtesy.page.getByRole('checkbox').waitFor()
  check(courtesy.creates === 0, 'courtesy voluntary entry never auto-purchases')
  check(
    await courtesy.page
      .getByText('Tu cortesía se conserva.', { exact: false })
      .isVisible(),
    'courtesy retained',
  )
  await courtesy.context.close()
  const pending = await fixture({ n: 170, mode: 'pending' })
  await pending.goto('account')
  await pending.page.locator('[data-pazo-live-existing-checkout]').waitFor()
  check(
    pending.creates === 0 &&
      (await pending.page.getByRole('checkbox').count()) === 0,
    'pending request recovers original, no new offer',
  )
  await pending.context.close()
  for (const width of [320, 390, 768, 1440])
    for (const lang of ['es', 'en']) {
      // Explicit fixture preparation in the isolated DB, never an application
      // incident-resolution path. The actual UI only calls the protected API.
      sql(`UPDATE supporter_private.public_supporter_control SET checkouts_enabled=false,invitations_enabled=true,revision=revision+1;
      INSERT INTO supporter_private.gradual_incident(code) VALUES('financial_review') ON CONFLICT(code) DO UPDATE SET resolved_at=NULL;`)
      const f = await fixture({ width, lang, n: 65535 }),
        t = (es, en) => (lang === 'es' ? es : en)
      const page = f.page,
        btn = (name) => page.getByRole('button', { name, exact: true })
      const financialPause = t('Pausar nuevas compras', 'Pause new purchases'),
        open = t('Habilitar checkout público', 'Enable public checkout')
      const promoPause = t('Pausar invitaciones', 'Pause invitations'),
        promoResume = t('Reanudar invitaciones', 'Resume invitations')
      const refresh = async () => {
        const reads = f.statusReads
        await btn(t('Actualizar estado', 'Refresh status')).click()
        await page.waitForFunction(
          () =>
            !Array.from(document.querySelectorAll('button')).find((b) =>
              ['Actualizar estado', 'Refresh status'].includes(b.textContent),
            )?.disabled,
        )
        check(f.statusReads > reads, 'refresh re-reads authoritative state')
      }
      const choose = async (name, confirmation) => {
        await btn(name).click()
        await page.getByRole('textbox').fill(confirmation)
      }
      const confirm = () => btn(t('Confirmar cambio', 'Confirm change')).click()
      const success = () =>
        page
          .getByText(
            t(
              'Cambio verificado en el servidor.',
              'Change verified on the server.',
            ),
            { exact: true },
          )
          .waitFor()
      const absent = async (name, message) =>
        check((await btn(name).count()) === 0, message)
      await f.goto('admin')
      await page
        .getByRole('heading', {
          name: t('Estado operativo', 'Operational status'),
          exact: true,
        })
        .waitFor()
      await page
        .locator('[data-pazo-live-metric]')
        .filter({ hasText: t('Verificado', 'Verified') })
        .first()
        .waitFor()
      await page
        .locator('[data-pazo-live-metric]')
        .last()
        .filter({ hasText: /\d/ })
        .waitFor()
      const layout = await page
        .locator('[data-pazo-live-metric]')
        .evaluateAll((nodes) =>
          nodes.map((el) => {
            const text = el.firstChild,
              words = el.textContent.matchAll(/\S+/gu),
              bounds = el.getBoundingClientRect()
            const splitWords = []
            if (text?.nodeType === Node.TEXT_NODE)
              for (const match of words) {
                const range = document.createRange()
                range.setStart(text, match.index)
                range.setEnd(text, match.index + match[0].length)
                if (range.getClientRects().length > 1) splitWords.push(match[0])
              }
            const css = getComputedStyle(el)
            return {
              splitWords,
              overflow:
                el.scrollWidth > el.clientWidth + 1 ||
                bounds.right > innerWidth + 1,
              outline:
                css.outlineStyle !== 'none' && parseFloat(css.outlineWidth) > 0,
              border: ['Top', 'Right', 'Bottom', 'Left'].some(
                (side) =>
                  !['none', 'hidden'].includes(css[`border${side}Style`]) &&
                  parseFloat(css[`border${side}Width`]) > 0,
              ),
            }
          }),
        )
      check(
        layout.every((x) => !x.splitWords.length),
        'metric words never split mid-word',
      )
      check(
        layout.every((x) => !x.overflow),
        'metric values remain within their cards',
      )
      check(
        layout.every((x) => !x.outline && !x.border),
        `no decorative metric contours: ${JSON.stringify(layout)}`,
      )
      check(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        'admin has no horizontal overflow',
      )
      await page.screenshot({
        path: `${out}/admin-summary-${width}-${lang}.png`,
        fullPage: true,
      })
      if (lang === 'es' && [390, 1440].includes(width))
        await page.screenshot({
          path: `${out}/admin-summary-${width}.png`,
          fullPage: true,
        })
      for (const name of [
        t('Invitaciones y conversiones', 'Invitations and conversions'),
        t('Pagos y conciliación', 'Payments and reconciliation'),
        t('Suscripciones y miembros', 'Subscriptions and members'),
        t('Integración y seguridad', 'Integration and security'),
        t('Configuración y controles', 'Settings and controls'),
      ]) {
        await btn(name).click()
        await page.waitForTimeout(150)
      }
      await absent(open, 'unhealthy system never offers public opening')
      await absent(
        financialPause,
        'paused checkout does not offer a redundant pause',
      )
      await absent(
        promoResume,
        'active invitations do not offer redundant resume',
      )
      check(
        await page
          .locator('[data-pazo-admin-open-blocker="health_requires_review"]')
          .isVisible(),
        'financial blocker explanation is visible',
      )
      check(
        (await page
          .getByRole('button', { name: /incidencias|incident review/i })
          .count()) === 0,
        'no mass incident resolution control',
      )
      check(
        await btn(promoPause).isDisabled(),
        'sensitive promotion action requires fresh MFA',
      )
      await btn('Fixture MFA').click()
      const before = f.statusReads
      await choose(promoPause, 'PAUSAR INVITACIONES')
      await confirm()
      await success()
      await btn(promoResume).waitFor()
      check(
        f.statusReads > before,
        'successful mutation reads the resulting server state',
      )
      await absent(promoPause, 'paused invitations offer only resume')
      check(
        sql(
          'SELECT NOT checkouts_enabled AND NOT invitations_enabled FROM supporter_private.public_supporter_control',
        ) === 't',
        'promotion pause leaves checkout state unchanged',
      )
      await page.screenshot({
        path: `${out}/admin-controls-${width}-${lang}.png`,
        fullPage: true,
      })
      if (lang === 'es' && width === 390)
        await page.screenshot({
          path: `${out}/admin-controls-${width}.png`,
          fullPage: true,
        })
      await choose(promoResume, 'REANUDAR INVITACIONES')
      await confirm()
      await success()
      await btn(promoPause).waitFor()
      check(
        sql(
          'SELECT NOT checkouts_enabled AND invitations_enabled FROM supporter_private.public_supporter_control',
        ) === 't',
        'promotion resume leaves financial pause unchanged',
      )
      sql(
        'UPDATE supporter_private.public_supporter_control SET hosted_certified=false,revision=revision+1;',
      )
      await refresh()
      await absent(open, 'uncertified deployment never offers opening')
      check(
        await page
          .locator('[data-pazo-admin-open-blocker="hosted_gate_required"]')
          .isVisible(),
        'missing certificate has its own explanation',
      )
      // Simulate a remediated/certified healthy fixture, without invoking any
      // resolution command. No financial row, receipt, hold or period is edited.
      sql(`UPDATE supporter_private.gradual_incident SET resolved_at=clock_timestamp();
      UPDATE supporter_private.pazo_paypal_live_worker_control SET last_heartbeat_at=clock_timestamp();
      UPDATE supporter_private.public_supporter_control SET hosted_certified=true,webhook_ok_at=clock_timestamp(),revision=revision+1;`)
      await refresh()
      await btn(open).waitFor()
      await absent(
        financialPause,
        'healthy paused checkout offers opening only',
      )
      await choose(open, 'AUTORIZO PUBLICAR CHECKOUT LIVE')
      // A different admin changes the revision after the confirmation was read.
      sql(
        'UPDATE supporter_private.public_supporter_control SET revision=revision+1,invitations_enabled=true;',
      )
      await confirm()
      await page
        .getByText(
          t(
            'Cambio no confirmado. Actualiza el estado antes de repetir; puede requerir revisión técnica.',
            'Change unconfirmed. Refresh status before retrying; technical review may be required.',
          ),
          { exact: true },
        )
        .waitFor()
      await btn(promoPause).waitFor()
      check(
        sql(
          'SELECT NOT checkouts_enabled FROM supporter_private.public_supporter_control',
        ) === 't',
        'stale opening cannot change checkout state',
      )
      check(
        (await page.getByRole('textbox').count()) === 0,
        'stale confirmation is discarded',
      )
      await choose(open, 'AUTORIZO PUBLICAR CHECKOUT LIVE')
      await confirm()
      await success()
      await btn(financialPause).waitFor()
      await absent(open, 'enabled checkout offers only pause')
      await choose(financialPause, 'PAUSAR NUEVAS COMPRAS')
      await confirm()
      await success()
      await btn(open).waitFor()
      check(
        sql(
          'SELECT NOT checkouts_enabled AND invitations_enabled FROM supporter_private.public_supporter_control',
        ) === 't',
        'financial pause leaves invitations enabled',
      )
      check(
        f.adminCalls === 5,
        'five explicit API requests, including one safely rejected stale request',
      )
      check(
        f.errors.length === 0 && f.unknown.length === 0,
        JSON.stringify({ errors: f.errors, unknown: f.unknown }),
      )
      await f.context.close()
    }
  console.log(
    `PASS F18 browser: ${assertions} assertions; actual local RPC persistence, 8 G screenshots, offer, courtesy, pending, admin mobile/desktop; no production requests.`,
  )
} finally {
  await browser.close()
}

// Vigilante worker: reads official sources and hands structured findings to the database,
// which deduplicates, checks relevance per pet and writes drafts from fixed templates.
// Rules only. It never publishes or sends: that needs an administrator's recorded decision.

export const LA_COUNTY_SAME = '006037'
const HEAT_EVENTS = new Set(['Heat Advisory', 'Excessive Heat Warning', 'Excessive Heat Watch', 'Extreme Heat Warning', 'Extreme Heat Watch', 'Heat Warning'])
const SMOKE_EVENTS = new Set(['Air Quality Alert', 'Dense Smoke Advisory'])
const PET_WORDS = /\b(dogs?|cats?|pets?|canine|feline|kibble|puppy|puppies|kitten|kittens)\b/i

const laDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}
const laMoment = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}
const clip = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const https = (value) => {
  try {
    const url = new URL(String(value))
    if (url.protocol === 'http:') url.protocol = 'https:'
    return url.protocol === 'https:' ? url.href : null
  } catch { return null }
}

// National Weather Service active alerts (GeoJSON). Keeps heat and smoke alerts for LA County.
export function parseNwsAlerts(json) {
  const items = []
  for (const feature of json?.features ?? []) {
    const p = feature?.properties ?? {}
    if (p.status !== 'Actual' || !['Alert', 'Update'].includes(p.messageType)) continue
    const kind = HEAT_EVENTS.has(p.event) ? 'heat' : SMOKE_EVENTS.has(p.event) ? 'smoke' : null
    if (!kind) continue
    if (!(p.geocode?.SAME ?? []).includes(LA_COUNTY_SAME)) continue
    const url = https(feature.id || p['@id'])
    const published = laDate(p.sent)
    if (!url || !published || !p.id) continue
    const ends = p.ends || p.expires
    items.push({
      kind,
      external_id: clip(p.id, 300),
      fingerprint: `${kind}:la:${laDate(p.onset || p.sent)}`,
      url,
      published_on: published,
      expires_at: ends && !Number.isNaN(new Date(ends).getTime()) ? new Date(ends).toISOString() : '',
      params: { area: clip(p.areaDesc, 80), until: clip(laMoment(ends), 40) },
    })
  }
  return items
}

const tag = (xml, name) => {
  const match = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i').exec(xml)
  if (!match) return ''
  return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, ' ').trim()
}

// FDA recalls RSS. Keeps pet food and treats; brand, product and reason come from the headline.
export function parseFdaRecalls(xml) {
  const items = []
  for (const block of String(xml ?? '').match(/<item>[\s\S]*?<\/item>/gi) ?? []) {
    const title = clip(tag(block, 'title'), 300)
    const description = clip(tag(block, 'description'), 600)
    if (!PET_WORDS.test(`${title} ${description}`)) continue
    const url = https(tag(block, 'link'))
    const published = laDate(tag(block, 'pubDate'))
    if (!url || !published) continue
    const head = /^(.+?)\s+(?:Voluntarily\s+)?(?:Recalls?|Issues\s+(?:a\s+)?(?:Voluntary\s+)?(?:Nationwide\s+)?Recall\s+of|Expands\s+(?:Voluntary\s+)?Recall\s+of)\s+(.+?)(?:\s+(?:Due\s+to|Because\s+of|Because)\s+(.+))?$/i.exec(title)
    if (!head) continue
    const brand = clip(head[1], 80)
    const product = clip(head[2], 120)
    const reason = clip(head[3] || description, 200)
    const guid = clip(tag(block, 'guid') || url, 300)
    items.push({
      kind: 'recall',
      external_id: guid,
      fingerprint: `recall:${brand.toLowerCase()}:${product.toLowerCase()}`.slice(0, 300),
      url,
      published_on: published,
      expires_at: new Date(new Date(`${published}T12:00:00Z`).getTime() + 30 * 86400000).toISOString(),
      params: { brand, product, reason },
    })
  }
  return items
}

const SOURCES = {
  nws_la: { url: 'https://api.weather.gov/alerts/active?area=CA', accept: 'application/geo+json', parse: (text) => parseNwsAlerts(JSON.parse(text)) },
  fda_recalls: { url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/recalls/rss.xml', accept: 'application/rss+xml', parse: parseFdaRecalls },
}

export function createVigilanteWorker({ rpc, fetchImpl = fetch, userAgent }) {
  const read = async (key) => {
    const source = SOURCES[key]
    if (!source) throw new Error('no reader for ' + key)
    const response = await fetchImpl(source.url, {
      redirect: 'follow', signal: AbortSignal.timeout(10000),
      headers: { accept: source.accept, 'user-agent': userAgent },
    })
    if (!response.ok) throw new Error('HTTP ' + response.status)
    return source.parse(await response.text())
  }
  return async (request) => {
    if (request.method !== 'POST') return new Response(null, { status: 405 })
    const token = (request.headers.get('authorization') ?? '').replace(/^Bearer /, '')
    if (await rpc('pazo_vigilante_worker_admit', { p_token: token }) !== true) return new Response(null, { status: 401 })
    const due = await rpc('pazo_vigilante_due_sources') ?? []
    const report = {}
    // One source failing never stops the others.
    for (const key of due) {
      try {
        const items = await read(key)
        report[key] = await rpc('pazo_vigilante_ingest', { p_source_key: key, p_items: items })
      } catch (error) {
        report[key] = { error: String(error?.message ?? error).slice(0, 200) }
        await rpc('pazo_vigilante_source_failed', { p_source_key: key, p_error: report[key].error }).catch(() => undefined)
      }
    }
    return new Response(JSON.stringify(report), { status: 200, headers: { 'content-type': 'application/json' } })
  }
}

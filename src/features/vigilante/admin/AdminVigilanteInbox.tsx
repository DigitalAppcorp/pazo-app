import { useCallback, useEffect, useState } from 'react'
import { InfoTip } from '../../admin/components/AdminClarity'
import { VACCINE_LABELS } from '../../care/vaccineTypes'
import { isVaccineType } from '../../care/vaccineTypes'
import {
  cancelDraft, createManualDraft, decideDraft, editDraft, fetchVigilanteInbox, fetchVigilanteResults, fetchVigilanteSummary,
  isQuietHours, sendDraftTest, setVigilanteEnabled, verifySecondFactor,
  type DraftKind, type RejectReason, type VigilanteDraft, type VigilanteInbox,
} from './vigilanteAdminService'

type L = (es: string, en: string) => string

const PRIORITY: Record<string, { es: string; en: string; tone: string }> = {
  high: { es: 'Alta', en: 'High', tone: 'bg-[#F9E7DE] text-[#823E2D]' },
  medium: { es: 'Media', en: 'Medium', tone: 'bg-[#F4F5C9] text-[#204E4A]' },
  low: { es: 'Baja', en: 'Low', tone: 'bg-[#EEF4E7] text-[#204E4A]' },
}
const REJECT: { key: RejectReason; es: string; en: string }[] = [
  { key: 'not_relevant', es: 'No es relevante', en: 'Not relevant' },
  { key: 'doubtful_source', es: 'Fuente dudosa', en: 'Doubtful source' },
  { key: 'duplicate', es: 'Repetida', en: 'Duplicate' },
  { key: 'tone', es: 'Tono', en: 'Tone' },
]
const button = 'min-h-11 rounded-full px-4 text-[13px] font-extrabold transition-colors disabled:opacity-50'

const Bar = ({ label, value, max }: { label: string; value: number; max: number }) => (
  <div className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-2 text-[12px] text-[#204E4A]">
    <span className="truncate">{label}</span>
    <span className="h-2.5 rounded-full bg-[#EEF4E7]"><span className="block h-2.5 rounded-full bg-[#204E4A]" style={{ width: `${max ? Math.round((value / max) * 100) : 0}%` }} /></span>
    <strong className="text-right">{value}</strong>
  </div>
)

// The exact three pieces people will see.
const Preview = ({ draft, lang, l }: { draft: VigilanteDraft; lang: 'es' | 'en'; l: L }) => (
  <div className="grid gap-2 sm:grid-cols-3">
    <div className="rounded-[16px] bg-[#204E4A] p-3 text-white">
      <small className="block text-[11px] opacity-70">{l('Pantalla bloqueada', 'Lock screen')}</small>
      <strong className="block text-[13px]">{l('Tenemos un aviso de salud para tu mascota', 'We have a health alert for your pet')}</strong>
      <span className="text-[12px] opacity-80">{l('Toca para ver si aplica a tu mascota.', 'Tap to see if it applies to your pet.')}</span>
    </div>
    <div className="rounded-[16px] bg-[#E7F0DA] p-3 text-[#204E4A]">
      <small className="block text-[11px] text-[#5C7470]">{l('Aviso en la app (mascota de ejemplo)', 'In-app notice (sample pet)')}</small>
      <strong className="block text-[13px]">{lang === 'es' ? draft.title_es : draft.title_en}</strong>
      <span className="text-[12px]">{draft.kind === 'outbreak' ? l('Esto aplica a Max: su vacuna venció.', 'This applies to Max: their vaccine expired.') : l('Esto aplica a Max.', 'This applies to Max.')}</span>
    </div>
    <div className="rounded-[16px] bg-[#FAF8F5] p-3 text-[#204E4A]">
      <small className="block text-[11px] text-[#5C7470]">{l('Publicación del feed', 'Feed post')}</small>
      <strong className="block text-[13px]">{lang === 'es' ? draft.title_es : draft.title_en}</strong>
      <span className="block text-[12px] leading-relaxed">{lang === 'es' ? draft.body_es : draft.body_en}</span>
    </div>
  </div>
)

const DraftCard = ({ draft, lang, l, onChanged }: { draft: VigilanteDraft; lang: 'es' | 'en'; l: L; onChanged: (message: string) => void }) => {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [editing, setEditing] = useState<'code' | 'form' | null>(null)
  const [code, setCode] = useState('')
  const [form, setForm] = useState({ title_es: draft.title_es, body_es: draft.body_es, title_en: draft.title_en, body_en: draft.body_en, priority: draft.priority })
  const p = draft.counts.pets
  const max = Math.max(1, ...Object.values(p))
  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true); setError('')
    try { await action(); onChanged(message) } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) } finally { setBusy(false) }
  }
  const priority = PRIORITY[draft.priority]
  return (
    <article className="space-y-3 rounded-[18px] bg-white p-4 shadow-[0_7px_29px_rgba(32,78,74,0.06)]">
      <header className="flex flex-wrap items-center gap-2">
        <span className={`rounded-lg px-2 py-0.5 text-[11px] font-black uppercase ${priority.tone}`}>{lang === 'es' ? priority.es : priority.en}</span>
        {draft.review_needed && <span className="rounded-lg bg-[#F9E7DE] px-2 py-0.5 text-[11px] font-black text-[#823E2D]">{l('Revisar con cuidado', 'Review carefully')}</span>}
        {draft.vaccine_type && isVaccineType(draft.vaccine_type) && <span className="rounded-lg bg-[#EEF4E7] px-2 py-0.5 text-[11px] font-bold text-[#204E4A]">{VACCINE_LABELS[draft.vaccine_type][lang]}</span>}
        <h4 className="w-full text-[15px] font-black text-[#204E4A]">{lang === 'es' ? draft.title_es : draft.title_en}</h4>
        <p className="w-full text-[12px] text-[#5C7470]">
          <a className="font-bold text-[#204E4A] underline" href={draft.source_url} target="_blank" rel="noopener noreferrer">{draft.source_name}</a>
          {' · '}{draft.source_published_at}{draft.expires_at ? ` · ${l('caduca', 'expires')} ${new Date(draft.expires_at).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US')}` : ''}
        </p>
      </header>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-[#204E4A]">
          {l('¿A quién llega?', 'Who receives it?')}
          <InfoTip label={l('Cómo se calcula', 'How it is counted')}>
            {l('Se cruza la alerta con la especie, el código postal del hogar y las vacunas registradas de cada mascota. Vigente: no recibe aviso. Sin datos de zona o de comida: no recibe aviso. Se recalcula al enviar.',
              'The alert is matched against each pet’s species, the household ZIP code and recorded vaccines. Current: no notice. Missing area or food data: no notice. Recalculated at send time.')}
          </InfoTip>
        </div>
        <Bar label={l('Push', 'Push')} value={draft.counts.push_users} max={Math.max(1, draft.counts.notified_users)} />
        <Bar label={l('Aviso en la app', 'In-app notice')} value={draft.counts.notified_users} max={Math.max(1, draft.counts.notified_users)} />
        {draft.kind === 'outbreak' && <>
          <Bar label={l('Vacuna vencida', 'Vaccine expired')} value={p.expired} max={max} />
          <Bar label={l('Sin registrar', 'Not recorded')} value={p.unregistered + p.no_date} max={max} />
          <Bar label={l('Vigente (no avisa)', 'Current (no notice)')} value={p.current} max={max} />
        </>}
        {draft.kind !== 'outbreak' && <Bar label={l('Aplica', 'Applies')} value={p.applies} max={max} />}
        {draft.kind === 'recall' && <Bar label={l('Comida sin registrar', 'Food not recorded')} value={p.unknown} max={max} />}
        <Bar label={l('Sin código postal', 'No ZIP code')} value={p.insufficient} max={max} />
      </div>

      <Preview draft={draft} lang={lang} l={l} />

      {editing === 'code' && (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); void run(async () => { await verifySecondFactor(code); setEditing('form') }, '') }}>
          <label className="text-[12px] font-bold text-[#204E4A]">{l('Código de tu autenticador', 'Authenticator code')}
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              className="mt-1 block w-32 rounded-xl border border-[#204E4A]/15 bg-[#FAF8F5] px-3 py-2 text-[14px]" />
          </label>
          <button type="submit" disabled={busy || code.length !== 6} className={`${button} bg-[#204E4A] text-white`}>{l('Verificar', 'Verify')}</button>
        </form>
      )}
      {editing === 'form' && (
        <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); void run(() => editDraft(draft.id, form), l('Borrador editado', 'Draft edited')) }}>
          {(['title_es', 'body_es', 'title_en', 'body_en'] as const).map((key) => (
            <label key={key} className="block text-[12px] font-bold text-[#204E4A]">{key}
              {key.startsWith('title')
                ? <input maxLength={120} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1 block w-full rounded-xl border border-[#204E4A]/15 bg-[#FAF8F5] px-3 py-2 text-[13px]" />
                : <textarea maxLength={1200} rows={3} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1 block w-full rounded-xl border border-[#204E4A]/15 bg-[#FAF8F5] px-3 py-2 text-[13px]" />}
              <small className="text-[#5C7470]">{form[key].length}/{key.startsWith('title') ? 120 : 1200}</small>
            </label>
          ))}
          <label className="block text-[12px] font-bold text-[#204E4A]">{l('Prioridad', 'Priority')}
            <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as typeof form.priority })} className="mt-1 block rounded-xl bg-[#FAF8F5] px-3 py-2 text-[13px]">
              {(['high', 'medium', 'low'] as const).map((key) => <option key={key} value={key}>{lang === 'es' ? PRIORITY[key].es : PRIORITY[key].en}</option>)}
            </select>
          </label>
          <button type="submit" disabled={busy} className={`${button} bg-[#204E4A] text-white`}>{l('Guardar cambios', 'Save changes')}</button>
        </form>
      )}

      {confirming && (
        <div role="alert" className="space-y-2 rounded-[16px] bg-[#F4F5C9] p-3 text-[13px] text-[#204E4A]">
          <p>
            {draft.priority === 'low'
              ? l('Prioridad baja: se publica solo en el feed, sin avisos.', 'Low priority: feed only, no notices.')
              : l(`Se avisará a ${draft.counts.notified_users} cuentas; ${draft.counts.push_users} con push.`, `${draft.counts.notified_users} accounts will be notified; ${draft.counts.push_users} by push.`)}
            {draft.priority !== 'low' && isQuietHours() && ' ' + l('Son horas de silencio: el push saldrá a las 8:00.', 'It is quiet hours: the push goes out at 8:00.')}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void run(() => decideDraft(draft.id, 'approve'), l('Alerta aprobada', 'Alert approved'))} className={`${button} bg-[#204E4A] text-[#E1E53F]`}>{l('Confirmar envío', 'Confirm sending')}</button>
            <button type="button" disabled={busy} onClick={() => setConfirming(false)} className={`${button} bg-white text-[#204E4A]`}>{l('Volver', 'Back')}</button>
          </div>
        </div>
      )}
      {rejecting && (
        <div className="flex flex-wrap gap-2">
          {REJECT.map((reason) => (
            <button key={reason.key} type="button" disabled={busy} onClick={() => void run(() => decideDraft(draft.id, 'reject', reason.key), l('Alerta rechazada', 'Alert rejected'))}
              className={`${button} bg-[#F9E7DE] text-[#823E2D]`}>{lang === 'es' ? reason.es : reason.en}</button>
          ))}
        </div>
      )}
      {error && <p role="alert" className="text-[12px] font-bold text-[#B5462F]">{error}</p>}
      {!confirming && !rejecting && (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => setConfirming(true)} className={`${button} bg-[#204E4A] text-[#E1E53F]`}>{l('Aprobar', 'Approve')}</button>
          <button type="button" disabled={busy} onClick={() => void run(() => decideDraft(draft.id, 'feed_only'), l('Publicada solo en el feed', 'Published to the feed only'))} className={`${button} bg-[#EEF4E7] text-[#204E4A]`}>{l('Solo feed', 'Feed only')}</button>
          <button type="button" disabled={busy} onClick={() => setEditing(editing ? null : 'code')} className={`${button} bg-[#EEF4E7] text-[#204E4A]`}>{l('Editar', 'Edit')}</button>
          <button type="button" disabled={busy} onClick={() => void run(() => sendDraftTest(draft.id), l('Prueba enviada a tu cuenta', 'Test sent to your account'))} className={`${button} bg-[#EEF4E7] text-[#204E4A]`}>{l('Enviarme una prueba', 'Send me a test')}</button>
          <button type="button" disabled={busy} onClick={() => setRejecting(true)} className={`${button} bg-[#F9E7DE] text-[#823E2D]`}>{l('Rechazar', 'Reject')}</button>
        </div>
      )}
    </article>
  )
}

const ManualDraft = ({ lang, l, onChanged }: { lang: 'es' | 'en'; l: L; onChanged: (message: string) => void }) => {
  const [kind, setKind] = useState<DraftKind>('outbreak')
  const [url, setUrl] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [date, setDate] = useState('')
  const [params, setParams] = useState<Record<string, string>>({ vaccine_type: 'leptospirosis' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const field = (key: string, label: string) => (
    <label key={key} className="block text-[12px] font-bold text-[#204E4A]">{label}
      <input value={params[key] ?? ''} maxLength={key === 'reason' ? 200 : 120} onChange={(event) => setParams({ ...params, [key]: event.target.value })}
        className="mt-1 block w-full rounded-xl border border-[#204E4A]/15 bg-[#FAF8F5] px-3 py-2 text-[13px]" />
    </label>
  )
  const submit = async () => {
    setBusy(true); setError('')
    try {
      await createManualDraft(kind, url, sourceName, date, params)
      setUrl(''); setSourceName(''); setDate('')
      onChanged(l('Borrador creado', 'Draft created'))
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) } finally { setBusy(false) }
  }
  return (
    <form className="space-y-2 rounded-[18px] bg-white p-4 shadow-[0_7px_29px_rgba(32,78,74,0.06)]" onSubmit={(event) => { event.preventDefault(); void submit() }}>
      <h4 className="text-[14px] font-black text-[#204E4A]">{l('Pegar un enlace oficial', 'Paste an official link')}</h4>
      <label className="block text-[12px] font-bold text-[#204E4A]">{l('Tipo', 'Type')}
        <select value={kind} onChange={(event) => { const next = event.target.value as DraftKind; setKind(next); setParams(next === 'outbreak' ? { vaccine_type: 'leptospirosis' } : {}) }} className="mt-1 block rounded-xl bg-[#FAF8F5] px-3 py-2 text-[13px]">
          <option value="outbreak">{l('Brote', 'Outbreak')}</option>
          <option value="recall">{l('Retiro de comida', 'Food recall')}</option>
          <option value="heat">{l('Calor', 'Heat')}</option>
          <option value="smoke">{l('Humo', 'Smoke')}</option>
        </select>
      </label>
      <label className="block text-[12px] font-bold text-[#204E4A]">{l('Enlace oficial (https)', 'Official link (https)')}
        <input type="url" required value={url} onChange={(event) => setUrl(event.target.value)} className="mt-1 block w-full rounded-xl border border-[#204E4A]/15 bg-[#FAF8F5] px-3 py-2 text-[13px]" />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-[12px] font-bold text-[#204E4A]">{l('Fuente', 'Source')}
          <input required maxLength={80} value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder={l('Condado de Los Ángeles', 'Los Angeles County')} className="mt-1 block w-full rounded-xl border border-[#204E4A]/15 bg-[#FAF8F5] px-3 py-2 text-[13px]" />
        </label>
        <label className="block text-[12px] font-bold text-[#204E4A]">{l('Fecha de la fuente', 'Source date')}
          <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 block w-full rounded-xl border border-[#204E4A]/15 bg-[#FAF8F5] px-3 py-2 text-[13px]" />
        </label>
      </div>
      {kind === 'outbreak' && (
        <label className="block text-[12px] font-bold text-[#204E4A]">{l('Vacuna relacionada', 'Related vaccine')}
          <select value={params.vaccine_type} onChange={(event) => setParams({ ...params, vaccine_type: event.target.value })} className="mt-1 block rounded-xl bg-[#FAF8F5] px-3 py-2 text-[13px]">
            {(['rabies', 'dhpp', 'leptospirosis', 'bordetella', 'canine_influenza', 'fvrcp', 'felv'] as const).map((type) => <option key={type} value={type}>{VACCINE_LABELS[type][lang]}</option>)}
          </select>
        </label>
      )}
      {kind === 'recall' && [field('brand', l('Marca', 'Brand')), field('product', l('Producto', 'Product')), field('reason', l('Motivo', 'Reason'))]}
      {(kind === 'outbreak' || kind === 'heat' || kind === 'smoke') && field('area', l('Zona', 'Area'))}
      {kind === 'heat' && field('until', l('Hasta', 'Until'))}
      {error && <p role="alert" className="text-[12px] font-bold text-[#B5462F]">{error}</p>}
      <button type="submit" disabled={busy} className={`${button} bg-[#204E4A] text-white`}>{l('Crear borrador', 'Create draft')}</button>
    </form>
  )
}

export function AdminVigilanteInbox({ lang }: { lang: 'es' | 'en' }) {
  const l: L = (es, en) => (lang === 'es' ? es : en)
  const [inbox, setInbox] = useState<VigilanteInbox | null>(null)
  const [summary, setSummary] = useState<Record<string, number> | null>(null)
  const [results, setResults] = useState<Record<string, Record<string, unknown> | null>>({})
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try {
      const [nextInbox, nextSummary] = await Promise.all([fetchVigilanteInbox(), fetchVigilanteSummary()])
      setInbox(nextInbox); setSummary(nextSummary); setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
  }, [])
  useEffect(() => {
    let live = true
    Promise.all([fetchVigilanteInbox(), fetchVigilanteSummary()])
      .then(([nextInbox, nextSummary]) => { if (live) { setInbox(nextInbox); setSummary(nextSummary) } })
      .catch((cause) => { if (live) setError(cause instanceof Error ? cause.message : String(cause)) })
    return () => { live = false }
  }, [])
  const changed = (message: string) => { if (message) setNotice(message); void load() }
  if (error && !inbox) return <p role="alert" className="rounded-[16px] bg-[#F9E7DE] px-4 py-2 text-[13px] text-[#823E2D]">{error}</p>
  if (!inbox) return <p className="text-[13px] text-[#5C7470]">{l('Cargando…', 'Loading…')}</p>
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-white p-4 shadow-[0_7px_29px_rgba(32,78,74,0.06)]">
        <div>
          <strong className="block text-[14px] text-[#204E4A]">{inbox.enabled ? l('Vigilante encendido', 'Vigilante on') : l('Vigilante apagado', 'Vigilante off')}</strong>
          <small className="text-[12px] text-[#5C7470]">{l('Apagado: no lee fuentes ni publica.', 'Off: reads no sources and publishes nothing.')}</small>
        </div>
        <button type="button" role="switch" aria-checked={inbox.enabled} onClick={() => void setVigilanteEnabled(!inbox.enabled).then(() => changed(''))}
          className={`flex h-8 w-14 items-center rounded-full p-1 ${inbox.enabled ? 'justify-end bg-[#204E4A]' : 'justify-start bg-[#CBD8CF]'}`}>
          <span className="h-6 w-6 rounded-full bg-white" /><span className="sr-only">{l('Encender o apagar', 'Turn on or off')}</span>
        </button>
      </div>
      {summary && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {([['findings', l('Hallazgos', 'Findings')], ['discarded', l('Descartados', 'Discarded')], ['approved', l('Aprobados', 'Approved')], ['rejected', l('Rechazados', 'Rejected')], ['expired', l('Caducados', 'Expired')]] as const).map(([key, label]) => (
            <div key={key} className="rounded-[16px] bg-white p-3 shadow-[0_7px_29px_rgba(32,78,74,0.06)]">
              <small className="block text-[11px] text-[#5C7470]">{label} · 30 d</small>
              <strong className="text-[20px] text-[#204E4A]">{summary[key] ?? 0}</strong>
            </div>
          ))}
        </div>
      )}
      {notice && <p role="status" className="rounded-[16px] bg-[#EEF4E7] px-4 py-2 text-[13px] font-bold text-[#204E4A]">{notice}</p>}
      <section className="space-y-3">
        <h3 className="text-[15px] font-black text-[#204E4A]">{l('Pendientes', 'Pending')} ({inbox.drafts.length})</h3>
        {inbox.drafts.length === 0 && <p className="text-[13px] text-[#5C7470]">{l('No hay alertas esperando.', 'No alerts waiting.')}</p>}
        {inbox.drafts.map((draft) => <DraftCard key={draft.id} draft={draft} lang={lang} l={l} onChanged={changed} />)}
      </section>
      <ManualDraft lang={lang} l={l} onChanged={changed} />
      <section className="space-y-2">
        <h3 className="text-[15px] font-black text-[#204E4A]">{l('Últimos 14 días', 'Last 14 days')}</h3>
        {inbox.recent.map((item) => (
          <div key={item.id} className="space-y-2 rounded-[16px] bg-white p-3 text-[13px] text-[#204E4A] shadow-[0_7px_29px_rgba(32,78,74,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{lang === 'es' ? item.title_es : item.title_en}</strong>
              <span className="text-[12px] text-[#5C7470]">{item.status}{item.notified_count != null ? ` · ${item.notified_count} ${l('avisos', 'notices')}` : ''}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(item.status === 'sent' || item.status === 'feed_only') && <>
                <button type="button" className={`${button} bg-[#EEF4E7]`} onClick={() => void fetchVigilanteResults(item.id).then((value) => setResults((all) => ({ ...all, [item.id]: value })))}>{l('Ver resultados', 'View results')}</button>
                <button type="button" className={`${button} bg-[#F9E7DE] text-[#823E2D]`} onClick={() => { if (window.confirm(l('¿Cancelar esta alerta? Se detienen los push pendientes y sale del feed.', 'Cancel this alert? Pending pushes stop and it leaves the feed.'))) void cancelDraft(item.id).then(() => changed(l('Alerta cancelada', 'Alert cancelled'))) }}>{l('Cancelar', 'Cancel')}</button>
              </>}
            </div>
            {results[item.id] && <pre className="overflow-x-auto rounded-xl bg-[#FAF8F5] p-2 text-[11px]">{JSON.stringify(results[item.id], null, 1)}</pre>}
          </div>
        ))}
      </section>
      <section className="space-y-1 rounded-[18px] bg-white p-4 shadow-[0_7px_29px_rgba(32,78,74,0.06)]">
        <h3 className="text-[14px] font-black text-[#204E4A]">{l('Fuentes', 'Sources')}</h3>
        {inbox.sources.map((source) => (
          <p key={source.key} className="text-[12px] text-[#204E4A]">
            <strong>{source.name}</strong> · {source.enabled ? l('activa', 'on') : l('apagada', 'off')}
            {source.consecutive_failures > 0 && <span className="text-[#B5462F]"> · {source.consecutive_failures} {l('fallos seguidos', 'failures in a row')}</span>}
            {source.last_success_at && <> · {l('última lectura', 'last read')} {new Date(source.last_success_at).toLocaleString(lang === 'es' ? 'es-US' : 'en-US')}</>}
          </p>
        ))}
      </section>
    </div>
  )
}

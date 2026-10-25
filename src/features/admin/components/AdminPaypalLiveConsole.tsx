import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../../services/supabaseClient'
import { useAccountRequestScope } from '../../auth/useAccountRequestScope'
import { AdminPaypalMfaStepUp } from './AdminPaypalMfaStepUp'
import { AdminPaypalLiveVaultSetup } from './AdminPaypalLiveVaultSetup'
import { AdminPaypalLiveResourceCheck } from './AdminPaypalLiveResourceCheck'
import { AdminLiveReadiness } from './AdminLiveReadiness'
import { AdminLiveFinanceSummary } from './AdminLiveFinanceSummary'
import { AdminGiftBenefits } from '../../support/components/AdminGiftBenefits'
import { AdminSupportInbox } from '../../support/components/AdminSupportInbox'

type Locale = 'es' | 'en'
type Config = {
  price_minor: number
  return_origin: string
  validation_status: string
  client_id_stored: boolean
  client_secret_stored: boolean
  webhook_id: string
  plan_id: string
  updated_at: string
}
type Snapshot = {
  source: 'public_supporter_admin_v1'
  revision: number
  checkoutsEnabled: boolean
  invitationsEnabled: boolean
  certified: boolean
  healthy: boolean
  reminderDays: number
  activePaid: number
  pending: number
  incidents: number
  heldEvents: number
  eligible: number
  firstShown: number
  reminders: number
  offerOpened: number
  dismissed: number
  conversions: number
  optedOut: number
  audit: {
    action: string
    from_revision: number
    to_revision: number
    happened_at: string
  }[]
}
type Section =
  | 'summary'
  | 'controls'
  | 'members'
  | 'payments'
  | 'invitations'
  | 'security'
const sections: [Section, string, string][] = [
  ['summary', 'Resumen', 'Overview'],
  ['controls', 'Configuración y controles', 'Settings and controls'],
  ['members', 'Suscripciones y miembros', 'Subscriptions and members'],
  ['payments', 'Pagos y conciliación', 'Payments and reconciliation'],
  ['invitations', 'Invitaciones y conversiones', 'Invitations and conversions'],
  ['security', 'Integración y seguridad', 'Integration and security'],
]
const actions = {
  pause_checkouts: 'PAUSAR NUEVAS COMPRAS',
  open_checkouts: 'AUTORIZO PUBLICAR CHECKOUT LIVE',
  pause_invitations: 'PAUSAR INVITACIONES',
  resume_invitations: 'REANUDAR INVITACIONES',
  resolve_incidents: 'CONFIRMO REVISAR INCIDENCIAS',
}
const surface = 'rounded-[24px] bg-white p-5 sm:p-6'
const button =
  'min-h-11 rounded-2xl bg-[#E1E53F] px-4 py-3 text-sm font-bold focus-visible:bg-[#D3DB72] disabled:opacity-50'
function valid(raw: unknown): raw is Snapshot {
  if (!raw || typeof raw !== 'object') return false
  const v = raw as Record<string, unknown>
  return (
    v.source === 'public_supporter_admin_v1' &&
    [
      'revision',
      'activePaid',
      'pending',
      'incidents',
      'heldEvents',
      'eligible',
      'firstShown',
      'reminders',
      'offerOpened',
      'dismissed',
      'conversions',
      'optedOut',
    ].every((k) => Number.isSafeInteger(v[k]) && Number(v[k]) >= 0) &&
    ['checkoutsEnabled', 'invitationsEnabled', 'certified', 'healthy'].every(
      (k) => typeof v[k] === 'boolean',
    ) &&
    v.reminderDays === 14 &&
    Array.isArray(v.audit)
  )
}
export function AdminPaypalLiveConsole({
  lang,
  config,
  loading,
  error,
  credentialsStored,
  credentialsChecked,
  mfaRecentlyVerified,
  onVerifyMfa,
  onStored,
  onChanged,
  history,
}: {
  lang: Locale
  config: Config | null
  loading: boolean
  error: string
  credentialsStored: boolean
  credentialsChecked: boolean
  mfaRecentlyVerified: boolean
  onVerifyMfa: () => void
  onStored: () => void
  onChanged: () => void
  history: { kind: string; recorded_at: string }[]
}) {
  const t = (es: string, en: string) => (lang === 'es' ? es : en)
  const [section, setSection] = useState<Section>('summary')
  const [data, setData] = useState<Snapshot | null>(null)
  const [failed, setFailed] = useState(false)
  const [reading, setReading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [action, setAction] = useState<keyof typeof actions | null>(null)
  const [message, setMessage] = useState('')
  const [owner, setOwner] = useState<string | null>(null)
  const [memberRevision,setMemberRevision]=useState(0)
  const readEpoch=useRef(0)
  const [member, setMember] = useState<Member | null>(null)
  const [payments, setPayments] = useState<Payments | null>(null)
  const mutation = useRef<{
    action: string
    revision: number
    id: string
  } | null>(null)
  const scope = useAccountRequestScope(() => {
    setData(null)
    setMember(null)
    setOwner(null)
    setPayments(null)
    setConfirmation('')
    setAction(null)
    setMessage('')
    setBusy(false)
    mutation.current = null
  })
  const load = useCallback(async () => {
    const epoch=++readEpoch.current
    const request = scope.capture()
    setReading(true)
    try {
      const r = await supabase
        .rpc('pazo_admin_public_supporter_status')
        .abortSignal(request.signal)
      if (!request.isCurrent()||epoch!==readEpoch.current) return
      if (r.error || !valid(r.data)) throw Error('read')
      setData(r.data)
      setFailed(false)
    } catch {
      if (request.isCurrent()&&epoch===readEpoch.current) {
        setData(null)
        setFailed(true)
      }
    } finally {
      if (request.isCurrent()&&epoch===readEpoch.current) setReading(false)
    }
  }, [scope])
  useEffect(() => {
    void load()
  }, [load, config?.updated_at])
  useEffect(() => {
    if (!owner) return
    let active=true
    const request = scope.capture()
    setMember(null)
    void supabase
      .rpc('pazo_admin_supporter_member', { p_owner: owner })
      .abortSignal(request.signal)
      .then((r) => {
        if (active&&request.isCurrent())
          setMember(
            !r.error && r.data?.source === 'supporter_member_admin_v1'
              ? r.data
              : null,
          )
      })
    return()=>{active=false}
  }, [owner, scope,memberRevision])
  useEffect(() => {
    if (section !== 'payments') return
    let active=true
    const request = scope.capture()
    setPayments(null)
    void supabase
      .rpc('pazo_admin_supporter_payments')
      .abortSignal(request.signal)
      .then((r) => {
        if (active&&request.isCurrent())
          setPayments(
            !r.error && r.data?.source === 'supporter_payments_admin_v1'
              ? r.data
              : null,
          )
      })
    return()=>{active=false}
  }, [section, scope])
  const change = async () => {
    if (
      !action ||
      !data ||
      busy ||
      confirmation !== actions[action] ||
      !mfaRecentlyVerified
    )
      return
    const request = scope.capture()
    setBusy(true)
    setMessage('')
    if (
      mutation.current?.action !== action ||
      mutation.current.revision !== data.revision
    )
      mutation.current = {
        action,
        revision: data.revision,
        id: crypto.randomUUID(),
      }
    try {
      const r = await supabase.functions.invoke('pazo-admin-public-supporter', {
        body: {
          action,
          confirmation,
          expectedRevision: data.revision,
          requestId: mutation.current.id,
        },
      })
      if (!request.isCurrent()) return
      const ok =
        !r.error && ['updated', 'already_recorded'].includes(r.data?.code)
      setMessage(
        ok
          ? t(
              'Cambio verificado en el servidor.',
              'Change verified on the server.',
            )
          : t(
              'Cambio no confirmado. Actualiza el estado antes de repetir; puede requerir revisión técnica.',
              'Change unconfirmed. Refresh status before retrying; technical review may be required.',
            ),
      )
      if (ok) {
        mutation.current = null
        setAction(null)
        setConfirmation('')
        onChanged()
      }
    } catch {
      if (request.isCurrent())
        setMessage(
          t(
            'Resultado incierto. Consulta el estado antes de repetir.',
            'Outcome uncertain. Read status before retrying.',
          ),
        )
    } finally {
      if (request.isCurrent()) {
        setBusy(false)
        void load()
      }
    }
  }
  const tile = (label: string, value: string | number) => (
    <div key={label} className="min-w-0 rounded-[21px] bg-[#F1F4E9] p-4">
      <p className="text-xs font-semibold text-[#5C7470]">{label}</p>
      <p className="mt-2 break-words text-2xl font-black">{value}</p>
    </div>
  )
  const yes = (v: boolean) =>
    v ? t('Activo', 'Active') : t('Pausado', 'Paused')
  return (
    <div
      data-pazo-live-console="public-supporter"
      className="space-y-4 pb-8 text-[#204E4A]"
    >
      <header className={surface}>
        <p className="text-xs font-bold uppercase tracking-widest text-[#647D75]">
          PayPal Live
        </p>
        <h3 className="mt-2 text-2xl font-black">
          {t('Amigo de PAZO', 'Friend of PAZO')}
        </h3>
        <p className="mt-2 text-sm">
          US$2.99{' '}
          {t('al mes · apoyo voluntario', 'per month · optional support')}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-xl bg-[#F1F4E9] px-3 py-2 text-xs font-bold">
            {t('Nuevos cobros: ', 'New checkouts: ')}
            {data ? yes(data.checkoutsEnabled) : '—'}
          </span>
          <span className="rounded-xl bg-[#F1F4E9] px-3 py-2 text-xs font-bold">
            {t('Invitaciones: ', 'Invitations: ')}
            {data ? yes(data.invitationsEnabled) : '—'}
          </span>
        </div>
      </header>
      <nav
        aria-label={t('Secciones PayPal Live', 'PayPal Live sections')}
        className="grid grid-cols-2 gap-2 lg:grid-cols-3"
      >
        {sections.map(([key, es, en]) => (
          <button
            key={key}
            type="button"
            aria-pressed={section === key}
            onClick={() => setSection(key)}
            className={
              'min-h-12 rounded-2xl px-3 py-3 text-left text-xs font-bold focus-visible:bg-[#E1E53F] ' +
              (section === key
                ? 'bg-[#204E4A] text-white'
                : 'bg-white text-[#204E4A]')
            }
          >
            {t(es, en)}
          </button>
        ))}
      </nav>
      {(error || failed) && (
        <div
          role="alert"
          className="space-y-2 rounded-2xl bg-[#FBE9DF] p-4 text-sm"
        >
          <p>
            {t(
              'No pudimos verificar el estado. No se muestran cifras estimadas ni se habilitan cambios.',
              'Status could not be verified. Estimated figures and changes are unavailable.',
            )}
          </p>
          <button type="button" className={button} onClick={() => void load()}>
            {t('Volver a consultar', 'Read again')}
          </button>
        </div>
      )}
      {(reading || loading) && (
        <p role="status">
          {t('Consultando fuentes verificadas…', 'Reading verified sources…')}
        </p>
      )}
      {section === 'summary' && (
        <>
          <section className={surface}>
            <h4 className="font-black">
              {t('Estado operativo', 'Operational status')}
            </h4>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
              {tile(
                t('Merchant conectado', 'Merchant connected'),
                credentialsChecked
                  ? credentialsStored && config?.validation_status === 'valid'
                    ? t('Verificado', 'Verified')
                    : t('Requiere revisión', 'Needs review')
                  : '—',
              )}
              {tile(
                t('Plan mensual', 'Monthly plan'),
                config?.plan_id && config.price_minor === 299 ? 'US$2.99' : '—',
              )}
              {tile(
                t('Salud financiera', 'Financial health'),
                data
                  ? data.healthy
                    ? t('Verificada', 'Verified')
                    : t('Requiere revisión', 'Needs review')
                  : '—',
              )}
              {tile(
                t('Miembros pagados activos', 'Active paid members'),
                data?.activePaid ?? '—',
              )}
              {tile(
                t('Pagos pendientes', 'Pending payments'),
                data?.pending ?? '—',
              )}
              {tile(
                t(
                  'Incidencias y eventos retenidos',
                  'Incidents and held events',
                ),
                data ? data.incidents + data.heldEvents : '—',
              )}
            </div>
          </section>
          <AdminLiveFinanceSummary lang={lang} />
        </>
      )}
      {section === 'controls' && (
        <section className={surface}>
          <h4 className="font-black">
            {t('Controles independientes', 'Independent controls')}
          </h4>
          <p className="mt-2 text-sm leading-relaxed">
            {t(
              'Pausar invitaciones solo detiene la publicidad. Pausar nuevos checkouts conserva cancelaciones, recuperación y conciliación de contratos existentes.',
              'Pausing invitations only stops promotion. Pausing new checkouts preserves cancellation, recovery and reconciliation for existing contracts.',
            )}
          </p>
          <div className="mt-4">
            <AdminPaypalMfaStepUp
              lang={lang}
              purpose="operations"
              onVerified={onVerifyMfa}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                'pause_checkouts',
                'open_checkouts',
                'pause_invitations',
                'resume_invitations',
                'resolve_incidents',
              ] as const
            ).map((key, i) => (
              <button
                key={key}
                className={button}
                type="button"
                disabled={!data || busy || !mfaRecentlyVerified}
                onClick={() => {
                  setAction(key)
                  setConfirmation('')
                  setMessage('')
                }}
              >
                {
                  [
                    t('Pausar nuevas compras', 'Pause new purchases'),
                    t('Habilitar checkout público', 'Enable public checkout'),
                    t('Pausar invitaciones', 'Pause invitations'),
                    t('Reanudar invitaciones', 'Resume invitations'),
                    t(
                      'Confirmar revisión de incidencias',
                      'Confirm incident review',
                    ),
                  ][i]
                }
              </button>
            ))}
          </div>
          {action && (
            <div className="mt-4 space-y-3 rounded-2xl bg-[#F1F4E9] p-4">
              <label className="text-sm">
                {t('Para confirmar, escribe: ', 'To confirm, type: ')}
                <strong>{actions[action]}</strong>
                <input
                  className="mt-2 min-h-12 w-full rounded-xl bg-white px-3"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={button}
                  disabled={
                    busy ||
                    confirmation !== actions[action] ||
                    !mfaRecentlyVerified
                  }
                  onClick={() => void change()}
                >
                  {t('Confirmar cambio', 'Confirm change')}
                </button>
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() => setAction(null)}
                >
                  {t('Cancelar', 'Cancel')}
                </button>
              </div>
            </div>
          )}
          <p role="status" className="mt-3 text-sm">
            {message}
          </p>
          <p className="mt-4 text-xs">
            {t(
              'Campaña: primera pantalla única; segundo y último contacto interno tras 14 días completos. La certificación de despliegue requiere el gate técnico independiente.',
              'Campaign: one initial screen; second and final in-app contact after 14 full days. Deployment certification requires its independent technical gate.',
            )}
          </p>
        </section>
      )}
      {section === 'members' && (
        <>
          <AdminGiftBenefits lang={lang} onSelect={value=>{setOwner(value);setMemberRevision(n=>n+1)}} />
          {owner &&
            (member ? (
              <MemberDetails value={member} lang={lang} />
            ) : (
              <p role="status">
                {t(
                  'Detalle de membresía no verificado. Vuelve a seleccionar la cuenta para consultar.',
                  'Membership details unverified. Select the account again to read.',
                )}
              </p>
            ))}
        </>
      )}
      {section === 'payments' && (
        <>
          <AdminLiveFinanceSummary lang={lang} />
          <section className={surface}>
            <h4 className="font-black">
              {t(
                'Eventos y ajustes financieros recientes',
                'Recent financial events and adjustments',
              )}
            </h4>
            {payments ? (
              <>
                <div className="mt-3 space-y-2">
                  {payments.events.map((e, i) => (
                    <p
                      key={i}
                      className="break-words rounded-xl bg-[#F1F4E9] p-3 text-xs"
                    >
                      {e.event_type} · {e.processing_state} ·{' '}
                      {new Date(e.received_at).toLocaleString(lang)}
                    </p>
                  ))}
                  {payments.holds.map((h, i) => (
                    <p
                      key={'h' + i}
                      className="rounded-xl bg-[#FFF0DB] p-3 text-xs"
                    >
                      {h.kind} ·{' '}
                      {h.released_at
                        ? t('Resuelto', 'Released')
                        : t('En revisión', 'Under review')}{' '}
                      · {new Date(h.verified_at).toLocaleString(lang)}
                    </p>
                  ))}
                  {!payments.events.length && !payments.holds.length && (
                    <p className="mt-2 text-sm">
                      {t(
                        'Sin movimientos recientes registrados.',
                        'No recent recorded movements.',
                      )}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm" role="status">
                {t(
                  'Detalle financiero sin verificar.',
                  'Financial details unverified.',
                )}
              </p>
            )}
          </section>
          <AdminSupportInbox lang={lang} />
        </>
      )}
      {section === 'invitations' && (
        <section className={surface}>
          <h4 className="font-black">
            {t(
              'De invitación a apoyo verificado',
              'From invitation to verified support',
            )}
          </h4>
          <p className="mt-2 text-sm">
            {t(
              'Personas únicas por cuenta y campaña. Un intento de PayPal no cuenta como venta.',
              'Unique accounts per campaign. A PayPal attempt is not a sale.',
            )}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
            {(
              [
                [t('Elegibles', 'Eligible'), 'eligible'],
                [
                  t('Primera pantalla mostrada', 'First screen shown'),
                  'firstShown',
                ],
                [
                  t('Último aviso entregado', 'Final reminder delivered'),
                  'reminders',
                ],
                [t('Oferta abierta', 'Offer opened'), 'offerOpened'],
                [t('Descartaron', 'Dismissed'), 'dismissed'],
                [
                  t(
                    'Conversiones verificadas activas',
                    'Verified active conversions',
                  ),
                  'conversions',
                ],
                [t('Desactivaron invitaciones', 'Opted out'), 'optedOut'],
              ] as const
            ).map(([label, key]) => tile(label, data?.[key] ?? '—'))}
          </div>
        </section>
      )}
      {section === 'security' && (
        <section className={surface}>
          <h4 className="font-black">
            {t('Integración y seguridad', 'Integration and security')}
          </h4>
          <p className="mt-2 break-all text-sm">
            {t('Origen de regreso: ', 'Return origin: ')}
            {config?.return_origin || '—'}
          </p>
          <p className="mt-2 text-sm">
            {t(
              'Plan y credenciales se verifican en el servidor. La interfaz no recibe claves guardadas.',
              'Plan and credentials are verified on the server. Stored secret values never reach the interface.',
            )}
          </p>
          <AdminLiveReadiness lang={lang} revision={config?.updated_at} />
          <AdminPaypalMfaStepUp
            lang={lang}
            purpose="operations"
            onVerified={onVerifyMfa}
          />
          <AdminPaypalLiveResourceCheck
            lang={lang}
            mfaRecentlyVerified={mfaRecentlyVerified}
            onVerified={async () => onChanged()}
          />
          {credentialsChecked && !credentialsStored && (
            <AdminPaypalLiveVaultSetup
              lang={lang}
              credentialsStored={credentialsStored}
              credentialsChecked={credentialsChecked}
              mfaRecentlyVerified={mfaRecentlyVerified}
              onStored={onStored}
            />
          )}
          <h5 className="mt-5 font-bold">
            {t('Auditoría operativa', 'Operational audit')}
          </h5>
          <div className="mt-2 space-y-2">
            {data?.audit.map((a, i) => (
              <p key={i} className="break-words text-xs">
                {a.action} · {a.from_revision} → {a.to_revision} ·{' '}
                {new Date(a.happened_at).toLocaleString(lang)}
              </p>
            ))}
          </div>
          <p className="mt-3 text-xs">
            {t(
              'Cambios de integración registrados: ',
              'Recorded integration changes: ',
            )}
            {history.length}
          </p>
        </section>
      )}
      <button
        type="button"
        className={button}
        disabled={reading || busy}
        onClick={() => {
          void load()
          onChanged()
        }}
      >
        {t('Actualizar estado', 'Refresh status')}
      </button>
    </div>
  )
}
type Member = {
  paid: boolean
  subscriptions: {
    intent_id: string
    state: string
    provider_status: string | null
    created_at: string
    closed_at: string | null
    cancel_state: string | null
  }[]
  periods: {
    service_start: string
    service_end: string
    amount_minor: number
    currency: string
    held: boolean
  }[]
  feedback: string | null
}
type Payments = {
  events: {
    event_type: string
    processing_state: string
    received_at: string
  }[]
  holds: { kind: string; verified_at: string; released_at: string | null }[]
}
function MemberDetails({ value, lang }: { value: Member; lang: Locale }) {
  const t = (es: string, en: string) => (lang === 'es' ? es : en)
  return (
    <section className={surface}>
      <h4 className="font-black">
        {t('Suscripción y períodos pagados', 'Subscription and paid periods')}
      </h4>
      <p className="mt-2 text-sm">
        {value.paid
          ? t(
              'Cobertura pagada verificada activa',
              'Verified paid coverage active',
            )
          : t(
              'Sin cobertura pagada activa verificada',
              'No verified active paid coverage',
            )}
      </p>
      <div className="mt-3 space-y-2">
        {value.subscriptions.map((i) => (
          <div
            key={i.intent_id}
            className="rounded-2xl bg-[#F1F4E9] p-3 text-xs"
          >
            <p>
              {i.state} · {i.provider_status || '—'} · {i.cancel_state || '—'}
            </p>
            <p>{new Date(i.created_at).toLocaleString(lang)}</p>
          </div>
        ))}
        {value.periods.map((p, i) => (
          <p key={i} className="rounded-xl bg-[#F1F4E9] p-3 text-xs">
            {new Date(p.service_start).toLocaleDateString(lang)} →{' '}
            {new Date(p.service_end).toLocaleDateString(lang)} ·{' '}
            {(p.amount_minor / 100).toFixed(2)} {p.currency} ·{' '}
            {p.held ? t('En revisión', 'Held') : t('Verificado', 'Verified')}
          </p>
        ))}
      </div>
    </section>
  )
}

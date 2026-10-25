import { useRef, useState } from 'react'
import { supabase } from '../../../services/supabaseClient'
import { usePublicSupporterStatus } from './usePublicSupporterStatus'
import {useAccountRequestScope} from '../../auth/useAccountRequestScope'
export function SupporterBenefitReview({ lang }: { lang: 'es' | 'en' }) {
  const { value, refresh } = usePublicSupporterStatus()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [component, setComponent] = useState('badge')
  const pending = useRef(false)
  const scope=useAccountRequestScope(()=>{pending.current=false;setBusy(false);setError(false);setComponent('badge')})
  const t = (es: string, en: string) => (lang === 'es' ? es : en)
  const act = async (feedback: string) => {
    if (pending.current) return
    pending.current = true
    const request=scope.capture()
    setBusy(true)
    setError(false)
    try {
      const r = await supabase.rpc('pazo_supporter_feedback', {
        p_feedback: feedback,
        p_component: feedback === 'issue' ? component : null,
      }).abortSignal(request.signal)
      if(!request.isCurrent())return
      setError(!!r.error)
      refresh()
    } catch {
      if(request.isCurrent())setError(true)
    } finally {
      if(request.isCurrent()){pending.current = false;setBusy(false)}
    }
  }
  if (!value?.paid || value.feedback) return null
  return (
    <section
      className="space-y-3 rounded-3xl bg-white p-5"
      aria-label={t(
        'Comprobación voluntaria de beneficios',
        'Optional benefit check',
      )}
    >
      <h3 className="font-extrabold">
        {t('¿Todo funciona bien?', 'Is everything working well?')}
      </h3>
      <p className="text-sm leading-relaxed">
        {t(
          'Revisa tu insignia, fondos y acceso. Tu respuesta es voluntaria y no cambia tus derechos.',
          'Check your badge, backgrounds and access. Your response is optional and never changes your rights.',
        )}
      </p>
      <label className="block text-sm">
        {t('Beneficio que quieres revisar', 'Benefit to review')}
        <select
          className="mt-2 min-h-11 w-full rounded-xl bg-[#F0F4E6] px-3"
          value={component}
          onChange={(e) => setComponent(e.target.value)}
        >
          <option value="badge">{t('Insignia', 'Badge')}</option>
          <option value="profile_posts">
            {t('Perfil y publicaciones', 'Profile and posts')}
          </option>
          <option value="access">{t('Acceso', 'Access')}</option>
          <option value="management">{t('Membresía', 'Membership')}</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        {(['ok', 'issue', 'skipped'] as const).map((key, i) => (
          <button
            key={key}
            type="button"
            disabled={busy}
            onClick={() => void act(key)}
            className="min-h-11 rounded-2xl bg-[#ECF1E2] px-4 py-3 text-sm font-bold focus-visible:bg-[#E1E53F] disabled:opacity-50"
          >
            {
              [
                t('Todo funciona correctamente', 'Everything works correctly'),
                t('Encontré un problema', 'I found a problem'),
                t('Omitir', 'Skip'),
              ][i]
            }
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm">
          {t(
            'No pudimos confirmar la respuesta. Actualiza el estado antes de repetir.',
            'Response could not be confirmed. Refresh status before retrying.',
          )}
        </p>
      )}
    </section>
  )
}

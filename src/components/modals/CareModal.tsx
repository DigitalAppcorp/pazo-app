import { useMemo, useState } from 'react'
import type {
  CareCategory,
  CareCompletion,
  CareItem,
  CareItemInput,
  CareRecurrence,
  CareReminderDays,
} from '../../types/pazo'

interface CareModalProps {
  isOpen: boolean
  onClose: () => void
  petName: string
  careItems: CareItem[]
  careHistory: CareCompletion[]
  isLoading: boolean
  error: string
  isHistoryLoading: boolean
  hasMoreHistory: boolean
  onLoadMoreHistory: () => void
  onRetry: () => void
  onCreateCare: (input: CareItemInput) => Promise<void>
  onUpdateCare: (careItemId: string, input: CareItemInput) => Promise<void>
  onArchiveCare: (careItemId: string) => Promise<void>
  onCompleteCare: (item: CareItem) => Promise<void>
  onUndoCompletion: (completion: CareCompletion) => Promise<void>
  lang: 'es' | 'en'
}

type AgendaTab = 'proximos' | 'historial'

const CATEGORY_LABELS: Record<CareCategory, { es: string; en: string }> = {
  veterinarian: { es: 'Veterinaria', en: 'Veterinary' },
  vaccine: { es: 'Vacuna', en: 'Vaccine' },
  medication: { es: 'Medicamento', en: 'Medication' },
  hygiene: { es: 'Higiene', en: 'Hygiene' },
  feeding: { es: 'Alimentación', en: 'Feeding' },
  other: { es: 'Otro', en: 'Other' },
}

const RECURRENCE_LABELS: Record<CareRecurrence, { es: string; en: string }> = {
  none: { es: 'No repetir', en: 'Do not repeat' },
  daily: { es: 'Diario', en: 'Daily' },
  weekly: { es: 'Semanal', en: 'Weekly' },
  monthly: { es: 'Mensual', en: 'Monthly' },
  yearly: { es: 'Anual', en: 'Yearly' },
}

const REMINDER_OPTIONS: Array<{
  value: CareReminderDays
  es: string
  en: string
}> = [
  { value: null, es: 'Sin recordatorio', en: 'No reminder' },
  { value: 0, es: 'Mismo día', en: 'Same day' },
  { value: 1, es: '1 día antes', en: '1 day before' },
  { value: 2, es: '2 días antes', en: '2 days before' },
  { value: 7, es: '1 semana antes', en: '1 week before' },
]

const pad = (value: number) => String(value).padStart(2, '0')

const browserDate = () => {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const getZonedNow = (timezone: string) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date())

    const values = Object.fromEntries(
      parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])
    )

    return {
      date: `${values.year}-${values.month}-${values.day}`,
      time: `${values.hour}:${values.minute}`,
    }
  } catch {
    const now = new Date()
    return {
      date: browserDate(),
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    }
  }
}

const timingStatus = (item: CareItem): 'upcoming' | 'today' | 'overdue' => {
  const now = getZonedNow(item.timezone)

  if (item.dueDate < now.date) return 'overdue'
  if (item.dueDate > now.date) return 'upcoming'
  if (item.dueTime && item.dueTime < now.time) return 'overdue'
  return 'today'
}

const formatDate = (date: string, lang: 'es' | 'en') => {
  const value = new Date(`${date}T12:00:00`)
  return value.toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const emptyForm = (): CareItemInput => ({
  title: '',
  category: 'veterinarian',
  dueDate: browserDate(),
  dueTime: null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  recurrence: 'none',
  reminderDaysBefore: 1,
  notes: null,
})

export const CareModal = ({
  isOpen,
  onClose,
  petName,
  careItems,
  careHistory,
  isLoading,
  error,
  isHistoryLoading,
  hasMoreHistory,
  onLoadMoreHistory,
  onRetry,
  onCreateCare,
  onUpdateCare,
  onArchiveCare,
  onCompleteCare,
  onUndoCompletion,
  lang,
}: CareModalProps) => {
  const [activeTab, setActiveTab] = useState<AgendaTab>('proximos')
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CareItemInput>(emptyForm)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [formError, setFormError] = useState('')

  const latestCompletionIds = useMemo(() => {
    const seenCareItems = new Set<string>()
    const latest = new Set<string>()

    for (const completion of careHistory) {
      if (seenCareItems.has(completion.careItemId)) continue
      seenCareItems.add(completion.careItemId)
      latest.add(completion.id)
    }

    return latest
  }, [careHistory])

  if (!isOpen) return null

  const resetForm = () => {
    setForm(emptyForm())
    setEditingId(null)
    setIsEditing(false)
    setFormError('')
  }

  const startCreate = () => {
    setForm(emptyForm())
    setEditingId(null)
    setIsEditing(true)
    setFormError('')
  }

  const startEdit = (item: CareItem) => {
    setForm({
      title: item.title,
      category: item.category,
      dueDate: item.dueDate,
      dueTime: item.dueTime || null,
      timezone: item.timezone,
      recurrence: item.recurrence,
      reminderDaysBefore: item.reminderDaysBefore,
      notes: item.notes || null,
    })
    setEditingId(item.id)
    setIsEditing(true)
    setFormError('')
  }

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title.trim() || !form.dueDate || busyKey) return

    setBusyKey(editingId ? `edit:${editingId}` : 'create')
    setFormError('')

    try {
      if (editingId) {
        await onUpdateCare(editingId, form)
      } else {
        await onCreateCare(form)
      }
      resetForm()
    } catch (err: any) {
      console.error('Error saving care item:', err)
      setFormError(
        lang === 'es'
          ? 'No se pudo guardar el cuidado. Inténtalo de nuevo.'
          : 'Could not save this care item. Please try again.'
      )
    } finally {
      setBusyKey(null)
    }
  }

  const runAction = async (key: string, action: () => Promise<void>) => {
    if (busyKey) return
    setBusyKey(key)

    try {
      await action()
    } catch (err) {
      console.error('Care action failed:', err)
      alert(
        lang === 'es'
          ? 'No se pudo completar la acción. Inténtalo de nuevo.'
          : 'Could not complete the action. Please try again.'
      )
    } finally {
      setBusyKey(null)
    }
  }

  const statusLabel = (item: CareItem) => {
    const status = timingStatus(item)

    if (status === 'overdue') return lang === 'es' ? 'Vencido' : 'Overdue'
    if (status === 'today') return lang === 'es' ? 'Hoy' : 'Today'
    return lang === 'es' ? 'Próximo' : 'Upcoming'
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-slide-up">
      <div className="w-full max-w-sm bg-white rounded-[2.8rem] soft-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-2">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] bg-[#E1E53F] px-2.5 py-0.5 rounded-full inline-block">
              {lang === 'es' ? 'Agenda privada' : 'Private agenda'}
            </span>
            <h3 className="text-xl font-black text-[#204E4A] mt-1">
              {lang === 'es' ? `Cuidados de ${petName}` : `${petName}'s care`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#5C7470] hover:text-[#204E4A] flex items-center justify-center font-bold text-sm cursor-pointer"
            aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
          >
            ✕
          </button>
        </div>

        {!isEditing && (
          <div className="flex gap-1.5 p-1 bg-[#FAF8F5] rounded-full">
            <button
              onClick={() => setActiveTab('proximos')}
              className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'proximos'
                  ? 'bg-[#204E4A] text-[#E1E53F]'
                  : 'text-[#5C7470] hover:text-[#204E4A]'
              }`}
            >
              {lang === 'es' ? 'Próximos' : 'Upcoming'}
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'historial'
                  ? 'bg-[#204E4A] text-[#E1E53F]'
                  : 'text-[#5C7470] hover:text-[#204E4A]'
              }`}
            >
              {lang === 'es' ? 'Historial' : 'History'}
            </button>
          </div>
        )}

        {isEditing ? (
          <form onSubmit={submitForm} className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-extrabold text-sm text-[#204E4A]">
                {editingId
                  ? (lang === 'es' ? 'Editar cuidado' : 'Edit care')
                  : (lang === 'es' ? 'Nuevo cuidado' : 'New care')}
              </span>
              <button
                type="button"
                onClick={resetForm}
                className="text-[#5C7470] font-bold text-xs cursor-pointer"
              >
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-[#5C7470] mb-1">
                {lang === 'es' ? 'Título' : 'Title'}
              </label>
              <input
                required
                minLength={2}
                maxLength={120}
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="w-full bg-[#FAF8F5] border border-[#204E4A]/15 rounded-xl px-3 py-2.5 text-xs"
                placeholder={lang === 'es' ? 'Ej: Vacuna anual' : 'Example: Annual vaccine'}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#5C7470] mb-1">
                  {lang === 'es' ? 'Categoría' : 'Category'}
                </label>
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      category: event.target.value as CareCategory,
                    }))
                  }
                  className="w-full bg-[#FAF8F5] border border-[#204E4A]/15 rounded-xl px-2 py-2.5 text-xs"
                >
                  {(Object.keys(CATEGORY_LABELS) as CareCategory[]).map((category) => (
                    <option key={category} value={category}>
                      {CATEGORY_LABELS[category][lang]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#5C7470] mb-1">
                  {lang === 'es' ? 'Fecha' : 'Date'}
                </label>
                <input
                  required
                  type="date"
                  value={form.dueDate}
                  onClick={(event) => event.currentTarget.showPicker?.()}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, dueDate: event.target.value }))
                  }
                  className="w-full bg-[#FAF8F5] border border-[#204E4A]/15 rounded-xl px-2 py-2.5 text-xs cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#5C7470] mb-1">
                  {lang === 'es' ? 'Hora opcional' : 'Optional time'}
                </label>
                <input
                  type="time"
                  value={form.dueTime || ''}
                  onClick={(event) => event.currentTarget.showPicker?.()}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      dueTime: event.target.value || null,
                    }))
                  }
                  className="w-full bg-[#FAF8F5] border border-[#204E4A]/15 rounded-xl px-2 py-2.5 text-xs cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#5C7470] mb-1">
                  {lang === 'es' ? 'Repetir' : 'Repeat'}
                </label>
                <select
                  value={form.recurrence}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      recurrence: event.target.value as CareRecurrence,
                    }))
                  }
                  className="w-full bg-[#FAF8F5] border border-[#204E4A]/15 rounded-xl px-2 py-2.5 text-xs"
                >
                  {(Object.keys(RECURRENCE_LABELS) as CareRecurrence[]).map((recurrence) => (
                    <option key={recurrence} value={recurrence}>
                      {RECURRENCE_LABELS[recurrence][lang]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-[#5C7470] mb-1">
                {lang === 'es' ? 'Recordarme' : 'Remind me'}
              </label>
              <select
                value={form.reminderDaysBefore === null ? 'none' : String(form.reminderDaysBefore)}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    reminderDaysBefore:
                      event.target.value === 'none'
                        ? null
                        : (Number(event.target.value) as Exclude<CareReminderDays, null>),
                  }))
                }
                className="w-full bg-[#FAF8F5] border border-[#204E4A]/15 rounded-xl px-3 py-2.5 text-xs"
              >
                {REMINDER_OPTIONS.map((option) => (
                  <option
                    key={option.value === null ? 'none' : option.value}
                    value={option.value === null ? 'none' : option.value}
                  >
                    {option[lang]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-[#5C7470] mb-1">
                {lang === 'es' ? 'Notas opcionales' : 'Optional notes'}
              </label>
              <textarea
                maxLength={1000}
                rows={3}
                value={form.notes || ''}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, notes: event.target.value || null }))
                }
                className="w-full bg-[#FAF8F5] border border-[#204E4A]/15 rounded-xl px-3 py-2.5 text-xs"
              />
            </div>

            {formError && (
              <p className="text-[11px] text-[#EC7357] font-bold">{formError}</p>
            )}

            <button
              type="submit"
              disabled={Boolean(busyKey) || !form.title.trim() || !form.dueDate}
              className="w-full bg-[#204E4A] text-[#E1E53F] font-bold py-3 rounded-full text-xs disabled:opacity-50 cursor-pointer"
            >
              {busyKey
                ? (lang === 'es' ? 'Guardando…' : 'Saving…')
                : (lang === 'es' ? 'Guardar cuidado' : 'Save care')}
            </button>
          </form>
        ) : isLoading ? (
          <div className="py-12 text-center text-xs font-bold text-[#5C7470]">
            {lang === 'es' ? 'Cargando agenda…' : 'Loading agenda…'}
          </div>
        ) : error ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm font-bold text-[#EC7357]">
              {lang === 'es'
                ? 'No pudimos cargar la agenda en este momento.'
                : 'We could not load the agenda right now.'}
            </p>
            <p className="text-[11px] text-[#5C7470]">
              {lang === 'es'
                ? 'Puedes volver a intentarlo sin perder nada.'
                : 'You can try again without losing anything.'}
            </p>
            <button
              onClick={onRetry}
              className="px-4 py-2 rounded-full bg-[#204E4A] text-[#E1E53F] text-xs font-bold cursor-pointer"
            >
              {lang === 'es' ? 'Reintentar' : 'Try again'}
            </button>
          </div>
        ) : activeTab === 'proximos' ? (
          <div className="space-y-3">
            {careItems.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="font-extrabold text-sm text-[#204E4A]">
                  {lang === 'es' ? 'No hay cuidados pendientes.' : 'No pending care yet.'}
                </p>
                <p className="text-[11px] text-[#5C7470]">
                  {lang === 'es'
                    ? 'Añade el próximo cuidado de tu mascota para tenerlo presente.'
                    : 'Add your pet’s next care item to keep it on your radar.'}
                </p>
              </div>
            ) : (
              careItems.map((item) => {
                const status = timingStatus(item)
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border text-xs ${
                      status === 'overdue'
                        ? 'bg-[#FFF2EE] border-[#EC7357]/25'
                        : status === 'today'
                          ? 'bg-[#E1E53F]/10 border-[#E1E53F]/30'
                          : 'bg-[#FAF8F5] border-[#204E4A]/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-[#204E4A]">{item.title}</span>
                          <span className="text-[9px] uppercase tracking-wide font-bold text-[#5C7470]">
                            {statusLabel(item)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5C7470] mt-1">
                          {CATEGORY_LABELS[item.category][lang]} · {formatDate(item.dueDate, lang)}
                          {item.dueTime ? ` · ${item.dueTime}` : ''}
                        </p>
                        {item.recurrence !== 'none' && (
                          <p className="text-[10px] text-[#5C7470] mt-1">
                            {lang === 'es' ? 'Repite: ' : 'Repeats: '}
                            {RECURRENCE_LABELS[item.recurrence][lang]}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-[10px] text-[#5C7470]/85 mt-1 line-clamp-2">
                            {item.notes}
                          </p>
                        )}
                      </div>

                      <button
                        disabled={Boolean(busyKey)}
                        onClick={() =>
                          runAction(`complete:${item.id}`, () => onCompleteCare(item))
                        }
                        className="text-[11px] font-bold text-[#204E4A] bg-white border border-[#204E4A]/15 px-3 py-1.5 rounded-full disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {lang === 'es' ? 'Hecho' : 'Done'}
                      </button>
                    </div>

                    <div className="flex gap-3 mt-3 pt-2 border-t border-[#204E4A]/8">
                      <button
                        onClick={() => startEdit(item)}
                        disabled={Boolean(busyKey)}
                        className="text-[10px] font-bold text-[#5C7470] hover:text-[#204E4A] cursor-pointer"
                      >
                        {lang === 'es' ? 'Editar' : 'Edit'}
                      </button>
                      <button
                        onClick={() => {
                          const confirmed = window.confirm(
                            lang === 'es'
                              ? '¿Eliminar este cuidado de la agenda? El historial anterior se conservará.'
                              : 'Remove this care item? Previous history will be kept.'
                          )
                          if (confirmed) {
                            void runAction(`archive:${item.id}`, () => onArchiveCare(item.id))
                          }
                        }}
                        disabled={Boolean(busyKey)}
                        className="text-[10px] font-bold text-[#EC7357] cursor-pointer"
                      >
                        {lang === 'es' ? 'Eliminar' : 'Remove'}
                      </button>
                    </div>
                  </div>
                )
              })
            )}

            <button
              onClick={startCreate}
              className="w-full p-3 bg-white border-2 border-dashed border-[#204E4A]/20 rounded-2xl text-xs font-bold text-[#204E4A] cursor-pointer"
            >
              + {lang === 'es' ? 'Añadir nuevo cuidado' : 'Add care item'}
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {careHistory.length === 0 && !isHistoryLoading ? (
              <p className="text-xs text-[#5C7470] text-center py-8">
                {lang === 'es' ? 'Todavía no hay historial.' : 'No care history yet.'}
              </p>
            ) : (
              careHistory.map((completion) => (
                <div
                  key={completion.id}
                  className="p-3.5 bg-[#FAF8F5] border border-[#204E4A]/10 rounded-2xl text-xs"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <span className="font-extrabold text-[#204E4A] block">
                        {completion.title}
                      </span>
                      <span className="text-[10px] text-[#5C7470] block mt-0.5">
                        {CATEGORY_LABELS[completion.category][lang]} ·{' '}
                        {formatDate(completion.scheduledDate, lang)}
                      </span>
                      <span className="text-[10px] text-[#5C7470]/75 block mt-1">
                        {lang === 'es' ? 'Completado: ' : 'Completed: '}
                        {new Date(completion.completedAt).toLocaleString(
                          lang === 'es' ? 'es-US' : 'en-US'
                        )}
                      </span>
                    </div>

                    {latestCompletionIds.has(completion.id) && (
                      <button
                        disabled={Boolean(busyKey)}
                        onClick={() =>
                          void runAction(
                            `undo:${completion.id}`,
                            () => onUndoCompletion(completion)
                          )
                        }
                        className="text-[10px] font-bold text-[#5C7470] hover:text-[#204E4A] cursor-pointer self-start"
                      >
                        {lang === 'es' ? 'Deshacer' : 'Undo'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}

            {isHistoryLoading && (
              <div className="py-3 text-center text-[11px] text-[#5C7470]">
                {lang === 'es' ? 'Cargando historial…' : 'Loading history…'}
              </div>
            )}

            {hasMoreHistory && !isHistoryLoading && (
              <button
                onClick={onLoadMoreHistory}
                className="w-full py-2.5 text-xs font-bold text-[#5C7470] hover:text-[#204E4A] cursor-pointer"
              >
                {lang === 'es' ? 'Cargar más' : 'Load more'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

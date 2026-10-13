import type { Pet } from '../../../types/pazo'
import { IconAlert, IconPin, IconPaw } from '../../../components/icons/PazoIcons'

interface Props {
  pet: Pet
  lastSeen: string
  dateTime: string
  details: string
  isSaving: boolean
  lang: 'es' | 'en'
  onEdit: () => void
  onPublish: () => void
}

// Step 2 is a confirmation, not another form. Only show already supplied information.
export const LostAlertReview = ({pet,lastSeen,dateTime,details,isSaving,lang,onEdit,onPublish}: Props) => {
  const es = lang === 'es'
  const parsed = new Date(dateTime)
  const date = Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleString(es?'es-US':'en-US',{dateStyle:'medium',timeStyle:'short'})
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onEdit} disabled={isSaving}
          className="min-h-10 rounded-full px-2 text-xs font-bold text-[#204E4A] focus-visible:bg-[#E1E53F]/35 disabled:opacity-50">
          ← {es?'Modificar datos':'Edit information'}
        </button>
        <span aria-hidden="true" className="rounded-full bg-[#E1E53F]/35 p-2 text-[#204E4A]"><IconAlert size={17}/></span>
      </div>
      <header className="text-center">
        <h3 className="text-lg font-black text-[#204E4A]">{es?'Así se verá tu alerta':'Your alert preview'}</h3>
        <p className="mt-1 text-xs text-[#5C7470]">{es?'Revisa antes de publicarla.':'Review before publishing.'}</p>
      </header>
      <div className="rounded-[1.8rem] bg-white p-3 shadow-[0_6px_22px_rgba(32,78,74,0.08)]">
        <div className="flex items-start gap-3">
          {pet.photoUrl
            ? <img src={pet.photoUrl} alt={pet.name} className="h-28 w-24 shrink-0 rounded-[1.25rem] object-cover"/>
            : <span aria-hidden="true" className="flex h-28 w-24 shrink-0 items-center justify-center rounded-[1.25rem] bg-[#EAF1E5] text-[#204E4A]"><IconPaw size={30}/></span>}
          <div className="min-w-0 flex-1 pt-1">
            <p className="break-words text-base font-black leading-snug text-[#204E4A]">
              {es?'Se busca a ':'Searching for '}<span className="text-[#EC7357]">{pet.name}.</span>
            </p>
            <p className="mt-3 flex items-start gap-1.5 break-words text-[11px] font-bold text-[#204E4A]">
              <IconPin size={14} className="mt-0.5 shrink-0 text-[#EC7357]"/>{lastSeen}
            </p>
            {date && <p className="mt-1 text-[10px] text-[#5C7470]">{date}</p>}
          </div>
        </div>
        {details.trim() && <p className="mt-3 whitespace-pre-wrap break-words rounded-2xl bg-[#FFF2EE] p-3 text-xs text-[#204E4A]">{details}</p>}
      </div>
      <p className="text-center text-[11px] leading-relaxed text-[#5C7470]">
        {es?'Aparecerá en el pasaporte público de tu mascota.':"It will appear on your pet's public passport."}
      </p>
      <button type="button" onClick={onPublish} disabled={isSaving}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#EC7357] px-4 text-sm font-black text-white transition-colors hover:bg-[#D65F48] focus-visible:bg-[#D65F48] disabled:opacity-50">
        <IconAlert size={17}/>{isSaving?(es?'Publicando…':'Publishing…'):(es?'Publicar alerta':'Publish alert')}
      </button>
    </section>
  )
}

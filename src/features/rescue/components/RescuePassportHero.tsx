import type { PublicRescueProfile } from '../../../services/rescueService'
import { IconAlert, IconCalendar, IconPin, IconPaw } from '../../../components/icons/PazoIcons'

interface Props { profile: PublicRescueProfile }

/** Decorative neighborhood only. It is NOT a real map or a last-seen position. */
const NeighborhoodBackdrop = () => (
  <svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice"
    aria-hidden="true" focusable="false" className="absolute inset-0 h-full w-full">
    <rect width="400" height="150" fill="#E8F2E6" />
    <path d="M0 17c47 23 64 16 88 5s43-10 84 15 82 22 114-11S363 10 400 2v65c-43-15-75-2-91 12s-50 13-89-1-64-8-88 15S58 111 0 80z" fill="#D7E9D4" />
    <path d="M303 0c-23 30-18 44-1 61s29 35 15 89h83V0z" fill="#D1E9E5" />
    <path d="M-24 127 108 91 208 103 289 55 432 78" fill="none" stroke="#FFFCF6" strokeWidth="23" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M195-20 170 43l31 60-35 67" fill="none" stroke="#FFFCF6" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M348-12 326 46l23 63 64 25" fill="none" stroke="#FFFCF6" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m106-5 20 41-14 61" fill="none" stroke="#FFFCF6" strokeWidth="9" strokeLinecap="round" />
    <path d="M243 19c9 11 25 7 35-3M247 32c10 10 23 8 35-2M23 19l44 8M22 34l49 7" stroke="#B8DDB8" strokeWidth="5" strokeLinecap="round" />
    <circle cx="289" cy="111" r="18" fill="#C0E0C3" />
    <circle cx="376" cy="21" r="13" fill="#B5D9CE" />
    <path d="M0 149c30-34 54-17 80-36 23-16 37-4 50 16v20" fill="#BDDDBD" opacity=".55" />
  </svg>
)

export const RescuePassportHero = ({ profile }: Props) => {
  const seenAt = profile.alertLastSeenAt ? new Date(profile.alertLastSeenAt) : null
  const lastSeenDate = seenAt && !Number.isNaN(seenAt.getTime())
    ? seenAt.toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })
    : null

  return (
    <>
      <section aria-label="Perfil público de la mascota" className="overflow-hidden rounded-[2rem] bg-[#FFFCF6] shadow-[0_5px_24px_rgba(32,78,74,0.055)]">
        <div className="relative h-[148px] overflow-hidden bg-[#E8F2E6]">
          <NeighborhoodBackdrop />
          <div className="absolute bottom-2 left-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.55rem] bg-[#E1E53F]/30 shadow-[0_8px_24px_rgba(32,78,74,0.15)]">
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt={profile.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-4xl font-black text-[#204E4A]" aria-label={profile.name}>
                {profile.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span aria-hidden="true" className="absolute bottom-3 right-4 rounded-full bg-[#FFFCF6]/90 p-3 text-[#204E4A] shadow-sm">
            <IconPaw size={21}/>
          </span>
        </div>
        <div className="space-y-1 px-4 pb-4 pt-3">
          <h2 className="break-words text-[26px] font-black leading-tight text-[#204E4A]">
            Soy <span className="text-[#EC7357]">{profile.name}.</span>
          </h2>
          <p className="text-xs text-[#5C7470]">
            {profile.species}{profile.breed ? ' • ' + profile.breed : ''}
          </p>
          {profile.bio && <p className="pt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-[#5C7470]">{profile.bio}</p>}
        </div>
      </section>
      {profile.isLost && (
        <section aria-labelledby="pazo-lost-status" className="space-y-3 rounded-[1.9rem] bg-[#FFF0EB] p-4">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EC7357] text-white">
              <IconAlert size={18} />
            </span>
            <h3 id="pazo-lost-status" className="text-sm font-black text-[#204E4A]">Mascota reportada como perdida</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {profile.lastSeenLocation && (
              <div className="min-w-0 rounded-[1.1rem] bg-white/65 p-3">
                <IconPin className="text-[#EC7357]" size={18}/>
                <p className="mt-2 text-[10px] font-bold text-[#5C7470]">Última ubicación</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-xs font-extrabold text-[#204E4A]">{profile.lastSeenLocation}</p>
              </div>
            )}
            {lastSeenDate && (
              <div className="min-w-0 rounded-[1.1rem] bg-white/65 p-3">
                <IconCalendar className="text-[#EC7357]" size={18}/>
                <p className="mt-2 text-[10px] font-bold text-[#5C7470]">Última vez vista</p>
                <p className="mt-1 break-words text-xs font-extrabold text-[#204E4A]">{lastSeenDate}</p>
              </div>
            )}
          </div>
          {profile.alertDetails && (
            <div className="flex items-start gap-2.5 rounded-[1.1rem] bg-white/65 p-3">
              <IconPaw className="mt-0.5 shrink-0 text-[#EC7357]" size={18}/>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-[#5C7470]">Descripción de la búsqueda</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-[#204E4A]">{profile.alertDetails}</p>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  )
}

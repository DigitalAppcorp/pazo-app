import { useState } from 'react'
import type { Pet } from '../../types/pazo'

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  pet: Pet
  lang: 'es' | 'en'
}

export const AlertModal = ({ isOpen, onClose, pet, lang }: AlertModalProps) => {
  const [step, setStep] = useState<'create' | 'review' | 'active'>('create')
  const [lastSeen, setLastSeen] = useState('Parque Silver Lake, cerca de las canchas')
  const [dateTime, setDateTime] = useState('Hoy a las 14:15 PM')
  const [details, setDetails] = useState('Lleva collar verde con placa QR. Es tímida pero responde a su nombre.')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-slide-up">
      <div className="w-full max-w-sm bg-white rounded-[2.8rem] border border-[#EC7357]/30 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {step === 'create' ? (
          /* ================= S01: CREAR ALERTA DE BÚSQUEDA ================= */
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#204E4A]/10">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-white bg-[#EC7357] px-2.5 py-0.5 rounded-full inline-block">
                  {lang === 'es' ? 'Emergencia Comunitaria' : 'Community Alert'}
                </span>
                <h3 className="text-xl font-black text-[#204E4A] mt-1">
                  {lang === 'es' ? `Busquemos a ${pet.name}.` : `Let's find ${pet.name}.`}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#5C7470] hover:text-[#204E4A] flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#204E4A]/10 flex items-center gap-3">
                <img
                  src={pet.photoUrl}
                  alt={pet.name}
                  className="w-10 h-10 rounded-xl object-cover"
                />
                <div>
                  <span className="font-extrabold text-[#204E4A] block">{pet.name}</span>
                  <span className="text-[11px] text-[#5C7470]">
                    {pet.species} • {pet.breed} ({pet.weight})
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#5C7470] mb-1">
                  {lang === 'es' ? 'Última vez vista' : 'Last seen location'}
                </label>
                <input
                  type="text"
                  value={lastSeen}
                  onChange={(e) => setLastSeen(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#204E4A]/15 rounded-xl px-3 py-2 text-xs text-[#204E4A]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#5C7470] mb-1">
                  {lang === 'es' ? 'Fecha y hora aproximada' : 'Approximate date & time'}
                </label>
                <input
                  type="text"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#204E4A]/15 rounded-xl px-3 py-2 text-xs text-[#204E4A]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#5C7470] mb-1">
                  {lang === 'es' ? 'Señas particulares o descripción' : 'Particular signs / Description'}
                </label>
                <textarea
                  rows={2}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#204E4A]/15 rounded-xl p-2.5 text-xs text-[#204E4A]"
                />
              </div>

              <div className="p-3 bg-white rounded-2xl border border-[#204E4A]/10 text-[11px] text-[#5C7470]">
                🔒 {lang === 'es'
                  ? 'Radio protegido de 5 km en Los Ángeles. Tu número de teléfono y domicilio permanecen privados.'
                  : 'Protected 5 km radius in Los Angeles. Your phone and home address remain secret.'}
              </div>

              <button
                onClick={() => setStep('review')}
                className="w-full bg-[#EC7357] hover:bg-[#d85e43] text-white font-extrabold py-3.5 rounded-full text-xs shadow-md transition-all cursor-pointer"
              >
                {lang === 'es' ? 'Revisar Vista Pública de la Alerta →' : 'Review Public Alert View →'}
              </button>
            </div>
          </div>
        ) : step === 'review' ? (
          /* ================= S02: REVISAR VISTA PÚBLICA ================= */
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#204E4A]/10">
              <button
                onClick={() => setStep('create')}
                className="text-xs font-bold text-[#5C7470] hover:text-[#204E4A] cursor-pointer"
              >
                ← {lang === 'es' ? 'Modificar datos' : 'Edit info'}
              </button>
              <span className="text-[10px] font-bold text-[#EC7357] bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                Vista previa
              </span>
            </div>

            <div className="text-center space-y-3">
              <div className="w-24 h-24 rounded-[2rem] overflow-hidden mx-auto border-3 border-[#EC7357] shadow-lg">
                <img
                  src={pet.photoUrl}
                  alt={pet.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h3 className="text-2xl font-black text-[#EC7357]">
                  {lang === 'es' ? `Se busca a ${pet.name}.` : `Searching for ${pet.name}.`}
                </h3>
                <p className="text-xs text-[#5C7470] mt-1 font-medium">
                  {lastSeen} • {dateTime}
                </p>
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#204E4A]/10 text-xs text-left">
                <span className="font-bold text-[#204E4A] block mb-1">Descripción:</span>
                <span className="text-[#5C7470]">{details}</span>
              </div>

              <button
                onClick={() => setStep('active')}
                className="w-full bg-[#EC7357] hover:bg-[#d85e43] text-white font-extrabold py-3.5 rounded-full text-xs shadow-lg transition-all cursor-pointer"
              >
                {lang === 'es' ? 'Publicar Alerta Comunitaria' : 'Broadcast Community Alert'}
              </button>
            </div>
          </div>
        ) : (
          /* ================= S03: ALERTA ACTIVA ================= */
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mx-auto animate-pulse">
              🚨
            </div>

            <div>
              <h3 className="text-xl font-black text-[#204E4A]">
                {lang === 'es' ? 'Alerta activa en la red' : 'Alert Active'}
              </h3>
              <p className="text-xs text-[#5C7470] mt-1">
                {lang === 'es'
                  ? `Tutores y comunidades cercanas a Silver Lake han sido notificados sobre ${pet.name}.`
                  : `Pet owners and communities near Silver Lake were notified about ${pet.name}.`}
              </p>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 text-left">
              <span className="font-bold block">Canal seguro activo:</span>
              <span>Cualquier avistamiento llegará de forma privada a tu bandeja de notificaciones.</span>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  alert(lang === 'es' ? '¡Qué alegría! Alerta retirada y archivada con éxito.' : 'Glad she is safe! Alert archived.')
                  onClose()
                }}
                className="w-full bg-[#204E4A] hover:bg-[#183d3a] text-[#E1E53F] font-extrabold py-3.5 rounded-full text-xs shadow-md transition-all cursor-pointer"
              >
                {lang === 'es' ? '¡Ya está en casa! (Finalizar)' : 'She is safe home! (Finish)'}
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 text-xs font-bold text-[#5C7470] hover:text-[#204E4A] cursor-pointer"
              >
                Cerrar ventana
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import type { Pet } from '../../types/pazo'
import { IconShield, IconClose, IconCheck } from '../icons/PazoIcons'

interface PassportModalProps {
  isOpen: boolean
  onClose: () => void
  pet: Pet
  lang: 'es' | 'en'
}

export const PassportModal = ({ isOpen, onClose, pet, lang }: PassportModalProps) => {
  const [viewMode, setViewMode] = useState<'passport' | 'publicPreview' | 'reportSighting'>('passport')
  const [sightingText, setSightingText] = useState('')
  const [sightingSent, setSightingSent] = useState(false)

  if (!isOpen) return null

  const handleSendSighting = (e: React.FormEvent) => {
    e.preventDefault()
    setSightingSent(true)
    setTimeout(() => {
      setSightingSent(false)
      setViewMode('passport')
      onClose()
    }, 2500)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-slide-up">
      <div className="w-full max-w-sm bg-white rounded-[2.8rem] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {viewMode === 'passport' ? (
          /* ================= Q01: PASAPORTE DE LA MASCOTA ================= */
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] bg-[#E1E53F] px-2.5 py-0.5 rounded-full inline-block">
                  {lang === 'es' ? 'Identidad Segura' : 'Secure ID'}
                </span>
                <h3 className="text-xl font-black text-[#204E4A] mt-1">
                  {lang === 'es' ? `Pasaporte de ${pet.name}` : `${pet.name}'s Passport`}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#5C7470] hover:text-[#204E4A] flex items-center justify-center font-bold text-sm cursor-pointer shadow-xs"
              >
                <IconClose size={15} />
              </button>
            </div>

            {/* Tarjeta del Código QR Estilizado */}
            <div className="p-6 bg-[#FAF8F5] rounded-[2.2rem] text-center space-y-3 shadow-xs">
              <div className="w-40 h-40 bg-white rounded-2xl mx-auto p-3 shadow-md flex items-center justify-center">
                {/* Código QR vectorial de alta fidelidad */}
                <svg className="w-full h-full text-[#204E4A]" viewBox="0 0 100 100" fill="currentColor">
                  {/* Esquinas */}
                  <rect x="5" y="5" width="26" height="26" rx="4" fill="#204E4A" />
                  <rect x="10" y="10" width="16" height="16" rx="2" fill="white" />
                  <rect x="14" y="14" width="8" height="8" rx="1" fill="#204E4A" />

                  <rect x="69" y="5" width="26" height="26" rx="4" fill="#204E4A" />
                  <rect x="74" y="10" width="16" height="16" rx="2" fill="white" />
                  <rect x="78" y="14" width="8" height="8" rx="1" fill="#204E4A" />

                  <rect x="5" y="69" width="26" height="26" rx="4" fill="#204E4A" />
                  <rect x="10" y="74" width="16" height="16" rx="2" fill="white" />
                  <rect x="14" y="78" width="8" height="8" rx="1" fill="#204E4A" />

                  {/* Patrón de datos */}
                  <rect x="36" y="8" width="8" height="8" rx="2" fill="#204E4A" />
                  <rect x="48" y="8" width="14" height="6" rx="1" fill="#204E4A" />
                  <rect x="36" y="22" width="6" height="12" rx="1" fill="#204E4A" />
                  <rect x="46" y="20" width="16" height="8" rx="1" fill="#E1E53F" />

                  <rect x="8" y="38" width="8" height="18" rx="1" fill="#204E4A" />
                  <rect x="22" y="44" width="14" height="8" rx="1" fill="#204E4A" />
                  <rect x="42" y="36" width="16" height="16" rx="3" fill="#204E4A" />
                  <circle cx="50" cy="44" r="4" fill="#E1E53F" />

                  <rect x="68" y="38" width="8" height="10" rx="1" fill="#204E4A" />
                  <rect x="82" y="42" width="10" height="14" rx="1" fill="#204E4A" />

                  <rect x="38" y="68" width="12" height="12" rx="2" fill="#204E4A" />
                  <rect x="56" y="68" width="10" height="8" rx="1" fill="#204E4A" />
                  <rect x="72" y="72" width="20" height="6" rx="1" fill="#204E4A" />
                  <rect x="48" y="84" width="24" height="8" rx="2" fill="#204E4A" />
                  <rect x="78" y="82" width="14" height="12" rx="2" fill="#204E4A" />
                </svg>
              </div>

              <div>
                <span className="font-extrabold text-xs text-[#204E4A] tracking-wider block">
                  {pet.qrId}
                </span>
                <span className="text-[10px] text-[#5C7470] block">
                  {lang === 'es' ? 'Imprime este QR para su collar o placa' : 'Print this QR for collar or tag'}
                </span>
              </div>
            </div>

            {/* Enlaces de configuración y vista previa */}
            <div className="space-y-2 text-xs">
              <button
                onClick={() => setViewMode('publicPreview')}
                className="w-full p-3.5 bg-[#FAF8F5] hover:bg-neutral-100 rounded-2xl font-bold text-[#204E4A] flex justify-between items-center transition-colors cursor-pointer shadow-xs"
              >
                <span>{lang === 'es' ? 'Vista previa pública (Simular escaneo)' : 'Public preview (Simulate scan)'}</span>
                <span className="text-[#E1E53F] bg-[#204E4A] px-2 py-0.5 rounded-full text-[10px]">
                  Ver →
                </span>
              </button>

              <div className="p-3 bg-white rounded-2xl text-[#5C7470] text-[11px] leading-relaxed shadow-xs flex items-center gap-2">
                <IconShield size={16} className="text-[#204E4A] shrink-0" />
                <span>
                  {lang === 'es'
                    ? 'Tus números de teléfono y dirección están protegidos. Quien escanee el collar solo podrá enviar un aviso a través de Pazo.'
                    : 'Your phone number and home address remain hidden. Anyone who scans only contacts you via Pazo.'}
                </span>
              </div>
            </div>

            <button
              onClick={() => alert(lang === 'es' ? '¡Código QR copiado al portapapeles listo para imprimir!' : 'QR code saved!')}
              className="w-full bg-[#E1E53F] hover:bg-[#d8dc35] text-[#204E4A] font-extrabold py-3.5 rounded-full text-xs shadow-md transition-all cursor-pointer"
            >
              {lang === 'es' ? 'Descargar o Compartir QR' : 'Download or Share QR'}
            </button>
          </div>
        ) : viewMode === 'publicPreview' ? (
          /* ================= Q02: VISTA PÚBLICA DEL RESCATE ================= */
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2">
              <button
                onClick={() => setViewMode('passport')}
                className="text-xs font-bold text-[#5C7470] hover:text-[#204E4A] cursor-pointer"
              >
                ← {lang === 'es' ? 'Volver al pasaporte' : 'Back to Passport'}
              </button>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shadow-xs">
                Ficha Pública
              </span>
            </div>

            <div className="text-center space-y-3 pt-2">
              <div className="w-24 h-24 rounded-[2rem] overflow-hidden mx-auto shadow-md">
                <img
                  src={pet.photoUrl}
                  alt={pet.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h3 className="text-2xl font-black text-[#204E4A]">
                  {lang === 'es' ? `Soy ${pet.name}.` : `I am ${pet.name}.`}
                </h3>
                <p className="text-xs text-[#5C7470] mt-1 px-4 leading-relaxed font-medium">
                  {lang === 'es'
                    ? '¿Estoy lejos de casa? Por favor avisa a la persona que me cuida.'
                    : 'Am I far from home? Please notify the person taking care of me.'}
                </p>
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-2xl text-xs text-left space-y-1 shadow-xs">
                <div className="flex justify-between">
                  <span className="text-[#5C7470]">{lang === 'es' ? 'Especie / Raza:' : 'Species / Breed:'}</span>
                  <span className="font-bold text-[#204E4A]">{pet.species} • {pet.breed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5C7470]">{lang === 'es' ? 'Zona habitual:' : 'Home area:'}</span>
                  <span className="font-bold text-[#204E4A]">Los Ángeles, CA</span>
                </div>
              </div>

              <button
                onClick={() => setViewMode('reportSighting')}
                className="w-full bg-[#204E4A] hover:bg-[#183d3a] text-[#E1E53F] font-extrabold py-4 rounded-full text-sm shadow-lg transition-all cursor-pointer"
              >
                {lang === 'es' ? 'Avisar al Propietario' : 'Notify Owner'}
              </button>

              <p className="text-[10px] text-[#5C7470]">
                {lang === 'es'
                  ? 'No necesitas instalar una cuenta para avisar.'
                  : 'No account needed to send an alert.'}
              </p>
            </div>
          </div>
        ) : (
          /* ================= Q03: ENVIAR REPORTE DE AVISTAMIENTO ================= */
          <form onSubmit={handleSendSighting} className="space-y-4">
            <div className="flex justify-between items-center pb-2">
              <button
                type="button"
                onClick={() => setViewMode('publicPreview')}
                className="text-xs font-bold text-[#5C7470] hover:text-[#204E4A] cursor-pointer"
              >
                ← {lang === 'es' ? 'Volver' : 'Back'}
              </button>
              <h3 className="font-extrabold text-sm text-[#204E4A]">
                {lang === 'es' ? `Avisar sobre ${pet.name}` : `Report about ${pet.name}`}
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#204E4A] mb-1">
                  {lang === 'es' ? '¿Qué viste o dónde está?' : 'What did you see / Where is she?'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={sightingText}
                  onChange={(e) => setSightingText(e.target.value)}
                  placeholder={
                    lang === 'es'
                      ? 'Ej: La acabo de ver cerca del parque Silver Lake con collar puesto...'
                      : 'E.g: Just saw her near Silver Lake park wearing a blue tag...'
                  }
                  className="w-full bg-[#FAF8F5] rounded-2xl p-3 text-xs text-[#204E4A] placeholder-[#5C7470]/60 shadow-xs focus:outline-none"
                />
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-2xl shadow-xs">
                <span className="block text-[10px] uppercase font-bold text-[#5C7470]">
                  {lang === 'es' ? 'Ubicación actual estimada' : 'Estimated Location'}
                </span>
                <span className="font-bold text-[#204E4A]">Silver Lake, Los Ángeles</span>
              </div>

              {sightingSent ? (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl font-bold text-center text-xs animate-slide-up flex items-center justify-center gap-1.5 shadow-xs">
                  <IconCheck size={16} />
                  <span>{lang === 'es' ? '¡Aviso protegido enviado al dueño!' : 'Protected alert sent to the owner!'}</span>
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full bg-[#204E4A] hover:bg-[#183d3a] text-white font-extrabold py-3.5 rounded-full text-xs shadow-md transition-all cursor-pointer"
                >
                  {lang === 'es' ? 'Enviar Aviso al Propietario' : 'Send Alert to Owner'}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
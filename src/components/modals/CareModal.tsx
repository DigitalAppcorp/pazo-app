import { useState } from 'react'
import type { CareItem, PrivateDoc } from '../../types/pazo'

interface CareModalProps {
  isOpen: boolean
  onClose: () => void
  petName: string
  careItems: CareItem[]
  onToggleCare: (id: string) => void
  onAddCare: (item: Omit<CareItem, 'id'>) => void
  docs: PrivateDoc[]
  lang: 'es' | 'en'
}

export const CareModal = ({
  isOpen,
  onClose,
  petName,
  careItems,
  onToggleCare,
  onAddCare,
  docs,
  lang,
}: CareModalProps) => {
  const [activeTab, setActiveTab] = useState<'proximos' | 'historial' | 'documentos'>('proximos')
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<CareItem['type']>('veterinaria')
  const [newDate, setNewDate] = useState('2026-11-05')
  const [newTime] = useState('11:00 AM')

  if (!isOpen) return null

  const handleCreateCare = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    onAddCare({
      title: newTitle.trim(),
      type: newType,
      date: newDate,
      time: newTime,
      completed: false,
      repeat: 'Único',
      reminder: '1 día antes',
    })
    setNewTitle('')
    setIsAddingNew(false)
  }

  const pendingItems = careItems.filter((c) => !c.completed)
  const completedItems = careItems.filter((c) => c.completed)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-slide-up">
      <div className="w-full max-w-sm bg-white rounded-[2.8rem] soft-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center pb-2">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] bg-[#E1E53F] px-2.5 py-0.5 rounded-full inline-block">
              {lang === 'es' ? 'Agenda Privada' : 'Private Agenda'}
            </span>
            <h3 className="text-xl font-black text-[#204E4A] mt-1">
              {lang === 'es' ? `Cuidados de ${petName}` : `${petName}'s Care`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#5C7470] hover:text-[#204E4A] flex items-center justify-center font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tabs: Próximos / Historial / Documentos */}
        <div className="flex gap-1.5 p-1 bg-[#FAF8F5] rounded-full">
          <button
            onClick={() => {
              setActiveTab('proximos')
              setIsAddingNew(false)
            }}
            className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${activeTab === 'proximos' && !isAddingNew
                ? 'bg-[#204E4A] text-[#E1E53F]'
                : 'text-[#5C7470] hover:text-[#204E4A]'
              }`}
          >
            {lang === 'es' ? 'Próximos' : 'Upcoming'}
          </button>
          <button
            onClick={() => {
              setActiveTab('historial')
              setIsAddingNew(false)
            }}
            className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${activeTab === 'historial'
                ? 'bg-[#204E4A] text-[#E1E53F]'
                : 'text-[#5C7470] hover:text-[#204E4A]'
              }`}
          >
            {lang === 'es' ? 'Historial' : 'History'}
          </button>
          <button
            onClick={() => {
              setActiveTab('documentos')
              setIsAddingNew(false)
            }}
            className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${activeTab === 'documentos'
                ? 'bg-[#204E4A] text-[#E1E53F]'
                : 'text-[#5C7470] hover:text-[#204E4A]'
              }`}
          >
            {lang === 'es' ? 'Docs' : 'Docs'}
          </button>
        </div>

        {/* Contenido según pestaña */}
        {isAddingNew ? (
          /* Formulario para añadir recordatorio (C02 en PDF) */
          <form onSubmit={handleCreateCare} className="space-y-3 text-xs pt-1">
            <div className="flex justify-between items-center">
              <span className="font-extrabold text-sm text-[#204E4A]">
                {lang === 'es' ? 'Nuevo recordatorio' : 'New Reminder'}
              </span>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="text-[#5C7470] font-bold text-xs"
              >
                Cancelar
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-[#5C7470] mb-1">
                {lang === 'es' ? 'Título o motivo' : 'Title / Reason'}
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ej: Desparasitación interna o corte de uñas"
                className="w-full bg-[#FAF8F5] border border-[#204E4A]/15 rounded-xl px-3 py-2 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#5C7470] mb-1">
                  {lang === 'es' ? 'Tipo' : 'Type'}
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as CareItem['type'])}
                  className="w-full bg-[#FAF8F5] border border-[#204E4A]/15 rounded-xl px-2 py-2 text-xs"
                >
                  <option value="veterinaria">Veterinaria</option>
                  <option value="vacuna">Vacuna</option>
                  <option value="medicamento">Medicamento</option>
                  <option value="higiene">Higiene</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#5C7470] mb-1">
                  {lang === 'es' ? 'Fecha' : 'Date'}
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-[#FAF8F5] rounded-xl px-2 py-2 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#204E4A] hover:bg-[#183d3a] text-[#E1E53F] font-bold py-3 rounded-full text-xs transition-colors cursor-pointer mt-2"
            >
              {lang === 'es' ? 'Guardar Recordatorio' : 'Save Reminder'}
            </button>
          </form>
        ) : activeTab === 'proximos' ? (
          /* Lista de Cuidados Pendientes (C01 en PDF) */
          <div className="space-y-3">
            {pendingItems.length === 0 ? (
              <p className="text-xs text-[#5C7470] text-center py-6">
                {lang === 'es' ? 'No hay cuidados pendientes.' : 'No upcoming tasks.'}
              </p>
            ) : (
              pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-[#FAF8F5] border border-[#204E4A]/10 rounded-2xl flex justify-between items-center text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">
                        {item.type === 'veterinaria' ? '🩺' : item.type === 'vacuna' ? '💉' : '💊'}
                      </span>
                      <span className="font-extrabold text-[#204E4A]">{item.title}</span>
                    </div>
                    <span className="block text-[11px] text-[#5C7470] mt-0.5">
                      {item.date} • {item.time}
                    </span>
                    {item.notes && (
                      <span className="block text-[10px] text-[#5C7470]/80 mt-1 italic">
                        {item.notes}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onToggleCare(item.id)}
                    className="text-[11px] font-bold text-[#204E4A] bg-white border border-[#204E4A]/20 hover:bg-[#E1E53F] px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-sm shrink-0"
                  >
                    {lang === 'es' ? 'Hecho ✓' : 'Done ✓'}
                  </button>
                </div>
              ))
            )}

            <button
              onClick={() => setIsAddingNew(true)}
              className="w-full p-3 bg-white hover:bg-neutral-50 border-2 border-dashed border-[#204E4A]/20 rounded-2xl text-xs font-bold text-[#204E4A] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>+</span>
              <span>{lang === 'es' ? 'Añadir un nuevo cuidado' : 'Add new care task'}</span>
            </button>
          </div>
        ) : activeTab === 'historial' ? (
          /* Historial de Cuidados Realizados */
          <div className="space-y-2">
            {completedItems.length === 0 ? (
              <p className="text-xs text-[#5C7470] text-center py-6">
                {lang === 'es' ? 'No hay registros completados aún.' : 'No completed records yet.'}
              </p>
            ) : (
              completedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-white border border-[#204E4A]/10 rounded-2xl flex justify-between items-center text-xs opacity-75"
                >
                  <div className="line-through text-[#5C7470]">
                    <span className="font-bold mr-1">{item.title}</span>
                    <span className="text-[10px]">({item.date})</span>
                  </div>
                  <button
                    onClick={() => onToggleCare(item.id)}
                    className="text-[10px] font-semibold text-[#5C7470] hover:text-[#204E4A]"
                  >
                    Deshacer
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Documentos Privados (C03 en PDF) */
          <div className="space-y-3">
            <p className="text-xs text-[#5C7470]">
              {lang === 'es'
                ? 'Organiza los archivos de Luna y genera enlaces de acceso temporal para el veterinario.'
                : 'Manage Luna’s docs and generate temporary links for pet sitters or vets.'}
            </p>

            <div className="space-y-2">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 bg-[#FAF8F5] border border-[#204E4A]/10 rounded-2xl flex justify-between items-center text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📄</span>
                    <div>
                      <span className="font-bold text-[#204E4A] block truncate max-w-[180px]">
                        {doc.title}
                      </span>
                      <span className="text-[10px] text-[#5C7470]">
                        {doc.fileSize} • {doc.dateUploaded}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      alert(
                        lang === 'es'
                          ? 'Enlace temporal seguro generado (válido por 48 horas)'
                          : 'Temporary 48h share link copied!'
                      )
                    }
                    className="text-[10px] font-bold text-[#204E4A] bg-white border border-[#204E4A]/20 px-2.5 py-1 rounded-full hover:bg-[#E1E53F] cursor-pointer"
                  >
                    Compartir 🔗
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => alert(lang === 'es' ? 'Selecciona un archivo PDF o imagen' : 'Select PDF/Image')}
              className="w-full py-3 bg-[#204E4A] text-white hover:bg-[#183d3a] rounded-full text-xs font-bold transition-colors cursor-pointer"
            >
              + {lang === 'es' ? 'Añadir Documento' : 'Upload Document'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

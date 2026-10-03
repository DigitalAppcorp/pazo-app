import { useState } from 'react'
import type { Conversation } from '../../types/pazo'

interface MessagesModalProps {
  isOpen: boolean
  onClose: () => void
  conversations: Conversation[]
  onSendMessage: (convId: string, text: string) => void
  lang: 'es' | 'en'
}

export const MessagesModal = ({
  isOpen,
  onClose,
  conversations,
  onSendMessage,
  lang,
}: MessagesModalProps) => {
  const [activeTab, setActiveTab] = useState<'conversaciones' | 'solicitudes'>('conversaciones')
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')

  if (!isOpen) return null

  const activeConv = conversations.find((c) => c.id === activeConvId)
  const filteredList = conversations.filter((c) =>
    activeTab === 'conversaciones' ? !c.isRequest : c.isRequest
  )

  const handleSend = () => {
    if (!inputText.trim() || !activeConvId) return
    onSendMessage(activeConvId, inputText.trim())
    setInputText('')
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-slide-up">
      <div className="w-full max-w-sm bg-white rounded-[2.8rem] soft-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto flex flex-col">
        {!activeConv ? (
          /* ================= M01: BANDEJA DE MENSAJES ================= */
          <>
            <div className="flex justify-between items-center pb-2">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] bg-[#E1E53F] px-2.5 py-0.5 rounded-full inline-block">
                  {lang === 'es' ? 'Mensajería 1 a 1' : 'Direct Messages'}
                </span>
                <h3 className="text-xl font-black text-[#204E4A] mt-1">
                  {lang === 'es' ? 'Hablemos.' : 'Conversations.'}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#5C7470] hover:text-[#204E4A] flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Selector: Conversaciones / Solicitudes */}
            <div className="flex gap-2 p-1 bg-[#FAF8F5] rounded-full">
              <button
                onClick={() => setActiveTab('conversaciones')}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'conversaciones'
                    ? 'bg-[#204E4A] text-[#E1E53F]'
                    : 'text-[#5C7470] hover:text-[#204E4A]'
                }`}
              >
                {lang === 'es' ? 'Conversaciones' : 'Active Chats'}
              </button>
              <button
                onClick={() => setActiveTab('solicitudes')}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'solicitudes'
                    ? 'bg-[#204E4A] text-[#E1E53F]'
                    : 'text-[#5C7470] hover:text-[#204E4A]'
                }`}
              >
                {lang === 'es' ? 'Solicitudes' : 'Requests'}
              </button>
            </div>

            {/* Lista de chats */}
            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {filteredList.length === 0 ? (
                <p className="text-xs text-[#5C7470] text-center py-8">
                  {lang === 'es' ? 'No hay mensajes en esta bandeja.' : 'No messages here.'}
                </p>
              ) : (
                filteredList.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className="p-3.5 bg-[#FAF8F5] hover:bg-neutral-100 rounded-2xl soft-card flex items-center gap-3 cursor-pointer transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                      <img
                        src={conv.petAvatar}
                        alt={conv.petName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-xs text-[#204E4A]">
                          {conv.personName} • {conv.petName}
                        </span>
                        <span className="text-[10px] text-[#5C7470]">{conv.timeAgo}</span>
                      </div>
                      <p className="text-[11px] text-[#5C7470] truncate mt-0.5">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <p className="text-[10px] text-center text-[#5C7470] pt-1">
              🛡️ {lang === 'es'
                ? 'Los contactos nuevos llegan a Solicitudes para que decidas con permiso.'
                : 'New contacts arrive in Requests so you decide who can message you.'}
            </p>
          </>
        ) : (
          /* ================= M03: VISTA DE CHAT ================= */
          <div className="space-y-3 flex-1 flex flex-col">
            <div className="flex justify-between items-center pb-2">
              <button
                onClick={() => setActiveConvId(null)}
                className="text-xs font-bold text-[#5C7470] hover:text-[#204E4A] cursor-pointer"
              >
                ← {lang === 'es' ? 'Bandeja' : 'Inbox'}
              </button>
              <div className="text-center">
                <span className="font-extrabold text-xs text-[#204E4A] block">
                  {activeConv.personName} • {activeConv.petName}
                </span>
                <span className="text-[10px] text-[#5C7470]">{activeConv.petSpecies}</span>
              </div>
              <button onClick={onClose} className="text-sm font-bold text-[#5C7470] cursor-pointer">
                ✕
              </button>
            </div>

            {/* Mensajes del chat */}
            <div className="flex-1 space-y-2.5 overflow-y-auto max-h-64 p-2 bg-[#FAF8F5] rounded-2xl">
              {activeConv.messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.sender === 'me' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                      m.sender === 'me'
                        ? 'bg-[#204E4A] text-white rounded-br-none'
                        : 'bg-white text-[#204E4A] rounded-bl-none shadow-sm'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[9px] text-[#5C7470]/70 mt-0.5 px-1">{m.timestamp}</span>
                </div>
              ))}
            </div>

            {/* Input de respuesta */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend()
                }}
                placeholder={lang === 'es' ? 'Escribir mensaje...' : 'Type message...'}
                className="flex-1 bg-[#FAF8F5] rounded-full px-3.5 py-2 text-xs text-[#204E4A] focus:outline-none placeholder:text-[#204E4A]/60"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="bg-[#204E4A] text-[#E1E53F] px-4 py-2 rounded-full font-bold text-xs disabled:opacity-40 cursor-pointer"
              >
                Enviar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

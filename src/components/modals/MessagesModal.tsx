import { PazoMotifIcon } from '../icons/PazoMotifIcons'
import { useState } from 'react'
import type { Conversation } from '../../types/pazo'

interface MessagesModalProps {
  isOpen: boolean
  onClose: () => void
  conversations: Conversation[]
  isDemo: boolean
  onSendMessage: (convId: string, text: string) => void
  lang: 'es' | 'en'
}

/**
 * PAZO's own lifestyle/community artwork for the dormant messaging module.
 * Decorative only: no made-up users, avatars, messages, or feature claims.
 */
const MessagingCommunityIllustration = () => (
  <svg
    viewBox="0 0 360 225"
    className="block h-auto w-full"
    aria-hidden="true"
    focusable="false"
    fill="none"
  >
    {/* Warm ground and abstract conversation backdrop. */}
    <ellipse cx="180" cy="202" rx="138" ry="11" fill="#C8DACE" opacity="0.55" />
    <path d="M40 159c-12-44 15-95 59-108 24-7 60 1 85 9 37-15 96-7 121 27 22 29 20 81-8 100-30 21-227 25-257-28Z" fill="#E3EBCF"/>
    <path d="M42 44c0-16 13-28 29-28h49c16 0 29 12 29 28v11c0 15-13 28-29 28H78L62 94l4-13C52 77 42 66 42 53V44Z" fill="#FFFFFF" opacity="0.94"/>
    <circle cx="75" cy="49" r="5.5" fill="#204E4A" opacity="0.88"/>
    <circle cx="96" cy="49" r="5.5" fill="#204E4A" opacity="0.88"/>
    <circle cx="117" cy="49" r="5.5" fill="#E1E53F"/>
    <path d="M234 32c0-14 12-26 26-26h51c14 0 26 12 26 26v21c0 14-12 26-26 26h-20l-4 13-12-13h-15c-14 0-26-12-26-26V32Z" fill="#204E4A"/>
    <path d="M286 27c3 0 6 2.4 6 5.3 0 3.2-2.1 4.9-6 8.3-3.9-3.4-6-5.1-6-8.3 0-2.9 2.9-5.3 6-5.3z" fill="#E1E53F" opacity="0.95"/>
    <path d="M269 42h34v5h-34zM277 53h18v5h-18z" fill="#FFFFFF" opacity="0.88"/>

    {/* Dog's ears and round head. */}
    <path d="M79 103c-23 1-32 27-25 56 5 22 21 25 34 14l15-39Z" fill="#95664F"/>
    <path d="M165 104c18 2 28 28 21 55-5 19-18 24-31 13l-13-37Z" fill="#9C6B53"/>
    <ellipse cx="122" cy="139" rx="62" ry="62" fill="#D9A67F"/>
    <ellipse cx="97" cy="143" rx="10" ry="13" fill="#F1C79E"/>
    <ellipse cx="148" cy="143" rx="10" ry="13" fill="#F1C79E"/>
    <ellipse cx="103" cy="132" rx="5" ry="6.5" fill="#204E4A"/>
    <ellipse cx="145" cy="132" rx="5" ry="6.5" fill="#204E4A"/>
    <path d="M110 144c10-7 21-7 31 0 7 6 12 20 2 29-11 10-29 10-41 1-10-8-1-24 8-30Z" fill="#F8DDC1"/>
    <path d="M117 146c3-5 13-5 16 0 1 3-4 8-8 9-5-1-10-6-8-9Z" fill="#204E4A"/>
    <path d="M125 156v8" stroke="#204E4A" strokeWidth="2.4" strokeLinecap="round"/>
    <path d="M125 164c-3 5-8 6-12 2m12-2c3 5 8 6 12 2" stroke="#204E4A" strokeWidth="2.3" strokeLinecap="round"/>
    <ellipse cx="92" cy="154" rx="9" ry="5" fill="#EC7357" opacity="0.22"/>
    <ellipse cx="152" cy="154" rx="9" ry="5" fill="#EC7357" opacity="0.22"/>

    {/* Cat ears, head and expressive features. */}
    <path d="M200 104 195 64c-1-5 3-9 8-6l31 23c10-3 22-3 32 0l31-23c5-3 9 1 8 6l-5 41Z" fill="#91B6A6"/>
    <path d="m208 76 5 25 18-13zM292 76l-5 25-18-13z" fill="#F2C7B5"/>
    <ellipse cx="250" cy="139" rx="57" ry="59" fill="#B6D3C1"/>
    <ellipse cx="228" cy="137" rx="5" ry="6" fill="#204E4A"/>
    <ellipse cx="272" cy="137" rx="5" ry="6" fill="#204E4A"/>
    <ellipse cx="250" cy="160" rx="29" ry="20" fill="#EAF0DE"/>
    <path d="M245 150c3-3 7-3 10 0 1 2-3 5-5 6-3-1-6-4-5-6Z" fill="#EC7357"/>
    <path d="M250 157v6m0 0-7 4m7-4 7 4M211 156l25 3m-26 6 24-1m78-8-25 3m26 6-24-1" stroke="#204E4A" strokeWidth="2" strokeLinecap="round" opacity=".72"/>
    <ellipse cx="213" cy="150" rx="8" ry="5" fill="#EC7357" opacity="0.21"/>
    <ellipse cx="288" cy="150" rx="8" ry="5" fill="#EC7357" opacity="0.21"/>

    {/* PAZO lime paw connecting both pets. */}
    <ellipse cx="187" cy="195" rx="28" ry="24" fill="#E1E53F"/>
    <ellipse cx="172" cy="184" rx="3.8" ry="5.3" fill="#204E4A" transform="rotate(-20 172 184)"/>
    <ellipse cx="183" cy="180" rx="3.8" ry="5.3" fill="#204E4A"/>
    <ellipse cx="194" cy="182" rx="3.8" ry="5.3" fill="#204E4A" transform="rotate(18 194 182)"/>
    <ellipse cx="204" cy="189" rx="3.5" ry="4.8" fill="#204E4A" transform="rotate(27 204 189)"/>
    <path d="M187 190c-8 0-14 8-14 14 0 4 4 5 7 4l7-2 7 2c4 1 8 0 8-4 0-6-7-14-15-14Z" fill="#204E4A"/>
    <path d="m180 27 4 10-4 10-4-10zM185 32l8 5-8 5-8-5z" fill="#EC7357" opacity="0.65"/>
  </svg>
)

export const MessagesModal = ({
  isOpen,
  onClose,
  conversations,
  isDemo,
  onSendMessage,
  lang,
}: MessagesModalProps) => {
  const [activeTab, setActiveTab] = useState<'conversaciones' | 'solicitudes'>('conversaciones')
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')

  if (!isOpen) return null

  // Real accounts: purely informational future-module surface. No sending,
  // fake inbox, synthetic conversations, interest tracking or new data capture.
  if (!isDemo) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#102D29]/60 px-4 py-5 backdrop-blur-[7px]">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="messages-not-ready-title"
          aria-describedby="messages-not-ready-description"
          className="relative isolate my-auto max-h-[calc(100dvh-2.5rem)] w-full max-w-[430px] overflow-y-auto rounded-[38px] bg-[#FFFCF5] px-5 pb-6 pt-6 shadow-[0_28px_70px_rgba(5,34,30,0.28)] sm:px-8 sm:pb-8"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
            className="absolute right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#204E4A] shadow-[0_3px_12px_rgba(32,78,74,0.07)] transition-colors hover:bg-[#E1E53F]/30 focus-visible:bg-[#E1E53F]/40"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
              <path d="M6 6 18 18M18 6 6 18" />
            </svg>
          </button>

          <div aria-hidden="true" className="mt-5 overflow-hidden rounded-[30px] bg-gradient-to-br from-[#F0F3DE] via-[#F7F3E8] to-[#E7F1E9]">
            <MessagingCommunityIllustration />
          </div>

          <div className="mt-5 flex items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#EC7357]" />
            <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#5C7470]">
              {lang === 'es' ? 'En desarrollo' : 'In development'}
            </p>
          </div>

          <h2 id="messages-not-ready-title" className="mt-2 max-w-[16ch] text-[clamp(27px,7vw,34px)] font-black leading-[1.14] tracking-tight text-[#204E4A]">
            {lang === 'es' ? 'Cada amistad comienza con un hola.' : 'Every friendship starts with hello.'}
          </h2>

          <p id="messages-not-ready-description" className="mt-3 text-[14px] leading-relaxed text-[#5C7470]">
            {lang === 'es'
              ? 'Estamos preparando un espacio para conversar dentro de la comunidad PAZO. Por ahora, los mensajes privados no están disponibles.'
              : 'We are preparing a place for conversations within the PAZO community. Private messaging is not available yet.'}
          </p>

          <div className="mt-4 flex items-start gap-2.5 rounded-[18px] bg-[#F1F4EA]/85 px-3.5 py-3">
            <svg viewBox="0 0 24 24" width="20" height="20" className="mt-0.5 shrink-0 text-[#204E4A]" fill="currentColor" aria-hidden="true">
              <path d="M12 2c2.2 1.7 5.3 2.6 8.5 3.2v6.4c0 5.1-3.6 8.4-8.5 10.7-4.9-2.3-8.5-5.6-8.5-10.7V5.2C6.7 4.6 9.8 3.7 12 2z" />
              <path d="m8.6 12.4 2.2 2.2 4.8-5.2" fill="none" stroke="#E1E53F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-[12px] leading-relaxed text-[#5C7470]">
              {lang === 'es'
                ? 'Todavía no es posible enviar mensajes ni abrir conversaciones privadas.'
                : 'Sending messages and opening private conversations is not possible yet.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 flex min-h-[52px] w-full items-center justify-center gap-3 rounded-full bg-[#204E4A] px-6 py-3 text-[15px] font-extrabold text-white shadow-[0_6px_18px_rgba(32,78,74,0.17)] transition-colors hover:bg-[#183E3A] focus-visible:bg-[#356761]"
          >
            <span>{lang === 'es' ? 'Volver a PAZO' : 'Back to PAZO'}</span>
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12h16m-6-6 6 6-6 6"/>
            </svg>
          </button>
        </section>
      </div>
    )
  }

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
      <div className="w-full max-w-sm pazo-glass-modal rounded-[2.8rem] soft-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto flex flex-col">
        {!activeConv ? (
          /* ================= M01: BANDEJA DE MENSAJES ================= */
          <>
            <div className="flex justify-between items-center pb-2">
              <div>
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
                        <span className="text-[13px] text-[#5C7470]">{conv.timeAgo}</span>
                      </div>
                      <p className="text-[14px] text-[#5C7470] truncate mt-0.5">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <p className="text-[13px] text-center text-[#5C7470] pt-1">
              <PazoMotifIcon kind="shield" size={14} className="inline-block align-[-2px] mr-1" /> {lang === 'es'
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
                <span className="text-[13px] text-[#5C7470]">{activeConv.petSpecies}</span>
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
                  <span className="text-[12px] text-[#5C7470]/70 mt-0.5 px-1">{m.timestamp}</span>
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

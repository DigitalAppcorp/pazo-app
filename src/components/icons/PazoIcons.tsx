interface IconProps {
  className?: string
  size?: number
}

// 1. Casita orgánica dibujada a mano (Inicio)
export const IconHome = ({ className = 'w-5 h-5', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <path d="M3.4 10.4 10.9 3.9a1.8 1.8 0 0 1 2.3 0l7.4 6.5v8.1c0 1.6-1.2 2.8-2.8 2.8H6.2c-1.6 0-2.8-1.2-2.8-2.8z" />
    <path d="M9.1 21v-4.6a2.9 2.9 0 0 1 5.8 0V21" />
    <path d="m16.4 6.6 1.4-1.2" />
  </svg>
)

// 2. Lupa / Brújula de exploración dibujada (Explorar)
export const IconExplore = ({ className = 'w-5 h-5', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <circle cx="10.2" cy="10.2" r="7.2" />
    <path d="m15.8 15.8 5.1 5.1" />
    <ellipse cx="7.4" cy="8.6" rx=".85" ry="1.3" fill="currentColor" stroke="none" />
    <ellipse cx="10" cy="6.9" rx=".85" ry="1.3" fill="currentColor" stroke="none" />
    <ellipse cx="12.9" cy="8.2" rx=".85" ry="1.3" fill="currentColor" stroke="none" />
    <path d="M8 12.6c.3-1.4 1.6-2 2.9-2 1.5 0 2.8 1 2.6 2.3-.1 1.1-1.3 1.8-2.6 1.8-1.5 0-3.2-.8-2.9-2.1z" fill="currentColor" stroke="none" />
  </svg>
)

// 3. Botón de creación (+)
export const IconPlus = ({ className = 'w-6 h-6', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <path d="M12 3.8v16.4M3.8 12h16.4" />
    <path d="M9.1 4.7c.6-.2 1.1-.3 1.7-.3m4.1 15c-.6.2-1.2.3-1.8.3" strokeWidth="1.6" opacity=".5" />
  </svg>
)

// 4. Mapa dibujado (Mapa)
export const IconMap = ({ className = 'w-5 h-5', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <path d="m2.5 6.8 5.3-2.9 8.4 3.2 5.3-2.8v13.6l-5.3 2.8-8.4-3.2-5.3 2.8z" />
    <path d="M7.8 4v13.5M16.2 7.1v13.6" />
    <path d="M11.9 14.8s-2.3-2.8-2.3-4.5a2.3 2.3 0 0 1 4.6 0c0 1.7-2.3 4.5-2.3 4.5z" fill="currentColor" stroke="none" />
    <circle cx="11.9" cy="10.1" r=".75" fill="#FAF8F5" stroke="none" />
  </svg>
)

// 5. Huella suave dibujada (Mi mascota / Pasaporte)
export const IconPaw = ({ className = 'w-5 h-5', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <ellipse cx="6.5" cy="8.5" rx="2" ry="3" />
    <ellipse cx="11.5" cy="5.5" rx="2" ry="3" />
    <ellipse cx="16.5" cy="7.5" rx="2" ry="3" />
    <ellipse cx="20.5" cy="11.5" rx="1.8" ry="2.5" />
    <path d="M7 16c0-2.5 2-4 5.5-4s5.5 1.5 5.5 4c0 2.2-2 4-5.5 4S7 18.2 7 16z" />
  </svg>
)

// 6. Plato de comida / Nutrición B.A.R.F
export const IconBowl = ({ className = 'w-5 h-5', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <path d="M3.1 12.1h17.8c-.1 5-3.4 8.1-8.9 8.1s-8.8-3.1-8.9-8.1z" />
    <path d="M5.5 8.8c1-1.5 2.3-1.8 3.8-1.2M14.9 7.5c1.5-.8 3-.4 4.1 1.2" />
    <ellipse cx="8" cy="10.2" rx=".85" ry="1.15" fill="currentColor" stroke="none" />
    <ellipse cx="11.2" cy="9.3" rx=".85" ry="1.15" fill="currentColor" stroke="none" />
    <ellipse cx="14.5" cy="10.2" rx=".85" ry="1.15" fill="currentColor" stroke="none" />
    <path d="M11.3 10.7c-1.3 0-2.3 1.2-2.3 2 0 .6.5 1 1 1 .5 0 .8-.3 1.3-.3s.8.3 1.3.3 1-.4 1-1c0-.8-1-2-2.3-2z" fill="currentColor" stroke="none" />
  </svg>
)

// 7. Estetoscopio / Cuidado Veterinario
export const IconVet = ({ className = 'w-5 h-5', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <path d="M4.4 3.5v6.1a4.2 4.2 0 0 0 8.4 0V3.5" />
    <path d="M3 3.5h2.8M11.4 3.5h2.8M8.6 13.7v2a4 4 0 0 0 8 0v-.7" />
    <circle cx="16.5" cy="13.4" r="2.3" />
    <path d="M16.5 12.2v2.4M15.3 13.4h2.4" strokeWidth="1.35" />
  </svg>
)

// 8. Calendario dibujado
export const IconCalendar = ({ className = 'w-5 h-5', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <rect x="2.9" y="4.7" width="18.2" height="16.1" rx="3.6" />
    <path d="M2.9 9.4h18.2M7.7 2.5v4.4M16.3 2.5v4.4" />
    <ellipse cx="9.4" cy="13.6" rx=".8" ry="1.05" fill="currentColor" stroke="none" />
    <ellipse cx="12" cy="12.7" rx=".8" ry="1.05" fill="currentColor" stroke="none" />
    <ellipse cx="14.7" cy="13.6" rx=".8" ry="1.05" fill="currentColor" stroke="none" />
    <path d="M12 14.4c-1.4 0-2.7 1.3-2.7 2.3 0 .6.4 1 .9 1 .7 0 1-.4 1.8-.4s1.1.4 1.8.4c.5 0 .9-.4.9-1 0-1-1.3-2.3-2.7-2.3z" fill="currentColor" stroke="none" />
  </svg>
)

// 9. Pin de ubicación suave (Check-in)
export const IconPin = ({ className = 'w-5 h-5', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <path d="M12 21.2s-6.7-6.5-6.7-11.6a6.7 6.7 0 0 1 13.4 0c0 5.1-6.7 11.6-6.7 11.6z" />
    <circle cx="12" cy="9.2" r="2.2" />
    <circle cx="12" cy="9.2" r=".5" fill="currentColor" stroke="none" />
  </svg>
)

// 10. Alerta / Megáfono (Mascota perdida)
export const IconAlert = ({ className = 'w-5 h-5', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <path d="m10.8 3.9-8.6 15a1.4 1.4 0 0 0 1.2 2.1h17.2a1.4 1.4 0 0 0 1.2-2.1l-8.6-15a1.4 1.4 0 0 0-2.4 0z" />
    <path d="M12 9.2v5.7" strokeWidth="2.7" />
    <circle cx="12" cy="17.7" r="1.1" fill="currentColor" stroke="none" />
  </svg>
)

// 11. Burbuja de mensajes (Chat 1 a 1)
export const IconChat = ({ className = 'w-5 h-5', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <path d="M20.5 11.2c0 4.8-4.1 8.4-9 8.4-1.3 0-2.5-.2-3.6-.7L3 20.6l1.5-4.6a7.9 7.9 0 0 1-2-4.8c0-4.5 4-8.1 9-8.1s9 3.6 9 8.1z" />
    <path d="M7.2 11.8c.9-1.3 2-1.9 3.8-1.9 1.8 0 3 .6 3.9 1.9" />
    <circle cx="8" cy="8.1" r=".9" fill="currentColor" stroke="none" />
    <circle cx="11.8" cy="7.4" r=".9" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="8.1" r=".9" fill="currentColor" stroke="none" />
  </svg>
)

// 12. Campana de notificaciones
export const IconBell = ({ className = 'w-5 h-5', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <path d="M18.4 9.1c0-4-2.5-6.4-6.4-6.4S5.6 5.1 5.6 9.1c0 5.7-2.6 7.5-2.6 7.5h18s-2.6-1.8-2.6-7.5z" />
    <path d="M9.6 20.2c.5 1.2 1.3 1.7 2.4 1.7s1.9-.5 2.4-1.7" />
    <path d="M8.2 17.2h7.6" strokeWidth="1.5" opacity=".45" />
  </svg>
)

// 13. Corazón dibujado (Likes)
export const IconHeart = ({ filled = false, className = 'w-5 h-5', size }: IconProps & { filled?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <path d="M12 21 4.3 14.2C-1.1 9.3 4.4 2.9 9.2 5.1L12 7.2l2.8-2.1c4.8-2.2 10.3 4.2 4.9 9.1L12 21z" />
    {!filled && <path d="M8.1 8.1c.7-.6 1.6-.8 2.4-.5" strokeWidth="1.4" opacity=".55" />}
  </svg>
)

// 14. Guardar / Marcador
export const IconBookmark = ({ filled = false, className = 'w-5 h-5', size }: IconProps & { filled?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <path d="M6.8 3.1h10.4a2 2 0 0 1 2 2v16.1L12 16.7l-7.2 4.5V5.1a2 2 0 0 1 2-2z" />
    {!filled && <path d="m9.3 9.1 1.8 1.8 3.8-3.7" strokeWidth="1.7" />}
  </svg>
)

// 15. Cámara fotográfica dibujada
export const IconCamera = ({ className = 'w-5 h-5', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <path d="M4.2 6.8h2.3l1.4-2.5h8.2l1.4 2.5h2.2a2 2 0 0 1 2 2v9.5a2.2 2.2 0 0 1-2.2 2.2H4.3a2.2 2.2 0 0 1-2.2-2.2V8.8a2 2 0 0 1 2.1-2z" />
    <circle cx="12" cy="13.4" r="4.1" />
    <ellipse cx="10.2" cy="12.4" rx=".7" ry=".9" fill="currentColor" stroke="none" />
    <ellipse cx="12.6" cy="11.6" rx=".7" ry=".9" fill="currentColor" stroke="none" />
    <path d="M11.6 13.3c-1.2 0-2 1.2-2 2 0 .7.4 1 1 1 .4 0 .7-.3 1-.3.4 0 .7.3 1.1.3.6 0 1-.3 1-1 0-.8-1-2-2.1-2z" fill="currentColor" stroke="none" />
    <circle cx="18.4" cy="9.5" r=".8" fill="currentColor" stroke="none" />
  </svg>
)

// 16. Documento / Carnet
export const IconDocument = ({ className = 'w-5 h-5', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <path d="M6.1 2.8h8.3l5.4 5.6v11.4a2.3 2.3 0 0 1-2.3 2.3H6.1a2.3 2.3 0 0 1-2.3-2.3V5.1a2.3 2.3 0 0 1 2.3-2.3z" />
    <path d="M14.4 2.8v5.6h5.4" />
    <circle cx="9.5" cy="12.8" r="2.1" />
    <path d="M6.9 18c.4-1.4 1.3-2.1 2.6-2.1 1.2 0 2.2.7 2.5 2.1M14.2 13.1h3M14.2 16.2h3" strokeWidth="1.6" />
  </svg>
)

// 17. Escudo de Privacidad
export const IconShield = ({ className = 'w-5 h-5', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <path d="M12 2.3c2.4 1.5 5.3 2.4 8.3 2.8v7c0 5-3 7.6-8.3 9.9-5.3-2.3-8.3-4.9-8.3-9.9v-7c3-.4 5.9-1.3 8.3-2.8z" />
    <path d="M8.2 12.6 11 15l4.9-5.5" strokeWidth="2.2" />
  </svg>
)

// 18. Especie: Gatito dibujado
export const IconCat = ({ className = 'w-5 h-5', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <path d="m3.9 5.8 4 3.1h8.2l4-3.1v6.8c0 5-3.3 8.4-8.1 8.4s-8.1-3.4-8.1-8.4z" />
    <path d="M8.3 13.7h.1M15.6 13.7h.1" strokeWidth="3.3" strokeLinecap="round" />
    <path d="m11 16 1 1 1-1M9.3 18c1.5 1.1 3.9 1.1 5.4 0" strokeWidth="1.4" />
    <path d="M3 16.8l4.1-.7M17 16.1l4.1.7" strokeWidth="1.3" />
  </svg>
)

// 19. Especie: Perrito dibujado
export const IconDog = ({ className = 'w-5 h-5', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <path d="M8.2 6.7c1.7-1.8 5.9-1.8 7.6 0L19.3 5c2.1 2.5 2.4 5.5 1 7.7L18 12c.2 5.5-2.1 8.7-6 8.7S5.8 17.5 6 12l-2.3.7c-1.4-2.2-1.1-5.2 1-7.7z" />
    <circle cx="9.3" cy="12.8" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="14.7" cy="12.8" r="1.15" fill="currentColor" stroke="none" />
    <path d="M10.4 16c1-1.2 2.2-1.2 3.2 0-.6 1.1-1.4 1.6-1.6 1.6s-1-.5-1.6-1.6z" fill="currentColor" stroke="none" />
  </svg>
)

// 20. Especie: Conejito dibujado
export const IconRabbit = ({ className = 'w-5 h-5', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <path d="M7.1 10C5.2 6.5 5.1 2 7.1 2c1.8 0 2.9 2.5 4 7.1 1.1-4.6 2.2-7.1 4-7.1 2 0 1.9 4.5 0 8" />
    <path d="M7.6 10.2a7.5 7.5 0 0 0-3.1 6.2c0 3.4 2.8 5.3 7.5 5.3s7.5-1.9 7.5-5.3a7.5 7.5 0 0 0-3.1-6.2" />
    <circle cx="9.1" cy="16.2" r="1" fill="currentColor" stroke="none" />
    <circle cx="14.9" cy="16.2" r="1" fill="currentColor" stroke="none" />
    <path d="m11.1 18.6.9-.8.9.8M9.6 19.5c1.2 1 3.6 1 4.8 0" strokeWidth="1.35" />
  </svg>
)

// 21. Especie: Pajarito dibujado
export const IconBird = ({ className = 'w-5 h-5', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <path d="M18.8 8.9c-1.2-3.5-3.6-5.6-7-5.6-4.5 0-7.7 3.7-7.7 8.4s3.2 8.8 8.2 8.8c3.2 0 5.1-1.2 6.6-3.5l3 1.2-1.3-3.7c.8-1.3 1-2.9.7-4.5z" />
    <path d="M7.4 11.5c.5 3 2.3 4.8 4.8 5.1" strokeWidth="1.6" />
    <circle cx="14.2" cy="8.9" r="1.2" fill="currentColor" stroke="none" />
  </svg>
)

// 22. Estrellita / Destello dibujado
export const IconSparkle = ({ className = 'w-4 h-4', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <path d="M12 2l2.4 6.8 6.8 2.4-6.8 2.4L12 20.4l-2.4-6.8L2.8 11.2l6.8-2.4z" />
  </svg>
)

// 23. Checkmark dibujado
export const IconCheck = ({ className = 'w-4 h-4', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

// 24. Cruz / Cerrar
export const IconClose = ({ className = 'w-4 h-4', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

// 25. Jeringa / Vacuna
export const IconSyringe = ({ className = 'w-5 h-5', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <path d="m17.4 2.3 4.3 4.3-2 2-4.3-4.3zM15.7 7.2l-8 8-1.2 3.3-2-2 3.3-1.2 8-8M5.1 18.9 2.3 21.7" />
    <path d="m11.1 6.5 6.5 6.5M8.6 9l6.5 6.5" strokeWidth="1.4" />
    <path d="m14.2 2.2 7.6 7.6" strokeWidth="1.4" />
  </svg>
)

// 26. Pastilla / Medicamento
export const IconPill = ({ className = 'w-5 h-5', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <path d="M10.2 20.5a5.1 5.1 0 0 1-7.2-7.2L13.3 3a5.1 5.1 0 0 1 7.2 7.2z" />
    <path d="m8.1 8.1 7.8 7.8" />
    <path d="M5.9 16.2c-.3 1.1.4 2.1 1.4 2.3" strokeWidth="1.3" />
  </svg>
)



// 27. Grupo / Comunidad
export const IconCommunity = ({ className = 'w-5 h-5', size }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >

    <circle cx="8" cy="8.5" r="2.8" />
    <circle cx="16.5" cy="9.5" r="2.3" />
    <path d="M2.8 19.6c.5-3.7 2.5-5.6 5.2-5.6 2.9 0 4.8 2 5.2 5.6M14 14.5c3-.9 5.9 1.1 7.1 4.4" />
    <path d="M12 4.1c.8-.8 1.8-.8 2.6 0" strokeWidth="1.3" />
  </svg>
)

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
    <path d="M3 10.5L12 3l9 7.5v9a2 2 0 0 1-2 2h-4.5a1.5 1.5 0 0 1-1.5-1.5V15a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v5a1.5 1.5 0 0 1-1.5 1.5H5a2 2 0 0 1-2-2v-9z" />
    <path d="M9 3v2" />
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
    <circle cx="10.5" cy="10.5" r="7" />
    <path d="M16 16l5 5" />
    <circle cx="10.5" cy="10.5" r="2.5" />
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
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
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
    <path d="M2 6.5L8 3.5l8 3.5 6-3v14l-6 3-8-3.5-6 3v-14z" />
    <path d="M8 3.5v14" />
    <path d="M16 7v14" />
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
    <path d="M3 11c0 5 4 8 9 8s9-3 9-8H3z" />
    <path d="M6 11c0-2 2-3 3-4" />
    <path d="M15 11c0-2-2-3-3-4" />
    <path d="M12 7V4" />
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
    <path d="M4.5 4v5a4 4 0 0 0 8 0V4" />
    <path d="M3.5 4h2M11.5 4h2" />
    <path d="M8.5 13v3a4 4 0 0 0 8 0v-1" />
    <circle cx="16.5" cy="14" r="2" />
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
    <rect x="3" y="4.5" width="18" height="16" rx="3.5" />
    <path d="M3 9.5h18" />
    <path d="M8 2.5v4M16 2.5v4" />
    <circle cx="8.5" cy="14" r="1" fill="currentColor" />
    <circle cx="12" cy="14" r="1" fill="currentColor" />
    <circle cx="15.5" cy="14" r="1" fill="currentColor" />
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
    <path d="M12 21s-6.5-6.5-6.5-11.5a6.5 6.5 0 0 1 13 0C18.5 14.5 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
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
    <path d="M12 3L2 20h20L12 3z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <circle cx="12" cy="17" r="1" fill="currentColor" />
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
    <path d="M20 12c0 4.4-3.8 8-8.5 8-1.4 0-2.8-.3-4-.9L3 20.5l1.6-4.1C3.6 15 3 13.5 3 12c0-4.4 3.8-8 8.5-8S20 7.6 20 12z" />
    <circle cx="8" cy="12" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="16" cy="12" r="1" fill="currentColor" />
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
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
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
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
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
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
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
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="14" y2="17" />
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
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
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
    <path d="M4 6l3.5 3.5h9L20 6v6a8 8 0 0 1-16 0V6z" />
    <circle cx="8.5" cy="13.5" r="1.2" fill="currentColor" />
    <circle cx="15.5" cy="13.5" r="1.2" fill="currentColor" />
    <path d="M12 15.5v1.2M10.5 17.5a2 2 0 0 0 3 0" />
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
    <path d="M5 8c-2 2-3 5-1 7l3-1 2 4h6l2-4 3 1c2-2 1-5-1-7l-3 1-2-4H10L8 9 5 8z" />
    <circle cx="9" cy="12" r="1.2" fill="currentColor" />
    <circle cx="15" cy="12" r="1.2" fill="currentColor" />
    <ellipse cx="12" cy="15" rx="1.8" ry="1.2" fill="currentColor" />
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
    <path d="M8 2c-1.5 2-1 6 1 8M16 2c1.5 2 1 6-1 8" />
    <ellipse cx="12" cy="14" rx="6" ry="6" />
    <circle cx="9.5" cy="13" r="1" fill="currentColor" />
    <circle cx="14.5" cy="13" r="1" fill="currentColor" />
    <path d="M11 16l1-1 1 1" />
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
    <path d="M16 7c0-2.8-2.2-5-5-5-3.3 0-6 2.7-6 6 0 5 4 10 9 10 1.5 0 3-.5 4-1.5l3.5.5-2-3.5c.3-.8.5-1.7.5-2.5 0-1-.3-2.3-.9-3.5" />
    <circle cx="12" cy="7" r="1" fill="currentColor" />
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
    <path d="M18 2l4 4-2 2-4-4 2-2z" />
    <path d="M17 7l-9 9" />
    <path d="M19 11l-4-4" />
    <path d="M5 19l-3 3" />
    <path d="M14 10l-6 6H4v-4l6-6" />
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
    <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z" />
    <path d="M8.5 8.5l7 7" />
  </svg>
)


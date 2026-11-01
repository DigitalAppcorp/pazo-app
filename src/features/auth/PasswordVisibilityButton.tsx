interface Props {
  lang: 'es' | 'en'
  visible: boolean
  onToggle: () => void
}

export function PasswordVisibilityButton({ lang, visible, onToggle }: Props) {
  const label = visible
    ? (lang === 'es' ? 'Ocultar contraseña' : 'Hide password')
    : (lang === 'es' ? 'Ver contraseña' : 'Show password')
  return (
    <button type="button" onClick={onToggle} aria-label={label} aria-pressed={visible} title={label}
      className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[#5C7470] hover:text-[#204E4A] focus-visible:bg-[#E1E53F] focus-visible:text-[#204E4A]">
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/>
        <circle cx="12" cy="12" r="3"/>
        {visible && <path d="M4 4l16 16"/>}
      </svg>
    </button>
  )
}

interface LiquidChoiceTabsProps<T extends string> {
  active: T
  onChange: (next: T) => void
  choices: ReadonlyArray<{ id: T; label: string }>
  variant: 'community' | 'pet'
  accessibleLabel: string
}

/** Keep the existing content owner in each view; animate only one shared pill. */
export const LiquidChoiceTabs = <T extends string>({
  active, onChange, choices, variant, accessibleLabel,
}: LiquidChoiceTabsProps<T>) => {
  const isCommunity = variant === 'community'
  return (
    <nav
      aria-label={accessibleLabel}
      className={isCommunity
        ? 'relative grid grid-cols-3 gap-1 rounded-full bg-white/80 p-1.5 shadow-[0_4px_19px_rgba(32,78,74,0.05)] backdrop-blur-xl'
        : 'relative grid grid-cols-2 pazo-glass-card p-1 rounded-2xl shadow-xs'}
    >
      <span
        aria-hidden="true"
        className={'pazo-choice-indicator pointer-events-none ' +
          (isCommunity ? 'pazo-choice-indicator--community' : 'pazo-choice-indicator--pet')}
        data-active={active}
      />
      {choices.map(({id,label}) => {
        const selected = active === id
        return (
          <button
            key={id}
            type="button"
            aria-current={selected ? 'page' : undefined}
            aria-pressed={selected}
            onClick={() => onChange(id)}
            className={isCommunity
              ? 'relative z-10 min-w-0 rounded-full px-1.5 py-3 text-[clamp(11px,3.1vw,14px)] font-extrabold transition-colors focus-visible:bg-[#E1E53F]/25 ' +
                (selected ? 'text-white' : 'text-[#5C7470] hover:bg-[#E1E53F]/20')
              : 'relative z-10 min-w-0 rounded-xl px-1 py-2 text-xs font-extrabold transition-colors focus-visible:bg-[#E1E53F]/25 ' +
                (selected ? 'text-[#E1E53F]' : 'text-[#5C7470] hover:bg-[#E1E53F]/20')}
          >
            <span className={selected ? 'pazo-choice-label--active' : ''}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

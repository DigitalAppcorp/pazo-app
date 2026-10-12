import type { ReactNode } from 'react'

interface SectionTitleProps {
  children: ReactNode
  tone?: 'default' | 'alert'
}

/** F13: contextual heading without the decorative pill, as in the Profile reference. */
export const SectionTitle = ({ children, tone = 'default' }: SectionTitleProps) => (
  <p className={`w-full text-center text-sm font-extrabold uppercase tracking-[0.16em] leading-5 ${
    tone === 'alert' ? 'text-[#EC7357]' : 'text-[#5C7470]'
  }`}>
    {children}
  </p>
)

/**
 * The approved welcome artwork is extracted from the PO-selected reference
 * rather than approximated with a new cartoon. Its self-contained SVG keeps
 * the picture and gentle head, tail and breathing animations together; text
 * and real A01 navigation remain separate accessible DOM.
 *
 * SVG-as-image deliberately cannot access the app or expose data. Decorative
 * animations stop under prefers-reduced-motion, including its entry effect.
 */
export function WelcomeAnimatedCompanion() {
  return <img
    src="/onboarding/welcome-approved-art.svg"
    alt=""
    aria-hidden="true"
    width={360}
    height={239}
    draggable={false}
    className="pazo-welcome-dog block h-auto w-full max-w-none select-none object-contain"
  />
}

/**
 * The PO-approved smiling orange/white corgi was redrawn as one coherent scene:
 * upright ears, closed happy eyes, visible tongue, green collar and yellow tag.
 * A single transparent WebP image in an SVG wrapper is used here; no head,
 * tail or face cutouts move independently. The image is decorative only.
 * Its single entry animation is disabled under prefers-reduced-motion.
 */
export function WelcomeAnimatedCompanion() {
  return <img
    src="/onboarding/welcome-approved-art.svg"
    alt=""
    aria-hidden="true"
    width={295}
    height={310}
    draggable={false}
    decoding="async"
    className="pazo-welcome-dog block h-full w-full max-w-none select-none object-contain"
  />
}

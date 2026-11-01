// Build switches for Meta. Off unless the build enables them; the server's own
// release gate still decides whether any event can exist.
// Pixel is separate so CAPI can run alone while deduplication is unproven:
// with one channel there is nothing to count twice.
export const isMetaEnabled = (env: Record<string, unknown>): boolean =>
  env.VITE_PAZO_META_ENABLED === 'true'

export const isMetaPixelEnabled = (env: Record<string, unknown>): boolean =>
  isMetaEnabled(env) && env.VITE_PAZO_META_PIXEL_ENABLED === 'true'

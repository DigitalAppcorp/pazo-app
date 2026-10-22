/** Network-only PWA registration: app assets and private Supabase data are not precached.
 * Loading App.tsx is asynchronous, so the window load event may already have fired
 * before this function is called (notably after a cold-start PayPal callback).
 */
let registrationScheduled = false

export function registerPazoPwa(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || registrationScheduled) return
  registrationScheduled = true

  const register = () => {
    // A rejected registration must not break checkout return or ordinary browsing.
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Browsers that disallow workers still have an ordinary web experience.
    })
  }

  if (document.readyState === 'complete') {
    register()
  } else {
    window.addEventListener('load', register, { once: true })
  }
}

const MAPBOX_VERSION = '3.32.0'
const MAPBOX_SCRIPT_ID = 'pazo-mapbox-gl-script'
const MAPBOX_STYLE_ID = 'pazo-mapbox-gl-style'

declare global {
  interface Window {
    mapboxgl?: any
  }
}

export const loadMapboxGl = async () => {
  if (window.mapboxgl) return window.mapboxgl

  if (!document.getElementById(MAPBOX_STYLE_ID)) {
    const link = document.createElement('link')
    link.id = MAPBOX_STYLE_ID
    link.rel = 'stylesheet'
    link.href = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_VERSION}/mapbox-gl.css`
    document.head.appendChild(link)
  }

  const existing = document.getElementById(
    MAPBOX_SCRIPT_ID
  ) as HTMLScriptElement | null

  if (existing) {
    await new Promise<void>((resolve, reject) => {
      if (window.mapboxgl) {
        resolve()
        return
      }

      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => reject(new Error('Mapbox GL JS no pudo cargarse.')),
        { once: true }
      )
    })

    if (!window.mapboxgl) {
      throw new Error('Mapbox GL JS no está disponible.')
    }

    return window.mapboxgl
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.id = MAPBOX_SCRIPT_ID
    script.src = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_VERSION}/mapbox-gl.js`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () =>
      reject(new Error('Mapbox GL JS no pudo cargarse.'))
    document.head.appendChild(script)
  })

  if (!window.mapboxgl) {
    throw new Error('Mapbox GL JS no está disponible.')
  }

  return window.mapboxgl
}

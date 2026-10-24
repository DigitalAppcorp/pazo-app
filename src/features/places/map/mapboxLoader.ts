const MAPBOX_VERSION = '3.30.0'
const MAPBOX_SCRIPT_ID = 'pazo-mapbox-gl-script'
const MAPBOX_STYLE_ID = 'pazo-mapbox-gl-style'
const MAPBOX_LOAD_TIMEOUT_MS = 15000

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Official CDN API; Mapbox is not an npm dependency.
    mapboxgl?: any
  }
}

type MapboxGl = NonNullable<Window['mapboxgl']>
let pendingLoad: Promise<MapboxGl> | null = null

/** Share one CDN request across mounts, and allow a failed request to retry. */
export const loadMapboxGl = (): Promise<MapboxGl> => {
  if (pendingLoad) return pendingLoad

  let stylesheet = document.getElementById(MAPBOX_STYLE_ID) as HTMLLinkElement | null
  const appendStylesheet = !stylesheet
  if (!stylesheet) {
    stylesheet = document.createElement('link')
    stylesheet.id = MAPBOX_STYLE_ID
    stylesheet.rel = 'stylesheet'
    stylesheet.href = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_VERSION}/mapbox-gl.css`
  }
  const css = stylesheet

  let script = document.getElementById(MAPBOX_SCRIPT_ID) as HTMLScriptElement | null
  const appendScript = !script && !window.mapboxgl
  if (appendScript) {
    script = document.createElement('script')
    script.id = MAPBOX_SCRIPT_ID
    script.src = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_VERSION}/mapbox-gl.js`
    script.async = true
  }
  const js = script

  pendingLoad = new Promise<MapboxGl>((resolve, reject) => {
    let scriptReady = Boolean(window.mapboxgl)
    let cssReady = Boolean(css.sheet)
    let settled = false

    const cleanup = () => {
      window.clearTimeout(timeout)
      js?.removeEventListener('load', onScriptLoad)
      js?.removeEventListener('error', onScriptError)
      css.removeEventListener('load', onCssLoad)
      css.removeEventListener('error', onCssError)
    }
    const fail = (message: string) => {
      if (settled) return
      settled = true
      cleanup()
      // Failed tags never emit another load event. Keeping them made the next
      // visit to Places wait forever instead of issuing a fresh request.
      if (!scriptReady) js?.remove()
      if (!cssReady) css.remove()
      reject(new Error(message))
    }
    const finish = () => {
      if (settled || !scriptReady || !cssReady) return
      settled = true
      cleanup()
      resolve(window.mapboxgl)
    }
    const onScriptLoad = () => {
      scriptReady = Boolean(window.mapboxgl)
      if (!scriptReady) fail('Mapbox GL JS no está disponible.')
      else finish()
    }
    const onScriptError = () => fail('Mapbox GL JS no pudo cargarse.')
    const onCssLoad = () => { cssReady = true; finish() }
    const onCssError = () => fail('Los estilos de Mapbox no pudieron cargarse.')
    const timeout = window.setTimeout(
      () => fail('La carga de Mapbox agotó el tiempo de espera.'),
      MAPBOX_LOAD_TIMEOUT_MS
    )

    js?.addEventListener('load', onScriptLoad)
    js?.addEventListener('error', onScriptError)
    css.addEventListener('load', onCssLoad)
    css.addEventListener('error', onCssError)

    if (appendStylesheet) document.head.appendChild(css)
    if (appendScript && js) document.head.appendChild(js)
    finish()
  }).finally(() => {
    pendingLoad = null
  })

  return pendingLoad
}

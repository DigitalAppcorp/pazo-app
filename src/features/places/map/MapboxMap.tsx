import {classifyBasemapFailure} from './mapFailure'
import { PAZO_STANDARD_STYLE, PAZO_STANDARD_CONFIG } from './pazoBasemap'
import { useEffect, useRef, useState } from 'react'
import type { EphemeralLocation, PetPlace } from '../../../types/pazo'
import { loadMapboxGl } from './mapboxLoader'

interface MapboxMapProps {
  places: PetPlace[]
  focusPlaceRequest?: { placeId: string } | null
  userLocation?: EphemeralLocation | null
  onSelectPlace: (placeId: string) => void
  lang: 'es' | 'en'
  immersive?: boolean
}

const DEFAULT_CENTER: [number, number] = [-118.2437, 34.0522]

const placeModelExpression = () => {
  const modelUrl = (file: string) =>
    new URL(`/models/places/${file}`, window.location.origin).toString()

  return [
    'match',
    ['get', 'category'],
    'park',
    modelUrl('park.gltf'),
    'trail',
    modelUrl('trail.gltf'),
    'food',
    modelUrl('restaurant.gltf'),
    'veterinary',
    modelUrl('veterinarian.gltf'),
    'grooming',
    modelUrl('grooming.gltf'),
    'pet_store',
    modelUrl('pet-store.gltf'),
    modelUrl('park.gltf'),
  ]
}

/**
 * A crisp custom PAZO map pin generated locally in the browser. No external
 * icon requests or geolocation. The glyph denotes a real place category.
 */
const drawPazoCategoryPin = (category: string): ImageData => {
  const canvas = document.createElement('canvas')
  canvas.width = 72
  canvas.height = 88
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D unavailable for PAZO map pins')
  ctx.scale(2, 2)
  const light = category === 'food' || category === 'pet_store'
  ctx.fillStyle = light ? '#E1E53F' : '#204E4A'
  ctx.beginPath()
  ctx.moveTo(18, 43)
  ctx.bezierCurveTo(14, 35, 2, 23, 2, 17)
  ctx.bezierCurveTo(2, 8, 9, 2, 18, 2)
  ctx.bezierCurveTo(27, 2, 34, 8, 34, 17)
  ctx.bezierCurveTo(34, 23, 22, 35, 18, 43)
  ctx.fill()
  ctx.fillStyle = light ? '#204E4A' : '#F9FAEF'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = ctx.fillStyle
  const line = (...coords: number[]) => {
    ctx.beginPath()
    ctx.moveTo(coords[0], coords[1])
    for (let i = 2; i < coords.length; i += 2) ctx.lineTo(coords[i], coords[i + 1])
    ctx.stroke()
  }
  if (category === 'park') {
    line(18, 10, 11, 19, 25, 19, 18, 10)
    line(13, 16, 10, 23, 26, 23, 23, 16)
    line(18, 23, 18, 29)
  } else if (category === 'trail') {
    ctx.beginPath()
    ctx.arc(18, 12, 3, 0, Math.PI * 2)
    ctx.fill()
    line(18, 16, 15, 22, 20, 24, 24, 29)
    line(15, 22, 9, 24)
    line(17, 24, 12, 30)
  } else if (category === 'food') {
    line(11, 12, 11, 29)
    line(8, 12, 8, 20, 14, 20, 14, 12)
    line(24, 12, 24, 29)
    line(24, 12, 21, 18, 24, 22)
  } else if (category === 'veterinary') {
    ctx.fillRect(15, 10, 6, 19)
    ctx.fillRect(9, 16, 18, 6)
  } else if (category === 'pet_store') {
    line(10, 13, 13, 25, 26, 25)
    line(13, 15, 28, 15, 25, 22, 14, 22)
    ctx.beginPath(); ctx.arc(16, 29, 2, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(25, 29, 2, 0, Math.PI * 2); ctx.fill()
  } else {
    // Grooming: a minimal four-toe paw pictogram.
    for (const [x, y] of [[11, 15], [16, 11], [22, 11], [27, 15]]) {
      ctx.beginPath();ctx.ellipse(x, y, 2, 3, 0, 0, Math.PI * 2);ctx.fill()
    }
    ctx.beginPath();ctx.ellipse(19, 23, 8, 6, 0, 0, Math.PI * 2);ctx.fill()
  }
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

const toGeoJson = (places: PetPlace[]) => ({
  type: 'FeatureCollection',
  features: places.map((place) => ({
    type: 'Feature',
    id: place.id,
    geometry: {
      type: 'Point',
      coordinates: [place.longitude, place.latitude],
    },
    properties: {
      id: place.id,
      name: place.name,
      category: place.category,
    },
  })),
})

export const MapboxMap = ({
  places,
  focusPlaceRequest,
  userLocation,
  onSelectPlace,
  lang,
  immersive = false,
}: MapboxMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)
  // DOM map markers are the permanent overview/accessibility fallback: never
  // disappear merely because the vector style or a local glTF fails to load.
  const placeMarkersRef = useRef<Array<{ marker: any; element: HTMLElement }>>([])
  const placesRef = useRef(places)
  const userLocationRef = useRef(userLocation)
  const langRef = useRef(lang)
  const onSelectPlaceRef = useRef(onSelectPlace)
  const [error, setError] = useState('')
  const [mapNotice, setMapNotice] = useState('')
  const [mapAttempt, setMapAttempt] = useState(0)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    placesRef.current = places
  }, [places])

  useEffect(() => {
    userLocationRef.current = userLocation
  }, [userLocation])

  useEffect(() => {
    langRef.current = lang
  }, [lang])

  useEffect(() => {
    onSelectPlaceRef.current = onSelectPlace
  }, [onSelectPlace])

  const syncPlaceMarkers = (map: any, mapboxgl: any, source: PetPlace[]) => {
    for (const entry of placeMarkersRef.current) entry.marker.remove()
    placeMarkersRef.current = []
    for (const place of source) {
      if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) continue
      const element = document.createElement('button')
      element.type = 'button'
      element.setAttribute('aria-label', (langRef.current === 'es' ? 'Abrir lugar: ' : 'Open place: ') + place.name)
      element.title = place.name
      element.style.cssText = 'width:38px;height:46px;border:0;outline:0;background:transparent;padding:0;cursor:pointer;filter:drop-shadow(0 3px 4px rgba(24,61,54,.25));'
      const icon = document.createElement('canvas')
      icon.width = 72
      icon.height = 88
      icon.style.cssText = 'width:38px;height:46px;display:block;'
      const ctx = icon.getContext('2d')
      if (ctx) ctx.putImageData(drawPazoCategoryPin(place.category), 0, 0)
      element.appendChild(icon)
      element.addEventListener('click', (event) => {
        event.stopPropagation()
        onSelectPlaceRef.current(place.id)
      })
      const marker = new mapboxgl.Marker({ element, anchor: 'bottom' })
        .setLngLat([place.longitude, place.latitude]).addTo(map)
      // GL assigns role=img to custom markers; preserve this native button.
      element.setAttribute('role', 'button')
      placeMarkersRef.current.push({marker, element})
    }
  }

  const syncUserMarker = (
    map: any,
    mapboxgl: any,
    location: EphemeralLocation | null | undefined,
    currentLang: 'es' | 'en',
    shouldFly = true
  ) => {
    userMarkerRef.current?.remove?.()
    userMarkerRef.current = null

    if (!location) return

    const markerNode = document.createElement('div')
    markerNode.setAttribute(
      'aria-label',
      currentLang === 'es'
        ? 'Tu ubicación aproximada'
        : 'Your approximate location'
    )
    markerNode.style.width = '18px'
    markerNode.style.height = '18px'
    markerNode.style.borderRadius = '999px'
    markerNode.style.background = '#E1E53F'
    markerNode.style.border = '3px solid #204E4A'
    markerNode.style.boxShadow = '0 2px 10px rgba(32,78,74,.22)'

    userMarkerRef.current = new mapboxgl.Marker({
      element: markerNode,
    })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map)

    if (shouldFly) {
      map.flyTo({
        center: [location.longitude, location.latitude],
        zoom: 13.5,
        duration: 700,
      })
    }
  }

  useEffect(() => {
    let cancelled = false

    let loadingTimeout: number | undefined
    let basemapFailed = false
    const start = async () => {
      setError('')
      setMapNotice('')
      setMapReady(false)
      const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
      if (!token) {
        setError(
          lang === 'es'
            ? 'Falta configurar el token público de Mapbox.'
            : 'The public Mapbox token is not configured.'
        )
        return
      }

      try {
        const mapboxgl = await loadMapboxGl()
        if (cancelled || !containerRef.current) return

        if (!mapboxgl.supported()) {
          setError(lang === 'es'
            ? 'Este navegador no tiene WebGL disponible. Actívalo para ver Mapbox Standard.'
            : 'WebGL is unavailable in this browser. Enable it to view Mapbox Standard.')
          return
        }
        mapboxgl.accessToken = token

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: PAZO_STANDARD_STYLE,
          config: { basemap: PAZO_STANDARD_CONFIG },
          center: DEFAULT_CENTER,
          zoom: 10.5,
          pitch: 45,
          bearing: 0,
          antialias: true,
          attributionControl: true,
        })

        mapRef.current = map
        loadingTimeout = window.setTimeout(() => {
          if (!cancelled && !map.loaded() && !basemapFailed) setMapNotice(langRef.current === 'es'
            ? 'Mapbox Standard está tardando en cargar. Comprueba tu conexión y reintenta.'
            : 'Mapbox Standard is taking longer to load. Check your connection and retry.')
        }, 20000)
        map.on('load', () => {
          if (cancelled) return
          globalThis.clearTimeout(loadingTimeout)
          // GL can emit load even when every tile returned 403. Keep the error.
          if (!basemapFailed) setMapReady(true)
        })
        const canvas = map.getCanvas()
        canvas.addEventListener('webglcontextlost', () => {
          if (!cancelled) setMapNotice(langRef.current === 'es'
            ? 'Se interrumpió el renderizado del mapa. Reintenta para recuperarlo.'
            : 'Map rendering was interrupted. Retry to restore it.')
        })
        // Render PAZO location markers as real map annotations independently of
        // any basemap tiles, 3D layer capability or model request.
        syncPlaceMarkers(map, mapboxgl, placesRef.current)

        // Immersive mobile Places already has its own location control,
        // and users can pinch to zoom. Avoid a second white Mapbox toolbar
        // sitting behind the PAZO yellow button.
        if (!immersive) {
          map.addControl(
            new mapboxgl.NavigationControl({ showCompass: false }),
            'top-right'
          )
        }

        const syncMarkerEmphasis = () => {
          // Tiny map pins identify locations at overview zoom. Up close, the
          // original glTF model is visually prominent, while the accessible
          // DOM annotation remains a tappable last-resort fallback.
          const modelVisible = Boolean(map.getLayer?.('pazo-place-models'))
            && (map.getZoom?.() || 0) >= 14
          for (const entry of placeMarkersRef.current) {
            entry.element.style.opacity = modelVisible ? '0.28' : '1'
          }
        }
        map.on('zoom', syncMarkerEmphasis)
        const attachPlaceLayers = () => {
          if (cancelled) return

          // Elevation is optional; a DEM failure must preserve Standard streets.
          if (!map.getSource('pazo-terrain-dem')) {
            try {
              map.addSource('pazo-terrain-dem', {
                type: 'raster-dem',
                url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                tileSize: 512,
                maxzoom: 14,
              })
              map.setTerrain({ source: 'pazo-terrain-dem', exaggeration: 1.15 })
            } catch {
              // Mapbox may restrict terrain separately from basemap and places.
            }
          }

          if (map.getSource('pazo-places')) {
            map.getSource('pazo-places').setData(toGeoJson(placesRef.current))
            return
          }
          map.addSource('pazo-places', {
            type: 'geojson',
            data: toGeoJson(placesRef.current),
          })

          // Low zoom: original PAZO category glyphs in map pins, not generic dots.
          // At close zoom the already installed reusable 3D models still take over.
          for (const category of ['park', 'trail', 'food', 'veterinary', 'grooming', 'pet_store'] as const) {
            const image = drawPazoCategoryPin(category)
            if (!map.hasImage(`pazo-pin-${category}`)) {
              map.addImage(`pazo-pin-${category}`, image, { pixelRatio: 2 })
            }
          }
          map.addLayer({
            id: 'pazo-place-pins',
            type: 'symbol',
            source: 'pazo-places',
            // Symbols stay visible as a redundant fallback for glTF load failures.
            layout: {
              'icon-image': ['concat', 'pazo-pin-', ['get', 'category']],
              'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.75, 12.5, 1],
              'icon-anchor': 'bottom',
              'icon-allow-overlap': false,
              'icon-padding': 3,
            },
          })

          map.addLayer({
            id: 'pazo-place-labels',
            type: 'symbol',
            source: 'pazo-places',
            minzoom: 13,
            layout: {
              'text-field': ['get', 'name'],
              'text-size': 11,
              'text-offset': [0, 1.6],
              'text-anchor': 'top',
              'text-allow-overlap': false,
            },
            paint: {
              'text-color': '#204E4A',
              'text-halo-color': '#FAF8F5',
              'text-halo-width': 1.5,
            },
          })

          // Original six local PAZO glTF models; a failure here must never
          // prevent pin selection, zooming or labels.
          try {
            map.addLayer({
              id: 'pazo-place-models',
              type: 'model',
              source: 'pazo-places',
              slot: 'top',
              minzoom: 12.5,
              layout: {
                'model-id': placeModelExpression(),
                'model-allow-density-reduction': false,
              },
              paint: {
                'model-scale': [12, 12, 12],
                'model-rotation': [0, 0, 0],
                'model-translation': [0, 0, 1],
                'model-opacity': 1,
                'model-type': 'location-indicator',
                'model-emissive-strength': 0.12,
              },
            })
          } catch {
            // Browser cannot render native glTF: overview DOM markers remain.
          }

          const handlePlaceClick = (event: any) => {
            const placeId = event.features?.[0]?.properties?.id
            if (placeId) onSelectPlaceRef.current(placeId)
          }

          const showPointer = () => {
            map.getCanvas().style.cursor = 'pointer'
          }

          const clearPointer = () => {
            map.getCanvas().style.cursor = ''
          }

          map.on('click', 'pazo-place-pins', handlePlaceClick)
          map.on('mouseenter', 'pazo-place-pins', showPointer)
          map.on('mouseleave', 'pazo-place-pins', clearPointer)

          if (map.getLayer('pazo-place-models')) {
            map.on('click', 'pazo-place-models', handlePlaceClick)
            map.on('mouseenter', 'pazo-place-models', showPointer)
            map.on('mouseleave', 'pazo-place-models', clearPointer)
          }

          syncUserMarker(
            map,
            mapboxgl,
            userLocationRef.current,
            langRef.current,
            Boolean(userLocationRef.current)
          )
          syncMarkerEmphasis()
        }
        map.on('style.load', attachPlaceLayers)

        map.on('error', (event: {error?:unknown}) => {
          const failure = classifyBasemapFailure(event?.error)
          if (!failure || cancelled) return
          basemapFailed = true
          setMapReady(false)
          globalThis.clearTimeout(loadingTimeout)
          // Never replace Standard or report a tile denial as a 3D permission.
          // A readable style alone does not establish access to its tiles.
          setMapNotice(failure === 'map_authorization'
            ? (langRef.current === 'es'
              ? 'Mapbox no autorizó la cartografía (HTTP 401/403). Revisa el token y los dominios permitidos.'
              : 'Mapbox did not authorize the map (HTTP 401/403). Check the token and allowed domains.')
            : (langRef.current === 'es'
              ? 'No se pudieron cargar recursos de Mapbox Standard. Comprueba tu conexión y reintenta.'
              : 'Mapbox Standard resources could not load. Check your connection and retry.'))
        })
      } catch {
        console.error('PAZO map initialization unavailable')
        if (!cancelled) {
          setError(
            lang === 'es'
              ? 'No pudimos cargar el mapa. La lista de lugares sigue disponible.'
              : 'We could not load the map. The places list is still available.'
          )
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      globalThis.clearTimeout(loadingTimeout)
      userMarkerRef.current?.remove?.()
      userMarkerRef.current = null
      for (const entry of placeMarkersRef.current) entry.marker.remove()
      placeMarkersRef.current = []
      mapRef.current?.remove?.()
      mapRef.current = null
    }
  }, [lang, immersive, mapAttempt])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    // The current places list can arrive before the remote map style finishes.
    // HTML annotations do not depend on remote Mapbox styles or tile status.
    if (window.mapboxgl) syncPlaceMarkers(map, window.mapboxgl, places)
    const source = map.getSource('pazo-places')
    source?.setData?.(toGeoJson(places))
  }, [places])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !focusPlaceRequest) return

    const place = places.find((item) => item.id === focusPlaceRequest.placeId)
    if (!place) return

    map.flyTo({
      center: [place.longitude, place.latitude],
      zoom: Math.max(map.getZoom?.() || 0, 16.2),
      pitch: 58,
      duration: 700,
    })
  }, [places, focusPlaceRequest, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !window.mapboxgl) return

    syncUserMarker(map, window.mapboxgl, userLocation, lang)
  }, [lang, userLocation])

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || !containerRef.current) return
    const observer = new ResizeObserver(() => mapRef.current?.resize?.())
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])


  return (
    <div data-pazo-map-state={error || mapNotice ? 'error' : mapReady ? 'ready' : 'loading'}
      data-pazo-map-style={PAZO_STANDARD_STYLE}
      className={immersive
      ? 'relative h-full w-full bg-[#E7ECEA]'
      : 'relative h-full min-h-64 w-full overflow-hidden rounded-[2rem] bg-[#E7ECEA]'}>
      {/* Mapbox's unlayered .mapboxgl-map position:relative overrides Tailwind
          utilities. Inline sizing keeps the initially empty container full height. */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        aria-label={lang === 'es' ? 'Mapa de lugares PAZO' : 'PAZO places map'} />
      {(error || mapNotice) && (
        <div role="status" className="pointer-events-auto absolute left-3 right-3 top-[38%] z-10 rounded-2xl bg-[#FFFCF6]/95 px-3 py-2 text-center text-[12px] font-semibold leading-snug text-[#204E4A] shadow-sm">
          <p>{error || mapNotice}</p>
          <button type="button" onClick={() => setMapAttempt(attempt => attempt + 1)}
            className="mt-2 rounded-full bg-[#204E4A] px-4 py-2 text-white focus-visible:bg-[#386963]">
            {lang === 'es' ? 'Reintentar mapa' : 'Retry map'}
          </button>
        </div>
      )}
    </div>
  )
}

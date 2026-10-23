import {classifyBasemapFailure} from './mapFailure'
import { PAZO_STREETS_STYLE } from './pazoBasemap'
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

    let basemapStage: 'standard' | 'streets' | 'raster' = 'standard'
    let vectorStyleErrors = 0
    const start = async () => {
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

        mapboxgl.accessToken = token

        const map = new mapboxgl.Map({
          container: containerRef.current,
          // Normal 3D basemap, with the existing raster fallback for outages.
          style: 'mapbox://styles/mapbox/standard',
          config: { basemap: {
            theme: 'faded',
            lightPreset: 'day',
            showHdRoads: false,
            show3dObjects: true,
            showPointOfInterestLabels: false,
            showTransitLabels: false,
          } },
          center: DEFAULT_CENTER,
          zoom: 10.5,
          pitch: 45,
          bearing: 0,
          antialias: true,
          attributionControl: true,
        })

        mapRef.current = map
        // Render PAZO location markers as real map annotations independently of
        // any basemap tiles, 3D layer capability or model request.
        syncPlaceMarkers(map, mapboxgl, placesRef.current)

        map.addControl(
          new mapboxgl.NavigationControl({ showCompass: false }),
          'top-right'
        )

        map.on('style.load', () => {
          if (cancelled) return

          // Terrain is only attempted on authorized vector Mapbox styles.
          // The emergency OSM raster is never represented as a 3D terrain map.
          if (basemapStage !== 'raster') {
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
        })

        map.on('error', (event: {error?:unknown}) => {
          const failure=classifyBasemapFailure(event?.error)
          if (!failure || cancelled) return
          // A single missing tile must not replace the entire authorized 3D
          // scene with a flat emergency streets raster. Prefer another Mapbox
          // VECTOR map first; go raster only after the vector options fail.
          const mapError = event.error as {url?:unknown;message?:unknown} | undefined
          const detail = String(mapError?.url || '') + ' ' + String(mapError?.message || '')
          const isStyleOrAuth = failure === 'map_authorization' || /\/styles\/|style.+(fail|load)/i.test(detail)
          if (basemapStage === 'standard' && (isStyleOrAuth || ++vectorStyleErrors >= 3)) {
            basemapStage = 'streets'
            map.setStyle('mapbox://styles/mapbox/streets-v12')
            return
          }
          if (basemapStage === 'streets' && (isStyleOrAuth || ++vectorStyleErrors >= 6)) {
            basemapStage = 'raster'
            map.setStyle(PAZO_STREETS_STYLE)
            return
          }
          if (basemapStage === 'raster') {
            // Individual community tile errors should never hide the whole map,
            // Places or the locally rendered PAZO markers.
            return
          }
          if(failure && !cancelled)setError(failure==='map_authorization'
            ?(langRef.current==='es'
              ?'Mapbox no autorizó las capas del mapa. Revisa que el token público permita este dominio.'
              :'Mapbox rejected basemap requests. Check the public token domain restrictions.')
            :(langRef.current==='es'
              ?'No pudimos descargar el mapa. La lista de lugares sigue disponible.'
              :'Map downloads are unavailable. The places list remains available.'))
          // No provider URL/message, token, coordinates or raw event in logs.
          if(failure)console.warn('PAZO basemap unavailable:',failure)
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
      userMarkerRef.current?.remove?.()
      userMarkerRef.current = null
      for (const entry of placeMarkersRef.current) entry.marker.remove()
      placeMarkersRef.current = []
      mapRef.current?.remove?.()
      mapRef.current = null
    }
  }, [lang])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    // The current places list can arrive before the remote map style finishes.
    // HTML annotations do not depend on remote Mapbox styles or tile status.
    if (window.mapboxgl) syncPlaceMarkers(map, window.mapboxgl, places)
    if (!map.isStyleLoaded?.()) return
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
  }, [places, focusPlaceRequest])

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

  if (error) {
    return (
      <div className={immersive
        ? "flex h-full w-full items-center justify-center bg-[#E7ECEA] p-5 text-center"
        : "flex h-full min-h-64 items-center justify-center rounded-[2rem] bg-[#E7ECEA] p-5 text-center"
      }>
        <div>
          <p className="text-xs font-black text-[#204E4A]">
            {lang === 'es' ? 'Mapa no disponible' : 'Map unavailable'}
          </p>
          <p className="mt-1 max-w-xs text-[10px] leading-relaxed text-[#5C7470]">
            {error}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={immersive
        ? "h-full w-full bg-[#E7ECEA]"
        : "h-full min-h-64 w-full overflow-hidden rounded-[2rem] bg-[#E7ECEA]"
      }
      aria-label={lang === 'es' ? 'Mapa de lugares PAZO' : 'PAZO places map'}
    />
  )
}

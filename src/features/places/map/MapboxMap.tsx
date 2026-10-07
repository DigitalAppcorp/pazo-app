import { useEffect, useRef, useState } from 'react'
import type { EphemeralLocation, PetPlace } from '../../../types/pazo'
import { loadMapboxGl } from './mapboxLoader'

interface MapboxMapProps {
  places: PetPlace[]
  selectedPlaceId?: string | null
  userLocation?: EphemeralLocation | null
  onSelectPlace: (placeId: string) => void
  lang: 'es' | 'en'
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
  selectedPlaceId,
  userLocation,
  onSelectPlace,
  lang,
}: MapboxMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)
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
          style: 'mapbox://styles/mapbox/standard',
          config: {
            basemap: {
              show3dObjects: false,
            },
          },
          center: DEFAULT_CENTER,
          zoom: 10.5,
          pitch: 32,
          bearing: 0,
          antialias: true,
          attributionControl: true,
        })

        mapRef.current = map

        map.addControl(
          new mapboxgl.NavigationControl({ showCompass: false }),
          'top-right'
        )

        map.on('load', () => {
          if (cancelled) return

          map.addSource('pazo-places', {
            type: 'geojson',
            data: toGeoJson(placesRef.current),
          })

          map.addLayer({
            id: 'pazo-place-pins',
            type: 'circle',
            source: 'pazo-places',
            paint: {
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                8,
                5,
                13,
                9,
                16,
                13,
              ],
              'circle-color': [
                'match',
                ['get', 'category'],
                'park',
                '#6E9F72',
                'trail',
                '#8B7B61',
                'food',
                '#D89B68',
                'veterinary',
                '#7D9CB8',
                'grooming',
                '#B88BA8',
                'pet_store',
                '#C3A14A',
                '#204E4A',
              ],
              'circle-stroke-color': '#FAF8F5',
              'circle-stroke-width': 2,
              'circle-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                11,
                0.96,
                13.5,
                0.52,
                15,
                0.12,
                16,
                0,
              ],
            },
          })

          map.addLayer({
            id: 'pazo-place-models',
            type: 'model',
            source: 'pazo-places',
            slot: 'top',
            minzoom: 13.25,
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

          map.on('click', 'pazo-place-models', handlePlaceClick)
          map.on('mouseenter', 'pazo-place-models', showPointer)
          map.on('mouseleave', 'pazo-place-models', clearPointer)

          syncUserMarker(
            map,
            mapboxgl,
            userLocationRef.current,
            langRef.current,
            Boolean(userLocationRef.current)
          )
        })

        map.on('error', (event: any) => {
          const message = event?.error?.message
          if (message) console.error('Mapbox error:', message)
        })
      } catch (mapError: any) {
        console.error('Error loading Mapbox:', mapError)
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
      mapRef.current?.remove?.()
      mapRef.current = null
    }
  }, [lang])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded?.()) return

    const source = map.getSource('pazo-places')
    source?.setData?.(toGeoJson(places))
  }, [places])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedPlaceId) return

    const place = places.find((item) => item.id === selectedPlaceId)
    if (!place) return

    map.flyTo({
      center: [place.longitude, place.latitude],
      zoom: Math.max(map.getZoom?.() || 0, 16.2),
      pitch: 58,
      duration: 700,
    })
  }, [places, selectedPlaceId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !window.mapboxgl) return

    syncUserMarker(map, window.mapboxgl, userLocation, lang)
  }, [lang, userLocation])

  if (error) {
    return (
      <div className="flex h-full min-h-64 items-center justify-center rounded-[2rem] bg-[#E7ECEA] p-5 text-center">
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
      className="h-full min-h-64 w-full overflow-hidden rounded-[2rem] bg-[#E7ECEA]"
      aria-label={lang === 'es' ? 'Mapa de lugares PAZO' : 'PAZO places map'}
    />
  )
}

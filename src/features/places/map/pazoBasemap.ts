/** Official Standard basemap, configured through the GL JS basemap schema. */
export const PAZO_STANDARD_STYLE = 'mapbox://styles/mapbox/standard'

export const PAZO_STANDARD_CONFIG = {
  theme: 'faded',
  lightPreset: 'day',
  showHdRoads: false,
  show3dObjects: true,
  showPointOfInterestLabels: false,
  showTransitLabels: false,
} as const

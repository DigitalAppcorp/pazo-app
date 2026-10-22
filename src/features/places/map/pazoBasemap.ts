/** Beta rescue basemap for PAZO. Mapbox's remote vector base rendered blank on
 * physical Android while the PAZO pins still appeared. Use one on-demand
 * raster streets source with explicit OSM attribution, preserving our existing
 * Mapbox GL 3D models, interaction and UI. No prefetch/offline downloads.
 *
 * OSM tile servers are community-funded, best effort and NOT a production SLA;
 * before broad public rollout move to a provider-backed tile service under an
 * explicit budget and PO approval (see docs/PAZO_F17_VISUAL_MAP_FIX_20261022.md).
 */
export const PAZO_STREETS_STYLE = {
  version: 8,
  name: 'PAZO Streets - temporary beta fallback',
  sources: {
    'pazo-streets-raster': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">&copy; OpenStreetMap contributors</a>',
      maxzoom: 19,
    },
  },
  layers: [
    { id: 'pazo-streets-background', type: 'background', paint: { 'background-color': '#EDF0E9' } },
    { id: 'pazo-streets', type: 'raster', source: 'pazo-streets-raster', paint: { 'raster-fade-duration': 150 } },
  ],
} as const

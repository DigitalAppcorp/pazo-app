import fs from 'node:fs'

const fail = (message) => {
  console.error(`PRODUCT ROLLOUT CHECK FAILED: ${message}`)
  process.exitCode = 1
}

const app = fs.readFileSync('src/App.tsx', 'utf8')
const experiment = fs.readFileSync(
  'src/features/places/validation/PlacesDemandExperiment.tsx',
  'utf8'
)

const requiredAppSignals = [
  "const PLACES_MAP_DEVELOPMENT_ONLY = import.meta.env.DEV",
  'PLACES_MAP_DEVELOPMENT_ONLY ? (',
  '<PlacesDemandExperiment',
]

for (const signal of requiredAppSignals) {
  if (!app.includes(signal)) {
    fail(`Places rollout guard missing from App.tsx: ${signal}`)
  }
}

for (const signal of [
  "const MODULE_KEY = 'places_map'",
  "const SOURCE = 'bottom_nav_map'",
  'recordFeatureExperimentView(MODULE_KEY, SOURCE)',
  'recordFeatureExperimentInterest(MODULE_KEY, SOURCE)',
]) {
  if (!experiment.includes(signal)) {
    fail(`Places demand experiment contract missing: ${signal}`)
  }
}

if (experiment.includes('navigator.geolocation')) {
  fail('Places demand fake door must not request geolocation.')
}

if (/MapboxMap|VITE_MAPBOX_ACCESS_TOKEN/.test(experiment)) {
  fail('Places demand fake door must not mount or configure Mapbox.')
}

if (!process.exitCode) {
  console.log('Product rollout checks: PASS')
}

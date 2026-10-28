// Same real App -> disposable PostgreSQL bridge, with first-pet creation and
// server-accepted campaign attribution. No separate production implementation.
process.env.PAZO_CONTEXTUAL_TEST='true'
process.env.PAZO_UTILITY_OUTPUT=process.env.PAZO_UTILITY_OUTPUT||'artifacts/issue142-contextual'
await import('./first-utility-browser.mjs')

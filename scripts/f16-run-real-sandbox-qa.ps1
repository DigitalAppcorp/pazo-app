# PAZO F16 — Real application, real PayPal Sandbox, NO Live.
# Run from the branch f13/section-titles-20261012 checkout on Windows.
# No secret/private key is added to disk or printed. The key below is the
# PUBLIC Supabase publishable key (already embedded in the hosted web app).
$ErrorActionPreference = 'Stop'
if (-not (Test-Path '.\package.json') -or -not (Test-Path '.\src\features\supporter\components\SandboxCheckoutQaPanel.tsx')) {
  throw 'Ejecuta el script desde la carpeta raiz del repositorio PAZO.'
}
$branch = (git branch --show-current).Trim()
if ($branch -ne 'f13/section-titles-20261012') {
  throw "Rama incorrecta: $branch. Debe ser f13/section-titles-20261012. No se inicio PAZO."
}
$env:VITE_PAZO_F16_SANDBOX_QA_UI = 'true'
$env:VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED = 'true'
$env:VITE_SUPABASE_URL = 'https://mrybvqdebbgcayuvgkkr.supabase.co'
if (-not $env:VITE_SUPABASE_PUBLISHABLE_KEY) {
  $env:VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_eSU1LzulS94igbbS0oXdDw_OqeaiBeg'
}
Write-Host 'PAZO real — QA Sandbox de cuatro beneficios'
Write-Host 'URL: http://localhost:5173/#/account/supporter'
Write-Host 'Solo se permiten PayPal Sandbox y la cuenta de pruebas.'
Write-Host 'Al aprobar en PayPal, vuelve manualmente a esta URL para verificar el cargo.'
npm run dev -- --host localhost --port 5173 --strictPort

# PAZO pre-preview offline check; no Git push, deployment, payment, SQL or Live.
$ErrorActionPreference = 'Stop'
if (-not (Test-Path '.\package.json') -or -not (Test-Path '.\AGENTS.md')) {
  throw 'Ejecuta desde la carpeta raiz del repositorio PAZO.'
}
$branch = (git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $branch -ne 'f13/section-titles-20261012') {
  throw "Rama incorrecta: $branch. No se iniciaron las pruebas."
}
$dirty = @(git status --porcelain)
if ($LASTEXITCODE -ne 0 -or $dirty.Count -gt 0) {
  throw 'Existen cambios locales que deben conservarse. No se ejecuto ningun cambio.'
}
$sha=(git rev-parse HEAD).Trim()
Write-Host "PREPREVIEW PAZO — SHA $sha"
Write-Host 'No se publica Preview ni se realizan cobros.'
if (-not (Test-Path '.\node_modules')) {
  & npm.cmd ci
  if ($LASTEXITCODE -ne 0) { throw 'npm ci fallo.' }
}
$oldQa=$env:VITE_PAZO_F16_SANDBOX_QA_UI
$oldBenefits=$env:VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED
try {
  $env:VITE_PAZO_F16_SANDBOX_QA_UI='false'
  $env:VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED='false'
  & npm.cmd run verify:prepreview
  if ($LASTEXITCODE -ne 0) { throw 'PREPREVIEW_CHECK_FAILED: no autoriza publicacion.' }
  Write-Host "PREPREVIEW_CODE_PASS — SHA $sha"
  Write-Host 'Esto no sustituye QA visual, Sandbox financiero o PWA instalada.'
} finally {
  $env:VITE_PAZO_F16_SANDBOX_QA_UI=$oldQa
  $env:VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED=$oldBenefits
}

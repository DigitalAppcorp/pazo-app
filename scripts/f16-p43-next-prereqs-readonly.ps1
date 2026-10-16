# PAZO F16-P43 — local Vercel scope + installer availability (read only).
# Does NOT run login, link, env ls/pull, Supabase CLI auth, db dump or any SQL.
# Do not use transcript/debug tracing; account names and CLI errors are discarded.
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-LocalTool([string]$name) {
  $cmd = Get-Command -Name $name -ErrorAction SilentlyContinue | Select-Object -First 1
  return ($null -ne $cmd)
}

Write-Output ('NODE=' + $(if (Test-LocalTool 'node') { 'AVAILABLE' } else { 'MISSING' }))
Write-Output ('NPM=' + $(if (Test-LocalTool 'npm') { 'AVAILABLE' } else { 'MISSING' }))
Write-Output ('SCOOP=' + $(if (Test-LocalTool 'scoop') { 'AVAILABLE' } else { 'MISSING' }))
Write-Output ('PSQL=' + $(if (Test-LocalTool 'psql') { 'AVAILABLE' } else { 'MISSING' }))
Write-Output ('SUPABASE_CLI=' + $(if (Test-LocalTool 'supabase') { 'AVAILABLE' } else { 'MISSING' }))

if (-not (Test-LocalTool 'vercel')) {
  Write-Output 'VERCEL_SESSION=CLI_MISSING'
  Write-Output 'VERCEL_DIGITALAPP_TEAM=NOT_CHECKED'
  Write-Output 'P43_TOOLING_SCOPE_READ_ONLY_NO_SECRETS'
  return
}

# Vercel whoami/teams ls are metadata-only requests; output stays local.
# Never print stdout/stderr, token, account email, team IDs or env vars.
$vercelCmd = Get-Command -Name 'vercel' -ErrorAction Stop | Select-Object -First 1
try {
  $whoami = @(& $vercelCmd.Source whoami 2>&1) | Out-String
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    Write-Output 'VERCEL_SESSION=NOT_VERIFIED'
    Write-Output 'VERCEL_DIGITALAPP_TEAM=NOT_CHECKED'
  } else {
    Write-Output 'VERCEL_SESSION=AUTHENTICATED'
    $teamListing = @(& $vercelCmd.Source teams ls 2>&1) | Out-String
    if ($LASTEXITCODE -ne 0) {
      Write-Output 'VERCEL_DIGITALAPP_TEAM=UNVERIFIED'
    } elseif ($teamListing -match '(?i)\bdigitalapp\b') {
      Write-Output 'VERCEL_DIGITALAPP_TEAM=LISTED'
    } else {
      Write-Output 'VERCEL_DIGITALAPP_TEAM=NOT_LISTED'
    }
  }
} catch {
  Write-Output 'VERCEL_SESSION=CHECK_FAILED'
  Write-Output 'VERCEL_DIGITALAPP_TEAM=UNVERIFIED'
}
Write-Output 'P43_TOOLING_SCOPE_READ_ONLY_NO_SECRETS'

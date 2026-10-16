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

function Get-P43VercelFailureCategory([string]$detail) {
  # Classify the local CLI output IN MEMORY. Never print it: may include
  # account identifiers or credentials in some environments.
  if ($detail -match '(?i)not.logged.in|not.authenticated|please.log.in|login.required|run.*vercel.login|token.*expired|session.*expired|no.*credentials') {
    return 'LOGIN_REQUIRED_OR_EXPIRED'
  }
  if ($detail -match '(?i)403|forbidden|permission.denied|not.authorized|access.denied|no.access.to.*scope') {
    return 'FORBIDDEN_OR_SCOPE'
  }
  if ($detail -match '(?i)ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNREFUSED|CERTIFICATE|TLS|network.error|unable.to.connect|timed.out') {
    return 'NETWORK_OR_TLS'
  }
  if ($detail -match '(?i)unknown.command|unknown.option|unrecognized.option|invalid.argument|command.not.found') {
    return 'CLI_OR_ARGUMENTS'
  }
  return 'UNKNOWN'
}

# Vercel whoami/teams ls are metadata-only requests; output stays local.
# Never print stdout/stderr, token, account email, team IDs or env vars.
$vercelCmd = Get-Command -Name 'vercel' -ErrorAction Stop | Select-Object -First 1
try {
  $whoami = @(& $vercelCmd.Source whoami 2>&1) | Out-String
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    Write-Output 'VERCEL_SESSION=NOT_VERIFIED'
    Write-Output ('VERCEL_SESSION_REASON=' + (Get-P43VercelFailureCategory $whoami))
    Write-Output 'VERCEL_DIGITALAPP_TEAM=NOT_CHECKED'
  } else {
    Write-Output 'VERCEL_SESSION=AUTHENTICATED'
    Write-Output 'VERCEL_SESSION_REASON=NONE'
    $teamListing = @(& $vercelCmd.Source teams ls 2>&1) | Out-String
    if ($LASTEXITCODE -ne 0) {
      Write-Output 'VERCEL_DIGITALAPP_TEAM=UNVERIFIED'
      Write-Output ('VERCEL_TEAM_REASON=' + (Get-P43VercelFailureCategory $teamListing))
    } elseif ($teamListing -match '(?i)\bdigitalapp\b') {
      Write-Output 'VERCEL_DIGITALAPP_TEAM=LISTED'
      Write-Output 'VERCEL_TEAM_REASON=NONE'
    } else {
      Write-Output 'VERCEL_DIGITALAPP_TEAM=NOT_LISTED'
      Write-Output 'VERCEL_TEAM_REASON=NONE'
    }
  }
} catch {
  Write-Output 'VERCEL_SESSION=CHECK_FAILED'
  Write-Output 'VERCEL_SESSION_REASON=EXECUTION_ERROR'
  Write-Output 'VERCEL_DIGITALAPP_TEAM=UNVERIFIED'
}
Write-Output 'P43_TOOLING_SCOPE_READ_ONLY_NO_SECRETS'

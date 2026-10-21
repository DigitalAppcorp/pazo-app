# PAZO F16-P43 — DB access probe ONLY. It cannot provision a key or mutate DB.
# Requires PowerShell 7+, PostgreSQL psql client, and a trusted root CA file.
# Credentials are entered with a hidden prompt and passed only in psql's child
# environment, never in process arguments, SQL text, command history or logs.
# The child environment contains the password while psql is running: use only
# a trusted operator workstation, and never enable shell/session tracing.
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('Direct', 'SessionPooler')]
  [string]$Mode,

  [Parameter(Mandatory = $true)]
  [string]$DbHost,

  [Parameter(Mandatory = $true)]
  [string]$DbUser,

  [Parameter(Mandatory = $true)]
  [string]$CaCertificatePath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projectRef = 'mrybvqdebbgcayuvgkkr'
$probeFile = Join-Path $PSScriptRoot '..\supabase\queries\f16_p42_provisioning_structural_preflight_READ_ONLY.sql'

# Do not accept full connection URIs; they may contain a password.
if ($Mode -eq 'Direct') {
  if ($DbHost -cne "db.$projectRef.supabase.co" -or $DbUser -cne 'postgres') {
    throw 'Direct mode requires the exact PAZO host and role from Supabase Connect.'
  }
} else {
  # Obtain the pooler hostname in Supabase Dashboard > Connect; do NOT guess it.
  if ($DbHost -cnotmatch '^aws-[a-z0-9-]+\.pooler\.supabase\.com$' -or
      $DbUser -cne "postgres.$projectRef") {
    throw 'SessionPooler mode requires the PAZO session-pooler host and role.'
  }
}

$ca = Get-Item -LiteralPath $CaCertificatePath -ErrorAction Stop
if ($ca.PSIsContainer) { throw 'CA certificate path must reference a trusted file.' }
$caFullPath = $ca.FullName
$probe = Get-Item -LiteralPath $probeFile -ErrorAction Stop
if ($probe.PSIsContainer) { throw 'P43 read-only SQL file is missing.' }

$psql = Get-Command -Name 'psql' -CommandType Application -ErrorAction Stop |
  Select-Object -First 1
if (-not $psql) { throw 'psql is required (PostgreSQL client tools).' }

Write-Host 'PAZO P43: PostgreSQL READ-ONLY connection and P42 structural probe.'
Write-Host 'No keys will be generated, and no database state will be changed.'
Write-Host 'Enter the EXISTING database password, not the Supabase account password.'
$securePassword = Read-Host 'Existing PAZO database password (hidden)' -AsSecureString
if (-not $securePassword -or $securePassword.Length -eq 0) {
  throw 'No password provided. No database action attempted.'
}

$process = $null
$psi = $null
$pointer = [IntPtr]::Zero
try {
  $psi = [System.Diagnostics.ProcessStartInfo]::new()
  $psi.FileName = $psql.Source
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true

  foreach ($arg in @(
    '-X', '-qAt', '-w', '-v', 'ON_ERROR_STOP=1',
    '-h', $DbHost, '-p', '5432', '-U', $DbUser, '-d', 'postgres',
    '-f', $probe.FullName
  )) {
    [void]$psi.ArgumentList.Add($arg)
  }
  $psi.Environment['PGSSLMODE'] = 'verify-full'
  $psi.Environment['PGSSLROOTCERT'] = $caFullPath
  $psi.Environment['PGCONNECT_TIMEOUT'] = '10'
  $psi.Environment['PGAPPNAME'] = 'pazo_p43_read_only_access_probe'
  $psi.Environment['PGOPTIONS'] = '-c default_transaction_read_only=on -c statement_timeout=15000'
  $psi.Environment.Remove('PGSERVICE') | Out-Null

  # The unavoidable plaintext copy exists briefly in this trusted process,
  # never in argument strings or files. Do not run in shared untrusted sessions.
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  $localPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  $psi.Environment['PGPASSWORD'] = $localPassword
  Remove-Variable -Name localPassword -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  $pointer = [IntPtr]::Zero

  $process = [System.Diagnostics.Process]::new()
  $process.StartInfo = $psi
  if (-not $process.Start()) { throw 'psql did not start.' }
  # Remove our own reference. The child retains its environment until exit.
  $psi.Environment.Remove('PGPASSWORD') | Out-Null

  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  if ($process.ExitCode -ne 0) {
    # Deliberately do not print raw stderr, which is uncontrolled tool output.
    $category = 'UNKNOWN'
    if ($stderr -match 'password authentication failed|no password supplied') {
      $category = 'AUTHENTICATION'
    } elseif ($stderr -match 'certificate|SSL|TLS') {
      $category = 'TLS_CERTIFICATE'
    } elseif ($stderr -match 'could not translate host|network is unreachable|timeout|Connection refused') {
      $category = 'NETWORK_OR_HOST'
    } elseif ($stderr -match 'P42|permission denied|ERROR') {
      $category = 'PREFLIGHT_OR_ROLE'
    }
    throw "P43 READ_ONLY_FAIL category=$category; no changes made. Review local connection settings."
  }
  if ($stdout -notmatch 'P42_STRUCTURAL_PASS_NO_PROVISIONING_AUTHORITY') {
    throw 'P43 READ_ONLY_FAIL: expected structural result was not returned.'
  }
  Write-Host 'P43_DB_ACCESS_READ_ONLY_PASS'
  Write-Host 'P42_STRUCTURAL_PASS_NO_PROVISIONING_AUTHORITY'
  Write-Host 'Next: stop. Do not generate or store P42_V1 until the validity window is approved.'
} finally {
  if ($pointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
  if ($psi) { $psi.Environment.Remove('PGPASSWORD') | Out-Null }
  if ($process) { $process.Dispose() }
  if ($securePassword) { $securePassword.Dispose() }
}

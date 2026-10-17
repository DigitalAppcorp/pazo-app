# PAZO F16/P42 — NEW one-shot TLS session-pooler connection check.
# NOT P43. Preparation is not authorization: a NEW explicit PO GO is required.
# Client libpq enforces TLS verify-full; SQL checks only database/read-only.
# Never uses backend TLS metadata as evidence for the client-to-pooler hop.
# Password entered locally at a hidden prompt; do NOT allow Codex to type it.
# Never run in CI, remote agents, shared desktops, or recorded shells.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)]
  [string]$DbHost,
  [Parameter(Mandatory=$true)]
  [string]$CaCertificatePath,
  [switch]$ExecuteApprovedReadOnly,
  [string]$AttemptId
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Files contain only an exclusive claim and a static result, never credentials.
function New-P42ReadOnlyAttempt {
  param([string]$RootDirectory, [string]$Id)
  if ($Id -cnotmatch '^[A-Z0-9][A-Z0-9-]{7,63}$' -or
      -not [IO.Path]::IsPathFullyQualified($RootDirectory)) { throw 'invalid attempt' }
  [void][IO.Directory]::CreateDirectory($RootDirectory)
  $result = Join-Path $RootDirectory "p42-tls-$Id.result.txt"
  if ([IO.File]::Exists($result)) { throw 'attempt result already exists' }
  $lock = Join-Path $RootDirectory "p42-tls-$Id.lock"
  $stream = [IO.File]::Open($lock,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  $stream.Dispose()
  return $result
}

$projectRef = 'mrybvqdebbgcayuvgkkr'
$expectedUser = "postgres.$projectRef"
$stage = 'INPUT'
$securePassword = $null
$process = $null
$psi = $null
$ptr = [IntPtr]::Zero
$didStart = $false
$ownsAttemptLock = $false
$resultFile = $null
$probeMarker = $null

try {
  # Host comes only from Supabase Dashboard Connect > Session pooler; never
  # accept a URI (which might contain credentials), arbitrary domain or port.
  if ($DbHost -cnotmatch '^aws-[a-z0-9-]+\.pooler\.supabase\.com$') {
    throw 'invalid host'
  }
  if ($env:GITHUB_ACTIONS -eq 'true' -or $env:CI -eq 'true') {
    throw 'not a private workstation'
  }
  $stage = 'AUTHORIZATION'
  if (-not $ExecuteApprovedReadOnly -or
      $AttemptId -cnotmatch '^[A-Z0-9][A-Z0-9-]{7,63}$') {
    throw 'new explicit authorization and attempt id required'
  }
  $stage = 'INPUT'
  $caPath = [IO.Path]::GetFullPath($CaCertificatePath)
  if (-not [IO.Path]::IsPathFullyQualified($CaCertificatePath) -or
      -not [IO.File]::Exists($caPath)) { throw 'missing CA file' }
  $caInfo = [IO.FileInfo]::new($caPath)
  if ($caInfo.Length -lt 100 -or $caInfo.Length -gt 65536 -or
      ($caInfo.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw 'untrusted CA file path'
  }
  $stage = 'PSQL_CLIENT'
  $psql = Get-Command -Name psql -CommandType Application -ErrorAction Stop |
    Select-Object -First 1
  if ($null -eq $psql) { throw 'psql not installed' }

  $stage = 'ATTEMPT_CLAIM'
  if ([string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) { throw 'private state directory missing' }
  $resultFile = New-P42ReadOnlyAttempt -RootDirectory (Join-Path $env:LOCALAPPDATA 'PAZO/CodexOps') -Id $AttemptId
  $ownsAttemptLock = $true

  Write-Host 'P42: una conexión READ ONLY, PostgreSQL Session pooler, SSL verify-full.'
  Write-Host 'Sin P43, sin lecturas P42 ni escrituras; aborta si no tienes la contraseña NUEVA ya establecida por el propietario.'
  Write-Host 'Introduce tú la contraseña en esta consola local; no la compartas con Codex.'
  $stage = 'AUTH_PROMPT'
  $securePassword = Read-Host 'Contraseña de PostgreSQL (entrada oculta)' -AsSecureString
  if ($null -eq $securePassword -or $securePassword.Length -eq 0) {
    throw 'empty password'
  }

  # One SQL call, one read-only transaction. Output has no server names,
  # usernames, data, key material or certificate metadata.
  $query = @'
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '5000ms';
SELECT CASE WHEN current_database() = 'postgres'
  AND current_setting('transaction_read_only') = 'on'
  THEN 'P42_SESSION_POOLER_TLS_VERIFY_FULL_READ_ONLY_PASS'
  ELSE 'P42_SESSION_POOLER_READONLY_CONTRACT_BLOCKED'
END;
ROLLBACK;
'@

  $psi = [System.Diagnostics.ProcessStartInfo]::new()
  $psi.FileName = $psql.Source
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  foreach ($arg in @('-X','-qAt','-w','-v','ON_ERROR_STOP=1','-c',$query)) {
    [void]$psi.ArgumentList.Add($arg)
  }
  # Ignore stale PG configurations: route to the exact validated project
  # tenant on port 5432, and force libpq CA + host verification.
  foreach ($name in @('PGHOSTADDR','PGSERVICE','PGSERVICEFILE',
       'PGOPTIONS','PGTARGETSESSIONATTRS','PGREQUIRESSL','PGPASSFILE',
       'PGPASSWORD','PGSSLMODE','PGSSLROOTCERT','PGUSER','PGHOST',
       'PGPORT','PGDATABASE')) {
    [void]$psi.Environment.Remove($name)
  }
  $psi.Environment['PGHOST'] = $DbHost
  $psi.Environment['PGPORT'] = '5432'
  $psi.Environment['PGUSER'] = $expectedUser
  $psi.Environment['PGDATABASE'] = 'postgres'
  # Force TLS even if a local GSSAPI setup exists; never silently prefer GSS.
  $psi.Environment['PGGSSENCMODE'] = 'disable'
  $psi.Environment['PGSSLMODE'] = 'verify-full'
  $psi.Environment['PGSSLMINPROTOCOLVERSION'] = 'TLSv1.2'
  $psi.Environment['PGSSLMAXPROTOCOLVERSION'] = 'TLSv1.3'
  $psi.Environment['PGSSLNEGOTIATION'] = 'postgres'
  $psi.Environment['PGSSLROOTCERT'] = $caPath
  $psi.Environment['PGCONNECT_TIMEOUT'] = '10'
  $psi.Environment['PGAPPNAME'] = 'pazo_p42_new_tls_readonly_once'
  $psi.Environment['PGOPTIONS'] =
    '-c default_transaction_read_only=on -c statement_timeout=5000 -c lock_timeout=1000'
  # No .pgpass or service config; only the password manually supplied above.
  $nonexistentPassfile = Join-Path ([IO.Path]::GetTempPath()) 'pazo-p42-no-pgpass-file-never-created'
  if ([IO.File]::Exists($nonexistentPassfile)) { throw 'unexpected passfile' }
  $psi.Environment['PGPASSFILE'] = $nonexistentPassfile

  # The password lives briefly in the trusted child process environment,
  # not argv, SQL, GitHub, a file or stdout. Local operator only.
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  $psi.Environment['PGPASSWORD'] = $plain
  Remove-Variable plain -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  $ptr = [IntPtr]::Zero

  $stage = 'ONE_SHOT_CONNECT'
  $process = [System.Diagnostics.Process]::new()
  $process.StartInfo = $psi
  if (-not $process.Start()) { throw 'psql could not start' }
  $didStart = $true
  [void]$psi.Environment.Remove('PGPASSWORD')
  $stdoutTask = $process.StandardOutput.ReadToEndAsync()
  $stderrTask = $process.StandardError.ReadToEndAsync()
  $stage = 'WAIT_FOR_EXIT'
  if (-not $process.WaitForExit(25000)) {
    $stage = 'PROCESS_TIMEOUT'
    $process.Kill($true)
    $process.WaitForExit()
    throw 'time limit exceeded'
  }
  $stage = 'OUTPUT_READ'
  $out = $stdoutTask.GetAwaiter().GetResult()
  $err = $stderrTask.GetAwaiter().GetResult()
  if ($process.ExitCode -ne 0) {
    $stage = 'PSQL_EXIT_NONZERO'
    throw 'psql failed'
  }
  if ($out.Trim() -ceq 'P42_SESSION_POOLER_READONLY_CONTRACT_BLOCKED') {
    $stage = 'READONLY_CONTRACT'
    throw 'database or readonly contract failed'
  }
  if ($out.Trim() -cne 'P42_SESSION_POOLER_TLS_VERIFY_FULL_READ_ONLY_PASS') {
    $stage = 'UNEXPECTED_OUTPUT'
    throw 'TLS or readonly contract failed'
  }
  $stage = 'PASSED'
  $probeMarker = 'P42_SESSION_POOLER_TLS_VERIFY_FULL_READ_ONLY_PASS'
  Write-Output $probeMarker
  Write-Output 'P42_HOSTED_WRITE_PERMISSION_NOT_VERIFIED'
  Write-Output 'P42_NO_PROVISIONING_NO_PAYMENTS'
} catch {
  # Never echo raw psql errors: they can carry hosts/usernames/paths.
  if ($didStart) {
    $probeMarker = "P42_TLS_READ_ONLY_ONCE_BLOCKED_AFTER_CONNECTION_ATTEMPT_$stage"
  } else {
    $probeMarker = "P42_TLS_READ_ONLY_ONCE_BLOCKED_PRECHECK_$stage"
  }
  Write-Output $probeMarker
  Write-Output 'P42_NO_PROVISIONING_NO_PAYMENTS'
} finally {
  if ($ptr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
  if ($null -ne $psi) { [void]$psi.Environment.Remove('PGPASSWORD') }
  if ($null -ne $process) {
    if ($didStart -and -not $process.HasExited) { $process.Kill($true);$process.WaitForExit() }
    $process.Dispose()
  }
  if ($null -ne $securePassword) { $securePassword.Dispose() }
  if ($ownsAttemptLock -and $null -ne $probeMarker) {
    try {
      $resultStream = [IO.File]::Open($resultFile,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
      try {
        $resultBytes = [Text.Encoding]::ASCII.GetBytes($probeMarker + [Environment]::NewLine)
        $resultStream.Write($resultBytes,0,$resultBytes.Length)
      } finally { $resultStream.Dispose() }
    } catch {
      Write-Output 'P42_TLS_READ_ONLY_ONCE_BLOCKED_RESULT_RECORD'
    }
  }
}

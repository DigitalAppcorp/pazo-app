# PAZO F16/P42 — local CA certificate preflight only.
# Offline, read-only. NEVER connects to Supabase, PostgreSQL, PayPal or GitHub.
# Does not import a certificate into the OS trust store or print its content.
# Does NOT prove the certificate is Supabase's, nor that TLS verify-full succeeds.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)]
  [string]$CaCertificatePath
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try {
  if (-not [IO.Path]::IsPathFullyQualified($CaCertificatePath)) {
    throw 'path'
  }
  $path = [IO.Path]::GetFullPath($CaCertificatePath)
  if (-not [IO.File]::Exists($path)) { throw 'missing' }
  $info = [IO.FileInfo]::new($path)
  if ($info.Length -lt 100 -or $info.Length -gt 65536) { throw 'size' }
  if ($info.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'reparse' }

  $bytes = [IO.File]::ReadAllBytes($path)
  try {
    # Supabase provides a downloadable root CA certificate (PEM or DER).
    # Detect private-key material in any text certificate, fail closed.
    $asText = [Text.Encoding]::ASCII.GetString($bytes)
    if ($asText -match '-----BEGIN [^-]*PRIVATE KEY-----') { throw 'private' }
    if ($asText -match '-----BEGIN CERTIFICATE-----') {
      if (([regex]::Matches($asText,'-----BEGIN CERTIFICATE-----')).Count -ne 1 -or
          ([regex]::Matches($asText,'-----END CERTIFICATE-----')).Count -ne 1) {
        throw 'chain'
      }
      $cert = [Security.Cryptography.X509Certificates.X509Certificate2]::CreateFromPemFile($path)
    } else {
      $cert = [Security.Cryptography.X509Certificates.X509Certificate2]::new($bytes)
    }
    try {
      if ($cert.HasPrivateKey) { throw 'private' }
      $now = [DateTime]::UtcNow
      if ($cert.NotBefore.ToUniversalTime() -gt $now -or
          $cert.NotAfter.ToUniversalTime() -le $now) { throw 'validity' }
      $basic = $cert.Extensions |
        Where-Object { $_ -is [Security.Cryptography.X509Certificates.X509BasicConstraintsExtension] } |
        Select-Object -First 1
      if ($null -eq $basic -or -not $basic.CertificateAuthority) { throw 'not-ca' }
      $keyUsage = $cert.Extensions |
        Where-Object { $_ -is [Security.Cryptography.X509Certificates.X509KeyUsageExtension] } |
        Select-Object -First 1
      if ($null -ne $keyUsage -and
          -not ($keyUsage.KeyUsages -band
            [Security.Cryptography.X509Certificates.X509KeyUsageFlags]::KeyCertSign)) {
        throw 'not-signing-ca'
      }
      Write-Output 'P42_LOCAL_CA_FILE_STRUCTURAL_PASS_OFFLINE'
      Write-Output 'P42_CA_PROVENANCE_AND_SERVER_TLS_VERIFY_FULL_NOT_CHECKED'
      Write-Output 'P42_HOSTED_DB_WRITE_UNVERIFIED_NO_PROVISIONING'
    } finally {
      if ($null -ne $cert) { $cert.Dispose() }
    }
  } finally {
    if ($bytes) { [Array]::Clear($bytes,0,$bytes.Length) }
  }
} catch {
  # Errors deliberately omit path, certificate metadata and exception details.
  throw 'P42_LOCAL_CA_FILE_CHECK_BLOCKED: invalid/unreadable/non-CA file; no network or database changes'
}

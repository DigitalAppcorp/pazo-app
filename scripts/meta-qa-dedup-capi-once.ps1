#requires -Version 5.1
<#
.SYNOPSIS
  One manual synthetic CAPI event to the PAZO QA dataset, for the dedup test.
.DESCRIPTION
  The owner runs this once per EventId, after reading the ID on the QA site.
  The token is typed into a hidden prompt, stays in memory and is never logged.
  Dataset is fixed to PAZO QA. See docs/marketing/META_PIXEL_DIAGNOSIS_20261101.md.
.EXAMPLE
  powershell -NoProfile -File .\scripts\meta-qa-dedup-capi-once.ps1 -EventId <id> -TestEventCode <code>
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)]
  [ValidatePattern('^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$')]
  [string]$EventId,
  [Parameter(Mandatory=$true)]
  [ValidatePattern('^TEST[A-Za-z0-9]{1,40}$')]
  [string]$TestEventCode,
  [string]$ApiVersion = 'v26.0'
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
if ($ApiVersion -notmatch '^v[0-9]{2,3}\.0$') { throw 'ApiVersion no valida.' }
$dataset = '1090116830295088'
$sha = [Security.Cryptography.SHA256]::Create()
$bytes = [Text.Encoding]::UTF8.GetBytes('pazo-qa-synthetic@example.invalid')
$hash = -join ($sha.ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') })
$payload = @{
  data = @(@{
    event_name = 'CompleteRegistration'
    event_time = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    event_id = $EventId.ToLowerInvariant()
    action_source = 'website'
    event_source_url = 'https://pazo-meta-qa-20261031.vercel.app/'
    user_data = @{
      em = @($hash)
      client_user_agent = 'Mozilla/5.0 (PAZO QA synthetic dedup test)'
    }
  })
  test_event_code = $TestEventCode
} | ConvertTo-Json -Depth 6 -Compress
$secure = Read-Host -AsSecureString 'Token QA de CAPI (no se muestra)'
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  if ([string]::IsNullOrWhiteSpace($token)) { throw 'Token vacio.' }
  try {
    $reply = Invoke-RestMethod -Method Post -TimeoutSec 20 `
      -Uri "https://graph.facebook.com/$ApiVersion/$dataset/events" `
      -Headers @{ Authorization = "Bearer $token" } `
      -ContentType 'application/json' -Body $payload
  } catch {
    # The exception may echo request details, so only the status is shown.
    Write-Output ('META_QA_CAPI_ERROR http=' + [int]$_.Exception.Response.StatusCode)
    exit 1
  }
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  $token = $null
}
Write-Output ('META_QA_CAPI events_received=' + $reply.events_received)
Write-Output ('META_QA_CAPI messages=' + (@($reply.messages) | ConvertTo-Json -Compress))
Write-Output ('META_QA_CAPI fbtrace_id=' + $reply.fbtrace_id)
Write-Output 'Esto solo prueba aceptacion de la API. La deduplicacion se confirma en Probar eventos.'

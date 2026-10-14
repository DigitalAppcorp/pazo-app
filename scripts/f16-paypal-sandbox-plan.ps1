# F16 — Read-only PayPal Sandbox plan or webhook check. NEVER saves secrets.
param(
    [ValidateSet('Plan', 'Webhooks', 'Destination')]
    [string]$Check = 'Plan'
)
# It prompts in PowerShell and removes process environment variables after node exits.
$ErrorActionPreference = 'Stop'
$clientId = Read-Host 'PayPal Sandbox Client ID'
$secureSecret = Read-Host 'PayPal Sandbox Client Secret (hidden)' -AsSecureString
$ptr = [IntPtr]::Zero
$previousId = [Environment]::GetEnvironmentVariable('PAYPAL_SANDBOX_CLIENT_ID','Process')
$previousSecret = [Environment]::GetEnvironmentVariable('PAYPAL_SANDBOX_CLIENT_SECRET','Process')
try {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret)
    [Environment]::SetEnvironmentVariable('PAYPAL_SANDBOX_CLIENT_ID', $clientId, 'Process')
    [Environment]::SetEnvironmentVariable('PAYPAL_SANDBOX_CLIENT_SECRET', [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr), 'Process')
    Push-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
    try {
        if ($Check -eq 'Destination') {
            & node 'scripts/f16-paypal-verify-webhook-destination-readonly.mjs'
        } elseif ($Check -eq 'Webhooks') {
            & node 'scripts/f16-paypal-verify-webhooks-readonly.mjs'
        } else {
            & node 'scripts/f16-paypal-verify-plan-readonly.mjs'
        }
        if ($LASTEXITCODE -ne 0) { Write-Warning 'Preflight BLOCKED or needs review. No PayPal data was changed.' }
    } finally {
        Pop-Location
    }
} finally {
    [Environment]::SetEnvironmentVariable('PAYPAL_SANDBOX_CLIENT_ID', $previousId, 'Process')
    [Environment]::SetEnvironmentVariable('PAYPAL_SANDBOX_CLIENT_SECRET', $previousSecret, 'Process')
    if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
    $secureSecret = $null
}

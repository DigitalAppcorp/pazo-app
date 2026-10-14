# F16 — PayPal Sandbox check; the ApplyWebhook operation is a separately approved single PATCH. NEVER saves secrets.
param(
    [ValidateSet('Plan', 'Webhooks', 'Destination', 'Resources', 'ApplyWebhook')]
    [string]$Check = 'Plan'
)
# It prompts in PowerShell and removes process environment variables after node exits.
$ErrorActionPreference = 'Stop'
if ($Check -eq 'ApplyWebhook') {
    Write-Host 'F16 Sandbox ONLY: update EXISTING webhook 6N7889790V1467139.'
    Write-Host 'This does not create subscriptions or change PayPal Live.'
    $approval = Read-Host 'To apply one PATCH to URL and event subscriptions, type APLICAR'
    if ($approval -cne 'APLICAR') { Write-Warning 'Cancelled. No PayPal configuration was changed.'; exit 1 }
}
$clientId = Read-Host 'PayPal Sandbox Client ID'
$secureSecret = Read-Host 'PayPal Sandbox Client Secret (hidden)' -AsSecureString
$ptr = [IntPtr]::Zero
$previousId = [Environment]::GetEnvironmentVariable('PAYPAL_SANDBOX_CLIENT_ID','Process')
$previousSecret = [Environment]::GetEnvironmentVariable('PAYPAL_SANDBOX_CLIENT_SECRET','Process')
$previousApproval = [Environment]::GetEnvironmentVariable('PAZO_F16_WEBHOOK_PATCH_ACK','Process')
try {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret)
    [Environment]::SetEnvironmentVariable('PAYPAL_SANDBOX_CLIENT_ID', $clientId, 'Process')
    [Environment]::SetEnvironmentVariable('PAYPAL_SANDBOX_CLIENT_SECRET', [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr), 'Process')
    if ($Check -eq 'ApplyWebhook') {
        [Environment]::SetEnvironmentVariable('PAZO_F16_WEBHOOK_PATCH_ACK', 'APLICAR', 'Process')
    }
    Push-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
    try {
        if ($Check -eq 'ApplyWebhook') {
            & node 'scripts/f16-paypal-update-webhook-once.mjs'
        } elseif ($Check -eq 'Resources') {
            & node 'scripts/f16-paypal-verify-resources-readonly.mjs'
        } elseif ($Check -eq 'Destination') {
            & node 'scripts/f16-paypal-verify-webhook-destination-readonly.mjs'
        } elseif ($Check -eq 'Webhooks') {
            & node 'scripts/f16-paypal-verify-webhooks-readonly.mjs'
        } else {
            & node 'scripts/f16-paypal-verify-plan-readonly.mjs'
        }
        if ($LASTEXITCODE -ne 0) {
            if ($Check -eq 'ApplyWebhook') {
                if ($LASTEXITCODE -eq 2) {
                    Write-Warning 'Preflight BLOCKED before PATCH. No PayPal mutation was attempted. Run read-only -Check Resources to inspect the mismatch.'
                } elseif ($LASTEXITCODE -eq 3) {
                    Write-Warning 'PATCH may have reached PayPal; outcome uncertain. DO NOT retry before read-only -Check Resources.'
                } else {
                    Write-Warning 'Update not verified; outcome uncertain. DO NOT retry before read-only -Check Resources.'
                }
            } else {
                Write-Warning 'Preflight BLOCKED or needs review. No PayPal data was changed.'
            }
        }
    } finally {
        Pop-Location
    }
} finally {
    [Environment]::SetEnvironmentVariable('PAYPAL_SANDBOX_CLIENT_ID', $previousId, 'Process')
    [Environment]::SetEnvironmentVariable('PAYPAL_SANDBOX_CLIENT_SECRET', $previousSecret, 'Process')
    [Environment]::SetEnvironmentVariable('PAZO_F16_WEBHOOK_PATCH_ACK', $previousApproval, 'Process')
    if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
    $secureSecret = $null
}

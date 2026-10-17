# PAZO P43 — comprobación local de herramientas (NO credenciales, NO operaciones DB)
# PowerShell 7+. No ejecuta 'supabase db dump', 'supabase link',
# 'supabase login', ni solicitudes de credenciales temporales.
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$names = @('supabase','psql','vercel')
foreach ($name in $names) {
  $tool = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $tool) {
    Write-Output "$name=NOT_INSTALLED"
    continue
  }
  try {
    $v = & $tool.Source --version 2>$null
    if ($LASTEXITCODE -ne 0) {
      Write-Output "$name=INSTALLED_VERSION_UNAVAILABLE"
      continue
    }
    $oneLine = ($v | Select-Object -First 1) -replace '[\r\n]',''
    if ($oneLine.Length -gt 130) { $oneLine = $oneLine.Substring(0,130) }
    Write-Output "$name=INSTALLED $oneLine"
  } catch {
    Write-Output "$name=INSTALLED_VERSION_UNAVAILABLE"
  }
}
$privateDir = Join-Path $env:LOCALAPPDATA 'PAZO\CodexOps'
foreach ($filename in @('database.credential.xml','connection.json')) {
  $present = Test-Path -LiteralPath (Join-Path $privateDir $filename) -PathType Leaf
  Write-Output "$filename=$(if ($present) {'PRESENT'} else {'ABSENT'})"
}
Write-Output 'P43_TOOLING_INVENTORY_ONLY_NO_DB_AUTH_OR_MUTATION'

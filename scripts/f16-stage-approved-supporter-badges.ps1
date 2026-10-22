# PAZO F16 — import ONLY the user-approved original PNG crops.
# Run privately from the checkout root AFTER downloading the exact archive
# linked in the conversation. Does not touch hosting/DB/PayPal or enable perks.
param(
  [Parameter(Mandatory=$true)][string]$ArchivePath
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$expectedArchive='281503c0638d1d9e3ea752263f9e2a72be5a584f172af73d17358a6c970182b5'
$expected=@{
  'amigo-pazo-inicio.png'='4f8fa4d2616ab82863d57a09975603722beea51bc5b0e7b932b72d4377d192cf'
  'amigo-pazo-3-meses.png'='ff363fb865275019b718beb8cf6d3c432989fea408737cf56f1f6d32e4a2e211'
  'amigo-pazo-6-meses.png'='d1b6bbde37de8ce9d965ab30bf84158e2ddc76ee13a8398cad23eb57d5dbd003'
  'amigo-pazo-12-meses.png'='a62f7bf8d9fb78dcd50279f93780dcf36d95e61b5ed85c1414c6b120a3d319f5'
}
if(-not (Test-Path -LiteralPath $ArchivePath -PathType Leaf)){
  throw 'F16_BADGE_ARCHIVE_MISSING'
}
if((Get-FileHash -LiteralPath $ArchivePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedArchive){
  throw 'F16_BADGE_ARCHIVE_HASH_MISMATCH'
}
$repoRoot=Split-Path -Parent $PSScriptRoot
if(-not (Test-Path -LiteralPath (Join-Path $repoRoot 'AGENTS.md'))){
  throw 'F16_BADGE_REPO_ROOT_MISSING'
}
$temp=Join-Path ([System.IO.Path]::GetTempPath()) ('pazo-f16-badges-'+[Guid]::NewGuid().ToString('N'))
$dest=Join-Path $repoRoot 'public/supporter'
try {
  New-Item -ItemType Directory -Path $temp -Force | Out-Null
  Expand-Archive -LiteralPath $ArchivePath -DestinationPath $temp
  foreach($name in $expected.Keys){
    $source=Join-Path $temp $name
    if(-not (Test-Path -LiteralPath $source -PathType Leaf)){
      throw 'F16_BADGE_ASSET_MISSING'
    }
    if((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected[$name]){
      throw 'F16_BADGE_ASSET_HASH_MISMATCH'
    }
    $bytes=[System.IO.File]::ReadAllBytes($source)
    if($bytes.Length -lt 1000 -or
       -not ($bytes[0] -eq 137 -and $bytes[1] -eq 80 -and $bytes[2] -eq 78 -and $bytes[3] -eq 71)){
      throw 'F16_BADGE_NOT_PNG'
    }
  }
  New-Item -ItemType Directory -Path $dest -Force | Out-Null
  foreach($name in $expected.Keys){
    Copy-Item -LiteralPath (Join-Path $temp $name) -Destination (Join-Path $dest $name) -Force
  }
  Write-Output 'F16_ORIGINAL_BADGE_ASSETS_STAGED_FOR_REVIEW'
  Write-Output 'F16_ASSETS_NOT_PUBLISHED_NOT_LIVE'
} finally {
  if(Test-Path -LiteralPath $temp){
    Remove-Item -LiteralPath $temp -Recurse -Force
  }
}

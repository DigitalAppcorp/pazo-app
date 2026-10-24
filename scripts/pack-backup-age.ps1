param(
  [Parameter(Mandatory=$true)][string]$BackupDirectory,
  [Parameter(Mandatory=$true)][string]$AgeExecutable,
  [Parameter(Mandatory=$true)][string]$Recipient,
  [Parameter(Mandatory=$true)][string]$OutputArchive
)
$ErrorActionPreference='Stop'
# Encrypt to a PO-held public recipient. No private key/password argument.
# This never uploads, decrypts, deletes source files or certifies a restore.
if ($Recipient -notmatch '^age1[0-9a-z]+$') { throw 'A public age recipient is required.' }
$pazoSource=[IO.Path]::GetFullPath($BackupDirectory)
$pazoOutput=[IO.Path]::GetFullPath($OutputArchive)
if (-not $pazoOutput.EndsWith('.age',[StringComparison]::OrdinalIgnoreCase) -or
    (Test-Path -LiteralPath $pazoOutput) -or $pazoOutput.StartsWith($pazoSource.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)) {
  throw 'New .age archive outside the source directory required.'
}
$pazoManifest=Get-Content -LiteralPath (Join-Path $pazoSource 'database-manifest.json') -Raw | ConvertFrom-Json
if ($pazoManifest.database_export -ne 'EXPORTED_NOT_RESTORED') { throw 'Database export manifest missing.' }
$pazoRequired=@('database.dump','roles.sql','storage-inventory.json','archive-toc.private.txt','extension-owners.json')
if (@($pazoManifest.files).Count -ne 5 -or
    @($pazoManifest.files.file | Sort-Object -Unique).Count -ne 5 -or
    @($pazoRequired | Where-Object { $_ -notin $pazoManifest.files.file }).Count) {
  throw 'Exactly five distinct database export entries including extension owners required.'
}
foreach ($pazoFile in $pazoManifest.files) {
  if ($pazoFile.file -notin $pazoRequired) { throw 'Unexpected database file.' }
  $pazoPath=Join-Path $pazoSource $pazoFile.file
  if ((Get-Item -LiteralPath $pazoPath).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Linked database export rejected.' }
  if ($pazoFile.bytes -le 0 -or (Get-Item -LiteralPath $pazoPath).Length -ne $pazoFile.bytes -or
      (Get-FileHash -LiteralPath $pazoPath -Algorithm SHA256).Hash.ToLower() -cne $pazoFile.sha256) { throw 'Database export hash mismatch.' }
}
& node (Join-Path $PSScriptRoot 'verify-storage-export.mjs') (Join-Path $pazoSource 'storage')
if ($LASTEXITCODE -ne 0) { throw 'Storage integrity is not verified.' }
$pazoRecovery=Join-Path $pazoSource 'recovery-final'
if(Test-Path -LiteralPath $pazoRecovery){
  & node (Join-Path $PSScriptRoot 'verify-recovery-supplement.mjs') $pazoRecovery
  if($LASTEXITCODE -ne 0){throw 'Recovery supplement integrity is not verified.'}
}
$pazoZip=Join-Path $pazoSource '.private-package.zip'
if (Test-Path -LiteralPath $pazoZip) { throw 'Existing private package must be preserved.' }
# Compress-Archive has a 2 GiB file limit; current tiny project must remain below it.
if (@(Get-ChildItem -LiteralPath $pazoSource -Recurse -File | Where-Object Length -ge 2GB).Count) { throw 'Archive size limit exceeded.' }
$pazoPayload=@('database.dump','roles.sql','storage-inventory.json','archive-toc.private.txt','extension-owners.json','database-manifest.json','storage') |
  ForEach-Object { Join-Path $pazoSource $_ }
if(Test-Path -LiteralPath $pazoRecovery){$pazoPayload+=$pazoRecovery}
Compress-Archive -LiteralPath $pazoPayload -DestinationPath $pazoZip -CompressionLevel Optimal
& $AgeExecutable -r $Recipient -o $pazoOutput $pazoZip
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $pazoOutput) -or (Get-Item -LiteralPath $pazoOutput).Length -le 0) {
  throw 'Encryption failed; preserve local material privately, upload nothing.'
}
@{ciphertext_sha256=(Get-FileHash -LiteralPath $pazoOutput -Algorithm SHA256).Hash.ToLower();
  ciphertext_bytes=(Get-Item -LiteralPath $pazoOutput).Length;offsite='NOT_TESTED';decrypt='NOT_TESTED';restore='NOT_TESTED'} | ConvertTo-Json

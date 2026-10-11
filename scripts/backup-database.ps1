param(
  [Parameter(Mandatory=$true)][string]$PostgresBin,
  [Parameter(Mandatory=$true)][string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
# Operator-only logical export; never connects to a frontend URL or executes DDL.
# Run personally after Preparar-acceso-privado-PAZO.ps1. No Start-Transcript.
$pazoPrivate = Join-Path $env:LOCALAPPDATA 'PAZO\CodexOps'
$pazoConnection = Get-Content -LiteralPath (Join-Path $pazoPrivate 'connection.json') -Raw | ConvertFrom-Json
if ($pazoConnection.project -cne 'mrybvqdebbgcayuvgkkr' -or $pazoConnection.port -ne 5432 -or
    $pazoConnection.database -cne 'postgres' -or
    $pazoConnection.host -notmatch '^(db\.mrybvqdebbgcayuvgkkr\.supabase\.co|[a-z0-9-]+\.pooler\.supabase\.com)$' -or
    $pazoConnection.user -notin @('postgres','postgres.mrybvqdebbgcayuvgkkr') -or
    ($pazoConnection.host -like '*.pooler.supabase.com' -and $pazoConnection.user -cne 'postgres.mrybvqdebbgcayuvgkkr')) {
  throw 'Project connection rejected.'
}
$pazoOutput = [IO.Path]::GetFullPath($OutputDirectory)
$pazoRepo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$pazoParent = Get-Item -LiteralPath ([IO.Path]::GetDirectoryName($pazoOutput))
for ($pazoAncestor=$pazoParent; $null -ne $pazoAncestor; $pazoAncestor=$pazoAncestor.Parent) {
  if ($pazoAncestor.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Reparse destination rejected.' }
}
foreach ($pazoForbidden in @($pazoRepo,$env:OneDrive,$env:OneDriveConsumer,$env:OneDriveCommercial,$env:PAZO_DRIVE_SYNC_ROOT)) {
  if ($pazoForbidden -and ($pazoOutput -eq $pazoForbidden -or $pazoOutput.StartsWith($pazoForbidden.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase))) {
    throw 'Private unsynced destination outside repository required.'
  }
}
if (Test-Path -LiteralPath $pazoOutput) { throw 'Destination must be new; partial exports must be preserved.' }
New-Item -ItemType Directory -Path $pazoOutput | Out-Null
$pazoIdentity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
& icacls.exe $pazoOutput /inheritance:r /grant:r "${pazoIdentity}:(OI)(CI)F" 'SYSTEM:(OI)(CI)F' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Private ACL failed.' }
$pazoPrevious = @{}
foreach ($pazoName in @('PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD','PGSSLMODE','PGOPTIONS','PGCONNECT_TIMEOUT')) {
  $pazoPrevious[$pazoName] = [Environment]::GetEnvironmentVariable($pazoName)
}
function Invoke-PazoPg([string]$Tool,[string[]]$Arguments,[string]$Log) {
  & (Join-Path $PostgresBin "$Tool.exe") @Arguments 2> (Join-Path $pazoOutput $Log)
  if ($LASTEXITCODE -ne 0) { throw "Official $Tool export failed. Private diagnostic retained; no backup PASS." }
}
try {
  $pazoCredential = Import-Clixml -LiteralPath (Join-Path $pazoPrivate 'database.credential.xml')
  if ($pazoCredential.UserName -cne $pazoConnection.user) { throw 'Credential identity mismatch.' }
  $env:PGHOST=$pazoConnection.host; $env:PGPORT='5432'; $env:PGDATABASE='postgres'; $env:PGUSER=$pazoConnection.user
  $env:PGPASSWORD=$pazoCredential.GetNetworkCredential().Password
  $env:PGSSLMODE='require'; $env:PGCONNECT_TIMEOUT='15'; $env:PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=120000'
  $pazoInventorySql = @'
BEGIN READ ONLY;
SELECT jsonb_build_object('project','mrybvqdebbgcayuvgkkr',
 'buckets',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'public',public) ORDER BY id) FROM storage.buckets),'[]'::jsonb),
 'objects',COALESCE((SELECT jsonb_agg(jsonb_build_object('bucket',bucket_id,'path',name,'id',id,'size',metadata->>'size') ORDER BY bucket_id,name) FROM storage.objects),'[]'::jsonb));
ROLLBACK;
'@
  Invoke-PazoPg 'psql' @('-X','-A','-t','-q','-w','-v','ON_ERROR_STOP=1','-o',(Join-Path $pazoOutput 'storage-inventory.json'),'-c',$pazoInventorySql) 'inventory-private.log'
  # One consistent custom archive includes schema, data, ACL, ownership and large objects.
  Invoke-PazoPg 'pg_dump' @('-w','--format=custom','--lock-wait-timeout=10s','--file',(Join-Path $pazoOutput 'database.dump')) 'database-private.log'
  # No database-role passwords; Auth's managed password hashes remain in the private DB archive.
  Invoke-PazoPg 'pg_dumpall' @('-w','--roles-only','--no-role-passwords','--file',(Join-Path $pazoOutput 'roles.sql')) 'roles-private.log'
  Invoke-PazoPg 'pg_restore' @('--list','--file',(Join-Path $pazoOutput 'archive-toc.private.txt'),(Join-Path $pazoOutput 'database.dump')) 'toc-private.log'
  $pazoFiles = @('database.dump','roles.sql','storage-inventory.json','archive-toc.private.txt')
  $pazoManifest = foreach ($pazoFile in $pazoFiles) {
    $pazoPath = Join-Path $pazoOutput $pazoFile
    $pazoSize = (Get-Item -LiteralPath $pazoPath).Length
    if ($pazoSize -le 0) { throw 'Empty export rejected.' }
    @{file=$pazoFile;bytes=$pazoSize;sha256=(Get-FileHash -LiteralPath $pazoPath -Algorithm SHA256).Hash.ToLower()}
  }
  @{database_export='EXPORTED_NOT_RESTORED';at_utc=(Get-Date).ToUniversalTime().ToString('o');files=@($pazoManifest);offsite='NOT_TESTED';restore='NOT_TESTED'} |
    ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $pazoOutput 'database-manifest.json') -Encoding utf8
  Write-Output 'Logical export completed. Storage, encrypted offsite and isolated restore remain separate gates.'
} finally {
  $pazoCredential=$null
  foreach ($pazoName in $pazoPrevious.Keys) { [Environment]::SetEnvironmentVariable($pazoName,$pazoPrevious[$pazoName]) }
}

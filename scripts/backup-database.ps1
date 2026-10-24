param(
  [Parameter(Mandatory=$true)][string]$PostgresBin,
  [Parameter(Mandatory=$true)][string]$OutputDirectory,
  [string]$SupabaseCli
)
$ErrorActionPreference = 'Stop'
# Operator-only logical export; never connects to a frontend URL or executes DDL.
# DPAPI operator credentials or official CLI temporary login. No Start-Transcript.
$pazoPrivate = Join-Path $env:LOCALAPPDATA 'PAZO\CodexOps'
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
  if ($SupabaseCli) {
    # This obtains temporary credentials through the authenticated Management API.
    # Parse only literal exports; never invoke the shell script or echo its contents.
    $pazoGenerated = & $SupabaseCli db dump --linked --project-ref mrybvqdebbgcayuvgkkr --dry-run --agent no 2> (Join-Path $pazoOutput 'cli-private.log')
    if ($LASTEXITCODE -ne 0) { throw 'Official CLI connection preparation failed.' }
    $pazoGeneratedText = $pazoGenerated | Out-String
    if ($pazoGeneratedText -notmatch '--role[= ]+["'']?postgres\b') { throw 'Official CLI administrative dump role not confirmed.' }
    $pazoValues = @{}
    foreach ($pazoName in @('PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD')) {
      $pazoMatches = [regex]::Matches($pazoGeneratedText, ('(?m)^export '+$pazoName+'=(?<quote>["''])(?<value>[^\r\n]*)\k<quote>\s*$'))
      if ($pazoMatches.Count -ne 1 -or $pazoMatches[0].Groups['value'].Value -match '[\\`"'']') {
        throw 'Unsupported CLI literal export; no generated script executed.'
      }
      $pazoValues[$pazoName] = $pazoMatches[0].Groups['value'].Value
    }
    $pazoConnection = [pscustomobject]@{project='mrybvqdebbgcayuvgkkr';host=$pazoValues.PGHOST;port=$pazoValues.PGPORT;database=$pazoValues.PGDATABASE;user=$pazoValues.PGUSER}
    $pazoPassword = $pazoValues.PGPASSWORD
    $pazoAllowedUsers = @('cli_login_postgres','cli_login_postgres.mrybvqdebbgcayuvgkkr')
  } else {
    $pazoConnection = Get-Content -LiteralPath (Join-Path $pazoPrivate 'connection.json') -Raw | ConvertFrom-Json
    $pazoCredential = Import-Clixml -LiteralPath (Join-Path $pazoPrivate 'database.credential.xml')
    if ($pazoCredential.UserName -cne $pazoConnection.user) { throw 'Credential identity mismatch.' }
    $pazoPassword = $pazoCredential.GetNetworkCredential().Password
    $pazoAllowedUsers = @('postgres','postgres.mrybvqdebbgcayuvgkkr')
  }
  if ($pazoConnection.project -cne 'mrybvqdebbgcayuvgkkr' -or $pazoConnection.port -ne '5432' -or
      $pazoConnection.database -cne 'postgres' -or
      $pazoConnection.host -notmatch '^(db\.mrybvqdebbgcayuvgkkr\.supabase\.co|[a-z0-9-]+\.pooler\.supabase\.com)$' -or
      $pazoConnection.user -notin $pazoAllowedUsers -or
      ($pazoConnection.host -like '*.pooler.supabase.com' -and $pazoConnection.user -notlike '*.mrybvqdebbgcayuvgkkr')) {
    throw 'Project connection rejected.'
  }
  $env:PGHOST=$pazoConnection.host; $env:PGPORT='5432'; $env:PGDATABASE='postgres'; $env:PGUSER=$pazoConnection.user
  $env:PGPASSWORD=$pazoPassword
  $env:PGSSLMODE='require'; $env:PGCONNECT_TIMEOUT='15'; $env:PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=120000'
  # CLI grants SET postgres, not inherited table privileges. Match its --role=postgres.
  # This is provider-authorized administrative export, never an Auth JWT simulation.
  if ($SupabaseCli) { $env:PGOPTIONS += ' -c role=postgres' }
  $pazoInventorySql = @'
BEGIN READ ONLY;
SELECT jsonb_build_object('project','mrybvqdebbgcayuvgkkr',
 'buckets',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'public',public) ORDER BY id) FROM storage.buckets),'[]'::jsonb),
 'objects',COALESCE((SELECT jsonb_agg(jsonb_build_object('bucket',bucket_id,'path',name,'id',id,'size',metadata->>'size') ORDER BY bucket_id,name) FROM storage.objects),'[]'::jsonb));
ROLLBACK;
'@
  Invoke-PazoPg 'psql' @('-X','-A','-t','-q','-w','-v','ON_ERROR_STOP=1','-o',(Join-Path $pazoOutput 'storage-inventory.json'),'-c',$pazoInventorySql) 'inventory-private.log'
  $pazoExtensionsSql = @'
BEGIN READ ONLY;
SELECT jsonb_agg(jsonb_build_object('name',e.extname,'version',e.extversion,'owner',pg_get_userbyid(e.extowner),'schema',n.nspname) ORDER BY e.extname)
FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace;
ROLLBACK;
'@
  # pg_dump's CREATE EXTENSION does not retain the creator/owner. Recovery needs it.
  Invoke-PazoPg 'psql' @('-X','-A','-t','-q','-w','-v','ON_ERROR_STOP=1','-o',(Join-Path $pazoOutput 'extension-owners.json'),'-c',$pazoExtensionsSql) 'extensions-private.log'
  # Export roles while the CLI temporary login is fresh; a long pg_dump can
  # outlive that login for new connections without interrupting its own session.
  # No database-role passwords; Auth's managed password hashes remain in the private DB archive.
  Invoke-PazoPg 'pg_dumpall' @('-w','--roles-only','--no-role-passwords','--file',(Join-Path $pazoOutput 'roles.sql')) 'roles-private.log'
  # Preserve all other database data and P42 table schema/ACL/RLS while
  # permanently excluding P42 signing-key ROWS from any new logical backup.
  # DO NOT remove the P42 exclusion: that would copy key_bytes into database.dump.
  # Tested only against disposable PG17; hosted backups are not certified here.
  Invoke-PazoPg 'pg_dump' @('-w','--format=custom','--create','--lock-wait-timeout=10s',
    '--exclude-table-data=supporter_private.p42_activation_signing_keys',
    '--file',(Join-Path $pazoOutput 'database.dump')) 'database-private.log'

  Invoke-PazoPg 'pg_restore' @('--list','--create','--file',(Join-Path $pazoOutput 'archive-toc.private.txt'),(Join-Path $pazoOutput 'database.dump')) 'toc-private.log'
  $pazoFiles = @('database.dump','roles.sql','storage-inventory.json','archive-toc.private.txt','extension-owners.json')
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
  $pazoCredential=$null; $pazoPassword=$null; $pazoGenerated=$null; $pazoGeneratedText=$null; $pazoValues=$null
  foreach ($pazoName in $pazoPrevious.Keys) { [Environment]::SetEnvironmentVariable($pazoName,$pazoPrevious[$pazoName]) }
}

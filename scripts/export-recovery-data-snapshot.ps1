param(
 [Parameter(Mandatory=$true)][string]$PostgresBin,
 [Parameter(Mandatory=$true)][string]$SupabaseCli,
 [Parameter(Mandatory=$true)][string]$InitialCatalogDirectory,
 [Parameter(Mandatory=$true)][string]$OutputDirectory
)
$ErrorActionPreference='Stop'
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$out=[IO.Path]::GetFullPath($OutputDirectory)
if(Test-Path -LiteralPath $out){throw 'New private snapshot destination required'}
$parent=Get-Item -LiteralPath ([IO.Path]::GetDirectoryName($out))
for($ancestor=$parent;$null-ne $ancestor;$ancestor=$ancestor.Parent){if($ancestor.Attributes-band [IO.FileAttributes]::ReparsePoint){throw 'Linked destination rejected'}}
foreach($forbidden in @($repo,$env:OneDrive,$env:OneDriveConsumer,$env:OneDriveCommercial,$env:PAZO_DRIVE_SYNC_ROOT)){
 if($forbidden-and ($out-eq $forbidden-or $out.StartsWith($forbidden.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase))){throw 'Private unsynced destination outside repository required'}
}
New-Item -ItemType Directory -Path $out|Out-Null
$identity=[Security.Principal.WindowsIdentity]::GetCurrent().Name
& icacls.exe $out /inheritance:r /grant:r "${identity}:(OI)(CI)F" 'SYSTEM:(OI)(CI)F'|Out-Null
if($LASTEXITCODE-ne 0){throw 'Private snapshot ACL failed'}
$catalog=Get-Content (Join-Path $InitialCatalogDirectory 'source-catalog.private.json') -Raw|ConvertFrom-Json
$initial=Get-Content (Join-Path $InitialCatalogDirectory 'source-extra.private.json') -Raw|ConvertFrom-Json
function Quote-Identifier([string]$Name){if(-not $Name-or $Name.Contains([char]0)){throw 'Invalid identifier'};return '"'+$Name.Replace('"','""')+'"'}
$inventory=@()
$commands=@('\set ON_ERROR_STOP on','BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;','SET LOCAL search_path=pg_catalog;')
foreach($t in $catalog.tables){
 if($t.evidence-match '<last_value>'){continue}
 $key=$t.nspname+'.'+$t.relname
 $excluded=$key-ceq 'supporter_private.p42_activation_signing_keys'
 $columns=@($initial.columns|Where-Object {$_.nspname-ceq $t.nspname-and $_.relname-ceq $t.relname-and -not $_.attgenerated}|Sort-Object @{Expression={if($_.ordinal){$_.ordinal}else{$_.attnum}}}|ForEach-Object {$_.attname})
 if(-not $columns.Count){throw 'Column inventory required'}
 $sha=[Security.Cryptography.SHA256]::Create()
 try{$hash=([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($key)))).Replace('-','').ToLower()}finally{$sha.Dispose()}
 $file='data-'+$hash+'.bin'
 $inventory+=@{schema=$t.nspname;table=$t.relname;file=$(if($excluded){$null}else{$file});excluded=$excluded;columns=$columns}
 if(-not $excluded){
  $dest=(Join-Path $out $file).Replace('\','/').Replace("'","''")
  $projection=($columns|ForEach-Object {Quote-Identifier $_})-join ','
  $commands+='\copy (SELECT '+$projection+' FROM ONLY '+(Quote-Identifier $t.nspname)+'.'+(Quote-Identifier $t.relname)+') TO '''+$dest+''' WITH (FORMAT binary)'
 }
}
foreach($item in @(@{name='source-catalog.private.json';sql=(Join-Path $PSScriptRoot 'backup-catalog-verification.sql')},@{name='source-extra.private.json';sql=(Join-Path $PSScriptRoot 'backup-catalog-extra-verification.sql')})){
 $dest=(Join-Path $out $item.name).Replace('\','/').Replace("'","''")
 $commands+='\o '''+$dest+''''
 $commands+=([IO.File]::ReadAllText($item.sql)).Replace('BEGIN READ ONLY;','').Replace('ROLLBACK;','')
 $commands+='\o'
}
$commands+='ROLLBACK;'
$script=Join-Path $out 'export.private.psql'
[IO.File]::WriteAllText($script,($commands-join "`n"),[Text.UTF8Encoding]::new($false))
$previous=@{}
foreach($n in @('PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD','PGSSLMODE','PGOPTIONS','PGCONNECT_TIMEOUT')){$previous[$n]=[Environment]::GetEnvironmentVariable($n)}
Push-Location $repo
try{
 $raw=& $SupabaseCli db dump --linked --project-ref mrybvqdebbgcayuvgkkr --dry-run --agent no 2>(Join-Path $out 'cli.private.log')
 if($LASTEXITCODE-ne 0){throw 'Official CLI snapshot preparation failed'}
 $generated=$raw|Out-String
 if($generated-notmatch '--role[= ]+["'']?postgres\b'){throw 'Administrative role missing'}
 foreach($n in @('PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD')){
  $m=[regex]::Matches($generated,('(?m)^export '+$n+'=(?<quote>["''])(?<value>[^\r\n]*)\k<quote>\s*$'))
  if($m.Count-ne 1-or $m[0].Groups['value'].Value-match '[\\`"'']'){throw 'Unsupported CLI literal'}
  [Environment]::SetEnvironmentVariable($n,$m[0].Groups['value'].Value)
 }
 if($env:PGDATABASE-cne 'postgres'-or $env:PGPORT-ne '5432'-or $env:PGUSER-notin @('cli_login_postgres','cli_login_postgres.mrybvqdebbgcayuvgkkr')-or $env:PGHOST-notmatch '^(db\.mrybvqdebbgcayuvgkkr\.supabase\.co|[a-z0-9-]+\.pooler\.supabase\.com)$'-or ($env:PGHOST-like '*.pooler.supabase.com'-and $env:PGUSER-notlike '*.mrybvqdebbgcayuvgkkr')){throw 'Connection mismatch'}
 $env:PGSSLMODE='require';$env:PGCONNECT_TIMEOUT='15';$env:PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=120000 -c role=postgres'
 & (Join-Path $PostgresBin 'psql.exe') -X -Atq -w -v ON_ERROR_STOP=1 -f $script *> (Join-Path $out 'snapshot.private.log')
 if($LASTEXITCODE-ne 0){throw 'Snapshot export failed; private partial files preserved'}
 $inventory|ConvertTo-Json -Depth 5|Set-Content (Join-Path $out 'data-inventory.json') -Encoding utf8
 Write-Output 'READ ONLY table snapshot exported. Prepare, hash, encrypt and restore verification remain separate gates.'
}finally{
 $raw=$null;$generated=$null;$m=$null
 foreach($n in $previous.Keys){[Environment]::SetEnvironmentVariable($n,$previous[$n])}
 Pop-Location
}

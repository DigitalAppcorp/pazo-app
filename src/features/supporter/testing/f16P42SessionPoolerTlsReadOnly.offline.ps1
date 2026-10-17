$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$path=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../../scripts/f16-p42-session-pooler-tls-readonly-once.ps1'))
$errors=$null; $tokens=$null
$ast=[System.Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$errors)
if($errors.Count -ne 0){throw 'PARSE_FAILED'}
$outer=@($ast.FindAll({param($n) $n -is [System.Management.Automation.Language.TryStatementAst] -and $n.Parent -is [System.Management.Automation.Language.NamedBlockAst] -and $null -ne $n.Finally},$true))[0]
$catchText=$outer.CatchClauses[0].Body.Extent.Text
$catchBlock=[scriptblock]::Create("try { throw 'SYNTHETIC_PRIVATE_SENTINEL_NEVER_ECHO' } catch "+$catchText)
$passed=0
foreach($expectedStage in @('PROCESS_TIMEOUT','PSQL_EXIT_NONZERO','READONLY_CONTRACT','UNEXPECTED_OUTPUT','OUTPUT_READ')){
 $didStart=$true; $stage=$expectedStage
 $output=@(& $catchBlock)
 if($output.Count -ne 2 -or $output[0] -cne ('P42_TLS_READ_ONLY_ONCE_BLOCKED_AFTER_CONNECTION_ATTEMPT_'+$expectedStage) -or $output[1] -cne 'P42_NO_PROVISIONING_NO_PAYMENTS'){throw 'SANITIZED_CATEGORY_FAILED'}
 if(($output -join '') -match 'SYNTHETIC_PRIVATE_SENTINEL'){throw 'PRIVATE_EXCEPTION_LEAKED'}
 $passed++
}
$didStart=$false; $stage='PSQL_CLIENT'
$output=@(& $catchBlock)
if($output[0] -cne 'P42_TLS_READ_ONLY_ONCE_BLOCKED_PRECHECK_PSQL_CLIENT'){throw 'PRECHECK_CATEGORY_FAILED'}
$passed++
$finallyText=$outer.Finally.Extent.Text
$cleanup=[scriptblock]::Create($finallyText.Substring(1,$finallyText.Length-2))
$ownsAttemptLock=$false; $probeMarker=$null; $resultFile=$null
$ptr=[IntPtr]::Zero; $psi=$null; $securePassword=$null; $process=[Diagnostics.Process]::new(); $didStart=$false
# Process object only; no Start(), no executable, no credentials, no connection.
& $cleanup
$passed++
# Run only the post-process validation block against synthetic stdout and a fake ExitCode.
$src=[IO.File]::ReadAllText($path)
$from=$src.IndexOf('  if ($process.ExitCode -ne 0)')
$to=$src.IndexOf("  `$stage = 'PASSED'",$from)
if($from -lt 0 -or $to -le $from){throw 'VALIDATION_BLOCK_NOT_FOUND'}
$validate=[scriptblock]::Create($src.Substring($from,$to-$from))
$cases=@(
 @{Code=2; Text=''; Expected='PSQL_EXIT_NONZERO'},
 @{Code=0; Text='P42_SESSION_POOLER_READONLY_CONTRACT_BLOCKED'; Expected='READONLY_CONTRACT'},
 @{Code=0; Text=''; Expected='UNEXPECTED_OUTPUT'},
 @{Code=0; Text='SYNTHETIC_UNEXPECTED_TEXT'; Expected='UNEXPECTED_OUTPUT'},
 @{Code=0; Text="`r`nP42_SESSION_POOLER_TLS_VERIFY_FULL_READ_ONLY_PASS`r`n"; Expected='NO_FAILURE'}
)
foreach($case in $cases){
 $process=[pscustomobject]@{ExitCode=$case.Code}; $out=$case.Text; $stage='NO_FAILURE'; $failed=$false
 try { . $validate } catch { $failed=$true }
 if($stage -cne $case.Expected -or $failed -ne ($case.Expected -ne 'NO_FAILURE')){throw 'POST_PROCESS_VALIDATION_FAILED'}
 $passed++
}

# Test the transport against hostile inherited configuration using only a fake dictionary.
$psi=[pscustomobject]@{Environment=[Collections.Generic.Dictionary[string,string]]::new()}
$expected=@{PGSSLMODE='verify-full'; PGGSSENCMODE='disable'; PGSSLMINPROTOCOLVERSION='TLSv1.2'; PGSSLMAXPROTOCOLVERSION='TLSv1.3'; PGSSLNEGOTIATION='postgres'}
foreach($key in $expected.Keys){
 $psi.Environment[$key]='INVALID_INHERITED_SETTING'
 $left='$psi.Environment['+"'"+$key+"']"
 $a=@($ast.FindAll({param($n) $n -is [System.Management.Automation.Language.AssignmentStatementAst] -and $n.Left.Extent.Text -ceq $left},$true))
 if($a.Count -ne 1){throw 'TLS_ASSIGNMENT_MISSING'}
 . ([scriptblock]::Create($a[0].Extent.Text))
 if($psi.Environment[$key] -cne $expected[$key]){throw 'INHERITED_TLS_NOT_OVERRIDDEN'}
 $passed++
}
$query=$ast.Find({param($n) $n -is [System.Management.Automation.Language.AssignmentStatementAst] -and $n.Left.Extent.Text -ceq '$query'},$true).Right.Extent.Text
if($query -match '(?i)pg_stat_ssl|pg_backend_pid|\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|COMMIT)\b' -or
 -not $query.Contains('BEGIN TRANSACTION READ ONLY;') -or -not $query.Contains('ROLLBACK;') -or
 -not $query.Contains("current_setting('transaction_read_only') = 'on'") -or
 -not $query.Contains("current_database() = 'postgres'")){throw 'READONLY_SQL_BOUNDARY_FAILED'}
$passed++
# Evaluate only the explicit authorization guard, never the main script.
$guard=$ast.Find({param($n) $n -is [System.Management.Automation.Language.IfStatementAst] -and $n.Extent.Text.StartsWith('if (-not $ExecuteApprovedReadOnly')},$true)
if($null -eq $guard){throw 'AUTHORIZATION_GUARD_MISSING'}
$guardBlock=[scriptblock]::Create($guard.Extent.Text)
foreach($c in @(@{Enabled=$false;Id='OFFLINE-TEST-01';Blocked=$true},@{Enabled=$true;Id='../invalid';Blocked=$true},@{Enabled=$true;Id='OFFLINE-TEST-01';Blocked=$false})){
 $ExecuteApprovedReadOnly=$c.Enabled; $AttemptId=$c.Id; $blocked=$false
 try { . $guardBlock } catch { $blocked=$true }
 if($blocked -ne $c.Blocked){throw 'AUTHORIZATION_BOUNDARY_FAILED'}
 $passed++
}
# Load only the lock helper definition and operate in a fresh test directory.
$definition=$ast.Find({param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -ceq 'New-P42ReadOnlyAttempt'},$true)
. ([scriptblock]::Create($definition.Extent.Text))
$fixture=Join-Path ([IO.Path]::GetTempPath()) ('pazo-p42-offline-'+[Guid]::NewGuid().ToString('N'))
try {
 $pathA=New-P42ReadOnlyAttempt -RootDirectory $fixture -Id 'OFFLINE-TEST-01'
 if(-not [IO.File]::Exists((Join-Path $fixture 'p42-tls-OFFLINE-TEST-01.lock')) -or [IO.File]::Exists($pathA)){throw 'CLAIM_BOUNDARY_FAILED'}
 $passed++
 $blocked=$false
 try { [void](New-P42ReadOnlyAttempt -RootDirectory $fixture -Id 'OFFLINE-TEST-01') } catch { $blocked=$true }
 if(-not $blocked){throw 'SECOND_CLAIM_NOT_BLOCKED'}
 $passed++
 $pathB=Join-Path $fixture 'p42-tls-OFFLINE-TEST-02.result.txt'
 [IO.File]::WriteAllText($pathB,'STATIC_SYNTHETIC_RESULT')
 $blocked=$false
 try { [void](New-P42ReadOnlyAttempt -RootDirectory $fixture -Id 'OFFLINE-TEST-02') } catch { $blocked=$true }
 if(-not $blocked -or [IO.File]::Exists((Join-Path $fixture 'p42-tls-OFFLINE-TEST-02.lock')) -or [IO.File]::ReadAllText($pathB) -cne 'STATIC_SYNTHETIC_RESULT'){throw 'EXISTING_RESULT_NOT_PRESERVED'}
 $passed++
 $blocked=$false
 try { [void](New-P42ReadOnlyAttempt -RootDirectory $fixture -Id '../escape') } catch { $blocked=$true }
 if(-not $blocked){throw 'PATH_TRAVERSAL_NOT_BLOCKED'}
 $passed++
 # Exercise result persistence only, with a synthetic marker and no process/password.
 $resultFile=Join-Path $fixture 'p42-tls-OFFLINE-RESULT-01.result.txt'
 $ownsAttemptLock=$true; $probeMarker='P42_SESSION_POOLER_TLS_VERIFY_FULL_READ_ONLY_PASS'
 $ptr=[IntPtr]::Zero; $psi=$null; $securePassword=$null; $process=$null; $didStart=$false
 $resultOutput=@(& $cleanup)
 if($resultOutput.Count -ne 0 -or [IO.File]::ReadAllText($resultFile).Trim() -cne $probeMarker){throw 'STATIC_RESULT_PERSISTENCE_FAILED'}
 $passed++
 $probeMarker='P42_TLS_READ_ONLY_ONCE_BLOCKED_PRECHECK_INPUT'
 $resultOutput=@(& $cleanup)
 if($resultOutput.Count -ne 1 -or $resultOutput[0] -cne 'P42_TLS_READ_ONLY_ONCE_BLOCKED_RESULT_RECORD' -or [IO.File]::ReadAllText($resultFile).Trim() -cne 'P42_SESSION_POOLER_TLS_VERIFY_FULL_READ_ONLY_PASS'){throw 'RESULT_OVERWRITE_NOT_BLOCKED'}
 $passed++
} finally {
 # Delete only known synthetic files, with a checked absolute temp directory; no recursion.
 $resolved=[IO.Path]::GetFullPath($fixture)
 $temp=[IO.Path]::GetFullPath([IO.Path]::GetTempPath())
 if(-not $resolved.StartsWith($temp,[StringComparison]::OrdinalIgnoreCase) -or -not ([IO.Path]::GetFileName($resolved)).StartsWith('pazo-p42-offline-')){throw 'UNSAFE_TEST_CLEANUP'}
 foreach($name in @('p42-tls-OFFLINE-TEST-01.lock','p42-tls-OFFLINE-TEST-02.result.txt','p42-tls-OFFLINE-RESULT-01.result.txt')){
  $f=Join-Path $resolved $name
  if([IO.File]::Exists($f)){[IO.File]::Delete($f)}
 }
 if([IO.Directory]::Exists($resolved)){[IO.Directory]::Delete($resolved)}
}
Write-Output ('P42_TLS_OFFLINE_CHECKS_PASS|'+$passed)
Write-Output 'CONNECTOR_NOT_EXECUTED_NO_PSQL_PROCESS_STARTED_NO_PASSWORD_NO_NETWORK'

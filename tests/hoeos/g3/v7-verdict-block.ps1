# tests/hoeos/g3/v7-verdict-block.ps1
# The V8 evidence-derived verdict block.
# Assumes $TsxOutput, $BuildResult, $WorkingTreeClean, $TsxExitCode,
# $BuildExitCode, $GitHead, $GoldenFixtureHash, $SourceNormalizerHash,
# $SourceIngestionHash, $SourceEngineHash are all in scope.

$gateResults = @{}
$duplicateGates = @()
$requiredGates = @(
    'G3_G2_BASELINE','G3_CANONICAL_REGRESSION','G3_EVIDENCE_DETERMINISM',
    'G3_CROSS_PROCESS','G3_RANDOMNESS_AUTHORITY','G3_TIME_AUTHORITY',
    'G3_EVIDENCE_HASH_AUTHORITY','G3_MATCHED_SPAN_DETERMINISM','G3_ORDERING_DETERMINISM',
    'G3_AI_PROVIDER_NON_AUTHORITY','G3_PERSISTENCE_NON_AUTHORITY','G3_CLIENT_NON_AUTHORITY',
    'G3_RECEIPT_INTEGRITY','G3_PUBLIC_RECONCILIATION','G3_FAILURE_DETERMINISM'
)
$gateNamePattern = '^\s*(G3_[A-Z0-9_]+)\s*:\s*(PASS|FAIL|BLOCKED|NOT TESTED)(?:\s*\|[^|\r\n]*)?\s*$'

foreach ($line in ($TsxOutput -split "`n")) {
    if ($line -match $gateNamePattern) {
        $gateName  = $Matches[1]
        $gateState = $Matches[2]
        if ($gateResults.ContainsKey($gateName)) {
            $duplicateGates += [pscustomobject]@{
                Gate = $gateName; Previous = $gateResults[$gateName]; Observed = $gateState
            }
        }
        $gateResults[$gateName] = $gateState
    }
}

# Detect malformed gate-like lines: any line beginning with G3_ that does not
# match the full gate pattern is treated as a defect, not ignored.
$malformedGateLines = @()
foreach ($scanLine in ($TsxOutput -split "`n")) {
    if ($scanLine -match '^\s*G3_' -and $scanLine -notmatch $gateNamePattern) {
        $malformedGateLines += $scanLine
    }
}

$missingGates    = @($requiredGates | Where-Object { -not $gateResults.ContainsKey($_) })
$unexpectedGates = @($gateResults.Keys | Where-Object { $_ -notin $requiredGates })

$tsPassed    = @($gateResults.Values | Where-Object { $_ -eq 'PASS' }).Count
$tsFailed    = @($gateResults.Values | Where-Object { $_ -eq 'FAIL' }).Count
$tsBlocked   = @($gateResults.Values | Where-Object { $_ -eq 'BLOCKED' }).Count
$tsNotTested = @($gateResults.Values | Where-Object { $_ -eq 'NOT TESTED' }).Count

$buildPassed          = ($BuildResult -eq 'PASS')
$worktreePassed       = ($WorkingTreeClean -eq $true)
$noMissingGates       = ($missingGates.Count -eq 0)
$noDuplicateGates     = ($duplicateGates.Count -eq 0)
$noUnexpectedGates    = ($unexpectedGates.Count -eq 0)
$noMalformedGateLines = ($malformedGateLines.Count -eq 0)
$allGatesObserved     = ($noMissingGates -and $noUnexpectedGates)
$allTsGatesPassed     = ($tsPassed -eq $requiredGates.Count)
$noTsFailures         = ($tsFailed -eq 0)
$noTsBlocked          = ($tsBlocked -eq 0)
$noTsUntested         = ($tsNotTested -eq 0)
$suiteExitPassed      = ($TsxExitCode -eq 0)
$buildExitPassed      = ($BuildExitCode -eq 0)

$g3Pass = $buildPassed -and $worktreePassed -and $noMissingGates -and $noUnexpectedGates -and
          $noMalformedGateLines -and $noDuplicateGates -and $allGatesObserved -and
          $allTsGatesPassed -and $noTsFailures -and $noTsBlocked -and $noTsUntested -and
          $suiteExitPassed -and $buildExitPassed

$finalVerdict = if ($g3Pass) { 'PASS' } else { 'FAIL' }
$requiredGateCount = $requiredGates.Count + 2
$freeze   = if ($g3Pass) { 'YES' } else { 'NO' }
$exitCode = if ($g3Pass) { 0 } else { 1 }
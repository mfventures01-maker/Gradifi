# HOEOS G3 DETERMINISTIC EVIDENCE AUTHORITY CERTIFICATION SCRIPT
# PowerShell Machine Evidence Orchestrator - Mutation-Free Verification Mode

$ErrorActionPreference = "Stop"

Write-Host "============================================================"
Write-Host "STARTING HOEOS G3 DETERMINISTIC EVIDENCE AUTHORITY AUDIT"
Write-Host "============================================================"

# 1. Environment & Repository Identification
$GitHead = (git rev-parse HEAD).Trim()
$GitBranch = (git rev-parse --abbrev-ref HEAD).Trim()
$GitStatus = (git status --porcelain)
$WorkingTreeClean = ($GitStatus.Length -eq 0)

Write-Host "Repository HEAD:    $GitHead"
Write-Host "Repository Branch:  $GitBranch"
Write-Host "Working Tree Clean: $WorkingTreeClean"

# 2. Production Source Hashes & Fixture Verification
$SourceNormalizerHash = (Get-FileHash "src/services/verify/documentNormalizer.ts" -Algorithm SHA256).Hash.ToLower()
$SourceIngestionHash  = (Get-FileHash "src/services/verify/universalIngestionService.ts" -Algorithm SHA256).Hash.ToLower()
$SourceEngineHash     = (Get-FileHash "src/services/verify/deterministicEngine.ts" -Algorithm SHA256).Hash.ToLower()
$GoldenFixtureHash    = (Get-FileHash "tests/hoeos/g2/golden_test_001.docx" -Algorithm SHA256).Hash.ToLower()

Write-Host "documentNormalizer.ts SHA256: $SourceNormalizerHash"
Write-Host "universalIngestion.ts SHA256: $SourceIngestionHash"
Write-Host "deterministicEngine.ts SHA256: $SourceEngineHash"
Write-Host "golden_test_001.docx SHA256:   $GoldenFixtureHash"

# Verify Golden Fixture Byte-for-Byte SHA256
$ExpectedGoldenHash = "3903fcaff82b632acb69ccdb6a5d4b7450053598a2fa79f6ac31c55fad9184d2"
if ($GoldenFixtureHash -ne $ExpectedGoldenHash) {
    Write-Error "Golden fixture SHA256 mismatch! Expected: $ExpectedGoldenHash, Got: $GoldenFixtureHash"
    exit 1
}

# 3. Execute TSX Verification Suite for G3 (Gates 1 through 15)
Write-Host "`nExecuting G3 Deterministic Evidence Test Suite..."
$TsxTempOut = [System.IO.Path]::GetTempFileName()
$TsxTempErr = [System.IO.Path]::GetTempFileName()
$TsxProc = Start-Process -FilePath 'npx.cmd' `
    -ArgumentList 'tsx', 'tests/hoeos/g3/test_g3_full_suite.ts' `
    -NoNewWindow -Wait -PassThru `
    -RedirectStandardOutput $TsxTempOut `
    -RedirectStandardError $TsxTempErr
$TsxExitCode = $TsxProc.ExitCode
$TsxStdOut = if (Test-Path $TsxTempOut) { Get-Content $TsxTempOut -Raw } else { '' }
$TsxStdErr = if (Test-Path $TsxTempErr) { Get-Content $TsxTempErr -Raw } else { '' }
$TsxOutput = $TsxStdOut + "`n" + $TsxStdErr
Remove-Item $TsxTempOut, $TsxTempErr -ErrorAction SilentlyContinue

Write-Host $TsxOutput

if ($TsxExitCode -ne 0) {
    Write-Error "G3 Test Suite execution failed with exit code $TsxExitCode"
    exit 1
}

# 4. Execute Production Build Verification (Gate 16)
Write-Host "`nExecuting Production Build Check..."
$BuildTempOut = [System.IO.Path]::GetTempFileName()
$BuildTempErr = [System.IO.Path]::GetTempFileName()
$BuildProc = Start-Process -FilePath 'npm.cmd' `
    -ArgumentList 'run', 'build' `
    -NoNewWindow -Wait -PassThru `
    -RedirectStandardOutput $BuildTempOut `
    -RedirectStandardError $BuildTempErr
$BuildExitCode = $BuildProc.ExitCode
$BuildStdOut = if (Test-Path $BuildTempOut) { Get-Content $BuildTempOut -Raw } else { '' }
$BuildStdErr = if (Test-Path $BuildTempErr) { Get-Content $BuildTempErr -Raw } else { '' }
$BuildOutput = $BuildStdOut + "`n" + $BuildStdErr
Remove-Item $BuildTempOut, $BuildTempErr -ErrorAction SilentlyContinue

if ($BuildExitCode -eq 0) {
    Write-Host "Production Build Verification: PASS (Exit Code 0)"
    $BuildResult = "PASS"
} else {
    Write-Error "Production Build Verification: FAIL (Exit Code $BuildExitCode)"
    $BuildResult = "FAIL"
}

# 5. Emit Certification Block to stdout (Mutation-Free)
Write-Host "`n============================================================"
Write-Host "HOEOS G3 DETERMINISTIC EVIDENCE AUTHORITY CERTIFICATION"
Write-Host "============================================================"
Write-Host ""
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
foreach ($gate in $requiredGates) {
    $status = if ($gateResults.ContainsKey($gate)) { $gateResults[$gate] } else { 'MISSING' }
    Write-Host "$gate=$status"
}
Write-Host "G3_BUILD=$BuildResult"
Write-Host "G3_WORKTREE_CLEAN=$(if ($worktreePassed) { 'PASS' } else { 'FAIL' })"
Write-Host ""
Write-Host "G3_FIXTURE_SHA256=$GoldenFixtureHash"
Write-Host "G3_SOURCE_NORMALIZER_SHA256=$SourceNormalizerHash"
Write-Host "G3_SOURCE_INGESTION_SHA256=$SourceIngestionHash"
Write-Host "G3_SOURCE_ENGINE_SHA256=$SourceEngineHash"
Write-Host "G3_BASELINE_COMMIT=$GitHead"
Write-Host ""
Write-Host "G3_SUITE_EXIT_CODE=$TsxExitCode"
Write-Host "G3_BUILD_EXIT_CODE=$BuildExitCode"
Write-Host ""
Write-Host "G3_REQUIRED_GATES=$requiredGateCount"
Write-Host "G3_PASSED_GATES=$tsPassed"
Write-Host "G3_FAILED_GATES=$tsFailed"
Write-Host "G3_BLOCKED_GATES=$tsBlocked"
Write-Host "G3_NOT_TESTED_GATES=$tsNotTested"
Write-Host "G3_DUPLICATE_GATES=$($duplicateGates.Count)"
Write-Host "G3_MISSING_GATES=$($missingGates.Count)"
Write-Host "G3_UNEXPECTED_GATES=$($unexpectedGates.Count)"
Write-Host "G3_MALFORMED_GATES=$($malformedGateLines.Count)"
Write-Host ""
Write-Host "G3_CERTIFICATION=$finalVerdict"
Write-Host "G3_FREEZE_AUTHORIZED=$freeze"
Write-Host "G4_AUTHORIZED=$freeze"
Write-Host "CERTIFICATION_SCRIPT_EXIT_CODE=$exitCode"
exit $exitCode

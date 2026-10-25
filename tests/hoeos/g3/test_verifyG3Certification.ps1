# tests/hoeos/g3/test_verifyG3Certification.ps1
# Verifies the V8 verdict block against sixteen stub scenarios.
# Exits 0 only if every scenario's verdict and every counter match.

$ErrorActionPreference = 'Stop'

$verdictBlockPath = Join-Path $PSScriptRoot 'v7-verdict-block.ps1'
if (-not (Test-Path -LiteralPath $verdictBlockPath)) {
    throw "Verdict block not found: $verdictBlockPath"
}

$requiredGates = @(
    'G3_G2_BASELINE','G3_CANONICAL_REGRESSION','G3_EVIDENCE_DETERMINISM',
    'G3_CROSS_PROCESS','G3_RANDOMNESS_AUTHORITY','G3_TIME_AUTHORITY',
    'G3_EVIDENCE_HASH_AUTHORITY','G3_MATCHED_SPAN_DETERMINISM','G3_ORDERING_DETERMINISM',
    'G3_AI_PROVIDER_NON_AUTHORITY','G3_PERSISTENCE_NON_AUTHORITY','G3_CLIENT_NON_AUTHORITY',
    'G3_RECEIPT_INTEGRITY','G3_PUBLIC_RECONCILIATION','G3_FAILURE_DETERMINISM'
)

function New-Scenario {
    param(
        [string]$Name,
        [string[]]$Lines,
        [string]$BuildResult = 'PASS',
        [bool]$WorkingTreeClean = $true,
        [int]$TsxExitCode = 0,
        [int]$BuildExitCode = 0,
        [string]$ExpectedVerdict,
        [hashtable]$ExpectedCounters = @{}
    )
    [pscustomobject]@{
        Name = $Name; Lines = $Lines; BuildResult = $BuildResult
        WorkingTreeClean = $WorkingTreeClean
        TsxExitCode = $TsxExitCode; BuildExitCode = $BuildExitCode
        ExpectedVerdict = $ExpectedVerdict; ExpectedCounters = $ExpectedCounters
    }
}

function Invoke-Scenario {
    param($Scenario, [string]$VerdictBlockPath)

    $TsxOutput          = ($Scenario.Lines -join "`n")
    $BuildResult        = $Scenario.BuildResult
    $WorkingTreeClean   = $Scenario.WorkingTreeClean
    $TsxExitCode        = $Scenario.TsxExitCode
    $BuildExitCode      = $Scenario.BuildExitCode
    $GitHead            = 'STUB_HEAD'
    $GoldenFixtureHash  = 'STUB_FIXTURE'
    $SourceNormalizerHash = 'STUB_NORMALIZER'
    $SourceIngestionHash  = 'STUB_INGESTION'
    $SourceEngineHash     = 'STUB_ENGINE'

    $captured = & {
        . $VerdictBlockPath
        [pscustomobject]@{
            FinalVerdict    = $finalVerdict
            Passed          = $tsPassed
            Failed          = $tsFailed
            Blocked         = $tsBlocked
            NotTested       = $tsNotTested
            DuplicateCount  = $duplicateGates.Count
            MissingCount    = $missingGates.Count
            UnexpectedCount = $unexpectedGates.Count
            MalformedCount  = $malformedGateLines.Count
            ExitCode        = $exitCode
        }
    } 6>$null

    return $captured
}

function Set-GateState {
    param([string[]]$Gates, [int]$Index, [string]$State)
    $out = @()
    for ($i = 0; $i -lt $Gates.Count; $i++) {
        if ($i -eq $Index) { $out += "$($Gates[$i]) : $State" }
        else               { $out += "$($Gates[$i]) : PASS" }
    }
    return $out
}

$allPass = @($requiredGates | ForEach-Object { "$_ : PASS" })

$scenarios = @(
    New-Scenario -Name 'all-pass' -Lines $allPass -ExpectedVerdict 'PASS' `
        -ExpectedCounters @{ Passed = 15; Failed = 0; Blocked = 0; NotTested = 0; DuplicateCount = 0; MissingCount = 0; UnexpectedCount = 0; MalformedCount = 0 }

    New-Scenario -Name 'one-fail' -Lines (Set-GateState $requiredGates 3 'FAIL') `
        -ExpectedVerdict 'FAIL' -ExpectedCounters @{ Failed = 1 }

    New-Scenario -Name 'one-blocked' -Lines (Set-GateState $requiredGates 3 'BLOCKED') `
        -ExpectedVerdict 'FAIL' -ExpectedCounters @{ Blocked = 1 }

    New-Scenario -Name 'one-not-tested' -Lines (Set-GateState $requiredGates 3 'NOT TESTED') `
        -ExpectedVerdict 'FAIL' -ExpectedCounters @{ NotTested = 1 }

    New-Scenario -Name 'one-missing' -Lines @($allPass | Select-Object -First 14) `
        -ExpectedVerdict 'FAIL' -ExpectedCounters @{ MissingCount = 1 }

    New-Scenario -Name 'duplicate-identical' -Lines (@($allPass) + @("$($requiredGates[0]) : PASS")) `
        -ExpectedVerdict 'FAIL' -ExpectedCounters @{ DuplicateCount = 1 }

    New-Scenario -Name 'duplicate-conflicting' -Lines (@($allPass) + @("$($requiredGates[0]) : FAIL")) `
        -ExpectedVerdict 'FAIL' -ExpectedCounters @{ DuplicateCount = 1; Failed = 1 }

    New-Scenario -Name 'build-fail' -Lines $allPass -BuildResult 'FAIL' -BuildExitCode 1 `
        -ExpectedVerdict 'FAIL' -ExpectedCounters @{}

    New-Scenario -Name 'worktree-dirty' -Lines $allPass -WorkingTreeClean $false `
        -ExpectedVerdict 'FAIL' -ExpectedCounters @{}

    New-Scenario -Name 'suite-exit-1' -Lines $allPass -TsxExitCode 1 `
        -ExpectedVerdict 'FAIL' -ExpectedCounters @{}

    New-Scenario -Name 'build-exit-1' -Lines $allPass -BuildExitCode 1 `
        -ExpectedVerdict 'FAIL' -ExpectedCounters @{}

    New-Scenario -Name 'malformed-line-not-counted' -Lines (@($allPass) + @('G3_FAKE : PASSgarbage')) `
        -ExpectedVerdict 'FAIL' -ExpectedCounters @{ MalformedCount = 1 }

    New-Scenario -Name 'malformed-line-interspersed' -Lines (@($allPass[0..6]) + @('G3_FAKE : PASSgarbage') + @($allPass[7..14])) `
        -ExpectedVerdict 'FAIL' -ExpectedCounters @{ MalformedCount = 1 }

    New-Scenario -Name 'unexpected-gate-present' -Lines (@($allPass) + @('G3_UNKNOWN : PASS')) `
        -ExpectedVerdict 'FAIL' -ExpectedCounters @{ UnexpectedCount = 1 }

    New-Scenario -Name 'premature-pass-control' -Lines (Set-GateState $requiredGates 5 'FAIL') `
        -ExpectedVerdict 'FAIL' -ExpectedCounters @{ Failed = 1; ExitCode = 1 }

    New-Scenario -Name 'all-fail-no-pass' -Lines (Set-GateState $requiredGates 0 'BLOCKED') `
        -ExpectedVerdict 'FAIL' -ExpectedCounters @{ Blocked = 1 }
)

$scenariosPassed = 0
$scenariosFailed = 0
$failureDetails  = @()

foreach ($s in $scenarios) {
    $r = Invoke-Scenario -Scenario $s -VerdictBlockPath $verdictBlockPath
    $scenarioOk = $true

    if ($r.FinalVerdict -ne $s.ExpectedVerdict) {
        $scenarioOk = $false
        $failureDetails += "$($s.Name): verdict expected $($s.ExpectedVerdict), got $($r.FinalVerdict)"
    }

    foreach ($k in $s.ExpectedCounters.Keys) {
        $actual = $r.$k
        if ($null -eq $actual) { $actual = '(null)' }
        if ($actual -ne $s.ExpectedCounters[$k]) {
            $scenarioOk = $false
            $failureDetails += "$($s.Name): $k expected $($s.ExpectedCounters[$k]), got $actual"
        }
    }

    if ($scenarioOk) {
        $scenariosPassed++
        Write-Host "[PASS] $($s.Name)"
    } else {
        $scenariosFailed++
        Write-Host "[FAIL] $($s.Name)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "SCENARIOS_PASSED=$scenariosPassed"
Write-Host "SCENARIOS_FAILED=$scenariosFailed"
Write-Host "SCENARIOS_TOTAL=$($scenarios.Count)"

if ($scenariosFailed -gt 0) {
    Write-Host ""
    Write-Host "=== FAILURES ===" -ForegroundColor Red
    $failureDetails | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    Write-Host "VERDICT_BLOCK_VERIFIED=False"
    exit 1
}

Write-Host "VERDICT_BLOCK_VERIFIED=True"
exit 0
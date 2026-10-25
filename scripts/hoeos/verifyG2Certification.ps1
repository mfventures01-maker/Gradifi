# HOEOS G2 DETERMINISTIC CANONICAL AUTHORITY CERTIFICATION SCRIPT
# PowerShell Machine Evidence Orchestrator - Mutation-Free Verification Mode

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

Write-Host "============================================================"
Write-Host "STARTING HOEOS G2 DETERMINISTIC CANONICAL AUTHORITY AUDIT"
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

# 3. Execute TSX Verification Suite for G2-C through G2-L
Write-Host "`nExecuting G2 Deterministic Test Suite..."
$TsxTempOut = [System.IO.Path]::GetTempFileName()
$TsxTempErr = [System.IO.Path]::GetTempFileName()
$TsxProc = Start-Process -FilePath 'npx.cmd' `
    -ArgumentList 'tsx', 'tests/hoeos/g2/test_g2_full_suite.ts' `
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
    Write-Error "G2 Test Suite execution failed with exit code $TsxExitCode"
    exit 1
}

# 4. Execute Production Build Verification
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
    Write-Host "Production Build Verification: FAIL (Exit Code $BuildExitCode)" -ForegroundColor Red
    $BuildResult = "FAIL"
}

# 5. Emit Certification Block to stdout (Mutation-Free)
Write-Host "`n============================================================"
Write-Host "HOEOS G2 DETERMINISTIC CANONICAL AUTHORITY CERTIFICATION"
Write-Host "============================================================"
Write-Host ""
$requiredGates = @(
    'G2_FIXTURE_INTEGRITY','G2_PRODUCTION_PATH','G2_REPEATABILITY','G2_CROSS_PROCESS',
    'G2_CONTENT_MUTATION','G2_FILENAME_ISOLATION','G2_MIME_ISOLATION','G2_RAW_CANONICAL_SEPARATION',
    'G2_CLOCK_INDEPENDENCE','G2_RANDOMNESS_AUTHORITY','G2_PROVIDER_AUTHORITY','G2_ANALYSIS_ID_AUTHORITY',
    'G2_PERSISTENCE_AUTHORITY','G2_CLIENT_AUTHORITY'
)
$gateResults = @{}
if ($TsxOutput) {
    foreach ($line in ($TsxOutput -split "`n")) {
        if ($line -match '^\s*(G2_[A-Z_]+)\s*:\s*(PASS|FAIL|BLOCKED)') {
            $gateName = $Matches[1]
            $gateValue = $Matches[2]
            if ($gateResults.ContainsKey($gateName)) {
                throw "Gate '$gateName' appears more than once in suite output; each gate must be reported exactly once."
            }
            $gateResults[$gateName] = $gateValue
        }
    }
}
foreach ($gate in $requiredGates) {
    $result = if ($gateResults.ContainsKey($gate)) { $gateResults[$gate] } else { 'MISSING' }
    Write-Host "$gate=$result"
}
Write-Host "G2_BUILD=$BuildResult"
Write-Host ""
# ---------------------------------------------------------------------------
# COMPUTED FROM THE LEDGER
# ---------------------------------------------------------------------------
# The test suite prints one line per gate in the form:
#   G2_<GATE_NAME>: PASS
# or
#   G2_<GATE_NAME>: FAIL
# Count only the lines that match the exact gate pattern; do not trust a
# hardcoded constant.
# The suite prints its own computed totals in the summary block:
#   TOTAL GATES:     14
#   PASSED GATES:    14
#   FAILED GATES:    0
#   BLOCKED GATES:   0
#   NOT TESTED:      0
# Read those directly. The suite owns the gate ledger; the verifier reads it.
function Get-SummaryField {
    param(
        [Parameter(Mandatory = $true)][string]$Text,
        [Parameter(Mandatory = $true)][string]$Label
    )
    $pattern = [regex]::Escape($Label) + ':\s+(\d+)'
    $matches = [regex]::Matches($Text, $pattern)
    if ($matches.Count -eq 0) {
        throw "Summary field '$Label' is missing."
    }
    if ($matches.Count -ne 1) {
        throw "Summary field '$Label' appears $($matches.Count) times; exactly one occurrence is required."
    }
    return [int]$matches[0].Groups[1].Value
}

$gateCount = 0
$passedCount = 0
$failedCount = 0
$blockedCount = 0
$notTestedCount = 0

if ($TsxOutput) {
    $gateCount      = Get-SummaryField $TsxOutput 'TOTAL GATES'
    $passedCount    = Get-SummaryField $TsxOutput 'PASSED GATES'
    $failedCount    = Get-SummaryField $TsxOutput 'FAILED GATES'
    $blockedCount   = Get-SummaryField $TsxOutput 'BLOCKED GATES'
    $notTestedCount = Get-SummaryField $TsxOutput 'NOT TESTED'
}

Write-Host "G2_REQUIRED_GATES=$gateCount"
Write-Host "G2_PASSED_GATES=$passedCount"
Write-Host "G2_FAILED_GATES=$failedCount"
Write-Host "G2_BLOCKED_GATES=$blockedCount"
Write-Host "G2_NOT_TESTED_GATES=$notTestedCount"
Write-Host ""
# ---------------------------------------------------------------------------
# CERTIFICATION VERDICT — CONDITIONED ON ACTUAL RESULTS
# ---------------------------------------------------------------------------
# The verdict is PASS only if:
#   - the build succeeded,
#   - every gate in the ledger passed,
#   - at least one gate was recorded (gateCount > 0).
# Otherwise the verdict is FAIL or BLOCKED.
$finalVerdict = 'BLOCKED'
if ($BuildResult -ne 'PASS') {
    $finalVerdict = 'FAIL'
} elseif ($gateCount -ne 14) {
    $finalVerdict = 'FAIL'
} elseif ($passedCount -ne 14) {
    $finalVerdict = 'FAIL'
} elseif ($failedCount -ne 0) {
    $finalVerdict = 'FAIL'
} elseif ($blockedCount -ne 0) {
    $finalVerdict = 'FAIL'
} elseif ($notTestedCount -ne 0) {
    $finalVerdict = 'FAIL'
} elseif (($gateResults.Values | Where-Object { $_ -ne 'PASS' }).Count -ne 0) {
    $finalVerdict = 'FAIL'
} elseif ($gateResults.Count -ne 14) {
    $finalVerdict = 'FAIL'
} else {
    $finalVerdict = 'PASS'
}

Write-Host "G2_CERTIFICATION=$finalVerdict"
if ($finalVerdict -eq 'PASS') {
    Write-Host "G2_FREEZE_AUTHORIZED=YES"
} else {
    Write-Host "G2_FREEZE_AUTHORIZED=NO"
}

# ---------------------------------------------------------------------------
# G3 AUTHORIZATION — OUT OF SCOPE FOR THIS SCRIPT
# ---------------------------------------------------------------------------
# G3 authorization is a governance decision from the owner-decision register
# (including DEC-16). The G2 certification script does not have authority
# to grant it. It reports only its own scope.
Write-Host "G3_AUTHORIZATION_REQUIRES_SEPARATE_APPROVAL"
$exitCode = if ($finalVerdict -eq 'PASS') { 0 } else { 1 }
Write-Host "CERTIFICATION_SCRIPT_EXIT_CODE=$exitCode"
exit $exitCode
Write-Host "============================================================"

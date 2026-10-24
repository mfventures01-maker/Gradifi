# scratch/finalize_g4_evidence_r4.ps1
# HOEOS G4 Certification Evidence Finalizer - R4 Repaired Version
# Implements Direction A: Reconciled with verified R3 evidence schema
# Strict 4-Valued Terminal Status: PASS, FAIL, BLOCKED, NOT RUN

param(
    [string]$EvidenceDir = 'evidence/g4-repair-20261017T1430Z/r3/run-20261017T2040Z/production-preview',
    [int]$PlaywrightExitCode = 0,
    [double]$PlaywrightDurationSec = 0.0,
    [int]$NegativeExitCode = 0,
    [double]$NegativeDurationSec = 0.0,
    [int]$StructuralExitCode = 0,
    [string]$CanonicalText = "Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks",
    [string]$OutputFile = ''
)

$ErrorActionPreference = 'Stop'

Write-Host "=========================================================="
Write-Host "HOEOS G4 EVIDENCE FINALIZER - R4 RECONCILED"
Write-Host "Evidence directory: $EvidenceDir"
Write-Host "=========================================================="

# Track condition buckets according to precedence
$blockedConditions = @()
$notRunConditions = @()
$failConditions = @()
$infoMessages = @()

# -----------------------------------------------------------------------------
# 1. Directory & Prerequisites Validation
# -----------------------------------------------------------------------------
if (-not (Test-Path $EvidenceDir)) {
    $blockedConditions += "Evidence directory does not exist: $EvidenceDir"
}

# -----------------------------------------------------------------------------
# 2. Positive Browser Test Evidence Evaluation (F6 Repair)
# -----------------------------------------------------------------------------
$positiveResultsPath = Join-Path $EvidenceDir 'g4-browser-results.json'
$posData = $null
$posScreenshotExists = $false
$primaryHighlightEvaluated = $null

if (-not (Test-Path $positiveResultsPath)) {
    $blockedConditions += "Missing positive browser results artifact: $positiveResultsPath"
} else {
    try {
        $rawPos = Get-Content $positiveResultsPath -Raw
        if ([string]::IsNullOrWhiteSpace($rawPos)) {
            $blockedConditions += "Positive browser results artifact is empty: $positiveResultsPath"
        } else {
            $posData = $rawPos | ConvertFrom-Json
        }
    } catch {
        $blockedConditions += "Malformed JSON in positive browser results artifact: $($_.Exception.Message)"
    }
}

if ($null -ne $posData) {
    # Check execution status / not run
    if ($PlaywrightExitCode -eq -1) {
        $notRunConditions += "Positive browser test was not executed (PlaywrightExitCode = -1)"
    } elseif ($PlaywrightExitCode -ne 0) {
        $failConditions += "Positive browser test process exited with non-zero code: $PlaywrightExitCode"
    }

    if ($posData.status -eq 'NOT_RUN' -or $posData.status -eq 'SKIPPED') {
        $notRunConditions += "Positive browser test reported status '$($posData.status)'"
    } elseif ($posData.status -ne 'PASS') {
        $failConditions += "Positive browser test reported status '$($posData.status)' instead of 'PASS'"
    }

    # Verify screenshot
    $screenshot1 = Join-Path $EvidenceDir 'g4_browser_highlight.png'
    $screenshot2 = Join-Path $EvidenceDir 'screenshots/g4_browser_highlight.png'
    if ((Test-Path $screenshot1) -or (Test-Path $screenshot2)) {
        $posScreenshotExists = $true
    } else {
        $failConditions += "Positive browser test screenshot missing in $EvidenceDir"
    }

    # Validate markCount with TryParse
    $markCount = 0
    if (-not [int]::TryParse([string]$posData.markCount, [ref]$markCount)) {
        $failConditions += "Positive browser test results markCount is not a valid integer"
    } elseif ($markCount -le 0) {
        $failConditions += "Positive browser test observed markCount $markCount (expected > 0)"
    }

    # F6 Repair: Derive and compute invariant checks directly from raw evidence
    $ph = $posData.primaryHighlight
    if ($null -eq $ph) {
        $failConditions += "Positive browser test results missing primaryHighlight object"
    } else {
        $start = 0
        $end = 0
        $startParsed = [int]::TryParse([string]$ph.start, [ref]$start)
        $endParsed = [int]::TryParse([string]$ph.end, [ref]$end)
        $markText = [string]$ph.markText
        $expectedSlice = [string]$ph.expectedSlice
        $findingId = [string]$ph.findingId
        $sourceId = [string]$ph.sourceId

        # Offset Invariant Check
        $offsetInvariantPassed = $false
        if (-not ($startParsed -and $endParsed)) {
            $failConditions += "Highlight start or end is not a valid integer"
        } else {
            $offsetInvariantPassed = ($start -ge 0) -and ($end -gt $start)
            if (-not $offsetInvariantPassed) {
                $failConditions += "Highlight offset invariant failed: start=$start, end=$end (expected 0 <= start < end)"
            }
        }

        # Text Match Invariant Check
        $textMatchPassed = ($markText.Length -gt 0) -and ($markText -eq $expectedSlice)
        if (-not $textMatchPassed) {
            $failConditions += "Authoritative text slice mismatch: markText does not match expectedSlice"
        }

        # Identity Bound Check
        $identityBoundPassed = ($findingId.Length -gt 0) -and ($sourceId.Length -gt 0)
        if (-not $identityBoundPassed) {
            $failConditions += "Highlight identity binding failed: findingId or sourceId is empty"
        }

        # Canonical Text Boundary Check (if provided)
        $canonicalMatchPassed = $true
        if (-not [string]::IsNullOrEmpty($CanonicalText)) {
            if ($start -lt 0) {
                $canonicalMatchPassed = $false
            } elseif ($end -gt $CanonicalText.Length) {
                $canonicalMatchPassed = $false
                $failConditions += "Highlight end offset ($end) exceeds canonical text length ($($CanonicalText.Length))"
            } elseif ($start -ge $end) {
                $canonicalMatchPassed = $false
            } else {
                $actualSlice = $CanonicalText.Substring($start, $end - $start)
                if ($actualSlice -ne $markText) {
                    $canonicalMatchPassed = $false
                    $failConditions += "Canonical text slice ($actualSlice) does not match observed markText ($markText)"
                }
            }
        }

        $primaryHighlightEvaluated = [ordered]@{
            findingId = $findingId
            sourceId = $sourceId
            start = $start
            end = $end
            markText = $markText
            expectedSlice = $expectedSlice
            offsetInvariantPassed = $offsetInvariantPassed
            textMatchPassed = $textMatchPassed
            identityBoundPassed = $identityBoundPassed
            canonicalMatchPassed = $canonicalMatchPassed
        }
    }
}

# -----------------------------------------------------------------------------
# 3. Negative Browser Test Evidence Evaluation (F2, F3, F4 Repairs)
# -----------------------------------------------------------------------------
$negativeResultsPath = Join-Path $EvidenceDir 'g4-negative-browser-results.json'
$negData = $null
$negScreenshotExists = $false
$negativeEvaluated = $null

if (-not (Test-Path $negativeResultsPath)) {
    $blockedConditions += "Missing negative browser results artifact: $negativeResultsPath"
} else {
    try {
        $rawNeg = Get-Content $negativeResultsPath -Raw
        if ([string]::IsNullOrWhiteSpace($rawNeg)) {
            $blockedConditions += "Negative browser results artifact is empty: $negativeResultsPath"
        } else {
            $negData = $rawNeg | ConvertFrom-Json
        }
    } catch {
        $blockedConditions += "Malformed JSON in negative browser results artifact: $($_.Exception.Message)"
    }
}

if ($null -ne $negData) {
    if ($NegativeExitCode -eq -1) {
        $notRunConditions += "Negative browser test was not executed (NegativeExitCode = -1)"
    } elseif ($NegativeExitCode -ne 0) {
        $failConditions += "Negative browser test process exited with non-zero code: $NegativeExitCode"
    }

    if ($negData.executionStatus -eq 'NOT_RUN' -or $negData.executionStatus -eq 'SKIPPED') {
        $notRunConditions += "Negative browser test reported executionStatus '$($negData.executionStatus)'"
    } elseif ($negData.executionStatus -ne 'PASS') {
        $failConditions += "Negative browser test reported executionStatus '$($negData.executionStatus)' instead of 'PASS'"
    }

    # Verify screenshot
    $negShot1 = Join-Path $EvidenceDir 'g4_negative_browser_unavailable.png'
    $negShot2 = Join-Path $EvidenceDir 'screenshots/g4_negative_browser_unavailable.png'
    if ((Test-Path $negShot1) -or (Test-Path $negShot2)) {
        $negScreenshotExists = $true
    } else {
        $failConditions += "Negative browser test screenshot missing in $EvidenceDir"
    }

    # F2 Repair: Require missingCanonicalCondition (instead of missingCanonicalPrecondition)
    if ($null -eq $negData.missingCanonicalCondition -or [string]::IsNullOrWhiteSpace([string]$negData.missingCanonicalCondition)) {
        $failConditions += "Negative evidence missing required field 'missingCanonicalCondition'"
    }

    # F3 Repair: Validate observedHighlightCount & expectedHighlightCount (with TryParse)
    $obsMarks = 0
    if ($null -eq $negData.observedHighlightCount) {
        $failConditions += "Negative evidence missing required field 'observedHighlightCount'"
    } elseif (-not [int]::TryParse([string]$negData.observedHighlightCount, [ref]$obsMarks)) {
        $failConditions += "Negative evidence field 'observedHighlightCount' is not a valid integer"
    } elseif ($obsMarks -ne 0) {
        $failConditions += "Negative test observed $obsMarks marks in DOM (expected 0 marks for fail-closed)"
    }

    $expMarks = 0
    if ($null -eq $negData.expectedHighlightCount) {
        $failConditions += "Negative evidence missing required field 'expectedHighlightCount'"
    } elseif (-not [int]::TryParse([string]$negData.expectedHighlightCount, [ref]$expMarks)) {
        $failConditions += "Negative evidence field 'expectedHighlightCount' is not a valid integer"
    } elseif ($expMarks -ne 0) {
        $failConditions += "Negative test expectedHighlightCount is $expMarks (expected 0)"
    }

    # F4 Repair: Evaluate flat assertion fields (unavailableIndicatorObserved, viewerSuppressed, allMandatoryAssertionsPassed)
    if ($negData.unavailableIndicatorObserved -ne $true) {
        $failConditions += "Negative test unavailableIndicatorObserved is not true"
    }

    if ($negData.viewerSuppressed -ne $true) {
        $failConditions += "Negative test viewerSuppressed is not true"
    }

    if ($negData.allMandatoryAssertionsPassed -ne $true) {
        $failConditions += "Negative test allMandatoryAssertionsPassed is not true"
    }

    $negativeEvaluated = [ordered]@{
        testIdentity = [string]$negData.testIdentity
        missingCanonicalCondition = [string]$negData.missingCanonicalCondition
        unavailableIndicatorObserved = ($negData.unavailableIndicatorObserved -eq $true)
        viewerSuppressed = ($negData.viewerSuppressed -eq $true)
        observedHighlightCount = $obsMarks
        expectedHighlightCount = $expMarks
        allMandatoryAssertionsPassed = ($negData.allMandatoryAssertionsPassed -eq $true)
    }
}

# -----------------------------------------------------------------------------
# 4. Structural Integrity Evaluation
# -----------------------------------------------------------------------------
if ($StructuralExitCode -eq -1) {
    $notRunConditions += "Structural invariant tests were not executed (StructuralExitCode = -1)"
} elseif ($StructuralExitCode -ne 0) {
    $failConditions += "Structural tests exited with non-zero code: $StructuralExitCode"
}

# -----------------------------------------------------------------------------
# 5. Determine 4-Valued Terminal Status with HOEOS Precedence (F5 Repair)
# -----------------------------------------------------------------------------
# Precedence:
# 1. BLOCKED: Required evidence/prerequisites missing, inaccessible, malformed.
# 2. NOT RUN: Mandatory test or check was not executed.
# 3. FAIL: Executed, but one or more assertions or integrity checks failed.
# 4. PASS: All mandatory checks executed, all evidence valid, all assertions passed.

$terminalStatus = 'PASS'
$precedenceRank = 4
$terminalExitCode = 0
$statusExplanation = ''

if ($blockedConditions.Count -gt 0) {
    $terminalStatus = 'BLOCKED'
    $precedenceRank = 1
    $terminalExitCode = 2
    $statusExplanation = "Prerequisites or artifacts missing/malformed: $($blockedConditions -join '; ')"
} elseif ($notRunConditions.Count -gt 0) {
    $terminalStatus = 'NOT RUN'
    $precedenceRank = 2
    $terminalExitCode = 3
    $statusExplanation = "Mandatory tests not executed: $($notRunConditions -join '; ')"
} elseif ($failConditions.Count -gt 0) {
    $terminalStatus = 'FAIL'
    $precedenceRank = 3
    $terminalExitCode = 1
    $statusExplanation = "Verification assertions failed: $($failConditions -join '; ')"
} else {
    $terminalStatus = 'PASS'
    $precedenceRank = 4
    $terminalExitCode = 0
    $statusExplanation = "All positive, negative, and structural assertions passed against authentic evidence."
}

# -----------------------------------------------------------------------------
# 6. Build Deterministic Output Result (F1 Repair: No hardcoded self-attestations)
# -----------------------------------------------------------------------------
$resultObject = [ordered]@{
    finalizer = 'scratch/finalize_g4_evidence_r4.ps1'
    version = 'R4.2'
    evaluationTimestamp = (Get-Date -Format 'o')
    evidenceDirectory = $EvidenceDir
    terminalStatus = $terminalStatus
    precedenceRank = $precedenceRank
    exitCode = $terminalExitCode
    statusExplanation = $statusExplanation
    allConditions = [ordered]@{
        blocked = $blockedConditions
        notRun = $notRunConditions
        failed = $failConditions
    }
    positiveEvaluation = [ordered]@{
        passed = ($terminalStatus -eq 'PASS')
        markCount = if ($null -ne $posData) { [int]$posData.markCount } else { -1 }
        screenshotExists = $posScreenshotExists
        primaryHighlight = $primaryHighlightEvaluated
    }
    negativeEvaluation = [ordered]@{
        passed = ($terminalStatus -eq 'PASS')
        screenshotExists = $negScreenshotExists
        details = $negativeEvaluated
    }
    g4CertificationBoundary = [ordered]@{
        finalizerResult = $terminalStatus
        g4VerificationEngineCertification = 'NOT CERTIFIED'
        certificationNotice = 'G4 verification-engine certification remains NOT CERTIFIED pending independent execution without injected result fixtures (seam hooks).'
    }
}

# Determine output file path
$targetOut = $OutputFile
if ([string]::IsNullOrEmpty($targetOut)) {
    $targetOut = Join-Path $EvidenceDir 'G4_RESULT.json'
}

$resultJson = $resultObject | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText($targetOut, $resultJson, [System.Text.Encoding]::UTF8)

Write-Host "`nFinalizer Terminal Status: $terminalStatus (Exit Code: $terminalExitCode)"
Write-Host "Explanation: $statusExplanation"
if ($blockedConditions.Count -gt 0) {
    Write-Host "`nBlocked Conditions:" -ForegroundColor Red
    foreach ($c in $blockedConditions) { Write-Host "  - $c" -ForegroundColor Red }
}
if ($notRunConditions.Count -gt 0) {
    Write-Host "`nNot Run Conditions:" -ForegroundColor Yellow
    foreach ($c in $notRunConditions) { Write-Host "  - $c" -ForegroundColor Yellow }
}
if ($failConditions.Count -gt 0) {
    Write-Host "`nFailed Conditions:" -ForegroundColor Red
    foreach ($c in $failConditions) { Write-Host "  - $c" -ForegroundColor Red }
}

Write-Host "Output written to: $targetOut"
exit $terminalExitCode

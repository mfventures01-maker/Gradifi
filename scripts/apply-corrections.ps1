# scripts\apply-corrections.ps1
$ErrorActionPreference = 'Stop'

# Force the working directory to the project root
$projectRoot = 'C:\Projects\Gradifi'
Set-Location $projectRoot
Write-Host "Working directory: $(Get-Location)" -ForegroundColor Cyan

Write-Host "`n=== HOEOS CORRECTIONS START ===" -ForegroundColor Cyan

# ---------------------------------------------------------------------------
# 1. Nemotron handler
# ---------------------------------------------------------------------------
$nemotronFile = 'src\services\verify\server\nemotronServerHandler.ts'
Write-Host "`n[1/4] Patching $nemotronFile" -ForegroundColor Yellow

if (-not (Test-Path $nemotronFile)) {
    Write-Host "      FAIL: File not found: $nemotronFile" -ForegroundColor Red
    Write-Host "      Current dir: $(Get-Location)" -ForegroundColor Red
    exit 1
}

$content = Get-Content $nemotronFile -Raw

if ($content -match "status: 'AUTHENTICATION_FAILED'") {
    Write-Host "      SKIP: Nemotron missing-key branch already returns AUTHENTICATION_FAILED" -ForegroundColor DarkYellow
} elseif ($content -match "if \(!nvidiaKey \|\| nvidiaKey\.includes\('YOUR_'\)\)") {
    # Replace only the first occurrence of RUNTIME_UNAVAILABLE inside that branch
    $pattern = "(if \(!nvidiaKey \|\| nvidiaKey\.includes\('YOUR_'\)\)\s*\{\s*return\s*\{\s*status:\s*)'RUNTIME_UNAVAILABLE'"
    $replacement = "`$1'AUTHENTICATION_FAILED'"
    $newContent = [regex]::Replace($content, $pattern, $replacement, 1)

    if ($newContent -ne $content) {
        Set-Content -Path $nemotronFile -Value $newContent -Encoding UTF8 -NoNewline
        Write-Host "      PASS: Nemotron missing-key branch now returns AUTHENTICATION_FAILED" -ForegroundColor Green
    } else {
        Write-Host "      WARN: Regex matched but no replacement occurred. Manual edit required." -ForegroundColor Yellow
    }
} else {
    Write-Host "      WARN: Could not find the missing-key branch. Manual edit required." -ForegroundColor Yellow
    Write-Host "      Look for: if (!nvidiaKey || nvidiaKey.includes('YOUR_'))" -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# 2. Browser providers
# ---------------------------------------------------------------------------
$providers = @(
    'src\services\verify\providers\crossrefProvider.ts',
    'src\services\verify\providers\openAlexProvider.ts',
    'src\services\verify\providers\unpaywallProvider.ts'
)

Write-Host "`n[2/4] Patching browser provider email reads" -ForegroundColor Yellow

foreach ($file in $providers) {
    if (-not (Test-Path $file)) {
        Write-Host "      WARN: Missing $file" -ForegroundColor Yellow
        continue
    }

    $content = Get-Content $file -Raw
    $original = $content

    # Pattern: process.env.SOMETHING_EMAIL || process.env.VITE_SOMETHING_EMAIL ||
    $content = $content -replace 'process\.env\.[A-Z_]+_EMAIL\s*\|\|\s*process\.env\.(VITE_[A-Z_]+_EMAIL)\s*\|\|', 'import.meta.env.$1 ||'
    # Pattern: process.env.VITE_SOMETHING_EMAIL ||
    $content = $content -replace 'process\.env\.(VITE_[A-Z_]+_EMAIL)\s*\|\|', 'import.meta.env.$1 ||'

    if ($content -ne $original) {
        Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline
        Write-Host "      PASS: $file now uses import.meta.env" -ForegroundColor Green
    } else {
        Write-Host "      SKIP: $file unchanged (already correct or pattern not matched)" -ForegroundColor DarkYellow
    }
}

# ---------------------------------------------------------------------------
# 3. vite-env.d.ts
# ---------------------------------------------------------------------------
$envFile = 'src\vite-env.d.ts'
Write-Host "`n[3/4] Verifying $envFile" -ForegroundColor Yellow

if (-not (Test-Path $envFile)) {
    Write-Host "      WARN: $envFile not found. Skipping." -ForegroundColor Yellow
} else {
    $content = Get-Content $envFile -Raw
    $needsUpdate = $false

    if ($content -notmatch 'VITE_OPENALEX_EMAIL') {
        $content = $content -replace '(readonly VITE_CORE_API_KEY: string;)', "`$1`n  readonly VITE_OPENALEX_EMAIL: string;"
        $needsUpdate = $true
    }
    if ($content -notmatch 'VITE_CROSSREF_EMAIL') {
        $content = $content -replace '(readonly VITE_OPENALEX_EMAIL: string;)', "`$1`n  readonly VITE_CROSSREF_EMAIL: string;"
        $needsUpdate = $true
    }
    if ($content -notmatch 'VITE_UNPAYWALL_EMAIL') {
        $content = $content -replace '(readonly VITE_CROSSREF_EMAIL: string;)', "`$1`n  readonly VITE_UNPAYWALL_EMAIL: string;"
        $needsUpdate = $true
    }

    if ($needsUpdate) {
        Set-Content -Path $envFile -Value $content -Encoding UTF8 -NoNewline
        Write-Host "      PASS: Added missing VITE_*_EMAIL declarations" -ForegroundColor Green
    } else {
        Write-Host "      SKIP: $envFile already declares all three emails" -ForegroundColor DarkYellow
    }
}

# ---------------------------------------------------------------------------
# 4. Verification
# ---------------------------------------------------------------------------
Write-Host "`n[4/4] Verification" -ForegroundColor Yellow

Write-Host "`n      Scanning browser providers for process.env..." -ForegroundColor Cyan
$leaks = Get-ChildItem src\services\verify\providers -File -Include *.ts -ErrorAction SilentlyContinue |
    Select-String -Pattern 'process\.env'
if ($leaks) {
    Write-Host "      WARN: process.env still present:" -ForegroundColor Yellow
    $leaks | ForEach-Object { Write-Host "        $($_.Path):$($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Yellow }
} else {
    Write-Host "      PASS: No process.env reads in browser providers" -ForegroundColor Green
}

Write-Host "`n      Scanning nemotron handler for AUTHENTICATION_FAILED..." -ForegroundColor Cyan
$nem = Select-String -Path 'src\services\verify\server\nemotronServerHandler.ts' -Pattern "status: 'AUTHENTICATION_FAILED'"
if ($nem) {
    Write-Host "      PASS: Nemotron handler returns AUTHENTICATION_FAILED for missing key" -ForegroundColor Green
} else {
    Write-Host "      WARN: Nemotron handler does not yet return AUTHENTICATION_FAILED" -ForegroundColor Yellow
}

Write-Host "`n      Running test suites..." -ForegroundColor Cyan

$tests = @(
    @{ Name = 'G1 Canonical';  Cmd = 'npx tsx tests\canonicalDocumentContract.test.ts' },
    @{ Name = 'G2 Similarity'; Cmd = 'npx tsx tests\deterministicSimilarityEvidence.test.ts' },
    @{ Name = 'G3 Plagiarism'; Cmd = 'npx tsx tests\plagiarismEvidencePolicy.test.ts' },
    @{ Name = 'AI Firewall';   Cmd = 'npx tsx tests\aiEvidenceFirewall.test.ts' },
    @{ Name = 'Gemma Handler'; Cmd = 'npx tsx tests\gemmaServerHandler.test.ts' },
    @{ Name = 'Core Hardening';Cmd = 'npx tsx tests\verifyCore.test.ts' }
)

$allPassed = $true
foreach ($t in $tests) {
    Write-Host "      $($t.Name)..." -NoNewline
    Invoke-Expression $t.Cmd *> $null
    if ($LASTEXITCODE -eq 0) {
        Write-Host " PASS" -ForegroundColor Green
    } else {
        Write-Host " FAIL" -ForegroundColor Red
        $allPassed = $false
    }
}

Write-Host "`n      Production build..." -NoNewline -ForegroundColor Cyan
npm run build *> $null
if ($LASTEXITCODE -eq 0) {
    Write-Host " PASS" -ForegroundColor Green
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $allPassed = $false
}

Write-Host "`n=== HOEOS CORRECTIONS COMPLETE ===" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "All checks passed. To commit:" -ForegroundColor Green
    Write-Host "  git add -A" -ForegroundColor White
    Write-Host "  git commit -m 'fix: nemotron status honesty + browser email via import.meta.env'" -ForegroundColor White
} else {
    Write-Host "One or more checks failed. Review the output above." -ForegroundColor Yellow
}

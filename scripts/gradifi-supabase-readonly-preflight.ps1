[CmdletBinding()]
param(
    [string]$EnvFile = ".env.local"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Import-EnvFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match '^\s*#' -or $line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            continue
        }

        $name = $Matches[1]
        $value = $Matches[2].Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name, "Process"))) {
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

function Invoke-ReadOnlyProbe {
    param(
        [string]$Name,
        [string]$Uri,
        [hashtable]$Headers
    )

    try {
        $response = Invoke-WebRequest -Uri $Uri -Method Get -Headers $Headers -TimeoutSec 25 -UseBasicParsing
        return [pscustomobject]@{
            Name = $Name
            StatusCode = [int]$response.StatusCode
            Passed = ([int]$response.StatusCode -ge 200 -and [int]$response.StatusCode -lt 300)
            Detail = ""
        }
    }
    catch {
        $statusCode = 0
        $detail = $_.Exception.Message
        $response = $_.Exception.Response

        if ($null -ne $response) {
            try { $statusCode = [int]$response.StatusCode } catch {}
            try {
                $stream = $response.GetResponseStream()
                if ($null -ne $stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $body = $reader.ReadToEnd()
                    $reader.Dispose()
                    if (-not [string]::IsNullOrWhiteSpace($body)) {
                        $detail = $body
                    }
                }
            } catch {}
        }

        if ($detail.Length -gt 500) {
            $detail = $detail.Substring(0, 500)
        }

        return [pscustomobject]@{
            Name = $Name
            StatusCode = $statusCode
            Passed = $false
            Detail = $detail
        }
    }
}

Import-EnvFile -Path $EnvFile

$projectUrl = $env:SUPABASE_URL
if ([string]::IsNullOrWhiteSpace($projectUrl)) {
    $projectUrl = $env:VITE_SUPABASE_URL
}

$secretKey = $env:SUPABASE_SECRET_KEY
if ([string]::IsNullOrWhiteSpace($secretKey)) {
    $secretKey = $env:SUPABASE_SECRET_API_KEY
}
if ([string]::IsNullOrWhiteSpace($secretKey)) {
    $secretKey = $env:SUPABASE_SERVICE_ROLE_KEY
}

if ([string]::IsNullOrWhiteSpace($projectUrl)) {
    throw "SUPABASE_URL (or VITE_SUPABASE_URL) is required. No request was sent."
}
if ([string]::IsNullOrWhiteSpace($secretKey)) {
    throw "SUPABASE_SECRET_KEY, SUPABASE_SECRET_API_KEY, or SUPABASE_SERVICE_ROLE_KEY is required. No request was sent."
}

$projectUrl = $projectUrl.TrimEnd("/")
$uri = [Uri]$projectUrl
if ($uri.Scheme -ne "https") {
    throw "Refusing privileged preflight against a non-HTTPS Supabase URL."
}

# Important: the secret key is sent only in the apikey header.
# Do not add Authorization, Origin, Sec-Fetch-* or browser-identifying headers.
$headers = @{
    apikey = $secretKey
    Accept = "application/json"
}

Write-Host ""
Write-Host "=== SUPABASE PRIVILEGED READ-ONLY PREFLIGHT ===" -ForegroundColor Cyan
Write-Host ("Project host: {0}" -f $uri.Host)
Write-Host "Request policy: apikey header only; no Authorization or browser Origin headers."
Write-Host "Mode: GET requests only. No database or Auth records will be changed."
Write-Host ""

$probes = @(
    Invoke-ReadOnlyProbe -Name "PostgREST API root" -Uri "$projectUrl/rest/v1/" -Headers $headers
    Invoke-ReadOnlyProbe -Name "Auth Admin users endpoint" -Uri "$projectUrl/auth/v1/admin/users?page=1&per_page=1" -Headers $headers
)

foreach ($probe in $probes) {
    $status = if ($probe.StatusCode -gt 0) { "HTTP $($probe.StatusCode)" } else { "NO HTTP RESPONSE" }
    if ($probe.Passed) {
        Write-Host ("PASS  {0}: {1}" -f $probe.Name, $status) -ForegroundColor Green
    }
    else {
        Write-Host ("FAIL  {0}: {1}" -f $probe.Name, $status) -ForegroundColor Red
        if (-not [string]::IsNullOrWhiteSpace($probe.Detail)) {
            Write-Host ("      {0}" -f $probe.Detail) -ForegroundColor DarkYellow
        }
    }
}

$passed = @($probes | Where-Object { $_.Passed }).Count
Write-Host ""
Write-Host ("RESULT: {0}/2 privileged read-only checks passed." -f $passed) -ForegroundColor Cyan

if ($passed -ne 2) {
    exit 1
}

Write-Host "PRIVILEGED PREFLIGHT: PASS" -ForegroundColor Green
exit 0

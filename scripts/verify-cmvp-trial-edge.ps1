[CmdletBinding()]
param(
    [string]$ProjectRef = "ehkmfnaqkdgkjmdxxbwj",
    [string]$ApiKey = $env:SUPABASE_PUBLISHABLE_KEY
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ApiKey)) { $ApiKey = $env:SUPABASE_ANON_KEY }
if ([string]::IsNullOrWhiteSpace($ApiKey)) { $ApiKey = $env:VITE_SUPABASE_ANON_KEY }
if ([string]::IsNullOrWhiteSpace($ApiKey)) {
    throw "Set SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY before running this probe."
}

$endpoint = "https://$ProjectRef.supabase.co/functions/v1/trial"
$headers = @{ apikey = $ApiKey }

function Invoke-TrialEndpoint([hashtable]$Payload) {
    $body = $Payload | ConvertTo-Json -Depth 8 -Compress
    Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -ContentType "application/json" -Body $body
}

# The trial function is intentionally deployed with verify_jwt=false.
# The public API key identifies the project; the function performs token hashing
# and all privileged database operations internally with its server-side secret.
$started = Invoke-TrialEndpoint @{ action = "start" }
if ($started.success -ne $true -or [string]::IsNullOrWhiteSpace([string]$started.trialToken)) {
    throw "Trial issuance failed. Response code: $($started.code)"
}
if ([int]$started.checksRemaining -ne 3) {
    throw "Trial issuance returned an unexpected initial allowance."
}

$token = [string]$started.trialToken
if ($token.Length -lt 40 -or $token.Length -gt 100) {
    throw "The issued opaque trial token has an invalid length."
}

$sha = [System.Security.Cryptography.SHA256]::Create()
try {
    $tokenBytes = [System.Text.Encoding]::UTF8.GetBytes($token)
    $tokenHash = [BitConverter]::ToString($sha.ComputeHash($tokenBytes)).Replace("-", "").ToLowerInvariant()
}
finally {
    $sha.Dispose()
}

$consumed = Invoke-TrialEndpoint @{ action = "consume"; trialToken = $token }
if ($consumed.success -ne $true -or [int]$consumed.checksRemaining -ne 2) {
    throw "Trial consumption failed or did not decrement the allowance exactly once. Response code: $($consumed.code)"
}

[pscustomobject]@{
    functionEndpoint = $endpoint
    issuance = "PASS"
    initialChecksRemaining = [int]$started.checksRemaining
    consumption = "PASS"
    checksRemainingAfterConsumption = [int]$consumed.checksRemaining
    trialTokenSha256 = $tokenHash
    rawTrialTokenPrinted = $false
    expiresAt = [string]$started.expiresAt
} | ConvertTo-Json -Depth 4

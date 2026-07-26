$ErrorActionPreference = "Continue"
Write-Host "hostname:" (hostname)
Get-NetTCPConnection -LocalPort 8793 -ErrorAction SilentlyContinue |
  Format-Table LocalAddress, LocalPort, State -AutoSize
$log = Join-Path $env:USERPROFILE ".cogentia\var\agent-gateway.log"
if (Test-Path $log) {
  Write-Host "--- log tail ---"
  Get-Content $log -Tail 25
} else {
  Write-Host "no log at $log"
}
$envf = Join-Path $env:USERPROFILE ".cogentia\secrets\agent-gateway.env"
if (Test-Path $envf) {
  Write-Host "--- env keys ---"
  Get-Content $envf | ForEach-Object {
    if ($_ -match '^[A-Z0-9_]+=') { ($_ -split '=')[0] } else { $_ }
  }
}
# local health with COGENTIA_API_KEY from file without printing value
$tok = $null
if (Test-Path $envf) {
  foreach ($line in Get-Content $envf) {
    if ($line -match '^COGENTIA_API_KEY=(.*)$') { $tok = $Matches[1].Trim().Trim('"'); break }
  }
}
if ($tok) {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:8793/v1/models" -Headers @{ Authorization = "Bearer $tok" } -UseBasicParsing -TimeoutSec 10
    Write-Host "local models HTTP" $r.StatusCode
  } catch {
    Write-Host "local models FAIL" $_.Exception.Message
  }
}

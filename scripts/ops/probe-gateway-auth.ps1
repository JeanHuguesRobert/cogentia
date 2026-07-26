$ErrorActionPreference = "Continue"
$envf = Join-Path $env:USERPROFILE ".cogentia\secrets\agent-gateway.env"
Write-Host "=== env keys ==="
if (Test-Path $envf) {
  Get-Content $envf | ForEach-Object {
    if ($_ -match '^[A-Z0-9_]+=') { ($_ -split "=")[0] }
    elseif ($_ -match '^#') { $_ }
  }
}
$ip = "100.122.121.68"
foreach ($uri in @("http://$ip`:8793/v1/models", "http://127.0.0.1:8793/v1/models")) {
  try {
    $r = Invoke-WebRequest -Uri $uri -Headers @{ Authorization = "Bearer Sesame42" } -UseBasicParsing -TimeoutSec 10
    Write-Host "OK $uri ->" $r.StatusCode
  } catch {
    Write-Host "FAIL $uri ->" $_.Exception.Message
  }
}
Get-NetTCPConnection -LocalPort 8793 -ErrorAction SilentlyContinue |
  Format-Table LocalAddress, LocalPort, State -AutoSize

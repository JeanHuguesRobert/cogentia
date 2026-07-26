$ErrorActionPreference = "Continue"
$startJs = "C:\tweesic\cogentia\scripts\ops\start-agent-gateway-windows.js"
Write-Host "Running $startJs"
$out = & node $startJs 2>&1 | Out-String
Write-Host $out
$log = Join-Path $env:USERPROFILE ".cogentia\var\agent-gateway.log"
if (Test-Path $log) {
  Write-Host "--- log ---"
  Get-Content $log -Tail 20
}
Get-NetTCPConnection -LocalPort 8793 -ErrorAction SilentlyContinue |
  Format-Table LocalAddress, LocalPort, State -AutoSize

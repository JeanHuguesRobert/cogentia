# Set COGENTIA_API_KEY on this host's agent-gateway secrets file (copy of inseme/.env authority).
# Usage (on tool host): pwsh -File set-cogentia-api-key-host.ps1 -Value '...'
param(
  [Parameter(Mandatory = $true)][string]$Value
)

$gw = Join-Path $env:USERPROFILE ".cogentia\secrets\agent-gateway.env"
$dir = Split-Path $gw -Parent
if (-not (Test-Path $dir)) {
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

$lines = @()
if (Test-Path $gw) {
  foreach ($line in Get-Content $gw) {
    $t = $line.TrimEnd()
    if ($t -match '^(AGENT_GATEWAY_TOKEN|COGENTIA_API_KEY)=') { continue }
    if ($t -ne '') { $lines += $t }
  }
}
$lines += "# Cogentia system bearer — authority is inseme/.env; this is a host copy under COGENTIA_API_KEY only"
$lines += "COGENTIA_API_KEY=$Value"
Set-Content -Path $gw -Value ($lines -join "`n") -Encoding utf8
Write-Host "Wrote keys:" ((Get-Content $gw | Where-Object { $_ -match '^[A-Z0-9_]+=' }) | ForEach-Object { ($_ -split '=')[0] })

# Restart node processes that look like agent-gateway
Get-CimInstance Win32_Process -Filter "name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -and ($_.CommandLine -match 'agent-gateway') } |
  ForEach-Object {
    Write-Host "Stopping agent-gateway pid $($_.ProcessId)"
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

$start = "C:\tweesic\cogentia\scripts\ops\start-agent-gateway-windows.ps1"
if (Test-Path $start) {
  Write-Host "Starting $start"
  Start-Process pwsh -ArgumentList @("-NoProfile", "-File", $start) -WindowStyle Hidden
} else {
  Write-Host "No start script found; start agent-gateway with COGENTIA_API_KEY from $gw"
}

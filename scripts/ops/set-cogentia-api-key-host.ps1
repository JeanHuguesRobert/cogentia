# Set COGENTIA_API_KEY on this host's agent-gateway secrets file.
# Authority for the value: inseme/.env — this is a host copy under the name COGENTIA_API_KEY only.
# Usage: pwsh -File set-cogentia-api-key-host.ps1 -Value '...'
param(
  [Parameter(Mandatory = $true)][string]$Value
)

$ErrorActionPreference = "Stop"
$gw = Join-Path $env:USERPROFILE ".cogentia\secrets\agent-gateway.env"
$dir = Split-Path $gw -Parent
if (-not (Test-Path $dir)) {
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

# Preserve non-secret operational settings; drop all token/secret names.
$keep = @{}
if (Test-Path $gw) {
  foreach ($raw in Get-Content $gw) {
    $line = $raw.Trim()
    if (-not $line -or $line.StartsWith("#")) { continue }
    $line = $line -replace '^export\s+', ''
    if ($line -notmatch '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') { continue }
    $k = $Matches[1]
    $v = $Matches[2]
    if ($k -in @(
        "COGENTIA_API_KEY",
        "AGENT_GATEWAY_TOKEN",
        "AGENT_GATEWAY_INVOKE_TOKEN",
        "AGENT_GATEWAY_ACCEPT_TOKEN"
      )) {
      continue
    }
    $keep[$k] = $v
  }
}

# Defaults if missing
if (-not $keep.ContainsKey("AGENT_GATEWAY_BIND")) { $keep["AGENT_GATEWAY_BIND"] = "tailscale" }
if (-not $keep.ContainsKey("AGENT_GATEWAY_PORT")) { $keep["AGENT_GATEWAY_PORT"] = "8793" }
if (-not $keep.ContainsKey("AGENT_GATEWAY_REPO_ROOTS")) { $keep["AGENT_GATEWAY_REPO_ROOTS"] = "C:\tweesic" }

$out = @(
  "# Agent CLI Gateway host env — secrets under COGENTIA_API_KEY only",
  "# Authority: inseme/.env ; this file is a copy. Override requires a comment above the line."
)
foreach ($k in ($keep.Keys | Sort-Object)) {
  $out += "$k=$($keep[$k])"
}
$out += "COGENTIA_API_KEY=$Value"
Set-Content -Path $gw -Value ($out -join "`n") -Encoding utf8
Write-Host "Wrote keys:" (($out | Where-Object { $_ -match '^[A-Z0-9_]+=' }) | ForEach-Object { ($_ -split "=")[0] })

Get-CimInstance Win32_Process -Filter "name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -and ($_.CommandLine -match "agent-gateway") } |
  ForEach-Object {
    Write-Host "Stopping agent-gateway pid $($_.ProcessId)"
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

Start-Sleep -Seconds 2
$start = "C:\tweesic\cogentia\scripts\ops\start-agent-gateway-windows.ps1"
if (Test-Path $start) {
  Write-Host "Starting $start"
  Start-Process pwsh -ArgumentList @("-NoProfile", "-File", $start) -WindowStyle Hidden
} else {
  Write-Host "No start script; start agent-gateway with env from $gw"
}

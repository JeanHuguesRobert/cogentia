# Install Agent CLI Gateway on Windows (ThinkPad / dev workstation).
# Usage:
#   pwsh -File install-agent-gateway-windows.ps1
#   pwsh -File install-agent-gateway-windows.ps1 -Bind tailscale -Start

param(
    [ValidateSet('loopback', 'tailscale', 'all')]
    [string]$Bind = 'loopback',
    [int]$Port = 8793,
    [switch]$Start
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$secretsDir = Join-Path $env:USERPROFILE '.cogentia\secrets'
$envFile = Join-Path $secretsDir 'agent-gateway.env'

New-Item -ItemType Directory -Force -Path $secretsDir | Out-Null

$token = $null
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^export AGENT_GATEWAY_TOKEN=(.+)$') { $token = $Matches[1].Trim() }
    }
}
if (-not $token) {
    $bytes = New-Object byte[] 24
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $token = -join ($bytes | ForEach-Object { $_.ToString('x2') })
}

$bindNeedsToken = $Bind -ne 'loopback'
if ($bindNeedsToken -and -not $token) {
    throw 'Token required for non-loopback bind'
}

$content = @"
# Agent CLI Gateway — dot-source in pwsh: . `$env:USERPROFILE\.cogentia\secrets\agent-gateway.env
`$env:AGENT_GATEWAY_BIND = '$Bind'
`$env:AGENT_GATEWAY_PORT = '$Port'
`$env:AGENT_GATEWAY_TOKEN = '$token'
`$env:AGENT_GATEWAY_REPO_ROOTS = 'C:\tweesic'
"@

Set-Content -Path $envFile -Value $content -Encoding utf8
Write-Host "[agent-gateway] wrote $envFile"

Write-Host @"

Start:
  cd $root
  . $envFile   # or dot-source equivalent in pwsh
  `$env:AGENT_GATEWAY_BIND='$Bind'
  `$env:AGENT_GATEWAY_TOKEN='$token'
  node scripts/agent-gateway.js --port $Port

Health:
  curl http://127.0.0.1:$Port/health

"@

if ($Start) {
    . $envFile
    Push-Location $root
    try {
        node scripts/agent-gateway.js --port $Port
    } finally {
        Pop-Location
    }
}
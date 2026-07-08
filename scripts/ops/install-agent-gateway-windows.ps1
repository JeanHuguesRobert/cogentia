# Install Agent CLI Gateway on Windows (ThinkPad / dev workstation).
# Usage:
#   pwsh -File install-agent-gateway-windows.ps1
#   pwsh -File install-agent-gateway-windows.ps1 -Bind tailscale
#   pwsh -File install-agent-gateway-windows.ps1 -Bind tailscale -RegisterStartupTask

param(
    [ValidateSet('loopback', 'tailscale', 'all')]
    [string]$Bind = 'loopback',
    [int]$Port = 8793,
    [int]$MaxConcurrent = 8,
    [switch]$Start,
    [switch]$RegisterStartupTask
)

$ErrorActionPreference = 'Stop'
$nodeSlug = ([System.Net.Dns]::GetHostName()).ToLower()
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$secretsDir = Join-Path $env:USERPROFILE '.cogentia\secrets'
$varDir = Join-Path $env:USERPROFILE '.cogentia\var'
$envFile = Join-Path $secretsDir 'agent-gateway.env'

New-Item -ItemType Directory -Force -Path $secretsDir, $varDir | Out-Null

$token = $null
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^export AGENT_GATEWAY_TOKEN=(.+)$') { $token = $Matches[1].Trim() }
        if ($_ -match '^\$env:AGENT_GATEWAY_TOKEN\s*=\s*[''"]?([^''"]+)') { $token = $Matches[1].Trim() }
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
# Agent CLI Gateway — loaded by Import-AgentGatewayEnv.ps1 or agent-gateway-heartbeat.js
export AGENT_GATEWAY_BIND=$Bind
export AGENT_GATEWAY_PORT=$Port
export AGENT_GATEWAY_TOKEN=$token
export AGENT_GATEWAY_REPO_ROOTS=C:\tweesic
export AGENT_GATEWAY_MAX_CONCURRENT=$MaxConcurrent
"@

Set-Content -Path $envFile -Value $content -Encoding utf8
Write-Host "[agent-gateway] wrote $envFile (bind=$Bind max_concurrent=$MaxConcurrent)"

Write-Host @"

Start (foreground):
  cd $root
  . $($PSScriptRoot)\Import-AgentGatewayEnv.ps1; Import-AgentGatewayEnv $envFile
  node scripts/agent-gateway.js --port $Port

Start (background):
  pwsh -File $($PSScriptRoot)\start-agent-gateway-windows.ps1

Health:
  curl http://127.0.0.1:$Port/health -H "Authorization: Bearer <token>"

"@

if ($RegisterStartupTask) {
    $taskName = 'CogentiaAgentGateway'
    $launcher = Join-Path $secretsDir "boot-agent-gateway-$nodeSlug.ps1"
    @"
`$ErrorActionPreference = 'Stop'
& '$($PSScriptRoot)\start-agent-gateway-windows.ps1' -EnvFile '$envFile' -Port $Port
"@ | Set-Content -Encoding utf8 $launcher

    $nodeExe = (Get-Command pwsh).Source
    $action = New-ScheduledTaskAction -Execute $nodeExe -Argument "-NoProfile -File `"$launcher`""
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
        -Description "Start agent-cli-gateway on logon ($nodeSlug)" -Force | Out-Null
    Write-Host "[agent-gateway] registered startup task: $taskName"
}

if ($Start) {
    . (Join-Path $PSScriptRoot 'Import-AgentGatewayEnv.ps1')
    Import-AgentGatewayEnv $envFile
    Push-Location $root
    try {
        node scripts/agent-gateway.js --port $Port
    } finally {
        Pop-Location
    }
}
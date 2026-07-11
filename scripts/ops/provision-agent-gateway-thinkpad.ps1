# Provision Agent CLI Gateway on this Windows dev workstation (ThinkPad tool host).
#
# Usage:
#   pwsh -File provision-agent-gateway-thinkpad.ps1
#   pwsh -File provision-agent-gateway-thinkpad.ps1 -SkipStart

param(
    [string]$AttractorEnvFile = '',
    [string]$Hostname = '',
    [int]$Port = 8793,
    [switch]$SkipStart,
    [switch]$SkipHeartbeat,
    [switch]$RegisterStartupTask
)

$ErrorActionPreference = 'Stop'
$ops = $PSScriptRoot
$nodeSlug = ([System.Net.Dns]::GetHostName()).ToLower()
if (-not $Hostname) { $Hostname = $nodeSlug }

if (-not $AttractorEnvFile) {
    $AttractorEnvFile = Join-Path $env:USERPROFILE ".cogentia\secrets\attractor-$nodeSlug.env"
}
if (-not (Test-Path $AttractorEnvFile)) {
    throw "Attractor env not found: $AttractorEnvFile"
}

function Get-DotEnvValue([string]$Path, [string]$Key) {
    if (-not (Test-Path $Path)) { return $null }
    foreach ($line in Get-Content $Path) {
        if ($line -match "^\s*(?:export\s+)?$([regex]::Escape($Key))\s*=\s*(.+)\s*$") {
            $value = $Matches[1].Trim()
            if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                return $value.Substring(1, $value.Length - 2)
            }
            return $value
        }
    }
    return $null
}

Write-Host "[$nodeSlug] installing agent-gateway env (tailscale bind)..."
$installArgs = @{ Bind = 'tailscale'; Port = $Port }
if ($RegisterStartupTask) { $installArgs.RegisterStartupTask = $true }
& (Join-Path $ops 'install-agent-gateway-windows.ps1') @installArgs

$bbUrl = Get-DotEnvValue $AttractorEnvFile 'COGENTIA_BLACKBOARD_URL'
$bbToken = Get-DotEnvValue $AttractorEnvFile 'COGENTIA_BLACKBOARD_UPSERT_TOKEN'
if (-not $bbUrl -or -not $bbToken) {
    throw 'COGENTIA_BLACKBOARD_URL and COGENTIA_BLACKBOARD_UPSERT_TOKEN required in attractor env'
}

$secretsDir = Join-Path $env:USERPROFILE '.cogentia\secrets'
$bbFile = Join-Path $secretsDir 'agent-gateway-blackboard.env'
$gatewayEnv = Join-Path $secretsDir 'agent-gateway.env'
. (Join-Path $ops 'Import-AgentGatewayEnv.ps1')
Import-AgentGatewayEnv $gatewayEnv
$token = $env:AGENT_GATEWAY_TOKEN

$heartbeatUrl = "http://${Hostname}:$Port/health?quick=1"
$tsBin = 'C:\Program Files\Tailscale\tailscale.exe'
if (Test-Path $tsBin) {
    try {
        $tsIp = (& $tsBin ip -4 2>$null | Select-Object -First 1).Trim()
        if ($tsIp -match '^\d+\.\d+\.\d+\.\d+$') {
            $heartbeatUrl = "http://${tsIp}:$Port/health?quick=1"
        }
    } catch { }
}

@(
    "export COGENTIA_BLACKBOARD_URL=$bbUrl"
    "export COGENTIA_BLACKBOARD_UPSERT_TOKEN=$bbToken"
    "export AGENT_GATEWAY_ATTRACTOR_ID=attractor:${Hostname}:agent-cli-gateway"
    "export AGENT_GATEWAY_ATTRACTOR_NODE_ID=resource://${Hostname}"
    "export AGENT_GATEWAY_ATTRACTOR_ENDPOINT=http://${Hostname}:$Port"
    "export AGENT_GATEWAY_HEARTBEAT_URL=$heartbeatUrl"
    'export AGENT_GATEWAY_ATTRACTOR_TTL_SECONDS=300'
) | Set-Content -Encoding utf8 $bbFile
Write-Host "[$nodeSlug] wrote $bbFile"

if (-not $SkipStart) {
    Write-Host "[$nodeSlug] starting gateway..."
    & node (Join-Path $ops 'start-agent-gateway-windows.js') --env-file $gatewayEnv --port $Port
}

if (-not $SkipHeartbeat) {
    Write-Host "[$nodeSlug] registering gateway heartbeat task..."
    & (Join-Path $ops 'install-agent-gateway-heartbeat-windows.ps1') `
        -GatewayEnvFile $gatewayEnv `
        -BlackboardEnvFile $bbFile
}

$headers = @{ Accept = 'application/json' }
if ($token) { $headers.Authorization = "Bearer $token" }

$healthHost = if (($env:AGENT_GATEWAY_BIND ?? 'tailscale').ToLower() -eq 'tailscale') { $Hostname } else { '127.0.0.1' }

Write-Host "[$nodeSlug] smoke test http://${healthHost}:$Port/v1/tools..."
$tools = Invoke-RestMethod -Uri "http://${healthHost}:$Port/v1/tools" -Headers $headers -TimeoutSec 15
$toolCount = @($tools.data).Count
Write-Host "  tools: $toolCount"

Write-Host "[$nodeSlug] smoke test tailnet http://${Hostname}:$Port/health..."
try {
    $tailHealth = Invoke-RestMethod -Uri "http://${Hostname}:$Port/health" -Headers $headers -TimeoutSec 15
    Write-Host "  tailnet ok=$($tailHealth.ok) repl_sessions=$($tailHealth.repl_sessions)"
} catch {
    Write-Warning "Tailnet health failed (gateway may still be loopback-only): $_"
}

Write-Host @"

[done] ThinkPad agent-cli-gateway provisioned

  endpoint:  http://${Hostname}:$Port
  attractor: attractor:${Hostname}:agent-cli-gateway
  token:     (in $gatewayEnv)

  curl http://${Hostname}:$Port/v1/tools -H "Authorization: Bearer TOKEN"
  curl -N http://${Hostname}:$Port/v1/chat/completions \
    -H "Authorization: Bearer TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"model":"shell-repl","stream":false,"messages":[{"role":"user","content":"echo THINKPAD_OK"}],"metadata":{"adapter_mode":"repl","expect":"THINKPAD_OK"}}'

"@
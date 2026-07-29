# Long-running Agent CLI Gateway process for Windows Task Scheduler (systemd-style).
# Loads agent-gateway.env, stops stale listeners, then runs node in the foreground.
# The scheduled task owns this process lifetime — do not spawn-and-exit.
#
# Usage:
#   pwsh -NoProfile -File run-agent-gateway-windows-foreground.ps1
#   pwsh -NoProfile -File run-agent-gateway-windows-foreground.ps1 -EnvFile $env:USERPROFILE\.cogentia\secrets\agent-gateway.env

param(
    [string]$EnvFile = "",
    [string]$RepoRoot = "",
    [int]$Port = 0
)

$ErrorActionPreference = 'Stop'
$ops = $PSScriptRoot
$root = if ($RepoRoot) { Resolve-Path $RepoRoot } else { Resolve-Path (Join-Path $ops '..\..') }
$secretsDir = Join-Path $env:USERPROFILE '.cogentia\secrets'
$varDir = Join-Path $env:USERPROFILE '.cogentia\var'
if (-not $EnvFile) {
    $EnvFile = Join-Path $secretsDir 'agent-gateway.env'
}
if (-not (Test-Path $EnvFile)) {
    throw "Env file not found: $EnvFile"
}

New-Item -ItemType Directory -Force -Path $varDir | Out-Null
$logFile = Join-Path $varDir 'agent-gateway.log'

. (Join-Path $ops 'Import-AgentGatewayEnv.ps1')
Import-AgentGatewayEnv $EnvFile

if (-not $Port -or $Port -le 0) {
    $Port = if ($env:AGENT_GATEWAY_PORT) { [int]$env:AGENT_GATEWAY_PORT } else { 8793 }
}

$token = @(
    $env:COGENTIA_API_KEY
    $env:AGENT_GATEWAY_TOKEN
) | Where-Object { $_ -and $_.Trim() } | Select-Object -First 1
if (-not $token) {
    throw 'COGENTIA_API_KEY (or legacy AGENT_GATEWAY_TOKEN) required in env file'
}

$gatewayScript = Join-Path $root 'scripts\agent-gateway.js'
if (-not (Test-Path $gatewayScript)) {
    throw "Gateway entry missing: $gatewayScript"
}
$nodeExe = (Get-Command node -ErrorAction Stop).Source

function Stop-StaleGateway {
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and ($_.CommandLine -match 'agent-gateway\.js') } |
        ForEach-Object {
            Write-Host "[agent-gateway] stopping stale pid $($_.ProcessId)"
            Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        }
}

Stop-StaleGateway
Start-Sleep -Seconds 1

$stamp = (Get-Date).ToString('o')
$errLog = Join-Path $varDir 'agent-gateway.err.log'
Add-Content -Path $logFile -Value "[$stamp] foreground start port=$Port bind=$($env:AGENT_GATEWAY_BIND) node=$nodeExe" -Encoding utf8

Set-Location $root
# Block here: Task Scheduler process lifetime = gateway lifetime (like systemd Type=simple).
# Cannot redirect stdout+stderr to the same path on Windows — use two files.
$p = Start-Process -FilePath $nodeExe `
    -ArgumentList @($gatewayScript, '--port', "$Port") `
    -WorkingDirectory $root `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput $logFile `
    -RedirectStandardError $errLog

if (-not $p) { throw 'failed to start agent-gateway.js' }
Write-Host "[agent-gateway] foreground pid=$($p.Id) port=$Port log=$logFile err=$errLog"
Wait-Process -Id $p.Id
exit $p.ExitCode

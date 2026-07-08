# Start or restart Agent CLI Gateway on Windows (background + log).
param(
    [string]$EnvFile = "",
    [string]$RepoRoot = "",
    [int]$Port = 8793
)

$ErrorActionPreference = 'Stop'

function Resolve-GatewayHealthHost([string]$Bind, [string]$Hostname) {
    $mode = ($Bind ?? 'loopback').ToLower()
    if ($mode -in @('loopback', 'localhost', '127.0.0.1')) {
        return '127.0.0.1'
    }
    if ($mode -eq 'tailscale') {
        $tsBin = 'C:\Program Files\Tailscale\tailscale.exe'
        if (Test-Path $tsBin) {
            try {
                $ip = & $tsBin ip -4 2>$null | Select-Object -First 1
                if ($ip -match '^\d+\.\d+\.\d+\.\d+$') { return $ip.Trim() }
            } catch { }
        }
        return $Hostname
    }
    return '127.0.0.1'
}

$nodeSlug = ([System.Net.Dns]::GetHostName()).ToLower()
$secretsDir = Join-Path $env:USERPROFILE '.cogentia\secrets'
$varDir = Join-Path $env:USERPROFILE '.cogentia\var'

if (-not $EnvFile) {
    $EnvFile = Join-Path $secretsDir 'agent-gateway.env'
}
if (-not $RepoRoot) {
    $RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
}

if (-not (Test-Path $EnvFile)) {
    throw "Env file not found: $EnvFile — run install-agent-gateway-windows.ps1 first"
}

New-Item -ItemType Directory -Force -Path $varDir | Out-Null
$logFile = Join-Path $varDir 'agent-gateway.log'

. (Join-Path $PSScriptRoot 'Import-AgentGatewayEnv.ps1')
Import-AgentGatewayEnv $EnvFile

$existing = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'scripts[\\/]agent-gateway\.js' } |
    Select-Object -ExpandProperty ProcessId -Unique

foreach ($pid in $existing) {
    Write-Host "[agent-gateway] stopping pid $pid"
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
}
if ($existing) { Start-Sleep -Seconds 1 }

$port = [int]($env:AGENT_GATEWAY_PORT ?? $Port)
$startScript = Join-Path $secretsDir "run-agent-gateway-$nodeSlug.ps1"
$importHelper = Join-Path $PSScriptRoot 'Import-AgentGatewayEnv.ps1'
@"
`$ErrorActionPreference = 'Stop'
. '$importHelper'
Import-AgentGatewayEnv '$EnvFile'
Set-Location '$RepoRoot'
node scripts/agent-gateway.js --port $port >> '$logFile' 2>&1
"@ | Set-Content -Encoding utf8 $startScript

$proc = Start-Process -FilePath (Get-Command pwsh).Source `
    -ArgumentList @('-NoProfile', '-WindowStyle', 'Hidden', '-File', $startScript) `
    -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 4

$token = $env:AGENT_GATEWAY_TOKEN
$headers = @{ Accept = 'application/json' }
if ($token) { $headers.Authorization = "Bearer $token" }

$healthHost = Resolve-GatewayHealthHost $env:AGENT_GATEWAY_BIND $nodeSlug

try {
    $health = Invoke-RestMethod -Uri "http://${healthHost}:$port/health" -Headers $headers -TimeoutSec 45
    if (-not $health.ok) { throw 'health_not_ok' }
    Write-Host "[agent-gateway] OK pid=$($proc.Id) port=$port log=$logFile"
    $health | ConvertTo-Json -Depth 4 -Compress
} catch {
    Write-Host "[agent-gateway] health check failed — see $logFile"
    if (Test-Path $logFile) { Get-Content $logFile -Tail 20 }
    throw
}
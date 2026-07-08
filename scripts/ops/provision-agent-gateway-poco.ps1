# Deploy Agent CLI Gateway to poco-jhr (Termux) over Tailscale SSH.
# Completes Phase 1 acceptance: ThinkPad -> phone curl over tailnet.
#
# Usage:
#   pwsh -File provision-agent-gateway-poco.ps1
#   pwsh -File provision-agent-gateway-poco.ps1 -Start
#   pwsh -File provision-agent-gateway-poco.ps1 -Start -Heartbeat

param(
    [string]$PocoHost = 'poco-jhr',
    [string]$TermuxUser = 'jh',
    [int]$SshPort = 8022,
    [string]$AttractorEnvFile = '',
    [switch]$Start,
    [switch]$Heartbeat,
    [switch]$SkipPull
)

$ErrorActionPreference = 'Stop'
$ops = $PSScriptRoot

function Invoke-Poco([string]$Command) {
    ssh -o BatchMode=yes -o ConnectTimeout=30 -p $SshPort "${TermuxUser}@${PocoHost}" $Command
}

function Copy-Poco([string]$Local, [string]$Remote) {
    scp -P $SshPort $Local "${TermuxUser}@${PocoHost}:$Remote"
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

Write-Host "[poco-jhr] checking SSH..."
Invoke-Poco 'hostname'

if (-not $SkipPull) {
    Write-Host '[poco-jhr] git pull cogentia main...'
    Invoke-Poco @'
cd ~/srv/cogentia/repos/cogentia && git fetch origin main && git switch main 2>/dev/null || git checkout main && git pull --ff-only origin main
'@
}

foreach ($script in @(
        'install-agent-gateway-termux.sh',
        'fractanet-termux-start-gateway.sh',
        'fractanet-termux-gateway-heartbeat.sh'
    )) {
    Copy-Poco (Join-Path $ops $script) "~/$script"
    Invoke-Poco "chmod +x ~/$script"
}
Invoke-Poco 'bash ~/install-agent-gateway-termux.sh'

if ($Start) {
    Write-Host '[poco-jhr] starting gateway...'
    Invoke-Poco 'bash ~/fractanet-termux-start-gateway.sh || echo FAIL'
}

if ($Heartbeat) {
    if (-not $AttractorEnvFile) {
        $slug = ([System.Net.Dns]::GetHostName()).ToLower()
        $AttractorEnvFile = Join-Path $env:USERPROFILE ".cogentia\secrets\attractor-$slug.env"
    }
    if (-not (Test-Path $AttractorEnvFile)) {
        throw "Attractor env not found for blackboard creds: $AttractorEnvFile"
    }
    $bbUrl = Get-DotEnvValue $AttractorEnvFile 'COGENTIA_BLACKBOARD_URL'
    $bbToken = Get-DotEnvValue $AttractorEnvFile 'COGENTIA_BLACKBOARD_UPSERT_TOKEN'
    if (-not $bbUrl -or -not $bbToken) {
        throw 'COGENTIA_BLACKBOARD_URL and COGENTIA_BLACKBOARD_UPSERT_TOKEN required in attractor env'
    }
    $bbFile = Join-Path $env:TEMP "agent-gateway-blackboard-$PocoHost.env"
    @(
        "export COGENTIA_BLACKBOARD_URL=$bbUrl"
        "export COGENTIA_BLACKBOARD_UPSERT_TOKEN=$bbToken"
        'export AGENT_GATEWAY_ATTRACTOR_ID=attractor:poco-jhr:agent-cli-gateway'
        'export AGENT_GATEWAY_ATTRACTOR_NODE_ID=resource://poco-jhr'
        "export AGENT_GATEWAY_ATTRACTOR_ENDPOINT=http://${PocoHost}:8793"
        'export AGENT_GATEWAY_ATTRACTOR_TTL_SECONDS=300'
    ) | Set-Content -Encoding utf8 $bbFile
    Copy-Poco $bbFile '~/srv/cogentia/secrets/agent-gateway-blackboard.env'
    Invoke-Poco 'chmod 600 ~/srv/cogentia/secrets/agent-gateway-blackboard.env'
    Write-Host '[poco-jhr] publishing blackboard attractor...'
    Invoke-Poco 'bash ~/fractanet-termux-gateway-heartbeat.sh'
}

Write-Host @'

[done] From ThinkPad (replace TOKEN from phone ~/srv/cogentia/secrets/agent-gateway.env):

  ssh -p 8022 jh@poco-jhr grep AGENT_GATEWAY_TOKEN ~/srv/cogentia/secrets/agent-gateway.env

  curl -N http://poco-jhr:8793/v1/chat/completions \
    -H "Authorization: Bearer TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"grok-build\",\"stream\":true,\"messages\":[{\"role\":\"user\",\"content\":\"say OK\"}]}"

'@
# Deploy Agent CLI Gateway to poco-jhr (Termux) over Tailscale SSH.
# Completes Phase 1 acceptance: ThinkPad -> phone curl over tailnet.
#
# Usage:
#   pwsh -File provision-agent-gateway-poco.ps1
#   pwsh -File provision-agent-gateway-poco.ps1 -Start

param(
    [string]$PocoHost = 'poco-jhr',
    [string]$TermuxUser = 'jh',
    [int]$SshPort = 8022,
    [switch]$Start,
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

Write-Host "[poco-jhr] checking SSH..."
Invoke-Poco 'hostname'

if (-not $SkipPull) {
    Write-Host '[poco-jhr] git pull cogentia main...'
    Invoke-Poco @'
cd ~/srv/cogentia/repos/cogentia && git fetch origin main && git switch main 2>/dev/null || git checkout main && git pull --ff-only origin main
'@
}

foreach ($script in @('install-agent-gateway-termux.sh', 'fractanet-termux-start-gateway.sh')) {
    Copy-Poco (Join-Path $ops $script) "~/$script"
    Invoke-Poco "chmod +x ~/$script"
}
Invoke-Poco 'bash ~/install-agent-gateway-termux.sh'

if ($Start) {
    Write-Host '[poco-jhr] starting gateway...'
    Invoke-Poco @'
source ~/srv/cogentia/secrets/agent-gateway.env
cd ~/srv/cogentia/repos/cogentia
pgrep -f "scripts/agent-gateway.js" >/dev/null || nohup node scripts/agent-gateway.js >> ~/.cogentia/var/agent-gateway.log 2>&1 &
sleep 2
source ~/srv/cogentia/secrets/agent-gateway.env
curl -sf -H "Authorization: Bearer $AGENT_GATEWAY_TOKEN" "http://127.0.0.1:8793/health" && echo OK || echo FAIL
'@
}

Write-Host @'

[done] From ThinkPad (replace TOKEN from phone ~/srv/cogentia/secrets/agent-gateway.env):

  ssh -p 8022 jh@poco-jhr grep AGENT_GATEWAY_TOKEN ~/srv/cogentia/secrets/agent-gateway.env

  curl -N http://poco-jhr:8793/v1/chat/completions \
    -H "Authorization: Bearer TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"grok-build\",\"stream\":true,\"messages\":[{\"role\":\"user\",\"content\":\"say OK\"}]}"

'@
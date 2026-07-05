# Full mobile dev bootstrap: corpus mirror from fracta + coding CLIs on poco-jhr.
# Usage: pwsh -File bootstrap-poco-jhr-dev.ps1
#        pwsh -File bootstrap-poco-jhr-dev.ps1 -SkipRsync   # tools only

param(
    [string]$PocoHost = 'poco-jhr',
    [switch]$SkipRsync
)

$ErrorActionPreference = 'Stop'
$ops = $PSScriptRoot

function Invoke-Poco([string]$Command) {
    ssh -o BatchMode=yes -o ConnectTimeout=30 -p 8022 "jh@${PocoHost}" $Command
}

function Copy-Poco([string]$Local, [string]$Remote) {
    scp -P 8022 $Local "jh@${PocoHost}:$Remote"
}

$scripts = @(
    'fractanet-sync-repos-from-fracta.sh',
    'fractanet-mobile-dev-setup.sh'
)
foreach ($s in $scripts) {
    Copy-Poco (Join-Path $ops $s) "~/$s"
    Invoke-Poco "chmod +x ~/$s"
}

if (-not $SkipRsync) {
    Write-Host '[poco-jhr] rsync repos from fracta (~2.9G) — may take several minutes...'
    Invoke-Poco 'bash ~/fractanet-sync-repos-from-fracta.sh'
}

Write-Host '[poco-jhr] installing coding agents...'
Invoke-Poco 'bash ~/fractanet-mobile-dev-setup.sh'

Write-Host '[poco-jhr] verify:'
Invoke-Poco 'export PATH=$HOME/.grok/bin:$HOME/.npm-global/bin:$PATH; which codex claude grok; du -sh ~/srv/cogentia/repos 2>/dev/null || echo no-repos-yet'

Write-Host '[done] Run auth on phone if needed: codex login | claude login | grok login'
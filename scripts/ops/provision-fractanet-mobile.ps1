# End-to-end provisioning of an Android Termux node on Fractanet.
#
# Steps (in order):
#   1. SSH mesh bootstrap (layout, authorized_keys, outbound mesh, ~/.termux/boot/sshd)
#   2. Termux:Boot install (ADB USB or SSH APK installer)
#   3. Optional dev stack (corpus mirror + Grok + proot Codex/Claude)
#
# Prerequisites:
#   - Termux + openssh; inbound SSH on port 8022 (password or key for first hop)
#   - Tailscale app joined (hostname e.g. poco-jhr)
#
# Usage:
#   pwsh -File provision-fractanet-mobile.ps1
#   pwsh -File provision-fractanet-mobile.ps1 -PocoPassword '...' -TermuxBootMethod adb
#   pwsh -File provision-fractanet-mobile.ps1 -SkipDev

param(
    [string]$PocoHost = 'poco-jhr',
    [string]$TermuxUser = 'jh',
    [int]$SshPort = 8022,
    [string]$PocoPassword = $env:POCO_SSH_PASSWORD,
    [ValidateSet('auto', 'adb', 'ssh', 'manual', 'skip')]
    [string]$TermuxBootMethod = 'auto',
    [switch]$SkipDev,
    [switch]$SkipTermuxBoot
)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot

Write-Host '=== [1/3] Fractanet SSH mesh bootstrap ==='
& "$here\bootstrap-poco-jhr.ps1" -PocoHost $PocoHost -TermuxUser $TermuxUser -SshPort $SshPort -PocoPassword $PocoPassword

if (-not $SkipTermuxBoot -and $TermuxBootMethod -ne 'skip') {
    Write-Host '=== [2/3] Termux:Boot (sshd at Android boot) ==='
    & "$here\install-termux-boot.ps1" -Method $TermuxBootMethod -PocoHost $PocoHost -TermuxUser $TermuxUser -SshPort $SshPort -PocoPassword $PocoPassword
} else {
    Write-Host '=== [2/3] Termux:Boot skipped ==='
}

if (-not $SkipDev) {
    Write-Host '=== [3/3] Dev stack (corpus + agents) ==='
    & "$here\bootstrap-poco-jhr-dev.ps1" -PocoHost $PocoHost -TermuxUser $TermuxUser -SshPort $SshPort -PocoPassword $PocoPassword
} else {
    Write-Host '=== [3/3] Dev stack skipped ==='
}

Write-Host @'

[done] Fractanet mobile provisioning complete.
Update registre-mariani/operium/registry/resources.yaml if node profile changed.

'@
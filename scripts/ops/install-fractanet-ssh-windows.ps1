#Requires -RunAsAdministrator
# Install inbound SSH for Fractanet mesh on Windows (admin user).
# Usage (elevated PowerShell):
#   pwsh -ExecutionPolicy Bypass -File C:\tweesic\cogentia\scripts\ops\install-fractanet-ssh-windows.ps1

param(
    [string]$MeshPubKeyPath = "$env:USERPROFILE\.cogentia\secrets\fractanet-mesh.pub"
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $MeshPubKeyPath)) {
    throw "Mesh public key not found: $MeshPubKeyPath"
}

$pub = (Get-Content $MeshPubKeyPath -Raw).Trim()
$adminKeys = "$env:ProgramData\ssh\administrators_authorized_keys"

if (-not (Test-Path $adminKeys)) {
    New-Item -Path $adminKeys -ItemType File -Force | Out-Null
}

$existing = Get-Content $adminKeys -ErrorAction SilentlyContinue
if ($existing -notcontains $pub) {
    Add-Content -Path $adminKeys -Value $pub
    Write-Host '[fractanet] added mesh pubkey to administrators_authorized_keys'
} else {
    Write-Host '[fractanet] mesh pubkey already present'
}

# SID grants work on all Windows locales (Administrators = S-1-5-32-544).
icacls $adminKeys /inheritance:r /grant 'SYSTEM:(F)' /grant '*S-1-5-32-544:(F)' | Out-Null

$sshd = Get-Service sshd -ErrorAction SilentlyContinue
if (-not $sshd) {
    throw 'OpenSSH Server (sshd) is not installed. Install via: Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0'
}

if ($sshd.Status -ne 'Running') {
    Start-Service sshd
}
Set-Service sshd -StartupType Automatic

$ruleName = 'OpenSSH-Server-In-TCP'
$rule = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
if ($rule) {
    if ($rule.Enabled -ne 'True') {
        Set-NetFirewallRule -Name $ruleName -Enabled True
    }
    Write-Host "[fractanet] firewall rule ${ruleName}: enabled"
} else {
    New-NetFirewallRule -Name $ruleName -DisplayName 'OpenSSH SSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 | Out-Null
    Write-Host "[fractanet] firewall rule ${ruleName}: created"
}

Write-Host '[fractanet] done'
Write-Host 'Test from fracta: ssh admin@100.122.121.68 hostname'
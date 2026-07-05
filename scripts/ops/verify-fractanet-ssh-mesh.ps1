# Verify Fractanet SSH mesh: local sshd posture + bidirectional reachability over Tailscale.
# Usage: pwsh -File verify-fractanet-ssh-mesh.ps1
# Optional: -SkipConnectivity to only check local sshd (e.g. right after reboot).

param(
    [switch]$SkipConnectivity
)

$ErrorActionPreference = 'Stop'
$tailscale = 'C:\Program Files\Tailscale\tailscale.exe'
$meshKey = Join-Path $env:USERPROFILE '.ssh\fractanet-mesh'

function Write-Check($ok, $label, $detail) {
    $mark = if ($ok) { 'OK' } else { 'FAIL' }
    Write-Host "[$mark] $label — $detail"
    if (-not $ok) { $script:failed = $true }
}

$failed = $false

# --- Local Windows sshd (inbound) ---
$sshd = Get-Service sshd -ErrorAction SilentlyContinue
Write-Check ($sshd -and $sshd.Status -eq 'Running') 'sshd running' $(if ($sshd) { $sshd.Status } else { 'not installed' })
Write-Check ($sshd -and $sshd.StartType -eq 'Automatic') 'sshd boot' $(if ($sshd) { $sshd.StartType } else { 'n/a' })

$adminKeys = "$env:ProgramData\ssh\administrators_authorized_keys"
Write-Check (Test-Path $adminKeys) 'administrators_authorized_keys' $adminKeys

$fw = Get-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -ErrorAction SilentlyContinue
Write-Check ($fw -and $fw.Enabled -eq 'True') 'firewall OpenSSH-Server-In-TCP' $(if ($fw) { $fw.Enabled } else { 'missing' })

if (-not (Test-Path $meshKey)) {
    Write-Check $false 'mesh private key' $meshKey
}

if ($SkipConnectivity) {
    if ($failed) { exit 1 }
    Write-Host '[done] local checks only'
    exit 0
}

# --- Tailscale IPs from status ---
if (-not (Test-Path $tailscale)) {
    Write-Check $false 'tailscale binary' $tailscale
    exit 1
}
$statusJson = & $tailscale status --json | ConvertFrom-Json
$selfIp = $statusJson.Self.TailscaleIPs[0]
$fractaPeer = $statusJson.Peer.PSObject.Properties | ForEach-Object { $_.Value } | Where-Object { $_.HostName -eq 'fracta' } | Select-Object -First 1
$fractaIp = $fractaPeer.TailscaleIPs[0]

Write-Host "self=$selfIp fracta=$fractaIp"

$sshBase = @('-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', '-o', 'StrictHostKeyChecking=accept-new', '-i', $meshKey)

# workstation -> fracta
$out = & ssh @sshBase @("ubuntu@${fractaIp}", 'hostname') 2>&1
Write-Check ($LASTEXITCODE -eq 0 -and $out -eq 'fracta') 'workstation -> fracta' ($out -join ' ')

# workstation -> self (loopback over tailscale)
$out = & ssh @sshBase @("admin@${selfIp}", 'hostname') 2>&1
Write-Check ($LASTEXITCODE -eq 0 -and $out -eq 'i7-thinkpad-jhr') 'workstation -> thinkpad (inbound)' ($out -join ' ')

# fracta -> thinkpad
$remote = "ssh -o BatchMode=yes -o ConnectTimeout=15 thinkpad hostname"
$out = & ssh @sshBase @("ubuntu@${fractaIp}", $remote) 2>&1
Write-Check ($LASTEXITCODE -eq 0 -and $out -eq 'i7-thinkpad-jhr') 'fracta -> thinkpad' ($out -join ' ')

# thinkpad -> fracta (outbound from this host)
$out = & ssh @sshBase @("ubuntu@${fractaIp}", 'hostname') 2>&1
Write-Check ($LASTEXITCODE -eq 0 -and $out -eq 'fracta') 'thinkpad -> fracta (outbound)' ($out -join ' ')

if ($failed) { exit 1 }
Write-Host '[done] mesh SSH checks passed'
exit 0
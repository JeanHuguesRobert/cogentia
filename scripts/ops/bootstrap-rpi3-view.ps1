# Bootstrap rpi3-view onto Fractanet from the ThinkPad (Pi must be reachable on LAN first boot).
#
# Prerequisites:
#   - Pi on with SSH enabled (Raspberry Pi Imager: enable SSH, user pi or your user)
#   - Pi LAN IP known (router DHCP or ping raspberrypi.local)
#   - TAILSCALE_AUTH_KEY in env or ~/.cogentia/secrets (not committed)
#
# Usage:
#   $env:TAILSCALE_AUTH_KEY = 'tskey-auth-...'   # or read from a local secrets file
#   pwsh -File bootstrap-rpi3-view.ps1 -PiLanIp 10.151.10.20 -PiUser jh
# Password: $env:PI_SSH_PASSWORD = '...'  (first LAN boot only)

param(
    [Parameter(Mandatory = $true)]
    [string]$PiLanIp,
    [string]$PiUser = 'jh',
    [string]$PiPassword = $env:PI_SSH_PASSWORD,
    [string]$MeshPubKeyPath = "$env:USERPROFILE\.cogentia\secrets\fractanet-mesh.pub",
    [string]$MeshKeyPath = "$env:USERPROFILE\.cogentia\secrets\fractanet-mesh",
    [string]$BootstrapScript = "$PSScriptRoot\fractanet-node-bootstrap.sh"
)

$ErrorActionPreference = 'Stop'

if (-not $env:TAILSCALE_AUTH_KEY) {
    throw 'Set TAILSCALE_AUTH_KEY from a local secrets store; never commit auth-key values or fragments'
}
if (-not (Test-Path $MeshPubKeyPath)) { throw "Missing mesh pubkey: $MeshPubKeyPath" }
if (-not (Test-Path $BootstrapScript)) { throw "Missing bootstrap script: $BootstrapScript" }

$pub = (Get-Content $MeshPubKeyPath -Raw).Trim().Replace('"', '\"')

function Invoke-PiScp([string]$Local, [string]$Remote) {
    if ($PiPassword) {
        if (-not (Get-Module Posh-SSH -ListAvailable)) {
            Install-Module Posh-SSH -Scope CurrentUser -Force -AllowClobber
        }
        Import-Module Posh-SSH -ErrorAction Stop
        $sec = ConvertTo-SecureString $PiPassword -AsPlainText -Force
        $cred = New-Object PSCredential ($PiUser, $sec)
        $sid = New-SSHSession -ComputerName $PiLanIp -Credential $cred -AcceptKey -ErrorAction Stop
        try {
            Set-SCPItem -ComputerName $PiLanIp -Credential $cred -Path $Local -Destination $Remote -AcceptKey -ErrorAction Stop
        } finally {
            Remove-SSHSession -SessionId $sid.SessionId | Out-Null
        }
        return
    }
    scp $Local "${PiUser}@${PiLanIp}:$Remote"
}

function Invoke-PiSsh([string]$Command) {
    if ($PiPassword) {
        if (-not (Get-Module Posh-SSH -ListAvailable)) {
            Install-Module Posh-SSH -Scope CurrentUser -Force -AllowClobber
        }
        Import-Module Posh-SSH -ErrorAction Stop
        $sec = ConvertTo-SecureString $PiPassword -AsPlainText -Force
        $cred = New-Object PSCredential ($PiUser, $sec)
        $r = Invoke-SSHCommand -ComputerName $PiLanIp -Credential $cred -Command $Command -AcceptKey -ErrorAction Stop
        if ($r.ExitStatus -ne 0) { throw "remote failed ($($r.ExitStatus)): $($r.Error)" }
        if ($r.Output) { $r.Output | ForEach-Object { Write-Host $_ } }
        return
    }
    ssh "${PiUser}@${PiLanIp}" $Command
}

if (-not $PiPassword) {
    Write-Host '[rpi3] no PI_SSH_PASSWORD — scp/ssh will prompt interactively'
}

Write-Host "[rpi3] copying bootstrap script to ${PiUser}@${PiLanIp}..."
Invoke-PiScp -Local $BootstrapScript -Remote '~/fractanet-node-bootstrap.sh'

$remote = @(
    "NODE_HOSTNAME=rpi3-view",
    "TAILNET_USER=$PiUser",
    "TAILSCALE_AUTH_KEY=$($env:TAILSCALE_AUTH_KEY)",
    "FRACTANET_MESH_PUBKEY=`"$pub`"",
    "ENABLE_POSTURE_CHECKING=1",
    'bash ~/fractanet-node-bootstrap.sh'
) -join ' '

Write-Host '[rpi3] running bootstrap on Pi...'
Invoke-PiSsh -Command $remote

if (Test-Path $MeshKeyPath) {
    Write-Host '[rpi3] installing mesh private key for outbound SSH...'
    Invoke-PiScp -Local $MeshKeyPath -Remote '~/.ssh/fractanet-mesh'
    Invoke-PiSsh -Command 'chmod 600 ~/.ssh/fractanet-mesh'
}

Write-Host '[rpi3] waiting for MagicDNS...'
Start-Sleep -Seconds 15

Write-Host '[rpi3] verify from ThinkPad:'
Write-Host '  ssh rpi3-view hostname'
Write-Host '  ssh rpi3-view "ssh fracta hostname; ssh thinkpad hostname"'
Write-Host '  ssh fracta "ssh rpi3-view hostname"'

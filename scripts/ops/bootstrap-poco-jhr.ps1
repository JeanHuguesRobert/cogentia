# Bootstrap poco-jhr (Termux on Android) onto Fractanet SSH mesh from the ThinkPad.
#
# Full mobile provisioning (mesh + Termux:Boot + dev stack):
#   pwsh -File provision-fractanet-mobile.ps1
#
# Prerequisites:
#   - Tailscale app on phone; hostname poco-jhr on tailnet
#   - Termux sshd on port 8022; inbound SSH works (password or fractanet-mesh key)
#   - ~/.ssh/config entry Host poco-jhr (or pass -PocoHost)
#
# Usage:
#   pwsh -File bootstrap-poco-jhr.ps1
#   pwsh -File bootstrap-poco-jhr.ps1 -PocoPassword '...'   # first boot only

param(
    [string]$PocoHost = 'poco-jhr',
    [string]$TermuxUser = 'jh',
    [int]$SshPort = 8022,
    [string]$PocoPassword = $env:POCO_SSH_PASSWORD,
    [string]$MeshPubKeyPath = "$env:USERPROFILE\.cogentia\secrets\fractanet-mesh.pub",
    [string]$MeshKeyPath = "$env:USERPROFILE\.cogentia\secrets\fractanet-mesh",
    [string]$LayoutScript = "$PSScriptRoot\fractanet-termux-layout.sh",
    [string]$BootstrapScript = "$PSScriptRoot\fractanet-termux-bootstrap.sh"
)

$ErrorActionPreference = 'Stop'

foreach ($p in @($MeshPubKeyPath, $LayoutScript, $BootstrapScript)) {
    if (-not (Test-Path $p)) { throw "Missing: $p" }
}

$pub = (Get-Content $MeshPubKeyPath -Raw).Trim().Replace('"', '\"')

function Invoke-PocoScp([string]$Local, [string]$Remote) {
    if ($PocoPassword) {
        if (-not (Get-Module Posh-SSH -ListAvailable)) {
            Install-Module Posh-SSH -Scope CurrentUser -Force -AllowClobber
        }
        Import-Module Posh-SSH -ErrorAction Stop
        $sec = ConvertTo-SecureString $PocoPassword -AsPlainText -Force
        $cred = New-Object PSCredential ($TermuxUser, $sec)
        Set-SCPItem -ComputerName $PocoHost -Port $SshPort -Credential $cred -Path $Local -Destination $Remote -AcceptKey -ErrorAction Stop
        return
    }
    scp -P $SshPort $Local "${TermuxUser}@${PocoHost}:$Remote"
}

function Invoke-PocoSsh([string]$Command) {
    if ($PocoPassword) {
        if (-not (Get-Module Posh-SSH -ListAvailable)) {
            Install-Module Posh-SSH -Scope CurrentUser -Force -AllowClobber
        }
        Import-Module Posh-SSH -ErrorAction Stop
        $sec = ConvertTo-SecureString $PocoPassword -AsPlainText -Force
        $cred = New-Object PSCredential ($TermuxUser, $sec)
        $sid = New-SSHSession -ComputerName $PocoHost -Port $SshPort -Credential $cred -AcceptKey -ErrorAction Stop
        try {
            $r = Invoke-SSHCommand -SessionId $sid.SessionId -Command $Command -TimeOut 120
            if ($r.ExitStatus -ne 0) { throw "remote failed ($($r.ExitStatus)): $($r.Error) $($r.Output)" }
            if ($r.Output) { $r.Output | ForEach-Object { Write-Host $_ } }
        } finally {
            Remove-SSHSession -SessionId $sid.SessionId | Out-Null
        }
        return
    }
    ssh -p $SshPort "${TermuxUser}@${PocoHost}" $Command
}

Write-Host "[poco-jhr] copying Termux bootstrap scripts..."
Invoke-PocoScp -Local $LayoutScript -Remote '~/fractanet-termux-layout.sh'
Invoke-PocoScp -Local $BootstrapScript -Remote '~/fractanet-termux-bootstrap.sh'

$remote = "chmod +x ~/fractanet-termux-layout.sh ~/fractanet-termux-bootstrap.sh && " +
    "export NODE_HOSTNAME=poco-jhr TERMUX_USER=$TermuxUser FRACTANET_MESH_PUBKEY='$pub' && " +
    'bash ~/fractanet-termux-bootstrap.sh'

Write-Host '[poco-jhr] running bootstrap on Termux...'
Invoke-PocoSsh -Command $remote

if (Test-Path $MeshKeyPath) {
    Write-Host '[poco-jhr] installing mesh private key for outbound SSH...'
    Invoke-PocoScp -Local $MeshKeyPath -Remote '~/.ssh/fractanet-mesh'
    Invoke-PocoSsh -Command 'chmod 600 ~/.ssh/fractanet-mesh'
}

Write-Host '[poco-jhr] verify outbound mesh SSH...'
Invoke-PocoSsh -Command 'ssh -o BatchMode=yes -o ConnectTimeout=15 fracta hostname'
Invoke-PocoSsh -Command 'ssh -o BatchMode=yes -o ConnectTimeout=15 thinkpad hostname'
Invoke-PocoSsh -Command 'ssh -o BatchMode=yes -o ConnectTimeout=15 rpi3-view hostname'

Write-Host '[poco-jhr] layout:'
Invoke-PocoSsh -Command 'ls -la ~/srv/cogentia && ls -la ~/.cogentia/var 2>/dev/null; cat ~/.cogentia/node-role 2>/dev/null'

Write-Host '[done] poco-jhr Termux mesh parity — update ~/.cogentia/registry/resources.yaml layout section'
# Install Termux:Boot on an Android Fractanet node (sshd survives device reboot).
#
# Termux:Boot is a separate Android app (com.termux.boot), not a pkg install.
# The ~/.termux/boot/sshd script is already created by fractanet-termux-bootstrap.sh;
# this step installs the app that runs those scripts at Android boot.
#
# Methods:
#   auto  — try ADB (USB), then SSH push + termux-open on device
#   adb   — adb install (phone USB + USB debugging authorized)
#   ssh   — copy fractanet-termux-install-boot.sh, download APK on device, open installer
#   manual — print F-Droid / APK instructions only
#
# Usage:
#   pwsh -File install-termux-boot.ps1
#   pwsh -File install-termux-boot.ps1 -Method adb
#   pwsh -File install-termux-boot.ps1 -Method ssh -PocoHost poco-jhr

param(
    [ValidateSet('auto', 'adb', 'ssh', 'manual')]
    [string]$Method = 'auto',
    [string]$PocoHost = 'poco-jhr',
    [string]$TermuxUser = 'jh',
    [int]$SshPort = 8022,
    [string]$PocoPassword = $env:POCO_SSH_PASSWORD,
    [string]$AdbExe = $env:ADB,
    [string]$BootVersion = 'v0.8.1',
    [string]$ApkUrl = 'https://github.com/termux/termux-boot/releases/download/v0.8.1/termux-boot-app_v0.8.1%2Bgithub.debug.apk',
    [string]$ApkFileName = 'termux-boot-app_v0.8.1+github.debug.apk',
    [string]$InstallScript = "$PSScriptRoot\fractanet-termux-install-boot.sh",
    [switch]$SkipPostSteps
)

$ErrorActionPreference = 'Stop'

function Resolve-AdbPath {
    if ($AdbExe -and (Test-Path $AdbExe)) { return $AdbExe }
    $cmd = Get-Command adb -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $candidates = @(
        "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
        "$env:USERPROFILE\AppData\Local\Android\Sdk\platform-tools\adb.exe",
        'C:\Android\platform-tools\adb.exe'
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }
    return $null
}

function Get-LocalApkPath {
    $cache = Join-Path $env:LOCALAPPDATA 'fractanet\termux-boot'
    New-Item -ItemType Directory -Force -Path $cache | Out-Null
    $dest = Join-Path $cache $ApkFileName
    if (-not (Test-Path $dest)) {
        Write-Host "[termux-boot] downloading $BootVersion..."
        Invoke-WebRequest -Uri $ApkUrl -OutFile $dest -UseBasicParsing
    }
    return $dest
}

function Test-AdbDevice([string]$Adb) {
    $out = & $Adb devices 2>&1 | Out-String
    return ($out -match '(?m)^\S+\s+device\s*$')
}

function Test-TermuxBootInstalled([string]$Adb) {
    $out = & $Adb shell pm list packages com.termux.boot 2>&1 | Out-String
    return ($out -match 'com\.termux\.boot')
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
            $r = Invoke-SSHCommand -SessionId $sid.SessionId -Command $Command -TimeOut 180
            if ($r.Output) { $r.Output | ForEach-Object { Write-Host $_ } }
            if ($r.ExitStatus -ne 0) { throw "remote failed ($($r.ExitStatus)): $($r.Error)" }
        } finally {
            Remove-SSHSession -SessionId $sid.SessionId | Out-Null
        }
        return
    }
    ssh -p $SshPort "${TermuxUser}@${PocoHost}" $Command
}

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

function Install-ViaAdb {
    $adb = Resolve-AdbPath
    if (-not $adb) { throw 'adb not found — install Android platform-tools or pass -AdbExe' }
    if (-not (Test-AdbDevice $adb)) {
        throw 'no adb device — enable USB debugging and authorize this PC'
    }
    if (Test-TermuxBootInstalled $adb) {
        Write-Host '[termux-boot] already installed (adb)'
        return 'already'
    }
    $apk = Get-LocalApkPath
    Write-Host "[termux-boot] adb install $apk"
    & $adb install -r $apk
    if (-not (Test-TermuxBootInstalled $adb)) {
        throw 'adb install finished but com.termux.boot not detected'
    }
    Write-Host '[termux-boot] installed via adb'
    return 'adb'
}

function Install-ViaSsh {
    if (-not (Test-Path $InstallScript)) { throw "Missing: $InstallScript" }
    Write-Host "[termux-boot] pushing installer to $PocoHost..."
    Invoke-PocoScp -Local $InstallScript -Remote '~/fractanet-termux-install-boot.sh'
    $remote = "chmod +x ~/fractanet-termux-install-boot.sh && TERMUX_BOOT_VERSION=$BootVersion bash ~/fractanet-termux-install-boot.sh"
    Invoke-PocoSsh -Command $remote
    Write-Host '[termux-boot] installer opened on device — confirm Install on phone, then launch Termux:Boot once'
    return 'ssh'
}

function Show-ManualSteps {
    Write-Host @'

[termux-boot] Manual install (one-time on the phone):
  1. F-Droid: install "Termux:Boot" (com.termux.boot)
     or open: https://f-droid.org/packages/com.termux.boot/
  2. Launch Termux:Boot once — grant boot permission if asked
  3. Android settings → Termux → Battery → Unrestricted
  4. Reboot phone; verify: ssh poco-jhr hostname (without opening Termux first)

'@
}

function Show-PostSteps {
    if ($SkipPostSteps) { return }
    Write-Host @'
[termux-boot] After install (required once):
  - Open the Termux:Boot app → allow boot permission
  - Android → Apps → Termux → Battery → Unrestricted / No optimization
  - Optional reboot test: ssh poco-jhr hostname without opening Termux manually

'@
}

$resolved = $Method
if ($resolved -eq 'auto') {
    $adb = Resolve-AdbPath
    if ($adb -and (Test-AdbDevice $adb)) {
        $resolved = 'adb'
    } else {
        try {
            ssh -p $SshPort -o BatchMode=yes -o ConnectTimeout=8 "${TermuxUser}@${PocoHost}" 'echo ok' 2>$null | Out-Null
            $resolved = 'ssh'
        } catch {
            $resolved = 'manual'
        }
    }
    Write-Host "[termux-boot] auto → $resolved"
}

switch ($resolved) {
    'adb' { Install-ViaAdb | Out-Null; Show-PostSteps }
    'ssh' { Install-ViaSsh | Out-Null; Show-PostSteps }
    'manual' { Show-ManualSteps }
    default { throw "unknown method: $resolved" }
}

Write-Host '[done] termux-boot provisioning step finished'
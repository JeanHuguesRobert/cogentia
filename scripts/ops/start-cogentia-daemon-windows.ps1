# Start (or replace) the local Cogentia daemon on 127.0.0.1:8790 with a log file and pid file.
# Does not register a scheduled task. Pair with watch-cogentia-daemon-windows.js for restarts.
param(
    [int]$Port = 8790,
    [string]$HostName = "127.0.0.1",
    [switch]$Replace
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$runDir = Join-Path $env:USERPROFILE ".cogentia\run"
$logDir = Join-Path $env:USERPROFILE ".cogentia\logs"
New-Item -ItemType Directory -Force -Path $runDir | Out-Null
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$pidFile = Join-Path $runDir "cogentia-daemon.pid"
$logFile = Join-Path $logDir "cogentia-daemon.jsonl"
$outFile = Join-Path $logDir "cogentia-daemon.out.log"
$errFile = Join-Path $logDir "cogentia-daemon.err.log"

if (-not $env:COGENTIA_REGISTRY) {
    $env:COGENTIA_REGISTRY = "C:\tweesic\JeanHuguesRobert\.cogentia.json"
}
if (-not $env:COGENTIA_DATA_DIR) {
    $env:COGENTIA_DATA_DIR = "C:\tweesic\JeanHuguesRobert"
}
$env:COGENTIA_DAEMON_LOG = $logFile

function Get-ListenerPid([int]$listenPort) {
    $match = netstat -ano | Select-String -Pattern ":$listenPort\s+.*LISTENING\s+(\d+)\s*$"
    if ($match) { return [int]$match.Matches[0].Groups[1].Value }
    return $null
}

$existing = Get-ListenerPid $Port
if ($existing) {
    if (-not $Replace) {
        Write-Host "Daemon already listening on ${HostName}:${Port} pid=$existing"
        Set-Content -Path $pidFile -Value $existing -Encoding ascii
        exit 0
    }
    Write-Host "Stopping existing listener pid=$existing"
    Stop-Process -Id $existing -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

$node = (Get-Command node).Source
$args = @("scripts\cogentia.js", "daemon", "--host", $HostName, "--port", "$Port")
$p = Start-Process -FilePath $node -ArgumentList $args -WorkingDirectory $repoRoot `
    -RedirectStandardOutput $outFile -RedirectStandardError $errFile `
    -WindowStyle Hidden -PassThru
Set-Content -Path $pidFile -Value $p.Id -Encoding ascii
Write-Host "Started cogentia daemon pid=$($p.Id) jsonl=$logFile stdout=$outFile stderr=$errFile"

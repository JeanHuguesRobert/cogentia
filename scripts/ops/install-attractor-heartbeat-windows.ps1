# Install or refresh the Fractanet attractor heartbeat scheduled task (Windows).
# Requires a private env file outside git, e.g.:
#   C:\Users\admin\.cogentia\secrets\attractor-<hostname>.env
param(
  [string]$EnvFile = "",
  [string]$LauncherScript = "",
  [int]$IntervalMinutes = 3
)

$ErrorActionPreference = "Stop"
$nodeSlug = ([System.Net.Dns]::GetHostName()).ToLower()
if (-not $EnvFile) {
  $EnvFile = Join-Path $env:USERPROFILE ".cogentia\secrets\attractor-$nodeSlug.env"
}
if (-not (Test-Path $EnvFile)) {
  throw "Env file not found: $EnvFile"
}
if (-not $LauncherScript) {
  $LauncherScript = Join-Path $env:USERPROFILE ".cogentia\secrets\run-attractor-heartbeat-$nodeSlug.ps1"
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$heartbeat = Join-Path $repoRoot "scripts\ops\attractor-heartbeat.js"
$taskName = "CogentiaAttractorHeartbeat"
$nodeExe = (Get-Command pwsh).Source

if (-not (Test-Path $LauncherScript)) {
  @"
`$ErrorActionPreference = "Stop"
`$env:COGENTIA_ATTRACTOR_ENV_FILE = "$EnvFile"
& node "$heartbeat"
exit `$LASTEXITCODE
"@ | Set-Content -Encoding utf8 $LauncherScript
}

$action = New-ScheduledTaskAction `
  -Execute $nodeExe `
  -Argument "-NoProfile -File `"$LauncherScript`""

$logonTrigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$repeatTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger @($logonTrigger, $repeatTrigger) `
  -Settings $settings `
  -Description "Publish cop/attractor.advertised for retrieval.inline to fracta blackboard ($nodeSlug)" `
  -Force | Out-Null

& $nodeExe -NoProfile -File $LauncherScript
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Registered scheduled task: $taskName"
Write-Host "  launcher: $LauncherScript"
Write-Host "  env:      $EnvFile"
Write-Host "  every:    ${IntervalMinutes}m + at logon"
Write-Host "Initial heartbeat OK"
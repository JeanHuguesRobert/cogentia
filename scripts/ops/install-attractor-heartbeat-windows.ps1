# Install or refresh the Fractanet attractor heartbeat scheduled task (Windows).
# Runs node.exe directly with -Hidden (no cmd.exe console flash).
param(
  [string]$EnvFile = "",
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

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$heartbeat = Join-Path $repoRoot "scripts\ops\attractor-heartbeat.js"
$taskName = "CogentiaAttractorHeartbeat"
$helper = Join-Path $PSScriptRoot "lib\register-hidden-node-task.ps1"
. $helper

$logonTrigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$repeatTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

Register-HiddenNodeTask `
  -TaskName $taskName `
  -ScriptPath $heartbeat `
  -WorkingDirectory $repoRoot `
  -ScriptArguments "--env-file `"$EnvFile`"" `
  -Triggers @($logonTrigger, $repeatTrigger) `
  -Description "Publish cop/attractor.advertised for retrieval.inline to fracta blackboard ($nodeSlug)"

& node $heartbeat --env-file $EnvFile
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Registered scheduled task: $taskName"
Write-Host "  runtime:    node.exe -Hidden (no cmd.exe)"
Write-Host "  env:        $EnvFile"
Write-Host "  every:      ${IntervalMinutes}m + at logon"
Write-Host "Initial heartbeat OK"
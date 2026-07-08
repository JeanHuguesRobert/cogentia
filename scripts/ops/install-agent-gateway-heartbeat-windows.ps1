# Register scheduled task to publish agent-cli-gateway attractor to fracta blackboard.
param(
    [string]$GatewayEnvFile = "",
    [string]$BlackboardEnvFile = "",
    [string]$LauncherScript = "",
    [int]$IntervalMinutes = 3
)

$ErrorActionPreference = 'Stop'
$nodeSlug = ([System.Net.Dns]::GetHostName()).ToLower()
$secretsDir = Join-Path $env:USERPROFILE '.cogentia\secrets'

if (-not $GatewayEnvFile) {
    $GatewayEnvFile = Join-Path $secretsDir 'agent-gateway.env'
}
if (-not $BlackboardEnvFile) {
    $BlackboardEnvFile = Join-Path $secretsDir 'agent-gateway-blackboard.env'
}
if (-not (Test-Path $GatewayEnvFile)) {
    throw "Gateway env not found: $GatewayEnvFile"
}
if (-not (Test-Path $BlackboardEnvFile)) {
    throw "Blackboard env not found: $BlackboardEnvFile"
}
if (-not $LauncherScript) {
    $LauncherScript = Join-Path $secretsDir "run-agent-gateway-heartbeat-$nodeSlug.ps1"
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$heartbeat = Join-Path $repoRoot 'scripts\ops\agent-gateway-heartbeat.js'
$taskName = 'CogentiaAgentGatewayHeartbeat'
$nodeExe = (Get-Command pwsh).Source

@"
`$ErrorActionPreference = 'Stop'
`$env:AGENT_GATEWAY_ENV_FILE = '$GatewayEnvFile'
`$env:AGENT_GATEWAY_ATTRACTOR_ENV_FILE = '$BlackboardEnvFile'
& node '$heartbeat'
exit `$LASTEXITCODE
"@ | Set-Content -Encoding utf8 $LauncherScript

$action = New-ScheduledTaskAction `
    -Execute $nodeExe `
    -Argument "-NoProfile -File `"$LauncherScript`""

$logonTrigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$repeatTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
    -RepetitionDuration (New-TimeSpan -Days 3650)

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
    -Description "Publish cop/attractor.advertised for agent-cli-gateway ($nodeSlug)" `
    -Force | Out-Null

& $nodeExe -NoProfile -File $LauncherScript
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Registered scheduled task: $taskName"
Write-Host "  launcher: $LauncherScript"
Write-Host "  gateway:  $GatewayEnvFile"
Write-Host "  blackboard: $BlackboardEnvFile"
Write-Host "  every:    ${IntervalMinutes}m + at logon"
Write-Host 'Initial gateway heartbeat OK'
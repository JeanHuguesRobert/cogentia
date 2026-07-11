# Register scheduled task to publish agent-cli-gateway attractor to fracta blackboard.
# Runs node.exe directly with -Hidden (no cmd.exe console flash).
param(
    [string]$GatewayEnvFile = "",
    [string]$BlackboardEnvFile = "",
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

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$heartbeat = Join-Path $repoRoot 'scripts\ops\agent-gateway-heartbeat.js'
$taskName = 'CogentiaAgentGatewayHeartbeat'
$helper = Join-Path $PSScriptRoot 'lib\register-hidden-node-task.ps1'
. $helper

$logonTrigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$repeatTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
    -RepetitionDuration (New-TimeSpan -Days 3650)

Register-HiddenNodeTask `
    -TaskName $taskName `
    -ScriptPath $heartbeat `
    -WorkingDirectory $repoRoot `
    -ScriptArguments "--gateway-env-file `"$GatewayEnvFile`" --blackboard-env-file `"$BlackboardEnvFile`"" `
    -Triggers @($logonTrigger, $repeatTrigger) `
    -Description "Publish cop/attractor.advertised for agent-cli-gateway ($nodeSlug)"

& node $heartbeat --gateway-env-file $GatewayEnvFile --blackboard-env-file $BlackboardEnvFile
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Registered scheduled task: $taskName"
Write-Host "  runtime:    node.exe -Hidden (no cmd.exe)"
Write-Host "  gateway:    $GatewayEnvFile"
Write-Host "  blackboard: $BlackboardEnvFile"
Write-Host "  every:      ${IntervalMinutes}m + at logon"
Write-Host 'Initial gateway heartbeat OK'
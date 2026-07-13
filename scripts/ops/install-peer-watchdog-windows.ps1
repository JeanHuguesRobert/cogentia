# Register scheduled task to monitor coordinator VPS health.
# Runs node.exe directly with -Hidden (no cmd.exe console flash).
param(
    [string]$BlackboardEnvFile = ""
)

$ErrorActionPreference = 'Stop'
$nodeSlug = ([System.Net.Dns]::GetHostName()).ToLower()
$secretsDir = Join-Path $env:USERPROFILE '.cogentia\secrets'

if (-not $BlackboardEnvFile) {
    $BlackboardEnvFile = Join-Path $secretsDir 'agent-gateway-blackboard.env'
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$watchdog = Join-Path $repoRoot 'scripts\ops\fractanet-peer-watchdog.js'
$taskName = 'CogentiaPeerWatchdog'
$helper = Join-Path $PSScriptRoot 'lib\register-hidden-node-task.ps1'

# Read Env file if it exists to set variables for initial test run
$envVars = @{}
if (Test-Path $BlackboardEnvFile) {
    Get-Content $BlackboardEnvFile | ForEach-Object {
        $trimmed = $_.Trim()
        if ($trimmed -and -not $trimmed.StartsWith('#')) {
            if ($trimmed -match '^([^=]+)=(.*)$') {
                $key = $Matches[1].Trim()
                $val = $Matches[2].Trim()
                $envVars[$key] = $val
                [Environment]::SetEnvironmentVariable($key, $val, 'Process')
            }
        }
    }
}

. $helper

$logonTrigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

# Use task scheduler to launch the persistent node daemon at logon
Register-HiddenNodeTask `
    -TaskName $taskName `
    -ScriptPath $watchdog `
    -WorkingDirectory $repoRoot `
    -ScriptArguments "--blackboard-env-file `"$BlackboardEnvFile`"" `
    -Triggers @($logonTrigger) `
    -Description "Active Fractanet Peer Watchdog ($nodeSlug)"

Write-Host "Registered scheduled task: $taskName"
Write-Host "  runtime:    node.exe -Hidden (no cmd.exe)"
Write-Host "  triggers:   at logon"

# Start the task immediately
Start-ScheduledTask -TaskName $taskName
Write-Host "Started task CogentiaPeerWatchdog"

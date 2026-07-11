# Register a Windows scheduled task that runs node.exe directly (no cmd.exe flash).
# Usage:
#   . .\register-hidden-node-task.ps1
#   Register-HiddenNodeTask -TaskName 'Example' -ScriptPath 'C:\...\script.js' -WorkingDirectory 'C:\...'

function Register-HiddenNodeTask {
    param(
        [Parameter(Mandatory = $true)][string]$TaskName,
        [Parameter(Mandatory = $true)][string]$ScriptPath,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [string]$NodeExe = '',
        [string]$ScriptArguments = '',
        [object[]]$Triggers = @(),
        [string]$Description = ''
    )

    if (-not $NodeExe) {
        $NodeExe = (Get-Command node).Source
    }

    $args = "`"$ScriptPath`""
    if ($ScriptArguments) {
        $args = "$args $ScriptArguments"
    }

    $action = New-ScheduledTaskAction `
        -Execute $NodeExe `
        -Argument $args `
        -WorkingDirectory $WorkingDirectory

    $settings = New-ScheduledTaskSettingsSet `
        -Hidden `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -MultipleInstances IgnoreNew

    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $Triggers `
        -Settings $settings `
        -Description $Description `
        -Force | Out-Null
}
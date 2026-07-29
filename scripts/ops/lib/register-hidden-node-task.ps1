# Register a Windows scheduled task that runs node.exe or a long-running script
# without a visible console flash (Hidden settings).
#
# Usage:
#   . .\register-hidden-node-task.ps1
#   Register-HiddenNodeTask -TaskName 'Example' -ScriptPath 'C:\...\script.js' -WorkingDirectory 'C:\...'
#   Register-HiddenPwshTask -TaskName 'Example' -ScriptPath 'C:\...\run.ps1' -WorkingDirectory 'C:\...'

function New-DurableTaskSettings {
    # ExecutionTimeLimit Zero = unlimited (default was often 72h and kills daemons).
    $settings = New-ScheduledTaskSettingsSet `
        -Hidden `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -MultipleInstances IgnoreNew `
        -RestartCount 3 `
        -RestartInterval (New-TimeSpan -Minutes 1) `
        -ExecutionTimeLimit ([TimeSpan]::Zero)
    return $settings
}

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

    $settings = New-DurableTaskSettings

    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $Triggers `
        -Settings $settings `
        -Description $Description `
        -Force | Out-Null
}

function Register-HiddenPwshTask {
    param(
        [Parameter(Mandatory = $true)][string]$TaskName,
        [Parameter(Mandatory = $true)][string]$ScriptPath,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [string]$PwshExe = '',
        [string]$ScriptArguments = '',
        [object[]]$Triggers = @(),
        [string]$Description = '',
        [string]$RunAsUser = ''
    )

    if (-not $PwshExe) {
        $PwshExe = (Get-Command pwsh -ErrorAction SilentlyContinue)?.Source
        if (-not $PwshExe) { $PwshExe = (Get-Command powershell).Source }
    }

    $argList = "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""
    if ($ScriptArguments) {
        $argList = "$argList $ScriptArguments"
    }

    $action = New-ScheduledTaskAction `
        -Execute $PwshExe `
        -Argument $argList `
        -WorkingDirectory $WorkingDirectory

    $settings = New-DurableTaskSettings
    $triggerList = if ($Triggers -and $Triggers.Count) { $Triggers } else { @() }

    $principal = $null
    if ($RunAsUser) {
        $principal = New-ScheduledTaskPrincipal -UserId $RunAsUser -LogonType Interactive -RunLevel Limited
    }

    $reg = @{
        TaskName    = $TaskName
        Action      = $action
        Settings    = $settings
        Description = $Description
        Force       = $true
    }
    if ($triggerList.Count) { $reg.Trigger = $triggerList }
    if ($principal) { $reg.Principal = $principal }

    Register-ScheduledTask @reg | Out-Null
}

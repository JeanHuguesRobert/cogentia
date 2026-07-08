function Import-AgentGatewayEnv {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        throw "Env file not found: $Path"
    }
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith('#')) { return }
        if ($line -match '^\$env:([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$') {
            $value = $Matches[2].Trim().Trim("'").Trim('"')
            Set-Item -Path "Env:$($Matches[1])" -Value $value
            return
        }
        if ($line -match '^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$') {
            $value = $Matches[2].Trim().Trim("'").Trim('"')
            Set-Item -Path "Env:$($Matches[1])" -Value $value
        }
    }
}
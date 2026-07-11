# Thin wrapper — runtime is start-agent-gateway-windows.js (no profile/conda hook).
param(
    [string]$EnvFile = "",
    [string]$RepoRoot = "",
    [int]$Port = 8793
)

$ErrorActionPreference = 'Stop'
$startScript = Join-Path $PSScriptRoot 'start-agent-gateway-windows.js'
$nodeExe = (Get-Command node).Source
$args = @($startScript)
if ($EnvFile) { $args += @('--env-file', $EnvFile) }
if ($RepoRoot) { $args += @('--repo-root', $RepoRoot) }
if ($Port) { $args += @('--port', $Port) }
& $nodeExe @args
exit $LASTEXITCODE
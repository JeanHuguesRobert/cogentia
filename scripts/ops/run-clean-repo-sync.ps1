# Scheduled ThinkPad sync. Node tool performs its own safe per-repo preflight.
$ErrorActionPreference = 'Stop'
$workspace = 'C:\tweesic'
$entrypoint = Join-Path $workspace 'cogentia\scripts\ops\git-sync-clean-repos.js'
if (-not (Test-Path -LiteralPath $entrypoint -PathType Leaf)) { exit 2 }
$node = (Get-Command node.exe -ErrorAction Stop).Source
& $node $entrypoint --root $workspace --apply --json | Out-Null
exit $LASTEXITCODE

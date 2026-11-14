# Scheduled ThinkPad sync. Node tool performs its own safe per-repo preflight.
$ErrorActionPreference = 'Stop'
$workspace = 'C:\tweesic'
$entrypoint = Join-Path $workspace 'cogentia\scripts\ops\git-sync-clean-repos.js'
if (-not (Test-Path -LiteralPath $entrypoint -PathType Leaf)) { exit 2 }
$node = (Get-Command node.exe -ErrorAction Stop).Source
# Task Scheduler must retain a local, privacy-safe operational receipt.
# SKIP_DIRTY means work was protected, not that synchronization succeeded.
$receiptDir = Join-Path $env:LOCALAPPDATA 'Cogentia'
if (-not (Test-Path $receiptDir)) { New-Item -ItemType Directory -Path $receiptDir -Force | Out-Null }
$receiptFile = Join-Path $receiptDir 'git-clean-sync-latest.json'
& $node $entrypoint --root $workspace --apply --receipt $receiptFile --json | Out-Null
exit $LASTEXITCODE

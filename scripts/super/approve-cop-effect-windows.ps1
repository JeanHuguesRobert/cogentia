# One-command, Principal-side SSHSIG fallback for a pre-existing COP proposal.
# Run ONLY on a Principal-controlled Windows PowerShell terminal; never on Fracta2.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$RemoteProposal,
  [string]$HostAlias = 'fracta2',
  [Parameter(Mandatory=$true)][ValidatePattern('^[A-Fa-f0-9]{64}$')][string]$ExpectedSha256
)
$ErrorActionPreference = 'Stop'
function Invoke-External([string]$Label, [scriptblock]$Action) {
  & $Action
  if ($LASTEXITCODE -ne 0) { throw "$Label failed (exit $LASTEXITCODE)" }
}
if ($RemoteProposal -notmatch '^/tmp/[a-zA-Z0-9][a-zA-Z0-9._-]*\.json$') {
  throw 'Remote proposal must be an absolute /tmp/*.json pathname with no shell metacharacters.'
}
if ($HostAlias -notmatch '^[A-Za-z0-9._-]+$') { throw 'Invalid SSH host alias.' }
$filename = [IO.Path]::GetFileName($RemoteProposal)
$dir = Join-Path ([IO.Path]::GetTempPath()) ('cogentia-cop-' + [guid]::NewGuid().ToString('N'))
New-Item -Path $dir -ItemType Directory | Out-Null
$local = Join-Path $dir $filename
try {
  Invoke-External 'SCP proposal' { scp "${HostAlias}:$RemoteProposal" $local }
  $sha = (Get-FileHash -LiteralPath $local -Algorithm SHA256).Hash
  if ($sha -ine $ExpectedSha256) { throw 'Proposal SHA256 mismatch.' }
  $proposal = Get-Content -LiteralPath $local -Raw | ConvertFrom-Json
  if ($proposal.kind -ne 'cogentia.super-effect-proposal/v1' -or
      $proposal.principal_ref -ne 'principal:jhn' -or
      $proposal.single_use -ne $true -or
      $proposal.effect.execution_mode -ne 'super' -or
      $proposal.effect.target -ne 'node:fracta2' -or
      $proposal.effect.action_class -ne 'host.process.run' -or
      $proposal.risk_control -notin @('B','C')) { throw 'Unsupported COP proposal; refusing to sign.' }
  if ([DateTimeOffset]::Parse($proposal.expires_at) -le [DateTimeOffset]::UtcNow) {
    throw 'Proposal expired; request a new one instead of signing stale bytes.'
  }
  $config = @(ssh -G $HostAlias)
  if ($LASTEXITCODE -ne 0) { throw 'ssh -G failed.' }
  $identityFiles = @($config | Where-Object { $_ -match '^identityfile\s+' } | ForEach-Object { $_ -replace '^identityfile\s+', '' })
  $identity = @($identityFiles | ForEach-Object {
    $candidate = $_.Replace('~', $HOME)
    if (Test-Path -LiteralPath $candidate -PathType Leaf) { $candidate }
  } | Select-Object -First 1)
  if (-not $identity -or -not $identity[0]) { throw 'No configured SSH identity file found; explicit operator resolution required.' }
  Write-Host '--- Proposition COP (signature unique, sans exécution) ---'
  Write-Host "Hôte: $HostAlias | Clé: $($identity[0])"
  Write-Host "Mandat: $($proposal.mandate_ref)@$($proposal.mandate_version)"
  Write-Host "Effet: $($proposal.effect.command)"
  Write-Host "Empreinte de la proposition: SHA256 $sha"
  Write-Host "Expiration UTC: $($proposal.expires_at)"
  $decision = Read-Host 'Tapez OUI pour signer cet effet exact (sinon annulation)'
  if ($decision -cne 'OUI') { throw 'Signature annulée.' }
  Invoke-External 'SSHSIG' { ssh-keygen -Y sign -f $identity[0] -n cogentia-super-effect-v1 $local }
  $sig = "$local.sig"
  if (-not (Test-Path -LiteralPath $sig -PathType Leaf)) { throw 'Signature file not found.' }
  Invoke-External 'SCP signature' { scp $sig "${HostAlias}:$RemoteProposal.sig" }
  Write-Host 'Signature transmise. Le broker COP doit maintenant vérifier puis émettre/consommer le grant.'
} finally {
  # Proposal and signature are not credentials, but temporary copies need not persist.
  Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue
}

# Sign ONE exact pre-existing COP mandate amendment using the Principal's
# already-enrolled RSA SSH key. Never uploads a private key. Uses SSH/SCP
# transport already in use for Fracta2. No persistent setup or new account.
# Requires: Windows PowerShell 5.1+ or pwsh, ssh, ssh-keygen, scp, a reachable
# Fracta2 host. Runs only after the Principal types OUI.
[CmdletBinding()]
param(
  [string]$Remote = 'ubuntu@fracta2',
  [string]$KeyPath = '',
  [switch]$CheckOnly
)
$ErrorActionPreference = 'Stop'
$namespace = 'cogentia-john-mandate-amendment-v1'
$pinnedFingerprint = 'SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c'
$command = 'cd /srv/cogentia/repos/cogentia && node scripts/ops/john-result-mandate.mjs'
$localDir = Join-Path ([IO.Path]::GetTempPath()) ('cogentia-mandate-' + [guid]::NewGuid().ToString('N'))
$success = $false
$uploaded = $false
$remoteSignature = '/home/ubuntu/john-result-mandate-' + [guid]::NewGuid().ToString('N') + '.sig'
New-Item -ItemType Directory -Path $localDir | Out-Null
function Invoke-RemoteReadToFile([string]$operation, [string]$destination) {
  # Windows PowerShell 5.1 can deadlock when stdout from ssh.exe is captured
  # into a pipeline. Start-Process with file redirection avoids inherited
  # stream handles and preserves the exact canonical signing bytes.
  $errorFile = Join-Path $localDir ($operation + '.stderr')
  $remoteCommand = "$command $operation"
  $process = Start-Process -FilePath 'ssh.exe' -NoNewWindow -PassThru -Wait `
    -ArgumentList @('-n','-T','-o','BatchMode=yes','-o','ConnectTimeout=10',$Remote,$remoteCommand) `
    -RedirectStandardOutput $destination -RedirectStandardError $errorFile
  if ($process.ExitCode -ne 0) {
    throw "Lecture distante $operation impossible (code $($process.ExitCode))."
  }
}
try {
  Write-Host '1. Lecture de la proposition canonique, sans modification...' -ForegroundColor Cyan
  $summaryFile = Join-Path $localDir 'inspect.json'
  Invoke-RemoteReadToFile 'inspect' $summaryFile
  $summary = Get-Content -LiteralPath $summaryFile -Raw -Encoding UTF8 | ConvertFrom-Json
  if (!$summary.forbidden_actions_unchanged -or !$summary.budget_ceiling_unchanged -or
      $summary.added_action -ne 'cogentia.continuation.result.submit' -or
      $summary.previous_version -ne 'v1' -or $summary.new_version -ne 'v2' -or
      $summary.changed_fields.Count -ne 1 -or
      $summary.changed_fields[0] -ne 'scope.allowed_actions') {
    throw 'La proposition ne respecte pas le périmètre de la signature attendue.'
  }
  $proposalFile = Join-Path $localDir 'proposal.json'
  Invoke-RemoteReadToFile 'prepare' $proposalFile
  if ((Get-Item -LiteralPath $proposalFile).Length -eq 0) {
    throw 'La proposition à signer est vide.'
  }
  $sha = (Get-FileHash -Path $proposalFile -Algorithm SHA256).Hash.ToLowerInvariant()
  if ('sha256:' + $sha -cne $summary.proposal_hash) {
    throw 'Empreinte distante différente des octets locaux : aucune signature.'
  }
  $source = $null
  if ($KeyPath) {
    $source = $KeyPath
  } else {
    # Key names are not an authority property. The already-enrolled issuer
    # uses a custom filename; identify it by its pinned public fingerprint.
    $keys = @(Get-ChildItem (Join-Path $HOME '.ssh') -Filter '*.pub' -File -ErrorAction SilentlyContinue)
    foreach ($pub in $keys) {
      $desc = & ssh-keygen -lf $pub.FullName 2>$null
      if ($LASTEXITCODE -eq 0 -and $desc -match [regex]::Escape($pinnedFingerprint)) {
        $candidate = $pub.FullName.Substring(0,$pub.FullName.Length - 4)
        if (Test-Path $candidate) { $source = $candidate; break }
      }
    }
  }
  if (!$source -or !(Test-Path $source)) {
    throw 'Cle SSH du Principal non trouvee. Relancer avec -KeyPath CHEMIN_VERS_CLE_PRIVEE (elle reste locale).'
  }
  $pubPath = $source + '.pub'
  if (!(Test-Path $pubPath)) { throw 'Cle publique .pub absente pour verification.' }
  $fingerprint = & ssh-keygen -lf $pubPath 2>$null
  if ($LASTEXITCODE -ne 0 -or $fingerprint -notmatch [regex]::Escape($pinnedFingerprint)) {
    throw 'La cle choisie ne correspond pas a la cle du mandat JHN reconnu par Fracta2.'
  }
  Write-Host 'Mandat : ' $summary.mandate_ref
  Write-Host 'Version : ' $summary.previous_version ' -> ' $summary.new_version
  Write-Host 'Capacites conservees :' ($summary.existing_actions -join ', ')
  Write-Host 'Capacite ajoutee :' $summary.added_action
  Write-Host 'Interdictions et budget : INCHANGES'
  Write-Host 'Expiration :' $summary.valid_until
  Write-Host 'Empreinte :' $summary.proposal_hash
  Write-Host 'La signature sera uniquement enregistree dans COP. Elle n active ni fournisseur ni navigateur.'
  if ($CheckOnly) {
    Write-Host 'Verification reussie : proposition et cle concordantes. Aucune signature effectuee.' -ForegroundColor Green
    return
  }
  $answer = Read-Host 'SIGNER cette proposition et enregistrer v2 ? Tapez OUI'
  if ($answer -cne 'OUI') { Write-Host 'Aucune modification effectuee.'; return }
  & ssh-keygen -Y sign -f $source -n $namespace $proposalFile
  if ($LASTEXITCODE -ne 0) { throw 'Echec de la signature SSH.' }
  $signatureFile = $proposalFile + '.sig'
  if (!(Test-Path $signatureFile)) { throw 'Fichier signature manquant.' }
  & scp $signatureFile "${Remote}:$remoteSignature"
  if ($LASTEXITCODE -ne 0) { throw 'Transfert de signature impossible.' }
  # Trusted server recomputes the exact proposal and independently verifies
  # the signature; the signed proposal itself is never accepted from client.
  $uploaded = $true
  & ssh -n -T -o BatchMode=yes $Remote "$command apply $remoteSignature"
  if ($LASTEXITCODE -ne 0) { throw 'Importation du mandat refusee ; verifier le journal COP avant toute nouvelle signature.' }
  $success = $true
  Write-Host 'Mandat v2 enregistre et verifie. Runtime MCP toujours desactive.' -ForegroundColor Green
}
finally {
  if ($uploaded) {
    & ssh -n -T -o BatchMode=yes $Remote "rm -f $remoteSignature" | Out-Null
  }
  if (Test-Path $localDir) {
    Remove-Item $localDir -Force -Recurse
  }
  if (!$success) {
    Write-Host 'Aucune activation du runtime n a ete effectuee.' -ForegroundColor Yellow
  }
}

#requires -Version 5.1
<#
  One-shot, Principal-side 48h/12-restart bounded COP mandate bootstrap.
  No unattended elevation and no private-key upload. Do not run on Fracta2.
  The installer code is fetched from a pinned commit and SHA256 verified.
  Run only from the Principal's trusted ThinkPad PowerShell session.
#>
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Remote = 'ubuntu@100.84.109.87'
$Key = Join-Path $HOME '.ssh\fractanet-mesh' # SSH transport only
$PrincipalFingerprint = 'SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c'
$SigningKey = $null
$Public = $null
$WorkRemote = '/tmp/cogentia-maintenance-handoff-20261107'
$Head = 'a997b12'
$InstallerHash = '811da318b8d15849b56bdfb65946f91962adc6e2eb5e18c762e85c0d5c9da4ed'
$BundleHash = '0029a7a44f54475a8482c0ff5087d420a049f8cd0213a6e6217ed21dec462799'
$PreviousBundleHash = '6272b7bfc0ec155eafeef244f201d5541a874361ec9e3febbc11f958d89f20e0'
$Utf8 = New-Object System.Text.UTF8Encoding($false)
$WorkLocal = Join-Path $env:TEMP ('cogentia-cop-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $WorkLocal -Force | Out-Null

function Step([string]$Message) { Write-Host "`n=== $Message ===" }
function External([string]$Task, [scriptblock]$Action) {
    & $Action
    if ($LASTEXITCODE -ne 0) { throw "$Task : code de sortie $LASTEXITCODE" }
}
function SHA([string]$File) { return (Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash.ToLowerInvariant() }
function CheckHash([string]$File,[string]$Expected) {
    if ((SHA $File) -cne $Expected) { throw "SHA256 invalide : $File" }
}
function RemoteJson([string]$Task,[string]$Command) {
    $text = (& ssh -i $Key -o IdentitiesOnly=yes $Remote $Command) -join "`n"
    if ($LASTEXITCODE -ne 0) { throw "SSH $Task : $LASTEXITCODE" }
    try { $data = ConvertFrom-Json -InputObject $text } catch { throw "JSON invalide pour $Task : $text" }
    if ($data.ok -ne $true) { throw "COP $Task refuse : $text" }
    return $data
}
function SignFile([string]$Path,[string]$Namespace) {
    External "Signature $Namespace" { ssh-keygen -Y sign -f $SigningKey -n $Namespace $Path }
    if (-not (Test-Path -LiteralPath "$Path.sig" -PathType Leaf)) { throw "Signature absente : $Path.sig" }
}
try {
    Step 'SSH et identité locale'
    if (-not (Test-Path -LiteralPath $Key -PathType Leaf)) { throw "Clé SSH introuvable : $Key" }
    # Reuse the already trusted personal RSA signing identity, not the
    # Fractanet mesh transport key. Never infer signing authority from SSH login.
    $matches = @()
    foreach ($candidate in @(Get-ChildItem -LiteralPath (Join-Path $HOME '.ssh') -File -Filter '*.pub')) {
        $identity = $candidate.FullName.Substring(0,$candidate.FullName.Length - 4)
        if (-not (Test-Path -LiteralPath $identity -PathType Leaf)) { continue }
        $lines = @(& ssh-keygen -lf $candidate.FullName 2>$null)
        if ($LASTEXITCODE -eq 0 -and ($lines -join ' ') -match [regex]::Escape($PrincipalFingerprint)) {
            $matches += [pscustomobject]@{ Private = $identity; Public = $candidate.FullName }
        }
    }
    if ($matches.Count -ne 1) {
        throw "Clé RSA personnelle SSHSIG introuvable ou ambiguë : $PrincipalFingerprint. Ne pas utiliser fractanet-mesh comme substitut."
    }
    $SigningKey = $matches[0].Private
    $Public = $matches[0].Public
    Write-Host "Identité indépendante retrouvée : $PrincipalFingerprint"
    External 'Connexion Fracta2' { ssh -i $Key -o IdentitiesOnly=yes $Remote 'test "$(hostname)" = fracta2 && test "$(whoami)" = ubuntu' }
    $publicHash = SHA $Public

    Step 'Contrôles de provenance et archive'
    $installer = Join-Path $WorkLocal 'install-principal-issuer-bundle.py'
    $archive = Join-Path $WorkLocal 'root-issuer.tar.gz'
    $oldArchive = Join-Path $WorkLocal 'root-issuer-previous.tar.gz'
    $mandateName = 'maintenance-' + [guid]::NewGuid().ToString('N') + '.json'
    $mandateRemote = "$WorkRemote/$mandateName"
    $mandate = Join-Path $WorkLocal $mandateName
    $source = "https://raw.githubusercontent.com/JeanHuguesRobert/cogentia/$Head/scripts/super/install-principal-issuer-bundle.py"
    Invoke-WebRequest -UseBasicParsing -Uri $source -OutFile $installer
    CheckHash $installer $InstallerHash
    External 'Téléchargement archive' { scp -i $Key "${Remote}:$WorkRemote/root-issuer.tar.gz" $archive }
    External 'Téléchargement archive précédente' { scp -i $Key "${Remote}:$WorkRemote/root-issuer-previous.tar.gz" $oldArchive }
    CheckHash $archive $BundleHash
    CheckHash $oldArchive $PreviousBundleHash
    $generator = '/srv/cogentia/repos/cogentia/scripts/super/prepare-maintenance-mandate.mjs'
    External 'Préparation du mandat temporaire' { ssh -i $Key -o IdentitiesOnly=yes $Remote "node $generator $mandateRemote" }
    External 'Téléchargement mandat' { scp -i $Key "${Remote}:$mandateRemote" $mandate }
    $m = Get-Content -LiteralPath $mandate -Raw | ConvertFrom-Json
    $scopeNames = @($m.scope.PSObject.Properties.Name | Sort-Object)
    $expectedScope = @('allowed_actions','execution_mode','service','target')
    $from = [DateTimeOffset]::Parse($m.valid_from)
    $until = [DateTimeOffset]::Parse($m.valid_until)
    if ($m.kind -ne 'cogentia.maintenance-mandate-proposal/v1' -or
        $m.mandate_id -ne 'mandate:jhn:maintenance' -or $m.version -ne 'v1' -or
        $m.principal_ref -ne 'principal:jhn' -or $m.actor_ref -ne 'agent:jhn' -or
        $m.max_delegation_depth -ne 0 -or
        (@($m.scope.allowed_actions).Count -ne 1) -or
        $m.scope.allowed_actions[0] -ne 'service.restart' -or
        $m.scope.execution_mode -ne 'super' -or
        $m.scope.target -ne 'node:fracta2' -or
        $m.scope.service -ne 'mcp-cogentia.service' -or
        ($scopeNames -join ',') -cne ($expectedScope -join ',') -or
        $m.budget_limits.max_steps -ne 12 -or
        (@($m.budget_limits.PSObject.Properties.Name).Count -ne 1) -or
        $until -le [DateTimeOffset]::UtcNow -or
        $from -gt [DateTimeOffset]::UtcNow -or
        ($until - $from).TotalHours -gt 48) {
        throw 'Mandat COP non borné exactement aux 12 redémarrages / 48 heures'
    }
    External 'Clé publique sur Fracta2' { scp -i $Key $Public "${Remote}:$WorkRemote/principal-issuer.pub" }
    External 'Installateur sur Fracta2' { scp -i $Key $installer "${Remote}:$WorkRemote/installer.py" }

    # Remote independent hashes: avoid relying only on SCP success.
    $remoteDigests = (& ssh -i $Key -o IdentitiesOnly=yes $Remote "sha256sum $WorkRemote/installer.py $WorkRemote/root-issuer.tar.gz $WorkRemote/root-issuer-previous.tar.gz $WorkRemote/principal-issuer.pub") -join "`n"
    if ($LASTEXITCODE -ne 0 -or $remoteDigests -notmatch [regex]::Escape($InstallerHash) -or
        $remoteDigests -notmatch [regex]::Escape($BundleHash) -or
        $remoteDigests -notmatch [regex]::Escape($PreviousBundleHash) -or
        $remoteDigests -notmatch [regex]::Escape($publicHash)) { throw 'Empreintes distantes non concordantes' }

    Step 'Activation COP root contrôlée'
    Write-Host "Fracta2 ; issuer uniquement ; archive $BundleHash"
    Write-Host "Clé de signature RSA préexistante : $PrincipalFingerprint ; SHA256 fichier $publicHash"
    Write-Host "Une seule signature pour 12 redémarrages du seul MCP pendant 48 heures."
    $consent = Read-Host 'Tapez OUI pour autoriser ce parcours complet'
    if ($consent -cne 'OUI') { throw 'Parcours annulé' }

    # The root Python process verifies SHA256 before compiling the installer.
    # It executes the verified in-memory bytes, not a mutable checkout.
    $guard = @'
import hashlib,sys
p=sys.argv[1]
expected=sys.argv[2]
with open(p,'rb') as f: content=f.read()
if hashlib.sha256(content).hexdigest()!=expected:
    raise SystemExit('Pinned installer hash mismatch')
sys.argv=[p]+sys.argv[3:]
exec(compile(content,p,'exec'),{'__name__':'__main__','__file__':p})
'@
    $guardB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($guard))
    $python = 'import base64;exec(base64.b64decode("' + $guardB64 + '"))'
    $rootArgs = "--bundle $WorkRemote/root-issuer.tar.gz --sha256 $BundleHash --previous-bundle $WorkRemote/root-issuer-previous.tar.gz --previous-sha256 $PreviousBundleHash --pubkey $WorkRemote/principal-issuer.pub --pubkey-sha256 $publicHash --activate --resume-verified-stage"
    $state = (& ssh -i $Key -o IdentitiesOnly=yes $Remote "test -f /etc/cogentia-super/principal-issuer.pub && echo ENROLLED || echo INITIAL") -join ''
    if ($LASTEXITCODE -ne 0) { throw 'État issuer illisible' }
    if ($state -eq 'INITIAL') {
        # A real sudo authentication may be requested on the independent SSH TTY.
        External 'Installation privilégiée du seul issuer' {
            ssh -tt -i $Key -o IdentitiesOnly=yes $Remote "sudo python3 -c '$python' $WorkRemote/installer.py $InstallerHash $rootArgs"
        }
    } elseif ($state -ne 'ENROLLED') { throw "État issuer inattendu : $state" }

    Step 'Mandat COP signé et inscrit'
    SignFile $mandate 'cogentia-maintenance-mandate-v1'
    External 'Transfert signature de mandat' { scp -i $Key "$mandate.sig" "${Remote}:$mandateRemote.sig" }
    $issuerClient = '/srv/cogentia/repos/cogentia/scripts/super/principal-issuer-client.mjs'
    $enrolled = RemoteJson 'enroll' "node $issuerClient enroll $mandateRemote $mandateRemote.sig"
    if ($enrolled.phase -ne 'ROOT_MAINTENANCE_MANDATE_RECORDED') { throw 'Reçu mandat inconnu' }

    Step 'Premier redémarrage automatiquement couvert par le mandat'
    # No second signature: the root broker checks signed mandate + budget.
    # No caller-controlled command or service parameter is accepted.
    $ran = RemoteJson 'restart_mcp' "node $issuerClient restart_mcp"
    if ($ran.executed -ne $true -or $ran.settled -ne $true -or
        $ran.service -ne 'mcp-cogentia.service' -or
        $ran.remaining -ne 11 -or
        $ran.receipt.mandate_ref -ne 'mandate:jhn:maintenance') {
        throw 'Reçu de redémarrage COP non conforme'
    }
    External 'État MCP' { ssh -i $Key -o IdentitiesOnly=yes $Remote 'systemctl is-active mcp-cogentia.service' }
    Write-Host 'SUCCÈS : mandat de 48 heures signé une fois ; premier redémarrage reçu ; 11 restants.'
    Write-Host 'Cogentia pourra redémarrer le MCP dans le même mandat sans vous solliciter.'
} catch {
    Write-Error "ÉCHEC CONTRÔLÉ : $($_.Exception.Message)"
    throw
} finally {
    # Neither the mesh transport key nor personal RSA private key is copied.
    Remove-Item -LiteralPath $WorkLocal -Recurse -Force -ErrorAction SilentlyContinue
}

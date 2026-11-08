#requires -Version 7.0
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
$Head = '76149d5'
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
    Step 'SSH et identite locale'
    if (-not (Test-Path -LiteralPath $Key -PathType Leaf)) { throw "Cle SSH introuvable : $Key" }
    # Reuse the already trusted personal RSA signing identity, not the
    # Fractanet mesh transport key. Never infer signing authority from SSH login.
    $signerCandidates = @()
    foreach ($candidate in @(Get-ChildItem -LiteralPath (Join-Path $HOME '.ssh') -File -Filter '*.pub')) {
        $identity = $candidate.FullName.Substring(0,$candidate.FullName.Length - 4)
        if (-not (Test-Path -LiteralPath $identity -PathType Leaf)) { continue }
        $lines = @(& ssh-keygen -lf $candidate.FullName 2>$null)
        if ($LASTEXITCODE -eq 0 -and ($lines -join ' ') -match [regex]::Escape($PrincipalFingerprint)) {
            $signerCandidates += [pscustomobject]@{ Private = $identity; Public = $candidate.FullName }
        }
    }
    if ($signerCandidates.Count -ne 1) {
        throw "Cle RSA personnelle SSHSIG introuvable ou ambigue : $PrincipalFingerprint. Ne pas utiliser fractanet-mesh comme substitut."
    }
    $SigningKey = $signerCandidates[0].Private
    $Public = $signerCandidates[0].Public
    Write-Host "Identite independante retrouvee : $PrincipalFingerprint"
    External 'Connexion Fracta2' { ssh -i $Key -o IdentitiesOnly=yes $Remote 'test "$(hostname)" = fracta2 && test "$(whoami)" = ubuntu' }
    $publicHash = SHA $Public

    Step 'Controles de provenance et archive'
    $installer = Join-Path $WorkLocal 'install-principal-issuer-bundle.py'
    $archive = Join-Path $WorkLocal 'root-issuer.tar.gz'
    $oldArchive = Join-Path $WorkLocal 'root-issuer-previous.tar.gz'
    $mandateName = 'maintenance-' + [guid]::NewGuid().ToString('N') + '.json'
    $mandateRemote = "$WorkRemote/$mandateName"
    $mandate = Join-Path $WorkLocal $mandateName
    $source = "https://raw.githubusercontent.com/JeanHuguesRobert/cogentia/$Head/scripts/super/install-principal-issuer-bundle.py"
    Invoke-WebRequest -UseBasicParsing -Uri $source -OutFile $installer
    CheckHash $installer $InstallerHash
    External 'Telechargement archive' { scp -i $Key "${Remote}:$WorkRemote/root-issuer.tar.gz" $archive }
    External 'Telechargement archive precedente' { scp -i $Key "${Remote}:$WorkRemote/root-issuer-previous.tar.gz" $oldArchive }
    CheckHash $archive $BundleHash
    CheckHash $oldArchive $PreviousBundleHash
    $generator = '/srv/cogentia/repos/cogentia/scripts/super/prepare-maintenance-mandate.mjs'
    External 'Preparation du mandat temporaire' { ssh -i $Key -o IdentitiesOnly=yes $Remote "node $generator $mandateRemote" }
    External 'Telechargement mandat' { scp -i $Key "${Remote}:$mandateRemote" $mandate }
    $m = Get-Content -LiteralPath $mandate -Raw | ConvertFrom-Json -DateKind String
    # FBF: never hide which part of a signed mandate failed validation.
    # Use Fracta2 UTC as the reference for this mandate; the trusted broker
    # evaluates that same clock, not the Windows workstation's potentially
    # offset clock. Clock disagreement cannot broaden the signed time window.
    $serverUtcText = (& ssh -i $Key -o IdentitiesOnly=yes $Remote 'date -u +%Y-%m-%dT%H:%M:%SZ') -join ''
    if ($LASTEXITCODE -ne 0) { throw 'Cannot obtain Fracta2 UTC time' }
    # ConvertFrom-Json -DateKind String keeps the exact ISO text in PS 7.6.
    # ParseExact with InvariantCulture prevents fr-FR day/month reinterpretation.
    $invariant = [System.Globalization.CultureInfo]::InvariantCulture
    $utcStyle = [System.Globalization.DateTimeStyles]::AssumeUniversal
    $serverUtc = [DateTimeOffset]::ParseExact($serverUtcText, "yyyy-MM-dd'T'HH:mm:ss'Z'", $invariant, $utcStyle)
    $from = [DateTimeOffset]::ParseExact([string]$m.valid_from, "yyyy-MM-dd'T'HH:mm:ss.fff'Z'", $invariant, $utcStyle)
    $until = [DateTimeOffset]::ParseExact([string]$m.valid_until, "yyyy-MM-dd'T'HH:mm:ss.fff'Z'", $invariant, $utcStyle)
    $violations = [System.Collections.Generic.List[string]]::new()
    if ($m.kind -cne 'cogentia.maintenance-mandate-proposal/v1') { $violations.Add('kind') }
    if ($m.mandate_id -cne 'mandate:jhn:maintenance') { $violations.Add('mandate_id') }
    if ($m.version -cne 'v1') { $violations.Add('version') }
    if ($m.principal_ref -cne 'principal:jhn') { $violations.Add('principal_ref') }
    if ($m.actor_ref -cne 'agent:jhn') { $violations.Add('actor_ref') }
    if ($m.max_delegation_depth -ne 0) { $violations.Add('delegation_depth') }
    if ($m.scope.execution_mode -cne 'super') { $violations.Add('execution_mode') }
    if ($m.scope.target -cne 'node:fracta2') { $violations.Add('target') }
    if ($m.scope.service -cne 'mcp-cogentia.service') { $violations.Add('service') }
    $scopeNames = @($m.scope.PSObject.Properties.Name | Sort-Object)
    $expectedScope = @('allowed_actions','execution_mode','service','target')
    if (($scopeNames -join ',') -cne ($expectedScope -join ',')) { $violations.Add('scope_field_names') }
    $actions = @($m.scope.allowed_actions)
    if ($actions.Count -ne 1 -or [string]$actions[0] -cne 'service.restart') { $violations.Add('allowed_actions') }
    $budgetNames = @($m.budget_limits.PSObject.Properties.Name)
    if ($budgetNames.Count -ne 1 -or [string]$budgetNames[0] -cne 'max_steps') { $violations.Add('budget_field_names') }
    if ($m.budget_limits.max_steps -ne 12) { $violations.Add('budget_max_steps') }
    if ($until -le $serverUtc) { $violations.Add('expired') }
    if ($from -gt $serverUtc) { $violations.Add('not_yet_valid') }
    if (($until - $from).TotalSeconds -gt 172800) { $violations.Add('duration_exceeds_48h') }
    if ($violations.Count -gt 0) {
        throw ('Mandate validation failed: ' + ($violations -join ',') +
            '; server_utc=' + $serverUtc.ToString('o') +
            '; valid_from=' + $from.ToString('o') +
            '; valid_until=' + $until.ToString('o'))
    }
    Write-Host 'Mandate verified: only MCP restart; 12 operations; <= 48h, server-clock aligned.'
    External 'Cle publique sur Fracta2' { scp -i $Key $Public "${Remote}:$WorkRemote/principal-issuer.pub" }
    External 'Installateur sur Fracta2' { scp -i $Key $installer "${Remote}:$WorkRemote/installer.py" }

    # Remote independent hashes: avoid relying only on SCP success.
    $remoteDigests = (& ssh -i $Key -o IdentitiesOnly=yes $Remote "sha256sum $WorkRemote/installer.py $WorkRemote/root-issuer.tar.gz $WorkRemote/root-issuer-previous.tar.gz $WorkRemote/principal-issuer.pub") -join "`n"
    if ($LASTEXITCODE -ne 0 -or $remoteDigests -notmatch [regex]::Escape($InstallerHash) -or
        $remoteDigests -notmatch [regex]::Escape($BundleHash) -or
        $remoteDigests -notmatch [regex]::Escape($PreviousBundleHash) -or
        $remoteDigests -notmatch [regex]::Escape($publicHash)) { throw 'Empreintes distantes non concordantes' }

    Step 'Activation COP root controlee'
    Write-Host "Fracta2 ; issuer uniquement ; archive $BundleHash"
    Write-Host "Cle de signature RSA preexistante : $PrincipalFingerprint ; SHA256 fichier $publicHash"
    Write-Host "Une seule signature pour 12 redemarrages du seul MCP pendant 48 heures."
    $consent = Read-Host 'Tapez OUI pour autoriser ce parcours complet'
    if ($consent -cne 'OUI') { throw 'Parcours annule' }

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
    if ($LASTEXITCODE -ne 0) { throw 'Etat issuer illisible' }
    if ($state -eq 'INITIAL') {
        # A real sudo authentication may be requested on the independent SSH TTY.
        External 'Installation privilegiee du seul issuer' {
            ssh -tt -i $Key -o IdentitiesOnly=yes $Remote "sudo python3 -c '$python' $WorkRemote/installer.py $InstallerHash $rootArgs"
        }
    } elseif ($state -ne 'ENROLLED') { throw "Etat issuer inattendu : $state" }

    Step 'Mandat COP signe et inscrit'
    SignFile $mandate 'cogentia-maintenance-mandate-v1'
    External 'Transfert signature de mandat' { scp -i $Key "$mandate.sig" "${Remote}:$mandateRemote.sig" }
    $issuerClient = '/srv/cogentia/repos/cogentia/scripts/super/principal-issuer-client.mjs'
    $enrolled = RemoteJson 'enroll' "node $issuerClient enroll $mandateRemote $mandateRemote.sig"
    if ($enrolled.phase -ne 'ROOT_MAINTENANCE_MANDATE_RECORDED') { throw 'Recu mandat inconnu' }

    Step 'Premier redemarrage automatiquement couvert par le mandat'
    # No second signature: the root broker checks signed mandate + budget.
    # No caller-controlled command or service parameter is accepted.
    $ran = RemoteJson 'restart_mcp' "node $issuerClient restart_mcp"
    if ($ran.executed -ne $true -or $ran.settled -ne $true -or
        $ran.service -ne 'mcp-cogentia.service' -or
        $ran.remaining -ne 11 -or
        $ran.receipt.mandate_ref -ne 'mandate:jhn:maintenance') {
        throw 'Recu de redemarrage COP non conforme'
    }
    External 'Etat MCP' { ssh -i $Key -o IdentitiesOnly=yes $Remote 'systemctl is-active mcp-cogentia.service' }
    Write-Host 'SUCCES : mandat de 48 heures signe une fois ; premier redemarrage recu ; 11 restants.'
    Write-Host 'Cogentia pourra redemarrer le MCP dans le meme mandat sans vous solliciter.'
} catch {
    Write-Error "ECHEC CONTROLE : $($_.Exception.Message)"
    throw
} finally {
    # Neither the mesh transport key nor personal RSA private key is copied.
    Remove-Item -LiteralPath $WorkLocal -Recurse -Force -ErrorAction SilentlyContinue
}

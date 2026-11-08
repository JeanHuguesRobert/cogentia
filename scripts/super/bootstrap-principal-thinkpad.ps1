#requires -Version 5.1
<#
  One-shot, Principal-side COP bootstrap + exact MCP restart.
  No unattended elevation and no private-key upload. Do not run on Fracta2.
  The installer code is fetched from a pinned commit and SHA256 verified.
  Run only from the Principal's trusted ThinkPad PowerShell session.
#>
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Remote = 'ubuntu@100.84.109.87'
$Key = Join-Path $HOME '.ssh\fractanet-mesh'
$Public = "$Key.pub"
$WorkRemote = '/tmp/cogentia-maintenance-handoff-20261107'
$Head = '5ff14c4'
$InstallerHash = '4a1821fe04aff0b4c5d379f4e6d3dbedc5a9b89f55ac9c62516b1f828f3749b4'
$BundleHash = '6272b7bfc0ec155eafeef244f201d5541a874361ec9e3febbc11f958d89f20e0'
$MandateHash = 'a782de32871f9a51017a309ecda96aa04930c0f0ad812509d6e90049f9de0c8b'
$EffectCommand = 'sudo -n systemctl restart mcp-cogentia.service && systemctl is-active mcp-cogentia.service'
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
    External "Signature $Namespace" { ssh-keygen -Y sign -f $Key -n $Namespace $Path }
    if (-not (Test-Path -LiteralPath "$Path.sig" -PathType Leaf)) { throw "Signature absente : $Path.sig" }
}
try {
    Step 'SSH et identité locale'
    if (-not (Test-Path -LiteralPath $Key -PathType Leaf)) { throw "Clé SSH introuvable : $Key" }
    if (-not (Test-Path -LiteralPath $Public -PathType Leaf)) {
        $output = (& ssh-keygen -y -f $Key) -join "`n"
        if ($LASTEXITCODE -ne 0 -or -not $output.StartsWith('ssh-')) { throw 'Impossible de dériver la clé publique' }
        [IO.File]::WriteAllText($Public,($output.Trim() + "`n"),$Utf8)
    }
    External 'Connexion Fracta2' { ssh -i $Key -o IdentitiesOnly=yes $Remote 'test "$(hostname)" = fracta2 && test "$(whoami)" = ubuntu' }
    $publicHash = SHA $Public

    Step 'Contrôles de provenance et archive'
    $installer = Join-Path $WorkLocal 'install-principal-issuer-bundle.py'
    $archive = Join-Path $WorkLocal 'root-issuer.tar.gz'
    $mandate = Join-Path $WorkLocal 'maintenance-v1.json'
    $source = "https://raw.githubusercontent.com/JeanHuguesRobert/cogentia/$Head/scripts/super/install-principal-issuer-bundle.py"
    Invoke-WebRequest -UseBasicParsing -Uri $source -OutFile $installer
    CheckHash $installer $InstallerHash
    External 'Téléchargement archive' { scp -i $Key "${Remote}:$WorkRemote/root-issuer.tar.gz" $archive }
    External 'Téléchargement mandat' { scp -i $Key "${Remote}:$WorkRemote/maintenance-v1.json" $mandate }
    CheckHash $archive $BundleHash
    CheckHash $mandate $MandateHash
    $m = Get-Content -LiteralPath $mandate -Raw | ConvertFrom-Json
    if ($m.kind -ne 'cogentia.maintenance-mandate-proposal/v1' -or
        $m.mandate_id -ne 'mandate:jhn:maintenance' -or $m.version -ne 'v1' -or
        $m.principal_ref -ne 'principal:jhn' -or $m.actor_ref -ne 'agent:jhn' -or
        $m.scope.execution_mode -ne 'super' -or $m.scope.target -ne 'node:fracta2' -or
        $m.budget_limits.max_steps -gt 12 -or
        [DateTimeOffset]::Parse($m.valid_until) -le [DateTimeOffset]::UtcNow) {
        throw 'Mandat COP inattendu ou expiré'
    }
    External 'Clé publique sur Fracta2' { scp -i $Key $Public "${Remote}:$WorkRemote/principal-issuer.pub" }
    External 'Installateur sur Fracta2' { scp -i $Key $installer "${Remote}:$WorkRemote/installer.py" }

    # Remote independent hashes: avoid relying only on SCP success.
    $remoteDigests = (& ssh -i $Key -o IdentitiesOnly=yes $Remote "sha256sum $WorkRemote/installer.py $WorkRemote/root-issuer.tar.gz $WorkRemote/principal-issuer.pub") -join "`n"
    if ($LASTEXITCODE -ne 0 -or $remoteDigests -notmatch [regex]::Escape($InstallerHash) -or
        $remoteDigests -notmatch [regex]::Escape($BundleHash) -or
        $remoteDigests -notmatch [regex]::Escape($publicHash)) { throw 'Empreintes distantes non concordantes' }

    Step 'Activation COP root contrôlée'
    Write-Host "Fracta2 ; issuer uniquement ; archive $BundleHash"
    Write-Host "Clé SSH publique : $publicHash"
    Write-Host "Puis signature du mandat v1 (12 étapes) et d'un seul redémarrage MCP."
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
    $python = "import base64;exec(base64.b64decode(\"$guardB64\"))"
    $rootArgs = "--bundle $WorkRemote/root-issuer.tar.gz --sha256 $BundleHash --pubkey $WorkRemote/principal-issuer.pub --pubkey-sha256 $publicHash --activate --resume-verified-stage"
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
    External 'Transfert signature de mandat' { scp -i $Key "$mandate.sig" "${Remote}:$WorkRemote/maintenance-v1.json.sig" }
    $issuerClient = '/srv/cogentia/repos/cogentia/scripts/super/principal-issuer-client.mjs'
    $enrolled = RemoteJson 'enroll' "node $issuerClient enroll $WorkRemote/maintenance-v1.json $WorkRemote/maintenance-v1.json.sig"
    if ($enrolled.phase -ne 'ROOT_MAINTENANCE_MANDATE_RECORDED') { throw 'Reçu mandat inconnu' }

    Step 'Proposition d’effet COP unique et exacte'
    $recovery = 'recovery:systemd:mcp-cogentia:active-check'
    $prepared = RemoteJson 'prepare' "node $issuerClient prepare '$EffectCommand' '$recovery'"
    if ($prepared.phase -ne 'COP_RESERVED_AWAITING_SIGNATURE' -or
        $prepared.proposal.effect.command -cne $EffectCommand -or
        $prepared.proposal.principal_ref -ne 'principal:jhn' -or
        $prepared.proposal.mandate_ref -ne 'mandate:jhn:maintenance' -or
        $prepared.proposal.single_use -ne $true -or
        [DateTimeOffset]::Parse($prepared.proposal.expires_at) -le [DateTimeOffset]::UtcNow) {
        throw 'Effet COP différent de la commande autorisée'
    }
    $effect = Join-Path $WorkLocal 'one-use-effect.json'
    [IO.File]::WriteAllText($effect,[string]$prepared.canonical_to_sign,$Utf8)
    SignFile $effect 'cogentia-super-effect-v1'
    $remoteEffect = "$WorkRemote/effect-$([guid]::NewGuid().ToString('N')).json"
    External 'Transfert proposition exacte' { scp -i $Key $effect "${Remote}:$remoteEffect" }
    External 'Transfert signature effet' { scp -i $Key "$effect.sig" "${Remote}:$remoteEffect.sig" }

    Step 'Émission du grant root à usage unique'
    $issued = RemoteJson 'issue' "node $issuerClient issue $remoteEffect $remoteEffect.sig"
    if ($issued.phase -ne 'ROOT_GRANT_ISSUED_NOT_EXECUTED' -or
        $issued.authorization_id -notmatch '^sea_[a-z0-9-]{30,}$') { throw 'Reçu émission non confirmé' }

    Step 'Consommation COP et redémarrage MCP'
    # Never retry an uncertain execution; the root broker controls single-use.
    $ran = RemoteJson 'run' "node $issuerClient run $($issued.authorization_id) $remoteEffect"
    if ($ran.cop_reserved -ne $true -or $ran.authority_id -ne $issued.authorization_id -or
        $ran.exit_code -ne 0) { throw 'Exécution ou reçu COP non conforme' }
    External 'État MCP' { ssh -i $Key -o IdentitiesOnly=yes $Remote 'systemctl is-active mcp-cogentia.service' }
    Write-Host 'SUCCÈS : issuer enrôlé, mandat et effet signés, reçu COP, MCP actif.'
    Write-Host 'La recette bancaire en lecture seule peut maintenant reprendre côté agent.'
} catch {
    Write-Error "ÉCHEC CONTRÔLÉ : $($_.Exception.Message)"
    throw
} finally {
    # No private key is copied or included in this temporary work directory.
    Remove-Item -LiteralPath $WorkLocal -Recurse -Force -ErrorAction SilentlyContinue
}

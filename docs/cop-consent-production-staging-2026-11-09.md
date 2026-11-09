---
title: "COP JHN — staging du consentement Supabase authentifié"
date: 2026-11-09
last_modified_at: 2026-11-09
status: working-paper
document_role: operational
document_kind: technical-note
visibility: public
language: fr
license: CC BY-SA 4.0
update_policy: UP-DEFAULT-REVIEWED
related_documents:
  - "docs/cop-supabase-authenticated-consent-2026-11-09.md"
  - "docs/cop-consent-cli-mcp-app-2026-11-09.md"
---

# JHN COP consent — staging contrôlé, sans pouvoir d'émission

## Situation vérifiée le 9 novembre 2026

Le site canonique `https://jhn.baronsmariani.org/` est servi par Netlify.
La route React `/cop/consent/:challengeId` est compilée dans Inseme, mais
`/api/cop/principal-consent/<uuid>` renvoie actuellement **HTML 200 SPA**,
plutôt que le JSON de l'émetteur : le backend n'est **pas encore raccordé**.
Le journal existant sur Fracta2 est `/var/lib/cogentia/cop/john-root-v1.sqlite`
(permissions `ubuntu`, mode 0600) ; aucun nouveau journal n'est nécessaire.
Le service `mcp-cogentia` et le routeur Caddy existants sont actifs.

## Implémentation dans ce lot

- `scripts/ops/jhn-consent-local-server.js` lance un service strictement
  `127.0.0.1:8796`, ouvre uniquement le fichier SQLite existant et utilise
  Supabase Auth `getUser(accessToken)` avec comparaison au `principal_id`
  JHN dans la base. Aucun token Supabase n'est enregistré, retourné ou
  injecté dans un prompt MCP. Pas de route `request()`/`apply()`.
- **Mode sûr par défaut** : `COGENTIA_JHN_CONSENT_ENABLE_DECISION=0` ; GET
  exige le Bearer Supabase vérifié, POST retourne `403` sans écriture.
  Aucun nouveau mandat, grant, budget ou effet n'est émis par ce serveur.
- Dans Inseme, le relais Netlify Edge
  `apps/platform/netlify/profiles/jhn/edge-functions/principal-consent-proxy.js`
  est enregistré sur `/api/cop/principal-consent/*` dans le profil JHN. Il
  n'accepte que le domaine canonique, GET/POST et un Bearer présenté par
  le navigateur. Il relaie vers l'URL constante
  `https://browser.fractavolta.com/api/cop/principal-consent/<uuid>` ;
  Caddy doit distribuer **uniquement cette route** vers le service loopback.
  Réponse Caddy Basic Auth ou HTML Netlify : refus fermé (`503` JSON), et
  aucun raccourci en cas d'indisponibilité du serveur émetteur.
- `scripts/ops/consent-deploy/install-jhn-consent-staging.py` prépare un
  service systemd `cogentia-jhn-consent.service` sans écriture activée et
  insère le seul matcher Caddy `@jhn_consent` dans le site existant `:80`.
  La commande sans argument est **une prévisualisation sans effet**.
  Avec `--apply`, elle exige l'administration root du Principal, valide
  la configuration Caddy et sauvegarde l'ancienne version avant toute
  recharge. Pas de changement du courtier COP root ni des mandats.

## Recette déjà réalisée (sans action root)

- Tests du serveur localhost : wrong Host -> 404, pas de Bearer -> 401,
  POST désactivé -> 403 ; tests de l'API JHN canonique verts.
- Démarrage temporaire du vrai listener depuis Fracta2 sur port 8796 avec
  la base et Supabase réels, en mode POST désactivé : HTTP 401 JSON pour
  requête anonyme. Le serveur temporaire a été arrêté ensuite.
- Tests du relais Netlify (origine, mauvais bearer, erreur HTML de Caddy,
  provenance du reçu JSON) verts.
- `caddy validate --config /tmp/Caddyfile-jhn-consent-check --adapter caddyfile`
  a renvoyé `Valid configuration` sur la configuration candidate.

**Pas encore revendiqué :** déploiement Netlify effectif de cette nouvelle
Edge Function, service systemd permanent installé, matcher Caddy en service,
confirmation par navigateur Supabase, challenge émis dans le registre réel,
ou décision autorisée. Ces étapes ont des preuves et des contrôles distincts.

## Opération propriétaire (si revue du code et accord)

Depuis PowerShell sur le poste du Principal, **une seule commande** :

```powershell
ssh -tt fracta2 'sudo python3 /srv/cogentia/repos/cogentia/scripts/ops/consent-deploy/install-jhn-consent-staging.py --apply'
```

Elle installe seulement le service sécurisé avec décisions **désactivées**
(`ENABLE_DECISION=0`) et le routage Caddy réduit. Ensuite vérifier :

1. `systemctl is-active cogentia-jhn-consent.service` — service `active` ;
2. HTTPS `https://jhn.baronsmariani.org/api/cop/principal-consent/<uuid>`
   anonyme — JSON `401`, et non HTML `200` ;
3. GET avec session Supabase du Principal — une demande inconnue retourne
   `404` JSON ;
4. POST, même authentifié — `403 principal_decision_not_enabled` ;
5. Le reste de `browser.fractavolta.com` conserve son authentification.

Après ces vérifications, et **seulement ensuite**, activer la décision par
une opération séparée, puis présenter au Principal une demande sans effet
externe. Le clic ChatGPT demeure un indicateur d'intention ; seul le clic
sur la page Inseme authentifiée produit une décision attestée et tracée.

## Limites d'autorité

La publication source et le staging réseau ne créent **aucun mandat**.
`request()` et `apply()` restent internes au processus de confiance.
La session Supabase ne suffit pas à autoriser une proposition que l'issuer
n'a pas préparée ; les mandats sont contrôlés par le journal COP existant.
Aucun secret Vault n'a été publié. La lecture/écriture du service doit rester
limitée au chemin canonique, à la seule identité JHN et au domaine prévu.

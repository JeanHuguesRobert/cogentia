---
title: "Architecture & Manuel : Hosted Browser CDP Session Bridge & Extraction Automatisée"
subtitle: "Symbiose Humain/Machine sur Fracta2 : navigation visuelle (KasmVNC) et pilotage programmatique (CDP)"
author: "Jean Hugues Noël Robert, baron Mariani — Institut Mariani / Cogentia"
date: "2026-09-01"
status: published
corpus_role: source
document_role: operational-guide
document_kind: architecture-note
visibility: public
language: fr
tags:
  - Hosted Browser
  - KasmVNC
  - CDP
  - Chrome DevTools Protocol
  - X / Twitter
  - Suvranu
  - DHITL
  - Fracta2
---

# Hosted Browser CDP Session Bridge & Extraction Automatisée

## 1. Vision & Principe d'Accès Symétrique

Le système **Hosted Browser** déployé sur **Fracta2** (`100.108.221.96`) résout l'un des défis majeurs de l'automatisation des réseaux sociaux : **comment permettre à des agents autonomes d'agir au nom d'un utilisateur sans manipuler ni copier-coller manuellement des mots de passe ou des clés d'API coûteuses ?**

La réponse repose sur une architecture à **double surface d'accès symétrique** sur la même instance Chromium :

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         SURFACE HUMAINE : KASMVNC                           │
 │                   (http://100.108.221.96/ ou https://...:8444)              │
 │                                                                             │
 │ • L'humain se connecte visuellement via son navigateur web.                 │
 │ • Il s'authentifie normalement sur X/Twitter, Facebook, ChatGPT.            │
 │ • Le profil persistant est stocké dans ~/.hosted-browser/chromium-profile.  │
 └──────────────────────────────────────┬──────────────────────────────────────┘
                                        │ Même instance Chrome partagée
                                        ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                 SURFACE MACHINE : CHROME DEVTOOLS PROTOCOL (CDP)            │
 │                          (ws://127.0.0.1:9223/devtools)                     │
 │                                                                             │
 │ • Les agents (Agent John, Cogentia, scripts Node.js) accèdent au CDP.      │
 │ • Inspection DOM en direct et détection automatique du compte actif.       │
 │ • Extraction instantanée des cookies de session (auth_token, ct0) en <100ms.│
 │ • Exécution d'actions sous gouvernance stricte DHITL (WhatsApp).            │
 └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Validation Empirique sur Fracta2 (Preuve en Direct)

Le 1er septembre 2026, la sonde CDP a été exécutée avec succès sur le serveur `fracta2` :

### A. Détection Automatique du Compte Actif (`--whoami`)
La sonde inspecte le DOM de l'onglet X ouvert dans la session de Jean-Hugues Robert :

```json
{
  "raw_text": "#suvranu\n@suvranu",
  "profile_href": "/suvranu",
  "document_title": "(17) Accueil / X",
  "url": "https://x.com/home"
}
```

### B. Extraction Instantanée de Session (`--extract-x=suvranu`)
Sans aucune saisie manuelle, le script extrait les cookies de session et enregistre le coffre sécurisé :
* **Fichier généré :** `/srv/cogentia/repos/cogentia/.cogentia/secrets/x_session_suvranu.json`
* **Tokens capturés :** `auth_token` (40 car.), `ct0` (CSRF), cookies de domaine `.x.com`.

---

## 3. Manuel des Commandes CLI

Le contrôleur CDP est disponible via le script [`scripts/ops/cdp-browser-cli.js`](../scripts/ops/cdp-browser-cli.js) :

```bash
# 1. Lister les onglets actifs dans le navigateur hébergé
node scripts/ops/cdp-browser-cli.js --tabs

# 2. Détecter automatiquement l'identité du compte X connecté
node scripts/ops/cdp-browser-cli.js --whoami

# 3. Extraire et enregistrer la session X sous un alias
node scripts/ops/cdp-browser-cli.js --extract-x=suvranu
node scripts/ops/cdp-browser-cli.js --extract-x=baronsmariani
node scripts/ops/cdp-browser-cli.js --extract-x=jhr

# 4. Exécuter une commande JavaScript dans l'onglet actif
node scripts/ops/cdp-browser-cli.js --eval="document.title"
```

---

## 4. Invariants de Sécurité & Garde-fous DHITL

1. **Isolement Réseau :** Le port CDP `127.0.0.1:9223` est strictement lié à l'interface de boucle locale (loopback) de `fracta2`. Il n'est **jamais exposé sur l'Internet public**.
2. **Confidentialité des Secrets :** Le dossier `.cogentia/secrets/` est exclu de Git (`.gitignore`).
3. **Contrôle Humain Inviolable (DHITL) :** Le CDP permet à la machine de préparer les actions, mais **l'ordre d'émission nécessite l'approbation explicite de l'humain** via WhatsApp (`approve ctn_soc_xxx`).
